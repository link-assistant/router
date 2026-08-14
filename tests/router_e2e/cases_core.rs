use super::*;

#[tokio::test]
async fn request_larger_than_logging_buffer_reaches_handler() {
    let router = TestRouter::start(UpstreamProvider::Anthropic).await;
    let body = vec![b'x'; 10 * 1024 * 1024 + 1];

    let response = router
        .client
        .post(format!("{}/test/large-request", router.url))
        .body(body)
        .send()
        .await
        .expect("large request response");

    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(
        response.text().await.expect("large response body"),
        (10 * 1024 * 1024 + 1).to_string()
    );
    let log = std::fs::read_to_string(router.log_root.join("unauthenticated/requests.jsonl"))
        .expect("request log");
    assert!(log.contains("client_request"));
    assert!(log.contains("[OMITTED:"));
    assert!(!log.contains("client_request_error"));
}

#[tokio::test]
async fn configured_proxy_body_ceiling_returns_413_without_reaching_upstream() {
    let router = TestRouter::start_with_max_request_bytes(UpstreamProvider::Anthropic, 1024).await;
    let response = router
        .post(
            "/v1/messages",
            &json!({
                "model":"claude-sonnet-4-5",
                "max_tokens":64,
                "messages":[{"role":"user","content":"x".repeat(2048)}]
            }),
        )
        .send()
        .await
        .expect("oversize response");

    assert_eq!(response.status(), StatusCode::PAYLOAD_TOO_LARGE);
    let payload: Value = response.json().await.expect("Anthropic error JSON");
    assert_eq!(payload["type"], "error");
    assert!(
        payload["error"]["message"]
            .as_str()
            .is_some_and(|message| message.contains("1024 byte proxy limit"))
    );
    assert!(router.requests.lock().expect("stub requests").is_empty());
}

#[tokio::test]
async fn anthropic_upstream_returns_each_client_dialect_and_pinned_alias() {
    let router = TestRouter::start(UpstreamProvider::Anthropic).await;
    let cases = [
        (
            "/v1/messages",
            json!({"model":"claude-sonnet-4-5","max_tokens":64,"messages":[{"role":"user","content":"hi"}]}),
            "content",
        ),
        (
            "/api/anthropic/v1/messages",
            json!({"model":"claude-sonnet-4-5","max_tokens":64,"messages":[{"role":"user","content":"hi"}]}),
            "content",
        ),
        (
            "/v1/chat/completions",
            json!({"model":"claude-sonnet-4-5","messages":[{"role":"user","content":"hi"}]}),
            "choices",
        ),
        (
            "/api/codex/v1/chat/completions",
            json!({"model":"claude-sonnet-4-5","messages":[{"role":"user","content":"hi"}]}),
            "choices",
        ),
        (
            "/api/qwen/v1/chat/completions",
            json!({"model":"claude-sonnet-4-5","messages":[{"role":"user","content":"hi"}]}),
            "choices",
        ),
        (
            "/api/openai/v1/responses",
            json!({"model":"claude-sonnet-4-5","input":"hi"}),
            "output",
        ),
        (
            "/api/qwen/v1/responses",
            json!({"model":"claude-sonnet-4-5","input":"hi"}),
            "output",
        ),
    ];

    for (path, body, envelope) in cases {
        let response = router
            .post(path, &body)
            .send()
            .await
            .expect("router response");
        assert_eq!(response.status(), StatusCode::OK, "{path}");
        let payload: Value = response.json().await.expect("JSON client response");
        assert!(
            payload[envelope].is_array(),
            "{path} must return {envelope}[]"
        );
    }
}

#[tokio::test]
async fn both_upstream_dialects_serve_all_three_buffered_client_surfaces() {
    for (provider, requested_model, served_model) in [
        (
            UpstreamProvider::Anthropic,
            "claude-sonnet-4-5",
            "claude-sonnet-4-5",
        ),
        (UpstreamProvider::Codex, "gpt-5", "gpt-5"),
    ] {
        let router = TestRouter::start(provider).await;
        let cases = [
            (
                "/v1/messages",
                json!({"model":requested_model,"max_tokens":64,"messages":[{"role":"user","content":"hi"}]}),
                "content",
            ),
            (
                "/v1/chat/completions",
                json!({"model":requested_model,"messages":[{"role":"user","content":"hi"}]}),
                "choices",
            ),
            (
                "/v1/responses",
                json!({"model":requested_model,"input":"hi"}),
                "output",
            ),
        ];

        for (path, body, envelope) in cases {
            let response = router
                .post(path, &body)
                .send()
                .await
                .expect("cross-dialect response");
            assert_eq!(response.status(), StatusCode::OK, "{provider:?} {path}");
            let payload: Value = response.json().await.expect("JSON response");
            assert!(
                payload[envelope].is_array(),
                "{provider:?} {path} must return {envelope}[]"
            );
            assert_eq!(
                payload["model"], served_model,
                "{provider:?} {path} must report the upstream-served model"
            );
        }
    }
}

