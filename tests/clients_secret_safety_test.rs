//! Secret-safe token input, isolated configuration roots, and redacted
//! diagnostics for `clients`, from issue #188.

mod common;

use base64::Engine as _;
use common::{catalog_server, router, router_with_env};
use std::fs;
use std::io::{Read as _, Write as _};
use std::net::TcpListener;
use std::process::{Command, Output};
use std::time::Duration;

fn foreign_token(id: &str, client: Option<&str>, principal: Option<&str>) -> String {
    let payload = serde_json::json!({
        "sub": id,
        "client_kind": client,
        "principal_id": principal,
    });
    format!(
        "la_sk_e30.{}.foreign-signature",
        base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(payload.to_string())
    )
}

fn bound_foreign_token(id: &str) -> String {
    foreign_token(id, Some("opencode"), Some("primary"))
}

/// Parse the JSON status `show` prints after the startup log lines.
fn parse_status(stdout: &[u8]) -> serde_json::Value {
    let text = String::from_utf8_lossy(stdout);
    let start = text.find('{').expect("show should print a JSON object");
    serde_json::from_str(&text[start..]).expect("show should print valid JSON")
}

/// Run the CLI with a token piped on standard input instead of argv.
fn router_with_stdin(
    home: &std::path::Path,
    args: &[&str],
    env: &[(&str, &str)],
    stdin: &str,
) -> Output {
    let mut command = Command::new(env!("CARGO_BIN_EXE_link-assistant-router"));
    command
        .args(args)
        .env("HOME", home)
        .env_remove("CODEX_HOME")
        .env_remove("CLAUDE_CONFIG_DIR")
        .env_remove("XDG_CONFIG_HOME")
        .env_remove("QWEN_HOME")
        .env_remove("CURSOR_CONFIG_DIR")
        .env_remove("LINK_ASSISTANT_ROUTER_TOKEN")
        .env_remove("LINK_ASSISTANT_TOKEN")
        .env("TOKEN_SECRET", "clients-cli-test-secret")
        .env("DATA_DIR", home.join("router-data"))
        .env("STORAGE_POLICY", "text")
        .stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped());
    for (key, value) in env {
        command.env(key, value);
    }
    let mut child = command.spawn().expect("router CLI should start");
    child
        .stdin
        .as_mut()
        .expect("piped stdin")
        .write_all(stdin.as_bytes())
        .expect("write stdin");
    child.wait_with_output().expect("router CLI should run")
}

#[test]
fn setup_accepts_an_existing_token_on_standard_input() {
    let home = tempfile::tempdir().expect("temp home");
    let (base_url, server) = catalog_server(&[("gpt-live", "openai")]);
    let token = bound_foreign_token("from-stdin");

    let setup = router_with_stdin(
        home.path(),
        &[
            "clients",
            "setup",
            "opencode",
            "--token-stdin",
            "--base-url",
            &base_url,
        ],
        &[],
        &format!("{token}\n"),
    );

    assert!(
        setup.status.success(),
        "{}",
        String::from_utf8_lossy(&setup.stderr)
    );
    assert!(!String::from_utf8_lossy(&setup.stdout).contains(&token));
    let environment = fs::read_to_string(
        home.path()
            .join(".config/link-assistant-router/clients/opencode.env"),
    )
    .expect("managed credential file");
    assert!(environment.contains(&format!("export LINK_ASSISTANT_TOKEN='{token}'")));
    let requests = server.join().expect("catalog server");
    assert!(requests[0].to_ascii_lowercase().contains(&format!(
        "authorization: bearer {}",
        token.to_ascii_lowercase()
    )));
}

