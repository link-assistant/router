use super::*;

#[tokio::test]
async fn chat_to_codex_preserves_supported_history_and_rejects_the_rest_before_upstream() {
    let router = TestRouter::start(UpstreamProvider::Codex).await;
    for stream in [false, true] {
        let response = router
            .post(
                "/api/services/openai/v1/chat/completions",
                &json!({
                    "model":"gpt-5","stream":stream,
                    "messages":[
                        {"role":"user","content":[
                            {"type":"text","text":"inspect"},
                            {"type":"image_url","image_url":{"url":"https://example.test/image.png","detail":"high"},
                             "prompt_cache_breakpoint":{"mode":"explicit"}},
                            {"type":"file","file":{"file_data":"data:text/plain;base64,SGk=","filename":"fixture.txt"},
                             "prompt_cache_breakpoint":{"mode":"explicit"}}
                        ]},
                        {"role":"assistant","content":[
                            {"type":"text","text":"checking"},
                            {"type":"refusal","refusal":"cannot inspect"}
                        ],"tool_calls":[{
                            "id":"call_1","type":"function",
                            "function":{"name":"inspect","arguments":"{\"id\":1}"}
                        }]},
                        {"role":"tool","tool_call_id":"call_1","content":[{
                            "type":"text","text":"done",
                            "prompt_cache_breakpoint":{"mode":"explicit"}
                        }]}
                    ]
                }),
            )
            .send()
            .await
            .expect("Chat-to-Codex request");
        assert_eq!(response.status(), StatusCode::OK);
    }
    {
        let requests = router.requests.lock().expect("stub requests");
        assert_eq!(requests.len(), 2);
        for request in requests.iter() {
            // Codex speaks Responses SSE natively; Router buffers it only for
            // the non-streaming Chat caller.
            assert_eq!(request["stream"], true);
            assert_eq!(
                request["input"][0]["content"][1],
                json!({
                    "type":"input_image","image_url":"https://example.test/image.png","detail":"high",
                    "prompt_cache_breakpoint":{"mode":"explicit"}
                })
            );
            assert_eq!(
                request["input"][0]["content"][2],
                json!({
                    "type":"input_file","file_data":"data:text/plain;base64,SGk=","filename":"fixture.txt",
                    "prompt_cache_breakpoint":{"mode":"explicit"}
                })
            );
            assert_eq!(
                request["input"][1]["content"][1],
                json!({
                    "type":"refusal","refusal":"cannot inspect"
                })
            );
            assert_eq!(request["input"][2]["type"], "function_call");
            assert_eq!(request["input"][3]["type"], "function_call_output");
            assert_eq!(
                request["input"][3]["output"][0]["prompt_cache_breakpoint"],
                json!({"mode":"explicit"})
            );
        }
    }

    let before = router.requests.lock().expect("stub requests").len();
    for messages in [
        json!([{"role":"system","content":[{
            "type":"text","text":"policy",
            "prompt_cache_breakpoint":{"mode":"explicit"}
        }]}]),
        json!([{"role":"user","content":[{
            "type":"text","text":"hello",
            "prompt_cache_breakpoint":{"type":"default"}
        }]}]),
    ] {
        let response = router
            .post(
                "/api/services/openai/v1/chat/completions",
                &json!({"model":"gpt-5","messages":messages}),
            )
            .send()
            .await
            .expect("rejected incompatible cache history");
        assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    }
    for messages in [
        json!([{"role":"user","content":[{"type":"input_audio","input_audio":{"data":"AAA","format":"wav"}}]}]),
        json!([{"role":"assistant","content":"prior","audio":{"id":"audio_1"}}]),
        json!([{"role":"assistant","content":null,"function_call":{"name":"legacy","arguments":"{}"}}]),
        json!([{"role":"function","name":"legacy","content":"result"}]),
        json!([{"role":"user","content":[{"type":"image_url","image_url":{}}]}]),
        json!([{"role":"user","content":[{"type":"file","file":{"filename":"only.txt"}}]}]),
        json!([{"role":"user","content":[{"type":"unknown","value":"x"}]}]),
    ] {
        let response = router
            .post(
                "/api/services/openai/v1/chat/completions",
                &json!({"model":"gpt-5","messages":messages}),
            )
            .send()
            .await
            .expect("rejected Chat-to-Codex history");
        assert_eq!(response.status(), StatusCode::BAD_REQUEST);
        let error: Value = response.json().await.expect("Chat error body");
        assert_eq!(error["error"]["type"], "invalid_request_error");
    }
    assert_eq!(router.requests.lock().expect("stub requests").len(), before);
}

