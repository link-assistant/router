use super::*;

#[tokio::test]
async fn codex_rejects_optional_openai_output_limits() {
    let responses = serde_json::json!({
        "model": "gpt-5.6-sol",
        "input": "hi",
        "max_output_tokens": 16,
    });
    let chat = crate::responses::chat_completion_to_responses(&serde_json::json!({
        "model": "gpt-5.6-sol",
        "messages": [{"role": "user", "content": "hi"}],
        "max_tokens": 16,
    }));
    let chat_completion = crate::responses::chat_completion_to_responses(&serde_json::json!({
        "model": "gpt-5.6-sol",
        "messages": [{"role": "user", "content": "hi"}],
        "max_completion_tokens": 16,
    }));
    let response = reject_unsupported_codex_output_limit(
        SubscriptionProvider::Codex,
        Surface::OpenAIResponses,
        &responses,
    )
    .expect("Codex must reject a native Responses limit it cannot honor");
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    let error = axum::body::to_bytes(response.into_body(), 4096)
        .await
        .expect("read error body");
    let error: serde_json::Value = serde_json::from_slice(&error).expect("valid JSON error");
    assert_eq!(error["error"]["type"], "invalid_request_error");
    assert!(error["error"]["message"].as_str().is_some_and(|message| {
        message.contains("rejected this request instead of silently ignoring")
    }));

    for body in [&chat, &chat_completion] {
        assert!(
            reject_unsupported_codex_output_limit(
                SubscriptionProvider::Codex,
                Surface::OpenAIChat,
                body,
            )
            .is_some(),
            "Chat limits must be rejected rather than silently dropped"
        );
    }
}

#[test]
fn output_limit_gate_leaves_uncapped_codex_and_other_providers_unchanged() {
    let capped = serde_json::json!({"max_output_tokens": 16});
    let uncapped = serde_json::json!({"model": "gpt-5.6-sol", "input": "hi"});

    assert!(
        reject_unsupported_codex_output_limit(
            SubscriptionProvider::Codex,
            Surface::OpenAIResponses,
            &uncapped,
        )
        .is_none()
    );
    assert!(
        reject_unsupported_codex_output_limit(
            SubscriptionProvider::Qwen,
            Surface::OpenAIResponses,
            &capped,
        )
        .is_none()
    );
    assert!(
        reject_unsupported_codex_output_limit(
            SubscriptionProvider::Codex,
            Surface::Anthropic,
            &capped,
        )
        .is_none()
    );
}

#[test]
fn codex_normalizes_responses_body_for_chatgpt_backend() {
    // OpenClaw-style Responses body: omits `instructions`, sends
    // `max_output_tokens`. Both trip the Codex backend without shaping.
    let mut body = serde_json::json!({
        "model": "gpt-5.5",
        "input": [{"role": "user", "content": [{"type": "input_text", "text": "hi"}]}],
        "store": true,
        "temperature": 0.7,
        "max_output_tokens": 8192,
        "reasoning": {"effort": "none"}
    });
    normalize_subscription_request(SubscriptionProvider::Codex, &mut body);
    assert_eq!(body["stream"], serde_json::Value::Bool(true));
    assert!(
        body.get("max_output_tokens").is_none(),
        "max_output_tokens must be stripped for Codex"
    );
    assert_eq!(body["instructions"], "You are a helpful assistant.");
    // ChatGPT subscription inference requires stateless requests.
    assert_eq!(body["store"], serde_json::Value::Bool(false));
    assert!(
        body.get("temperature").is_none(),
        "temperature must be stripped for the ChatGPT subscription backend"
    );
    // Untouched fields are preserved.
    assert_eq!(body["reasoning"]["effort"], "none");
}

/// Both documented `input` forms must reach the `ChatGPT` backend as a list;
/// the string form previously went through unchanged and drew a 400
/// ("Input must be a list").
#[test]
fn codex_normalizes_both_documented_input_forms_to_a_list() {
    let typed = serde_json::json!([{
        "type": "message",
        "role": "user",
        "content": [{"type": "input_text", "text": "скажи ок"}],
    }]);

    let mut string_form = serde_json::json!({
        "model": "gpt-5.6-sol",
        "input": "скажи ок",
    });
    normalize_codex_responses_body(&mut string_form);
    assert_eq!(string_form["input"], typed);

    // The list form is already correct and must survive untouched.
    let mut list_form = serde_json::json!({
        "model": "gpt-5.6-sol",
        "input": typed,
    });
    normalize_codex_responses_body(&mut list_form);
    assert_eq!(list_form["input"], typed);

    // A bare string inside the list is the same defect one level down.
    let mut mixed = serde_json::json!({
        "model": "gpt-5.6-sol",
        "input": ["скажи ок"],
    });
    normalize_codex_responses_body(&mut mixed);
    assert_eq!(mixed["input"], typed);
}

#[test]
fn codex_hoists_system_messages_into_instructions() {
    // OpenClaw gateway shape: system prompt as a `system` message in `input`.
    let mut body = serde_json::json!({
        "model": "gpt-5.5",
        "input": [
            {"type":"message","role":"system","content":[{"type":"input_text","text":"be terse"}]},
            {"type":"message","role":"user","content":[{"type":"input_text","text":"hi"}]}
        ],
        "stream": true,
        "max_output_tokens": 8192
    });
    normalize_codex_responses_body(&mut body);
    // System turn moved out of input (Codex forbids it there)...
    let input = body["input"].as_array().unwrap();
    assert_eq!(input.len(), 1);
    assert_eq!(input[0]["role"], "user");
    // ...and merged into instructions.
    assert_eq!(body["instructions"], "be terse");
    assert!(body.get("max_output_tokens").is_none());
}

