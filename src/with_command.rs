//! Temporary-by-default launcher shared by `router with` and `with-router`.

use std::ffi::OsString;
use std::fs::{self, OpenOptions};
use std::io::{IsTerminal as _, Write as _};
use std::path::{Path, PathBuf};
#[cfg(unix)]
use std::process::Stdio;
use std::process::{Command, ExitCode};
use std::time::Duration;

use serde_json::json;

use crate::cli::WithArgs;
use crate::clients::{ClientIsolation, ClientKind, ClientManager, RouterModel};
use crate::managed_server::{
    cleanup_run_credential, ensure_model_available, prepare_run_credential, resolve,
};

#[path = "with_command_sweep.rs"]
mod sweep;
use sweep::{DisposableRunDirectory, set_directory_owner_only};
#[cfg(test)]
use sweep::{owner_of, process_alive, sweep_stale_directories};

#[path = "with_command_codex_catalog.rs"]
mod codex_catalog;
use codex_catalog::write_codex_model_catalog;

type AnyError = Box<dyn std::error::Error + Send + Sync>;

const CLAUDE_PRIVACY_DEFAULT_ENV: [&str; 3] = [
    "DISABLE_ERROR_REPORTING",
    "DISABLE_AUTOUPDATER",
    "DISABLE_FEEDBACK_COMMAND",
];
const CLAUDE_FEATURE_FLAG_BLOCKING_ENV: [&str; 3] = [
    "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC",
    "DISABLE_TELEMETRY",
    "DO_NOT_TRACK",
];

/// Execute one wrapper invocation and preserve the client's exit status.
pub async fn run(args: &WithArgs) -> ExitCode {
    match run_inner(args).await {
        Ok(code) => code,
        Err(error) => {
            eprintln!("error: {error}");
            ExitCode::from(1)
        }
    }
}

