use serde_json::{Value, json};

use crate::bridge_request::{
    BridgeTarget, anthropic_to_chat_request, anthropic_to_responses_request,
    responses_output_to_anthropic, untranslatable_response_history, untranslatable_responses_state,
    validate_anthropic_request,
};

#[test]
fn anthropic_user_id_maps_to_both_openai_request_shapes() {
    let body = json!({
        "messages": [{"role": "user", "content": "answer"}],
        "metadata": {"user_id": "synthetic-user-42"}
    });
    let chat = anthropic_to_chat_request(&body, "chat");
    assert_eq!(chat["safety_identifier"], "synthetic-user-42");
    let responses = anthropic_to_responses_request(&body, "codex").unwrap();
    assert_eq!(responses["safety_identifier"], "synthetic-user-42");

    let max = "x".repeat(64);
    let body = json!({
        "messages": [{"role": "user", "content": "answer"}],
        "metadata": {"user_id": max}
    });
    assert!(validate_anthropic_request(&body, BridgeTarget::Responses).is_ok());
    for user_id in [json!("x".repeat(65)), json!(42), Value::Null] {
        let body = json!({
            "messages": [{"role": "user", "content": "answer"}],
            "metadata": {"user_id": user_id}
        });
        assert!(validate_anthropic_request(&body, BridgeTarget::Responses).is_err());
    }
}

#[test]
fn translated_targets_reject_every_nonempty_context_management_contract() {
    let contracts = [
        json!({"edits": [{
            "type": "clear_tool_uses_20250919",
            "trigger": {"type": "input_tokens", "value": 1000},
            "keep": {"type": "tool_uses", "value": 2},
            "exclude_tools": ["retain"]
        }]}),
        json!({"edits": [{
            "type": "clear_thinking_20251015",
            "keep": {"type": "thinking_turns", "value": 1}
        }]}),
        json!({"edits": [
            {"type": "clear_tool_uses_20250919"},
            {"type": "clear_thinking_20251015"}
        ]}),
        json!({"edits": "malformed"}),
        json!([]),
        json!("malformed"),
    ];
    for target in [
        BridgeTarget::Chat,
        BridgeTarget::Responses,
        BridgeTarget::Gemini,
    ] {
        for context_management in &contracts {
            let body = json!({
                "messages": [{"role": "user", "content": "answer"}],
                "context_management": context_management
            });
            let error = validate_anthropic_request(&body, target).unwrap_err();
            assert!(error.contains("context_management"), "{target:?}: {error}");
        }
        for context_management in [Value::Null, json!({})] {
            let body = json!({
                "messages": [{"role": "user", "content": "answer"}],
                "context_management": context_management
            });
            assert!(validate_anthropic_request(&body, target).is_ok());
        }
    }
}

#[test]
fn translated_targets_reject_anthropic_tier_container_and_mcp_contracts() {
    let contracts = [
        ("service_tier", json!("auto")),
        ("service_tier", json!("standard_only")),
        ("speed", json!("fast")),
        ("inference_geo", json!("us")),
        (
            "container",
            json!({"id": "container_1", "skills": ["example"]}),
        ),
        (
            "mcp_servers",
            json!([{
                "type": "url", "url": "https://mcp.example.test",
                "name": "example", "authorization_token": "secret"
            }]),
        ),
    ];
    for target in [
        BridgeTarget::Chat,
        BridgeTarget::Responses,
        BridgeTarget::Gemini,
    ] {
        for (field, value) in &contracts {
            let mut body = json!({"messages": [{"role": "user", "content": "answer"}]});
            body[*field] = value.clone();
            let error = validate_anthropic_request(&body, target).unwrap_err();
            assert!(error.contains(field), "{target:?}: {error}");
        }
        for (field, value) in [("container", json!({})), ("mcp_servers", json!([]))] {
            let mut body = json!({"messages": [{"role": "user", "content": "answer"}]});
            body[field] = value;
            assert!(validate_anthropic_request(&body, target).is_ok());
        }
    }
}

#[test]
fn translated_targets_reject_hosted_mcp_history_blocks() {
    for kind in [
        "mcp_tool_use",
        "mcp_tool_result",
        "mcp_tool_error",
        "future_hosted_block",
    ] {
        let body = json!({
            "messages": [{"role": "assistant", "content": [{"type": kind}]}]
        });
        let error = validate_anthropic_request(&body, BridgeTarget::Responses).unwrap_err();
        assert!(error.contains(kind), "{error}");
    }
}

