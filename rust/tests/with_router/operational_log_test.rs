//! A client retains its terminal while Router diagnostics persist separately.
use super::claude_profile_test::{fake_claude, mock_claude_router, run_claude_with};
use super::*;

fn launch(environment: &[(&str, &str)], options: &[&str]) -> (Output, String, String) {
    let directory = tempfile::tempdir().unwrap();
    let home = directory.path().join("home");
    let bin = directory.path().join("bin");
    let capture = directory.path().join("capture");
    fs::create_dir_all(&capture).unwrap();
    fake_claude(&bin);
    let (server, requests) = environment
        .iter()
        .find(|(name, _)| *name == "FAKE_CATALOG_STATUS")
        .map_or_else(mock_claude_router, |(_, status)| {
            super::claude_profile_test::mock_claude_router_with_failure(status)
        });
    let token = bound_client_token("claude");
    let mut arguments = options.to_vec();
    arguments.extend([
        "--interactive",
        "--server",
        &server,
        "--token",
        &token,
        "claude",
    ]);
    let output = run_claude_with(&home, &bin, &capture, &arguments, environment);
    requests.join().unwrap();
    let log = fs::read_to_string(home.join(".link-assistant-router/logs/operational.log"))
        .expect("launcher log survives process exit");
    (output, log, server)
}

#[test]
fn ordinary_claude_launch_is_quiet_and_records_child_exit() {
    let (output, log, server) = launch(&[], &[]);
    assert!(output.status.success());
    assert!(output.stdout.is_empty());
    assert_eq!(output.stderr, b"FAKE_CLAUDE_LAUNCHED\n");
    for event in [
        "process_start",
        "router_model_launch",
        "client_start",
        "client_exit",
        "process_exit",
    ] {
        assert!(log.contains(event), "missing {event}: {log}");
    }
    assert!(log.contains(&server));
    assert!(!log.contains(".signature"), "{log}");
}

#[test]
fn nested_launcher_is_quiet_and_verbose_is_an_explicit_opt_in() {
    let (quiet, log, _) = launch(&[("USE_NESTED_ROUTER", "1")], &[]);
    assert!(quiet.status.success());
    assert_eq!(quiet.stderr, b"FAKE_CLAUDE_LAUNCHED\n");
    assert!(log.contains("selected_endpoint"));
    for environment in [&[][..], &[("USE_NESTED_ROUTER", "1")][..]] {
        let (verbose, log, _) = launch(environment, &["--verbose"]);
        assert!(verbose.status.success());
        let console = String::from_utf8_lossy(&verbose.stderr);
        assert!(console.contains("router_model_launch"), "{console}");
        assert!(console.contains("FAKE_CLAUDE_LAUNCHED"));
        assert!(!console.contains(".signature"));
        assert!(log.contains("router_model_launch"));
    }
}

#[test]
fn early_client_preflight_failure_is_quiet_and_durable() {
    let directory = tempfile::tempdir().unwrap();
    let home = directory.path().join("home");
    let bin = directory.path().join("bin");
    let capture = directory.path().join("capture");
    fs::create_dir_all(&capture).unwrap();
    fake_claude(&bin);
    // Version preflight deliberately runs before any Router request.
    let output = run_claude_with(
        &home,
        &bin,
        &capture,
        &["--server", "http://127.0.0.1:9", "claude"],
        &[("FAKE_CLAUDE_VERSION", "2.1.252")],
    );
    let log = fs::read_to_string(home.join(".link-assistant-router/logs/operational.log"))
        .expect("early preflight failure persists");
    assert!(!output.status.success());
    assert!(output.stdout.is_empty() && output.stderr.is_empty());
    assert!(log.contains("2.1.255 or newer"), "{log}");
    assert!(log.contains("process_exit exit_code=1"), "{log}");
    assert!(!log.contains("client_start"));
}

#[test]
fn a_failed_or_killed_child_has_a_durable_status() {
    let (failed, log, _) = launch(&[("FAKE_EXIT", "23")], &[]);
    assert_eq!(failed.status.code(), Some(23));
    assert_eq!(failed.stderr, b"FAKE_CLAUDE_LAUNCHED\n");
    assert!(log.contains("exit_code=Some(23)"), "{log}");
    assert!(log.contains("process_exit exit_code=23"), "{log}");
    let (killed, log, _) = launch(&[("FAKE_SIGNAL_EXIT", "1")], &[]);
    assert!(!killed.status.success());
    assert!(log.contains("signal=Some(9)"), "{log}");
    assert!(log.contains("process_exit exit_code=1"), "{log}");
}

