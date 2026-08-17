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
        cleanup_after_setup_failure(credential).await;
        return Err(format!(
            "the router advertises no model for {}; authorize a matching subscription on the \
             router host, or pass --model explicitly",
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

impl TemporaryClient {
    fn prepare(
        client: ClientKind,
        base_url: &str,
        token: &str,
        model_override: Option<&str>,
        models: &[RouterModel],
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
        configure_isolation(&mut command, &manager, directory.path(), client)?;
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
            let config_path = manager.config_path(client);
            let directory = config_path.parent().expect("Gemini config has a parent");
            command.env("GEMINI_CLI_HOME", directory);
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
    let mut options = OpenOptions::new();
    options.create_new(true).write(true);
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
            global: false,
            undo: false,
            non_interactive: false,
            interactive: false,
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
                    )
                    .is_err()
                );
                continue;
            }
            let temporary =
                TemporaryClient::prepare(client, "http://router.test", "task-token", None, &models)
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