async fn run_inner(args: &WithArgs) -> Result<ExitCode, AnyError> {
    // `--global` and `--undo` are permanent client setup, which now has its
    // own name. Delegating rather than reimplementing is what keeps the two
    // spellings from drifting apart again — the address, the credential, the
    // reversal and the client list were four separate disagreements between
    // them (issue #296).
    if args.global || args.undo {
        return Ok(crate::configure::run(&args.as_configure()).await);
    }
    if args.reset_to_default_configuration && args.client != ClientKind::ClaudeCode {
        return Err("--reset-to-default-configuration is available only for Claude".into());
    }
    if args.reset_to_default_configuration {
        confirm_claude_profile_reset(args.yes)?;
    }
    if args.client.integration().isolation == ClientIsolation::Unsupported {
        return Err(args
            .client
            .setup_limitation()
            .unwrap_or("client integration is unsupported")
            .into());
    }
    if args.client == ClientKind::ClaudeCode {
        crate::clients::require_claude_gateway_version()?;
    }
    if let Some(error) = crate::client_launch::unsupported_native_command(args) {
        return Err(error.into());
    }
    let explicit_token = if args.token_stdin {
        Some(crate::server_command::read_token()?)
    } else {
        args.token.clone()
    };
    let server = if args.local {
        let mut server = crate::managed_server::discovered_local_router()
            .await
            .ok_or("no router is listening on this machine; start one with `router serve`, or drop --local to use the selected server")?;
        if let Some(token) = explicit_token {
            server.token = Some(token);
        }
        server
    } else {
        resolve(
            args.server.as_deref(),
            args.management_server.as_deref(),
            explicit_token,
            args.run_max_requests,
            args.managed,
        )
        .await?
    };
    // The label travels to the router and is stored there. It used to be the
    // name of the directory the run was launched from, so a deployment — which
    // may be someone else's machine, or a team's, or a provider's —
    // accumulated a list of the projects its users work in. Directory names are
    // usually project names (issue #316). The token id already identifies a
    // run, so the label needs to carry nothing else.
    let label = args
        .label
        .clone()
        .unwrap_or_else(|| format!("with-{}-{}", args.client, run_suffix()));
    let credential = prepare_run_credential(
        &server,
        args.client,
        &label,
        args.run_ttl_hours,
        !args.fixed_run_ttl,
    )
    .await?;
    // Which model the client uses, and how hard it thinks, are the user's own
    // settings. `with` chooses a route to a model, so both are left alone
    // unless the user asked — the rule `--global` already followed (issue
    // #295). A model is still resolved from the live catalog rather than a
    // name compiled into the router (issue #192) when one is genuinely needed.
    let selected = match resolve_model(args, &credential) {
        Ok(selected) => selected,
        Err(error) => {
            cleanup_after_setup_failure(credential).await;
            return Err(error);
        }
    };
    if let Some(model) = selected.as_deref()
        && let Err(error) = ensure_model_available(&credential, model)
    {
        cleanup_after_setup_failure(credential).await;
        return Err(error);
    }
    // Decided before the client is prepared: whether the run is a session or
    // a task also decides whether the router may answer the client's own
    // prompts on the user's behalf (issue #310).
    let plan = crate::client_launch::plan(
        args,
        selected.as_deref(),
        crate::client_launch::attached_to_a_terminal(),
    );
    if let Some(note) = plan.note {
        eprintln!("{note}");
    }
    let codex_reasoning_effort = if args.client == ClientKind::Codex && !args.isolated_config {
        configured_codex_reasoning_effort()?
    } else {
        None
    };
    let codex_bridge = if args.client == ClientKind::Codex
        && crate::codex_loopback_bridge::required(&server.base_url)?
    {
        Some(crate::codex_loopback_bridge::start_ephemeral(&server.base_url).await?)
    } else {
        None
    };
    let codex_backend_base_url = codex_bridge
        .as_ref()
        .map(crate::codex_loopback_bridge::EphemeralBridge::backend_base_url);
    let mut claude_profile = if args.client == ClientKind::ClaudeCode
        && !args.isolated_config
        && !args.extend_global_config
    {
        let path = persistent_profile_path(args.client, None)?;
        match crate::claude_profile::ProfileSession::prepare(
            path.clone(),
            args.reset_to_default_configuration,
        )
        .await
        {
            Ok(profile) => {
                debug_assert_eq!(profile.path(), path);
                Some(profile)
            }
            Err(error) => {
                cleanup_after_setup_failure(credential).await;
                return Err(error);
            }
        }
    } else {
        None
    };
    let mut temporary = match TemporaryClient::prepare(&Preparation {
        client: args.client,
        base_url: &server.base_url,
        token: &credential.token,
        model_override: selected.as_deref(),
        models: credential.models(),
        isolated_config: args.isolated_config,
        extend_user_configuration: args.extend_global_config,
        one_shot: plan.one_shot,
        profile_root: None,
        codex_reasoning_effort: codex_reasoning_effort.as_deref(),
        codex_backend_base_url,
    }) {
        Ok(temporary) => temporary,
        Err(error) => {
            cleanup_after_setup_failure(credential).await;
            return Err(error);
        }
    };
    temporary.codex_bridge = codex_bridge;
    let arguments = plan.arguments;
    let launch = temporary.launch(&arguments, claude_profile.as_mut()).await;
    if launch.as_ref().is_ok_and(|status| !status.success())
        && server.source == "managed local container"
        && let Some(hint) = crate::managed_server::managed_failure_hint()
    {
        eprintln!("warning: {hint}");
    }
    let cleanup = cleanup_run_credential(credential).await;
    let status = launch?;
    if let Err(error) = cleanup {
        eprintln!("warning: {error}; the short token TTL remains the cleanup backstop");
    }
    Ok(exit_code(status))
}

fn confirm_claude_profile_reset(yes: bool) -> Result<(), AnyError> {
    if yes {
        return Ok(());
    }
    if !std::io::stdin().is_terminal() {
        return Err(
            "Claude profile reset requires interactive confirmation; rerun with --yes before the client name"
                .into(),
        );
    }
    eprint!("Reset the Router-owned Claude profile and keep a recoverable backup? [y/N] ");
    std::io::stderr().flush()?;
    let mut response = String::new();
    std::io::stdin().read_line(&mut response)?;
    if matches!(response.trim().to_ascii_lowercase().as_str(), "y" | "yes") {
        Ok(())
    } else {
        Err("Claude profile reset cancelled; the previous profile is unchanged".into())
    }
}

/// A short, non-identifying suffix distinguishing concurrent runs.
///
/// Derived from the process id, which the router already knows it is talking
/// to and which says nothing about what the user is working on.
fn run_suffix() -> String {
    format!("{:04x}", std::process::id() & 0xffff)
}