#[test]
fn supervisor_records_forced_termination_after_sigterm() {
    use super::claude_profile_test::claude_command;
    use std::time::Instant;
    let directory = tempfile::tempdir().unwrap();
    let home = directory.path().join("home");
    let bin = directory.path().join("bin");
    let capture = directory.path().join("capture");
    fs::create_dir_all(&capture).unwrap();
    fake_claude(&bin);
    let (server, requests) = mock_claude_router();
    let token = bound_client_token("claude");
    let mut child = claude_command(
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
        &[("FAKE_IGNORE_SIGNALS", "1")],
    )
    .spawn()
    .unwrap();
    requests.join().unwrap();
    let deadline = Instant::now() + Duration::from_secs(10);
    while !capture.join("claude-config-dir.ready").exists() && Instant::now() < deadline {
        thread::sleep(Duration::from_millis(20));
    }
    if !capture.join("claude-config-dir.ready").exists() {
        let _ = child.kill();
        let _ = child.wait();
        panic!("fake client never started");
    }
    assert!(
        Command::new("kill")
            .args(["-TERM", &child.id().to_string()])
            .status()
            .unwrap()
            .success()
    );
    let status = child.wait_timeout(Duration::from_secs(12)).unwrap();
    if status.is_none() {
        let _ = child.kill();
        let _ = child.wait();
        panic!("launcher failed to reap its managed client");
    }
    assert!(!status.unwrap().success());
    let log = fs::read_to_string(home.join(".link-assistant-router/logs/operational.log")).unwrap();
    for record in [
        "SIGTERM",
        "client_forced_termination",
        "signal=Some(9)",
        "process_exit",
    ] {
        assert!(log.contains(record), "missing {record}: {log}");
    }
}

#[test]
fn http_failure_classes_keep_status_and_endpoint_without_raw_bodies() {
    for (status, class) in [
        ("402 Payment Required", "billing"),
        ("504 Gateway Timeout", "transport_timeout"),
        ("404 Not Found", "routing_not_found"),
    ] {
        let (output, log, endpoint) = launch(&[("FAKE_CATALOG_STATUS", status)], &[]);
        assert!(!output.status.success());
        assert!(output.stdout.is_empty() && output.stderr.is_empty());
        assert!(log.contains(class), "{log}");
        assert!(log.contains(&status[..3]), "{log}");
        assert!(log.contains(&endpoint), "{log}");
        assert!(!log.contains("raw-response-secret-sentinel"), "{log}");
        assert!(log.contains("process_exit exit_code=1"));
    }
}

#[test]
fn json_launch_keeps_the_vendor_output_inside_its_result() {
    let (output, log, _) = launch(&[], &["--json"]);
    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stdout)
    );
    assert!(output.stderr.is_empty());
    let result: serde_json::Value = serde_json::from_slice(&output.stdout).unwrap();
    assert_eq!(result["data"]["client_exit_code"], 0);
    assert_eq!(result["data"]["stderr"], "FAKE_CLAUDE_LAUNCHED\n");
    assert!(log.contains("router_model_launch"));
    assert!(!log.contains("FAKE_CLAUDE_LAUNCHED"));
}

#[test]
fn an_explicit_interactive_confirmation_remains_visible() {
    use link_assistant_router::login_pty::PtySession;
    let home = tempfile::tempdir().unwrap();
    let mut command = portable_pty::CommandBuilder::new(env!("CARGO_BIN_EXE_with-router"));
    command.env_clear();
    command.env("HOME", home.path());
    command.env("PATH", std::env::var_os("PATH").unwrap_or_default());
    command.args([
        "--server",
        "http://127.0.0.1:9",
        "--token",
        &bound_client_token("claude"),
        "claude",
        "--reset-to-default-configuration",
    ]);
    let session = PtySession::spawn(command).unwrap();
    session
        .wait_for(
            |text| text.contains("[y/N]"),
            Duration::from_millis(20),
            Duration::from_secs(10),
        )
        .expect("the confirmation prompt must reach the terminal");
    session.send_text("n\n").unwrap();
    assert_eq!(
        session.wait_for_exit(Duration::from_secs(10)).unwrap(),
        Some(1)
    );
    let log = fs::read_to_string(
        home.path()
            .join(".link-assistant-router/logs/operational.log"),
    )
    .unwrap();
    assert!(log.contains("Claude profile reset cancelled"));
}
