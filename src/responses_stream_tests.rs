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

#[test]
fn codex_chat_stream_translates_incomplete_as_length() {
    let mut translator = ResponsesChatStreamTranslator::new("gpt-5.6-sol");
    let output = translator
        .push(b"data: {\"type\":\"response.incomplete\",\"response\":{}}\n\n")
        .join("");

    assert!(output.contains("\"finish_reason\":\"length\""), "{output}");
    assert!(output.ends_with("data: [DONE]\n\n"), "{output}");
}

#[test]
fn codex_chat_stream_failed_after_deltas_emits_only_an_error_terminal() {
    let mut translator = ResponsesChatStreamTranslator::new("gpt-5.6-sol");
    let mut output = translator
        .push(b"data: {\"type\":\"response.output_text.delta\",\"delta\":\"partial\"}\n\ndata: {\"type\":\"response.output_item.added\",\"output_index\":0,\"item\":{\"type\":\"function_call\",\"call_id\":\"call_1\",\"name\":\"lookup\"}}\n\ndata: {\"type\":\"response.function_call_arguments.delta\",\"output_index\":0,\"delta\":\"{}\"}\n\n")
        .join("");
    output.push_str(&translator.push(b"data: {\"type\":\"response.failed\",\"response\":{\"id\":\"resp_1\",\"error\":{\"message\":\"boom\",\"type\":\"server_error\",\"code\":\"upstream_failed\",\"parameter\":\"input\",\"private_account\":\"secret\"}}}\n\ndata: [DONE]\n\n").join(""));

    assert!(output.contains("partial"), "{output}");
    assert!(output.contains("\"message\":\"boom\""), "{output}");
    assert!(output.contains("\"type\":\"server_error\""), "{output}");
    assert!(output.contains("\"code\":\"upstream_failed\""), "{output}");
    assert!(output.contains("\"param\":\"input\""), "{output}");
    assert!(!output.contains("private_account"), "{output}");
    assert!(!output.contains("\"finish_reason\":\""), "{output}");
    assert!(!output.contains("data: [DONE]"), "{output}");
}

#[test]
fn codex_chat_stream_standalone_error_after_deltas_is_terminal() {
    let mut translator = ResponsesChatStreamTranslator::new("gpt-5.6-sol");
    let mut output = translator
        .push(b"data: {\"type\":\"response.output_text.delta\",\"delta\":\"partial\"}\n\ndata: {\"type\":\"response.output_item.added\",\"output_index\":0,\"item\":{\"type\":\"function_call\",\"call_id\":\"call_1\",\"name\":\"lookup\"}}\n\ndata: {\"type\":\"response.function_call_arguments.delta\",\"output_index\":0,\"delta\":\"{}\"}\n\n")
        .join("");
    output.push_str(&translator.push(b"data: {\"type\":\"error\",\"message\":\"standalone boom\",\"code\":\"server_error\",\"param\":\"input\",\"private_account\":\"secret\"}\n\ndata: {\"type\":\"response.completed\",\"response\":{}}\n\ndata: [DONE]\n\n").join(""));

    assert!(output.contains("partial"), "{output}");
    assert!(
        output.contains("\"message\":\"standalone boom\""),
        "{output}"
    );
    assert!(output.contains("\"type\":\"api_error\""), "{output}");
    assert!(output.contains("\"code\":\"server_error\""), "{output}");
    assert!(output.contains("\"param\":\"input\""), "{output}");
    assert!(!output.contains("private_account"), "{output}");
    assert!(!output.contains("\"finish_reason\":\""), "{output}");
    assert!(!output.contains("data: [DONE]"), "{output}");
}

#[test]
fn codex_chat_stream_preserves_refusal_deltas_and_content_order() {
    let mut translator = ResponsesChatStreamTranslator::new("gpt-5.6-sol");
    let output = translator.push(b"data: {\"type\":\"response.output_text.delta\",\"output_index\":0,\"content_index\":0,\"delta\":\"before \"}\n\ndata: {\"type\":\"response.refusal.delta\",\"output_index\":0,\"content_index\":1,\"delta\":\"cannot comply\"}\n\ndata: {\"type\":\"response.refusal.done\",\"output_index\":0,\"content_index\":1,\"refusal\":\"cannot comply\"}\n\ndata: {\"type\":\"response.output_text.delta\",\"output_index\":1,\"content_index\":0,\"delta\":\"after\"}\n\ndata: {\"type\":\"response.completed\",\"response\":{}}\n\n").join("");

    let before = output.find("\"content\":\"before \"").unwrap();
    let refusal = output.find("\"refusal\":\"cannot comply\"").unwrap();
    let after = output.find("\"content\":\"after\"").unwrap();
    assert!(before < refusal && refusal < after, "{output}");
    assert_eq!(output.matches("\"refusal\":\"cannot comply\"").count(), 1);
    assert!(output.contains("\"finish_reason\":\"stop\""), "{output}");
}
