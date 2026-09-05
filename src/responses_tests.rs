use super::*;

#[test]
fn responses_safety_identifier_and_top_p_reach_anthropic_losslessly() {
    let request: OpenAIResponseRequest = serde_json::from_value(json!({
        "model": "claude-test",
        "input": "answer",
        "safety_identifier": "synthetic-user-42",
        "top_p": 0.25
    }))
    .unwrap();
    let translated = response_to_anthropic(&request);
    assert_eq!(translated["metadata"]["user_id"], "synthetic-user-42");
    assert_eq!(translated["top_p"], 0.25);

    for top_p in [0.0, 1.0] {
        let request: OpenAIResponseRequest = serde_json::from_value(json!({
            "model": "claude-test", "input": "answer", "top_p": top_p
        }))
        .unwrap();
        assert!(crate::bridge_controls::validate_responses(&request).is_ok());
    }
    for body in [
        json!({"model": "claude-test", "input": "answer", "top_p": -0.1}),
        json!({"model": "claude-test", "input": "answer", "top_p": 1.1}),
        json!({"model": "claude-test", "input": "answer", "temperature": 0.5, "top_p": 0.5}),
    ] {
        let request: OpenAIResponseRequest = serde_json::from_value(body).unwrap();
        assert!(crate::bridge_controls::validate_responses(&request).is_err());
    }
    assert!(
        serde_json::from_value::<OpenAIResponseRequest>(json!({
            "model": "claude-test", "input": "answer", "top_p": "high"
        }))
        .is_err()
    );
}

#[test]
fn responses_structured_output_and_parallel_tool_policy_reach_anthropic() {
    let request: OpenAIResponseRequest = serde_json::from_value(json!({
        "model": "claude-test",
        "input": "answer",
        "text": {"format": {
            "type": "json_schema", "name": "answer", "strict": true,
            "schema": {"type": "object", "required": ["answer"]}
        }},
        "parallel_tool_calls": false,
        "tools": [{"type": "function", "name": "lookup", "parameters": {"type": "object"}}],
        "tool_choice": {"type": "function", "name": "lookup"}
    }))
    .unwrap();
    let translated = response_to_anthropic(&request);
    assert_eq!(translated["output_config"]["format"]["type"], "json_schema");
    assert_eq!(
        translated["output_config"]["format"]["schema"],
        json!({"type": "object", "required": ["answer"]})
    );
    assert_eq!(translated["tool_choice"]["type"], "tool");
    assert_eq!(translated["tool_choice"]["name"], "lookup");
    assert_eq!(translated["tool_choice"]["disable_parallel_tool_use"], true);
}

#[test]
fn responses_flat_function_tool_strictness_is_preserved() {
    let request: OpenAIResponseRequest = serde_json::from_value(json!({
        "model": "claude-test",
        "input": "use tools",
        "tools": [
            {"type": "function", "name": "strict_tool", "strict": true, "parameters": {"type": "object"}},
            {"type": "function", "name": "loose_tool", "strict": false, "parameters": {"type": "object"}},
            {"type": "function", "name": "default_tool", "parameters": {"type": "object"}}
        ]
    }))
    .unwrap();
    let translated = response_to_anthropic(&request);
    assert_eq!(translated["tools"][0]["strict"], true);
    assert_eq!(translated["tools"][1]["strict"], false);
    assert!(translated["tools"][2].get("strict").is_none());
}