#[tokio::test]
async fn chat_generation_controls_are_native_or_rejected_before_anthropic() {
    let native = TestRouter::start(UpstreamProvider::OpenAICompatible).await;
    let native_body = json!({
        "model": "gpt-5",
        "messages": [{"role": "user", "content": "answer"}],
        "frequency_penalty": 1.25,
        "presence_penalty": -0.5,
        "logit_bias": {"42": 10},
        "seed": 1234
    });
    let native_response = native
        .post("/api/services/openai/v1/chat/completions", &native_body)
        .send()
        .await
        .expect("native Chat request");
    let native_status = native_response.status();
    let native_response_body = native_response.text().await.expect("native response body");
    assert_eq!(native_status, StatusCode::OK, "{native_response_body}");
    assert_eq!(
        native.requests.lock().expect("stub requests").as_slice(),
        std::slice::from_ref(&native_body)
    );

    let anthropic = TestRouter::start(UpstreamProvider::Anthropic).await;
    for stream in [false, true] {
        for unsupported in [
            json!({"frequency_penalty": 1.25}),
            json!({"presence_penalty": -0.5}),
            json!({"logit_bias": {"42": 10}}),
            json!({"seed": 1234}),
        ] {
            let mut body = json!({
                "model": "claude-test",
                "messages": [{"role": "user", "content": "answer"}],
                "stream": stream
            });
            body.as_object_mut()
                .expect("Chat request object")
                .extend(unsupported.as_object().expect("control object").clone());
            let response = anthropic
                .post("/api/services/openai/v1/chat/completions", &body)
                .send()
                .await
                .expect("unsupported bridged Chat request");
            assert_eq!(response.status(), StatusCode::BAD_REQUEST);
            let payload: Value = response.json().await.expect("OpenAI error");
            assert_eq!(payload["error"]["type"], "invalid_request_error");
        }
    }
    assert!(
        anthropic.requests.lock().expect("stub requests").is_empty(),
        "unsupported generation controls must fail before inference"
    );

    for stream in [false, true] {
        let response = anthropic
            .post(
                "/api/services/openai/v1/chat/completions",
                &json!({
                    "model": "claude-test",
                    "messages": [{"role": "user", "content": "answer"}],
                    "stream": stream,
                    "frequency_penalty": 0,
                    "presence_penalty": 0,
                    "logit_bias": {}
                }),
            )
            .send()
            .await
            .expect("neutral bridged Chat request");
        assert_eq!(response.status(), StatusCode::OK);
    }
    assert_eq!(anthropic.requests.lock().expect("stub requests").len(), 2);
}

#[tokio::test]
async fn safety_identifiers_and_responses_top_p_cross_bridges_without_leaking_or_loss() {
    let anthropic = TestRouter::start(UpstreamProvider::Anthropic).await;
    for stream in [false, true] {
        let chat = anthropic
            .post(
                "/api/services/openai/v1/chat/completions",
                &json!({
                    "model": "claude-test", "stream": stream,
                    "messages": [{"role": "user", "content": "answer"}],
                    "safety_identifier": "synthetic-user-42"
                }),
            )
            .send()
            .await
            .expect("Chat safety identifier bridge");
        assert_eq!(chat.status(), StatusCode::OK);

        let responses = anthropic
            .post(
                "/api/services/openai/v1/responses",
                &json!({
                    "model": "claude-test", "stream": stream, "input": "answer",
                    "safety_identifier": "synthetic-user-42", "top_p": 0.25
                }),
            )
            .send()
            .await
            .expect("Responses safety identifier bridge");
        assert_eq!(responses.status(), StatusCode::OK);
    }
    {
        let requests = anthropic.requests.lock().expect("stub requests");
        assert_eq!(requests.len(), 4);
        for request in requests.iter() {
            assert_eq!(request["metadata"]["user_id"], "synthetic-user-42");
        }
        assert_eq!(requests[1]["top_p"], 0.25);
        assert_eq!(requests[3]["top_p"], 0.25);
        drop(requests);
    }

    let before = anthropic.requests.lock().expect("stub requests").len();
    for (path, body) in [
        (
            "/api/services/openai/v1/chat/completions",
            json!({"model": "claude-test", "messages": [{"role": "user", "content": "answer"}], "safety_identifier": 42}),
        ),
        (
            "/api/services/openai/v1/responses",
            json!({"model": "claude-test", "input": "answer", "safety_identifier": "x".repeat(65)}),
        ),
        (
            "/api/services/openai/v1/responses",
            json!({"model": "claude-test", "input": "answer", "top_p": 1.1}),
        ),
        (
            "/api/services/openai/v1/responses",
            json!({"model": "claude-test", "input": "answer", "temperature": 0.5, "top_p": 0.5}),
        ),
    ] {
        let response = anthropic
            .post(path, &body)
            .send()
            .await
            .expect("invalid bridge request");
        assert_eq!(response.status(), StatusCode::BAD_REQUEST);
        let error: Value = response.json().await.expect("OpenAI error");
        assert_eq!(error["error"]["type"], "invalid_request_error");
        assert!(!error.to_string().contains("synthetic-user-42"));
    }
    assert_eq!(
        anthropic.requests.lock().expect("stub requests").len(),
        before
    );

    let codex = TestRouter::start(UpstreamProvider::Codex).await;
    for stream in [false, true] {
        let response = codex
            .post(
                "/api/services/anthropic/v1/messages",
                &json!({
                    "model": "claude-test", "max_tokens": 64, "stream": stream,
                    "messages": [{"role": "user", "content": "answer"}],
                    "metadata": {"user_id": "synthetic-user-42"}
                }),
            )
            .send()
            .await
            .expect("Anthropic safety identifier bridge");
        assert_eq!(response.status(), StatusCode::OK);
    }
    let requests = codex.requests.lock().expect("stub requests");
    assert_eq!(requests.len(), 2);
    for request in requests.iter() {
        assert_eq!(request["safety_identifier"], "synthetic-user-42");
    }
}

