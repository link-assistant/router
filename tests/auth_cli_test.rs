//! Black-box coverage for provider authorization commands.

use std::process::{Command, Output};
use std::sync::{Arc, Mutex};

fn start_import_catalog() -> (String, Arc<Mutex<Vec<String>>>, std::thread::JoinHandle<()>) {
    use std::io::{Read as _, Write as _};

    let listener = std::net::TcpListener::bind("127.0.0.1:0").expect("catalog listener");
    listener.set_nonblocking(true).expect("nonblocking catalog");
    let origin = format!("http://{}", listener.local_addr().unwrap());
    let requests = Arc::new(Mutex::new(Vec::new()));
    let captured = Arc::clone(&requests);
    let task = std::thread::spawn(move || {
        let deadline = std::time::Instant::now() + std::time::Duration::from_secs(5);
        let (mut stream, _) = loop {
            match listener.accept() {
                Ok(connection) => break connection,
                Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => {
                    if std::time::Instant::now() >= deadline {
                        return;
                    }
                    std::thread::sleep(std::time::Duration::from_millis(10));
                }
                Err(error) => panic!("catalog accept: {error}"),
            }
        };
        stream
            .set_read_timeout(Some(std::time::Duration::from_secs(2)))
            .expect("catalog read timeout");
        let mut bytes = Vec::new();
        let mut buffer = [0_u8; 1024];
        while !bytes.windows(4).any(|window| window == b"\r\n\r\n") {
            let read = stream.read(&mut buffer).expect("catalog request");
            if read == 0 {
                break;
            }
            bytes.extend_from_slice(&buffer[..read]);
        }
        let request = String::from_utf8_lossy(&bytes);
        captured
            .lock()
            .expect("captured requests")
            .push(request.lines().next().unwrap_or_default().to_string());
        let body = r#"{"data":[{"id":"model"}],"models":[{"id":"model","slug":"model","name":"models/model","supportedGenerationMethods":["generateContent"]}]}"#;
        write!(
            stream,
            "HTTP/1.1 200 OK\r\ncontent-type: application/json\r\ncontent-length: {}\r\nconnection: close\r\n\r\n{body}",
            body.len()
        )
        .expect("catalog response");
    });
    (origin, requests, task)
}

fn router(args: &[&str]) -> Output {
    Command::new(env!("CARGO_BIN_EXE_link-assistant-router"))
        .args(args)
        .env("TOKEN_SECRET", "auth-cli-test-secret")
        .output()
        .expect("router CLI should run")
}

fn assert_refresh_chain_was_not_imported(output: &Output) {
    let seen = String::from_utf8_lossy(&output.stderr);
    assert!(
        (seen.contains("candidate refresh chain")
            && (seen.contains("was not verified") || seen.contains("was rejected")))
            || (seen.contains("external")
                && seen.contains("candidate")
                && seen.contains("refresh token was not spent")),
        "{output:?}"
    );
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
/// it has not expired. Import validates its current access token without
/// spending the externally owned refresh token.
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
    assert_refresh_chain_was_not_imported(&output);
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
    assert_refresh_chain_was_not_imported(&output);
}