#[test]
fn bridged_responses_state_accepts_only_omitted_or_null_fields() {
    for body in [
        json!({}),
        json!({"previous_response_id": null}),
        json!({"conversation": null}),
    ] {
        assert_eq!(untranslatable_responses_state(&body), None);
    }
    for body in [
        json!({"previous_response_id": "resp_1"}),
        json!({"conversation": "conv_1"}),
    ] {
        assert!(untranslatable_responses_state(&body).is_some());
    }
    let error = untranslatable_responses_state(&json!({
        "previous_response_id": "resp_1",
        "conversation": "conv_1"
    }))
    .unwrap();
    assert!(error.contains("mutually exclusive"));
}

#[test]
fn responses_tool_outputs_keep_every_supported_content_part_in_order() {
    let cases = [
        (json!("plain"), json!("plain")),
        (json!([]), json!([])),
        (
            json!([
                {"type": "input_text", "text": "caption"},
                {"type": "input_image", "image_url": "https://example.test/a.png"},
                {"type": "input_image", "image_url": "data:image/png;base64,AAA"},
                {"type": "input_file", "file_url": "https://example.test/a.pdf", "filename": "a.pdf"},
                {"type": "input_file", "file_data": "data:application/pdf;base64,BBB"},
                {"type": "input_file", "file_data": "data:text/plain;base64,aGVsbG8="},
            ]),
            json!([
                {"type": "text", "text": "caption"},
                {"type": "image", "source": {"type": "url", "url": "https://example.test/a.png"}},
                {"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": "AAA"}},
                {"type": "document", "source": {"type": "url", "url": "https://example.test/a.pdf"}, "title": "a.pdf"},
                {"type": "document", "source": {"type": "base64", "media_type": "application/pdf", "data": "BBB"}},
                {"type": "document", "source": {"type": "text", "media_type": "text/plain", "data": "hello"}},
            ]),
        ),
    ];
    for (given, expected) in cases {
        assert_eq!(
            responses_output_to_anthropic(Some(&given), "output").unwrap(),
            expected
        );
    }
}

#[test]
fn responses_tool_outputs_reject_malformed_or_provider_owned_sources() {
    let invalid = [
        Value::Null,
        json!({}),
        json!([{"type": "input_text"}]),
        json!([{"type": "input_image", "file_id": "file_openai"}]),
        json!([{"type": "input_image", "image_url": ""}]),
        json!([{"type": "input_image", "image_url": "https://x/a.png", "detail": "high"}]),
        json!([{"type": "input_file", "file_id": "file_openai"}]),
        json!([{"type": "input_file", "file_url": "https://x/a.txt"}]),
        json!([{"type": "unknown"}]),
    ];
    for value in invalid {
        assert!(
            responses_output_to_anthropic(Some(&value), "output").is_err(),
            "accepted {value}"
        );
    }
    assert!(responses_output_to_anthropic(None, "output").is_err());
}

#[test]
fn responses_history_rejects_provider_specific_or_malformed_items() {
    let invalid = [
        json!([{"type": "reasoning", "id": "rs_1", "encrypted_content": "opaque", "summary": []}]),
        json!([{"type": "reasoning", "summary": [{"type": "summary_text", "text": "private"}]}]),
        json!([{"type": "custom_tool_call", "call_id": "c", "name": "apply_patch", "input": "patch"}]),
        json!([{"type": "custom_tool_call_output", "call_id": "c", "output": [{"type": "input_text", "text": "done"}]}]),
        json!([{"role": "user", "content": [{"type": "input_image", "file_id": "file_openai"}]}]),
        json!([{"role": "user", "content": [{"type": "input_image"}]}]),
    ];
    for input in invalid {
        assert!(
            untranslatable_response_history(&input).is_some(),
            "accepted {input}"
        );
    }
}

