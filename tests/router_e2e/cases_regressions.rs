use super::*;

#[tokio::test]
async fn codex_upstream_is_translated_and_relays_vendor_headers() {
    let router = TestRouter::start(UpstreamProvider::Codex).await;

    let response = router
        .post(
            "/api/services/openai/v1/chat/completions",
            &json!({
                "model":"gpt-5",
                "messages":[{"role":"user","content":"hi"}],
                "tools":[{"type":"function","function":{"name":"lookup","description":"look up a value","parameters":{"type":"object"}}}]
            }),
        )
        .header("x-test-marker", "client-boundary-marker")
        .send()
        .await
        .expect("chat completion response");
    assert_eq!(response.status(), StatusCode::OK);
    assert!(response.headers().get("x-codex-active-limit").is_none());
    assert_eq!(response.headers()["x-ratelimit-remaining-requests"], "41");
    assert_eq!(response.headers()["x-oai-request-id"], "req_stub_123");
    let chat: Value = response.json().await.expect("chat completion JSON");
    assert_eq!(chat["object"], "chat.completion");
    assert_eq!(
        chat["choices"][0]["message"]["tool_calls"][0]["id"],
        "call_router_e2e"
    );
    assert_eq!(
        chat["choices"][0]["message"]["tool_calls"][0]["function"]["name"],
        "lookup"
    );

    let response = router
        .post(
            "/api/services/codex/v1/responses",
            &json!({"model":"gpt-5","input":"hi"}),
        )
        .send()
        .await
        .expect("Responses response");
    assert_eq!(response.status(), StatusCode::OK);
    assert!(response.headers().get("x-codex-active-limit").is_none());
    assert_eq!(response.headers()["x-ratelimit-remaining-requests"], "41");
    let responses = response_payload(response).await;
    assert_eq!(responses["object"], "response");
    assert!(responses["output"].is_array());

    let requests = router.requests.lock().expect("stub requests");
    let translated_tools = requests[0]["tools"].as_array().expect("translated tools");
    assert_eq!(translated_tools[0]["name"], "lookup");
    assert_eq!(translated_tools[0]["type"], "function");
    assert!(translated_tools[0].get("function").is_none());
    drop(requests);

    let client_token = router.token_for("/api/services/openai/v1/chat/completions");
    let records =
        std::fs::read_to_string(router.log_path_for(client_token)).expect("request exchange log");
    let records = records
        .lines()
        .map(|line| link_assistant_router::lino_json::decode_line(line).expect("a readable record"))
        .collect::<Vec<_>>();
    let correlation_id = records
        .iter()
        .find(|record| {
            record["phase"] == "client_request"
                && record.to_string().contains("client-boundary-marker")
        })
        .and_then(|record| record["correlation_id"].as_str())
        .expect("marked client request")
        .to_string();
    let exchange = records
        .iter()
        .filter(|record| record["correlation_id"] == correlation_id)
        .collect::<Vec<_>>();
    for phase in [
        "client_request",
        "upstream_request",
        "upstream_response",
        "upstream_response_body",
        "client_response",
        "client_response_body",
    ] {
        assert!(
            exchange.iter().any(|record| record["phase"] == phase),
            "missing {phase} for one correlation id"
        );
    }
    let token_log_path = router.log_path_for(client_token);
    let expected_hash = token_log_path
        .parent()
        .and_then(std::path::Path::file_name)
        .and_then(std::ffi::OsStr::to_str)
        .expect("token hash");
    assert!(exchange.iter().all(|record| {
        record["token_hash"] == expected_hash
            && record["token_label"] == "router e2e client"
            && record["token_id"].as_str().is_some_and(|id| !id.is_empty())
    }));
    let rendered = exchange
        .iter()
        .map(std::string::ToString::to_string)
        .collect::<String>();
    assert!(rendered.contains("client-boundary-marker"));
    assert!(rendered.contains("Bearer la_"));
    assert!(rendered.contains("***"));
    assert!(!rendered.contains(client_token));
}

