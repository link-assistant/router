/// The import verb and the legacy per-provider spelling share the same safe
/// validator; neither can install an unverified credential.
#[test]
fn the_import_subcommand_cannot_bypass_validation() {
    let home = tempfile::tempdir().expect("temp home");
    let source = home.path().join("source");
    let destination = home.path().join("router-claude");
    std::fs::create_dir_all(&source).expect("source home");
    std::fs::write(
        source.join(".credentials.json"),
        r#"{"claudeAiOauth":{"accessToken":"synthetic","refreshToken":"r","expiresAt":99999999999999}}"#,
    )
    .expect("plant a credential");

    let output = Command::new(env!("CARGO_BIN_EXE_link-assistant-router"))
        .args([
            "auth",
            "import",
            "claude",
            source.to_str().expect("utf-8 path"),
            "--local",
        ])
        .env("TOKEN_SECRET", "auth-cli-test-secret")
        .env("HOME", home.path())
        .env("CLAUDE_CODE_HOME", &destination)
        .output()
        .expect("router CLI should run");

    assert!(!output.status.success(), "{output:?}");
    assert!(!destination.join(".credentials.json").exists());
    assert_refresh_chain_was_not_imported(&output);
}

/// An unqualified import reads the *vendor's* home, not the router's.
///
/// `resolve_home` honours `CLAUDE_CODE_HOME`, which in a deployment names the
/// destination — resolving the source that way made every unqualified import
/// refuse itself as a self-import (issue #278).
#[test]
fn an_unqualified_import_reads_the_vendors_own_home() {
    let home = tempfile::tempdir().expect("temp home");
    let vendor = home.path().join(".claude");
    let destination = home.path().join("router-claude");
    std::fs::create_dir_all(&vendor).expect("vendor home");
    std::fs::write(
        vendor.join(".credentials.json"),
        r#"{"claudeAiOauth":{"accessToken":"synthetic","refreshToken":"r","expiresAt":99999999999999}}"#,
    )
    .expect("plant a credential");

    let output = Command::new(env!("CARGO_BIN_EXE_link-assistant-router"))
        .args(["auth", "import", "claude", "--local"])
        .env("TOKEN_SECRET", "auth-cli-test-secret")
        .env("HOME", home.path())
        .env("CLAUDE_CODE_HOME", &destination)
        .output()
        .expect("router CLI should run");

    assert!(!output.status.success(), "{output:?}");
    assert!(
        !destination.join(".credentials.json").exists(),
        "an unverified credential must not reach the router's home"
    );
    assert_refresh_chain_was_not_imported(&output);
    let error = String::from_utf8_lossy(&output.stderr);
    assert!(
        !error.contains("no claude credential"),
        "the vendor home was not read: {error}"
    );
}

/// `--all` reports absent providers but fails when a present candidate cannot
/// be positively validated; a sweep must not claim successful provisioning.
///
/// A workstation logged in to two of five providers is the ordinary case, not
/// an error, so one absent login must not abort the rest.
#[test]
fn importing_everything_adopts_what_exists_and_reports_what_does_not() {
    let home = tempfile::tempdir().expect("temp home");
    let vendor = home.path().join(".claude");
    let destination = home.path().join("router-claude");
    std::fs::create_dir_all(&vendor).expect("vendor home");
    std::fs::write(
        vendor.join(".credentials.json"),
        r#"{"claudeAiOauth":{"accessToken":"synthetic","refreshToken":"r","expiresAt":99999999999999}}"#,
    )
    .expect("plant a credential");

    let output = Command::new(env!("CARGO_BIN_EXE_link-assistant-router"))
        .args(["auth", "import", "--all", "--local"])
        .env("TOKEN_SECRET", "auth-cli-test-secret")
        .env("HOME", home.path())
        .env("CLAUDE_CODE_HOME", &destination)
        .env("CODEX_HOME", home.path().join("router-codex"))
        .env("DATA_DIR", home.path().join("data"))
        .output()
        .expect("router CLI should run");

    assert!(
        !output.status.success(),
        "unsafe sweep succeeded: {output:?}"
    );
    assert!(
        !destination.join(".credentials.json").exists(),
        "an unverified login was adopted"
    );
    let seen = String::from_utf8_lossy(&output.stdout);
    assert!(seen.contains("nothing to adopt"), "{seen}");
    assert_refresh_chain_was_not_imported(&output);
}

/// Naming a provider and asking for everything are contradictory.
#[test]
fn import_all_cannot_also_name_one_provider() {
    let output = router(&["auth", "import", "claude", "--all"]);
    assert!(!output.status.success(), "{output:?}");
}

/// `auth gh` accepts the same target flags every other `auth` subcommand does
/// (issue #283).
///
/// It was the only one of the five that took none, so `--server` was rejected
/// outright — and without the flag there was no way to say which deployment a
/// GitHub credential was meant for.
#[test]
fn gh_accepts_the_target_flags_the_other_subcommands_take() {
    let help = router(&["auth", "gh", "--help"]);
    let seen = String::from_utf8_lossy(&help.stdout);

    for flag in ["--local", "--server", "--managed"] {
        assert!(
            seen.contains(flag),
            "auth gh must offer {flag} like its siblings: {seen}"
        );
    }
}

/// Storing a credential while a server is selected must not act on this
/// machine (issue #283).
///
/// The router reads a GitHub credential from its own data directory at
/// startup, so there is nowhere remote to put one. Acting locally under a
/// success message left the workstation holding a GitHub token it never needed
/// while the deployment that did need one still had none — the failure that
/// costs an operator a leaked token, which a plain error does not.
#[test]
fn storing_a_gh_credential_for_a_selected_server_refuses_rather_than_acting_locally() {
    use std::io::Write as _;

    let home = tempfile::tempdir().expect("temp home");
    let data = home.path().join("data");
    std::fs::create_dir_all(&data).expect("data dir");

    let mut child = std::process::Command::new(env!("CARGO_BIN_EXE_link-assistant-router"))
        // Selected through the environment rather than `--server`, which is how
        // the leak actually happened: with no flag to reject, the old build
        // parsed this cleanly and stored the token here. A router that cannot
        // be reached is enough — the refusal must not depend on contacting one.
        .args(["auth", "gh", "--token-stdin"])
        .env("ROUTER_URL", "http://127.0.0.1:1")
        .env("TOKEN_SECRET", "auth-cli-test-secret")
        .env("HOME", home.path())
        .env("DATA_DIR", &data)
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
        "a credential that could not be stored where it was aimed must not report success"
    );
    assert!(
        !data.join("github-credential").exists(),
        "the token must not land on this machine when another target was named"
    );
    assert!(
        !String::from_utf8_lossy(&output.stdout).contains("stored the GitHub credential"),
        "success must not be reported for a store that did not happen: {}",
        String::from_utf8_lossy(&output.stdout)
    );
}
