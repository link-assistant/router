//! Tests for [`crate::request_log`].
//!
//! Split from `request_log.rs` to keep that file within the repository's
//! 1000-line limit.

use super::*;
use proptest::prelude::*;

#[test]
fn long_credentials_are_partially_redacted_and_short_ones_are_fully_masked() {
    let long = "la_sk_abcdefghijklmnop_last";
    let mut headers = HeaderMap::new();
    headers.insert(
        "authorization",
        HeaderValue::from_str(&format!("Bearer {long}")).expect("header value"),
    );
    headers.insert("x-api-key", HeaderValue::from_static("tiny"));

    let redacted = redacted_headers(&headers);
    let authorization = &redacted["authorization"];
    assert!(authorization.starts_with("Bearer la_"), "{authorization}");
    assert!(authorization.ends_with("ast"), "{authorization}");
    assert_eq!(authorization.matches('*').count(), long.len() - 6);
    assert!(!authorization.contains(long));
    assert_eq!(redacted["x-api-key"], REDACTED);
}

proptest! {
    #[test]
    fn complete_credentials_never_survive_any_redaction_site(
        payload in "[A-Za-z0-9_-]{12,96}"
    ) {
        let secret = format!("la_sk_{payload}");
        let mut headers = HeaderMap::new();
        headers.insert(
            "authorization",
            HeaderValue::from_str(&format!("Bearer {secret}")).expect("header value"),
        );
        let header_log = serde_json::to_string(&redacted_headers(&headers))
            .expect("serialize headers");
        let body_log = redacted_body(
            serde_json::to_string(&json!({
                "access_token": secret,
                "unlisted": secret,
            }))
            .expect("serialize body")
            .as_bytes(),
        )
        .to_string();
        let uri_log = redacted_uri(&format!("/v1/models?access_token={secret}"));

        prop_assert!(!header_log.contains(&secret));
        prop_assert!(!body_log.contains(&secret));
        prop_assert!(!uri_log.contains(&secret));
    }
}

#[test]
fn credentials_are_redacted_from_headers_and_json_bodies() {
    let mut headers = HeaderMap::new();
    headers.insert("authorization", HeaderValue::from_static("Bearer secret"));
    headers.insert("x-api-key", HeaderValue::from_static("secret-key"));
    headers.insert("x-auth-token", HeaderValue::from_static("auth-secret"));
    headers.insert("x-goog-api-key", HeaderValue::from_static("google-secret"));
    headers.insert(
        "x-amz-security-token",
        HeaderValue::from_static("aws-secret"),
    );
    headers.insert("x-visible", HeaderValue::from_static("marker"));
    let redacted = redacted_headers(&headers);
    assert_eq!(redacted["authorization"], "Bearer [REDACTED]");
    assert_eq!(redacted["x-api-key"], REDACTED);
    assert_eq!(redacted["x-auth-token"], REDACTED);
    assert_eq!(redacted["x-goog-api-key"], "goo*******ret");
    assert_eq!(redacted["x-amz-security-token"], REDACTED);
    assert_eq!(redacted["x-visible"], "marker");

    let body = redacted_body(
        br#"{
            "access_token":"access-secret",
            "apiKey":"camel-secret",
            "client_secret":"client-secret",
            "password":"password-secret",
            "secret":"ordinary-secret",
            "nested":{"api_key":"key-secret"},
            "unknownPrefix":"sk-ant-oat01-shaped-secret",
            "unknownBearer":"Bearer arbitrary-secret",
            "unknownJwt":"eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature"
        }"#,
    );
    let rendered = body.to_string();
    assert!(!rendered.contains("-secret"));
    assert!(!rendered.contains("eyJhbGci"));
    assert!(rendered.contains(REDACTED));
}

#[test]
fn credentials_are_redacted_from_uri_queries() {
    let dir = tempfile::tempdir().expect("temporary directory");
    let root = dir.path().join("requests");
    let log = RequestLog::new(root.clone(), 1024 * 1024);
    log.record(
        "request",
        "client_request",
        json!({
            "uri": "/v1/models?api_key=api-secret&key=key-secret&access_token=access-secret&token=token-secret&authorization=bearer-secret&probe=visible"
        }),
    );

    let rendered =
        fs::read_to_string(root.join("unauthenticated/requests.jsonl")).expect("request log");
    for secret in [
        "api-secret",
        "key-secret",
        "access-secret",
        "token-secret",
        "bearer-secret",
    ] {
        assert!(!rendered.contains(secret));
    }
    assert!(rendered.contains("probe=visible"));
    assert!(rendered.contains(REDACTED));
}

