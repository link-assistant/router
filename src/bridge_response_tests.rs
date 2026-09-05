use serde_json::{Value, json};

use crate::anthropic_bridge::openai_json_to_anthropic_message;
use crate::anthropic_stream::AnthropicStreamTranslator;
use crate::openai::{OpenAIStreamShape, OpenAIStreamTranslator, anthropic_to_chat_completion};
use crate::responses::anthropic_to_response;

fn payloads(frames: &[String]) -> Vec<Value> {
    frames
        .iter()
        .filter_map(|frame| {
            frame
                .lines()
                .find_map(|line| line.strip_prefix("data: "))
                .filter(|data| *data != "[DONE]")
                .and_then(|data| serde_json::from_str(data).ok())
        })
        .collect()
}

fn anthropic_stream(reason: &str, include_citation: bool) -> Vec<u8> {
    let citation = if include_citation {
        "event: content_block_delta\ndata: {\"type\":\"content_block_delta\",\"index\":0,\"delta\":{\"type\":\"citations_delta\",\"citation\":{\"type\":\"web_search_result_location\",\"url\":\"https://example.test/rust\",\"title\":\"Rust\",\"cited_text\":\"Rust\"}}}\n\n"
    } else {
        ""
    };
    format!(
        "event: message_start\ndata: {{\"type\":\"message_start\",\"message\":{{\"id\":\"msg_1\",\"model\":\"claude-test\",\"usage\":{{\"input_tokens\":5,\"cache_creation_input_tokens\":7,\"cache_read_input_tokens\":11,\"output_tokens\":0}}}}}}\n\nevent: content_block_delta\ndata: {{\"type\":\"content_block_delta\",\"index\":0,\"delta\":{{\"type\":\"text_delta\",\"text\":\"Rust\"}}}}\n\n{citation}event: message_delta\ndata: {{\"type\":\"message_delta\",\"delta\":{{\"stop_reason\":\"{reason}\"}},\"usage\":{{\"output_tokens\":3}}}}\n\nevent: message_stop\ndata: {{\"type\":\"message_stop\"}}\n\n"
    )
    .into_bytes()
}

#[test]
fn every_anthropic_stop_reason_has_equivalent_buffered_openai_semantics() {
    for (reason, chat_finish, response_status, incomplete_reason) in [
        ("end_turn", "stop", "completed", None),
        ("stop_sequence", "stop", "completed", None),
        ("tool_use", "tool_calls", "completed", None),
        (
            "max_tokens",
            "length",
            "incomplete",
            Some("max_output_tokens"),
        ),
        (
            "pause_turn",
            "length",
            "incomplete",
            Some("max_output_tokens"),
        ),
        (
            "refusal",
            "content_filter",
            "incomplete",
            Some("content_filter"),
        ),
        (
            "model_context_window_exceeded",
            "length",
            "incomplete",
            Some("max_output_tokens"),
        ),
    ] {
        let source = json!({
            "id": "msg_stop", "model": "claude-test",
            "content": [{"type": "text", "text": "partial"}],
            "stop_reason": reason
        });
        let chat = anthropic_to_chat_completion(&source, "claude-test");
        assert_eq!(chat["choices"][0]["finish_reason"], chat_finish, "{reason}");
        let response = anthropic_to_response(&source, "claude-test");
        assert_eq!(response["status"], response_status, "{reason}");
        assert_eq!(
            response.pointer("/incomplete_details/reason"),
            incomplete_reason.map(Value::from).as_ref(),
            "{reason}"
        );
        if reason == "refusal" {
            assert_eq!(chat["choices"][0]["message"]["refusal"], "partial");
            assert!(chat["choices"][0]["message"]["content"].is_null());
            assert_eq!(response["output"][0]["content"][0]["type"], "refusal");
        }
    }
}

