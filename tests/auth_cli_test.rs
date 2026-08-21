//! Black-box coverage for provider authorization commands.

use std::process::{Command, Output};

fn router(args: &[&str]) -> Output {
    Command::new(env!("CARGO_BIN_EXE_link-assistant-router"))
        .args(args)
        .env("TOKEN_SECRET", "auth-cli-test-secret")
        .output()
        .expect("router CLI should run")
}

#[test]
fn claude_code_without_a_pending_login_does_not_start_a_new_login() {
    let home = tempfile::tempdir().expect("temp home");
    let output = Command::new(env!("CARGO_BIN_EXE_link-assistant-router"))
        // `--managed` pins the local flow under test: without a selection
        // `auth` now adopts a router already listening here (issue #250).
        .args([
            "auth",
            "claude",
            "--managed",
            "--flow",
            "code",
            "--code",
            "copied-code#previous-state",
        ])
        .env("HOME", home.path())
        .env("CLAUDE_CODE_HOME", home.path().join(".claude"))
        .env("TOKEN_SECRET", "auth-cli-test-secret")
        .env("DATA_DIR", home.path().join("router-data"))
        .env("STORAGE_POLICY", "text")
        .output()
        .expect("router CLI should run");

    assert!(!output.status.success());
    assert!(
        !String::from_utf8_lossy(&output.stdout).contains("Open this URL:"),
        "supplying a code must not create a different PKCE login: {}",
        String::from_utf8_lossy(&output.stdout)
    );
    let stderr = String::from_utf8_lossy(&output.stderr);
    assert!(
        stderr.contains("no pending Claude authorization"),
        "{stderr}"
    );
    assert!(stderr.contains("auth claude --flow code"), "{stderr}");
}

#[test]
fn claude_code_is_rejected_for_the_cli_fallback_without_starting_it() {
    let home = tempfile::tempdir().expect("temp home");
    let output = Command::new(env!("CARGO_BIN_EXE_link-assistant-router"))
        // `--managed` pins the local flow under test (see issue #250).
        .args([
            "auth",
            "claude",
            "--managed",
            "--flow",
            "cli",
            "--code",
            "copied-code",
        ])
        .env("HOME", home.path())
        .env("CLAUDE_CODE_HOME", home.path().join(".claude"))
        .env("TOKEN_SECRET", "auth-cli-test-secret")
        .env("DATA_DIR", home.path().join("router-data"))
        .env("STORAGE_POLICY", "text")
        .output()
        .expect("router CLI should run");

    assert_eq!(output.status.code(), Some(2));
    assert!(!String::from_utf8_lossy(&output.stdout).contains("Open this URL:"));
    assert!(String::from_utf8_lossy(&output.stderr).contains("--code requires --flow code"));
}

#[test]
fn unsupported_provider_flows_are_rejected_during_parsing() {
    for (provider, flow) in [
        ("claude", "device"),
        ("claude", "loopback"),
        ("codex", "code"),
        ("codex", "cli"),
    ] {
        let output = router(&["auth", provider, "--flow", flow]);
        assert_eq!(
            output.status.code(),
            Some(2),
            "auth {provider} accepted {flow}"
        );
        assert!(
            String::from_utf8_lossy(&output.stderr).contains("invalid value"),
            "auth {provider} --flow {flow} did not explain the failure: {}",
            String::from_utf8_lossy(&output.stderr)
        );
    }
}

#[test]
fn provider_help_lists_supported_flows() {
    for (provider, supported_flows, unsupported_flows) in [
        ("claude", ["auto", "code", "cli"], ["device", "loopback"]),
        ("codex", ["auto", "device", "loopback"], ["code", "cli"]),
    ] {
        let output = router(&["auth", provider, "--help"]);
        assert!(output.status.success());
        let stdout = String::from_utf8_lossy(&output.stdout);
        let possible_values = stdout
            .split("Possible values:")
            .nth(1)
            .and_then(|section| section.split("[default:").next())
            .expect("flow possible-values section");
        for flow in supported_flows {
            assert!(possible_values.contains(&format!("- {flow}:")), "{stdout}");
        }
        for flow in unsupported_flows {
            assert!(!possible_values.contains(&format!("- {flow}:")), "{stdout}");
            let rejected = router(&["auth", provider, "--flow", flow]);
            assert_eq!(
                rejected.status.code(),
                Some(2),
                "auth {provider} accepted {flow}"
            );
        }
    }
}

