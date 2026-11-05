// Independent Codex bridge native transport oracles. UNRUN; gated Rust CI only.
use link_assistant_router::codex_loopback_bridge;
#[test]
fn bridge_origin_policy_retains_native_loopback_and_remote_distinctions() {
    for origin in ["http://localhost", "https://localhost:443", "http://127.0.0.1:8080", "http://127.12.34.56:8080", "http://[::1]:8080"] {
        assert!(!codex_loopback_bridge::required(origin).expect("loopback policy"));
    }
    for origin in ["https://router.invalid", "http://192.0.2.1:8080", "http://[2001:db8::1]:8080", "http://[::ffff:127.0.0.1]:8080"] {
        assert!(codex_loopback_bridge::required(origin).expect("remote policy"));
    }
}
#[tokio::test]
async fn bridge_http_retains_client_auth_query_body_and_safe_response_headers() {
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.expect("upstream listener");
    let origin = format!("http://{}", listener.local_addr().expect("upstream address"));
    let app = axum::Router::new().fallback(|request: axum::extract::Request| async move {
        assert_eq!(request.uri().path(), "/api/services/codex/backend-api/responses");
        assert_eq!(request.uri().query(), Some("mode=exact"));
        assert_eq!(request.headers().get("authorization").expect("caller auth"), "Bearer client-token");
        let body = axum::body::to_bytes(request.into_body(), 1024).await.expect("bounded body");
        assert_eq!(&body[..], b"payload");
        (axum::http::StatusCode::CREATED, [("set-cookie", "upstream-secret"), ("x-request-id", "request-a")], "reply")
    });
    let task = tokio::spawn(async move { axum::serve(listener, app).await.expect("upstream server"); });
    let bridge = codex_loopback_bridge::start_ephemeral(&origin).await.expect("loopback bridge");
    let response = reqwest::Client::new().post(format!("{}/responses?mode=exact", bridge.backend_base_url())).bearer_auth("client-token").body("payload").send().await.expect("bridge request");
    assert_eq!(response.status(), reqwest::StatusCode::CREATED);
    assert!(response.headers().get("set-cookie").is_none());
    assert_eq!(response.headers().get("x-request-id").expect("safe header"), "request-a");
    assert_eq!(response.text().await.expect("reply"), "reply");
    drop(bridge);
    task.abort();
}
