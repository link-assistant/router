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
            },
            ChatMessage {
                role: "user".into(),
                content: Value::String("Hello".into()),
                name: None,
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
    };
    let body = chat_completion_to_anthropic(&req);
    assert_eq!(body["model"], "claude-sonnet-4-5-20250929");
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
        }],
        max_tokens: None,
        max_completion_tokens: None,
        temperature: None,
        top_p: None,
        stream: None,
        stop: None,
        tools: None,
        tool_choice: None,
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
        }],
        max_tokens: None,
        max_completion_tokens: None,
        temperature: Some(0.7),
        top_p: None,
        stream: None,
        stop: None,
        tools: None,
        tool_choice: None,
    };
    let body = chat_completion_to_anthropic(&req);
    assert!(body.get("temperature").is_none());
}

#[test]
fn model_resolution_rejects_unknown_ids() {
    assert_eq!(resolve_model("totally-made-up-model-xyz"), None);
}

#[test]
fn model_resolution_keeps_intentional_aliases_explicit() {
    assert_eq!(
        resolve_model("gpt-4o").as_deref(),
        Some("claude-sonnet-4-5-20250929")
    );
    assert_eq!(resolve_model("gpt-5").as_deref(), Some("claude-opus-4-7"));
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
        }],
        max_tokens: Some(50),
        max_completion_tokens: None,
        temperature: None,
        top_p: None,
        stream: None,
        stop: None,
        tools: None,
        tool_choice: None,
    };
    let body = chat_completion_to_anthropic(&req);
    let parts = body["messages"][0]["content"].as_array().unwrap();
    assert_eq!(parts[0]["type"], "text");
    assert_eq!(parts[0]["text"], "describe");
    assert_eq!(parts[1]["type"], "image");
    assert_eq!(parts[1]["source"]["url"], "https://example.com/x.png");
}
