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

#[test]
fn status_exits_nonzero_and_never_prints_usable_when_refresh_storage_fails() {
    let config = tempfile::tempdir().expect("config home");
    let home = tempfile::tempdir().expect("temp home");
    let codex = home.path().join(".codex");
    std::fs::create_dir_all(&codex).expect("codex home");
    std::fs::write(
        codex.join("auth.json"),
        r#"{"tokens":{"access_token":"expired-access","refresh_token":"refresh-link"},"expiry_date":1}"#,
    )
    .expect("seed codex credential");
    let blocked_data_dir = home.path().join("not-a-directory");
    std::fs::write(&blocked_data_dir, b"occupied").expect("block recovery directory");

    let output = Command::new(env!("CARGO_BIN_EXE_link-assistant-router"))
        .args(["auth", "status", "--managed"])
        .env("XDG_CONFIG_HOME", config.path())
        .env("HOME", home.path())
        .env("DATA_DIR", &blocked_data_dir)
        .env("TOKEN_SECRET", "auth-cli-test-secret")
        .output()
        .expect("router CLI should run");

    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);
    assert_eq!(
        output.status.code(),
        Some(1),
        "stdout={stdout}\nstderr={stderr}"
    );
    assert!(!stdout.contains("codex    usable"), "{stdout}");
    assert!(stderr.contains("codex refresh"), "{stderr}");
    assert!(
        !stderr.contains(blocked_data_dir.to_string_lossy().as_ref()),
        "{stderr}"
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

/// Withdrawing a credential removes every file the provider is *read* from,
/// not merely the one a login writes.
///
/// Claude is read from five candidate names. Clearing only the written one
/// left the reader finding another and reporting the credential as present —
/// a withdrawal that silently did not happen (issue #268).
#[test]
fn clearing_claude_removes_every_name_it_is_read_from() {
    let home = tempfile::tempdir().expect("temp home");
    let claude = home.path().join("claude");
    std::fs::create_dir_all(&claude).expect("claude home");
    for name in ["credentials.json", ".credentials.json", "oauth.json"] {
        std::fs::write(
            claude.join(name),
            r#"{"access_token":"synthetic","expiresAt":9999999999999}"#,
        )
        .expect("plant a credential");
    }

    let output = Command::new(env!("CARGO_BIN_EXE_link-assistant-router"))
        .args(["auth", "claude", "--clear", "--local"])
        .env("TOKEN_SECRET", "auth-cli-test-secret")
        .env("HOME", home.path())
        .env("CLAUDE_CODE_HOME", &claude)
        .output()
        .expect("router CLI should run");
    assert!(output.status.success(), "{output:?}");

    for name in ["credentials.json", ".credentials.json", "oauth.json"] {
        assert!(
            !claude.join(name).exists(),
            "{name} survived the withdrawal"
        );
    }

    // The acceptance test from the issue: status must now say `absent`.
    let status = Command::new(env!("CARGO_BIN_EXE_link-assistant-router"))
        .args(["auth", "status", "--local"])
        .env("TOKEN_SECRET", "auth-cli-test-secret")
        .env("HOME", home.path())
        .env("CLAUDE_CODE_HOME", &claude)
        .output()
        .expect("router CLI should run");
    let seen = String::from_utf8_lossy(&status.stdout);
    assert!(
        seen.lines()
            .any(|line| line.starts_with("claude") && line.contains("absent")),
        "status should report claude absent: {seen}"
    );
}

/// Withdrawal names the upstream it cannot reach.
///
/// Deleting a local file does not revoke the token at GitHub or Anthropic, and
/// an operator who believes it did has a false sense of cleanup.
#[test]
fn withdrawal_says_the_credential_is_still_valid_upstream() {
    let home = tempfile::tempdir().expect("temp home");
    let data = home.path().join("data");
    std::fs::create_dir_all(&data).expect("data dir");
    std::fs::write(data.join("github-credential"), "gho_synthetic").expect("plant a credential");

    let output = Command::new(env!("CARGO_BIN_EXE_link-assistant-router"))
        .args(["auth", "gh", "--clear"])
        .env("TOKEN_SECRET", "auth-cli-test-secret")
        .env("HOME", home.path())
        .env("DATA_DIR", &data)
        .output()
        .expect("router CLI should run");
    assert!(output.status.success(), "{output:?}");
    assert!(
        !data.join("github-credential").exists(),
        "the credential must be gone"
    );

    let seen = String::from_utf8_lossy(&output.stdout);
    assert!(seen.contains("removed"), "{seen}");
    assert!(
        seen.contains("still valid upstream"),
        "the operator must be told the token lives on upstream: {seen}"
    );
    assert!(
        seen.contains("restart"),
        "the routes outlive the credential until a restart: {seen}"
    );
}

/// One `--clear-all` withdraws every identity, so decommissioning a test
/// deployment does not mean remembering three separate paths.
#[test]
fn clear_all_withdraws_every_identity_at_once() {
    let home = tempfile::tempdir().expect("temp home");
    let claude = home.path().join("claude");
    let codex = home.path().join("codex");
    let data = home.path().join("data");
    for directory in [&claude, &codex, &data] {
        std::fs::create_dir_all(directory).expect("directory");
    }
    std::fs::write(
        claude.join(".credentials.json"),
        r#"{"access_token":"synthetic","expiresAt":9999999999999}"#,
    )
    .expect("plant claude");
    std::fs::write(
        codex.join("auth.json"),
        r#"{"tokens":{"access_token":"s"}}"#,
    )
    .expect("plant codex");
    std::fs::write(data.join("github-credential"), "gho_synthetic").expect("plant github");

    let output = Command::new(env!("CARGO_BIN_EXE_link-assistant-router"))
        .args(["auth", "status", "--clear-all", "--yes", "--local"])
        .env("TOKEN_SECRET", "auth-cli-test-secret")
        .env("HOME", home.path())
        .env("CLAUDE_CODE_HOME", &claude)
        .env("CODEX_HOME", &codex)
        .env("DATA_DIR", &data)
        .output()
        .expect("router CLI should run");
    assert!(output.status.success(), "{output:?}");

    assert!(
        !claude.join(".credentials.json").exists(),
        "claude survived"
    );
    assert!(!codex.join("auth.json").exists(), "codex survived");
    assert!(!data.join("github-credential").exists(), "github survived");
}

/// `--clear` is not a way to spell an authorization.
#[test]
fn clear_cannot_be_combined_with_authorizing_flags() {
    let output = router(&["auth", "claude", "--clear", "--code", "abc"]);
    assert!(
        !output.status.success(),
        "--clear with --code must be rejected"
    );
}

/// A synthetic credential cannot be adopted merely because it parses and says
/// it has not expired. Import now proves the refresh chain at the vendor first.
#[test]
fn an_unverified_claude_login_is_not_adopted() {
    let home = tempfile::tempdir().expect("temp home");
    let source = home.path().join("source");
    let destination = home.path().join("router-claude");
    std::fs::create_dir_all(&source).expect("source home");
    let expires_at = 99_999_999_999_999_i64;
    std::fs::write(
        source.join(".credentials.json"),
        format!(
            r#"{{"claudeAiOauth":{{"accessToken":"synthetic","refreshToken":"synthetic-refresh","expiresAt":{expires_at}}}}}"#
        ),
    )
    .expect("plant a credential");

    let output = Command::new(env!("CARGO_BIN_EXE_link-assistant-router"))
        .args([
            "auth",
            "claude",
            "--from-claude-home",
            source.to_str().expect("utf-8 path"),
            "--local",
        ])
        .env("TOKEN_SECRET", "auth-cli-test-secret")
        .env("HOME", home.path())
        .env("CLAUDE_CODE_HOME", &destination)
        .output()
        .expect("router CLI should run");
    assert!(!output.status.success(), "{output:?}");
    assert!(
        !destination.join(".credentials.json").exists(),
        "an unverified credential reached the destination"
    );
    let seen = String::from_utf8_lossy(&output.stderr);
    assert!(seen.contains("candidate refresh chain"), "{seen}");
}

/// Codex follows the same fail-closed public path; preservation of its complete
/// rotated document is covered by the controlled four-provider unit matrix.
#[test]
fn an_unverified_codex_login_is_not_adopted() {
    let home = tempfile::tempdir().expect("temp home");
    let source = home.path().join("source");
    let destination = home.path().join("router-codex");
    std::fs::create_dir_all(&source).expect("source home");
    std::fs::write(
        source.join("auth.json"),
        r#"{"auth_mode":"chatgpt","tokens":{"id_token":"synthetic-id","access_token":"a","refresh_token":"r"}}"#,
    )
    .expect("plant a credential");

    let output = Command::new(env!("CARGO_BIN_EXE_link-assistant-router"))
        .args([
            "auth",
            "codex",
            "--from-codex-home",
            source.to_str().expect("utf-8 path"),
            "--local",
        ])
        .env("TOKEN_SECRET", "auth-cli-test-secret")
        .env("HOME", home.path())
        .env("CODEX_HOME", &destination)
        .output()
        .expect("router CLI should run");
    assert!(!output.status.success(), "{output:?}");
    assert!(!destination.join("auth.json").exists());
    assert!(
        String::from_utf8_lossy(&output.stderr).contains("candidate refresh chain"),
        "{output:?}"
    );
}

/// Importing a home onto itself is refused rather than silently rewriting the
/// credential with itself.
#[test]
fn importing_a_home_onto_itself_is_refused() {
    let home = tempfile::tempdir().expect("temp home");
    let claude = home.path().join("claude");
    std::fs::create_dir_all(&claude).expect("claude home");
    std::fs::write(
        claude.join(".credentials.json"),
        r#"{"claudeAiOauth":{"accessToken":"synthetic","expiresAt":99999999999999}}"#,
    )
    .expect("plant a credential");

    let output = Command::new(env!("CARGO_BIN_EXE_link-assistant-router"))
        .args([
            "auth",
            "claude",
            "--from-claude-home",
            claude.to_str().expect("utf-8 path"),
            "--local",
        ])
        .env("TOKEN_SECRET", "auth-cli-test-secret")
        .env("HOME", home.path())
        .env("CLAUDE_CODE_HOME", &claude)
        .output()
        .expect("router CLI should run");

    assert!(!output.status.success(), "self-import must be refused");
    let seen = String::from_utf8_lossy(&output.stderr);
    assert!(seen.contains("already read from"), "{seen}");
}

/// An absent source names the fix rather than failing opaquely.
#[test]
fn importing_from_a_home_without_a_credential_says_so() {
    let home = tempfile::tempdir().expect("temp home");
    let source = home.path().join("empty");
    std::fs::create_dir_all(&source).expect("source home");

    let output = Command::new(env!("CARGO_BIN_EXE_link-assistant-router"))
        .args([
            "auth",
            "claude",
            "--from-claude-home",
            source.to_str().expect("utf-8 path"),
            "--local",
        ])
        .env("TOKEN_SECRET", "auth-cli-test-secret")
        .env("HOME", home.path())
        .env("CLAUDE_CODE_HOME", home.path().join("router-claude"))
        .output()
        .expect("router CLI should run");

    assert!(!output.status.success(), "an absent credential must fail");
    let seen = String::from_utf8_lossy(&output.stderr);
    assert!(seen.contains("no claude credential to import"), "{seen}");
}

/// Import and withdrawal are opposites and cannot be asked for at once.
#[test]
fn import_cannot_be_combined_with_clear() {
    let output = router(&["auth", "claude", "--from-claude-home", "/tmp/x", "--clear"]);
    assert!(
        !output.status.success(),
        "--from-claude-home with --clear must be rejected"
    );
}

/// Importing is reachable as a verb, not only as a flag on each provider's
/// authorize command.
///
/// Spelled as a flag it was undiscoverable: `auth --help` listed three
/// "Authorize" entries and a "status", and a user had to open each provider's
/// own help to learn the capability existed — then learn a different flag name
/// for each one (issue #278).
#[test]
fn import_is_a_verb_listed_in_the_auth_command_list() {
    let output = router(&["auth", "--help"]);
    assert!(output.status.success(), "{output:?}");
    let seen = String::from_utf8_lossy(&output.stdout);
    assert!(
        seen.contains("import"),
        "auth --help must list import: {seen}"
    );

    // And it names every source it can adopt from, on one page.
    let help = router(&["auth", "import", "--help"]);
    assert!(help.status.success(), "{help:?}");
    let seen = String::from_utf8_lossy(&help.stdout);
    for provider in ["claude", "codex", "gemini", "qwen", "gh"] {
        assert!(seen.contains(provider), "{provider} missing: {seen}");
    }
    for flag in ["--if-absent", "--safe-refresh-chain-import-v1"] {
        assert!(seen.contains(flag), "{flag} missing: {seen}");
    }
    assert!(
        !seen.contains("--force"),
        "unsafe rejection bypass is still public: {seen}"
    );
}

#[test]
fn conditional_import_reports_already_present_without_replacement() {
    let root = tempfile::tempdir().expect("root");
    let source = root.path().join("source");
    let destination = root.path().join("destination");
    let data = root.path().join("data");
    std::fs::create_dir_all(&source).expect("source");
    std::fs::create_dir_all(&destination).expect("destination");
    std::fs::write(
        source.join("oauth_creds.json"),
        r#"{"access_token":"candidate","refresh_token":"stale","resource_url":"http://127.0.0.1:1"}"#,
    )
    .expect("candidate");
    let current = br#"{"access_token":"current","refresh_token":"rotated","resource_url":"http://127.0.0.1:1"}"#;
    std::fs::write(destination.join("oauth_creds.json"), current).expect("current");

    let output = Command::new(env!("CARGO_BIN_EXE_link-assistant-router"))
        .args([
            "auth",
            "import",
            "qwen",
            source.to_str().expect("source path"),
            "--if-absent",
            "--local",
        ])
        .env("TOKEN_SECRET", "auth-cli-test-secret")
        .env("HOME", root.path())
        .env("QWEN_HOME", &destination)
        .env("DATA_DIR", &data)
        .output()
        .expect("router CLI should run");

    assert!(output.status.success(), "{output:?}");
    assert_eq!(
        std::fs::read(destination.join("oauth_creds.json")).unwrap(),
        current
    );
    let stdout = String::from_utf8_lossy(&output.stdout);
    assert!(stdout.contains("already present"), "{stdout}");
    assert!(
        !stdout.contains("share one rotating chain"),
        "no adoption occurred, so the shared-chain note is false: {stdout}"
    );
}

#[test]
fn conditional_import_rejects_unsupported_flag_combinations() {
    for args in [
        vec!["auth", "import", "gh", "/tmp", "--if-absent", "--local"],
        vec!["auth", "import", "codex", "/tmp", "--force", "--local"],
        vec!["auth", "import", "--all", "--if-absent", "--local"],
    ] {
        let output = router(&args);
        assert!(!output.status.success(), "accepted {args:?}");
        let stderr = String::from_utf8_lossy(&output.stderr);
        assert!(
            stderr.contains("if-absent") || stderr.contains("--force"),
            "{args:?}: {stderr}"
        );
    }
}

#[test]
fn malformed_conditional_candidate_does_not_hide_behind_existing_destination() {
    let root = tempfile::tempdir().expect("root");
    let source = root.path().join("source");
    let destination = root.path().join("destination");
    std::fs::create_dir_all(&source).expect("source");
    std::fs::create_dir_all(&destination).expect("destination");
    std::fs::write(source.join("oauth_creds.json"), "not-json").expect("malformed");
    let current = br#"{"access_token":"current","refresh_token":"rotated"}"#;
    std::fs::write(destination.join("oauth_creds.json"), current).expect("current");

    let output = Command::new(env!("CARGO_BIN_EXE_link-assistant-router"))
        .args([
            "auth",
            "import",
            "gemini",
            source.to_str().expect("source path"),
            "--if-absent",
            "--local",
        ])
        .env("TOKEN_SECRET", "auth-cli-test-secret")
        .env("HOME", root.path())
        .env("GEMINI_HOME", &destination)
        .env("DATA_DIR", root.path().join("data"))
        .output()
        .expect("router CLI should run");

    assert!(!output.status.success(), "malformed candidate must fail");
    assert_eq!(
        std::fs::read(destination.join("oauth_creds.json")).unwrap(),
        current
    );
}

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
    assert!(
        String::from_utf8_lossy(&output.stderr).contains("candidate refresh chain"),
        "{output:?}"
    );
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
    let error = String::from_utf8_lossy(&output.stderr);
    assert!(error.contains("candidate refresh chain"), "{error}");
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
    assert!(
        String::from_utf8_lossy(&output.stderr).contains("candidate refresh chain"),
        "{output:?}"
    );
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

/// An import aimed at another router refuses and names it (issue #291).
///
/// `--server` parsed and was then discarded, so the command answered about the
/// *local* credential home: `claude is already read from /Users/me/.claude`
/// reads as a coherent reply to a question about the selected server, and an
/// operator cannot tell the target was never consulted. A wrong-target action
/// wearing a plausible answer is worse than a plain refusal.
#[test]
fn an_import_aimed_at_a_server_refuses_instead_of_answering_about_the_local_home() {
    let home = tempfile::tempdir().expect("temp home");
    let config = tempfile::tempdir().expect("config home");
    let claude_home = home.path().join(".claude");
    std::fs::create_dir_all(&claude_home).expect("source home");
    std::fs::write(
        claude_home.join(".credentials.json"),
        r#"{"claudeAiOauth":{"accessToken":"workstation","refreshToken":"r","expiresAt":4102444800000}}"#,
    )
    .expect("plant a login");

    let output = Command::new(env!("CARGO_BIN_EXE_link-assistant-router"))
        // Unreachable on purpose: the refusal must not depend on contacting the
        // router, and it must not silently fall back to a local import.
        .args(["auth", "import", "claude", "--server", "http://127.0.0.1:1"])
        .env("XDG_CONFIG_HOME", config.path())
        .env("HOME", home.path())
        .env("TOKEN_SECRET", "auth-cli-test-secret")
        .output()
        .expect("router CLI should run");

    assert!(
        !output.status.success(),
        "an import that could not reach its target must not report success"
    );
    let seen = String::from_utf8_lossy(&output.stderr);
    assert!(
        seen.contains("127.0.0.1:1"),
        "the refusal must name the target that was asked for: {seen}"
    );
    assert!(
        !seen.contains("is already read from"),
        "the local home must not be described as though it were the target: {seen}"
    );
}

/// A selection persisted in configuration is honoured the same way.
///
/// Three spellings produced one behaviour — `--server URL`, a persisted
/// selection, and `--local` — which made the flags actively misleading rather
/// than merely inert. Only `--local` may act locally.
#[test]
fn a_persisted_selection_also_refuses_a_local_import() {
    let home = tempfile::tempdir().expect("temp home");
    let config = tempfile::tempdir().expect("config home");
    let claude_home = home.path().join(".claude");
    std::fs::create_dir_all(&claude_home).expect("source home");
    std::fs::write(
        claude_home.join(".credentials.json"),
        r#"{"claudeAiOauth":{"accessToken":"workstation","refreshToken":"r","expiresAt":4102444800000}}"#,
    )
    .expect("plant a login");
    let destination = tempfile::tempdir().expect("destination");

    let run = |args: &[&str], select: bool| {
        let mut command = Command::new(env!("CARGO_BIN_EXE_link-assistant-router"));
        command
            .args(args)
            .env("XDG_CONFIG_HOME", config.path())
            .env("HOME", home.path())
            .env("CLAUDE_CODE_HOME", destination.path())
            .env("TOKEN_SECRET", "auth-cli-test-secret");
        if select {
            command.env("ROUTER_URL", "http://127.0.0.1:1");
        }
        command.output().expect("router CLI should run")
    };

    let selected = run(&["auth", "import", "claude"], true);
    assert!(
        !selected.status.success(),
        "a selection must not be silently redirected to the local machine"
    );
    assert!(
        !destination.path().join(".credentials.json").exists(),
        "nothing may be installed locally while another router is the target"
    );

    // `--local` requests the local action, but it does not bypass safe
    // refresh-chain validation.
    let local = run(&["auth", "import", "claude", "--local"], true);
    assert!(
        !local.status.success(),
        "an unverified local candidate was imported: {}",
        String::from_utf8_lossy(&local.stderr)
    );
    assert!(
        !destination.path().join(".credentials.json").exists(),
        "--local bypassed refresh-chain validation"
    );
    assert!(
        String::from_utf8_lossy(&local.stderr).contains("candidate refresh chain"),
        "{local:?}"
    );
}
