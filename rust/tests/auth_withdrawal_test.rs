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

/// Issue #561: `auth clear --all` promises to "Remove every login this
/// deployment holds", but it withdrew only the credentials `auth` happened to
/// enumerate. An API-key provider added through `providers add` kept its stored
/// secret and stayed enabled, so the deployment could still reach the vendor
/// after the operator was told every login was gone.
///
/// The full acceptance shape from the issue: the provider is visible in `auth
/// status` before the withdrawal, gone after it, and `providers list` shows no
/// enabled provider still holding a key.
#[test]
fn withdrawing_every_login_also_withdraws_the_api_key_providers() {
    let home = tempfile::tempdir().expect("temporary home");
    let data = home.path().join("data");
    let credential = home.path().join(".claude/.credentials.json");
    std::fs::create_dir_all(credential.parent().expect("parent")).expect("create claude home");
    std::fs::write(&credential, "{}").expect("seed a local credential");

    let router = |arguments: &[&str], secret: Option<&str>| {
        let mut command = std::process::Command::new(env!("CARGO_BIN_EXE_link-assistant-router"));
        command
            .args(arguments)
            .arg("--data-dir")
            .arg(&data)
            .env("HOME", home.path());
        match secret {
            Some(secret) => command.env("TOKEN_SECRET", secret),
            None => command.env_remove("TOKEN_SECRET"),
        };
        command.output().expect("router CLI runs")
    };

    // A provider holding a live upstream key, exactly as `providers add` stores
    // one. Adding encrypts the key, so this is the one step that needs a secret.
    let added = router(
        &[
            "providers",
            "add",
            "--name",
            "vendor-a",
            "--base-url",
            "https://vendor-a.test/v1",
            "--api-key",
            "zai-live-key",
            "--local",
        ],
        Some("auth-withdrawal-test-secret"),
    );
    assert!(
        added.status.success(),
        "seeding a provider failed: {}",
        String::from_utf8_lossy(&added.stderr)
    );

    // Before: the authorization surface an operator can see includes the key.
    let before = router(&["auth", "status", "--local"], None);
    assert!(
        String::from_utf8_lossy(&before.stdout).contains("vendor-a"),
        "auth status must report the API-key providers it holds: {}",
        String::from_utf8_lossy(&before.stdout)
    );

    let cleared = router(&["auth", "clear", "--all", "--yes", "--local"], None);
    assert!(
        cleared.status.success(),
        "{}",
        String::from_utf8_lossy(&cleared.stderr)
    );
    let report = String::from_utf8_lossy(&cleared.stdout);
    assert!(
        report.contains("vendor-a"),
        "the withdrawal must name the API-key provider it removed: {report}"
    );
    assert!(
        !credential.exists(),
        "the subscription must still be removed"
    );

    // After: no enabled provider still holds a key, and nothing reports it as
    // present. This is the property the issue is about — an operator told the
    // deployment is empty must not be left holding a working credential.
    let listed = router(&["providers", "list", "--local"], None);
    let listed = String::from_utf8_lossy(&listed.stdout);
    assert!(
        !listed.contains("vendor-a"),
        "a withdrawn provider must not remain in the store: {listed}"
    );
    let after = router(&["auth", "status", "--local"], None);
    assert!(
        !String::from_utf8_lossy(&after.stdout).contains("vendor-a"),
        "auth status must report the provider absent after withdrawal: {}",
        String::from_utf8_lossy(&after.stdout)
    );
}

/// `auth clear <provider>` accepts a configured provider name, not only the
/// fixed enum: a stored key authorizes this deployment exactly as an OAuth
/// login does, so `auth` must be able to withdraw the one it reports (#561).
///
/// An unknown name must say so rather than report a clean withdrawal of
/// nothing, and naming one provider must leave the others alone.
#[test]
fn withdrawal_accepts_a_configured_provider_name_and_refuses_an_unknown_one() {
    let home = tempfile::tempdir().expect("temporary home");
    let data = home.path().join("data");

    let router = |arguments: &[&str], secret: Option<&str>| {
        let mut command = std::process::Command::new(env!("CARGO_BIN_EXE_link-assistant-router"));
        command
            .args(arguments)
            .arg("--data-dir")
            .arg(&data)
            .env("HOME", home.path());
        match secret {
            Some(secret) => command.env("TOKEN_SECRET", secret),
            None => command.env_remove("TOKEN_SECRET"),
        };
        command.output().expect("router CLI runs")
    };

    for name in ["vendor-b", "vendor-a"] {
        let added = router(
            &[
                "providers",
                "add",
                "--name",
                name,
                "--base-url",
                "https://vendor.test/v1",
                "--api-key",
                "live-key",
                "--local",
            ],
            Some("auth-withdrawal-test-secret"),
        );
        assert!(
            added.status.success(),
            "seeding {name} failed: {}",
            String::from_utf8_lossy(&added.stderr)
        );
    }

    // One provider by name, without `--yes`: naming one credential is
    // unambiguous and needs no confirmation, as it already does for `claude`.
    let cleared = router(&["auth", "clear", "vendor-b", "--local"], None);
    assert!(
        cleared.status.success(),
        "{}",
        String::from_utf8_lossy(&cleared.stderr)
    );
    let listed = router(&["providers", "list", "--local"], None);
    let listed = String::from_utf8_lossy(&listed.stdout);
    assert!(
        !listed.contains("vendor-b"),
        "the named provider must be withdrawn: {listed}"
    );
    assert!(
        listed.contains("vendor-a"),
        "naming one provider must leave the others alone: {listed}"
    );

    // A name that authorizes nothing must not report a clean withdrawal.
    let unknown = router(&["auth", "clear", "not-a-provider", "--local"], None);
    assert!(
        !unknown.status.success(),
        "an unknown credential name must refuse rather than report success"
    );
    assert!(
        String::from_utf8_lossy(&unknown.stderr).contains("not-a-provider"),
        "the refusal must name what it could not find: {}",
        String::from_utf8_lossy(&unknown.stderr)
    );
}

