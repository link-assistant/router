use super::*;

#[tokio::test]
async fn token_count_is_native_or_fails_closed_without_inference() {
    let native = TestRouter::start(UpstreamProvider::Anthropic).await;
    let body = json!({"model":"claude-test","messages":[{"role":"user","content":"🦀"}]});
    let response = native
        .post("/api/services/anthropic/v1/messages/count_tokens", &body)
        .send()
        .await
        .expect("native count");
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(response.json::<Value>().await.unwrap()["input_tokens"], 37);
    assert_eq!(
        native.requests.lock().unwrap().as_slice(),
        std::slice::from_ref(&body)
    );

    let bridged = TestRouter::start(UpstreamProvider::Codex).await;
    let response = bridged
        .post("/api/services/anthropic/v1/messages/count_tokens", &body)
        .send()
        .await
        .expect("bridged count");
    assert_eq!(response.status(), StatusCode::SERVICE_UNAVAILABLE);
    let error = response.json::<Value>().await.unwrap();
    assert_eq!(error["type"], "error");
    assert!(
        error["error"]["message"]
            .as_str()
            .unwrap()
            .contains("unavailable")
    );
    assert!(bridged.requests.lock().unwrap().is_empty());
}

#[tokio::test]
async fn translated_future_private_and_policy_contracts_fail_before_inference() {
    let codex = TestRouter::start(UpstreamProvider::Codex).await;
    for stream in [false, true] {
        for extra in [
            json!({"context_management":{"edits":[{"type":"clear_tool_uses_20250919"}]}}),
            json!({"container":{"id":"container_1"}}),
            json!({"mcp_servers":[{"url":"https://mcp.example.test","authorization_token":"secret"}]}),
            json!({"service_tier":"auto"}),
            json!({"future_provider_contract":true}),
        ] {
            let mut body = json!({
                "model":"claude-test", "max_tokens":16, "stream":stream,
                "messages":[{"role":"user","content":"answer"}]
            });
            body.as_object_mut()
                .unwrap()
                .extend(extra.as_object().unwrap().clone());
            let response = codex
                .post("/api/services/anthropic/v1/messages", &body)
                .send()
                .await
                .expect("rejected Anthropic bridge");
            assert_eq!(response.status(), StatusCode::BAD_REQUEST);
        }
    }
    assert!(codex.requests.lock().unwrap().is_empty());

    let claude = TestRouter::start(UpstreamProvider::Anthropic).await;
    for stream in [false, true] {
        for extra in [
            json!({"messages":[{"role":"user","name":"alice","content":"answer"}]}),
            json!({"moderation":{"model":"synthetic","policy":"strict"}}),
            json!({"prompt_cache_key":"opaque"}),
            json!({"prediction":{"type":"content","content":"expected"}}),
            json!({"future_contract":true}),
        ] {
            let mut body = json!({"model":"claude-test","messages":[{"role":"user","content":"answer"}],"stream":stream});
            body.as_object_mut()
                .unwrap()
                .extend(extra.as_object().unwrap().clone());
            let response = claude
                .post("/api/services/openai/v1/chat/completions", &body)
                .send()
                .await
                .expect("rejected OpenAI bridge");
            assert_eq!(response.status(), StatusCode::BAD_REQUEST);
            assert_eq!(
                response.json::<Value>().await.unwrap()["error"]["type"],
                "invalid_request_error"
            );
        }
    }
    for stream in [false, true] {
        for extra in [
            json!({"prompt":{"id":"pmpt_test","version":"7","variables":{"topic":"routing"}}}),
            json!({"include":["message.output_text.logprobs"]}),
        ] {
            let mut body = json!({"model":"claude-test","input":"answer","stream":stream});
            body.as_object_mut()
                .unwrap()
                .extend(extra.as_object().unwrap().clone());
            let response = claude
                .post("/api/services/openai/v1/responses", &body)
                .send()
                .await
                .expect("rejected Responses bridge");
            assert_eq!(response.status(), StatusCode::BAD_REQUEST);
            assert_eq!(
                response.json::<Value>().await.unwrap()["error"]["type"],
                "invalid_request_error"
            );
        }
    }
    assert!(claude.requests.lock().unwrap().is_empty());
}

#[tokio::test]
async fn native_openai_and_chat_to_responses_keep_common_contracts() {
    let native = TestRouter::start(UpstreamProvider::OpenAICompatible).await;
    let body = json!({
        "model":"gpt-5", "messages":[{"role":"user","content":"answer"}],
        "service_tier":"priority", "prompt_cache_key":"opaque",
        "prompt_cache_options":{"mode":"explicit"}, "prompt_cache_retention":"24h",
        "moderation":{"model":"synthetic","policy":"strict"}
    });
    assert_eq!(
        native
            .post("/api/services/openai/v1/chat/completions", &body)
            .send()
            .await
            .unwrap()
            .status(),
        StatusCode::OK
    );
    assert_eq!(
        native.requests.lock().unwrap().as_slice(),
        std::slice::from_ref(&body)
    );

    let codex = TestRouter::start(UpstreamProvider::Codex).await;
    assert_eq!(
        codex
            .post("/api/services/openai/v1/chat/completions", &body)
            .send()
            .await
            .unwrap()
            .status(),
        StatusCode::OK
    );
    let translated = codex
        .requests
        .lock()
        .unwrap()
        .first()
        .cloned()
        .expect("translated request");
    for field in [
        "service_tier",
        "prompt_cache_key",
        "prompt_cache_options",
        "prompt_cache_retention",
        "moderation",
    ] {
        assert_eq!(translated[field], body[field], "{field}");
    }
}