#[tokio::test]
async fn responses_structured_tool_output_reaches_anthropic_losslessly() {
    let router = TestRouter::start(UpstreamProvider::Anthropic).await;
    let response = router
        .post(
            "/api/services/openai/v1/responses",
            &json!({
                "model": "claude-sonnet-4-5",
                "input": [
                    {"type": "function_call", "call_id": "call_1", "name": "inspect", "arguments": "{}"},
                    {"type": "function_call_output", "call_id": "call_1", "output": [
                        {"type": "input_text", "text": "caption"},
                        {"type": "input_image", "image_url": "data:image/png;base64,AAA"},
                        {"type": "input_file", "file_url": "https://example.test/report.pdf", "filename": "report.pdf"}
                    ]},
                    {"role": "user", "content": [{"type": "input_text", "text": "continue"}]}
                ]
            }),
        )
        .send()
        .await
        .expect("bridged Responses request");
    assert_eq!(response.status(), StatusCode::OK);

    let requests = router.requests.lock().expect("stub requests");
    assert_eq!(requests.len(), 1);
    assert_eq!(
        requests[0]["messages"],
        json!([
            {"role": "assistant", "content": [{"type": "tool_use", "id": "call_1", "name": "inspect", "input": {}}]},
            {"role": "user", "content": [{
                "type": "tool_result", "tool_use_id": "call_1", "content": [
                    {"type": "text", "text": "caption"},
                    {"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": "AAA"}},
                    {"type": "document", "source": {"type": "url", "url": "https://example.test/report.pdf"}, "title": "report.pdf"}
                ]
            }]},
            {"role": "user", "content": [{"type": "text", "text": "continue"}]}
        ])
    );
    drop(requests);
}

#[tokio::test]
async fn malformed_responses_history_is_rejected_before_anthropic() {
    let router = TestRouter::start(UpstreamProvider::Anthropic).await;
    for input in [
        json!([{"type": "function_call_output", "call_id": "call_1", "output": {}}]),
        json!([{"role": "user", "content": [{"type": "input_image", "file_id": "file_openai"}]}]),
        json!([{"type": "reasoning", "id": "rs_1", "encrypted_content": "opaque"}]),
        json!([{"type": "custom_tool_call", "call_id": "call_1", "name": "apply_patch", "input": "patch"}]),
    ] {
        let response = router
            .post(
                "/api/services/openai/v1/responses",
                &json!({"model": "claude-sonnet-4-5", "input": input}),
            )
            .send()
            .await
            .expect("rejected Responses bridge request");
        assert_eq!(response.status(), StatusCode::BAD_REQUEST);
        let payload: Value = response.json().await.expect("Responses error");
        assert_eq!(payload["error"]["type"], "invalid_request_error");
    }
    assert!(router.requests.lock().expect("stub requests").is_empty());
}