async fn cleanup_after_setup_failure(credential: crate::managed_server::RunCredential) {
    if let Err(error) = cleanup_run_credential(credential).await {
        eprintln!("warning: {error}; the short token TTL remains the cleanup backstop");
    }
}

/// The model this run names, if it names one at all.
///
/// `None` is the ordinary answer: the client keeps whatever model its own
/// configuration selects. A model is resolved only when the user asked for one
/// with `--model`, asked the router to choose with `--pick-model`, or is
/// launching a client whose configuration embeds the catalog and so cannot
/// start without an id (issue #295).
fn resolve_model(
    args: &WithArgs,
    credential: &crate::managed_server::RunCredential,
) -> Result<Option<String>, AnyError> {
    if let Some(model) = args.model.clone() {
        return Ok(Some(model));
    }
    if !args.pick_model && !crate::client_launch::requires_a_model(args.client) {
        return Ok(None);
    }
    // One rule for which models suit a client, shared with `clients setup`
    // and `clients doctor` (issue #301).
    if let Some(model) = crate::clients::select_model(args.client, credential.models()) {
        if args.pick_model {
            // Report the choice and the reason for it. Choosing silently by
            // catalog order is what made the substitution invisible: the
            // client's own status line then presents the router's pick as
            // though the user had made it (issue #295).
            let owners = args.client.integration().model_owners;
            eprintln!(
                "note: --pick-model chose `{model}`, the first {} model the router advertises; \
                 pass --model to choose another",
                if owners.is_empty() {
                    "advertised".to_string()
                } else {
                    owners.join(" or ")
                }
            );
        }
        return Ok(Some(model.to_string()));
    }
    Err(crate::clients::model_unavailable(args.client, credential.models()).into())
}

struct TemporaryClient {
    directory: RunDirectory,
    command: Command,
    codex_bridge: Option<crate::codex_loopback_bridge::EphemeralBridge>,
}

/// Where a run that cannot layer onto the user's configuration keeps its files.
///
/// Claude and clients that require Router-written files keep a dedicated
/// profile under Router's configuration root. Persistence makes onboarding a
/// one-time event and keeps Router sessions resumable, without importing any
/// normal user profile contents (issues #298, #536).
///
/// Disposable is still right where it was asked for: `--isolated-config`, and
/// the scratch directory an extending run never actually reads.
enum RunDirectory {
    Disposable(DisposableRunDirectory),
    Persistent(PathBuf),
}

impl RunDirectory {
    fn path(&self) -> &Path {
        match self {
            Self::Disposable(directory) => directory.path(),
            Self::Persistent(path) => path,
        }
    }
}

/// The profile directory kept for a client that cannot be extended.
///
/// Under the router's own per-user directory, so it is neither the user's own
/// client configuration — nothing about the #277 boundary changes — nor a
/// shared `TMPDIR`, which removes the cross-user question issue #313 is about.
fn persistent_profile_path(client: ClientKind, root: Option<&Path>) -> Result<PathBuf, AnyError> {
    let root = match root {
        Some(root) => root.to_path_buf(),
        // An empty variable is unset, not configured (issue #340).
        None => crate::env_paths::require_absolute(
            crate::env_paths::directory("XDG_CONFIG_HOME")
                .or_else(|| crate::env_paths::directory("HOME").map(|home| home.join(".config")))
                .ok_or("HOME and XDG_CONFIG_HOME are unset; cannot keep a client profile")?,
            "the client profile directory",
        )?,
    };
    Ok(root
        .join("link-assistant-router/clients")
        .join(client.canonical_name())
        .join("home"))
}

fn persistent_profile(client: ClientKind, root: Option<&Path>) -> Result<PathBuf, AnyError> {
    let path = persistent_profile_path(client, root)?;
    fs::create_dir_all(&path)?;
    set_directory_owner_only(&path)?;
    Ok(path)
}