#[tokio::test]
async fn native_codex_request_identity_body_and_sse_are_transparent() {
    let router = TestRouter::start(UpstreamProvider::Codex).await;
    let body = json!({
        "model":"gpt-5",
        "input":[{"role":"user","content":[{"type":"input_text","text":"hi"}]}],
        "instructions":"keep this exact native field",
        "reasoning":{"effort":"xhigh"},
        "store":false,
        "stream":true
    });

    let response = router
        .post("/api/services/codex/v1/responses", &body)
        .send()
        .await
        .expect("native Responses response");
    assert_eq!(response.status(), StatusCode::OK);
    assert!(response.headers().get("x-router-upstream-model").is_none());
    assert_eq!(response.headers()["x-oai-request-id"], "req_stub_123");
    let relayed = response.text().await.expect("native SSE body");
    assert_eq!(relayed, codex_stream_for_request(&body));

    let requests = router.requests.lock().expect("stub requests");
    assert_eq!(requests.as_slice(), &[body]);
    drop(requests);
    let headers = router.upstream_headers.lock().expect("stub headers");
    assert_eq!(headers.len(), 1);
    assert_eq!(headers[0]["user-agent"], "codex_exec/0.153.0");
    assert_eq!(headers[0]["x-codex-turn-metadata"], "router-e2e-codex");
    assert_eq!(headers[0]["originator"], "codex_cli_rs");
    assert_eq!(headers[0]["version"], "0.153.0");
    assert_eq!(headers[0]["authorization"], "Bearer stub-codex-oauth-token");
    assert_eq!(headers[0]["chatgpt-account-id"], "acct_stub");
    assert!(
        headers[0]
            .keys()
            .all(|name| !name.as_str().starts_with("x-router-"))
    );
    drop(headers);
}

/// Issue #380: Codex 0.151 moved its tool declaration into an
/// `additional_tools` developer input item and marks that wire protocol with a
/// dedicated header. The item and marker must cross the router together.
#[tokio::test]
async fn codex_responses_lite_preserves_additional_tools_and_protocol_marker() {
    let codex = TestRouter::start(UpstreamProvider::Codex).await;
    let response = codex
        .post(
            "/api/services/openai/v1/responses",
            &json!({
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
            }),
        )
        .header("x-openai-internal-codex-responses-lite", "true")
        .send()
        .await
        .expect("Codex Responses Lite request");
    assert_eq!(response.status(), StatusCode::OK);

    let requests = codex.requests.lock().expect("stub requests");
    assert_eq!(requests.len(), 1);
    assert_eq!(
        requests[0]["input"][0]["type"], "additional_tools",
        "the Responses Lite tool declaration was discarded: {:#}",
        requests[0]
    );
    assert_eq!(requests[0]["input"][0]["tools"][0]["name"], "shell");
    assert_eq!(requests[0]["instructions"], "");
    drop(requests);

    let headers = codex.upstream_headers.lock().expect("stub headers");
    assert_eq!(headers.len(), 1);
    assert_eq!(
        headers[0]
            .get("x-openai-internal-codex-responses-lite")
            .and_then(|value| value.to_str().ok()),
        Some("true")
    );
    drop(headers);
}

#[tokio::test]
async fn unavailable_server_tool_fails_explicitly_without_reaching_codex() {
    let router = TestRouter::start(UpstreamProvider::Codex).await;
    let response = router
        .post(
            "/api/services/openai/v1/responses",
            &json!({"model":"gpt-5","input":"fetch this","tools":[{"type":"web_fetch"}]}),
        )
        .send()
        .await
        .expect("unsupported server-tool response");

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    let payload: Value = response.json().await.expect("OpenAI error JSON");
    assert!(
        payload["error"]["message"]
            .as_str()
            .is_some_and(|message| message.contains("web_fetch"))
    );
    assert!(router.requests.lock().expect("stub requests").is_empty());
}

