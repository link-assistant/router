use super::*;

#[test]
fn limiter_without_a_cap_passes_text_through() {
    let mut limiter = OutputTokenLimiter::new(None);
    assert!(!limiter.enabled());
    let (visible, hit) = limiter.push("hello world");
    assert_eq!(visible, "hello world");
    assert!(!hit);
}

#[test]
fn limiter_truncates_at_the_estimated_budget_and_stops() {
    // 2 tokens ~ 8 characters.
    let mut limiter = OutputTokenLimiter::new(Some(2));
    assert_eq!(limiter.push("1234"), ("1234".to_string(), false));
    assert_eq!(limiter.push("567890"), ("5678".to_string(), true));
    assert!(limiter.stopped());
    assert_eq!(limiter.push("more"), (String::new(), false));
}

#[test]
fn limiter_never_splits_a_multibyte_character() {
    let mut limiter = OutputTokenLimiter::new(Some(1));
    let (visible, hit) = limiter.push("привет");
    assert!(hit);
    assert!("привет".starts_with(&visible));
    assert!(visible.len() <= 4);
}

#[test]
fn model_identity_keeps_the_requested_id_and_reports_the_served_one() {
    let mut payload = json!({"model": "gpt-5.6-luna", "object": "response"});
    let served = preserve_model_identity(&mut payload, "codex-auto-review");
    assert_eq!(served.as_deref(), Some("gpt-5.6-luna"));
    assert_eq!(payload["model"], "codex-auto-review");
    assert_eq!(payload[UPSTREAM_MODEL_FIELD], "gpt-5.6-luna");

    let mut same = json!({"model": "gpt-5.6-luna"});
    assert_eq!(preserve_model_identity(&mut same, "gpt-5.6-luna"), None);
    assert!(same.get(UPSTREAM_MODEL_FIELD).is_none());
}

#[test]
fn buffered_chat_limit_truncates_and_reports_length() {
    let mut response = json!({
        "choices": [{"index": 0, "message": {"role": "assistant", "content": "0123456789"}, "finish_reason": "stop"}]
    });
    enforce_chat_limit(&mut response, 1);
    assert_eq!(response["choices"][0]["message"]["content"], "0123");
    assert_eq!(response["choices"][0]["finish_reason"], "length");
}

#[test]
fn buffered_chat_limit_leaves_short_answers_untouched() {
    let mut response = json!({
        "choices": [{"index": 0, "message": {"role": "assistant", "content": "hi"}, "finish_reason": "stop"}]
    });
    enforce_chat_limit(&mut response, 16);
    assert_eq!(response["choices"][0]["message"]["content"], "hi");
    assert_eq!(response["choices"][0]["finish_reason"], "stop");
}

#[test]
fn buffered_response_limit_marks_the_payload_incomplete() {
    let mut response = json!({
        "status": "completed",
        "output": [{
            "type": "message",
            "role": "assistant",
            "content": [{"type": "output_text", "text": "0123456789"}]
        }]
    });
    enforce_response_limit(&mut response, 1);
    assert_eq!(response["output"][0]["content"][0]["text"], "0123");
    assert_eq!(response["status"], "incomplete");
    assert_eq!(
        response["incomplete_details"]["reason"],
        "max_output_tokens"
    );
}

fn sse(events: &[Value]) -> Vec<u8> {
    events
        .iter()
        .fold(String::new(), |mut stream, event| {
            use std::fmt::Write as _;
            let _ = write!(
                stream,
                "event: {}\ndata: {event}\n\n",
                event["type"].as_str().unwrap_or_default()
            );
            stream
        })
        .into_bytes()
}

#[test]
fn stream_rewriter_restores_the_requested_model_identity() {
    let mut rewriter = ResponsesStreamRewriter::new("codex-auto-review", None);
    assert!(rewriter.active());
    let stream = sse(&[
        json!({"type": "response.created", "response": {"id": "resp_1", "model": "gpt-5.6-luna"}}),
        json!({"type": "response.output_text.delta", "delta": "hi"}),
        json!({"type": "response.completed", "response": {"id": "resp_1", "model": "gpt-5.6-luna", "status": "completed"}}),
    ]);
    let out = rewriter.push(&stream) + &rewriter.push(b"data: [DONE]\n\n");
    assert!(!out.contains("\"model\":\"gpt-5.6-luna\""));
    assert!(out.contains("\"model\":\"codex-auto-review\""));
    assert!(out.contains("\"x_router_upstream_model\":\"gpt-5.6-luna\""));
    assert!(out.contains("event: response.created"));
    assert!(out.contains("data: [DONE]"));
    assert_eq!(rewriter.upstream_model(), Some("gpt-5.6-luna"));
}

#[test]
fn stream_rewriter_stops_the_stream_once_the_cap_is_exhausted() {
    let mut rewriter = ResponsesStreamRewriter::new("gpt-5.4-mini", Some(1));
    let stream = sse(&[
        json!({"type": "response.created", "response": {"id": "resp_1", "model": "gpt-5.4-mini"}}),
        json!({"type": "response.output_text.delta", "delta": "0123456789"}),
        json!({"type": "response.output_text.delta", "delta": "never relayed"}),
        json!({"type": "response.completed", "response": {"id": "resp_1", "status": "completed"}}),
    ]);
    let out = rewriter.push(&stream);
    assert!(out.contains("\"delta\":\"0123\""));
    assert!(!out.contains("never relayed"));
    assert!(!out.contains("response.completed"));
    assert!(out.contains("\"type\":\"response.incomplete\""));
    assert!(out.contains("\"reason\":\"max_output_tokens\""));
    assert!(out.ends_with("data: [DONE]\n\n"));
    assert!(rewriter.push(b"event: x\ndata: {}\n\n").is_empty());
}

#[test]
fn stream_rewriter_handles_events_split_across_chunks() {
    let mut rewriter = ResponsesStreamRewriter::new("gpt-5.4-mini", None);
    let mut out = rewriter.push(b"event: response.output_text.delta\ndata: {\"type\":\"resp");
    out.push_str(&rewriter.push(b"onse.output_text.delta\",\"delta\":\"hi\"}\n\n"));
    assert!(out.contains("\"delta\":\"hi\""));
}