#[test]
fn responses_execution_controls_are_retained_mapped_or_rejected() {
    let request: OpenAIResponseRequest = serde_json::from_value(json!({
        "model": "claude-test", "input": "search",
        "background": false, "max_tool_calls": 1, "truncation": "disabled",
        "store": false, "stream": true, "stream_options": {},
        "tools": [{"type": "web_search"}]
    }))
    .unwrap();
    let retained = serde_json::to_value(&request).unwrap();
    for field in [
        "background",
        "max_tool_calls",
        "truncation",
        "store",
        "stream_options",
    ] {
        assert!(retained.get(field).is_some(), "discarded {field}");
    }
    assert_eq!(crate::bridge_controls::validate_responses(&request), Ok(()));
    let translated = response_to_anthropic(&request);
    assert_eq!(translated["tools"][0]["max_uses"], 1);

    for fields in [
        json!({"background": true}),
        json!({"store": true}),
        json!({"truncation": "auto"}),
        json!({"stream": true, "stream_options": {"include_obfuscation": true}}),
        json!({"max_tool_calls": 2, "tools": [{"type": "web_search"}, {"type": "web_fetch"}]}),
    ] {
        let mut body = json!({"model": "claude-test", "input": "answer"});
        body.as_object_mut()
            .unwrap()
            .extend(fields.as_object().unwrap().clone());
        let request: OpenAIResponseRequest = serde_json::from_value(body).unwrap();
        assert!(crate::bridge_controls::validate_responses(&request).is_err());
    }
}

#[test]
fn responses_api_translation() {
    let req = OpenAIResponseRequest {
        model: "gpt-4o".into(),
        input: Value::String("write a haiku".into()),
        instructions: Some("be poetic".into()),
        max_output_tokens: Some(128),
        temperature: Some(0.9),
        top_p: None,
        stream: None,
        tools: None,
        tool_choice: None,
        reasoning: None,
        text: None,
        parallel_tool_calls: None,
        background: None,
        max_tool_calls: None,
        truncation: None,
        store: None,
        stream_options: None,
        safety_identifier: None,
    };
    let body = response_to_anthropic(&req);
    // The requested model is preserved verbatim (issue #192).
    assert_eq!(body["model"], "gpt-4o");
    assert_eq!(body["system"], "be poetic");
    assert_eq!(body["max_tokens"], 128);
    assert_eq!(body["messages"][0]["content"], "write a haiku");

    let resp = json!({
        "id": "msg_1",
        "model": "claude-sonnet-4-5-20250929",
        "content": [{"type":"text","text":"line1"}]
    });
    let out = anthropic_to_response(&resp, "gpt-4o");
    assert_eq!(out["object"], "response");
    assert_eq!(out["model"], "claude-sonnet-4-5-20250929");
    assert_eq!(out["output"][0]["content"][0]["text"], "line1");
}

#[test]
fn anthropic_server_tool_results_keep_their_kind_payload_and_usage() {
    let response = anthropic_to_response(
        &json!({
            "id": "msg_tools",
            "model": "claude-sonnet-4-5",
            "content": [
                {"type":"server_tool_use","id":"search_1","name":"web_search","input":{"query":"Rust"}},
                {"type":"web_search_tool_result","tool_use_id":"search_1","content":[{"type":"web_search_result","url":"https://www.rust-lang.org"}]},
                {"type":"server_tool_use","id":"fetch_1","name":"web_fetch","input":{"url":"https://www.rust-lang.org"}},
                {"type":"web_fetch_tool_result","tool_use_id":"fetch_1","content":{"type":"web_fetch_result","url":"https://www.rust-lang.org"}}
            ],
            "usage": {
                "input_tokens": 3,
                "output_tokens": 2,
                "server_tool_use": {"web_search_requests":1,"web_fetch_requests":1}
            }
        }),
        "claude-sonnet-4-5",
    );

    assert_eq!(response["output"][0]["type"], "web_search_call");
    assert_eq!(response["output"][0]["status"], "completed");
    assert_eq!(
        response["output"][0]["result"][0]["type"],
        "web_search_result"
    );
    assert_eq!(response["output"][1]["type"], "web_fetch_call");
    assert_eq!(response["output"][1]["status"], "completed");
    assert_eq!(response["output"][1]["result"]["type"], "web_fetch_result");
    assert_eq!(
        response["usage"]["server_tool_use"]["web_search_requests"],
        1
    );
    assert_eq!(
        response["usage"]["server_tool_use"]["web_fetch_requests"],
        1
    );
}

