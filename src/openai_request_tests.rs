use super::*;

#[test]
fn translates_anthropic_text_stream_to_openai_chat_chunks() {
    let mut translator = OpenAIStreamTranslator::new(OpenAIStreamShape::ChatCompletion, "gpt-4o");
    let frames = translator.push(
        br#"event: message_start
data: {"type":"message_start","message":{"id":"msg_1","model":"claude-sonnet-4-5-20250929"}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"hello"}}

event: message_delta
data: {"type":"message_delta","delta":{"stop_reason":"end_turn"}}

event: message_stop
data: {"type":"message_stop"}

"#,
    );
    let joined = frames.join("");
    assert!(joined.contains("\"object\":\"chat.completion.chunk\""));
    assert!(joined.contains("\"content\":\"hello\""));
    assert!(joined.contains("\"finish_reason\":\"stop\""));
    assert!(joined.contains("\"model\":\"claude-sonnet-4-5-20250929\""));
    assert!(joined.contains("data: [DONE]"));
}

#[test]
fn chat_stream_emits_usage_only_when_requested() {
    let mut translator = OpenAIStreamTranslator::new(OpenAIStreamShape::ChatCompletion, "gpt-4o")
        .with_include_usage(true);
    let frames = translator.push(
        br#"event: message_start
data: {"type":"message_start","message":{"usage":{"input_tokens":7,"output_tokens":0}}}

event: message_delta
data: {"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":3}}

event: message_stop
data: {"type":"message_stop"}

"#,
    );
    let usage = frames
        .iter()
        .filter_map(|frame| frame.strip_prefix("data: "))
        .filter_map(|data| serde_json::from_str::<Value>(data.trim()).ok())
        .find(|chunk| chunk["choices"].as_array().is_some_and(Vec::is_empty))
        .expect("usage chunk");
    assert_eq!(usage["usage"]["prompt_tokens"], 7);
    assert_eq!(usage["usage"]["completion_tokens"], 3);
    assert_eq!(usage["usage"]["total_tokens"], 10);
}

#[test]
fn translates_anthropic_text_stream_to_openai_response_events() {
    let mut translator = OpenAIStreamTranslator::new(OpenAIStreamShape::Response, "gpt-4o");
    let frames = translator.push(
        br#"event: message_start
data: {"type":"message_start","message":{"id":"msg_1","model":"claude-sonnet-4-5-20250929"}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"hello"}}

event: message_stop
data: {"type":"message_stop"}

"#,
    );
    let joined = frames.join("");
    assert!(joined.contains("\"type\":\"response.created\""));
    assert!(joined.contains("\"type\":\"response.output_text.delta\""));
    assert!(joined.contains("\"type\":\"response.completed\""));
    assert!(joined.contains("\"model\":\"claude-sonnet-4-5-20250929\""));
    assert!(joined.contains("data: [DONE]"));
}

#[test]
fn translates_basic_chat_completion() {
    let req = OpenAIChatCompletionRequest {
        model: "gpt-4o".into(),
        messages: vec![
            ChatMessage {
                role: "system".into(),
                content: Value::String("You are helpful.".into()),
                name: None,
                tool_call_id: None,
                tool_calls: None,
            },
            ChatMessage {
                role: "user".into(),
                content: Value::String("Hello".into()),
                name: None,
                tool_call_id: None,
                tool_calls: None,
            },
        ],
        max_tokens: Some(100),
        max_completion_tokens: None,
        temperature: Some(0.5),
        top_p: None,
        stream: None,
        stop: None,
        tools: None,
        tool_choice: None,
        reasoning_effort: None,
        reasoning: None,
    };
    let body = chat_completion_to_anthropic(&req);
    // The requested model is preserved verbatim; nothing rewrites it.
    assert_eq!(body["model"], "gpt-4o");
    assert_eq!(body["max_tokens"], 100);
    assert_eq!(body["temperature"], 0.5);
    assert_eq!(body["system"], "You are helpful.");
    let msgs = body["messages"].as_array().unwrap();
    assert_eq!(msgs.len(), 1);
    assert_eq!(msgs[0]["role"], "user");
    assert_eq!(msgs[0]["content"], "Hello");
}

