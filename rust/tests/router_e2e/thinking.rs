use super::*;

#[tokio::test]
async fn thinking_suffix_routes_base_and_keeps_explicit_body_precedence() {
    for provider in [
        UpstreamProvider::Anthropic,
        UpstreamProvider::Codex,
        UpstreamProvider::OpenAICompatible,
    ] {
        let server = TestRouter::start(provider).await;
        let model = if provider == UpstreamProvider::Anthropic {
            "claude-sonnet-4-5"
        } else {
            "gpt-5"
        };
        let response = server
            .post(
                "/api/services/openai/v1/chat/completions",
                &json!({
                    "model":format!("{model}(8192)"), "messages":[{"role":"user","content":"hi"}]
                }),
            )
            .send()
            .await
            .unwrap();
        assert_eq!(
            response.status(),
            StatusCode::OK,
            "{}",
            response.text().await.unwrap()
        );
        let request = server.requests.lock().unwrap()[0].clone();
        assert_eq!(request["model"], model);
        if provider == UpstreamProvider::Anthropic {
            assert_eq!(request["thinking"]["budget_tokens"], 8192);
        } else if provider == UpstreamProvider::Codex {
            assert_eq!(request["reasoning"]["effort"], "medium");
        } else {
            assert_eq!(request["reasoning_effort"], "medium");
        }
        let response = server.post("/api/services/openai/v1/chat/completions", &json!({
            "model":format!("{model}(high)"), "reasoning_effort":"low", "messages":[{"role":"user","content":"hi"}]
        })).send().await.unwrap();
        assert_eq!(
            response.status(),
            StatusCode::OK,
            "{}",
            response.text().await.unwrap()
        );
        let request = server.requests.lock().unwrap()[1].clone();
        assert_eq!(request["model"], model);
        if provider == UpstreamProvider::Anthropic {
            assert_eq!(request["thinking"]["budget_tokens"], 4096);
        } else if provider == UpstreamProvider::Codex {
            assert_eq!(request["reasoning"]["effort"], "low");
        } else {
            assert_eq!(request["reasoning_effort"], "low");
        }
    }
}

#[tokio::test]
async fn native_anthropic_suffix_keeps_signed_history() {
    let server = TestRouter::start(UpstreamProvider::Anthropic).await;
    let response = server.post("/api/services/anthropic/v1/messages", &json!({
        "model":"claude-test(8192)","max_tokens":16000,
        "messages":[{"role":"assistant","content":[{"type":"thinking","thinking":"private","signature":"original-signature"}]},
            {"role":"user","content":"hi"}]
    })).send().await.unwrap();
    assert_eq!(
        response.status(),
        StatusCode::OK,
        "{}",
        response.text().await.unwrap()
    );
    let request = server.requests.lock().unwrap()[0].clone();
    assert_eq!(request["model"], "claude-test");
    assert_eq!(request["thinking"]["budget_tokens"], 8192);
    assert_eq!(
        request["messages"][0]["content"][0]["signature"],
        "original-signature"
    );
}