/// Whether this run layers the router's settings onto the user's normal
/// configuration, rather than giving the client a directory of its own.
///
/// Claude now opts into extension explicitly. Its default is a persistent
/// minimal Router profile so unrelated user settings cannot affect Router runs
/// while onboarding and sessions still persist (issue #536).
///
/// A client the router can only point at the model by writing a file is
/// isolated whatever was asked for, because the file is reachable only through
/// the directory isolation provides. That is a fallback rather than an error:
/// the user did not ask for isolation here, they asked to run a client, and
/// this is the only way it can be run.
///
/// Two separate reasons a client cannot be extended, and both must be checked:
/// it may set no connection variables at all, or it may set them and *still*
/// need a router-written settings file — Gemini CLI does exactly that, so
/// having both variables is not on its own enough to layer onto.
const fn extends_user_configuration(
    client: ClientKind,
    isolated_config: bool,
    extend_user_configuration: bool,
) -> bool {
    if isolated_config {
        return false;
    }
    if matches!(client, ClientKind::ClaudeCode) {
        return extend_user_configuration;
    }
    // Codex accepts repeatable global `-c key=TOML_VALUE` overlays before its
    // subcommand. That gives it router connection settings while its real
    // HOME/CODEX_HOME continues to supply sessions, MCP servers and preferences
    // (issue #379), even though it has no base-url environment variable.
    if matches!(client, ClientKind::Codex) {
        return true;
    }
    if needs_a_written_configuration(client) {
        return false;
    }
    let integration = client.integration();
    integration.token_env.is_some() && integration.base_url_env.is_some()
}

/// Whether routing this client depends on a file the router writes.
///
/// Gemini CLI is pointed at the router by a `settings.json` selecting the
/// API-key flow, which it resolves from `HOME`; without isolation that file is
/// written where the client never looks, and the run silently keeps whatever
/// the user's own settings said (issue #227).
const fn needs_a_written_configuration(client: ClientKind) -> bool {
    matches!(client, ClientKind::GeminiCli)
}

/// Everything one launch needs to be set up.
///
/// A struct rather than eight positional arguments: four of them are booleans
/// and optional paths, and a caller swapping two would still compile.
struct Preparation<'a> {
    client: ClientKind,
    base_url: &'a str,
    token: &'a str,
    model_override: Option<&'a str>,
    models: &'a [RouterModel],
    isolated_config: bool,
    extend_user_configuration: bool,
    one_shot: bool,
    profile_root: Option<&'a Path>,
    codex_reasoning_effort: Option<&'a str>,
    codex_backend_base_url: Option<&'a str>,
}