#[test]
fn every_anthropic_stop_reason_has_equivalent_streamed_openai_semantics() {
    for (reason, chat_finish, terminal, status, incomplete_reason) in [
        ("end_turn", "stop", "response.completed", "completed", None),
        (
            "stop_sequence",
            "stop",
            "response.completed",
            "completed",
            None,
        ),
        (
            "tool_use",
            "tool_calls",
            "response.completed",
            "completed",
            None,
        ),
        (
            "max_tokens",
            "length",
            "response.incomplete",
            "incomplete",
            Some("max_output_tokens"),
        ),
        (
            "pause_turn",
            "length",
            "response.incomplete",
            "incomplete",
            Some("max_output_tokens"),
        ),
        (
            "refusal",
            "content_filter",
            "response.incomplete",
            "incomplete",
            Some("content_filter"),
        ),
        (
            "model_context_window_exceeded",
            "length",
            "response.incomplete",
            "incomplete",
            Some("max_output_tokens"),
        ),
    ] {
        let stream = anthropic_stream(reason, false);
        let mut chat =
            OpenAIStreamTranslator::new(OpenAIStreamShape::ChatCompletion, "claude-test");
        let chat_payloads = payloads(&chat.push(&stream));
        assert_eq!(
            chat_payloads.last().unwrap()["choices"][0]["finish_reason"],
            chat_finish,
            "{reason}"
        );

        let mut responses = OpenAIStreamTranslator::new(OpenAIStreamShape::Response, "claude-test");
        let response_payloads = payloads(&responses.push(&stream));
        let terminal_payload = response_payloads
            .iter()
            .find(|payload| payload["type"] == terminal)
            .unwrap_or_else(|| panic!("missing {terminal} for {reason}: {response_payloads:?}"));
        assert_eq!(terminal_payload["response"]["status"], status, "{reason}");
        assert_eq!(
            terminal_payload.pointer("/response/incomplete_details/reason"),
            incomplete_reason.map(Value::from).as_ref(),
            "{reason}"
        );
    }
}

#[test]
fn anthropic_cache_usage_maps_to_valid_chat_and_responses_shapes() {
    let source = json!({
        "content": [], "stop_reason": "end_turn",
        "usage": {
            "input_tokens": 5, "cache_creation_input_tokens": 7,
            "cache_read_input_tokens": 11, "output_tokens": 3
        }
    });
    let chat = anthropic_to_chat_completion(&source, "claude-test");
    assert_eq!(chat["usage"]["prompt_tokens"], 23);
    assert_eq!(chat["usage"]["prompt_tokens_details"]["cached_tokens"], 11);
    assert_eq!(chat["usage"]["total_tokens"], 26);
    let response = anthropic_to_response(&source, "claude-test");
    assert_eq!(response["usage"]["input_tokens"], 23);
    assert_eq!(
        response["usage"]["input_tokens_details"]["cached_tokens"],
        11
    );
    assert_eq!(response["usage"]["output_tokens"], 3);
    assert_eq!(response["usage"]["total_tokens"], 26);

    let stream = anthropic_stream("end_turn", false);
    let mut responses = OpenAIStreamTranslator::new(OpenAIStreamShape::Response, "claude-test");
    let response_payloads = payloads(&responses.push(&stream));
    let completed = response_payloads
        .iter()
        .find(|payload| payload["type"] == "response.completed")
        .expect("completed response");
    assert_eq!(completed["response"]["usage"]["input_tokens"], 23);
    assert_eq!(
        completed["response"]["usage"]["input_tokens_details"]["cached_tokens"],
        11
    );
    assert_eq!(completed["response"]["usage"]["total_tokens"], 26);

    let mut chat = OpenAIStreamTranslator::new(OpenAIStreamShape::ChatCompletion, "claude-test")
        .with_include_usage(true);
    let chat_payloads = payloads(&chat.push(&stream));
    let usage = chat_payloads
        .iter()
        .find(|payload| payload["choices"].as_array().is_some_and(Vec::is_empty))
        .expect("Chat usage chunk");
    assert_eq!(usage["usage"]["prompt_tokens"], 23);
    assert_eq!(usage["usage"]["prompt_tokens_details"]["cached_tokens"], 11);
    assert_eq!(usage["usage"]["total_tokens"], 26);
}

#[test]
fn compatible_anthropic_url_citations_keep_order_and_offsets() {
    let source = json!({
        "content": [
            {"type": "text", "text": "Rust and ", "citations": [{
                "type": "web_search_result_location", "url": "https://example.test/rust",
                "title": "Rust", "cited_text": "Rust", "encrypted_index": "opaque"
            }]},
            {"type": "text", "text": "Cargo.", "citations": [{
                "type": "web_search_result_location", "url": "https://example.test/cargo",
                "title": "Cargo", "cited_text": "Cargo"
            }]}
        ],
        "stop_reason": "end_turn"
    });
    let chat = anthropic_to_chat_completion(&source, "claude-test");
    let annotations = chat["choices"][0]["message"]["annotations"]
        .as_array()
        .expect("Chat annotations");
    assert_eq!(annotations[0]["url_citation"]["start_index"], 0);
    assert_eq!(annotations[0]["url_citation"]["end_index"], 4);
    assert_eq!(annotations[1]["url_citation"]["start_index"], 9);
    assert_eq!(annotations[1]["url_citation"]["end_index"], 14);
    assert!(!chat.to_string().contains("encrypted_index"));

    let response = anthropic_to_response(&source, "claude-test");
    let annotations = response["output"][0]["content"][0]["annotations"]
        .as_array()
        .expect("Responses annotations");
    assert_eq!(annotations[0]["start_index"], 0);
    assert_eq!(annotations[1]["start_index"], 9);
    let round_trip = openai_json_to_anthropic_message(
        &json!({
            "object": "response", "status": "completed",
            "output": [{"type": "message", "content": [{
                "type": "output_text", "text": "Rust and Cargo.", "annotations": annotations
            }]}]
        }),
        "claude-test",
    );
    assert_eq!(
        round_trip["content"][0]["citations"][0]["cited_text"],
        "Rust"
    );
    assert_eq!(
        round_trip["content"][0]["citations"][1]["cited_text"],
        "Cargo"
    );
}

