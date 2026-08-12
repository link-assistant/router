//! Black-box coverage for foreground provider authorization commands.

use std::process::Command;

#[test]
fn claude_code_without_a_pending_login_does_not_start_a_new_login() {
    let home = tempfile::tempdir().expect("temp home");
    let output = Command::new(env!("CARGO_BIN_EXE_link-assistant-router"))
        .args([
            "auth",
            "claude",
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
        .args(["auth", "claude", "--flow", "cli", "--code", "copied-code"])
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
