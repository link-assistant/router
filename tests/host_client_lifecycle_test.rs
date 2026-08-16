//! Opt-in host-CLI lifecycle against a real router, used by the macOS release
//! job from issue #188.
//!
//! Everything here runs the shipped binaries the way a workstation user does:
//! a native process, an isolated configuration root, and a token that never
//! appears in argv. The router is reached at `ROUTER_HOST_CLI_URL`, which the
//! release job points at an SSH-forwarded localhost port of a remote router.

use std::io::Write as _;
use std::path::Path;
use std::process::{Command, Output, Stdio};

fn enabled() -> bool {
    std::env::var("ROUTER_HOST_CLI_TESTS").as_deref() == Ok("1")
}

fn router_url() -> String {
    std::env::var("ROUTER_HOST_CLI_URL")
        .expect("ROUTER_HOST_CLI_URL is required when ROUTER_HOST_CLI_TESTS=1")
}

fn router_token() -> String {
    std::env::var("ROUTER_HOST_CLI_TOKEN")
        .expect("ROUTER_HOST_CLI_TOKEN is required when ROUTER_HOST_CLI_TESTS=1")
}

/// Clients whose permanent setup this router supports end to end.
const SUPPORTED: [&str; 5] = ["codex", "claude-code", "opencode", "qwen-code", "agent"];

fn command_exists(command: &str) -> bool {
    std::env::var_os("PATH").is_some_and(|path| {
        std::env::split_paths(&path).any(|directory| directory.join(command).is_file())
    })
}

/// Run the router CLI with the token supplied on standard input only.
fn router(home: &Path, arguments: &[&str], stdin_token: Option<&str>) -> Output {
    let mut command = Command::new(env!("CARGO_BIN_EXE_link-assistant-router"));
    command
        .args(arguments)
        .env("TOKEN_SECRET", "host-cli-lifecycle-secret")
        .env("DATA_DIR", home.join("router-data"))
        .env("STORAGE_POLICY", "text")
        // The isolated root is the whole point: no real user setting is read.
        .env("HOME", home)
        .env_remove("CODEX_HOME")
        .env_remove("CLAUDE_CONFIG_DIR")
        .env_remove("XDG_CONFIG_HOME")
        .env_remove("QWEN_HOME")
        .env_remove("GEMINI_CLI_HOME")
        .env_remove("CURSOR_CONFIG_DIR")
        .env_remove("LINK_ASSISTANT_ROUTER_TOKEN")
        .env_remove("LINK_ASSISTANT_TOKEN")
        .stdin(if stdin_token.is_some() {
            Stdio::piped()
        } else {
            Stdio::null()
        })
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    let mut child = command.spawn().expect("spawn router CLI");
    if let Some(token) = stdin_token {
        child
            .stdin
            .as_mut()
            .expect("piped stdin")
            .write_all(format!("{token}\n").as_bytes())
            .expect("write token to stdin");
    }
    child.wait_with_output().expect("collect router CLI output")
}

fn text(output: &Output) -> String {
    format!(
        "{}{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    )
}

#[test]
fn host_clients_complete_setup_doctor_launch_and_remove() {
    if !enabled() {
        return;
    }
    let base_url = router_url();
    let token = router_token();

    for client in SUPPORTED {
        let home = tempfile::tempdir().expect("temp isolated home");
        let home = home.path();
        let home_argument = home.to_string_lossy().into_owned();

        let setup = router(
            home,
            &[
                "clients",
                "--home",
                &home_argument,
                "setup",
                client,
                "--token-stdin",
                "--base-url",
                &base_url,
            ],
            Some(&token),
        );
        let setup_text = text(&setup);
        assert!(
            setup.status.success(),
            "{client} setup failed: {setup_text}"
        );
        assert!(
            !setup_text.contains(&token),
            "{client} setup echoed the router token"
        );

        let show = router(
            home,
            &["clients", "--home", &home_argument, "show", client],
            None,
        );
        let show_text = text(&show);
        assert!(show.status.success(), "{client} show failed: {show_text}");
        assert!(
            !show_text.contains(&token),
            "{client} show echoed the router token"
        );
        let status = parse_status(&show.stdout);
        assert_eq!(
            status["configured"],
            serde_json::Value::Bool(true),
            "{client} is not configured after setup: {show_text}"
        );

        let doctor = router(
            home,
            &["clients", "--home", &home_argument, "doctor", client],
            None,
        );
        let doctor_text = text(&doctor);
        assert!(
            doctor.status.success(),
            "{client} doctor failed: {doctor_text}"
        );
        assert!(
            !doctor_text.contains(&token),
            "{client} doctor echoed the router token"
        );

        if command_exists(client_command(client)) {
            let launch = launch_client(home, client, &base_url, &token);
            let launch_text = text(&launch);
            assert!(
                launch.status.success(),
                "{client} launch failed: {launch_text}"
            );
            assert!(
                launch_text.contains("ROUTER_OK"),
                "{client} did not answer through the router: {launch_text}"
            );
        }

        let removal = router(
            home,
            &["clients", "--home", &home_argument, "remove", client],
            None,
        );
        let removal_text = text(&removal);
        assert!(
            removal.status.success(),
            "{client} remove failed: {removal_text}"
        );
        let credentials = home
            .join(".config/link-assistant-router/clients")
            .join(format!("{client}.env"));
        assert!(
            !credentials.exists(),
            "{client} left a usable credential at {}",
            credentials.display()
        );
    }
}

/// Parse the JSON status `show` prints after the startup log lines.
fn parse_status(stdout: &[u8]) -> serde_json::Value {
    let text = String::from_utf8_lossy(stdout);
    let start = text.find('{').expect("show should print a JSON object");
    serde_json::from_str(&text[start..]).expect("show should print valid JSON")
}

fn client_command(client: &str) -> &'static str {
    match client {
        "codex" => "codex",
        "claude-code" => "claude",
        "opencode" => "opencode",
        "qwen-code" => "qwen",
        "agent" => "agent",
        other => panic!("unlisted client {other}"),
    }
}

/// Launch the client through the temporary wrapper, which is the documented
/// way to run a client without touching permanent configuration.
fn launch_client(home: &Path, client: &str, base_url: &str, token: &str) -> Output {
    let mut child = Command::new(env!("CARGO_BIN_EXE_with-router"))
        .args([
            "--server",
            base_url,
            "--token-stdin",
            "--non-interactive",
            client,
            "Reply with exactly ROUTER_OK",
        ])
        .current_dir(home)
        .env("HOME", home)
        .env("XDG_CONFIG_HOME", home.join(".config"))
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .expect("spawn with-router");
    child
        .stdin
        .as_mut()
        .expect("piped stdin")
        .write_all(format!("{token}\n").as_bytes())
        .expect("write token to stdin");
    child
        .wait_with_output()
        .expect("collect with-router output")
}
