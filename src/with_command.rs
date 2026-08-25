//! Temporary-by-default launcher shared by `router with` and `with-router`.

use std::ffi::OsString;
use std::fs::{self, OpenOptions};
use std::io::Write as _;
use std::path::Path;
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

type AnyError = Box<dyn std::error::Error + Send + Sync>;

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
    if args.client.integration().isolation == ClientIsolation::Unsupported {
        return Err(args
            .client
            .setup_limitation()
            .unwrap_or("client integration is unsupported")
            .into());
    }
    let explicit_token = if args.token_stdin {
        Some(crate::server_command::read_token()?)
    } else {
        args.token.clone()
    };
    let server = resolve(
        args.server.as_deref(),
        explicit_token,
        args.run_max_requests,
        args.managed,
    )
    .await?;
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
    let credential = prepare_run_credential(&server, &label, args.run_ttl_hours).await?;
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
    let temporary = match TemporaryClient::prepare(
        args.client,
        &server.base_url,
        &credential.token,
        selected.as_deref(),
        credential.models(),
        args.isolated_config,
        plan.one_shot,
    ) {
        Ok(temporary) => temporary,
        Err(error) => {
            cleanup_after_setup_failure(credential).await;
            return Err(error);
        }
    };
    let arguments = plan.arguments;
    let launch = temporary.launch(&arguments).await;
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
    directory: tempfile::TempDir,
    command: Command,
}