impl TemporaryClient {
    fn prepare(request: &Preparation<'_>) -> Result<Self, AnyError> {
        let &Preparation {
            client,
            base_url,
            token,
            model_override,
            models,
            isolated_config,
            extend_user_configuration,
            one_shot,
            profile_root,
            codex_reasoning_effort,
            codex_backend_base_url,
        } = request;
        // A client that can be extended never reads this directory — the
        // router's whole contribution is two environment variables — so it is
        // scratch and goes away. One that cannot is *living* here, and a
        // directory thrown away after every run made every launch a first
        // launch (issue #298).
        let keeps_a_profile = !isolated_config
            && !extends_user_configuration(client, false, extend_user_configuration);
        if isolated_config && needs_a_written_configuration(client) {
            // The flag changed nothing for this client: it is routed through a
            // file the router writes and never uses the user's own directory.
            // Accepting it silently left a script's author believing it had
            // done something (issue #312).
            eprintln!(
                "note: {} is configured through a file the router writes, so it never uses your \
                 own configuration directory; --isolated-config only makes its profile \
                 disposable",
                client.display_name()
            );
        }
        let prefix = format!("link-assistant-router-with-{}-", std::process::id());
        // The lease makes the cleanup decision independent of PID visibility:
        // another concurrent wrapper cannot remove files this client has not
        // opened yet, even in a restricted process environment.
        let disposable = DisposableRunDirectory::create(&prefix)?;
        let directory = if keeps_a_profile {
            RunDirectory::Persistent(persistent_profile(client, profile_root)?)
        } else {
            RunDirectory::Disposable(disposable)
        };
        let manager = ClientManager::isolated(directory.path());
        match client {
            // A Router-directed Claude launch is configured entirely through its
            // process environment and CLI settings. The profile belongs to
            // Claude itself; Router creates only its directory (issue #536).
            ClientKind::ClaudeCode => {}
            ClientKind::GeminiCli => write_gemini_settings(&manager.config_path(client))?,
            ClientKind::Cursor => {
                return Err(client
                    .setup_limitation()
                    .unwrap_or("Cursor is unsupported")
                    .into());
            }
            _ => {
                manager.setup_with_codex_backend(
                    client,
                    base_url,
                    models,
                    codex_backend_base_url,
                )?;
            }
        }
        let integration = client.integration();
        let mut command = Command::new(integration.command);
        if extends_user_configuration(client, isolated_config, extend_user_configuration) {
            // Layer the router's connection settings on top of the user's own
            // configuration rather than replacing it, so sessions and settings
            // stay visible and a conversation started outside the router can be
            // resumed through it (issue #233). For these clients the router's
            // whole contribution is the two variables set below, so isolation
            // was never needed for routing — only for isolation itself.
        } else {
            configure_isolation(&mut command, &manager, directory.path(), client, one_shot)?;
        }
        if let Some(token_env) = integration.token_env {
            command.env(token_env, token);
        }
        if client == ClientKind::Codex
            && let Some(alias) = crate::token::codex_token_alias(token)
        {
            command
                .env("CODEX_ACCESS_TOKEN", &alias)
                .env("CODEX_CONNECTORS_TOKEN", alias)
                .env(
                    "CODEX_AUTHAPI_BASE_URL",
                    endpoint(base_url, "/api/services/codex"),
                );
        }
        if let Some(base_env) = integration.base_url_env {
            command.env(base_env, endpoint(base_url, integration.endpoint_suffix));
        }
        // How hard the client thinks is the user's setting, not the router's.
        // A compile-time `xhigh` / `16384` applied to a user who never asked
        // is not a neutral default — it is the most expensive one, chosen for
        // someone who may be paying per token (issue #295). Setting nothing
        // here leaves the client's own configuration in charge, and lets the
        // user's `MAX_THINKING_TOKENS` or `OPENAI_REASONING_EFFORT` reach it
        // through the inherited environment as it would without the router.
        match client {
            ClientKind::ClaudeCode => {
                append_claude_model_picker(&mut command, models)?;
                // Emptied rather than left alone: an inherited API key
                // outranks the auth token, so the run would leave the router.
                command
                    .env("ANTHROPIC_API_KEY", "")
                    .env("CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY", "1");
                apply_claude_privacy_overlay(&mut command);
                // Claude Code's built-in family aliases describe Anthropic
                // models. A z.ai-only catalog needs only the same exact pair
                // of main/subagent pins as persistent setup. Assigning one GLM
                // id to every family creates fake Opus/Sonnet/Haiku rows.
                let gateway_model = crate::clients::claude_gateway_model(models, model_override);
                if let Some(gateway_model) = gateway_model {
                    for key in crate::clients::CLAUDE_GATEWAY_TARGET_ENV {
                        command.env(key, &gateway_model);
                    }
                    for key in crate::clients::CLAUDE_MODEL_ENV {
                        if !crate::clients::CLAUDE_GATEWAY_TARGET_ENV.contains(&key) {
                            command.env_remove(key);
                        }
                    }
                }
            }
            ClientKind::GeminiCli => {
                // `GEMINI_CLI_TRUST_WORKSPACE` is deliberately not set here.
                // That prompt is the client's protection against being pointed
                // at an unfamiliar checkout with file access, and answering it
                // for a user who is sitting right there and could answer is
                // not the router's call (issue #310). The non-interactive path
                // sets it, because a batch run cannot answer a prompt.
                command.env("GEMINI_DEFAULT_AUTH_TYPE", "gemini-api-key");
            }
            ClientKind::QwenCode => {
                command.env("OPENAI_API_KEY", token).env(
                    "OPENAI_BASE_URL",
                    endpoint(base_url, integration.endpoint_suffix),
                );
                // Qwen Code reads its model from the environment and cannot
                // start without one, so this is the client's requirement.
                if let Some(model) = model_override {
                    command.env("OPENAI_MODEL", model);
                }
            }
            ClientKind::Codex => {
                if !isolated_config {
                    let catalog = write_codex_model_catalog(
                        directory.path(),
                        models,
                        codex_reasoning_effort,
                        model_override,
                    )?;
                    append_codex_router_overrides(
                        &mut command,
                        base_url,
                        codex_backend_base_url,
                        &catalog,
                    )?;
                }
            }
            ClientKind::GrokCli | ClientKind::Opencode | ClientKind::Agent | ClientKind::Cursor => {
            }
        }
        Ok(Self {
            directory,
            command,
            codex_bridge: None,
        })
    }

