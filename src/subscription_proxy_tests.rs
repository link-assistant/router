use super::*;

#[test]
fn codex_strips_the_output_cap_it_enforces_locally() {
    // Every OpenAI-compatible client sends an output cap; the ChatGPT backend
    // rejects the field, so it is removed here and enforced by
    // `crate::output_limit` instead of failing the request.
    let mut body = serde_json::json!({
        "model": "gpt-5.6-sol",
        "input": "hi",
        "max_output_tokens": 16,
    });
    normalize_subscription_request(
        SubscriptionProvider::Codex,
        &mut body,
        CodexResponsesMode::Standard,
    );
    assert!(body.get("max_output_tokens").is_none());
    assert_eq!(
        crate::capabilities::subscription(SubscriptionProvider::Codex, None).output_token_limit,
        crate::capabilities::Capability::Emulated
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
    normalize_subscription_request(
        SubscriptionProvider::Codex,
        &mut body,
        CodexResponsesMode::Standard,
    );
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

#[test]
fn codex_strips_unsupported_top_p_without_narrowing_claude() {
    let mut codex = serde_json::json!({
        "model": "gpt-5.6-sol",
        "input": "hi",
        "top_p": 0.9
    });
    normalize_subscription_request(
        SubscriptionProvider::Codex,
        &mut codex,
        CodexResponsesMode::Standard,
    );
    assert!(codex.get("top_p").is_none(), "{codex:#}");

    let mut claude = serde_json::json!({
        "model": "claude-opus-4-7",
        "messages": [{"role": "user", "content": "hi"}],
        "top_p": 0.9
    });
    normalize_subscription_request(
        SubscriptionProvider::Claude,
        &mut claude,
        CodexResponsesMode::Standard,
    );
    assert_eq!(claude["top_p"], 0.9, "{claude:#}");
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
    normalize_codex_responses_body(&mut string_form, CodexResponsesMode::Standard);
    assert_eq!(string_form["input"], typed);

    // The list form is already correct and must survive untouched.
    let mut list_form = serde_json::json!({
        "model": "gpt-5.6-sol",
        "input": typed,
    });
    normalize_codex_responses_body(&mut list_form, CodexResponsesMode::Standard);
    assert_eq!(list_form["input"], typed);

    // A bare string inside the list is the same defect one level down.
    let mut mixed = serde_json::json!({
        "model": "gpt-5.6-sol",
        "input": ["скажи ок"],
    });
    normalize_codex_responses_body(&mut mixed, CodexResponsesMode::Standard);
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
    normalize_codex_responses_body(&mut body, CodexResponsesMode::Standard);
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
    normalize_codex_responses_body(&mut body, CodexResponsesMode::Standard);
    assert_eq!(body["instructions"], "be terse");
    assert!(body.get("max_output_tokens").is_none());
    assert_eq!(body["stream"], serde_json::Value::Bool(true));
}

#[test]
fn codex_responses_lite_preserves_additional_tools_and_empty_instructions() {
    let mut body = serde_json::json!({
        "model": "gpt-5.6-sol",
        "instructions": "",
        "input": [
            {
                "type": "additional_tools",
                "id": "1",
                "role": "developer",
                "tools": [{
                    "name": "shell",
                    "description": "Runs a shell command",
                    "input_schema": {"type": "object"}
                }]
            },
            {
                "type": "message",
                "role": "user",
                "content": [{"type": "input_text", "text": "Use the shell tool"}]
            }
        ],
        "stream": true,
        "store": false
    });

    normalize_codex_responses_body(&mut body, CodexResponsesMode::Lite);

    assert_eq!(body["input"][0]["type"], "additional_tools", "{body:#}");
    assert_eq!(body["input"][0]["tools"][0]["name"], "shell");
    assert_eq!(body["instructions"], "");
}

#[test]
fn only_a_true_codex_responses_lite_marker_selects_and_forwards_lite_mode() {
    let token = SubscriptionToken {
        access_token: "a".into(),
        refresh_token: None,
        expires_at_ms: None,
        account_id: Some("acct_9".into()),
        resource_url: None,
    };
    for (value, expected) in [
        ("true", CodexResponsesMode::Lite),
        ("TRUE", CodexResponsesMode::Lite),
        ("false", CodexResponsesMode::Standard),
        ("1", CodexResponsesMode::Standard),
    ] {
        let mut headers = HeaderMap::new();
        headers.insert(
            CODEX_RESPONSES_LITE_HEADER,
            HeaderValue::from_str(value).unwrap(),
        );
        assert_eq!(
            codex_responses_mode(SubscriptionProvider::Codex, &headers),
            expected,
            "{value}"
        );
    }

    let mut headers = HeaderMap::new();
    headers.insert(
        CODEX_RESPONSES_LITE_HEADER,
        HeaderValue::from_static("true"),
    );
    assert_eq!(
        codex_responses_mode(SubscriptionProvider::Claude, &headers),
        CodexResponsesMode::Standard
    );
    assert!(
        subscription_headers(
            SubscriptionProvider::Codex,
            &token,
            CodexResponsesMode::Lite
        )
        .iter()
        .any(|(name, value)| { *name == CODEX_RESPONSES_LITE_HEADER && value == "true" })
    );
    assert!(
        subscription_headers(
            SubscriptionProvider::Codex,
            &token,
            CodexResponsesMode::Standard
        )
        .iter()
        .all(|(name, _)| *name != CODEX_RESPONSES_LITE_HEADER)
    );
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
    let headers = subscription_headers(
        SubscriptionProvider::Codex,
        &token,
        CodexResponsesMode::Standard,
    );
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
    let headers = subscription_headers(
        SubscriptionProvider::Codex,
        &token,
        CodexResponsesMode::Standard,
    );
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
    assert!(
        subscription_headers(
            SubscriptionProvider::Qwen,
            &token,
            CodexResponsesMode::Standard
        )
        .is_empty()
    );
}
