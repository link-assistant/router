//! Stream-termination behaviour of the Anthropic bridge (issue #668).

use super::*;

fn joined(frames: &[String]) -> String {
    frames.concat()
}

#[test]
fn a_stream_cut_mid_answer_is_never_reported_as_complete() {
    for cut in [
        &b"data: {\"choices\":[{\"delta\":{\"content\":\"partial\"}}]}\n\n"[..],
        &b"data: {\"type\":\"response.output_text.delta\",\"delta\":\"partial\"}\n\n"[..],
    ] {
        let mut t = AnthropicStreamTranslator::new("claude-sonnet-4-5");
        let mut out = joined(&t.push(cut));
        out.push_str(&joined(&t.finish()));
        assert!(out.contains("partial"), "{out}");
        assert!(out.contains("event: error"), "{out}");
        assert!(!out.contains("message_stop"), "{out}");
        assert!(!out.contains("end_turn"), "{out}");
        assert!(!t.upstream_terminated());
    }
}

#[test]
fn every_upstream_terminal_signal_closes_the_stream_normally() {
    for terminal in [
        &b"data: [DONE]\n\n"[..],
        &b"data: {\"choices\":[{\"delta\":{},\"finish_reason\":\"stop\"}]}\n\n"[..],
        &b"data: {\"type\":\"response.completed\",\"response\":{}}\n\n"[..],
        &b"data: {\"type\":\"response.incomplete\",\"response\":{}}\n\n"[..],
    ] {
        let mut t = AnthropicStreamTranslator::new("claude-sonnet-4-5");
        let mut out =
            joined(&t.push(b"data: {\"choices\":[{\"delta\":{\"content\":\"hi\"}}]}\n\n"));
        out.push_str(&joined(&t.push(terminal)));
        out.push_str(&joined(&t.finish()));
        assert!(out.contains("event: message_stop"), "{out}");
        assert!(!out.contains("event: error"), "{out}");
        assert!(t.upstream_terminated());
    }
}

#[test]
fn an_interrupted_stream_flushes_held_text_then_reports_the_failure() {
    let mut t = AnthropicStreamTranslator::new("claude-sonnet-4-5")
        .with_stop_sequences(vec!["<END>".into()]);
    let mut out =
        joined(&t.push(b"data: {\"choices\":[{\"delta\":{\"content\":\"held <EN\"}}]}\n\n"));
    out.push_str(&joined(
        &t.interrupt(crate::stream_termination::FailureKind::Stalled),
    ));
    assert!(out.contains("<EN"), "{out}");
    assert!(out.contains("timeout_error"), "{out}");
    assert!(!out.contains("message_stop"), "{out}");
    assert!(t.finish().is_empty());

    let mut t = AnthropicStreamTranslator::new("claude-sonnet-4-5");
    let mut out =
        joined(&t.push(b"data: {\"choices\":[{\"delta\":{},\"finish_reason\":\"stop\"}]}\n\n"));
    out.push_str(&joined(
        &t.interrupt(crate::stream_termination::FailureKind::Interrupted),
    ));
    assert!(out.contains("message_stop"), "{out}");
    assert!(!out.contains("event: error"), "{out}");
}

#[test]
fn a_stall_relayed_in_band_by_the_inner_proxy_is_reported_as_a_timeout() {
    use crate::stream_termination::{FailureKind, StreamDialect, error_frame};
    for dialect in [StreamDialect::OpenAiChat, StreamDialect::Responses] {
        for (kind, expected, message) in [
            (FailureKind::Stalled, "timeout_error", "stalled"),
            (FailureKind::Interrupted, "api_error", "interrupted"),
            (
                FailureKind::Truncated,
                "api_error",
                "ended before completion",
            ),
        ] {
            let mut t = AnthropicStreamTranslator::new("claude-sonnet-4-5");
            let mut out =
                joined(&t.push(b"data: {\"choices\":[{\"delta\":{\"content\":\"hi\"}}]}\n\n"));
            out.push_str(&joined(&t.push(&error_frame(dialect, kind))));
            out.push_str(&joined(&t.finish()));
            assert_eq!(out.matches("event: error").count(), 1, "{out}");
            assert!(out.contains(&format!("\"type\":\"{expected}\"")), "{out}");
            assert!(out.contains(message), "{out}");
            // Re-rendered by Router, not relayed with the inner dialect's code.
            assert!(!out.contains("\"code\""), "{out}");
            assert!(!out.contains("message_stop"), "{out}");
        }
    }
}

