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
fn stream_rewriter_preserves_the_served_model_identity() {
    let mut rewriter = ResponsesStreamRewriter::new("codex-auto-review", None);
    assert!(rewriter.active());
    let stream = sse(&[
        json!({"type": "response.created", "response": {"id": "resp_1", "model": "gpt-5.6-luna"}}),
        json!({"type": "response.output_text.delta", "delta": "hi"}),
        json!({"type": "response.completed", "response": {"id": "resp_1", "model": "gpt-5.6-luna", "status": "completed"}}),
    ]);
    let out = rewriter.push(&stream) + &rewriter.push(b"data: [DONE]\n\n");
    assert!(out.contains("\"model\":\"gpt-5.6-luna\""));
    assert!(!out.contains("\"model\":\"codex-auto-review\""));
    assert!(!out.contains("x_router_"));
    assert!(out.contains("event: response.created"));
    assert!(out.contains("data: [DONE]"));
    assert_eq!(rewriter.upstream_model(), Some("gpt-5.6-luna"));
}

#[test]
fn stream_rewriter_does_not_relabel_chat_or_anthropic_models() {
    let mut chat = ResponsesStreamRewriter::new("stored/shared-future", None);
    let chat_out = chat.push(
        b"data: {\"id\":\"chat_1\",\"object\":\"chat.completion.chunk\",\"model\":\"shared-future\",\"choices\":[]}\n\n",
    );
    assert!(chat_out.contains("\"model\":\"shared-future\""));
    assert!(!chat_out.contains("x_router_"));

    let mut anthropic = ResponsesStreamRewriter::new("future-saffron-2099", None);
    let anthropic_out = anthropic.push(
        b"event: message_start\ndata: {\"type\":\"message_start\",\"message\":{\"model\":\"future\",\"content\":[]}}\n\n",
    );
    assert!(anthropic_out.contains("\"model\":\"future\""));
    assert!(!anthropic_out.contains("x_router_"));
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

#[test]
fn pinned_stream_refuses_substitution_before_any_content() {
    let policy = crate::model_contract::ModelAccessPolicy::exact("model-a");
    let mut rewriter = ResponsesStreamRewriter::new("model-a", None).with_model_policy(&policy);
    let out = rewriter.push(
        b"event: response.created\ndata: {\"type\":\"response.created\",\"response\":{\"id\":\"r\",\"model\":\"model-b\"}}\n\n",
    );
    assert!(out.contains("model_substitution_not_allowed"), "{out}");
    assert!(!out.contains("response.created"), "{out}");
    assert!(out.ends_with("data: [DONE]\n\n"));
}

#[test]
fn pinned_stream_requires_identity_before_content() {
    let policy = crate::model_contract::ModelAccessPolicy::exact("model-a");
    let mut rewriter = ResponsesStreamRewriter::new("model-a", None).with_model_policy(&policy);
    let out = rewriter.push(
        b"event: response.output_text.delta\ndata: {\"type\":\"response.output_text.delta\",\"delta\":\"secret answer\"}\n\n",
    );
    assert!(out.contains("served_model_unknown"), "{out}");
    assert!(!out.contains("secret answer"), "{out}");
}

#[test]
fn translated_stream_withholds_identity_free_preamble() {
    let policy = crate::model_contract::ModelAccessPolicy::exact("model-a");
    let mut rewriter = ResponsesStreamRewriter::new("model-a", None).with_model_policy(&policy);
    let preamble = rewriter.push(
        b"event: response.in_progress\ndata: {\"type\":\"response.in_progress\",\"response\":{\"id\":\"r\"}}\n\n",
    );
    assert!(preamble.is_empty(), "{preamble}");
    let identified = rewriter.push(
        b"event: response.created\ndata: {\"type\":\"response.created\",\"response\":{\"id\":\"r\",\"model\":\"model-a\"}}\n\n",
    );
    assert!(identified.contains("response.created"), "{identified}");
    assert!(!identified.contains("response.in_progress"), "{identified}");
}

#[test]
fn translated_stream_eof_without_identity_is_a_typed_error() {
    let policy = crate::model_contract::ModelAccessPolicy::exact("model-a");
    let mut rewriter = ResponsesStreamRewriter::new("model-a", None).with_model_policy(&policy);
    assert!(
        rewriter
            .push(
                b"event: response.in_progress\ndata: {\"type\":\"response.in_progress\",\"response\":{\"id\":\"r\"}}\n\n",
            )
            .is_empty()
    );

    let out = rewriter.finish();
    assert!(out.contains("served_model_unknown"), "{out}");
    assert!(out.ends_with("data: [DONE]\n\n"), "{out}");
    assert!(rewriter.finish().is_empty());
}

#[test]
fn translated_stream_processes_a_final_identity_event_without_blank_line() {
    let policy = crate::model_contract::ModelAccessPolicy::exact("model-a");
    let mut rewriter = ResponsesStreamRewriter::new("model-a", None).with_model_policy(&policy);
    assert!(
        rewriter
            .push(
                b"event: response.created\ndata: {\"type\":\"response.created\",\"response\":{\"id\":\"r\",\"model\":\"model-a\"}}",
            )
            .is_empty()
    );

    let out = rewriter.finish();
    assert!(out.contains("response.created"), "{out}");
    assert!(!out.contains("served_model_unknown"), "{out}");
    assert_eq!(rewriter.upstream_model(), Some("model-a"));
}

#[test]
fn translated_stream_preserves_upstream_failure_without_identity_error() {
    let policy = crate::model_contract::ModelAccessPolicy::exact("model-a");
    let mut rewriter = ResponsesStreamRewriter::new("model-a", None).with_model_policy(&policy);
    let out = rewriter.push(
        b"event: error\ndata: {\"type\":\"error\",\"error\":{\"type\":\"provider_error\",\"message\":\"failed\"}}\n\n",
    );
    assert!(out.contains("provider_error"), "{out}");
    assert!(!out.contains("served_model_unknown"), "{out}");
    assert!(rewriter.finish().is_empty());
}

#[test]
fn translated_stream_preserves_provider_error_objects_without_identity() {
    let policy = crate::model_contract::ModelAccessPolicy::exact("model-a");
    let mut rewriter = ResponsesStreamRewriter::new("model-a", None).with_model_policy(&policy);
    let out =
        rewriter.push(b"data: {\"error\":{\"code\":429,\"message\":\"provider overloaded\"}}\n\n");
    assert!(out.contains("provider overloaded"), "{out}");
    assert!(!out.contains("served_model_unknown"), "{out}");
    assert!(rewriter.finish().is_empty());
}

#[test]
fn pinned_stream_refuses_identity_drift_after_start() {
    let mut policy = crate::model_contract::ModelAccessPolicy::exact("model-a");
    policy.allow_substitution = true;
    policy.substitution_source = Some("test explicit opt-in".into());
    let mut rewriter = ResponsesStreamRewriter::new("model-a", None).with_model_policy(&policy);
    let out = rewriter.push(
        b"event: response.created\ndata: {\"type\":\"response.created\",\"response\":{\"id\":\"r\",\"model\":\"model-b\"}}\n\nevent: response.completed\ndata: {\"type\":\"response.completed\",\"response\":{\"id\":\"r\",\"model\":\"model-c\"}}\n\n",
    );
    assert!(out.contains("\"model\":\"model-b\""), "{out}");
    assert!(out.contains("served_model_changed"), "{out}");
    assert!(!out.contains("\"model\":\"model-c\""), "{out}");
}

#[test]
fn explicit_substitution_preserves_the_concrete_stream_identity() {
    let mut policy = crate::model_contract::ModelAccessPolicy::exact("alias");
    policy.allow_substitution = true;
    policy.substitution_source = Some("test explicit opt-in".into());
    let mut rewriter = ResponsesStreamRewriter::new("alias", None).with_model_policy(&policy);
    let out = rewriter.push(
        b"event: response.created\ndata: {\"type\":\"response.created\",\"response\":{\"id\":\"r\",\"model\":\"concrete\"}}\n\n",
    );
    assert!(out.contains("\"model\":\"concrete\""), "{out}");
    assert!(!out.contains("\"type\":\"error\""), "{out}");
}

#[test]
fn provider_dynamic_alias_preserves_concrete_stream_identity_without_fallback_opt_in() {
    let policy = crate::model_contract::ModelAccessPolicy::exact("auto-review");
    let mut rewriter = ResponsesStreamRewriter::new("auto-review", None)
        .with_model_policy(&policy)
        .with_selector_kind(crate::model_contract::ModelSelectorKind::ProviderDynamicAlias);
    let out = rewriter.push(
        b"event: response.created\ndata: {\"type\":\"response.created\",\"response\":{\"id\":\"r\",\"model\":\"model-b\"}}\n\n",
    );
    assert!(out.contains("\"model\":\"model-b\""), "{out}");
    assert!(!out.contains("\"type\":\"error\""), "{out}");
}