#[tokio::test]
async fn every_surface_and_upstream_completes_a_two_turn_tool_loop() {
    for (provider, model) in [
        (UpstreamProvider::Anthropic, "claude-sonnet-4-5"),
        (UpstreamProvider::Codex, "gpt-5"),
    ] {
        for surface in ["messages", "chat", "responses"] {
            let router = TestRouter::start(provider).await;
            let (path, first_body) = match surface {
                "messages" => (
                    "/v1/messages",
                    json!({
                        "model":model,
                        "max_tokens":256,
                        "messages":[{"role":"user","content":"look up value"}],
                        "tools":[{"name":"lookup","description":"lookup","input_schema":{"type":"object"}}]
                    }),
                ),
                "chat" => (
                    "/v1/chat/completions",
                    json!({
                        "model":model,
                        "messages":[{"role":"user","content":"look up value"}],
                        "tools":[{"type":"function","function":{"name":"lookup","description":"lookup","parameters":{"type":"object"}}}]
                    }),
                ),
                _ => (
                    "/v1/responses",
                    json!({
                        "model":model,
                        "input":"look up value",
                        "tools":[{"type":"function","name":"lookup","description":"lookup","parameters":{"type":"object"}}]
                    }),
                ),
            };
            let first_response = router
                .post(path, &first_body)
                .send()
                .await
                .expect("first tool-loop response");
            assert_eq!(
                first_response.status(),
                StatusCode::OK,
                "{provider:?} {surface} first turn"
            );
            let first: Value = first_response.json().await.expect("first tool-loop JSON");

            let (call_id, second_body) = match surface {
                "messages" => {
                    let call = first["content"]
                        .as_array()
                        .and_then(|items| items.iter().find(|item| item["type"] == "tool_use"))
                        .expect("Anthropic tool_use");
                    let call_id = call["id"].as_str().expect("tool_use id").to_string();
                    (
                        call_id.clone(),
                        json!({
                            "model":model,
                            "max_tokens":256,
                            "messages":[
                                {"role":"user","content":"look up value"},
                                {"role":"assistant","content":first["content"].clone()},
                                {"role":"user","content":[{"type":"tool_result","tool_use_id":call_id,"content":"42"}]}
                            ],
                            "tools":[{"name":"lookup","description":"lookup","input_schema":{"type":"object"}}]
                        }),
                    )
                }
                "chat" => {
                    let call = &first["choices"][0]["message"]["tool_calls"][0];
                    let call_id = call["id"].as_str().expect("tool call id").to_string();
                    (
                        call_id.clone(),
                        json!({
                            "model":model,
                            "messages":[
                                {"role":"user","content":"look up value"},
                                first["choices"][0]["message"].clone(),
                                {"role":"tool","tool_call_id":call_id,"content":"42"}
                            ],
                            "tools":[{"type":"function","function":{"name":"lookup","description":"lookup","parameters":{"type":"object"}}}]
                        }),
                    )
                }
                _ => {
                    let call = first["output"]
                        .as_array()
                        .and_then(|items| items.iter().find(|item| item["type"] == "function_call"))
                        .expect("Responses function_call")
                        .clone();
                    let call_id = call["call_id"]
                        .as_str()
                        .expect("Responses call_id")
                        .to_string();
                    (
                        call_id.clone(),
                        json!({
                            "model":model,
                            "input":[
                                {"role":"user","content":"look up value"},
                                call,
                                {"type":"function_call_output","call_id":call_id,"output":"42"}
                            ],
                            "tools":[{"type":"function","name":"lookup","description":"lookup","parameters":{"type":"object"}}]
                        }),
                    )
                }
            };
            assert_eq!(call_id, "call_router_e2e", "{provider:?} {surface}");

            let second_response = router
                .post(path, &second_body)
                .send()
                .await
                .expect("second tool-loop response");
            assert_eq!(
                second_response.status(),
                StatusCode::OK,
                "{provider:?} {surface} second turn"
            );
            let final_payload: Value = second_response.json().await.expect("final tool-loop JSON");
            let final_text = match surface {
                "messages" => final_payload["content"][0]["text"].as_str(),
                "chat" => final_payload["choices"][0]["message"]["content"].as_str(),
                _ => final_payload["output"][0]["content"][0]["text"].as_str(),
            };
            assert_eq!(final_text, Some("stub answer"), "{provider:?} {surface}");

            let requests = router.requests.lock().expect("stub requests");
            assert_eq!(requests.len(), 2, "{provider:?} {surface}");
            let result_id = if provider == UpstreamProvider::Codex {
                requests[1]["input"]
                    .as_array()
                    .and_then(|items| {
                        items
                            .iter()
                            .find(|item| item["type"] == "function_call_output")
                    })
                    .and_then(|item| item["call_id"].as_str())
            } else {
                requests[1]["messages"]
                    .as_array()
                    .into_iter()
                    .flatten()
                    .filter_map(|message| message["content"].as_array())
                    .flatten()
                    .find(|item| item["type"] == "tool_result")
                    .and_then(|item| item["tool_use_id"].as_str())
            };
            assert_eq!(result_id, Some("call_router_e2e"), "{provider:?} {surface}");
        }
    }
}

