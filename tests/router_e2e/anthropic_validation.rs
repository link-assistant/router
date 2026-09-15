use super::*;

/// The Anthropic Messages contract is owned by the public surface, before a
/// native adapter, subscription bridge, or catalog lookup is selected.
#[tokio::test]
async fn missing_required_messages_fields_are_rejected_before_every_upstream() {
    for (provider, model) in [
        (UpstreamProvider::Anthropic, "claude-sonnet-4-5"),
        (UpstreamProvider::Codex, "gpt-5"),
    ] {
        let router = TestRouter::start(provider).await;
        let complete = json!({
            "model": model,
            "max_tokens": 8,
            "messages": [{"role": "user", "content": "ping"}]
        });

        for field in ["model", "max_tokens", "messages"] {
            let mut body = complete.clone();
            body.as_object_mut().expect("request object").remove(field);
            let response = router
                .post("/api/services/anthropic/v1/messages", &body)
                .send()
                .await
                .expect("invalid Anthropic Messages response");

            assert_eq!(
                response.status(),
                StatusCode::BAD_REQUEST,
                "{provider:?}: {field}"
            );
            assert_eq!(
                response
                    .headers()
                    .get("content-type")
                    .and_then(|value| value.to_str().ok()),
                Some("application/json"),
                "{provider:?}: {field}"
            );
            let payload: Value = response.json().await.expect("Anthropic error envelope");
            assert_eq!(payload["type"], "error", "{provider:?}: {field}: {payload}");
            assert_eq!(
                payload["error"]["type"], "invalid_request_error",
                "{provider:?}: {field}: {payload}"
            );
            assert!(
                payload["error"]["message"]
                    .as_str()
                    .is_some_and(|message| message.contains(field)),
                "{provider:?}: {field}: {payload}"
            );
        }

        assert!(
            router
                .upstream_headers
                .lock()
                .expect("stub headers")
                .is_empty(),
            "{provider:?} contacted the upstream for an invalid request"
        );
    }
}
