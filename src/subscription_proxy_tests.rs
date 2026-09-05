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
fn codex_sse_collapses_incomplete_with_indexed_partial_output_and_metadata() {
    let sse = concat!(
        "data: {\"type\":\"response.output_text.delta\",\"item_id\":\"msg_1\",\"output_index\":0,\"content_index\":0,\"delta\":\"partial\"}\n\n",
        "data: {\"type\":\"response.refusal.delta\",\"item_id\":\"msg_1\",\"output_index\":0,\"content_index\":1,\"delta\":\"cannot comply\"}\n\n",
        "data: {\"type\":\"response.refusal.done\",\"item_id\":\"msg_1\",\"output_index\":0,\"content_index\":1,\"refusal\":\"cannot comply\"}\n\n",
        "data: {\"type\":\"response.output_item.done\",\"output_index\":0,\"item\":{\"id\":\"msg_1\",\"type\":\"message\",\"status\":\"incomplete\",\"role\":\"assistant\",\"content\":[]}}\n\n",
        "data: {\"type\":\"response.output_item.added\",\"output_index\":1,\"item\":{\"id\":\"fc_1\",\"type\":\"function_call\",\"call_id\":\"call_1\",\"name\":\"lookup\",\"arguments\":\"{}\"}}\n\n",
        "data: {\"type\":\"response.incomplete\",\"response\":{\"id\":\"resp_incomplete\",\"model\":\"exact-model\",\"status\":\"incomplete\",\"incomplete_details\":{\"reason\":\"max_output_tokens\"},\"usage\":{\"input_tokens\":3,\"output_tokens\":4,\"total_tokens\":7},\"output\":[]}}\n\n"
    );
    let out = codex_sse_to_response_json(sse.as_bytes()).expect("incomplete payload");
    let value: serde_json::Value = serde_json::from_slice(&out).unwrap();

    assert_eq!(value["id"], "resp_incomplete");
    assert_eq!(value["model"], "exact-model");
    assert_eq!(value["status"], "incomplete");
    assert_eq!(value["incomplete_details"]["reason"], "max_output_tokens");
    assert_eq!(value["usage"]["total_tokens"], 7);
    assert_eq!(value["output"][0]["content"][0]["text"], "partial");
    assert_eq!(value["output"][0]["content"][1]["refusal"], "cannot comply");
    assert_eq!(value["output"][1]["call_id"], "call_1");
}

#[test]
fn codex_sse_without_completed_returns_none() {
    let sse = "event: response.created\ndata: {\"type\":\"response.created\"}\n\n";
    assert!(codex_sse_to_response_json(sse.as_bytes()).is_none());
}

#[test]
fn codex_sse_collapses_to_failed_response_without_losing_the_error() {
    let sse = concat!(
        "data: {\"type\":\"response.output_text.delta\",\"item_id\":\"msg_1\",\"output_index\":0,\"content_index\":0,\"delta\":\"partial\"}\n\n",
        "data: {\"type\":\"response.failed\",\"response\":{\"id\":\"resp_failed\",\"status\":\"failed\",\"error\":{\"message\":\"buffered boom\",\"code\":\"server_error\"}}}\n\n",
        "data: [DONE]\n\n"
    );
    let out = codex_sse_to_response_json(sse.as_bytes()).expect("failed payload");
    let value: serde_json::Value = serde_json::from_slice(&out).unwrap();

    assert_eq!(value["id"], "resp_failed");
    assert_eq!(value["status"], "failed");
    assert_eq!(value["error"]["message"], "buffered boom");
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
    assert_eq!(
        headers
            .iter()
            .filter(|(name, _)| *name == "originator")
            .count(),
        1
    );
    let user_agent = headers
        .iter()
        .find_map(|(name, value)| (*name == "user-agent").then_some(value))
        .unwrap();
    assert_eq!(user_agent, &crate::codex_identity::user_agent());
}