#[test]
fn public_fresh_import_paths_reference_one_source_without_oauth_exchange() {
    let cases = [
        (
            "claude",
            ".credentials.json",
            "CLAUDE_CODE_HOME",
            r#"{"claudeAiOauth":{"accessToken":"source-access","refreshToken":"source-refresh","expiresAt":99999999999999},"vendor_marker":"kept"}"#,
            false,
        ),
        (
            "codex",
            "auth.json",
            "CODEX_HOME",
            r#"{"auth_mode":"chatgpt","tokens":{"access_token":"source-access","refresh_token":"source-refresh"},"vendor_marker":"kept"}"#,
            false,
        ),
        (
            "gemini",
            "oauth_creds.json",
            "GEMINI_HOME",
            r#"{"access_token":"source-access","refresh_token":"source-refresh","expiry_date":99999999999999,"vendor_marker":"kept"}"#,
            false,
        ),
        (
            "qwen",
            "oauth_creds.json",
            "QWEN_HOME",
            r#"{"access_token":"source-access","refresh_token":"source-refresh","expiry_date":99999999999999,"resource_url":"portal.qwen.ai","vendor_marker":"kept"}"#,
            false,
        ),
        (
            "claude",
            ".credentials.json",
            "CLAUDE_CODE_HOME",
            r#"{"claudeAiOauth":{"accessToken":"source-access","refreshToken":"source-refresh","expiresAt":99999999999999},"vendor_marker":"kept"}"#,
            true,
        ),
        (
            "codex",
            "auth.json",
            "CODEX_HOME",
            r#"{"auth_mode":"chatgpt","tokens":{"access_token":"source-access","refresh_token":"source-refresh"},"vendor_marker":"kept"}"#,
            true,
        ),
    ];

    for (provider, filename, destination_env, document, legacy) in cases {
        let root = tempfile::tempdir().expect("root");
        let source = root.path().join("source");
        let destination = root.path().join("destination");
        std::fs::create_dir_all(&source).expect("source");
        std::fs::create_dir_all(&destination).expect("destination");
        let source_path = source.join(filename);
        std::fs::write(&source_path, document).expect("source credential");
        let (catalog, requests, task) = start_import_catalog();
        let mut command = Command::new(env!("CARGO_BIN_EXE_link-assistant-router"));
        if legacy {
            let flag = match provider {
                "claude" => "--from-claude-home",
                "codex" => "--from-codex-home",
                _ => unreachable!(),
            };
            command.args(["auth", provider, flag, source.to_str().unwrap(), "--local"]);
        } else {
            command.args([
                "auth",
                "import",
                provider,
                source.to_str().unwrap(),
                "--local",
            ]);
        }
        let output = command
            .env("TOKEN_SECRET", "auth-cli-test-secret")
            .env("HOME", root.path())
            .env(destination_env, &destination)
            .env("DATA_DIR", root.path().join("data"))
            .env("LINK_ASSISTANT_ROUTER_TEST_CATALOG_BASE_URL", &catalog)
            .env(
                "LINK_ASSISTANT_ROUTER_TEST_TOKEN_URL",
                format!("{catalog}/token"),
            )
            .output()
            .expect("router CLI should run");
        task.join().expect("catalog task");

        assert!(
            output.status.success(),
            "{provider} legacy={legacy}: {output:?}"
        );
        let requests = requests.lock().unwrap().clone();
        assert_eq!(requests.len(), 1, "{provider} legacy={legacy}");
        assert!(
            requests[0].starts_with("GET "),
            "{provider} made an OAuth exchange: {requests:?}",
        );
        assert_eq!(std::fs::read_to_string(source_path).unwrap(), document);
        let installed = std::fs::read_to_string(destination.join(filename)).expect("reference");
        assert!(installed.contains("credential_source"), "{installed}");
        for secret in ["source-access", "source-refresh", "vendor_marker"] {
            assert!(!installed.contains(secret), "destination copied {secret}");
        }
    }
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
    for flag in [
        "--if-absent",
        "--safe-refresh-chain-import-v1",
        "--json",
        "--resume",
    ] {
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
fn conditional_import_json_reports_already_present_without_credential_material() {
    let root = tempfile::tempdir().expect("root");
    let source = root.path().join("source");
    let destination = root.path().join("destination");
    let data = root.path().join("data");
    std::fs::create_dir_all(&source).expect("source");
    std::fs::create_dir_all(&destination).expect("destination");
    std::fs::write(
        source.join("oauth_creds.json"),
        r#"{"access_token":"candidate-secret","refresh_token":"candidate-refresh"}"#,
    )
    .expect("candidate");
    let current = br#"{"access_token":"current-secret","refresh_token":"current-refresh"}"#;
    std::fs::write(destination.join("oauth_creds.json"), current).expect("current");

    let output = Command::new(env!("CARGO_BIN_EXE_link-assistant-router"))
        .args([
            "auth",
            "import",
            "qwen",
            source.to_str().expect("source path"),
            "--if-absent",
            "--json",
            "--local",
        ])
        .env("TOKEN_SECRET", "auth-cli-test-secret")
        .env("HOME", root.path())
        .env("QWEN_HOME", &destination)
        .env("DATA_DIR", &data)
        .output()
        .expect("router CLI should run");

    assert!(output.status.success(), "{output:?}");
    let result: serde_json::Value = serde_json::from_slice(&output.stdout).expect("JSON result");
    assert_eq!(result["schema_version"], 1);
    assert_eq!(result["results"][0]["provider"], "qwen");
    assert_eq!(result["results"][0]["outcome"], "already_present");
    assert_eq!(result["results"][0]["phase"], "preflight");
    assert_eq!(result["results"][0]["previous_credential_safe"], true);
    assert!(result["results"][0]["transaction_id"].is_null());
    let json = String::from_utf8_lossy(&output.stdout);
    for secret in [
        "candidate-secret",
        "candidate-refresh",
        "current-secret",
        "current-refresh",
    ] {
        assert!(!json.contains(secret), "JSON leaked {secret}: {json}");
        assert!(
            !String::from_utf8_lossy(&output.stderr).contains(secret),
            "stderr leaked {secret}: {output:?}"
        );
    }
}

#[test]
fn missing_resume_transaction_is_a_structured_failure() {
    let root = tempfile::tempdir().expect("root");
    let output = Command::new(env!("CARGO_BIN_EXE_link-assistant-router"))
        .args([
            "auth",
            "import",
            "--resume",
            "00000000000000000000000000000000",
            "--json",
            "--local",
        ])
        .env("TOKEN_SECRET", "auth-cli-test-secret")
        .env("HOME", root.path())
        .env("DATA_DIR", root.path().join("data"))
        .output()
        .expect("router CLI should run");

    assert!(!output.status.success(), "{output:?}");
    let result: serde_json::Value = serde_json::from_slice(&output.stdout).expect("JSON result");
    assert_eq!(result["results"][0]["provider"], serde_json::Value::Null);
    assert_eq!(result["results"][0]["outcome"], "not_attempted");
    assert_eq!(result["results"][0]["phase"], "preflight");
    assert_eq!(result["results"][0]["previous_credential_safe"], true);
    assert!(result["results"][0]["transaction_id"].is_null());
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
fn conditional_import_does_not_read_a_malformed_candidate_when_destination_exists() {
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

    assert!(output.status.success(), "{output:?}");
    assert_eq!(
        std::fs::read(destination.join("oauth_creds.json")).unwrap(),
        current
    );
    assert!(
        String::from_utf8_lossy(&output.stdout).contains("already present"),
        "{output:?}"
    );
}

include!("auth_cli_test/import_tests.rs");

#[path = "auth_cli_test/remote_import.rs"]
mod remote_import_tests;