#[test]
fn preserves_claude_native_model_id() {
    let req = OpenAIChatCompletionRequest {
        model: "claude-opus-4-7".into(),
        messages: vec![ChatMessage {
            role: "user".into(),
            content: Value::String("hi".into()),
            name: None,
            tool_call_id: None,
            tool_calls: None,
        }],
        max_tokens: None,
        max_completion_tokens: None,
        temperature: None,
        top_p: None,
        stream: None,
        stop: None,
        tools: None,
        tool_choice: None,
        reasoning_effort: None,
        reasoning: None,
    };
    let body = chat_completion_to_anthropic(&req);
    assert_eq!(body["model"], "claude-opus-4-7");
    assert_eq!(body["max_tokens"], 4096);
}

#[test]
fn drops_temperature_for_claude_5_models() {
    let req = OpenAIChatCompletionRequest {
        model: "claude-sonnet-5".into(),
        messages: vec![ChatMessage {
            role: "user".into(),
            content: Value::String("hi".into()),
            name: None,
            tool_call_id: None,
            tool_calls: None,
        }],
        max_tokens: None,
        max_completion_tokens: None,
        temperature: Some(0.7),
        top_p: None,
        stream: None,
        stop: None,
        tools: None,
        tool_choice: None,
        reasoning_effort: None,
        reasoning: None,
    };
    let body = chat_completion_to_anthropic(&req);
    assert!(body.get("temperature").is_none());
}

#[test]
fn caller_reasoning_effort_uses_adaptive_thinking_and_preserves_explicit_limit() {
    let req: OpenAIChatCompletionRequest = serde_json::from_value(json!({
        "model":"claude-opus-5",
        "messages":[{"role":"user","content":"hi"}],
        "max_tokens":3000,
        "reasoning_effort":"low"
    }))
    .unwrap();
    let body = chat_completion_to_anthropic(&req);

    assert_eq!(body["thinking"]["type"], "adaptive");
    assert_eq!(body["output_config"]["effort"], "low");
    assert_eq!(body["max_tokens"], 3000);
    assert!(body.get("reasoning").is_none());
}

#[test]
fn omitted_limit_reserves_output_headroom_for_adaptive_thinking() {
    let req: OpenAIChatCompletionRequest = serde_json::from_value(json!({
        "model":"claude-opus-5",
        "messages":[{"role":"user","content":"hi"}],
        "reasoning_effort":"high"
    }))
    .unwrap();
    let body = chat_completion_to_anthropic(&req);

    assert_eq!(body["thinking"]["type"], "adaptive");
    assert_eq!(body["output_config"]["effort"], "high");
    assert_eq!(body["max_tokens"], 24_576);
}

#[test]
fn legacy_thinking_budget_keeps_visible_output_headroom() {
    let req: OpenAIChatCompletionRequest = serde_json::from_value(json!({
        "model":"claude-sonnet-4-5",
        "messages":[{"role":"user","content":"hi"}],
        "reasoning_effort":"high"
    }))
    .unwrap();
    let body = chat_completion_to_anthropic(&req);

    assert_eq!(body["thinking"]["type"], "enabled");
    assert_eq!(body["thinking"]["budget_tokens"], 16_384);
    assert_eq!(body["max_tokens"], 24_576);
}

/// With no catalog to check against, a directly named model passes through:
/// the upstream is the authority on whether it exists. The router keeps no
/// built-in alias table to rewrite it with (issue #192).
#[test]
fn model_resolution_passes_a_named_model_through_without_a_catalog() {
    assert_eq!(
        resolve_model("aurora-2-base").as_deref(),
        Some("aurora-2-base")
    );
    assert_eq!(resolve_model(""), None);
}

/// Against a live catalog, only advertised models resolve, and an operator
/// alias is honoured only while its target is still advertised.
#[test]
fn model_resolution_is_bounded_by_the_live_catalog() {
    use std::collections::BTreeMap;
    let catalog = vec!["aurora-2-base".to_string(), "borealis-9-ultra".to_string()];
    let mut aliases = BTreeMap::new();
    aliases.insert("fast".to_string(), "aurora-2-base".to_string());
    aliases.insert("stale".to_string(), "withdrawn-1".to_string());

    assert_eq!(
        resolve_model_with("aurora-2-base", &aliases, &catalog).as_deref(),
        Some("aurora-2-base")
    );
    assert_eq!(
        resolve_model_with("fast", &aliases, &catalog).as_deref(),
        Some("aurora-2-base"),
        "an operator alias resolves to a model the account advertises"
    );
    assert_eq!(
        resolve_model_with("stale", &aliases, &catalog),
        None,
        "an alias pointing at a withdrawn model must not route anywhere"
    );
    assert_eq!(
        resolve_model_with("never-advertised", &aliases, &catalog),
        None
    );
}