#[test]
fn citation_stream_events_translate_to_both_openai_surfaces() {
    let stream = anthropic_stream("end_turn", true);
    let mut chat = OpenAIStreamTranslator::new(OpenAIStreamShape::ChatCompletion, "claude-test");
    let chat_payloads = payloads(&chat.push(&stream));
    assert!(chat_payloads.iter().any(|payload| {
        payload.pointer("/choices/0/delta/annotations/0/url_citation/url")
            == Some(&json!("https://example.test/rust"))
    }));
    let mut responses = OpenAIStreamTranslator::new(OpenAIStreamShape::Response, "claude-test");
    let response_payloads = payloads(&responses.push(&stream));
    assert!(response_payloads.iter().any(|payload| {
        payload["type"] == "response.output_text.annotation.added"
            && payload["annotation"]["url"] == "https://example.test/rust"
    }));
    let mut anthropic = AnthropicStreamTranslator::new("claude-test");
    let output = anthropic
        .push(br#"data: {"type":"response.output_text.delta","output_index":0,"content_index":0,"delta":"Rust Rust"}

data: {"type":"response.output_text.annotation.added","output_index":0,"content_index":0,"annotation":{"type":"url_citation","url":"https://example.test/one","title":"One","start_index":0,"end_index":4}}

data: {"type":"response.output_text.annotation.added","output_index":0,"content_index":0,"annotation":{"type":"url_citation","url":"https://example.test/two","title":"Two","start_index":5,"end_index":9}}

data: {"type":"response.completed","response":{"usage":{"input_tokens":11,"input_tokens_details":{"cached_tokens":7},"output_tokens":2},"service_tier":"priority"}}

"#)
        .join("");
    assert_eq!(
        output.matches("\"type\":\"citations_delta\"").count(),
        2,
        "{output}"
    );
    assert_eq!(
        output.matches("\"cited_text\":\"Rust\"").count(),
        2,
        "{output}"
    );
    assert!(output.contains("\"input_tokens\":4"), "{output}");
    assert!(output.contains("\"cache_read_input_tokens\":7"), "{output}");
    assert!(output.contains("\"service_tier\":\"priority\""), "{output}");
}

#[test]
fn unicode_offsets_and_missing_usage_are_safe() {
    let annotations = json!([{
        "type": "url_citation", "url": "https://example.test",
        "title": "Rust", "start_index": 2, "end_index": 6
    }]);
    let citations = crate::bridge_response::openai_annotations_to_anthropic(
        "🦀 Rust 🦀",
        Some(&annotations),
        false,
    )
    .unwrap();
    assert_eq!(citations[0]["cited_text"], "Rust");
    let usage = crate::bridge_response::AnthropicUsage::from_value(None);
    assert_eq!(usage.chat()["total_tokens"], 0);
    assert_eq!(usage.responses()["total_tokens"], 0);
}

#[test]
fn service_tier_maps_on_buffered_and_streamed_response_shapes() {
    let source = json!({
        "content": [], "stop_reason": "end_turn",
        "usage": {"input_tokens": 1, "output_tokens": 2, "service_tier": "priority"}
    });
    assert_eq!(
        anthropic_to_chat_completion(&source, "claude")["service_tier"],
        "priority"
    );
    assert_eq!(
        anthropic_to_response(&source, "claude")["service_tier"],
        "priority"
    );
    let chat = openai_json_to_anthropic_message(
        &json!({
            "choices": [{"message": {"content": "ok"}, "finish_reason": "stop"}],
            "usage": {"prompt_tokens": 5, "prompt_tokens_details": {"cached_tokens": 3}, "completion_tokens": 2},
            "service_tier": "default"
        }),
        "claude",
    );
    assert_eq!(chat["usage"]["input_tokens"], 2);
    assert_eq!(chat["usage"]["cache_read_input_tokens"], 3);
    assert_eq!(chat["usage"]["service_tier"], "standard");
}