    async fn launch(
        mut self,
        arguments: &[OsString],
        profile: Option<&mut crate::claude_profile::ProfileSession>,
    ) -> Result<std::process::ExitStatus, AnyError> {
        let _codex_bridge = self.codex_bridge.take();
        // Keep process-local configuration alive until the client has fully
        // exited. Once `self.command` is moved into Tokio, the compiler may
        // otherwise drop this now-unused field while the child is still
        // starting and before it opens files such as Codex's model catalog.
        let directory = self.directory;
        debug_assert!(directory.path().is_dir());
        self.command.args(arguments);
        let program = self.command.get_program().to_string_lossy().into_owned();
        let mut child = tokio::process::Command::from(self.command)
            .kill_on_drop(true)
            .spawn()
            .map_err(|error| -> AnyError {
            if error.kind() == std::io::ErrorKind::NotFound {
                format!(
                    "client executable `{program}` is not installed or not on PATH; install {program} and retry"
                )
                .into()
            } else {
                format!("could not launch {program}: {error}").into()
            }
        })?;
        if let Some(profile) = profile
            && let Err(error) = profile.commit_launch(child.id().unwrap_or_else(std::process::id))
        {
            let _ = child.start_kill();
            let _ = child.wait().await;
            return Err(error);
        }
        let status = tokio::select! {
            result = child.wait() => result.map_err(Into::into),
            signal = tokio::signal::ctrl_c() => {
                signal.map_err(|error| format!("could not listen for Ctrl-C: {error}"))?;
                interrupt_child(&mut child).await
            }
        };
        drop(directory);
        status
    }
}

/// Apply privacy defaults that do not disable Claude Code's remote feature
/// evaluation, while preserving every value the invoking user already owns.
///
/// The umbrella switch, `DISABLE_TELEMETRY`, and a truthy `DO_NOT_TRACK`
/// disable the feature flags that gate tools such as `Monitor` in Claude Code
/// 2.1.265. Router therefore never installs or clears them. The remaining
/// controls are process-local defaults rather than persistent settings (issue
/// #551).
fn apply_claude_privacy_overlay(command: &mut Command) {
    for key in CLAUDE_PRIVACY_DEFAULT_ENV {
        if std::env::var_os(key).is_none() {
            command.env(key, "1");
        }
    }

    let blockers = CLAUDE_FEATURE_FLAG_BLOCKING_ENV
        .into_iter()
        .filter(|key| {
            std::env::var_os(key).is_some_and(|value| {
                if *key == "DO_NOT_TRACK" {
                    value == "1" || value.eq_ignore_ascii_case("true")
                } else {
                    !value.is_empty()
                }
            })
        })
        .collect::<Vec<_>>();
    if !blockers.is_empty() {
        eprintln!(
            "warning: inherited {} preserves your privacy choice but disables Claude Code \
             feature-flag evaluation; feature-flag-gated tools such as `Monitor` may be \
             unavailable; Router leaves the user-owned value unchanged",
            blockers.join(" and ")
        );
    }
}

