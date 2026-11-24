use super::*;

/// Chat Completions owns its request contract before any provider is selected.
///
/// A missing `messages` field used to reach Codex as an empty Responses
/// `input`, while passthrough providers received the invalid body verbatim and
/// automatic routing could fail on the model first. Besides leaking the wrong
/// dialect, that made the same public request depend on the chosen upstream
/// (issue #387).
#[tokio::test]
async fn missing_chat_messages_is_rejected_locally_for_every_provider() {
    for provider in [
        UpstreamProvider::Auto,
        UpstreamProvider::Anthropic,
        UpstreamProvider::Gonka,
        UpstreamProvider::Crater,
        UpstreamProvider::Codex,
        UpstreamProvider::Gemini,
        UpstreamProvider::Qwen,
        UpstreamProvider::OpenAICompatible,
    ] {
        let router = TestRouter::start(provider).await;
        let response = router
            .post(
                "/api/services/openai/v1/chat/completions",
                &json!({"model":"gpt-5"}),
            )
            .send()
            .await
            .expect("invalid Chat Completions response");

        assert_eq!(response.status(), StatusCode::BAD_REQUEST, "{provider:?}");
        assert_eq!(
            response
                .headers()
                .get("content-type")
                .and_then(|value| value.to_str().ok()),
            Some("application/json"),
            "{provider:?}"
        );
        let payload: Value = response.json().await.expect("OpenAI error envelope");
        assert_eq!(
            payload["error"]["type"], "invalid_request_error",
            "{provider:?}: {payload}"
        );
        let message = payload["error"]["message"].as_str().expect("error message");
        assert!(message.contains("messages"), "{provider:?}: {message}");
        for leaked in ["input", "previous_response_id", "prompt", "conversation"] {
            assert!(
                !message.contains(leaked),
                "{provider:?} leaked {leaked}: {message}"
            );
        }
        assert!(
            router.requests.lock().expect("stub requests").is_empty(),
            "{provider:?} forwarded a client-schema error"
        );
    }
}
