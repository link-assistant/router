//! Command-level OAuth refresh redaction contract (issue #430).

use std::io::{Read as _, Write as _};
use std::process::{Command, Output};

const SENTINEL: &str = "oauth-cli-response-secret@example.invalid";

fn run(command: &[&str], home: &std::path::Path, token_url: &str) -> Output {
    Command::new(env!("CARGO_BIN_EXE_link-assistant-router"))
        .args(command)
        .env("HOME", home)
        .env("XDG_CONFIG_HOME", home.join("config"))
        .env("DATA_DIR", home.join("router-data"))
        .env("TOKEN_SECRET", "refresh-redaction-test-secret")
        .env("UPSTREAM_PROVIDER", "qwen")
        .env("RUST_LOG", "trace")
        .env("LINK_ASSISTANT_ROUTER_TEST_TOKEN_URL", token_url)
        .output()
        .expect("run Router command")
}

fn assert_safe(output: &Output, command: &str) {
    let combined = format!(
        "{}\n{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );
    assert!(
        !output.status.success(),
        "{command} unexpectedly passed: {combined}"
    );
    assert!(
        !combined.contains(SENTINEL),
        "{command} leaked sentinel: {combined}"
    );
    assert!(
        !combined.contains("access_token"),
        "{command} leaked raw JSON: {combined}"
    );
    assert!(
        !combined.contains("x-provider-private"),
        "{command} leaked a response header: {combined}"
    );
    assert!(combined.contains("HTTP 429"), "{command}: {combined}");
    assert!(combined.contains("rate_limited"), "{command}: {combined}");
    assert!(
        combined.contains("retry after 17s"),
        "{command}: {combined}"
    );
    assert!(
        combined.contains("retried automatically"),
        "{command}: {combined}"
    );
}

#[test]
fn doctor_and_auth_status_never_expose_refresh_response_material() {
    let listener = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
    let token_url = format!("http://{}/token", listener.local_addr().unwrap());
    let server = std::thread::spawn(move || {
        for _ in 0..2 {
            let (mut socket, _) = listener.accept().unwrap();
            let mut request = [0_u8; 8192];
            let _ = socket.read(&mut request).unwrap();
            let body =
                format!(r#"{{"error":{{"token":"{SENTINEL}"}},"access_token":"{SENTINEL}"}}"#);
            write!(
                socket,
                "HTTP/1.1 429 Too Many Requests\r\ncontent-type: application/json\r\nretry-after: 17\r\nx-provider-private: {SENTINEL}\r\ncontent-length: {}\r\nconnection: close\r\n\r\n{body}",
                body.len()
            )
            .unwrap();
        }
    });

    let home = tempfile::tempdir().unwrap();
    let qwen = home.path().join(".qwen");
    std::fs::create_dir_all(&qwen).unwrap();
    std::fs::write(
        qwen.join("oauth_creds.json"),
        r#"{"access_token":"expired-access","refresh_token":"refresh-link","expiry_date":1}"#,
    )
    .unwrap();

    assert_safe(
        &run(&["auth", "status", "--local"], home.path(), &token_url),
        "auth status",
    );
    assert_safe(
        &run(&["doctor", "--local"], home.path(), &token_url),
        "doctor",
    );
    server.join().unwrap();
}