/// A selected server is what `auth` acts on, exactly as `with` does.
///
/// `server use` establishes which router the CLI is talking to; `auth` exists
/// to give *that* router a subscription. Writing a local credential instead
/// made the obvious `server use` → `auth` → `with` sequence silently authorize
/// the wrong place, surfacing much later as a 401 (issue #246). Here the
/// selected server is deliberately unreachable, so the command must fail
/// naming it rather than quietly falling back to a local directory.
#[test]
fn a_selected_server_is_not_silently_replaced_by_a_local_directory() {
    let config = tempfile::tempdir().expect("config home");
    let selection = config.path().join("link-assistant-router");
    std::fs::create_dir_all(&selection).expect("selection directory");
    std::fs::write(
        selection.join("server.json"),
        r#"{"server":"http://127.0.0.1:1","token":"probe"}"#,
    )
    .expect("write the selection");

    let output = Command::new(env!("CARGO_BIN_EXE_link-assistant-router"))
        .args(["auth", "status"])
        .env("XDG_CONFIG_HOME", config.path())
        .env("TOKEN_SECRET", "auth-cli-test-secret")
        .output()
        .expect("router CLI should run");

    let stderr = String::from_utf8_lossy(&output.stderr);
    let stdout = String::from_utf8_lossy(&output.stdout);
    assert!(
        stderr.contains("127.0.0.1:1"),
        "the selected server was not mentioned: {stderr}"
    );
    assert!(
        !stdout.contains(".claude"),
        "a local credential directory was reported instead: {stdout}"
    );
}

/// `--local` keeps the previous behaviour, explicitly.
///
/// The point of the switch is that the choice is visible: an operator who does
/// want a local credential while a server is selected can say so, instead of
/// getting it by surprise.
#[test]
fn local_authorizes_the_local_directory_even_with_a_server_selected() {
    let config = tempfile::tempdir().expect("config home");
    let home = tempfile::tempdir().expect("temp home");
    let selection = config.path().join("link-assistant-router");
    std::fs::create_dir_all(&selection).expect("selection directory");
    std::fs::write(
        selection.join("server.json"),
        r#"{"server":"http://127.0.0.1:1","token":"probe"}"#,
    )
    .expect("write the selection");

    let output = Command::new(env!("CARGO_BIN_EXE_link-assistant-router"))
        .args(["auth", "status", "--local"])
        .env("XDG_CONFIG_HOME", config.path())
        .env("HOME", home.path())
        .env("TOKEN_SECRET", "auth-cli-test-secret")
        .output()
        .expect("router CLI should run");

    let stderr = String::from_utf8_lossy(&output.stderr);
    assert!(
        !stderr.contains("127.0.0.1:1"),
        "--local still consulted the selected server: {stderr}"
    );
    assert!(output.status.success(), "auth status --local failed");
}

/// With no server selected, `auth` behaves exactly as it always did.
#[test]
fn without_a_selection_auth_stays_local() {
    let config = tempfile::tempdir().expect("config home");
    let home = tempfile::tempdir().expect("temp home");

    // `--managed` pins the local path. Without a selection `auth` now adopts a
    // router already listening on this machine (issue #250), so a bare
    // `auth status` would describe whatever the developer happens to be
    // running rather than the behaviour under test.
    let output = Command::new(env!("CARGO_BIN_EXE_link-assistant-router"))
        .args(["auth", "status", "--managed"])
        .env("XDG_CONFIG_HOME", config.path())
        .env("HOME", home.path())
        .env("TOKEN_SECRET", "auth-cli-test-secret")
        .output()
        .expect("router CLI should run");

    assert!(
        output.status.success(),
        "auth status without a selection failed: {}",
        String::from_utf8_lossy(&output.stderr)
    );
}

/// `--local` and `--server` are mutually exclusive: the target must be one
/// unambiguous thing, which is the entire point of naming it.
#[test]
fn local_and_server_cannot_be_combined() {
    let output = router(&[
        "auth",
        "status",
        "--local",
        "--server",
        "http://127.0.0.1:1",
    ]);

    assert!(!output.status.success());
    assert!(
        String::from_utf8_lossy(&output.stderr).contains("cannot be used with"),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
}
