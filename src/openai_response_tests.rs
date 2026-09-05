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
        frequency_penalty: None,
        presence_penalty: None,
        logit_bias: None,
        seed: None,
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
        response_format: None,
        parallel_tool_calls: None,
        n: None,
        modalities: None,
        audio: None,
        logprobs: None,
        top_logprobs: None,
        safety_identifier: None,
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

/// The listing carries exactly the ids it is given -- the router holds no
/// model names of its own (issue #192).
#[test]
fn list_models_advertises_only_the_supplied_catalog() {
    let catalog = vec!["aurora-2-base".to_string(), "borealis-9-ultra".to_string()];
    let v = list_models_from(&catalog, "examplecorp");
    let arr = v["data"].as_array().unwrap();
    let ids: Vec<&str> = arr
        .iter()
        .filter_map(|m| m.get("id").and_then(Value::as_str))
        .collect();
    assert_eq!(ids, ["aurora-2-base", "borealis-9-ultra"]);
    assert_eq!(arr[0]["owned_by"], "examplecorp");

    // An account that has discovered nothing advertises nothing.
    assert!(
        list_models_from(&[], "examplecorp")["data"]
            .as_array()
            .unwrap()
            .is_empty()
    );
}

/// The exact upstream frames a forced-tool turn produces: a `tool_use` block,
/// its arguments in fragments, and no text at all.
fn tool_only_upstream() -> &'static [u8] {
    br#"event: message_start
data: {"type":"message_start","message":{"id":"msg_1","model":"claude-haiku-4-5"}}

event: content_block_start
data: {"type":"content_block_start","index":0,"content_block":{"type":"tool_use","id":"toolu_01","name":"write_file"}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"input_json_delta","partial_json":"{\"path\":"}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"input_json_delta","partial_json":"\"result.txt\",\"text\":"}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"input_json_delta","partial_json":"\"42\"}"}}

event: content_block_stop
data: {"type":"content_block_stop","index":0}

event: message_stop
data: {"type":"message_stop"}

"#
}

fn event_names(frames: &[String]) -> Vec<&str> {
    frames
        .iter()
        .filter_map(|frame| frame.lines().next()?.strip_prefix("event: "))
        .collect()
}

/// Parse the JSON payload of the frame with the given event name.
fn payload(frames: &[String], event: &str) -> Option<Value> {
    frames.iter().find_map(|frame| {
        let mut lines = frame.lines();
        let name = lines.next()?.strip_prefix("event: ")?;
        if name != event {
            return None;
        }
        serde_json::from_str(lines.next()?.strip_prefix("data: ")?).ok()
    })
}

/// A streamed tool call must reach the caller as a `function_call` item.
/// Previously the stream carried no function-call event of any kind (issue
/// #218), so an agentic client saw a successful, empty answer.
#[test]
fn a_streamed_tool_call_becomes_a_function_call_item() {
    let mut translator =
        OpenAIStreamTranslator::new(OpenAIStreamShape::Response, "claude-haiku-4-5");
    let frames = translator.push(tool_only_upstream());
    let names = event_names(&frames);

    assert!(names.contains(&"response.output_item.added"), "{names:?}");
    assert!(
        names.contains(&"response.function_call_arguments.delta"),
        "{names:?}"
    );
    assert!(
        names.contains(&"response.function_call_arguments.done"),
        "{names:?}"
    );

    let added = payload(&frames, "response.output_item.added").expect("item added");
    assert_eq!(added["item"]["type"], "function_call", "{added}");
    assert_eq!(added["item"]["call_id"], "toolu_01", "{added}");
    assert_eq!(added["item"]["name"], "write_file", "{added}");

    let done = payload(&frames, "response.function_call_arguments.done").expect("arguments done");
    assert_eq!(
        done["arguments"], r#"{"path":"result.txt","text":"42"}"#,
        "fragments must be reassembled in order: {done}"
    );
}