#[cfg(unix)]
#[test]
fn request_log_is_created_owner_only() {
    use std::os::unix::fs::PermissionsExt as _;

    let dir = tempfile::tempdir().expect("temporary directory");
    let root = dir.path().join("requests");
    let path = root.join("unauthenticated/requests.jsonl");
    let log = RequestLog::new(root.clone(), 1024 * 1024);
    log.record("request", "test", json!({"visible": true}));

    let mode = fs::metadata(&path)
        .expect("request log")
        .permissions()
        .mode()
        & 0o777;
    assert_eq!(mode, 0o600);
    for directory in [&root, path.parent().expect("bucket directory")] {
        let mode = fs::metadata(directory)
            .expect("request log directory")
            .permissions()
            .mode()
            & 0o777;
        assert_eq!(mode, 0o700);
    }

    fs::set_permissions(&path, fs::Permissions::from_mode(0o644))
        .expect("make existing log permissive");
    log.record("request", "test", json!({"visible": true}));
    let repaired_mode = fs::metadata(path)
        .expect("request log")
        .permissions()
        .mode()
        & 0o777;
    assert_eq!(repaired_mode, 0o600);
}

#[test]
fn log_never_exceeds_limit_and_keeps_newest_complete_record() {
    let dir = tempfile::tempdir().expect("temporary directory");
    let root = dir.path().join("requests");
    let path = root.join("unauthenticated/requests.jsonl");
    let log = RequestLog::new(root, 600);
    for sequence in 0..30 {
        log.record("request", "test", json!({"sequence": sequence}));
    }
    let bytes = fs::read(&path).expect("request log");
    assert!(bytes.len() <= 600);
    let text = String::from_utf8(bytes).expect("UTF-8 JSONL");
    assert!(
        text.lines()
            .all(|line| serde_json::from_str::<Value>(line).is_ok())
    );
    assert!(text.contains("\"sequence\":29"));
    assert!(!text.contains("\"sequence\":0,"));

    let tiny_root = dir.path().join("tiny");
    let tiny_path = tiny_root.join("unauthenticated/requests.jsonl");
    let tiny = RequestLog::new(tiny_root, 32);
    tiny.record("request", "oversized", json!({"body": "far too large"}));
    assert!(fs::metadata(tiny_path).expect("tiny log").len() <= 32);
}

#[tokio::test]
async fn transformed_upstream_exchange_is_logged_with_same_id() {
    use tokio::io::{AsyncReadExt as _, AsyncWriteExt as _};

    let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
        .await
        .expect("mock upstream");
    let address = listener.local_addr().expect("mock address");
    let server = tokio::spawn(async move {
        let (mut stream, _) = listener.accept().await.expect("accept request");
        let mut request = vec![0; 4096];
        let _ = stream.read(&mut request).await.expect("read request");
        stream
            .write_all(
                b"HTTP/1.1 200 OK\r\ncontent-type: application/json\r\ncontent-length: 27\r\n\r\n{\"reply\":\"upstream-marker\"}",
            )
            .await
            .expect("write response");
    });

    let dir = tempfile::tempdir().expect("temporary directory");
    let root = dir.path().join("requests");
    let path = root.join("unauthenticated/requests.jsonl");
    let log = RequestLog::new(root, 1024 * 1024);
    let client = reqwest::Client::new();
    let request = client
        .post(format!("http://{address}/translated"))
        .header("authorization", "Bearer upstream-secret")
        .header("x-transformed", "translated-header")
        .body(r#"{"translated":"body-marker","access_token":"body-secret"}"#);
    let response = log
        .send_upstream("same-correlation-id", &client, request)
        .await
        .expect("upstream response");
    let body = response.bytes().await.expect("response body");
    log.record_upstream_body("same-correlation-id", &body);
    server.await.expect("mock server task");

    let rendered = fs::read_to_string(path).expect("request log");
    assert!(rendered.contains("same-correlation-id"));
    assert!(rendered.contains("upstream_request"));
    assert!(rendered.contains("translated-header"));
    assert!(rendered.contains("body-marker"));
    assert!(rendered.contains("upstream_response_body"));
    assert!(rendered.contains("upstream-marker"));
    assert!(!rendered.contains("upstream-secret"));
    assert!(!rendered.contains("body-secret"));
}