#[test]
fn translates_multipart_user_content() {
    let req = OpenAIChatCompletionRequest {
        model: "gpt-4o".into(),
        messages: vec![ChatMessage {
            role: "user".into(),
            content: json!([
                {"type": "text", "text": "describe"},
                {"type": "image_url", "image_url": {"url": "https://example.com/x.png"}}
            ]),
            name: None,
            tool_call_id: None,
            tool_calls: None,
        }],
        max_tokens: Some(50),
        max_completion_tokens: None,
        temperature: None,
        top_p: None,
        stream: None,
        stop: None,
        tools: None,
        tool_choice: None,
        reasoning_effort: None,
        reasoning: None,
    };
    let body = chat_completion_to_anthropic(&req);
    let parts = body["messages"][0]["content"].as_array().unwrap();
    assert_eq!(parts[0]["type"], "text");
    assert_eq!(parts[0]["text"], "describe");
    assert_eq!(parts[1]["type"], "image");
    assert_eq!(parts[1]["source"]["url"], "https://example.com/x.png");
}

#[test]
fn chat_tool_loop_preserves_call_and_result_ids() {
    let req: OpenAIChatCompletionRequest = serde_json::from_value(json!({
        "model": "gpt-4o",
        "messages": [
            {"role": "user", "content": "weather?"},
            {
                "role": "assistant",
                "content": null,
                "tool_calls": [{
                    "id": "toolu_test123",
                    "type": "function",
                    "function": {"name": "weather", "arguments": "{\"city\":\"Paris\"}"}
                }]
            },
            {"role": "tool", "tool_call_id": "toolu_test123", "content": "sunny"}
        ]
    }))
    .unwrap();

    let body = chat_completion_to_anthropic(&req);
    assert_eq!(body["messages"][1]["content"][0]["id"], "toolu_test123");
    assert_eq!(body["messages"][1]["content"][0]["input"]["city"], "Paris");
    assert_eq!(
        body["messages"][2]["content"][0]["tool_use_id"],
        "toolu_test123"
    );
}

#[test]
fn responses_flat_tools_translate_without_silent_loss() {
    let tools = json!([{
        "type": "function",
        "name": "get_weather",
        "description": "Get weather",
        "parameters": {"type": "object", "properties": {"city": {"type": "string"}}}
    }]);
    let translated = translate_tools(&tools);
    assert_eq!(translated[0]["name"], "get_weather");
    assert_eq!(
        translated[0]["input_schema"]["properties"]["city"]["type"],
        "string"
    );
}

#[test]
fn responses_web_search_maps_to_anthropic_server_tool() {
    let translated = translate_tools(&json!([{"type": "web_search", "max_uses": 2}]));
    assert_eq!(translated[0]["type"], "web_search_20250305");
    assert_eq!(translated[0]["name"], "web_search");
    assert_eq!(translated[0]["max_uses"], 2);
}

/// Anthropic rejects a request that specifies both `temperature` and `top_p`,
/// and Gemini CLI sends both by default with no way to suppress either — so a
/// valid Gemini request and a reachable Claude model produced a permanent `400`
/// (issue #216).
#[test]
fn anthropic_never_receives_both_temperature_and_top_p() {
    let sampling = |temperature: Option<f32>, top_p: Option<f32>| {
        let req = OpenAIChatCompletionRequest {
            model: "claude-haiku-4-5-20251001".into(),
            messages: vec![ChatMessage {
                role: "user".into(),
                content: Value::String("hi".into()),
                name: None,
                tool_call_id: None,
                tool_calls: None,
            }],
            max_tokens: Some(16),
            max_completion_tokens: None,
            temperature,
            top_p,
            stream: None,
            stop: None,
            tools: None,
            tool_choice: None,
            reasoning_effort: None,
            reasoning: None,
        };
        chat_completion_to_anthropic(&req)
    };

    // Both supplied: exactly one survives, and it is the documented winner.
    let body = sampling(Some(1.0), Some(0.95));
    assert_eq!(body["temperature"], 1.0);
    assert!(body.get("top_p").is_none(), "{body}");

    // Only `top_p`: it is mapped through, not dropped merely because it is the
    // parameter that loses a conflict. A caller who tuned only nucleus sampling
    // still gets it.
    let body = sampling(None, Some(0.95));
    // Compared as f64: the value round-trips through f32, which is where the
    // `0.949999988079071` seen on the wire in issue #216 comes from.
    assert!(
        (body["top_p"].as_f64().expect("top_p is a number") - 0.95).abs() < 1e-6,
        "{body}"
    );
    assert!(body.get("temperature").is_none(), "{body}");

    // Only `temperature`: unchanged behaviour.
    let body = sampling(Some(0.5), None);
    assert_eq!(body["temperature"], 0.5);
    assert!(body.get("top_p").is_none(), "{body}");

    // Neither: nothing is invented.
    let body = sampling(None, None);
    assert!(body.get("temperature").is_none(), "{body}");
    assert!(body.get("top_p").is_none(), "{body}");
}