#[tokio::test]
async fn anthropic_tool_results_and_documents_reach_codex_in_original_order() {
    let router = TestRouter::start(UpstreamProvider::Codex).await;
    let response = router
        .post(
            "/api/services/anthropic/v1/messages",
            &json!({
                "model": "claude-opus-test",
                "max_tokens": 256,
                "messages": [
                    {"role": "assistant", "content": [
                        {"type": "tool_use", "id": "one", "name": "first", "input": {}},
                        {"type": "tool_use", "id": "two", "name": "second", "input": {}}
                    ]},
                    {"role": "user", "content": [
                        {"type": "tool_result", "tool_use_id": "one", "content": [{
                            "type": "image", "source": {"type": "url", "url": "https://example.test/a.png"}
                        }]},
                        {"type": "tool_result", "tool_use_id": "two", "content": [{
                            "type": "document", "source": {"type": "text", "media_type": "text/plain", "data": "report"}, "title": "report.txt"
                        }]},
                        {"type": "text", "text": "continue"}
                    ]}
                ]
            }),
        )
        .send()
        .await
        .expect("Anthropic bridge request");
    assert_eq!(response.status(), StatusCode::OK);

    let requests = router.requests.lock().expect("stub requests");
    assert_eq!(requests.len(), 1);
    let input = requests[0]["input"]
        .as_array()
        .expect("Responses input")
        .clone();
    drop(requests);
    assert_eq!(
        input
            .iter()
            .map(|item| {
                item.get("type")
                    .and_then(Value::as_str)
                    .or_else(|| item.get("role").and_then(Value::as_str))
                    .unwrap_or_default()
            })
            .collect::<Vec<_>>(),
        [
            "function_call",
            "function_call",
            "function_call_output",
            "function_call_output",
            "user"
        ]
    );
    assert_eq!(input[2]["output"][0]["type"], "input_image");
    assert_eq!(input[3]["output"][0]["type"], "input_file");
    assert_eq!(input[4]["content"][0]["text"], "continue");
}

#[tokio::test]
async fn anthropic_server_tool_continuations_keep_calls_results_and_order() {
    let router = TestRouter::start(UpstreamProvider::Codex).await;
    let response = router
        .post(
            "/api/services/anthropic/v1/messages",
            &json!({
                "model": "claude-test", "max_tokens": 128,
                "messages": [
                    {"role": "assistant", "content": [
                        {"type": "server_tool_use", "id": "search_1", "name": "web_search", "input": {"type": "search", "query": "Rust"}},
                        {"type": "web_search_tool_result", "tool_use_id": "search_1", "content": [
                            {"type": "web_search_result", "url": "https://www.rust-lang.org", "title": "Rust"}
                        ]},
                        {"type": "server_tool_use", "id": "fetch_1", "name": "web_fetch", "input": {"url": "https://www.rust-lang.org"}},
                        {"type": "web_fetch_tool_result", "tool_use_id": "fetch_1", "content": {
                            "type": "web_fetch_result", "url": "https://www.rust-lang.org",
                            "content": {"type": "document", "source": {"type": "text", "media_type": "text/plain", "data": "Rust"}}
                        }},
                        {"type": "text", "text": "I found it."}
                    ]},
                    {"role": "user", "content": "Summarize it"}
                ]
            }),
        )
        .send()
        .await
        .expect("server-tool continuation");
    assert_eq!(response.status(), StatusCode::OK);

    let requests = router.requests.lock().expect("stub requests");
    let input = requests[0]["input"]
        .as_array()
        .expect("Responses input")
        .clone();
    drop(requests);
    assert_eq!(input[0]["type"], "web_search_call");
    assert_eq!(input[0]["id"], "search_1");
    assert_eq!(input[0]["result"][0]["title"], "Rust");
    assert_eq!(input[1]["type"], "web_fetch_call");
    assert_eq!(input[1]["id"], "fetch_1");
    assert_eq!(input[1]["result"]["type"], "web_fetch_result");
    assert_eq!(input[2]["role"], "assistant");
    assert_eq!(input[3]["role"], "user");
}

#[tokio::test]
async fn lossy_anthropic_histories_are_rejected_before_codex() {
    let router = TestRouter::start(UpstreamProvider::Codex).await;
    for content in [json!([{
        "type": "thinking", "thinking": "do not expose", "signature": "opaque"
    }])] {
        let response = router
            .post(
                "/api/services/anthropic/v1/messages",
                &json!({
                    "model": "claude-test", "max_tokens": 64,
                    "messages": [{"role": "assistant", "content": content}]
                }),
            )
            .send()
            .await
            .expect("rejected Anthropic history");
        assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    }
    assert!(router.requests.lock().expect("stub requests").is_empty());
}