#[test]
fn setup_accepts_an_existing_token_from_the_documented_environment_variable() {
    let home = tempfile::tempdir().expect("temp home");
    let (base_url, server) = catalog_server(&[("gpt-live", "openai")]);
    let token = bound_foreign_token("from-environment");

    let setup = router_with_env(
        home.path(),
        &["clients", "setup", "opencode", "--base-url", &base_url],
        &[("LINK_ASSISTANT_ROUTER_TOKEN", &token)],
    );

    assert!(
        setup.status.success(),
        "{}",
        String::from_utf8_lossy(&setup.stderr)
    );
    let environment = fs::read_to_string(
        home.path()
            .join(".config/link-assistant-router/clients/opencode.env"),
    )
    .expect("managed credential file");
    assert!(environment.contains(&format!("export LINK_ASSISTANT_TOKEN='{token}'")));
    let requests = server.join().expect("catalog server");
    assert!(requests[0].to_ascii_lowercase().contains(&format!(
        "authorization: bearer {}",
        token.to_ascii_lowercase()
    )));
}

#[test]
fn a_non_router_token_is_rejected_from_every_input_without_echoing_it() {
    let home = tempfile::tempdir().expect("temp home");

    let piped = router_with_stdin(
        home.path(),
        &["clients", "setup", "codex", "--token-stdin"],
        &[],
        "sk-not-a-router-token\n",
    );
    assert_eq!(piped.status.code(), Some(2));
    let from_environment = router_with_env(
        home.path(),
        &["clients", "setup", "codex"],
        &[("LINK_ASSISTANT_ROUTER_TOKEN", "sk-not-a-router-token")],
    );
    assert_eq!(from_environment.status.code(), Some(2));
    for output in [&piped, &from_environment] {
        let text = String::from_utf8_lossy(&output.stderr);
        assert!(text.contains("must begin with la_sk_"), "{text}");
        assert!(!text.contains("sk-not-a-router-token"), "{text}");
    }
}

#[test]
fn rejected_managed_bindings_leave_no_files_or_token_store() {
    for (name, token) in [
        ("generic", foreign_token("generic", None, None)),
        (
            "missing-principal",
            foreign_token("partial", Some("codex"), None),
        ),
        (
            "foreign-client",
            foreign_token("foreign", Some("claude"), Some("primary")),
        ),
        (
            "unknown-client",
            foreign_token("unknown", Some("future-client"), Some("primary")),
        ),
    ] {
        let home = tempfile::tempdir().expect("temp home");
        let output = router(
            home.path(),
            &["clients", "setup", "codex", "--token", &token],
        );
        assert!(!output.status.success(), "{name} binding was accepted");
        assert!(
            !home.path().join("router-data").exists(),
            "{name} rejection created the token store"
        );
        assert!(
            !home.path().join(".config").exists(),
            "{name} rejection created managed-client files: {:?}",
            fs::read_dir(home.path().join(".config"))
                .into_iter()
                .flatten()
                .filter_map(Result::ok)
                .map(|entry| entry.path())
                .collect::<Vec<_>>()
        );
    }
}

#[test]
fn an_unprovable_foreign_binding_writes_nothing() {
    let home = tempfile::tempdir().expect("temp home");
    let listener = TcpListener::bind("127.0.0.1:0").expect("reserve port");
    let base_url = format!("http://{}", listener.local_addr().unwrap());
    drop(listener);
    let token = foreign_token("unprovable", Some("codex"), Some("external-principal"));
    let output = router(
        home.path(),
        &[
            "clients",
            "setup",
            "codex",
            "--token",
            &token,
            "--base-url",
            &base_url,
        ],
    );
    assert!(!output.status.success(), "unreachable issuer was trusted");
    assert!(!home.path().join("router-data").exists());
    assert!(!home.path().join(".config").exists());
}