/// Whether this run layers the router's settings onto the user's own
/// configuration, rather than giving the client a directory of its own.
///
/// Extending is the default: `with` changes how the client reaches the model,
/// and discarding the user's theme, permissions, MCP servers and prior sessions
/// is a far larger side effect than that implies (issue #277).
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
const fn extends_user_configuration(client: ClientKind, isolated_config: bool) -> bool {
    if isolated_config || needs_a_written_configuration(client) {
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

impl TemporaryClient {
    fn prepare(
        client: ClientKind,
        base_url: &str,
        token: &str,
        model_override: Option<&str>,
        models: &[RouterModel],
        isolated_config: bool,
        one_shot: bool,
    ) -> Result<Self, AnyError> {
        let prefix = format!("link-assistant-router-with-{}-", std::process::id());
        let directory = tempfile::Builder::new().prefix(&prefix).tempdir()?;
        set_directory_owner_only(directory.path())?;
        // Swept after this run's own directory exists, so it can serve as the
        // reference for "owned by me" without a privileged call (issue #313).
        sweep_stale_directories(directory.path());
        let manager = ClientManager::isolated(directory.path());
        match client {
            ClientKind::GeminiCli => write_gemini_settings(&manager.config_path(client))?,
            ClientKind::Cursor => {
                return Err(client
                    .setup_limitation()
                    .unwrap_or("Cursor is unsupported")
                    .into());
            }
            _ => {
                manager.setup(client, base_url, models)?;
            }
        }
        let integration = client.integration();
        let mut command = Command::new(integration.command);
        if extends_user_configuration(client, isolated_config) {
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
                // Emptied rather than left alone: an inherited API key
                // outranks the auth token, so the run would leave the router.
                command.env("ANTHROPIC_API_KEY", "");
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
                command
                    .env("OPENAI_API_KEY", token)
                    .env("OPENAI_BASE_URL", endpoint(base_url, "/v1"));
                // Qwen Code reads its model from the environment and cannot
                // start without one, so this is the client's requirement.
                if let Some(model) = model_override {
                    command.env("OPENAI_MODEL", model);
                }
            }
            ClientKind::Codex
            | ClientKind::GrokCli
            | ClientKind::Opencode
            | ClientKind::Agent
            | ClientKind::Cursor => {}
        }
        Ok(Self { directory, command })
    }

    async fn launch(
        mut self,
        arguments: &[OsString],
    ) -> Result<std::process::ExitStatus, AnyError> {
        debug_assert!(self.directory.path().is_dir());
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
        tokio::select! {
            result = child.wait() => result.map_err(Into::into),
            signal = tokio::signal::ctrl_c() => {
                signal.map_err(|error| format!("could not listen for Ctrl-C: {error}"))?;
                interrupt_child(&mut child).await
            }
        }
    }
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
            let config_path = manager.config_path(client);
            let directory = config_path.parent().expect("Claude config has a parent");
            command.env("CLAUDE_CONFIG_DIR", directory);
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

/// Remove leftovers from runs of *this user* that are no longer alive.
///
/// A pid is not a liveness token across a trust boundary. On a shared `TMPDIR`
/// — the usual `/tmp`, any multi-user host, a build agent running jobs as
/// different users — `kill(pid, 0)` on another user's live process fails with
/// `EPERM`, and treating any failure as "dead" deleted that run's working
/// directory, client configuration and credential while it was in use (issue
/// #313). So ownership is checked first, and a process that exists but is not
/// ours counts as alive.
///
/// `ours` is a directory this run just created, used as the reference for
/// "mine": comparing owners needs no privileged call and no `unsafe`.
fn sweep_stale_directories(ours: &Path) {
    const PREFIX: &str = "link-assistant-router-with-";
    let Some(uid) = owner_of(ours) else {
        return;
    };
    let Ok(entries) = fs::read_dir(std::env::temp_dir()) else {
        return;
    };
    for entry in entries.flatten() {
        let name = entry.file_name();
        let name = name.to_string_lossy();
        let Some(rest) = name.strip_prefix(PREFIX) else {
            continue;
        };
        let Some(pid) = rest.split('-').next().and_then(|value| value.parse().ok()) else {
            continue;
        };
        if entry.path() == ours || owner_of(&entry.path()) != Some(uid) || process_alive(pid) {
            continue;
        }
        if fs::remove_dir_all(entry.path()).is_ok() {
            eprintln!("note: removed a leftover run directory from process {pid}");
        }
    }
}

/// The numeric owner of a path, where the platform has one.
///
/// `None` on non-unix, where every directory compares equal and the liveness
/// check decides alone — there is no shared `TMPDIR` in the same sense.
fn owner_of(path: &Path) -> Option<u32> {
    #[cfg(unix)]
    {
        use std::os::unix::fs::MetadataExt as _;

        fs::metadata(path).ok().map(|metadata| metadata.uid())
    }
    #[cfg(not(unix))]
    {
        let _ = path;
        Some(0)
    }
}

/// Whether the process might still be running.
///
/// "Might" is the contract: a check that cannot tell "gone" from "not yours"
/// must answer alive, because the cost of being wrong is deleting a live run's
/// files, and the cost of being right late is one directory swept next time.
fn process_alive(pid: u32) -> bool {
    if pid == std::process::id() {
        return true;
    }
    #[cfg(unix)]
    {
        let signalled = std::process::Command::new("kill")
            .args(["-0", &pid.to_string()])
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status()
            .is_ok_and(|status| status.success());
        if signalled {
            return true;
        }
        // `kill -0` fails both for "no such process" and for a live process
        // owned by somebody else. `ps` answers the question that was actually
        // asked — does this pid exist — for any owner, so `EPERM` can no
        // longer read as "dead" (issue #313).
        std::process::Command::new("ps")
            .args(["-p", &pid.to_string()])
            .stdout(Stdio::piped())
            .stderr(Stdio::null())
            .output()
            .is_ok_and(|output| {
                String::from_utf8_lossy(&output.stdout)
                    .lines()
                    .filter(|line| !line.trim().is_empty())
                    .count()
                    > 1
            })
    }
    #[cfg(windows)]
    {
        std::process::Command::new("tasklist")
            .args(["/FI", &format!("PID eq {pid}"), "/NH"])
            .output()
            .is_ok_and(|output| {
                output.status.success()
                    && String::from_utf8_lossy(&output.stdout).contains(&pid.to_string())
            })
    }
}

fn set_directory_owner_only(path: &Path) -> Result<(), std::io::Error> {
    #[cfg(not(unix))]
    let _ = path;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt as _;
        fs::set_permissions(path, fs::Permissions::from_mode(0o700))?;
    }
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
mod tests {
    use super::*;

    /// Gemini CLI resolves settings as `<home>/.gemini/settings.json`, where
    /// `<home>` is `GEMINI_CLI_HOME` if set and `$HOME` otherwise. Pointing
    /// `GEMINI_CLI_HOME` at the `.gemini` directory made it look one level too
    /// deep, fall back to the user's personal settings, and refuse the run
    /// (issue #227). Both variables must therefore name the root.
    #[test]
    fn the_gemini_client_is_pointed_at_the_isolated_home() {
        let root = tempfile::tempdir().expect("isolated root");
        let manager = ClientManager::isolated(root.path());
        let mut command = Command::new("gemini");
        configure_isolation(
            &mut command,
            &manager,
            root.path(),
            ClientKind::GeminiCli,
            true,
        )
        .expect("configure gemini isolation");

        let environment: std::collections::HashMap<_, _> = command
            .get_envs()
            .filter_map(|(key, value)| Some((key.to_string_lossy().into_owned(), value?)))
            .collect();

        for name in ["HOME", "GEMINI_CLI_HOME"] {
            assert_eq!(
                environment.get(name).map(|value| value.to_string_lossy()),
                Some(root.path().to_string_lossy()),
                "{name} must name the isolated root, not the .gemini directory \
                 inside it — the CLI appends `.gemini` itself"
            );
        }
        // The file the CLI actually reads lives under that home.
        assert_eq!(
            manager.config_path(ClientKind::GeminiCli),
            root.path().join(".gemini/settings.json")
        );
        // The trusted-directory prompt cannot be answered non-interactively.
        assert_eq!(
            environment
                .get("GEMINI_CLI_TRUST_WORKSPACE")
                .map(|value| value.to_string_lossy()),
            Some(std::borrow::Cow::Borrowed("true"))
        );
    }

    /// End to end: after preparing the client, the file Gemini CLI actually
    /// reads must exist and select the API-key flow. The router previously
    /// wrote a correct file the CLI never opened (issue #227).
    /// By default the client keeps its own configuration directory, so sessions
    /// started outside the router remain visible and a conversation can be
    /// resumed through it (issue #233), and an interactive user does not land in
    /// first-run onboarding (issue #277).
    #[test]
    fn the_users_configuration_is_kept_by_default() {
        let models = [RouterModel {
            id: "test-model".to_string(),
            owned_by: "test".to_string(),
        }];
        let extended = TemporaryClient::prepare(
            ClientKind::ClaudeCode,
            "http://router.test",
            "task-token",
            None,
            &models,
            false,
            true,
        )
        .expect("prepare with the default configuration handling");
        let names: Vec<String> = extended
            .command
            .get_envs()
            .map(|(name, _)| name.to_string_lossy().into_owned())
            .collect();
        assert!(
            !names.iter().any(|name| name == "CLAUDE_CONFIG_DIR"),
            "the user's configuration directory must not be repointed: {names:?}"
        );
        // The router's actual contribution is still applied.
        for required in ["ANTHROPIC_AUTH_TOKEN", "ANTHROPIC_BASE_URL"] {
            assert!(
                names.iter().any(|name| name == required),
                "{required} missing: {names:?}"
            );
        }

        // Asking for isolation still repoints the directory.
        let isolated = TemporaryClient::prepare(
            ClientKind::ClaudeCode,
            "http://router.test",
            "task-token",
            None,
            &models,
            true,
            true,
        )
        .expect("prepare isolated");
        assert!(
            isolated
                .command
                .get_envs()
                .any(|(name, _)| name == "CLAUDE_CONFIG_DIR"),
            "--isolated-config must still give the client its own directory"
        );
    }

    /// A client configured through a file is isolated even though extending is
    /// the default, because there is nothing to layer short of rewriting that
    /// file.
    ///
    /// A fallback rather than an error: the user did not ask for isolation, they
    /// asked to run a client, and this is the only way it can be run. Refusing
    /// was right while extending was opt-in — the flag could not be honoured —
    /// but as a default it would make `with opencode` fail outright (issue
    /// #277).
    #[test]
    fn a_file_configured_client_is_isolated_even_by_default() {
        let models = [RouterModel {
            id: "test-model".to_string(),
            owned_by: "test".to_string(),
        }];
        assert!(
            !extends_user_configuration(ClientKind::Opencode, false),
            "opencode sets no base-url variable, so there is nothing to layer"
        );
        assert!(
            extends_user_configuration(ClientKind::ClaudeCode, false),
            "claude code sets both variables, so the default extends"
        );
        assert!(
            !extends_user_configuration(ClientKind::ClaudeCode, true),
            "--isolated-config wins over the default"
        );

        // And it still prepares rather than failing.
        TemporaryClient::prepare(
            ClientKind::Opencode,
            "http://router.test",
            "task-token",
            None,
            &models,
            false,
            true,
        )
        .expect("a file-configured client must still run");
    }

    /// Gemini CLI sets both connection variables and still cannot be extended.
    ///
    /// It is pointed at the router by a `settings.json` it resolves from `HOME`,
    /// so extending — which leaves `HOME` alone — would write that file where
    /// the client never looks and let the user's own settings decide the run
    /// (issue #227). Having both variables is therefore not enough to layer
    /// onto, and the default must not assume it is.
    #[test]
    fn a_client_needing_a_written_file_is_isolated_despite_its_variables() {
        let integration = ClientKind::GeminiCli.integration();
        assert!(
            integration.token_env.is_some() && integration.base_url_env.is_some(),
            "the variables alone would otherwise qualify it for extending"
        );
        assert!(
            !extends_user_configuration(ClientKind::GeminiCli, false),
            "routing depends on a file only isolation makes reachable"
        );
    }

    #[test]
    fn a_prepared_gemini_run_leaves_settings_where_the_cli_reads_them() {
        let models = [RouterModel {
            id: "test-model".to_string(),
            owned_by: "test".to_string(),
        }];
        let temporary = TemporaryClient::prepare(
            ClientKind::GeminiCli,
            "http://router.test",
            "task-token",
            None,
            &models,
            false,
            true,
        )
        .expect("prepare gemini");
        let root = temporary.directory.path();
        let home = temporary
            .command
            .get_envs()
            .find_map(|(name, value)| (name == "HOME").then_some(value?))
            .expect("gemini run sets HOME");
        // The CLI resolves its settings from HOME; the file must be there.
        let settings = Path::new(home).join(".gemini/settings.json");
        assert!(
            settings.is_file(),
            "no settings at {}, which is where the CLI looks",
            settings.display()
        );
        let written = fs::read_to_string(&settings).expect("read settings");
        assert!(written.contains("gemini-api-key"), "{written}");
        assert!(Path::new(home).starts_with(root), "HOME escaped the root");
    }

    /// An isolated run must be governed by the settings the router wrote. The
    /// previous `create_new` silently deferred to whatever was already there,
    /// which with the `HOME` fix would let an inherited `oauth-personal`
    /// survive and fail the run.
    #[test]
    fn written_gemini_settings_replace_an_existing_file() {
        let root = tempfile::tempdir().expect("isolated root");
        let path = root.path().join(".gemini/settings.json");
        fs::create_dir_all(path.parent().expect("parent")).expect("create directory");
        fs::write(
            &path,
            r#"{"security":{"auth":{"selectedType":"oauth-personal"}}}"#,
        )
        .expect("seed a conflicting file");

        write_gemini_settings(&path).expect("write settings");

        let written = fs::read_to_string(&path).expect("read settings");
        assert!(written.contains("gemini-api-key"), "{written}");
        assert!(
            !written.contains("oauth-personal"),
            "the inherited value survived: {written}"
        );
    }

    /// The value itself is the one the CLI accepts; a wrong spelling is what
    /// produced the original error, so it is pinned rather than assumed.
    #[test]
    fn gemini_settings_select_the_api_key_flow() {
        let root = tempfile::tempdir().expect("isolated root");
        let path = root.path().join(".gemini/settings.json");
        write_gemini_settings(&path).expect("write settings");
        let written: serde_json::Value =
            serde_json::from_str(&fs::read_to_string(&path).expect("read")).expect("valid JSON");
        assert_eq!(
            written["security"]["auth"]["selectedType"],
            "gemini-api-key"
        );
    }

    #[test]
    fn every_supported_client_prepares_below_a_disposable_root() {
        let models = [RouterModel {
            id: "test-model".to_string(),
            owned_by: "test".to_string(),
        }];
        for client in ClientKind::ALL {
            if client == ClientKind::Cursor {
                assert!(
                    TemporaryClient::prepare(
                        client,
                        "http://router.test",
                        "task-token",
                        None,
                        &models,
                        false,
                        true,
                    )
                    .is_err()
                );
                continue;
            }
            let temporary = TemporaryClient::prepare(
                client,
                "http://router.test",
                "task-token",
                None,
                &models,
                false,
                true,
            )
            .unwrap_or_else(|error| panic!("{client} failed temporary setup: {error}"));
            let root = temporary.directory.path().to_path_buf();
            assert_eq!(temporary.command.get_program(), client.command());
            let environment = temporary
                .command
                .get_envs()
                .filter_map(|(name, value)| value.map(|value| (name, value)))
                .collect::<std::collections::HashMap<_, _>>();
            if let Some(token_env) = client.token_env() {
                assert_eq!(
                    environment.get(std::ffi::OsStr::new(token_env)).copied(),
                    Some(std::ffi::OsStr::new("task-token")),
                    "{client} did not receive its token environment"
                );
            }
            for name in [
                "HOME",
                "CLAUDE_CONFIG_DIR",
                "GEMINI_CLI_HOME",
                "OPENCODE_CONFIG",
                "OPENCODE_CONFIG_DIR",
            ] {
                if let Some(value) = environment.get(std::ffi::OsStr::new(name)) {
                    assert!(
                        Path::new(value).starts_with(&root),
                        "{client} {name} escaped the temporary root"
                    );
                }
            }
            drop(temporary);
            assert!(!root.exists(), "{client} temporary root survived drop");
        }
    }

    #[test]
    fn registry_order_matches_client_discriminants() {
        for client in ClientKind::ALL {
            assert_eq!(client.integration().kind, client);
        }
    }
}

#[cfg(test)]
#[path = "with_command_sweep_tests.rs"]
mod sweep_tests;