#[tokio::test]
async fn stateful_responses_and_chat_audio_are_rejected_before_anthropic() {
    let router = TestRouter::start(UpstreamProvider::Anthropic).await;
    for state in [
        json!({"previous_response_id": "resp_1"}),
        json!({"conversation": "conv_1"}),
        json!({"previous_response_id": "resp_1", "conversation": "conv_1"}),
    ] {
        let mut body = json!({"model": "claude-sonnet-4-5", "input": "continue"});
        body.as_object_mut()
            .unwrap()
            .extend(state.as_object().unwrap().clone());
        let response = router
            .post("/api/services/openai/v1/responses", &body)
            .send()
            .await
            .expect("stateful bridge rejection");
        assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    }

    for stream in [false, true] {
        let response = router
            .post(
                "/api/services/openai/v1/chat/completions",
                &json!({
                    "model": "claude-sonnet-4-5", "stream": stream,
                    "messages": [{"role": "user", "content": [
                        {"type": "text", "text": "listen"},
                        {"type": "input_audio", "input_audio": {"data": "AAA", "format": "wav"}}
                    ]}]
                }),
            )
            .send()
            .await
            .expect("audio bridge rejection");
        assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    }
    assert!(router.requests.lock().expect("stub requests").is_empty());
}

#[tokio::test]
async fn native_codex_keeps_responses_state_fields() {
    let router = TestRouter::start(UpstreamProvider::Codex).await;
    for (field, value) in [
        ("previous_response_id", json!("resp_1")),
        ("conversation", json!("conv_1")),
    ] {
        let mut body = json!({
            "model": "gpt-5",
            "input": [{"role": "user", "content": [{"type": "input_text", "text": "continue"}]}]
        });
        body[field] = value.clone();
        let response = router
            .post("/api/services/codex/v1/responses", &body)
            .send()
            .await
            .expect("native Responses request");
        assert_eq!(response.status(), StatusCode::OK);
        let requests = router.requests.lock().expect("stub requests");
        assert_eq!(requests.last().unwrap()[field], value);
        drop(requests);
    }
}

#[tokio::test]
async fn structured_outputs_parallel_policy_and_strict_tools_reach_anthropic() {
    let router = TestRouter::start(UpstreamProvider::Anthropic).await;
    for stream in [false, true] {
        let response = router
            .post(
                "/api/services/openai/v1/chat/completions",
                &json!({
                    "model": "claude-sonnet-4-5", "stream": stream,
                    "messages": [{"role": "user", "content": "return JSON"}],
                    "response_format": {"type": "json_schema", "json_schema": {
                        "name": "answer", "strict": true,
                        "schema": {"type": "object", "required": ["answer"]}
                    }},
                    "parallel_tool_calls": false,
                    "tools": [{"type": "function", "function": {
                        "name": "lookup", "strict": true, "parameters": {"type": "object"}
                    }}],
                    "tool_choice": "required"
                }),
            )
            .send()
            .await
            .expect("structured Chat bridge request");
        assert_eq!(response.status(), StatusCode::OK);

        let response = router
            .post(
                "/api/services/openai/v1/responses",
                &json!({
                    "model": "claude-sonnet-4-5", "stream": stream, "input": "return JSON",
                    "text": {"format": {
                        "type": "json_schema", "name": "answer", "strict": true,
                        "schema": {"type": "object", "required": ["answer"]}
                    }},
                    "parallel_tool_calls": false,
                    "tools": [{"type": "function", "name": "lookup", "strict": false, "parameters": {"type": "object"}}],
                    "tool_choice": {"type": "function", "name": "lookup"}
                }),
            )
            .send()
            .await
            .expect("structured Responses bridge request");
        assert_eq!(response.status(), StatusCode::OK);
    }

    let requests = router.requests.lock().expect("stub requests");
    assert_eq!(requests.len(), 4);
    for request in requests.iter() {
        assert_eq!(request["output_config"]["format"]["type"], "json_schema");
        assert_eq!(
            request["output_config"]["format"]["schema"],
            json!({"type": "object", "required": ["answer"]})
        );
        assert_eq!(request["tool_choice"]["disable_parallel_tool_use"], true);
    }
    assert_eq!(requests[0]["tool_choice"]["type"], "any");
    assert_eq!(requests[0]["tools"][0]["strict"], true);
    assert_eq!(requests[1]["tool_choice"]["type"], "tool");
    assert_eq!(requests[1]["tool_choice"]["name"], "lookup");
    assert_eq!(requests[1]["tools"][0]["strict"], false);
    drop(requests);
}

