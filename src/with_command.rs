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
    if args.undo {
        crate::client_global::undo(args.client)?;
        return Ok(ExitCode::SUCCESS);
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
    if args.global {
        if server.source == "managed local container" {
            crate::managed_server::start_managed()?;
        }
        if !matches!(
            args.client,
            ClientKind::Opencode | ClientKind::QwenCode | ClientKind::Agent
        ) {
            crate::client_global::configure(args.client, &server.base_url, &[])?;
            return Ok(ExitCode::SUCCESS);
        }
    }
    let working_directory = std::env::current_dir()
        .ok()
        .and_then(|path| {
            path.file_name()
                .map(|name| name.to_string_lossy().into_owned())
        })
        .unwrap_or_else(|| "unknown-workdir".to_string());
    let label = format!("with-{}-{working_directory}", args.client);
    let credential = prepare_run_credential(&server, &label, args.run_ttl_hours).await?;
    if args.global {
        let configured =
            crate::client_global::configure(args.client, &server.base_url, credential.models());
        let cleanup = cleanup_run_credential(credential).await;
        configured?;
        if let Err(error) = cleanup {
            eprintln!("warning: {error}; the short token TTL remains the cleanup backstop");
        }
        return Ok(ExitCode::SUCCESS);
    }
    // Resolve the concrete model from the live catalog rather than a name
    // compiled into the router (issue #192).
    let owner = args.client.integration().model_owner;
    let selected = if let Some(model) = args.model.clone() {
        model
    } else if let Some(model) = credential.select_model(owner) {
        model.to_string()
    } else {
        // Name what the catalog *does* hold: "only openai models" is a much
        // shorter path to the real cause — a lapsed subscription — than the
        // unrecognised-model error the client would otherwise report about
        // itself (issue #225).
        let advertised = credential.advertised_owners();
        let holdings = if advertised.is_empty() {
            "the catalog is empty".to_string()
        } else {
            format!("it advertises only {} models", advertised.join(", "))
        };
        cleanup_after_setup_failure(credential).await;
        return Err(format!(
            "the router advertises no model for {} ({owner} models): {holdings}. Authorize a \
             matching subscription on the router host, or pass --model explicitly",
            args.client.integration().name
        )
        .into());
    };
    let model = selected.as_str();
    if let Err(error) = ensure_model_available(&credential, model) {
        cleanup_after_setup_failure(credential).await;
        return Err(error);
    }
    let temporary = match TemporaryClient::prepare(
        args.client,
        &server.base_url,
        &credential.token,
        Some(model),
        credential.models(),
        args.isolated_config,
    ) {
        Ok(temporary) => temporary,
        Err(error) => {
            cleanup_after_setup_failure(credential).await;
            return Err(error);
        }
    };
    let arguments = client_arguments(args, model);
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

async fn cleanup_after_setup_failure(credential: crate::managed_server::RunCredential) {
    if let Err(error) = cleanup_run_credential(credential).await {
        eprintln!("warning: {error}; the short token TTL remains the cleanup backstop");
    }
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
    ) -> Result<Self, AnyError> {
        sweep_stale_directories();
        let prefix = format!("link-assistant-router-with-{}-", std::process::id());
        let directory = tempfile::Builder::new().prefix(&prefix).tempdir()?;
        set_directory_owner_only(directory.path())?;
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
            configure_isolation(&mut command, &manager, directory.path(), client)?;
        }
        if let Some(token_env) = integration.token_env {
            command.env(token_env, token);
        }
        if let Some(base_env) = integration.base_url_env {
            command.env(base_env, endpoint(base_url, integration.endpoint_suffix));
        }
        let model = model_override.unwrap_or("");
        match client {
            ClientKind::ClaudeCode => {
                command
                    .env("ANTHROPIC_API_KEY", "")
                    .env("MAX_THINKING_TOKENS", "16384");
            }
            ClientKind::GeminiCli => {
                command
                    .env("GEMINI_DEFAULT_AUTH_TYPE", "gemini-api-key")
                    .env("GEMINI_CLI_TRUST_WORKSPACE", "true");
            }
            ClientKind::QwenCode => {
                command
                    .env("OPENAI_API_KEY", token)
                    .env("OPENAI_BASE_URL", endpoint(base_url, "/v1"))
                    .env("OPENAI_MODEL", model)
                    .env(
                        "OPENAI_REASONING_EFFORT",
                        integration.default_reasoning_effort,
                    );
            }
            ClientKind::Codex | ClientKind::GrokCli | ClientKind::Opencode | ClientKind::Agent => {
                command.env(
                    "OPENAI_REASONING_EFFORT",
                    integration.default_reasoning_effort,
                );
            }
            ClientKind::Cursor => {}
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
            command
                .env("HOME", root)
                .env("GEMINI_CLI_HOME", root)
                // With auth fixed the next wall is the trusted-directory
                // prompt, which a `--non-interactive` run cannot answer.
                .env("GEMINI_CLI_TRUST_WORKSPACE", "true");
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

/// Build the wrapped client's argv.
///
/// `resolved_model` is the id chosen from the live catalog by the caller; it is
/// passed in rather than read from `args` because auto-selection leaves
/// `args.model` empty (issue #192).
fn client_arguments(args: &WithArgs, resolved_model: &str) -> Vec<OsString> {
    let integration = args.client.integration();
    let mut forwarded = args.client_args.clone();
    if forwarded.first().is_some_and(|value| value == "--") {
        forwarded.remove(0);
    }
    let non_interactive = args.non_interactive || (!args.interactive && !forwarded.is_empty());
    let mode = integration.non_interactive_arg;
    let has_mode = contains_native_mode(args.client, &forwarded);
    let model = (!contains_model_argument(&forwarded))
        .then_some(integration.model_arg)
        .flatten()
        .map(|flag| {
            let model = resolved_model;
            [
                OsString::from(flag),
                model_selector(args.client, model).into(),
            ]
        });
    let command_mode = matches!(args.client, ClientKind::Codex | ClientKind::Opencode);
    let mut result = Vec::new();
    if command_mode && has_mode {
        result.push(forwarded.remove(0));
    } else if command_mode
        && non_interactive
        && let Some(mode) = mode
    {
        result.push(mode.into());
        if args.client == ClientKind::Codex {
            result.push("--skip-git-repo-check".into());
        }
    }
    if let Some(model) = model {
        result.extend(model);
    }
    if args.client == ClientKind::Codex
        && !forwarded.iter().any(|argument| {
            argument
                .to_string_lossy()
                .contains("model_reasoning_effort")
        })
    {
        result.extend([
            OsString::from("-c"),
            OsString::from(format!(
                "model_reasoning_effort=\"{}\"",
                integration.default_reasoning_effort
            )),
        ]);
    }
    if !command_mode
        && non_interactive
        && !has_mode
        && let Some(mode) = mode
    {
        result.push(mode.into());
    }
    result.extend(forwarded);
    result
}

fn contains_native_mode(client: ClientKind, arguments: &[OsString]) -> bool {
    let Some(mode) = client.integration().non_interactive_arg else {
        return false;
    };
    if matches!(client, ClientKind::Codex | ClientKind::Opencode) {
        arguments.first().is_some_and(|argument| argument == mode)
    } else {
        arguments.iter().any(|argument| argument == mode)
    }
}

fn contains_model_argument(arguments: &[OsString]) -> bool {
    arguments.iter().any(|argument| {
        let argument = argument.to_string_lossy();
        matches!(argument.as_ref(), "-m" | "--model") || argument.starts_with("--model=")
    })
}

fn model_selector(client: ClientKind, model: &str) -> String {
    if matches!(client, ClientKind::Opencode | ClientKind::Agent) && !model.contains('/') {
        format!("link-assistant/{model}")
    } else {
        model.to_string()
    }
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

fn sweep_stale_directories() {
    const PREFIX: &str = "link-assistant-router-with-";
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
        if !process_alive(pid) {
            let _ = fs::remove_dir_all(entry.path());
        }
    }
}

fn process_alive(pid: u32) -> bool {
    if pid == std::process::id() {
        return true;
    }
    #[cfg(unix)]
    {
        std::process::Command::new("kill")
            .args(["-0", &pid.to_string()])
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status()
            .is_ok_and(|status| status.success())
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

    fn arguments(client: ClientKind, client_args: &[&str]) -> Vec<String> {
        let args = WithArgs {
            managed: false,
            global: false,
            undo: false,
            non_interactive: false,
            interactive: false,
            extend_global_config: false,
            isolated_config: false,
            server: None,
            token: None,
            token_stdin: false,
            model: None,
            run_ttl_hours: 1,
            run_max_requests: None,
            client,
            client_args: client_args.iter().map(OsString::from).collect(),
        };
        client_arguments(&args, "")
            .iter()
            .map(|value| value.to_string_lossy().into_owned())
            .collect()
    }

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
        configure_isolation(&mut command, &manager, root.path(), ClientKind::GeminiCli)
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
    fn colliding_wrapper_flags_after_client_are_forwarded() {
        let args = arguments(ClientKind::Codex, &["--global", "hi"]);
        assert!(args.ends_with(&["--global".to_string(), "hi".to_string()]));
        assert_eq!(args.first().map(String::as_str), Some("exec"));
    }

    #[test]
    fn explicit_separator_is_not_forwarded() {
        let args = arguments(ClientKind::Opencode, &["--", "run", "hi"]);
        assert_eq!(args.first().map(String::as_str), Some("run"));
        assert_eq!(args.iter().filter(|arg| arg.as_str() == "run").count(), 1);
    }

    #[test]
    fn command_mode_word_inside_prompt_is_not_treated_as_the_subcommand() {
        let args = arguments(ClientKind::Opencode, &["explain", "run"]);
        assert_eq!(args.first().map(String::as_str), Some("run"));
        assert!(args.ends_with(&["explain".to_string(), "run".to_string()]));
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
