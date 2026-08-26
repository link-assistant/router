//! Withdrawal and the refusals that guard it (issues #268, #294, #305).
//!
//! Split from `auth_cli_test.rs` to stay inside the repository's per-file line
//! limit.

/// The defect in issue #305: every spelling of "take this login away" was
/// handled before the target was resolved, so `--server` was parsed, accepted
/// and thrown away. The credentials deleted were the ones on the machine that
/// ran the command, and the report read exactly as it would have if the named
/// deployment had been cleared.
#[test]
fn withdrawal_refuses_a_named_server_instead_of_clearing_this_machine() {
    let home = tempfile::tempdir().expect("temporary home");
    let credential = home.path().join(".claude/.credentials.json");
    std::fs::create_dir_all(credential.parent().expect("parent")).expect("create claude home");
    std::fs::write(&credential, "{}").expect("seed a local credential");

    for arguments in [
        &[
            "auth",
            "claude",
            "--clear",
            "--server",
            "http://127.0.0.1:1",
        ][..],
        &["auth", "clear", "claude", "--server", "http://127.0.0.1:1"],
        &[
            "auth",
            "status",
            "--clear-all",
            "--yes",
            "--server",
            "http://127.0.0.1:1",
        ],
        &[
            "auth",
            "clear",
            "--all",
            "--yes",
            "--server",
            "http://127.0.0.1:1",
        ],
    ] {
        let output = std::process::Command::new(env!("CARGO_BIN_EXE_link-assistant-router"))
            .args(arguments)
            .arg("--data-dir")
            .arg(home.path().join("data"))
            .env("HOME", home.path())
            .env_remove("TOKEN_SECRET")
            .output()
            .expect("router CLI runs");
        assert!(!output.status.success(), "{arguments:?} must refuse");
        let stderr = String::from_utf8_lossy(&output.stderr);
        assert!(
            stderr.contains("http://127.0.0.1:1"),
            "{arguments:?} must name the target it cannot clear: {stderr}"
        );
        assert!(
            credential.exists(),
            "{arguments:?} deleted this machine's credential anyway"
        );
    }
}

/// An OAuth login cannot be put back without a browser, so the widest
/// withdrawal in the tool asks first.
#[test]
fn clearing_every_credential_at_once_asks_first() {
    let home = tempfile::tempdir().expect("temporary home");
    let credential = home.path().join(".claude/.credentials.json");
    std::fs::create_dir_all(credential.parent().expect("parent")).expect("create claude home");
    std::fs::write(&credential, "{}").expect("seed a local credential");

    let refused = std::process::Command::new(env!("CARGO_BIN_EXE_link-assistant-router"))
        .args(["auth", "clear", "--all", "--local"])
        .arg("--data-dir")
        .arg(home.path().join("data"))
        .env("HOME", home.path())
        .env_remove("TOKEN_SECRET")
        .output()
        .expect("router CLI runs");
    assert!(!refused.status.success());
    assert!(
        String::from_utf8_lossy(&refused.stderr).contains("--yes"),
        "the refusal must name the way to proceed"
    );
    assert!(
        credential.exists(),
        "nothing may be removed without consent"
    );

    // Naming one provider is unambiguous and needs no confirmation.
    let single = std::process::Command::new(env!("CARGO_BIN_EXE_link-assistant-router"))
        .args(["auth", "clear", "claude", "--local"])
        .arg("--data-dir")
        .arg(home.path().join("data"))
        .env("HOME", home.path())
        .env_remove("TOKEN_SECRET")
        .output()
        .expect("router CLI runs");
    assert!(
        single.status.success(),
        "{}",
        String::from_utf8_lossy(&single.stderr)
    );
    assert!(!credential.exists(), "the named credential must be removed");
}

/// `--claude-code-home` names this machine's credential home, so `auth status`
/// must report about it rather than about a router that merely happens to be
/// listening here (issue #294).
///
/// The exemption stops at the verbs that *store*: letting a local-state flag
/// suppress the selected-server refusal would leave a workstation holding a
/// token aimed at a deployment, and `DATA_DIR` is set in the environment of
/// every deployment — nobody would have to pass a flag to trigger it.
#[test]
fn a_local_state_flag_never_suppresses_the_refusal_for_a_verb_that_stores() {
    use std::io::Write as _;

    let home = tempfile::tempdir().expect("temp home");
    let data = home.path().join("data");
    std::fs::create_dir_all(&data).expect("data dir");

    let mut child = std::process::Command::new(env!("CARGO_BIN_EXE_link-assistant-router"))
        .args(["auth", "gh", "--token-stdin"])
        .env("ROUTER_URL", "http://127.0.0.1:1")
        .env("TOKEN_SECRET", "auth-cli-test-secret")
        .env("HOME", home.path())
        // Both local-state names at once, the way a deployment sets them.
        .env("DATA_DIR", &data)
        .env("CLAUDE_CODE_HOME", home.path().join("claude"))
        .stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .expect("router CLI should run");
    child
        .stdin
        .take()
        .expect("stdin")
        .write_all(b"gho_must_not_be_stored_here\n")
        .expect("write the token");
    let output = child.wait_with_output().expect("wait");

    assert!(
        !output.status.success(),
        "a local-state flag must not turn a refusal into a local write"
    );
    assert!(
        !data.join("github-credential").exists(),
        "the token must not be stored on the machine that ran the command"
    );
}