#[test]
fn buffered_chat_stop_is_enforced_locally() {
    let mut response = json!({
        "choices": [{
            "message": {"role": "assistant", "content": "visible<END>hidden"},
            "finish_reason": "length"
        }]
    });
    enforce_chat_stop(&mut response, &["<END>".into()]);
    assert_eq!(response["choices"][0]["message"]["content"], "visible");
    assert_eq!(response["choices"][0]["finish_reason"], "stop");
}

#[test]
fn responses_structured_input_translates_to_anthropic() {
    let req = OpenAIResponseRequest {
        model: "gpt-5".into(),
        input: json!([
            {
                "role": "developer",
                "content": [{"type": "input_text", "text": "be terse"}]
            },
            {
                "role": "system",
                "content": [{"type": "input_text", "text": "answer plainly"}]
            },
            {
                "role": "user",
                "content": [
                    {"type": "input_text", "text": "describe this"},
                    {"type": "input_image", "image_url": "https://example.com/image.png"}
                ]
            },
            {
                "role": "assistant",
                "content": [{"type": "output_text", "text": "a prior answer"}]
            }
        ]),
        instructions: Some("follow policy".into()),
        max_output_tokens: None,
        temperature: None,
        top_p: None,
        stream: None,
        tools: None,
        tool_choice: None,
        reasoning: None,
        text: None,
        parallel_tool_calls: None,
        background: None,
        max_tool_calls: None,
        truncation: None,
        store: None,
        stream_options: None,
        safety_identifier: None,
    };

    let body = response_to_anthropic(&req);

    assert_eq!(
        body["system"],
        "follow policy\n\nbe terse\n\nanswer plainly"
    );
    assert_eq!(body["messages"].as_array().map(Vec::len), Some(2));
    assert_eq!(body["messages"][0]["role"], "user");
    assert_eq!(
        body["messages"][0]["content"],
        json!([
            {"type": "text", "text": "describe this"},
            {
                "type": "image",
                "source": {"type": "url", "url": "https://example.com/image.png"}
            }
        ])
    );
    assert_eq!(body["messages"][1]["role"], "assistant");
    assert_eq!(
        body["messages"][1]["content"],
        json!([{"type": "text", "text": "a prior answer"}])
    );
}

#[test]
fn chat_completion_projects_to_responses_input() {
    let body = json!({
        "model": "gpt-5-codex",
        "messages": [
            {"role": "system", "content": "be terse"},
            {"role": "user", "content": "hello"},
            {"role": "assistant", "content": "hi"}
        ],
        "max_tokens": 256,
    });
    let out = chat_completion_to_responses(&body);
    assert_eq!(out["model"], "gpt-5-codex");
    assert_eq!(out["instructions"], "be terse");
    assert_eq!(out["max_output_tokens"], 256);
    assert_eq!(out["input"][0]["role"], "user");
    assert_eq!(out["input"][0]["content"][0]["type"], "input_text");
    assert_eq!(out["input"][1]["content"][0]["type"], "output_text");
}