/// The arguments assembled from the streamed fragments must equal what the
/// non-streaming path produces from the equivalent upstream body. This is the
/// assertion that keeps the two paths from drifting apart again — the drift is
/// exactly how issue #218 arose, since the non-streaming path was correct
/// throughout.
#[test]
fn streamed_arguments_match_the_non_streaming_translation() {
    let mut translator =
        OpenAIStreamTranslator::new(OpenAIStreamShape::Response, "claude-haiku-4-5");
    let frames = translator.push(tool_only_upstream());
    let streamed = payload(&frames, "response.function_call_arguments.done")
        .expect("arguments done")["arguments"]
        .as_str()
        .expect("arguments are a string")
        .to_string();

    // The same tool call as a complete (non-streamed) upstream message.
    let non_streaming = crate::openai::anthropic_to_chat_completion(
        &serde_json::json!({
            "id": "msg_1",
            "content": [{
                "type": "tool_use",
                "id": "toolu_01",
                "name": "write_file",
                "input": {"path": "result.txt", "text": "42"}
            }],
            "stop_reason": "tool_use"
        }),
        "claude-haiku-4-5",
    );
    let expected = non_streaming["choices"][0]["message"]["tool_calls"][0]["function"]["arguments"]
        .as_str()
        .expect("non-streaming tool call arguments");

    assert_eq!(streamed, expected);
    // And both agree on the identity of the call.
    let added = payload(&frames, "response.output_item.added").expect("item added");
    assert_eq!(
        added["item"]["call_id"],
        non_streaming["choices"][0]["message"]["tool_calls"][0]["id"]
    );
    assert_eq!(
        added["item"]["name"],
        non_streaming["choices"][0]["message"]["tool_calls"][0]["function"]["name"]
    );
}

/// A turn that produced only tool calls must not carry an empty `output_text`
/// item. A well-formed, successful, empty answer is worse than an error,
/// because the client cannot tell that anything went wrong (issue #218).
#[test]
fn a_tool_only_turn_emits_no_empty_output_text() {
    let mut translator =
        OpenAIStreamTranslator::new(OpenAIStreamShape::Response, "claude-haiku-4-5");
    let frames = translator.push(tool_only_upstream());
    let names = event_names(&frames);

    assert!(
        !names.contains(&"response.output_text.done"),
        "a tool-only turn must not close a text item: {names:?}"
    );
    assert!(!names.contains(&"response.output_text.delta"), "{names:?}");
    assert!(!names.contains(&"response.content_part.added"), "{names:?}");

    // The completed response lists the tool call and nothing else.
    let completed = payload(&frames, "response.completed").expect("completed");
    let output = completed["response"]["output"]
        .as_array()
        .expect("output array");
    assert_eq!(output.len(), 1, "{completed}");
    assert_eq!(output[0]["type"], "function_call", "{completed}");
    assert_eq!(
        output[0]["arguments"],
        r#"{"path":"result.txt","text":"42"}"#
    );
}

/// A turn mixing text and a tool call must preserve both, in the order the
/// vendor emitted them.
#[test]
fn a_mixed_text_and_tool_turn_preserves_both_in_order() {
    let mut translator =
        OpenAIStreamTranslator::new(OpenAIStreamShape::Response, "claude-haiku-4-5");
    let frames = translator.push(
        br#"event: message_start
data: {"type":"message_start","message":{"id":"msg_1","model":"claude-haiku-4-5"}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"I'll create it."}}

event: content_block_start
data: {"type":"content_block_start","index":1,"content_block":{"type":"tool_use","id":"toolu_02","name":"write_file"}}

event: content_block_delta
data: {"type":"content_block_delta","index":1,"delta":{"type":"input_json_delta","partial_json":"{\"path\":\"a\"}"}}

event: content_block_stop
data: {"type":"content_block_stop","index":1}

event: message_stop
data: {"type":"message_stop"}

"#,
    );

    let completed = payload(&frames, "response.completed").expect("completed");
    let output = completed["response"]["output"]
        .as_array()
        .expect("output array");
    assert_eq!(output.len(), 2, "{completed}");
    // Text came first upstream, so it keeps the first slot.
    assert_eq!(output[0]["type"], "message", "{completed}");
    assert_eq!(
        output[0]["content"][0]["text"], "I'll create it.",
        "{completed}"
    );
    assert_eq!(output[1]["type"], "function_call", "{completed}");
    assert_eq!(output[1]["call_id"], "toolu_02", "{completed}");

    // Each item occupies a distinct output slot.
    let text_index =
        payload(&frames, "response.output_text.done").expect("text done")["output_index"]
            .as_u64()
            .expect("index");
    let call_index = payload(&frames, "response.function_call_arguments.done")
        .expect("arguments done")["output_index"]
        .as_u64()
        .expect("index");
    assert_ne!(text_index, call_index);
}