#[test]
fn failed_responses_stream_after_deltas_emits_anthropic_error() {
    let mut t = AnthropicStreamTranslator::new("claude-opus-4-7");
    let mut out = joined(&t.push(
        b"data: {\"type\":\"response.output_text.delta\",\"delta\":\"partial\"}\n\ndata: {\"type\":\"response.output_item.added\",\"output_index\":0,\"item\":{\"type\":\"function_call\",\"call_id\":\"call_1\",\"name\":\"lookup\"}}\n\ndata: {\"type\":\"response.function_call_arguments.delta\",\"output_index\":0,\"delta\":\"{}\"}\n\n",
    ));
    out.push_str(&joined(&t.push(b"data: {\"type\":\"response.failed\",\"response\":{\"error\":{\"message\":\"boom\",\"type\":\"server_error\",\"code\":\"upstream_failed\",\"param\":\"input\"}}}\n\ndata: [DONE]\n\n")));

    assert!(out.contains("partial"), "{out}");
    assert!(out.contains("event: error"), "{out}");
    assert!(out.contains("\"message\":\"boom\""), "{out}");
    assert!(out.contains("\"code\":\"upstream_failed\""), "{out}");
    assert!(!out.contains("\"stop_reason\":\""), "{out}");
    assert!(!out.contains("event: message_stop"), "{out}");
}

#[test]
fn standalone_error_after_deltas_emits_anthropic_error() {
    let mut t = AnthropicStreamTranslator::new("claude-opus-4-7");
    let mut out = joined(&t.push(
        b"data: {\"type\":\"response.output_text.delta\",\"delta\":\"partial\"}\n\ndata: {\"type\":\"response.output_item.added\",\"output_index\":0,\"item\":{\"type\":\"function_call\",\"call_id\":\"call_1\",\"name\":\"lookup\"}}\n\ndata: {\"type\":\"response.function_call_arguments.delta\",\"output_index\":0,\"delta\":\"{}\"}\n\n",
    ));
    out.push_str(&joined(&t.push(b"data: {\"type\":\"error\",\"message\":\"standalone boom\",\"code\":\"server_error\",\"param\":\"input\",\"private_account\":\"secret\"}\n\ndata: {\"type\":\"response.completed\",\"response\":{}}\n\ndata: [DONE]\n\n")));

    assert!(out.contains("partial"), "{out}");
    assert!(out.contains("event: error"), "{out}");
    assert!(out.contains("\"message\":\"standalone boom\""), "{out}");
    assert!(out.contains("\"code\":\"server_error\""), "{out}");
    assert!(!out.contains("private_account"), "{out}");
    assert!(!out.contains("\"stop_reason\":\""), "{out}");
    assert!(!out.contains("event: message_stop"), "{out}");
}

#[test]
fn finish_is_idempotent_and_reports_a_cut_stream_as_an_error() {
    let mut t = AnthropicStreamTranslator::new("claude-sonnet-4-5");
    let first = joined(&t.finish());
    assert!(first.contains("event: message_start"));
    assert!(first.contains("event: error"), "{first}");
    assert!(first.contains(INCOMPLETE_STREAM_MESSAGE), "{first}");
    assert!(!first.contains("message_stop"), "{first}");
    assert!(t.finish().is_empty());
}