#[tokio::test]
async fn native_codex_handler_strips_ingress_headers_before_the_captured_upstream() {
    use axum::body::Body;
    use axum::extract::State;
    use axum::http::Request;
    use http_body_util::BodyExt as _;
    use std::sync::{Arc, Mutex};

    let captured = Arc::new(Mutex::new(Vec::new()));
    let captured_for_server = Arc::clone(&captured);
    let upstream = axum::Router::new().fallback(move |request: Request<Body>| {
        let captured = Arc::clone(&captured_for_server);
        async move {
            captured.lock().unwrap().push(request.headers().clone());
            (
                StatusCode::OK,
                [
                    ("content-type", "application/json"),
                    ("x-request-id", "provider-codex-request"),
                    ("anthropic-auth-token", "provider-anthropic-secret"),
                ],
                r#"{"id":"resp_1","status":"completed","output":[]}"#,
            )
        }
    });
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let origin = format!("http://{}", listener.local_addr().unwrap());
    let upstream_task = tokio::spawn(async move { axum::serve(listener, upstream).await.unwrap() });

    let data = tempfile::tempdir().unwrap();
    let codex_home = tempfile::tempdir().unwrap();
    std::fs::write(
        codex_home.path().join("auth.json"),
        r#"{"tokens":{"access_token":"codex-upstream","account_id":"account-42"}}"#,
    )
    .unwrap();
    let reader = crate::subscription::SubscriptionReader::new(
        SubscriptionProvider::Codex,
        codex_home.path(),
    );
    let mut state = crate::app_state::AppState::for_tests(data.path());
    state.upstream_provider = crate::config::UpstreamProvider::Codex;
    state.subscription_base_url = Some(origin);
    state.subscription_reader = Some(reader.clone());
    state.subscription_readers = vec![reader];
    let token = crate::model_routing::tests::bound_client_token(
        &state,
        crate::clients::ClientKind::Codex,
        None,
    );
    let mut headers = HeaderMap::new();
    headers.insert(
        "authorization",
        HeaderValue::from_str(&format!("Bearer {token}")).unwrap(),
    );
    headers.insert("user-agent", HeaderValue::from_static("codex_exec/0.153.4"));
    headers.insert("originator", HeaderValue::from_static("codex_exec"));
    headers.insert(
        "x-codex-turn-metadata",
        HeaderValue::from_static("fixture-turn"),
    );
    headers.insert("connection", HeaderValue::from_static("x-hop-secret"));
    headers.insert("x-hop-secret", HeaderValue::from_static("private-hop"));
    headers.insert(
        "x-forwarded-client-cert",
        HeaderValue::from_static("By=spiffe://private;Subject=client"),
    );
    headers.insert("x-native-end-to-end", HeaderValue::from_static("preserved"));
    headers.append(
        axum::http::HeaderName::from_bytes(b"AnThRoPiC-AuTh-ToKeN").unwrap(),
        HeaderValue::from_static("incoming-anthropic-secret-a"),
    );
    headers.append(
        axum::http::HeaderName::from_static("anthropic-auth-token"),
        HeaderValue::from_static("incoming-anthropic-secret-b"),
    );
    for &name in crate::proxy::INGRESS_NETWORK_HEADERS {
        headers.append(
            axum::http::HeaderName::from_bytes(name.to_ascii_uppercase().as_bytes()).unwrap(),
            HeaderValue::from_static("192.0.2.10"),
        );
        headers.append(
            axum::http::HeaderName::from_bytes(name.as_bytes()).unwrap(),
            HeaderValue::from_static("198.51.100.20"),
        );
    }
    let response = crate::proxy::openai_responses_native(
        State(state),
        headers,
        Ok(axum::Json(serde_json::json!({
            "model": "gpt-live",
            "input": "hi"
        }))),
    )
    .await;
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(response.headers()["x-request-id"], "provider-codex-request");
    assert!(!response.headers().contains_key("anthropic-auth-token"));
    let _ = response.into_body().collect().await.unwrap();

    let captured = captured.lock().unwrap();
    assert_eq!(captured.len(), 1);
    let headers = &captured[0];
    assert_eq!(headers["authorization"], "Bearer codex-upstream");
    assert_eq!(headers["x-native-end-to-end"], "preserved");
    assert_eq!(headers.get_all("originator").iter().count(), 1);
    assert!(!headers.contains_key("x-request-id"));
    for removed in ["connection", "x-hop-secret", "anthropic-auth-token"] {
        assert!(!headers.contains_key(removed), "{removed} leaked upstream");
    }
    for name in crate::proxy::INGRESS_NETWORK_HEADERS {
        assert!(!headers.contains_key(*name), "{name} leaked upstream");
    }
    drop(captured);
    upstream_task.abort();
}