#[test]
fn chat_completion_projects_tools_and_results_to_responses() {
    let body = json!({
        "model": "gpt-5.6-sol",
        "tools": [{
            "type": "function",
            "function": {
                "name": "get_weather",
                "description": "Get the weather",
                "parameters": {
                    "type": "object",
                    "properties": {"city": {"type": "string"}}
                },
                "strict": true
            }
        }],
        "tool_choice": {"type": "function", "function": {"name": "get_weather"}},
        "messages": [
            {"role": "user", "content": "weather in Moscow?"},
            {
                "role": "assistant",
                "content": null,
                "tool_calls": [{
                    "id": "call_weather_1",
                    "type": "function",
                    "function": {
                        "name": "get_weather",
                        "arguments": "{\"city\":\"Moscow\"}"
                    }
                }]
            },
            {
                "role": "tool",
                "tool_call_id": "call_weather_1",
                "content": "cold"
            }
        ]
    });

    let out = chat_completion_to_responses(&body);

    assert_eq!(
        out["tools"][0],
        json!({
            "type": "function",
            "name": "get_weather",
            "description": "Get the weather",
            "parameters": {
                "type": "object",
                "properties": {"city": {"type": "string"}}
            },
            "strict": true
        })
    );
    assert_eq!(
        out["tool_choice"],
        json!({"type": "function", "name": "get_weather"})
    );
    assert_eq!(
        out["input"][1],
        json!({
            "type": "function_call",
            "call_id": "call_weather_1",
            "name": "get_weather",
            "arguments": "{\"city\":\"Moscow\"}"
        })
    );
    assert_eq!(
        out["input"][2],
        json!({
            "type": "function_call_output",
            "call_id": "call_weather_1",
            "output": "cold"
        })
    );
}

#[test]
fn chat_completion_preserves_stream_request_for_codex() {
    let body = json!({
        "model": "gpt-5.6-sol",
        "messages": [{"role": "user", "content": "hello"}],
        "stream": true,
    });

    let out = chat_completion_to_responses(&body);

    assert_eq!(out["stream"], true);
}

#[test]
fn codex_response_converts_to_chat_completion() {
    let response = json!({
        "id": "resp_1",
        "object": "response",
        "created_at": 1_786_448_400,
        "model": "gpt-5.6-sol",
        "status": "completed",
        "output": [{
            "id": "msg_1",
            "type": "message",
            "role": "assistant",
            "content": [{"type": "output_text", "text": "13"}]
        }],
        "usage": {"input_tokens": 9, "output_tokens": 2, "total_tokens": 11}
    });

    let out = response_to_chat_completion(&response, "gpt-5.6-sol");

    assert_eq!(out["object"], "chat.completion");
    assert_eq!(out["choices"][0]["message"]["role"], "assistant");
    assert_eq!(out["choices"][0]["message"]["content"], "13");
    assert_eq!(out["choices"][0]["finish_reason"], "stop");
    assert_eq!(out["usage"]["prompt_tokens"], 9);
    assert_eq!(out["usage"]["completion_tokens"], 2);
    assert_eq!(out["usage"]["total_tokens"], 11);
    assert!(out.get("output").is_none());
    assert!(out.get("instructions").is_none());
}

#[test]
fn failed_codex_response_converts_to_openai_error() {
    let response = json!({
        "id": "resp_failed",
        "status": "failed",
        "error": {
            "message": "buffered boom",
            "type": "server_error",
            "code": "upstream_failed",
            "param": "input",
            "private_account": "secret"
        },
        "output": [{"type": "message", "content": [{"type": "output_text", "text": "partial"}]}]
    });

    let out = response_to_chat_completion(&response, "gpt-5.6-sol");

    assert_eq!(out["error"]["message"], "buffered boom");
    assert_eq!(out["error"]["type"], "server_error");
    assert_eq!(out["error"]["code"], "upstream_failed");
    assert_eq!(out["error"]["param"], "input");
    assert!(out.get("choices").is_none());
    assert!(!out.to_string().contains("private_account"));
}

#[test]
fn refusal_only_codex_response_uses_the_chat_refusal_field() {
    let response = json!({
        "id": "resp_refusal",
        "status": "completed",
        "output": [{"type": "message", "content": [
            {"type": "refusal", "refusal": "cannot comply"}
        ]}]
    });

    let out = response_to_chat_completion(&response, "gpt-5.6-sol");

    assert!(out["choices"][0]["message"]["content"].is_null());
    assert_eq!(out["choices"][0]["message"]["refusal"], "cannot comply");
    assert_eq!(out["choices"][0]["finish_reason"], "stop");
}