#[test]
fn codex_request_keeps_parallel_results_media_documents_and_followup_order() {
    let body = json!({
        "messages": [
            {"role": "assistant", "content": [
                {"type": "tool_use", "id": "call_1", "name": "first", "input": {"n": 1}},
                {"type": "tool_use", "id": "call_2", "name": "second", "input": {"n": 2}}
            ]},
            {"role": "user", "content": [
                {"type": "tool_result", "tool_use_id": "call_1", "content": [
                    {"type": "text", "text": "one"},
                    {"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": "AAA"}}
                ]},
                {"type": "tool_result", "tool_use_id": "call_2", "content": [
                    {"type": "document", "source": {"type": "url", "url": "https://example.test/result.pdf"}, "title": "result.pdf"}
                ]},
                {"type": "text", "text": "continue"}
            ]}
        ],
        "max_tokens": 512
    });
    let translated = anthropic_to_responses_request(&body, "gpt-test").unwrap();
    assert_eq!(
        translated["input"],
        json!([
            {"type": "function_call", "call_id": "call_1", "name": "first", "arguments": "{\"n\":1}"},
            {"type": "function_call", "call_id": "call_2", "name": "second", "arguments": "{\"n\":2}"},
            {"type": "function_call_output", "call_id": "call_1", "output": [
                {"type": "input_text", "text": "one"},
                {"type": "input_image", "image_url": "data:image/png;base64,AAA"}
            ]},
            {"type": "function_call_output", "call_id": "call_2", "output": [
                {"type": "input_file", "file_url": "https://example.test/result.pdf", "filename": "result.pdf"}
            ]},
            {"role": "user", "content": [{"type": "input_text", "text": "continue"}]}
        ])
    );
}

#[test]
fn codex_request_keeps_supported_server_tool_history_and_result_metadata() {
    let body = json!({
        "messages": [{"role": "assistant", "content": [
            {"type": "server_tool_use", "id": "srv_1", "name": "web_search", "input": {"type": "search", "query": "Rust"}},
            {"type": "web_search_tool_result", "tool_use_id": "srv_1", "content": [
                {"type": "web_search_result", "url": "https://www.rust-lang.org"}
            ]},
            {"type": "text", "text": "found"}
        ]}],
        "max_tokens": 64
    });
    let translated = anthropic_to_responses_request(&body, "gpt-test").unwrap();
    assert_eq!(
        translated["input"],
        json!([
            {"type": "web_search_call", "id": "srv_1", "status": "completed", "action": {"type": "search", "query": "Rust"}, "result": [
                {"type": "web_search_result", "url": "https://www.rust-lang.org"}
            ]},
            {"role": "assistant", "content": [{"type": "output_text", "text": "found"}]}
        ])
    );
    assert!(validate_anthropic_request(&body, BridgeTarget::Chat).is_err());
}

#[test]
fn translated_targets_reject_opaque_or_lossy_anthropic_history() {
    for kind in ["thinking", "redacted_thinking"] {
        let body = json!({
            "messages": [{"role": "assistant", "content": [{
                "type": kind, "thinking": "secret", "data": "opaque"
            }]}]
        });
        let error = validate_anthropic_request(&body, BridgeTarget::Responses).unwrap_err();
        assert!(!error.contains("secret"));
        assert!(!error.contains("opaque"));
    }

    let media_result = json!({"messages": [{"role": "user", "content": [{
        "type": "tool_result", "tool_use_id": "call_1", "content": [{
            "type": "image", "source": {"type": "url", "url": "https://example.test/a.png"}
        }]
    }]}]});
    assert!(validate_anthropic_request(&media_result, BridgeTarget::Chat).is_err());
    assert!(validate_anthropic_request(&media_result, BridgeTarget::Responses).is_ok());

    let unsupported_document = json!({"messages": [{"role": "user", "content": [{
        "type": "document", "source": {"type": "url", "url": "https://example.test/report.txt"}
    }]}]});
    assert!(validate_anthropic_request(&unsupported_document, BridgeTarget::Responses).is_err());
}

#[test]
fn chat_translation_emits_all_results_before_followup_content() {
    let body = json!({"messages": [{"role": "user", "content": [
        {"type": "tool_result", "tool_use_id": "one", "content": "1"},
        {"type": "tool_result", "tool_use_id": "two", "content": [{"type": "text", "text": "2"}]},
        {"type": "text", "text": "next"}
    ]}]});
    assert_eq!(
        anthropic_to_chat_request(&body, "chat")["messages"],
        json!([
            {"role": "tool", "tool_call_id": "one", "content": "1"},
            {"role": "tool", "tool_call_id": "two", "content": [{"type": "text", "text": "2"}]},
            {"role": "user", "content": "next"}
        ])
    );
}