#[tokio::test]
async fn both_upstream_dialects_stream_all_three_client_surfaces() {
    for (provider, model, served_model) in [
        (
            UpstreamProvider::Anthropic,
            "claude-sonnet-4-5",
            "claude-sonnet-4-5",
        ),
        (UpstreamProvider::Codex, "gpt-5", "gpt-5"),
    ] {
        let router = TestRouter::start(provider).await;
        for (path, body) in [
            (
                "/v1/messages",
                json!({"model":model,"max_tokens":64,"messages":[{"role":"user","content":"hi"}],"stream":true}),
            ),
            (
                "/v1/chat/completions",
                json!({"model":model,"messages":[{"role":"user","content":"hi"}],"stream":true}),
            ),
            (
                "/v1/responses",
                json!({"model":model,"input":"hi","stream":true}),
            ),
        ] {
            let response = router
                .post(path, &body)
                .send()
                .await
                .expect("streamed matrix response");
            assert_eq!(response.status(), StatusCode::OK, "{provider:?} {path}");
            assert!(
                response
                    .headers()
                    .get("content-type")
                    .and_then(|value| value.to_str().ok())
                    .is_some_and(|value| value.starts_with("text/event-stream")),
                "{provider:?} {path} must be SSE"
            );
            let stream = response.text().await.expect("stream body");
            assert!(stream.contains("stub answer"), "{provider:?} {path}");
            assert!(stream.contains(served_model), "{provider:?} {path}");
            match path {
                "/v1/messages" => {
                    assert!(stream.contains("event: message_start"));
                    assert!(stream.contains("event: message_stop"));
                }
                "/v1/chat/completions" => {
                    assert!(stream.contains("chat.completion.chunk"));
                    assert!(stream.trim_end().ends_with("data: [DONE]"));
                }
                _ => {
                    assert!(stream.contains("event: response.created"));
                    assert!(stream.contains("event: response.completed"));
                    assert!(stream.trim_end().ends_with("data: [DONE]"));
                }
            }
        }
    }
}

#[tokio::test]
async fn anthropic_upstream_relays_vendor_headers_across_client_dialects() {
    let router = TestRouter::start(UpstreamProvider::Anthropic).await;
    let cases = [
        (
            "/v1/messages",
            json!({"model":"claude-sonnet-4-5","max_tokens":64,"messages":[{"role":"user","content":"hi"}]}),
        ),
        (
            "/v1/responses",
            json!({"model":"claude-sonnet-4-5","input":"hi"}),
        ),
        (
            "/v1/chat/completions",
            json!({"model":"claude-sonnet-4-5","messages":[{"role":"user","content":"hi"}]}),
        ),
    ];

    for (path, body) in cases {
        let response = router
            .post(path, &body)
            .send()
            .await
            .expect("router response");
        assert_eq!(response.status(), StatusCode::OK, "{path}");
        assert_eq!(
            response
                .headers()
                .get("anthropic-ratelimit-unified-reset")
                .and_then(|value| value.to_str().ok()),
            Some("1786546200"),
            "{path} must relay Anthropic quota headers"
        );
        assert_eq!(
            response
                .headers()
                .get("request-id")
                .and_then(|value| value.to_str().ok()),
            Some("req_anthropic_stub_123"),
            "{path} must relay the vendor request ID"
        );
    }
}