#[test]
fn an_isolated_home_keeps_the_whole_lifecycle_out_of_the_real_configuration() {
    let real_home = tempfile::tempdir().expect("temp real home");
    let isolated = tempfile::tempdir().expect("temp isolated home");
    let isolated_path = isolated.path().to_string_lossy().into_owned();
    let (base_url, server) = catalog_server(&[("gpt-live", "openai")]);
    let token = bound_foreign_token("isolated");

    let setup = router_with_stdin(
        real_home.path(),
        &[
            "clients",
            "--home",
            &isolated_path,
            "setup",
            "opencode",
            "--token-stdin",
            "--base-url",
            &base_url,
        ],
        &[],
        &format!("{token}\n"),
    );
    assert!(
        setup.status.success(),
        "{}",
        String::from_utf8_lossy(&setup.stderr)
    );
    server.join().expect("catalog server");

    assert!(
        isolated
            .path()
            .join(".config/opencode/opencode.json")
            .exists(),
        "setup should write below the isolated root"
    );
    assert!(
        !real_home
            .path()
            .join(".config/opencode/opencode.json")
            .exists(),
        "setup must not touch the real home"
    );

    let shown = router_with_env(
        real_home.path(),
        &["clients", "--home", &isolated_path, "show", "opencode"],
        &[],
    );
    assert!(shown.status.success());
    let status = parse_status(&shown.stdout);
    assert_eq!(status["configured"], serde_json::Value::Bool(true));
    assert_eq!(status["token_env_set"], serde_json::Value::Bool(true));

    let removed = router_with_env(
        real_home.path(),
        &["clients", "--home", &isolated_path, "remove", "opencode"],
        &[],
    );
    assert!(removed.status.success());
    assert!(
        !isolated
            .path()
            .join(".config/link-assistant-router/clients/opencode.env")
            .exists(),
        "remove should delete the isolated credential file"
    );
}

#[test]
fn an_isolated_home_ignores_a_token_variable_exported_in_the_calling_shell() {
    let real_home = tempfile::tempdir().expect("temp real home");
    let isolated = tempfile::tempdir().expect("temp isolated home");
    let isolated_path = isolated.path().to_string_lossy().into_owned();

    let shown = router_with_env(
        real_home.path(),
        &["clients", "--home", &isolated_path, "show", "opencode"],
        &[("LINK_ASSISTANT_TOKEN", "la_sk_ambient")],
    );

    assert!(shown.status.success());
    let status = parse_status(&shown.stdout);
    assert_eq!(
        status["token_env_set"],
        serde_json::Value::Bool(false),
        "an ambient variable is not evidence that the isolated root is configured"
    );
}

#[test]
fn a_router_error_body_that_echoes_the_token_is_redacted_from_diagnostics() {
    let home = tempfile::tempdir().expect("temp home");
    let token = bound_foreign_token("leaky");
    let (base_url, server) = echoing_error_router(&token);

    let setup = router(
        home.path(),
        &[
            "clients",
            "setup",
            "opencode",
            "--token",
            &token,
            "--base-url",
            &base_url,
        ],
    );

    assert!(!setup.status.success());
    let diagnostic = String::from_utf8_lossy(&setup.stderr);
    assert!(
        !diagnostic.contains(&token),
        "the token must not survive in a diagnostic: {diagnostic}"
    );
    assert!(diagnostic.contains("la_sk_[redacted]"), "{diagnostic}");
    server.join().expect("error server");
}

/// A router that quotes the presented bearer token back in an error body.
fn echoing_error_router(token: &str) -> (String, std::thread::JoinHandle<()>) {
    let listener = TcpListener::bind("127.0.0.1:0").expect("bind error router");
    let port = listener.local_addr().expect("listener address").port();
    let body = serde_json::json!({
        "error": {"message": format!("token {token} is not authorized")}
    })
    .to_string();
    let server = std::thread::spawn(move || {
        let (mut stream, _) = listener.accept().expect("accept error request");
        stream
            .set_read_timeout(Some(Duration::from_secs(5)))
            .expect("set timeout");
        let mut buffer = [0_u8; 4096];
        let _ = stream.read(&mut buffer);
        let response = format!(
            "HTTP/1.1 401 Unauthorized\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
            body.len()
        );
        stream
            .write_all(response.as_bytes())
            .expect("write error response");
    });
    (format!("http://127.0.0.1:{port}"), server)
}
