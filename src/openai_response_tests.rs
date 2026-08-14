use super::*;

#[test]
fn translates_tool_call_blocks() {
    let req = OpenAIChatCompletionRequest {
        model: "gpt-4".into(),
        messages: vec![ChatMessage {
            role: "user".into(),
            content: Value::String("search for X".into()),
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
        tools: Some(json!([
            {
                "type": "function",
                "function": {
                    "name": "search",
                    "description": "search",
                    "parameters": {"type": "object"}
                }
            }
        ])),
        tool_choice: Some(json!("required")),
        reasoning_effort: None,
        reasoning: None,
    };
    let body = chat_completion_to_anthropic(&req);
    assert_eq!(body["tools"][0]["name"], "search");
    assert_eq!(body["tool_choice"]["type"], "any");
}

#[test]
fn anthropic_to_chat_basic() {
    let antrhopic_resp = json!({
        "id": "msg_1",
        "content": [
            {"type": "text", "text": "hello back"}
        ],
        "stop_reason": "end_turn",
        "usage": {"input_tokens": 5, "output_tokens": 3}
    });
    let out = anthropic_to_chat_completion(&antrhopic_resp, "claude-sonnet-4-5-20250929");
    assert_eq!(out["model"], "claude-sonnet-4-5-20250929");
    assert_eq!(out["choices"][0]["message"]["role"], "assistant");
    assert_eq!(out["choices"][0]["message"]["content"], "hello back");
    assert_eq!(out["choices"][0]["finish_reason"], "stop");
    assert_eq!(out["usage"]["prompt_tokens"], 5);
    assert_eq!(out["usage"]["completion_tokens"], 3);
    assert_eq!(out["usage"]["total_tokens"], 8);
}

#[test]
fn anthropic_tool_use_to_openai_tool_calls() {
    let resp = json!({
        "id": "msg_x",
        "content": [
            {"type": "tool_use", "id": "t1", "name": "lookup", "input": {"q": "rust"}}
        ],
        "stop_reason": "tool_use"
    });
    let out = anthropic_to_chat_completion(&resp, "gpt-4");
    let calls = out["choices"][0]["message"]["tool_calls"]
        .as_array()
        .unwrap();
    assert_eq!(calls[0]["id"], "t1");
    assert_eq!(calls[0]["function"]["name"], "lookup");
    assert!(
        calls[0]["function"]["arguments"]
            .as_str()
            .unwrap()
            .contains("rust")
    );
    assert_eq!(out["choices"][0]["finish_reason"], "tool_calls");
}

#[test]
fn response_stream_emits_named_output_item_lifecycle() {
    let mut translator =
        OpenAIStreamTranslator::new(OpenAIStreamShape::Response, "claude-haiku-4-5");
    let frames = translator.push(
        br#"event: message_start
data: {"type":"message_start","message":{"id":"msg_1","model":"claude-haiku-4-5"}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"hel"}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"lo"}}

event: message_stop
data: {"type":"message_stop"}

"#,
    );
    let event_names = frames
        .iter()
        .filter_map(|frame| frame.lines().next()?.strip_prefix("event: "))
        .collect::<Vec<_>>();

    assert_eq!(
        event_names,
        vec![
            "response.created",
            "response.in_progress",
            "response.output_item.added",
            "response.content_part.added",
            "response.output_text.delta",
            "response.output_text.delta",
            "response.output_text.done",
            "response.content_part.done",
            "response.output_item.done",
            "response.completed",
        ]
    );

    let events = frames
        .iter()
        .filter_map(|frame| {
            frame
                .lines()
                .find_map(|line| line.strip_prefix("data: "))
                .filter(|data| *data != "[DONE]")
                .map(|data| serde_json::from_str::<Value>(data).unwrap())
        })
        .collect::<Vec<_>>();
    let item_id = events[2]["item"]["id"].as_str().unwrap();
    for event in &events[3..8] {
        assert_eq!(event["item_id"], item_id);
        assert_eq!(event["output_index"], 0);
    }
    assert_eq!(events[3]["content_index"], 0);
    assert_eq!(events[4]["content_index"], 0);
    assert_eq!(events[5]["content_index"], 0);
    assert_eq!(events[6]["text"], "hello");
    assert_eq!(events[7]["part"]["text"], "hello");
    assert_eq!(events[8]["item"]["content"][0]["text"], "hello");
    assert_eq!(events[9]["response"]["output"][0]["id"], item_id);
    assert_eq!(
        events[9]["response"]["output"][0]["content"][0]["text"],
        "hello"
    );
    assert_eq!(frames.last().map(String::as_str), Some("data: [DONE]\n\n"));
}

#[test]
fn list_models_includes_known_ids() {
    let v = list_models();
    let arr = v["data"].as_array().unwrap();
    let ids: Vec<&str> = arr
        .iter()
        .filter_map(|m| m.get("id").and_then(Value::as_str))
        .collect();
    assert!(ids.contains(&"claude-opus-4-7"));
    assert!(ids.contains(&"claude-sonnet-4-5-20250929"));
}