#[tokio::test]
async fn claude_to_codex_translation_preserves_the_client_request_id() {
    use axum::body::Body;
    use axum::http::Request;
    use http_body_util::BodyExt as _;
    use std::sync::{Arc, Mutex};

    let captured = Arc::new(Mutex::new(Vec::new()));
    let captured_for_server = Arc::clone(&captured);
    let upstream = axum::Router::new().fallback(move |request: Request<Body>| {
        let captured = Arc::clone(&captured_for_server);
        async move {
            captured.lock().unwrap().push(request.headers().clone());
            (
                StatusCode::OK,
                [("content-type", "application/json")],
                r#"{"id":"resp_1","status":"completed","output":[]}"#,
            )
        }
    });
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let origin = format!("http://{}", listener.local_addr().unwrap());
    let upstream_task = tokio::spawn(async move { axum::serve(listener, upstream).await.unwrap() });

    let data = tempfile::tempdir().unwrap();
    let codex_home = tempfile::tempdir().unwrap();
    std::fs::write(
        codex_home.path().join("auth.json"),
        r#"{"tokens":{"access_token":"codex-upstream","account_id":"account-42"}}"#,
    )
    .unwrap();
    let reader = crate::subscription::SubscriptionReader::new(
        SubscriptionProvider::Codex,
        codex_home.path(),
    );
    let mut state = crate::app_state::AppState::for_tests(data.path());
    state.upstream_provider = crate::config::UpstreamProvider::Codex;
    state.subscription_base_url = Some(origin);
    state.subscription_reader = Some(reader.clone());
    state.subscription_readers = vec![reader];
    let token = crate::model_routing::tests::bound_client_token(
        &state,
        crate::clients::ClientKind::ClaudeCode,
        None,
    );
    let mut headers = HeaderMap::new();
    headers.insert(
        "authorization",
        HeaderValue::from_str(&format!("Bearer {token}")).unwrap(),
    );
    headers.insert("user-agent", HeaderValue::from_static("claude-cli/2.1.261"));
    headers.insert("anthropic-version", HeaderValue::from_static("2023-06-01"));
    headers.insert(
        "x-request-id",
        HeaderValue::from_static("client-translation-request"),
    );
    let body = serde_json::json!({"model":"gpt-live","input":"hi"});
    let response = forward_subscription_openai_inner(
        &state,
        &headers,
        body.clone(),
        &body,
        ForwardOptions {
            path: "/v1/responses",
            surface: Surface::Anthropic,
            response_shape: SubscriptionResponseShape::Passthrough,
            validated: None,
            entitlement: Some(crate::client_policy::EntitlementDecision::Override),
            native_route: false,
        },
    )
    .await;
    assert_eq!(response.status(), StatusCode::OK);
    let _ = response.into_body().collect().await.unwrap();

    let captured = captured.lock().unwrap();
    assert_eq!(captured.len(), 1);
    assert_eq!(
        captured[0]["x-request-id"], "client-translation-request",
        "protocol translation must not replace or drop caller correlation"
    );
    assert_eq!(captured[0].get_all("x-request-id").iter().count(), 1);
    drop(captured);
    upstream_task.abort();
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
    headers.insert("x-router-debug", HeaderValue::from_static("private"));
    headers.insert(
        "x-link-assistant-debug",
        HeaderValue::from_static("private"),
    );
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
        "x-router-debug",
        "x-link-assistant-debug",
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