#[test]
fn anthropic_function_tool_strictness_survives_chat_and_responses_targets() {
    let body = json!({
        "messages": [{"role": "user", "content": "use a tool"}],
        "tools": [
            {"name": "strict_tool", "strict": true, "input_schema": {"type": "object"}},
            {"name": "loose_tool", "strict": false, "input_schema": {"type": "object"}}
        ]
    });
    let chat = anthropic_to_chat_request(&body, "chat");
    assert_eq!(chat["tools"][0]["function"]["strict"], true);
    assert_eq!(chat["tools"][1]["function"]["strict"], false);
    let responses = anthropic_to_responses_request(&body, "codex").unwrap();
    assert_eq!(responses["tools"][0]["strict"], true);
    assert_eq!(responses["tools"][1]["strict"], false);
}

#[test]
fn anthropic_effort_maps_to_codex_without_default_overwrite() {
    for (source, expected) in [
        ("low", "low"),
        ("medium", "medium"),
        ("high", "high"),
        ("max", "xhigh"),
    ] {
        let body = json!({
            "messages": [{"role": "user", "content": "answer"}],
            "output_config": {"effort": source}
        });
        let chat = anthropic_to_chat_request(&body, "gpt-test");
        assert_eq!(chat["reasoning_effort"], expected);
        let responses = anthropic_to_responses_request(&body, "gpt-test").unwrap();
        assert_eq!(responses["reasoning"]["effort"], expected);
    }

    for body in [
        json!({"messages": [{"role": "user", "content": "answer"}], "output_config": {"effort": "extreme"}}),
        json!({"messages": [{"role": "user", "content": "answer"}], "thinking": {"type": "enabled", "budget_tokens": 2048}}),
    ] {
        assert!(validate_anthropic_request(&body, BridgeTarget::Responses).is_err());
    }
}

#[test]
fn anthropic_output_parallel_and_top_k_contracts_reach_compatible_targets() {
    let body = json!({
        "messages": [{"role": "user", "content": "answer"}],
        "output_config": {"format": {
            "type": "json_schema", "schema": {"type": "object"}
        }},
        "tool_choice": {"type": "auto", "disable_parallel_tool_use": true},
        "top_k": 17
    });
    assert!(validate_anthropic_request(&body, BridgeTarget::Gemini).is_ok());
    let chat = anthropic_to_chat_request(&body, "gemini-test");
    assert_eq!(chat["response_format"]["type"], "json_schema");
    assert_eq!(chat["parallel_tool_calls"], false);
    assert_eq!(chat["top_k"], 17);

    let mut without_top_k = body.clone();
    without_top_k.as_object_mut().unwrap().remove("top_k");
    let responses = anthropic_to_responses_request(&without_top_k, "gpt-test").unwrap();
    assert_eq!(responses["text"]["format"]["type"], "json_schema");
    assert_eq!(responses["parallel_tool_calls"], false);

    for target in [BridgeTarget::Chat, BridgeTarget::Responses] {
        let error = validate_anthropic_request(&body, target).unwrap_err();
        assert!(error.contains("top_k"), "{target:?}: {error}");
    }
}

#[test]
fn responses_prompt_cache_breakpoints_map_on_text_image_file_and_tool_output() {
    let breakpoint = json!({"mode":"explicit"});
    let content = json!([
        {"type":"input_text","text":"one","prompt_cache_breakpoint":breakpoint},
        {"type":"input_image","image_url":"https://example.com/image.png",
         "prompt_cache_breakpoint":breakpoint},
        {"type":"input_file","file_data":"data:application/pdf;base64,AAA",
         "prompt_cache_breakpoint":breakpoint}
    ]);
    let mapped =
        crate::bridge_request::responses_message_content_to_anthropic(&content, "user", "input[0]")
            .unwrap();
    for index in 0..3 {
        assert_eq!(mapped[index]["cache_control"], json!({"type":"ephemeral"}));
    }

    let output = crate::bridge_request::responses_output_to_anthropic(
        Some(&json!([{
            "type":"input_text","text":"done","prompt_cache_breakpoint":breakpoint
        }])),
        "input[1].output",
    )
    .unwrap();
    assert_eq!(output[0]["cache_control"], json!({"type":"ephemeral"}));
}

#[test]
fn anthropic_top_level_cache_control_is_explicitly_rejected_on_bridges() {
    for target in [
        BridgeTarget::Chat,
        BridgeTarget::Responses,
        BridgeTarget::Gemini,
    ] {
        let error = validate_anthropic_request(
            &json!({
                "messages":[{"role":"user","content":"hello"}],
                "cache_control":{"type":"ephemeral"}
            }),
            target,
        )
        .unwrap_err();
        assert!(error.contains("cache_control"), "{error}");
    }
}