/// A deployment holding only API-key providers must report them, rather than
/// the all-absent table that told an operator there was nothing there (#561).
#[test]
fn a_deployment_with_only_api_keys_still_reports_its_authorization_surface() {
    let home = tempfile::tempdir().expect("temporary home");
    let data = home.path().join("data");

    let added = std::process::Command::new(env!("CARGO_BIN_EXE_link-assistant-router"))
        .args([
            "providers",
            "add",
            "--name",
            "vendor-b",
            "--base-url",
            "https://vendor.test/v1",
            "--api-key",
            "live-key",
            "--local",
        ])
        .arg("--data-dir")
        .arg(&data)
        .env("HOME", home.path())
        .env("TOKEN_SECRET", "auth-withdrawal-test-secret")
        .output()
        .expect("router CLI runs");
    assert!(
        added.status.success(),
        "{}",
        String::from_utf8_lossy(&added.stderr)
    );

    let status = std::process::Command::new(env!("CARGO_BIN_EXE_link-assistant-router"))
        .args(["auth", "status", "--local"])
        .arg("--data-dir")
        .arg(&data)
        .env("HOME", home.path())
        .env_remove("TOKEN_SECRET")
        .output()
        .expect("router CLI runs");
    let reported = String::from_utf8_lossy(&status.stdout);
    assert!(
        reported.contains("vendor-b"),
        "the only credential this deployment holds must appear in auth status: {reported}"
    );
}

/// Withdrawal acts on the machine it runs on and is never performed over HTTP.
/// Accepting a configured provider name (issue #561) must not open a path
/// around that rule: naming a server has to refuse before the key is removed,
/// exactly as it already does for a subscription (issue #305).
#[test]
fn withdrawing_a_named_provider_still_refuses_a_selected_server() {
    let home = tempfile::tempdir().expect("temporary home");
    let data = home.path().join("data");

    let added = std::process::Command::new(env!("CARGO_BIN_EXE_link-assistant-router"))
        .args([
            "providers",
            "add",
            "--name",
            "vendor-a",
            "--base-url",
            "https://vendor-a.test/v1",
            "--api-key",
            "live-key",
            "--local",
        ])
        .arg("--data-dir")
        .arg(&data)
        .env("HOME", home.path())
        .env("TOKEN_SECRET", "auth-withdrawal-test-secret")
        .output()
        .expect("router CLI runs");
    assert!(
        added.status.success(),
        "{}",
        String::from_utf8_lossy(&added.stderr)
    );

    let refused = std::process::Command::new(env!("CARGO_BIN_EXE_link-assistant-router"))
        .args([
            "auth",
            "clear",
            "vendor-a",
            "--server",
            "http://127.0.0.1:1",
        ])
        .arg("--data-dir")
        .arg(&data)
        .env("HOME", home.path())
        .env_remove("TOKEN_SECRET")
        .output()
        .expect("router CLI runs");
    assert!(!refused.status.success(), "a named server must refuse");
    assert!(
        String::from_utf8_lossy(&refused.stderr).contains("http://127.0.0.1:1"),
        "the refusal must name the target it cannot clear: {}",
        String::from_utf8_lossy(&refused.stderr)
    );

    // The key must survive a refusal: removing it here would be the silent
    // "there" → "here" rewrite the refusal exists to prevent.
    let listed = std::process::Command::new(env!("CARGO_BIN_EXE_link-assistant-router"))
        .args(["providers", "list", "--local"])
        .arg("--data-dir")
        .arg(&data)
        .env("HOME", home.path())
        .env_remove("TOKEN_SECRET")
        .output()
        .expect("router CLI runs");
    assert!(
        String::from_utf8_lossy(&listed.stdout).contains("vendor-a"),
        "a refused withdrawal must leave the credential intact: {}",
        String::from_utf8_lossy(&listed.stdout)
    );
}
