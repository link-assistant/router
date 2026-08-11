use super::*;

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
