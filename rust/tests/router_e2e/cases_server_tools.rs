use super::*;

/// A capped server-tool search without a forced choice keeps working, so the
/// guard against unsupported forced tools narrows nothing that already worked.
#[tokio::test]
async fn an_uncoerced_server_tool_search_still_reaches_codex() {
    let router = TestRouter::start(UpstreamProvider::Codex).await;
    let response = router
        .post(
            "/api/services/anthropic/v1/messages",
            &json!({
                "model":"gpt-5",
                "max_tokens":256,
                "messages":[{"role":"user","content":"research Rust"}],
                "tools":[{"type":"web_search_20250305","name":"web_search","max_uses":1}],
                "tool_choice":{"type":"auto"}
            }),
        )
        .send()
        .await
        .expect("server-tool response");
    assert_eq!(response.status(), StatusCode::OK);
}