/// Codex CLI sends `namespace`, `custom` and `tool_search` alongside ordinary
/// function tools. Rejecting the whole request over one untranslatable entry
/// refused nine usable tools and made a documented client unable to drive Claude
/// models at all (issue #215). The unknown entries are dropped; the rest survive.
#[test]
fn untranslatable_tools_are_dropped_rather_than_failing_the_request() {
    // The real `codex_exec/0.147.0` tool array, from the issue.
    let tools = json!([
        {"type": "function", "name": "exec_command"},
        {"type": "function", "name": "write_stdin"},
        {"type": "function", "name": "update_plan"},
        {"type": "function", "name": "request_user_input"},
        {"type": "function", "name": "view_image"},
        {"type": "namespace", "name": "multi_agent_v1"},
        {"type": "function", "name": "get_goal"},
        {"type": "function", "name": "create_goal"},
        {"type": "function", "name": "update_goal"},
        {"type": "web_search"}
    ]);

    let translated = crate::openai::translate_tools(&tools);
    let translated = translated
        .as_array()
        .expect("translated tools are an array");
    // Nine of ten entries survive: eight functions and the server-side search.
    assert_eq!(translated.len(), 9, "{translated:#?}");
    let rendered = serde_json::to_string(&translated).expect("serialize");
    assert!(!rendered.contains("multi_agent_v1"), "{rendered}");
    assert!(!rendered.contains("namespace"), "{rendered}");
    // The function tools are translated, not merely copied.
    assert!(rendered.contains("exec_command"), "{rendered}");
    assert!(rendered.contains("input_schema"), "{rendered}");
    // `web_search` keeps its existing translation.
    assert!(rendered.contains("web_search_20250305"), "{rendered}");

    // The drop is reported rather than silent.
    let dropped = crate::openai::untranslatable_anthropic_tools(&tools);
    assert_eq!(dropped, vec!["namespace (multi_agent_v1)".to_string()]);
}

/// `namespace` is not the only type that would have hit the wall: `custom` and
/// `tool_search` fail the same way, so fixing only the type named in the error
/// message would leave the same barrier two steps later.
#[test]
fn every_untranslatable_codex_tool_type_is_handled() {
    for kind in ["namespace", "custom", "tool_search"] {
        let tools = json!([
            {"type": "function", "name": "kept"},
            {"type": kind, "name": "dropped_one"}
        ]);
        let translated = crate::openai::translate_tools(&tools);
        let translated = translated.as_array().expect("array");
        assert_eq!(translated.len(), 1, "{kind}: {translated:#?}");
        assert_eq!(translated[0]["name"], "kept", "{kind}");
        assert_eq!(
            crate::openai::untranslatable_anthropic_tools(&tools),
            vec![format!("{kind} (dropped_one)")],
            "{kind}"
        );
    }
}

/// A request whose tools are *all* untranslatable must still be sensible: an
/// empty tool list, not a `400` mid-conversation and not a malformed array.
#[test]
fn a_wholly_untranslatable_tool_set_yields_an_empty_list() {
    let tools = json!([
        {"type": "namespace", "name": "a"},
        {"type": "tool_search"}
    ]);
    let translated = crate::openai::translate_tools(&tools);
    assert_eq!(translated, json!([]), "{translated}");
    assert_eq!(
        crate::openai::untranslatable_anthropic_tools(&tools),
        vec!["namespace (a)".to_string(), "tool_search".to_string()]
    );
}

/// A function tool without a usable name cannot be translated either, and must
/// not slip through as a nameless Anthropic tool.
#[test]
fn a_nameless_function_tool_is_dropped() {
    let tools = json!([{"type": "function"}, {"type": "function", "name": ""}]);
    assert_eq!(crate::openai::translate_tools(&tools), json!([]));
    assert_eq!(
        crate::openai::untranslatable_anthropic_tools(&tools).len(),
        2
    );
}