/// Extend Claude's native picker with exact compatible IDs that its gateway
/// discovery filter removes. This is a command-line setting for this process
/// only: neither the Router-owned profile nor the user's profile is rewritten.
fn append_claude_model_picker(
    command: &mut Command,
    models: &[RouterModel],
) -> Result<(), AnyError> {
    const BUILT_INS: [&str; 4] = ["default", "opus", "sonnet", "haiku"];

    let mut candidates = crate::clients::usable_models(ClientKind::ClaudeCode, models)
        .into_iter()
        .filter(|model| {
            let folded = model.id.to_ascii_lowercase();
            model.owned_by == crate::clients::ZAI_MODEL_OWNER
                && !BUILT_INS.contains(&folded.as_str())
        })
        .collect::<Vec<_>>();
    candidates.sort_by(|left, right| left.id.cmp(&right.id));
    if candidates.is_empty() {
        return Ok(());
    }
    let mut options = Vec::with_capacity(candidates.len());
    let mut previous: Option<(String, String, String)> = None;
    for model in candidates {
        let Some(capability) = model.client_capabilities.claude else {
            return Err(format!(
                "Claude model `{}` has no verified capability metadata; update Router or the provider adapter before selecting it",
                model.id
            )
            .into());
        };
        if capability.behaves_as.trim().is_empty() || capability.source.trim().is_empty() {
            return Err(format!(
                "Claude model `{}` has incomplete capability metadata; update Router or the provider adapter before selecting it",
                model.id
            )
            .into());
        }
        if let Some((id, behaves_as, source)) = &previous
            && id == &model.id
        {
            if behaves_as != &capability.behaves_as || source != &capability.source {
                return Err(format!(
                    "Claude model `{}` has ambiguous capability metadata; update the provider adapter before selecting it",
                    model.id
                )
                .into());
            }
            continue;
        }
        options.push(json!({
            "label": model.id,
            "model": model.id,
            "behavesAs": capability.behaves_as,
        }));
        previous = Some((model.id, capability.behaves_as, capability.source));
    }
    let settings = json!({
        "modelPicker": {
            "options": options,
            "replaceBuiltInOptions": false,
        }
    });
    command
        .arg("--settings")
        .arg(serde_json::to_string(&settings)?);
    Ok(())
}

/// Overlay routing for an ordinary Codex run. Values after `-c` are TOML;
/// JSON strings quote them safely while the token stays in the environment.
fn append_codex_router_overrides(
    command: &mut Command,
    base_url: &str,
    codex_backend_base_url: Option<&str>,
    catalog: &Path,
) -> Result<(), AnyError> {
    let provider_id = format!("link-assistant-run-{}", uuid::Uuid::new_v4().simple());
    let provider_key = format!("model_providers.{provider_id}");
    let provider_base_url = endpoint(
        base_url,
        crate::route_contract::service_base_path(crate::route_contract::ServiceKind::Codex),
    );
    let provider = format!(
        "{{ name = {}, base_url = {}, wire_api = \"responses\", requires_openai_auth = true, \
         supports_websockets = true, supports_standalone_web_search = true }}",
        serde_json::to_string("OpenAI")?,
        serde_json::to_string(&provider_base_url)?,
    );
    for (key, value) in [
        ("model_provider", provider_id),
        ("model_catalog_json", catalog.to_string_lossy().into_owned()),
        (provider_key.as_str(), provider),
        (
            "chatgpt_base_url",
            codex_backend_base_url.map_or_else(
                || endpoint(base_url, "/api/services/codex/backend-api"),
                str::to_string,
            ),
        ),
        (
            "experimental_realtime_ws_base_url",
            provider_base_url.clone(),
        ),
        (
            "experimental_realtime_webrtc_call_base_url",
            provider_base_url,
        ),
    ] {
        let rendered = if key == provider_key.as_str() {
            value
        } else {
            serde_json::to_string(&value)?
        };
        command.arg("-c").arg(format!("{key}={rendered}"));
    }
    Ok(())
}

/// Read the preference needed by Codex's process-local model picker without
/// rewriting its real configuration.
fn configured_codex_reasoning_effort() -> Result<Option<String>, AnyError> {
    let path = ClientManager::from_env()?.config_path(ClientKind::Codex);
    let source = match fs::read_to_string(&path) {
        Ok(source) => source,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(None),
        Err(error) => {
            return Err(format!("could not read Codex config {}: {error}", path.display()).into());
        }
    };
    let document = source.parse::<toml_edit::DocumentMut>().map_err(|error| {
        format!(
            "could not read `model_reasoning_effort` from Codex config {}: {error}",
            path.display()
        )
    })?;
    let Some(item) = document.get("model_reasoning_effort") else {
        return Ok(None);
    };
    let effort = item
        .as_str()
        .filter(|effort| !effort.trim().is_empty())
        .ok_or_else(|| {
            format!(
                "Codex config {} has a non-string or empty `model_reasoning_effort`",
                path.display()
            )
        })?;
    Ok(Some(effort.to_string()))
}

