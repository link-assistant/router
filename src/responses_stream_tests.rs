use super::*;

#[test]
fn codex_response_stream_converts_to_chat_chunks() {
    let mut translator = ResponsesChatStreamTranslator::new("gpt-5.6-sol");
    let first = translator.push(
        br#"event: response.created
data: {"type":"response.created","response":{"id":"resp_1","created_at":1786448400,"model":"gpt-5.6-sol","status":"in_progress"}}

event: response.output_text.delta
data: {"type":"response.output_text.delta","item_id":"msg_1","output_index":0,"content_index":0,"delta":"1"}

"#,
    );
    let second = translator.push(
        br#"event: response.output_text.delta
data: {"type":"response.output_text.delta","item_id":"msg_1","output_index":0,"content_index":0,"delta":"3"}

event: response.completed
data: {"type":"response.completed","response":{"id":"resp_1","created_at":1786448400,"model":"gpt-5.6-sol","status":"completed","output":[]}}

"#,
    );
    let joined = first.into_iter().chain(second).collect::<String>();

    assert!(joined.contains("\"object\":\"chat.completion.chunk\""));
    assert!(joined.contains("\"role\":\"assistant\""));
    assert!(joined.contains("\"content\":\"1\""));
    assert!(joined.contains("\"content\":\"3\""));
    assert!(joined.contains("\"finish_reason\":\"stop\""));
    assert!(joined.ends_with("data: [DONE]\n\n"));
    assert!(!joined.contains("response.output_text.delta"));
}

#[test]
fn codex_chat_stream_emits_requested_usage_chunk() {
    let mut translator = ResponsesChatStreamTranslator::new("gpt-5.6-sol").with_include_usage(true);
    let frames = translator.push(
        br#"event: response.completed
data: {"type":"response.completed","response":{"id":"resp_1","model":"gpt-5.6-sol","usage":{"input_tokens":9,"output_tokens":2,"total_tokens":11}}}

"#,
    );
    let usage = frames
        .iter()
        .filter_map(|frame| frame.strip_prefix("data: "))
        .filter_map(|data| serde_json::from_str::<Value>(data.trim()).ok())
        .find(|chunk| chunk["choices"].as_array().is_some_and(Vec::is_empty))
        .expect("usage chunk");
    assert_eq!(usage["usage"]["prompt_tokens"], 9);
    assert_eq!(usage["usage"]["completion_tokens"], 2);
    assert_eq!(usage["usage"]["total_tokens"], 11);
}

#[test]
fn codex_chat_stream_holds_a_cross_chunk_stop_sequence() {
    let mut translator =
        ResponsesChatStreamTranslator::new("gpt-5.6-sol").with_stop_sequences(vec!["<END>".into()]);
    let first = translator
        .push(b"data:{\"type\":\"response.output_text.delta\",\"delta\":\"visible<E\"}\n\n");
    let second = translator
        .push(b"data:{\"type\":\"response.output_text.delta\",\"delta\":\"ND>hidden\"}\n\n");
    let joined = first.into_iter().chain(second).collect::<String>();

    assert!(joined.contains("visible"));
    assert!(!joined.contains("<END>"));
    assert!(!joined.contains("hidden"));
    assert!(joined.contains("\"finish_reason\":\"stop\""));
    assert!(joined.ends_with("data: [DONE]\n\n"));
}