#[test]
fn mixed_codex_response_preserves_text_and_refusal_order_within_each_field() {
    let response = json!({
        "id": "resp_mixed",
        "status": "completed",
        "output": [
            {"type": "message", "content": [
                {"type": "output_text", "text": "before "},
                {"type": "refusal", "refusal": "cannot "},
                {"type": "output_text", "text": "after"}
            ]},
            {"type": "message", "content": [
                {"type": "refusal", "refusal": "comply"}
            ]}
        ]
    });

    let out = response_to_chat_completion(&response, "gpt-5.6-sol");

    assert_eq!(out["choices"][0]["message"]["content"], "before after");
    assert_eq!(out["choices"][0]["message"]["refusal"], "cannot comply");
}

#[test]
fn codex_function_calls_convert_to_chat_tool_calls() {
    let response = json!({
        "id": "resp_tools",
        "model": "gpt-5.6-sol",
        "status": "completed",
        "output": [{
            "id": "fc_1",
            "call_id": "call_1",
            "type": "function_call",
            "name": "get_weather",
            "arguments": "{\"city\":\"Paris\"}"
        }]
    });

    let out = response_to_chat_completion(&response, "gpt-5.6-sol");

    assert!(out["choices"][0]["message"]["content"].is_null());
    assert_eq!(out["choices"][0]["finish_reason"], "tool_calls");
    assert_eq!(
        out["choices"][0]["message"]["tool_calls"][0]["id"],
        "call_1"
    );
    assert_eq!(
        out["choices"][0]["message"]["tool_calls"][0]["function"]["name"],
        "get_weather"
    );
}

#[test]
fn normalizes_string_input_and_preserves_typed_input() {
    let typed = json!([{
        "type": "message",
        "role": "user",
        "content": [{"type": "input_text", "text": "скажи ок"}],
    }]);
    assert_eq!(
        normalize_input_items(&Value::String("скажи ок".into())),
        typed
    );
    assert_eq!(normalize_input_items(&typed), typed);
}

#[test]
fn drops_temperature_for_claude_5_models() {
    let req = OpenAIResponseRequest {
        model: "claude-opus-5".into(),
        input: Value::String("hello".into()),
        instructions: None,
        max_output_tokens: None,
        temperature: Some(0.7),
        top_p: None,
        stream: None,
        tools: None,
        tool_choice: None,
        reasoning: None,
        text: None,
        parallel_tool_calls: None,
        background: None,
        max_tool_calls: None,
        truncation: None,
        store: None,
        stream_options: None,
        safety_identifier: None,
    };
    let body = response_to_anthropic(&req);
    assert!(body.get("temperature").is_none());
}

#[test]
fn responses_reasoning_is_preserved_as_claude_thinking() {
    let req: OpenAIResponseRequest = serde_json::from_value(json!({
        "model":"claude-opus-5",
        "input":"hello",
        "max_output_tokens":40_000,
        "reasoning":{"effort":"xhigh"}
    }))
    .unwrap();
    let body = response_to_anthropic(&req);

    assert_eq!(body["thinking"]["type"], "adaptive");
    assert_eq!(body["output_config"]["effort"], "max");
    assert_eq!(body["max_tokens"], 40_000);
    assert!(body.get("reasoning").is_none());
}

#[test]
fn prior_function_items_survive_responses_to_anthropic_translation() {
    let req: OpenAIResponseRequest = serde_json::from_value(json!({
            "model": "gpt-5.6-sol",
            "input": [
                {"type": "function_call", "call_id": "call_1", "name": "lookup", "arguments": "{\"q\":1}"},
                {"type": "function_call_output", "call_id": "call_1", "output": "found"}
            ]
        }))
        .unwrap();
    let body = response_to_anthropic(&req);
    assert_eq!(body["messages"][0]["content"][0]["type"], "tool_use");
    assert_eq!(body["messages"][0]["content"][0]["id"], "call_1");
    assert_eq!(body["messages"][1]["content"][0]["type"], "tool_result");
    assert_eq!(body["messages"][1]["content"][0]["tool_use_id"], "call_1");
}