async fn interrupt_child(
    child: &mut tokio::process::Child,
) -> Result<std::process::ExitStatus, AnyError> {
    #[cfg(unix)]
    if let Some(pid) = child.id() {
        let _ = std::process::Command::new("kill")
            .args(["-INT", &pid.to_string()])
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status();
    }
    #[cfg(windows)]
    child.start_kill()?;
    if let Ok(result) = tokio::time::timeout(Duration::from_secs(5), child.wait()).await {
        result.map_err(Into::into)
    } else {
        child.start_kill()?;
        child.wait().await.map_err(Into::into)
    }
}

fn configure_isolation(
    command: &mut Command,
    manager: &ClientManager,
    root: &Path,
    client: ClientKind,
    one_shot: bool,
) -> Result<(), AnyError> {
    match client.integration().isolation {
        ClientIsolation::Home => {
            command
                .env("HOME", root)
                .env_remove("CODEX_HOME")
                .env_remove("QWEN_HOME");
        }
        ClientIsolation::ClaudeConfig => {
            command.env("CLAUDE_CONFIG_DIR", root);
        }
        ClientIsolation::GeminiHome => {
            // Gemini CLI resolves its settings as `<home>/.gemini/settings.json`,
            // where `<home>` is `GEMINI_CLI_HOME` if set and `$HOME` otherwise.
            // The router pointed `GEMINI_CLI_HOME` at the `.gemini` directory
            // itself, so the CLI looked in `<root>/.gemini/.gemini/` — found no
            // settings, fell back to the user's personal ones, and refused the
            // run with `Invalid auth method selected.` (issue #227).
            //
            // Both variables therefore name the *root*, and `HOME` is overridden
            // as well so nothing else the CLI stores escapes into the real home.
            command.env("HOME", root).env("GEMINI_CLI_HOME", root);
            // With auth fixed the next wall is the trusted-directory prompt,
            // which a one-shot run cannot answer. That is the whole reason for
            // pre-answering it — and the condition was never written into the
            // code, so an interactive user, who is sitting right there and
            // could answer, was answered for (issue #310).
            if one_shot {
                eprintln!(
                    "note: answering Gemini CLI's workspace-trust prompt for this one-shot run; \
                     an interactive run asks you instead"
                );
                command.env("GEMINI_CLI_TRUST_WORKSPACE", "true");
            }
        }
        ClientIsolation::ConfigFile => {
            let path = manager.config_path(client);
            if client == ClientKind::Opencode {
                command
                    .env("OPENCODE_CONFIG", &path)
                    .env("OPENCODE_CONFIG_DIR", path.parent().expect("config parent"));
            } else {
                command.env("HOME", root).env(
                    "LINK_ASSISTANT_AGENT_CONFIG_CONTENT",
                    fs::read_to_string(path)?,
                );
            }
        }
        ClientIsolation::Environment => {}
        ClientIsolation::Unsupported => return Err("unsupported client isolation".into()),
    }
    Ok(())
}

fn endpoint(base_url: &str, suffix: &str) -> String {
    format!("{}{}", base_url.trim_end_matches('/'), suffix)
}

fn write_gemini_settings(path: &Path) -> Result<(), AnyError> {
    let contents = format!(
        "{}\n",
        serde_json::to_string_pretty(&json!({
            "security": {"auth": {"selectedType": "gemini-api-key"}}
        }))?
    );
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    // Truncating, not `create_new`: an isolated run must be governed by the
    // settings the router wrote. Deferring to a pre-existing file would let an
    // inherited `oauth-personal` survive and fail the run (issue #227).
    let mut options = OpenOptions::new();
    options.create(true).truncate(true).write(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt as _;
        options.mode(0o600);
    }
    let mut file = options.open(path)?;
    file.write_all(contents.as_bytes())?;
    Ok(())
}

fn exit_code(status: std::process::ExitStatus) -> ExitCode {
    if let Some(code) = status.code() {
        return ExitCode::from(u8::try_from(code).unwrap_or(1));
    }
    #[cfg(unix)]
    {
        use std::os::unix::process::ExitStatusExt as _;
        ExitCode::from(
            status
                .signal()
                .and_then(|signal| u8::try_from(128 + signal).ok())
                .unwrap_or(1),
        )
    }
    #[cfg(not(unix))]
    ExitCode::from(1)
}

#[cfg(test)]
#[path = "with_command_tests.rs"]
mod tests;

#[cfg(test)]
#[path = "with_command_sweep_tests.rs"]
mod sweep_tests;