#[test]
fn codex_preserves_caller_instructions() {
    let mut body = serde_json::json!({
        "model": "gpt-5-codex",
        "input": [],
        "instructions": "be terse",
        "max_output_tokens": 100
    });
    normalize_codex_responses_body(&mut body);
    assert_eq!(body["instructions"], "be terse");
    assert!(body.get("max_output_tokens").is_none());
    assert_eq!(body["stream"], serde_json::Value::Bool(true));
}

#[test]
fn codex_sse_collapses_to_completed_response() {
    let sse = concat!(
        "event: response.created\n",
        "data: {\"type\":\"response.created\",\"response\":{\"status\":\"in_progress\"}}\n\n",
        "event: response.output_text.delta\n",
        "data: {\"type\":\"response.output_text.delta\",\"item_id\":\"msg_1\",\"output_index\":0,\"content_index\":0,\"delta\":\"hi\"}\n\n",
        "event: response.output_text.done\n",
        "data: {\"type\":\"response.output_text.done\",\"item_id\":\"msg_1\",\"output_index\":0,\"content_index\":0,\"text\":\"hi\"}\n\n",
        "event: response.completed\n",
        "data: {\"type\":\"response.completed\",\"response\":{\"id\":\"resp_1\",\"model\":\"gpt-5.6-sol\",\"status\":\"completed\",\"output\":[]}}\n\n"
    );
    let out = codex_sse_to_response_json(sse.as_bytes()).expect("completed payload");
    let value: serde_json::Value = serde_json::from_slice(&out).unwrap();
    assert_eq!(value["id"], "resp_1");
    assert_eq!(value["status"], "completed");
    assert_eq!(value["output"][0]["type"], "message");
    assert_eq!(value["output"][0]["role"], "assistant");
    assert_eq!(value["output"][0]["content"][0]["text"], "hi");
}

#[test]
fn codex_sse_without_completed_returns_none() {
    let sse = "event: response.created\ndata: {\"type\":\"response.created\"}\n\n";
    assert!(codex_sse_to_response_json(sse.as_bytes()).is_none());
}

#[test]
fn codex_url_collapses_v1_responses() {
    let url = join_subscription_url(
        SubscriptionProvider::Codex,
        "https://chatgpt.com/backend-api/codex",
        "/v1/responses",
    );
    assert_eq!(url, "https://chatgpt.com/backend-api/codex/responses");
}

#[test]
fn qwen_url_strips_v1_against_compatible_base() {
    let url = join_subscription_url(
        SubscriptionProvider::Qwen,
        "https://dashscope.aliyuncs.com/compatible-mode/v1",
        "/v1/chat/completions",
    );
    assert_eq!(
        url,
        "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions"
    );
}

#[test]
fn codex_headers_include_account_id() {
    let token = SubscriptionToken {
        access_token: "a".into(),
        refresh_token: None,
        expires_at_ms: None,
        account_id: Some("acct_9".into()),
        resource_url: None,
    };
    let headers = subscription_headers(SubscriptionProvider::Codex, &token);
    assert!(
        headers
            .iter()
            .any(|(k, v)| *k == "chatgpt-account-id" && v == "acct_9")
    );
}

#[test]
fn codex_headers_include_version() {
    let token = SubscriptionToken {
        access_token: "a".into(),
        refresh_token: None,
        expires_at_ms: None,
        account_id: Some("acct_9".into()),
        resource_url: None,
    };
    let headers = subscription_headers(SubscriptionProvider::Codex, &token);
    // The Codex backend gates newer models behind a recent client version
    // advertised via the `version` header.
    assert!(
        headers
            .iter()
            .any(|(k, v)| *k == "version" && !v.is_empty())
    );
}

#[test]
fn safe_upstream_response_headers_are_selected() {
    let mut headers = HeaderMap::new();
    headers.insert("retry-after", HeaderValue::from_static("30"));
    headers.insert(
        "x-ratelimit-remaining-requests",
        HeaderValue::from_static("0"),
    );
    headers.insert("x-codex-active-limit", HeaderValue::from_static("75"));
    headers.insert(
        "x-oai-request-id",
        HeaderValue::from_static("req_codex_123"),
    );
    headers.insert(
        "authorization",
        HeaderValue::from_static("Bearer upstream-secret"),
    );
    headers.insert("x-api-key", HeaderValue::from_static("upstream-secret"));
    headers.insert("set-cookie", HeaderValue::from_static("session=secret"));
    headers.insert("connection", HeaderValue::from_static("x-remove-me"));
    headers.insert("x-remove-me", HeaderValue::from_static("hop-by-hop"));
    headers.insert("content-length", HeaderValue::from_static("999"));
    headers.insert("content-type", HeaderValue::from_static("application/json"));
    let selected = relay_response_headers(&headers);
    for relayed in [
        "retry-after",
        "x-ratelimit-remaining-requests",
        "x-oai-request-id",
        "content-type",
    ] {
        assert!(selected.contains_key(relayed), "missing {relayed}");
    }
    for excluded in [
        "authorization",
        "x-api-key",
        "set-cookie",
        "connection",
        "x-remove-me",
        "content-length",
        "x-codex-active-limit",
    ] {
        assert!(!selected.contains_key(excluded), "relayed {excluded}");
    }
}

#[test]
fn qwen_has_no_extra_headers() {
    let token = SubscriptionToken {
        access_token: "a".into(),
        refresh_token: None,
        expires_at_ms: None,
        account_id: None,
        resource_url: None,
    };
    assert!(subscription_headers(SubscriptionProvider::Qwen, &token).is_empty());
}