#[tokio::test]
async fn malformed_output_contracts_and_tool_schemas_never_reach_anthropic() {
    let router = TestRouter::start(UpstreamProvider::Anthropic).await;
    let chat_overrides = [
        json!({"n": 2}),
        json!({"modalities": ["audio"], "audio": {"format": "wav", "voice": "alloy"}}),
        json!({"logprobs": true, "top_logprobs": 5}),
        json!({"response_format": {"type": "json_schema", "json_schema": {"name": "bad", "schema": "object"}}}),
        json!({"tools": [{"type": "function", "function": {"name": "bad", "strict": "yes", "parameters": {"type": "object"}}}]}),
    ];
    for stream in [false, true] {
        for fields in &chat_overrides {
            let mut body = json!({
                "model": "claude-sonnet-4-5", "stream": stream,
                "messages": [{"role": "user", "content": "answer"}]
            });
            body.as_object_mut()
                .unwrap()
                .extend(fields.as_object().unwrap().clone());
            let response = router
                .post("/api/services/openai/v1/chat/completions", &body)
                .send()
                .await
                .expect("invalid Chat bridge request");
            assert_eq!(response.status(), StatusCode::BAD_REQUEST, "{body}");
        }
    }
    for text in [
        json!({"format": {"type": "json_schema", "name": "bad", "schema": []}}),
        json!({"format": {"type": "yaml"}}),
    ] {
        let response = router
            .post(
                "/api/services/openai/v1/responses",
                &json!({"model": "claude-sonnet-4-5", "input": "answer", "text": text}),
            )
            .send()
            .await
            .expect("invalid Responses bridge request");
        assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    }
    assert!(router.requests.lock().expect("stub requests").is_empty());
}

#[tokio::test]
async fn anthropic_effort_reaches_codex_without_xhigh_overwrite() {
    let router = TestRouter::start(UpstreamProvider::Codex).await;
    for (effort, expected) in [
        ("low", "low"),
        ("medium", "medium"),
        ("high", "high"),
        ("max", "xhigh"),
    ] {
        let response = router
            .post(
                "/api/services/anthropic/v1/messages",
                &json!({
                    "model": "claude-test", "max_tokens": 128,
                    "messages": [{"role": "user", "content": "answer"}],
                    "output_config": {"effort": effort}
                }),
            )
            .send()
            .await
            .expect("effort bridge request");
        assert_eq!(response.status(), StatusCode::OK);
        let requests = router.requests.lock().expect("stub requests");
        assert_eq!(requests.last().unwrap()["reasoning"]["effort"], expected);
        drop(requests);
    }
}

#[tokio::test]
async fn responses_execution_controls_are_enforced_before_anthropic() {
    let router = TestRouter::start(UpstreamProvider::Anthropic).await;
    for stream in [false, true] {
        let response = router
            .post(
                "/api/services/openai/v1/responses",
                &json!({
                    "model": "claude-sonnet-4-5", "input": "search", "stream": stream,
                    "background": false, "store": false, "truncation": "disabled",
                    "stream_options": {}, "max_tool_calls": 1,
                    "tools": [{"type": "web_search"}]
                }),
            )
            .send()
            .await
            .expect("compatible execution controls");
        assert_eq!(response.status(), StatusCode::OK);
        let requests = router.requests.lock().expect("stub requests");
        assert_eq!(requests.last().unwrap()["tools"][0]["max_uses"], 1);
        drop(requests);
    }

    for fields in [
        json!({"background": true}),
        json!({"store": true}),
        json!({"truncation": "auto"}),
        json!({"stream": true, "stream_options": {"include_obfuscation": true}}),
        json!({"max_tool_calls": 2, "tools": [{"type": "web_search"}, {"type": "web_fetch"}]}),
    ] {
        let mut body = json!({"model": "claude-sonnet-4-5", "input": "answer"});
        body.as_object_mut()
            .unwrap()
            .extend(fields.as_object().unwrap().clone());
        let response = router
            .post("/api/services/openai/v1/responses", &body)
            .send()
            .await
            .expect("incompatible execution controls");
        assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    }
    assert_eq!(
        router.requests.lock().expect("stub requests").len(),
        2,
        "only compatible controls may reach upstream"
    );
}
