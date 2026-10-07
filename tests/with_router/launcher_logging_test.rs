//! Issue #717: Router diagnostics must leave the vendor's terminal untouched.

use super::claude_profile_test::{fake_claude, mock_claude_router_with_catalog, run_claude_with};
use super::*;

const CATALOG: &str = r#"{"data":[{"id":"glm-5.3","owned_by":"z.ai","router_available":false,"router_unavailable_reason":"z.ai billing exhausted (code 1113)"},{"id":"glm-5.3-flash","owned_by":"z.ai"}]}"#;

fn launcher_log(home: &std::path::Path) -> String {
    fs::read_to_string(home.join(".link-assistant-router/launcher/launcher.log"))
        .expect("durable launcher diagnostic log")
}

/// Read human diagnostics from JSON Lines, preserving existing message contracts.
pub fn diagnostic_messages(home: &std::path::Path) -> String {
    launcher_log(home)
        .lines()
        .map(|line| {
            let value: serde_json::Value = serde_json::from_str(line).expect("JSON log record");
            value["message"].as_str().unwrap_or("").to_string()
        })
        .collect::<Vec<_>>()
        .join("\n")
}

#[test]
fn ordinary_claude_is_quiet_and_persists_saved_model_and_unavailability() {
    let directory = tempfile::tempdir().expect("fixture root");
    let home = directory.path().join("home");
    let bin = directory.path().join("bin");
    let capture = directory.path().join("capture");
    fs::create_dir_all(&capture).expect("capture directory");
    let profile = home.join(".config/link-assistant-router/clients/claude/home");
    fs::create_dir_all(&profile).expect("Router-owned profile");
    fs::write(profile.join("settings.json"), br#"{"model":"glm-5.3"}"#).expect("saved model");
    fake_claude(&bin);
    let (server, requests) = mock_claude_router_with_catalog(CATALOG);
    let token = bound_client_token("claude");
    let output = run_claude_with(
        &home,
        &bin,
        &capture,
        &[
            "--interactive",
            "--server",
            &server,
            "--token",
            &token,
            "claude",
        ],
        &[("DISABLE_TELEMETRY", "1")],
    );
    requests.join().expect("fixture server");
    assert!(output.status.success(), "{output:?}");
    assert!(output.stdout.is_empty(), "Router stdout: {output:?}");
    assert_eq!(
        output.stderr, b"FAKE_CLAUDE_LAUNCHED\n",
        "prelaunch diagnostics leaked"
    );
    let log = launcher_log(&home);
    for expected in [
        "router_model_launch",
        "keeping your own Claude model selection",
        "glm-5.3",
        "1113",
        "DISABLE_TELEMETRY",
        "child_started",
        "child_exited",
        "launch_finished",
    ] {
        assert!(log.contains(expected), "missing {expected}: {log}");
    }
    assert!(!log.contains(&token), "credential leaked");
    assert!(
        !log.contains("FAKE_CLAUDE_LAUNCHED"),
        "vendor stderr was logged"
    );
    assert_eq!(
        fs::metadata(home.join(".link-assistant-router/launcher"))
            .unwrap()
            .permissions()
            .mode()
            & 0o777,
        0o700
    );
    assert_eq!(
        fs::metadata(home.join(".link-assistant-router/launcher/launcher.log"))
            .unwrap()
            .permissions()
            .mode()
            & 0o777,
        0o600
    );
}

#[test]
fn prelaunch_connection_and_catalog_failures_are_silent_and_durable() {
    for invalid_catalog in [false, true] {
        let directory = tempfile::tempdir().expect("fixture root");
        let home = directory.path().join("home");
        let bin = directory.path().join("bin");
        let capture = directory.path().join("capture");
        fs::create_dir_all(&capture).expect("capture directory");
        fake_claude(&bin);
        let (server, requests) = if invalid_catalog {
            let (url, handle) = mock_claude_router_with_catalog("invalid JSON");
            (url, Some(handle))
        } else {
            // Port zero cannot be claimed by a sibling test's fixture.
            ("http://127.0.0.1:0".to_string(), None)
        };
        let token = bound_client_token("claude");
        let output = run_claude_with(
            &home,
            &bin,
            &capture,
            &[
                "--interactive",
                "--server",
                &server,
                "--token",
                &token,
                "claude",
            ],
            &[],
        );
        if let Some(requests) = requests {
            requests.join().expect("fixture server");
        }
        assert!(!output.status.success(), "{output:?}");
        assert!(
            output.stdout.is_empty() && output.stderr.is_empty(),
            "{output:?}"
        );
        assert!(
            !capture.join("args").exists(),
            "vendor launched after failure"
        );
        let log = launcher_log(&home);
        assert!(
            log.contains(if invalid_catalog {
                "invalid JSON"
            } else {
                "unreachable"
            }),
            "{log}"
        );
        assert!(log.contains("launch_failed"), "{log}");
        assert!(!log.contains(&token), "{log}");
    }
}

#[test]
fn launcher_opens_the_private_log_before_connecting_and_redacts_failure_bodies() {
    let directory = tempfile::tempdir().expect("fixture root");
    let home = directory.path().join("home");
    let bin = directory.path().join("bin");
    let capture = directory.path().join("capture");
    fs::create_dir_all(&capture).unwrap();
    fake_claude(&bin);
    let listener = TcpListener::bind("127.0.0.1:0").unwrap();
    let server = format!("http://{}", listener.local_addr().unwrap());
    let log_path = home.join(".link-assistant-router/launcher/launcher.log");
    let requests = thread::spawn(move || {
        let (mut stream, _) = listener.accept().unwrap();
        read_request(&mut stream);
        assert!(
            fs::read_to_string(log_path)
                .unwrap()
                .contains("launch_started")
        );
        let body = r#"{"error":"fixture failure","access_token":"oauth-secret-value","cookie":"session=private-cookie-value","api_key":"private-api-key-value","refreshToken":"refresh-secret-value"}"#;
        write!(
            stream,
            "HTTP/1.1 502 Bad Gateway\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
            body.len()
        )
        .unwrap();
    });
    let output = run_claude_with(
        &home,
        &bin,
        &capture,
        &[
            "--server",
            &server,
            "--token",
            "unprefixed-synthetic-token",
            "claude",
        ],
        &[("RUST_LOG", "debug")],
    );
    requests.join().unwrap();
    assert!(!output.status.success(), "{output:?}");
    assert!(
        output.stdout.is_empty() && output.stderr.is_empty(),
        "{output:?}"
    );
    let log = launcher_log(&home);
    assert!(log.contains("fixture failure"), "{log}");
    for secret in [
        "oauth-secret-value",
        "private-cookie-value",
        "private-api-key-value",
        "refresh-secret-value",
        "unprefixed-synthetic-token",
    ] {
        assert!(!log.contains(secret), "leaked {secret}: {log}");
    }
}

#[test]
fn claude_keeps_all_three_terminal_descriptors() {
    use portable_pty::{CommandBuilder, PtySize, native_pty_system};
    let directory = tempfile::tempdir().unwrap();
    let home = directory.path().join("home");
    let bin = directory.path().join("bin");
    fs::create_dir_all(&home).unwrap();
    fake_claude(&bin);
    fs::write(
        bin.join("claude"),
        r#"#!/bin/sh
if [ "$1" = --version ]; then echo '2.1.265 (Claude Code)'; exit 0; fi
[ -t 0 ] && [ -t 1 ] && [ -t 2 ] || exit 41
printf '\033[2JFAKE_TUI_READY\n'
read reply
printf 'TUI input:%s\n' "$reply"
"#,
    )
    .unwrap();
    let (server, requests) = mock_claude_router_with_catalog(CATALOG);
    let token = bound_client_token("claude");
    let pty = native_pty_system().openpty(PtySize::default()).unwrap();
    let mut command = CommandBuilder::new(env!("CARGO_BIN_EXE_router"));
    command.cwd(directory.path());
    command.args([
        "with",
        "--interactive",
        "--server",
        &server,
        "--token",
        &token,
        "claude",
    ]);
    command.env("HOME", &home);
    command.env("XDG_CONFIG_HOME", home.join(".config"));
    command.env("PATH", &bin);
    command.env_remove("ANTHROPIC_MODEL");
    command.env_remove("VERBOSE");
    command.env_remove("DATA_DIR");
    command.env_remove("RUST_LOG");
    let mut child = pty.slave.spawn_command(command).unwrap();
    let mut killer = child.clone_killer();
    let (finished, deadline) = std::sync::mpsc::channel::<()>();
    let watchdog = thread::spawn(move || {
        if matches!(
            deadline.recv_timeout(std::time::Duration::from_secs(30)),
            Err(std::sync::mpsc::RecvTimeoutError::Timeout)
        ) {
            killer.kill().expect("stop stalled PTY fixture");
        }
    });
    drop(pty.slave);
    let mut reader = pty.master.try_clone_reader().unwrap();
    let mut writer = pty.master.take_writer().unwrap();
    writer.write_all(b"hello terminal\n").unwrap();
    let status = child.wait().unwrap();
    let _ = finished.send(());
    watchdog.join().unwrap();
    requests.join().unwrap();
    assert!(status.success(), "{status:?}");
    let mut transcript = String::new();
    reader.read_to_string(&mut transcript).unwrap();
    assert!(transcript.contains("\x1b[2JFAKE_TUI_READY"), "{transcript}");
    assert!(
        transcript.contains("TUI input:hello terminal"),
        "{transcript}"
    );
    assert!(!transcript.contains("router_model_launch"), "{transcript}");
}

#[test]
fn explicit_verbose_keeps_diagnostics_on_stderr_and_in_the_log() {
    let directory = tempfile::tempdir().expect("fixture root");
    let home = directory.path().join("home");
    let bin = directory.path().join("bin");
    let capture = directory.path().join("capture");
    fs::create_dir_all(&capture).expect("capture directory");
    fake_claude(&bin);
    let (server, requests) = mock_claude_router_with_catalog(CATALOG);
    let token = bound_client_token("claude");
    let output = run_claude_with(
        &home,
        &bin,
        &capture,
        &[
            "--verbose",
            "--interactive",
            "--server",
            &server,
            "--token",
            &token,
            "claude",
        ],
        &[],
    );
    requests.join().expect("fixture server");
    assert!(output.status.success(), "{output:?}");
    let stderr = String::from_utf8_lossy(&output.stderr);
    assert!(
        stderr.find("router_model_launch").unwrap() < stderr.find("FAKE_CLAUDE_LAUNCHED").unwrap()
    );
    assert!(launcher_log(&home).contains("router_model_launch"));
    assert!(!stderr.contains(&token));
}

#[test]
fn requested_json_retains_its_structured_result_and_diagnostics() {
    let directory = tempfile::tempdir().unwrap();
    let home = directory.path().join("home");
    let bin = directory.path().join("bin");
    let capture = directory.path().join("capture");
    fs::create_dir_all(&capture).unwrap();
    fake_claude(&bin);
    let (server, requests) = mock_claude_router_with_catalog(CATALOG);
    let token = bound_client_token("claude");
    let output = run_claude_with(
        &home,
        &bin,
        &capture,
        &[
            "--json",
            "--interactive",
            "--server",
            &server,
            "--token",
            &token,
            "claude",
        ],
        &[],
    );
    requests.join().unwrap();
    assert!(output.status.success(), "{output:?}");
    assert!(output.stderr.is_empty(), "{output:?}");
    let result: serde_json::Value = serde_json::from_slice(&output.stdout).unwrap();
    assert_eq!(result["operation"], "with");
    assert_eq!(result["data"]["client_exit_code"], 0);
    assert_eq!(result["data"]["stderr"], "FAKE_CLAUDE_LAUNCHED\n");
    assert!(
        result["diagnostics"]
            .to_string()
            .contains("router_model_launch")
    );
    assert!(launcher_log(&home).contains("launch_finished"));
    assert!(!launcher_log(&home).contains("FAKE_CLAUDE_LAUNCHED"));
}

#[test]
fn child_spawn_failure_is_quiet_and_recorded() {
    let directory = tempfile::tempdir().unwrap();
    let home = directory.path().join("home");
    let bin = directory.path().join("bin");
    let capture = directory.path().join("capture");
    fs::create_dir_all(&capture).unwrap();
    fake_claude(&bin);
    let (server, requests) = mock_claude_router_with_catalog(CATALOG);
    let token = bound_client_token("claude");
    let output = run_claude_with(
        &home,
        &bin,
        &capture,
        &[
            "--interactive",
            "--server",
            &server,
            "--token",
            &token,
            "claude",
        ],
        &[("DELETE_AFTER_VERSION", "1"), ("ONLY_FAKE_PATH", "1")],
    );
    requests.join().unwrap();
    assert!(!output.status.success(), "{output:?}");
    assert!(
        output.stdout.is_empty() && output.stderr.is_empty(),
        "{output:?}"
    );
    let log = launcher_log(&home);
    assert!(
        log.contains("client executable `claude`") && log.contains("launch_failed"),
        "{log}"
    );
}

#[test]
fn native_adapter_honors_data_directory_and_preserves_child_streams_and_exit_status() {
    for binary in [
        env!("CARGO_BIN_EXE_router"),
        env!("CARGO_BIN_EXE_link-assistant-router"),
    ] {
        let directory = tempfile::tempdir().expect("fixture root");
        let home = directory.path().join("home");
        let bin = directory.path().join("bin");
        fake_claude(&bin);
        fs::write(bin.join("claude"), "#!/bin/sh\nif [ \"$1\" = --version ]; then echo '2.1.265 (Claude Code)'; exit 0; fi\nprintf 'TUI stdout:'; /bin/cat; printf 'TUI stderr' >&2; exit 23\n").unwrap();
        let data = directory.path().join("data");
        let (server, requests) = mock_claude_router_with_catalog(CATALOG);
        let token = bound_client_token("claude");
        let mut child = Command::new(binary)
            .args([
                "--data-dir",
                data.to_str().unwrap(),
                "with",
                "--interactive",
                "--server",
                &server,
                "--token",
                &token,
                "claude",
            ])
            .env("HOME", &home)
            .env("XDG_CONFIG_HOME", home.join(".config"))
            .env("PATH", &bin)
            .env_remove("ANTHROPIC_MODEL")
            .env_remove("VERBOSE")
            .env_remove("RUST_LOG")
            .stdin(std::process::Stdio::piped())
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped())
            .spawn()
            .unwrap();
        child
            .stdin
            .take()
            .unwrap()
            .write_all(b"user input")
            .unwrap();
        let output = child.wait_with_output().unwrap();
        requests.join().expect("fixture server");
        assert_eq!(output.status.code(), Some(23), "{output:?}");
        assert_eq!(output.stdout, b"TUI stdout:user input");
        assert_eq!(output.stderr, b"TUI stderr");
        let log = fs::read_to_string(data.join("launcher/launcher.log")).unwrap();
        assert!(log.contains("child_exited") && log.contains("23"), "{log}");
        assert!(!log.contains("user input") && !log.contains("TUI stderr"));
    }
}
