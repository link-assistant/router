use super::*;

/// Issue #187 (comment): an Anthropic `web_search_20250305` request with
/// `tool_choice: {"type":"any"}` against a Codex model returned nothing for
/// more than eighty seconds. `any` demands a function call, but the only tool
/// offered is executed by the backend and never surfaces as one, so the
/// upstream had no way to comply. Every input protocol must answer such a
/// request promptly instead of stalling, and must not reach the vendor.
#[tokio::test]
async fn a_forced_call_on_server_tools_only_fails_fast_on_every_surface() {
    let router = TestRouter::start(UpstreamProvider::Codex).await;
    let cases = [
        (
            "/api/services/anthropic/v1/messages",
            json!({
                "model":"gpt-5",
                "max_tokens":256,
                "messages":[{"role":"user","content":"research Rust"}],
                "tools":[{"type":"web_search_20250305","name":"web_search","max_uses":1}],
                "tool_choice":{"type":"any"}
            }),
        ),
        (
            "/api/services/openai/v1/chat/completions",
            json!({
                "model":"gpt-5",
                "messages":[{"role":"user","content":"research Rust"}],
                "tools":[{"type":"web_search"}],
                "tool_choice":"required"
            }),
        ),
        (
            "/api/services/openai/v1/responses",
            json!({
                "model":"gpt-5",
                "input":"research Rust",
                "tools":[{"type":"web_search"}],
                "tool_choice":"required"
            }),
        ),
    ];

    for (path, body) in cases {
        let started = std::time::Instant::now();
        let response = tokio::time::timeout(
            std::time::Duration::from_secs(10),
            router.post(path, &body).send(),
        )
        .await
        .unwrap_or_else(|_| panic!("{path} never answered"))
        .expect("server-tool response");
        assert_eq!(response.status(), StatusCode::BAD_REQUEST, "{path}");
        assert!(started.elapsed() < std::time::Duration::from_secs(10));
        let payload: Value = response.json().await.expect("error JSON");
        let message = payload
            .pointer("/error/message")
            .and_then(Value::as_str)
            .expect("error message");
        assert!(message.contains("server-side tools"), "{path}: {message}");
    }
    assert!(router.requests.lock().expect("stub requests").is_empty());
}