#[tokio::test]
async fn untranslatable_tool_state_fails_semantically_without_reaching_upstream() {
    let anthropic = TestRouter::start(UpstreamProvider::Anthropic).await;
    for (path, body, expected) in [
        (
            "/api/services/openai/v1/chat/completions",
            json!({
                "model":"claude-sonnet-4-5",
                "messages":[
                    {"role":"assistant","tool_calls":[{"id":"call_1","type":"function","function":{"name":"lookup","arguments":"not-json"}}]},
                    {"role":"tool","tool_call_id":"call_1","content":"42"}
                ]
            }),
            "valid JSON",
        ),
        (
            "/api/services/openai/v1/responses",
            json!({
                "model":"claude-sonnet-4-5",
                "input":"hi",
                "tool_choice":{"type":"future"}
            }),
            "tool_choice",
        ),
    ] {
        let response = anthropic
            .post(path, &body)
            .send()
            .await
            .expect("semantic tool error");
        assert_eq!(response.status(), StatusCode::BAD_REQUEST);
        let payload: Value = response.json().await.expect("OpenAI error JSON");
        assert!(
            payload["error"]["message"]
                .as_str()
                .is_some_and(|message| message.contains(expected)),
            "{path} must explain {expected}: {payload}"
        );
    }
    assert!(anthropic.requests.lock().expect("stub requests").is_empty());

    let codex = TestRouter::start(UpstreamProvider::Codex).await;
    let response = codex
        .post(
            "/api/services/anthropic/v1/messages",
            &json!({
                "model":"gpt-5",
                "max_tokens":64,
                "messages":[{"role":"user","content":"hi"}],
                "tools":[{"type":"computer_20990101","name":"computer"}]
            }),
        )
        .send()
        .await
        .expect("Anthropic semantic tool error");
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    let payload: Value = response.json().await.expect("Anthropic error JSON");
    assert!(
        payload["error"]["message"]
            .as_str()
            .is_some_and(|message| message.contains("unsupported Anthropic tool type"))
    );
    assert!(codex.requests.lock().expect("stub requests").is_empty());
}

#[tokio::test]
async fn auth_unknown_models_and_admin_isolation() {
    let router = TestRouter::start(UpstreamProvider::Anthropic).await;
    for path in [
        "/api/services/openai/v1/models",
        "/api/services/anthropic/v1/models",
        "/api/services/openai/v1/models",
        "/api/services/codex/v1/models",
        "/api/services/qwen/v1/models",
    ] {
        let missing = router
            .client
            .get(format!("{}{path}", router.url))
            .send()
            .await
            .expect("missing-token response");
        assert_eq!(missing.status(), StatusCode::UNAUTHORIZED, "{path}");
        let malformed = router
            .client
            .get(format!("{}{path}", router.url))
            .bearer_auth("not-a-router-token")
            .send()
            .await
            .expect("malformed-token response");
        assert_eq!(malformed.status(), StatusCode::UNAUTHORIZED, "{path}");
    }

    for (path, body) in [
        (
            "/api/services/anthropic/v1/messages",
            json!({"model":"claude-sonnet-4-5","max_tokens":16,"messages":[{"role":"user","content":"hi"}]}),
        ),
        (
            "/api/services/openai/v1/chat/completions",
            json!({"model":"claude-sonnet-4-5","messages":[{"role":"user","content":"hi"}]}),
        ),
        (
            "/api/services/openai/v1/responses",
            json!({"model":"claude-sonnet-4-5","input":"hi"}),
        ),
    ] {
        let missing = router
            .client
            .post(format!("{}{path}", router.url))
            .json(&body)
            .send()
            .await
            .expect("missing-token inference response");
        assert_eq!(missing.status(), StatusCode::UNAUTHORIZED, "{path}");
        let malformed = router
            .client
            .post(format!("{}{path}", router.url))
            .bearer_auth("not-a-router-token")
            .json(&body)
            .send()
            .await
            .expect("malformed-token inference response");
        assert_eq!(malformed.status(), StatusCode::UNAUTHORIZED, "{path}");
    }

    // An unknown id is only knowably unknown against a discovered catalog;
    // with none, the upstream remains the authority (issue #192).
    router
        .state_catalogs()
        .record_success(SubscriptionProvider::Claude, vec!["aurora-2-base".into()]);
    let unknown = router
        .post(
            "/api/services/openai/v1/responses",
            &json!({"model":"definitely-not-a-model","input":"hi"}),
        )
        .send()
        .await
        .expect("unknown-model response");
    assert_eq!(unknown.status(), StatusCode::NOT_FOUND);
    assert!(
        unknown
            .text()
            .await
            .expect("error body")
            .contains("not available")
    );

    let admin = router
        .get("/api/management/tokens")
        .send()
        .await
        .expect("admin response");
    assert_eq!(admin.status(), StatusCode::UNAUTHORIZED);

    let unauthenticated =
        std::fs::read_to_string(router.log_root.join("unauthenticated/requests.lino"))
            .expect("unauthenticated request log");
    assert!(unauthenticated.lines().all(|line| {
        let record =
            link_assistant_router::lino_json::decode_line(line).expect("a readable record");
        record["token_hash"] == "unauthenticated"
            && record["token_id"].is_null()
            && record["token_label"].is_null()
    }));
}