#[tokio::test]
async fn native_anthropic_server_tools_and_beta_headers_survive_the_full_route() {
    let router = TestRouter::start(UpstreamProvider::Anthropic).await;
    let response = router
        .post(
            "/v1/messages",
            &json!({
                "model":"claude-sonnet-4-5",
                "max_tokens":256,
                "messages":[{"role":"user","content":"research Rust"}],
                "tools":[
                    {"type":"web_search_20250305","name":"web_search","max_uses":2},
                    {"type":"web_fetch_20250910","name":"web_fetch","max_uses":2}
                ]
            }),
        )
        .header("anthropic-beta", "web-fetch-2025-09-10")
        .send()
        .await
        .expect("native server-tool response");
    assert_eq!(response.status(), StatusCode::OK);
    let payload: Value = response.json().await.expect("Anthropic JSON");
    let types = payload["content"]
        .as_array()
        .expect("content blocks")
        .iter()
        .filter_map(|block| block["type"].as_str())
        .collect::<Vec<_>>();
    assert_eq!(
        types,
        [
            "server_tool_use",
            "web_search_tool_result",
            "server_tool_use",
            "web_fetch_tool_result"
        ]
    );
    assert_eq!(
        payload["usage"]["server_tool_use"]["web_search_requests"],
        1
    );
    assert_eq!(payload["usage"]["server_tool_use"]["web_fetch_requests"], 1);

    let requests = router.requests.lock().expect("stub requests");
    assert_eq!(requests[0]["tools"][0]["type"], "web_search_20250305");
    assert_eq!(requests[0]["tools"][1]["type"], "web_fetch_20250910");
    drop(requests);
    let beta = {
        let headers = router.upstream_headers.lock().expect("stub headers");
        headers[0]["anthropic-beta"]
            .to_str()
            .expect("ASCII beta header")
            .to_string()
    };
    assert!(beta.contains("web-fetch-2025-09-10"));
    assert!(beta.contains(proxy::OAUTH_BETA_FLAG));
}

#[tokio::test]
async fn anthropic_web_search_translates_to_codex_without_becoming_a_client_tool() {
    let router = TestRouter::start(UpstreamProvider::Codex).await;
    let response = router
        .post(
            "/v1/messages",
            &json!({
                "model":"gpt-5",
                "max_tokens":256,
                "messages":[{"role":"user","content":"research Rust"}],
                "tools":[{"type":"web_search_20250305","name":"web_search","max_uses":2}]
            }),
        )
        .send()
        .await
        .expect("translated server-tool response");

    assert_eq!(response.status(), StatusCode::OK);
    let payload: Value = response.json().await.expect("Anthropic JSON");
    assert_eq!(payload["content"][0]["type"], "server_tool_use");
    assert_eq!(payload["content"][0]["name"], "web_search");
    assert_eq!(payload["content"][1]["type"], "web_search_tool_result");
    assert_eq!(
        payload["usage"]["server_tool_use"]["web_search_requests"],
        1
    );
    assert!(
        payload["content"]
            .as_array()
            .expect("content blocks")
            .iter()
            .all(|block| block["type"] != "tool_use")
    );

    let requests = router.requests.lock().expect("stub requests");
    assert_eq!(requests[0]["tools"][0]["type"], "web_search");
    assert!(requests[0]["tools"][0].get("function").is_none());
    drop(requests);
}

#[tokio::test]
async fn responses_web_search_translates_to_anthropic_with_result_and_usage() {
    let router = TestRouter::start(UpstreamProvider::Anthropic).await;
    let response = router
        .post(
            "/v1/responses",
            &json!({
                "model":"claude-sonnet-4-5",
                "input":"research Rust",
                "tools":[{"type":"web_search","max_uses":2}]
            }),
        )
        .send()
        .await
        .expect("translated Responses server-tool response");

    assert_eq!(response.status(), StatusCode::OK);
    let payload: Value = response.json().await.expect("Responses JSON");
    assert_eq!(payload["output"][0]["type"], "web_search_call");
    assert_eq!(payload["output"][0]["status"], "completed");
    assert_eq!(
        payload["output"][0]["result"][0]["type"],
        "web_search_result"
    );
    assert_eq!(
        payload["usage"]["server_tool_use"]["web_search_requests"],
        1
    );
    assert!(
        payload["output"]
            .as_array()
            .expect("output items")
            .iter()
            .all(|item| item["type"] != "function_call")
    );

    let requests = router.requests.lock().expect("stub requests");
    assert_eq!(requests[0]["tools"][0]["type"], "web_search_20250305");
    assert_eq!(requests[0]["tools"][0]["name"], "web_search");
    drop(requests);
}

#[tokio::test]
async fn responses_stream_has_complete_named_lifecycle() {
    for (provider, model) in [
        (UpstreamProvider::Anthropic, "claude-sonnet-4-5"),
        (UpstreamProvider::Codex, "gpt-5"),
    ] {
        let router = TestRouter::start(provider).await;
        let response = router
            .post(
                "/v1/responses",
                &json!({"model":model,"input":"hi","stream":true}),
            )
            .send()
            .await
            .expect("streaming response");
        assert_eq!(response.status(), StatusCode::OK);
        let stream = response.text().await.expect("SSE body");
        let names = stream
            .lines()
            .filter_map(|line| line.strip_prefix("event: "))
            .collect::<Vec<_>>();
        assert_eq!(
            names,
            [
                "response.created",
                "response.in_progress",
                "response.output_item.added",
                "response.content_part.added",
                "response.output_text.delta",
                "response.output_text.done",
                "response.content_part.done",
                "response.output_item.done",
                "response.completed",
            ],
            "wrong lifecycle for {model}"
        );
        assert!(stream.trim_end().ends_with("data: [DONE]"));
    }
}