#[tokio::test]
async fn codex_output_limit_policy_distinguishes_client_surfaces() {
    let codex = TestRouter::start(UpstreamProvider::Codex).await;

    // Messages requires max_tokens, so its required protocol field must not
    // make the entire Anthropic surface unusable with a Codex subscription.
    let messages = codex
        .post(
            "/api/services/anthropic/v1/messages",
            &json!({
                "model":"gpt-5",
                "max_tokens":16,
                "messages":[{"role":"user","content":"hi"}]
            }),
        )
        .send()
        .await
        .expect("capped Codex Messages response");
    assert_eq!(messages.status(), StatusCode::OK);
    assert!(messages.headers().get("x-codex-active-limit").is_none());
    assert_eq!(messages.headers()["x-ratelimit-remaining-requests"], "41");
    assert!(messages.headers().get("warning").is_none());
    assert!(
        messages
            .headers()
            .get("x-link-assistant-output-limit")
            .is_none()
    );
    let payload: Value = messages.json().await.expect("Messages JSON response");
    assert!(payload["content"].is_array());

    {
        let requests = codex.requests.lock().expect("stub requests");
        assert_eq!(requests.len(), 1);
        assert!(
            requests[0].get("max_output_tokens").is_none(),
            "the unsupported field must still be omitted from the Codex request"
        );
        drop(requests);
    }

    // The vendor wire remains canonical, while the operator-facing request
    // log records requested and forwarded bodies under one correlation id.
    // This makes the unsupported cap observable without inventing a response
    // header that vendor clients do not understand.
    let records = std::fs::read_to_string(
        codex.log_path_for(codex.token_for("/api/services/anthropic/v1/messages")),
    )
    .expect("token request log")
    .lines()
    .map(|line| link_assistant_router::lino_json::decode_line(line).expect("a readable record"))
    .collect::<Vec<_>>();
    let client_record = records
        .iter()
        .find(|record| record["phase"] == "client_request" && record["body"]["max_tokens"] == 16)
        .expect("capped client request record");
    let correlation_id = &client_record["correlation_id"];
    let upstream_record = records
        .iter()
        .find(|record| {
            record["phase"] == "upstream_request" && record["correlation_id"] == *correlation_id
        })
        .expect("matching upstream request record");
    assert_eq!(client_record["body"]["max_tokens"], 16);
    assert!(upstream_record["body"].get("max_output_tokens").is_none());

    // A Messages request without its required field is a protocol error, not
    // an unsupported-Codex-cap error, and must not reach the subscription.
    let missing = codex
        .post(
            "/api/services/anthropic/v1/messages",
            &json!({"model":"gpt-5","messages":[{"role":"user","content":"hi"}]}),
        )
        .send()
        .await
        .expect("missing max_tokens response");
    assert_eq!(missing.status(), StatusCode::BAD_REQUEST);
    let missing_payload: Value = missing.json().await.expect("Messages error response");
    assert_eq!(missing_payload["error"]["type"], "invalid_request_error");
    assert!(
        missing_payload["error"]["message"]
            .as_str()
            .is_some_and(|message| message.contains("max_tokens is required"))
    );

    // Native Responses is protocol-transparent: Router neither strips the
    // client's field nor rewrites the provider's SSE response.
    let capped = codex
        .post(
            "/api/services/codex/v1/responses",
            &json!({"model":"gpt-5","input":"hi","max_output_tokens":1}),
        )
        .send()
        .await
        .expect("capped Codex Responses response");
    assert_eq!(capped.status(), StatusCode::OK);
    assert_eq!(
        capped.headers()["content-type"],
        "text/event-stream",
        "the native upstream response metadata is preserved"
    );
    let payload = response_payload(capped).await;
    assert_eq!(payload["status"], "completed");
    assert_eq!(payload["output"][0]["content"][0]["text"], "stub answer");

    // Chat caps are honoured the same way, under either spelling.
    for body in [
        json!({
            "model":"gpt-5",
            "max_tokens":1,
            "messages":[{"role":"user","content":"hi"}]
        }),
        json!({
            "model":"gpt-5",
            "max_completion_tokens":1,
            "messages":[{"role":"user","content":"hi"}]
        }),
    ] {
        let response = codex
            .post("/api/services/openai/v1/chat/completions", &body)
            .send()
            .await
            .expect("capped Codex Chat response");
        assert_eq!(response.status(), StatusCode::OK);
        let payload: Value = response.json().await.expect("OpenAI JSON response");
        assert_eq!(payload["choices"][0]["message"]["content"], "stub");
        assert_eq!(payload["choices"][0]["finish_reason"], "length");
    }

    let requests = codex.requests.lock().expect("stub requests");
    assert_eq!(requests.len(), 4, "capped requests still reach upstream");
    assert!(requests[0].get("max_output_tokens").is_none());
    assert_eq!(requests[1]["max_output_tokens"], 1);
    assert!(
        requests[2..]
            .iter()
            .all(|request| request.get("max_output_tokens").is_none()),
        "only the native Codex request keeps the exact client field"
    );
    drop(requests);
}

#[tokio::test]
async fn malformed_json_uses_each_http_surfaces_json_error_envelope() {
    let router = TestRouter::start(UpstreamProvider::Codex).await;

    for path in [
        "/api/services/anthropic/v1/messages",
        "/api/services/openai/v1/chat/completions",
        "/api/services/openai/v1/responses",
    ] {
        let response = router
            .authenticated_post(path, router.token_for(path))
            .header("content-type", "application/json")
            .body(r#"{"model":"gpt-5",broken"#)
            .send()
            .await
            .expect("malformed JSON response");
        assert_eq!(response.status(), StatusCode::BAD_REQUEST, "{path}");
        assert_eq!(
            response
                .headers()
                .get("content-type")
                .and_then(|value| value.to_str().ok()),
            Some("application/json"),
            "{path}"
        );
        let payload: Value = response.json().await.expect("JSON error envelope");
        assert_eq!(payload["error"]["type"], "invalid_request_error", "{path}");
        assert!(
            payload["error"]["message"]
                .as_str()
                .is_some_and(|message| message.to_ascii_lowercase().contains("json")),
            "{path}: {payload}"
        );
    }
    assert!(router.requests.lock().expect("stub requests").is_empty());

    let auto = TestRouter::start(UpstreamProvider::Auto).await;
    let response = auto
        .authenticated_post(
            "/api/services/anthropic/v1/messages",
            auto.token_for("/api/services/anthropic/v1/messages"),
        )
        .header("content-type", "application/json")
        .body(r#"{"model":"gpt-5",broken"#)
        .send()
        .await
        .expect("automatic-routing malformed JSON response");
    let payload: Value = response.json().await.expect("JSON error envelope");
    assert_eq!(payload["error"]["type"], "invalid_request_error");
    assert!(
        payload["error"]["message"]
            .as_str()
            .is_some_and(|message| message.to_ascii_lowercase().contains("json"))
    );
}

#[tokio::test]
async fn empty_messages_is_reported_in_the_anthropic_dialect() {
    let router = TestRouter::start(UpstreamProvider::Codex).await;

    for body in [
        json!({"model":"gpt-5","max_tokens":16,"messages":[]}),
        json!({"model":"gpt-5","max_tokens":16}),
    ] {
        let response = router
            .post("/api/services/anthropic/v1/messages", &body)
            .send()
            .await
            .expect("invalid Messages response");
        assert_eq!(response.status(), StatusCode::BAD_REQUEST);
        let payload: Value = response.json().await.expect("Anthropic error envelope");
        assert_eq!(payload["error"]["type"], "invalid_request_error");
        let message = payload["error"]["message"].as_str().expect("error message");
        assert!(message.contains("messages"), "{message}");
        for leaked in ["input", "previous_response_id", "prompt", "conversation"] {
            assert!(!message.contains(leaked), "leaked {leaked}: {message}");
        }
    }
    assert!(router.requests.lock().expect("stub requests").is_empty());
}

#[tokio::test]
async fn translated_streams_preserve_usage_in_the_client_dialect() {
    let router = TestRouter::start(UpstreamProvider::Codex).await;

    let anthropic = router
        .post(
            "/api/services/anthropic/v1/messages",
            &json!({
                "model":"gpt-5",
                "max_tokens":16,
                "messages":[{"role":"user","content":"hi"}],
                "stream":true
            }),
        )
        .send()
        .await
        .expect("Anthropic stream")
        .text()
        .await
        .expect("Anthropic SSE body");
    let message_delta = anthropic
        .split("\n\n")
        .filter_map(|block| block.lines().find_map(|line| line.strip_prefix("data: ")))
        .filter_map(|data| serde_json::from_str::<Value>(data).ok())
        .find(|event| event["type"] == "message_delta")
        .expect("message_delta event");
    assert_eq!(message_delta["usage"]["input_tokens"], 3);
    assert_eq!(message_delta["usage"]["output_tokens"], 2);

    let chat = router
        .post(
            "/api/services/openai/v1/chat/completions",
            &json!({
                "model":"gpt-5",
                "messages":[{"role":"user","content":"hi"}],
                "stream":true,
                "stream_options":{"include_usage":true}
            }),
        )
        .send()
        .await
        .expect("Chat Completions stream")
        .text()
        .await
        .expect("Chat SSE body");
    let usage = chat
        .split("\n\n")
        .filter_map(|block| block.lines().find_map(|line| line.strip_prefix("data: ")))
        .filter(|data| *data != "[DONE]")
        .filter_map(|data| serde_json::from_str::<Value>(data).ok())
        .find(|chunk| chunk["choices"].as_array().is_some_and(Vec::is_empty))
        .expect("final usage chunk");
    assert_eq!(usage["usage"]["prompt_tokens"], 3);
    assert_eq!(usage["usage"]["completion_tokens"], 2);
    assert_eq!(usage["usage"]["total_tokens"], 5);
}

#[tokio::test]
async fn invalid_upstream_body_is_not_disclosed_to_anthropic_clients() {
    let router = TestRouter::start_with_invalid_body(UpstreamProvider::Codex, true).await;
    let response = router
        .post(
            "/api/services/anthropic/v1/messages",
            &json!({
                "model":"gpt-5",
                "max_tokens":16,
                "messages":[{"role":"user","content":"hi"}]
            }),
        )
        .send()
        .await
        .expect("invalid upstream response");
    assert_eq!(response.status(), StatusCode::BAD_GATEWAY);
    let payload: Value = response.json().await.expect("Anthropic error envelope");
    assert_eq!(
        payload["error"]["message"],
        "Upstream returned a malformed response"
    );
    let rendered = payload.to_string();
    assert!(!rendered.contains("safety_identifier"));
    assert!(!rendered.contains("prompt_cache_key"));
}

/// The exact request shape `OpenCode` sends through its `OpenAI`-compatible
/// provider: an output cap plus a tool definition. Issue #186 reported this
/// body being refused with HTTP 400 against a Codex subscription.
fn opencode_chat_body(model: &str, stream: bool) -> Value {
    json!({
        "model": model,
        "messages": [
            {"role": "system", "content": "You are opencode, an autonomous coding agent."},
            {"role": "user", "content": "hi"}
        ],
        "max_tokens": 32000,
        "temperature": 0,
        "stream": stream,
        "tools": [{
            "type": "function",
            "function": {
                "name": "lookup",
                "description": "look up a value",
                "parameters": {"type": "object", "properties": {"key": {"type": "string"}}}
            }
        }],
        "tool_choice": "auto"
    })
}

#[tokio::test]
async fn opencode_request_body_with_an_output_cap_works_against_codex() {
    let codex = TestRouter::start(UpstreamProvider::Codex).await;

    let buffered = codex
        .post(
            "/api/services/openai/v1/chat/completions",
            &opencode_chat_body("gpt-5", false),
        )
        .send()
        .await
        .expect("buffered OpenCode response");
    assert_eq!(buffered.status(), StatusCode::OK);
    let payload: Value = buffered.json().await.expect("OpenAI JSON response");
    assert_eq!(payload["object"], "chat.completion");
    // The generous OpenCode cap must not truncate an ordinary answer.
    assert_eq!(
        payload["choices"][0]["message"]["tool_calls"][0]["function"]["name"],
        "lookup"
    );

    let streamed = codex
        .post(
            "/api/services/openai/v1/chat/completions",
            &opencode_chat_body("gpt-5", true),
        )
        .send()
        .await
        .expect("streamed OpenCode response");
    assert_eq!(streamed.status(), StatusCode::OK);
    let stream = streamed.text().await.expect("SSE body");
    assert!(stream.contains("chat.completion.chunk"), "{stream}");
    assert!(stream.contains("data: [DONE]"), "{stream}");

    // The OpenCode tool loop: the second turn carries the tool result back.
    let follow_up = codex
        .post(
            "/api/services/openai/v1/chat/completions",
            &json!({
                "model": "gpt-5",
                "max_tokens": 32000,
                "messages": [
                    {"role": "user", "content": "hi"},
                    {"role": "assistant", "tool_calls": [{
                        "id": "call_router_e2e",
                        "type": "function",
                        "function": {"name": "lookup", "arguments": "{\"key\":\"value\"}"}
                    }]},
                    {"role": "tool", "tool_call_id": "call_router_e2e", "content": "value"}
                ],
                "tools": [{"type":"function","function":{"name":"lookup","parameters":{"type":"object"}}}]
            }),
        )
        .send()
        .await
        .expect("OpenCode tool-loop response");
    assert_eq!(follow_up.status(), StatusCode::OK);
    let payload: Value = follow_up.json().await.expect("OpenAI JSON response");
    assert_eq!(payload["choices"][0]["message"]["content"], "stub answer");

    let requests = codex.requests.lock().expect("stub requests");
    assert_eq!(requests.len(), 3);
    assert!(
        requests
            .iter()
            .all(|request| request.get("max_output_tokens").is_none()),
        "the cap the ChatGPT backend rejects must never be forwarded"
    );
    drop(requests);
}

#[tokio::test]
async fn advertised_model_ids_keep_their_identity_on_every_openai_surface() {
    let codex = TestRouter::start(UpstreamProvider::Codex).await;

    let catalog: Value = codex
        .get("/api/services/openai/v1/models")
        .send()
        .await
        .expect("model catalog response")
        .json()
        .await
        .expect("model catalog JSON");
    let ids = catalog["data"]
        .as_array()
        .expect("catalog data array")
        .iter()
        .filter_map(|model| model["id"].as_str().map(str::to_string))
        .collect::<Vec<_>>();
    assert!(ids.iter().any(|id| id == "gpt-5"));

    for id in &ids {
        // Buffered Chat Completions.
        let payload: Value = codex
            .post(
                "/api/services/openai/v1/chat/completions",
                &json!({"model": id, "messages": [{"role":"user","content":"hi"}]}),
            )
            .send()
            .await
            .expect("buffered chat response")
            .json()
            .await
            .expect("chat JSON");
        assert_eq!(payload["model"], id.as_str(), "buffered chat identity");
        if payload.get("x_router_upstream_model").is_some() {
            assert_eq!(payload["x_router_upstream_model"], "gpt-5");
        }

        // Streaming Chat Completions.
        let stream = codex
            .post(
                "/api/services/openai/v1/chat/completions",
                &json!({"model": id, "messages": [{"role":"user","content":"hi"}], "stream": true}),
            )
            .send()
            .await
            .expect("streamed chat response")
            .text()
            .await
            .expect("SSE body");
        for chunk in stream
            .lines()
            .filter_map(|line| line.strip_prefix("data: "))
            .filter(|payload| *payload != "[DONE]")
            .filter_map(|payload| serde_json::from_str::<Value>(payload).ok())
        {
            assert_eq!(chunk["model"], id.as_str(), "streamed chat identity");
        }

        // Native Responses preserves the exact upstream stream and model id.
        let response = codex
            .post(
                "/api/services/openai/v1/responses",
                &json!({"model": id, "input": "hi"}),
            )
            .send()
            .await
            .expect("buffered responses response");
        assert!(response.headers().get("x-router-upstream-model").is_none());
        let payload = response_payload(response).await;
        assert_eq!(payload["model"], id.as_str(), "buffered responses identity");
        assert!(payload.get("x_router_upstream_model").is_none());

        // Streaming Responses.
        let stream = codex
            .post(
                "/api/services/openai/v1/responses",
                &json!({"model": id, "input": "hi", "stream": true}),
            )
            .send()
            .await
            .expect("streamed responses response")
            .text()
            .await
            .expect("SSE body");
        for event in stream
            .lines()
            .filter_map(|line| line.strip_prefix("data: "))
            .filter(|payload| *payload != "[DONE]")
            .filter_map(|payload| serde_json::from_str::<Value>(payload).ok())
        {
            let Some(model) = event["response"]["model"].as_str() else {
                continue;
            };
            assert_eq!(model, id.as_str(), "streamed responses identity: {event}");
        }
    }
}

/// Issue #189 and #389: one administrator credential manages every admin
/// surface, but does not silently gain authority over a personal subscription.
/// A separately client-bound token is required for model access.
#[tokio::test]
async fn an_admin_credential_manages_tokens_without_inheriting_subscription_access() {
    let router = TestRouter::start(UpstreamProvider::Anthropic).await;

    // Every shape an administrator can hold: the environment-supplied
    // `TOKEN_ADMIN_KEY`, and an admin-scoped `la_sk_` JWT — the credential the
    // web and chat first-visitor claims now mint.
    let admin_jwt = router
        .token_manager
        .issue_admin_token(1, "issue-189-admin")
        .expect("issue admin token");
    for credential in ["admin-only", admin_jwt.as_str()] {
        let admin = router
            .get_as("/api/management/tokens", credential)
            .send()
            .await
            .expect("admin response");
        assert_eq!(admin.status(), StatusCode::OK);

        let catalog = router
            .get_as("/api/services/openai/v1/models", credential)
            .send()
            .await
            .expect("catalog response");
        assert_eq!(catalog.status(), StatusCode::FORBIDDEN);
        assert!(
            catalog
                .text()
                .await
                .expect("catalog denial")
                .contains("administrative credentials do not imply consumer-subscription access")
        );
    }

    // Revocation still removes all authority from the administrative JWT.
    let id = router
        .token_manager
        .list_tokens()
        .expect("list")
        .into_iter()
        .find(|record| record.label == "issue-189-admin")
        .expect("record")
        .id;
    router.token_manager.revoke_token(&id).expect("revoke");
    for path in ["/api/management/tokens", "/api/services/openai/v1/models"] {
        let response = router
            .get_as(path, &admin_jwt)
            .send()
            .await
            .expect("response");
        assert!(
            response.status() == StatusCode::UNAUTHORIZED
                || response.status() == StatusCode::FORBIDDEN,
            "{path} must reject a revoked admin credential, got {}",
            response.status()
        );
    }
}

#[path = "cases_regressions_server_tools.rs"]
mod server_tools;
