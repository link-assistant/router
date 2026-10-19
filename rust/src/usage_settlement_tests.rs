//! Cache-token counting (issue #671) and estimated settlement of streams cut
//! short (issue #668).

use super::*;
use serde_json::json;

fn tracker() -> (TokenManager, String, UsageTracker) {
    let manager = TokenManager::new("usage-settlement-secret");
    let token = manager.issue_token(1, "settlement").unwrap();
    let id = manager.validate_token(&token).unwrap().sub;
    let tracker = UsageTracker::new(manager.clone(), &id);
    (manager, id, tracker)
}

fn used(manager: &TokenManager, id: &str) -> u64 {
    manager.store().get(id).unwrap().unwrap().used_tokens
}

fn sse(events: &[serde_json::Value]) -> Vec<u8> {
    let mut body = String::new();
    for event in events {
        body.push_str("data: ");
        body.push_str(&event.to_string());
        body.push_str("\n\n");
    }
    body.into_bytes()
}

#[test]
fn every_processed_input_token_is_counted_by_one_rule() {
    // Anthropic reports cache tokens beside `input_tokens`: add them.
    assert_eq!(
        token_count(&json!({"usage": {
            "input_tokens": 10,
            "cache_creation_input_tokens": 200,
            "cache_read_input_tokens": 3000,
            "output_tokens": 5
        }})),
        Some(3215)
    );
    // OpenAI Chat already includes cached tokens in `prompt_tokens`.
    assert_eq!(
        token_count(&json!({"usage": {
            "prompt_tokens": 3010,
            "prompt_tokens_details": {"cached_tokens": 3000},
            "completion_tokens": 5
        }})),
        Some(3015)
    );
    // OpenAI Responses already includes them in `input_tokens`.
    assert_eq!(
        token_count(&json!({"usage": {
            "input_tokens": 3010,
            "input_tokens_details": {"cached_tokens": 3000},
            "output_tokens": 5
        }})),
        Some(3015)
    );
    // Gemini already includes `cachedContentTokenCount` in `promptTokenCount`.
    assert_eq!(
        token_count(&json!({"usageMetadata": {
            "promptTokenCount": 3010,
            "cachedContentTokenCount": 3000,
            "candidatesTokenCount": 5
        }})),
        Some(3015)
    );
}

#[test]
fn streamed_anthropic_cache_tokens_are_settled_once() {
    let (manager, id, mut tracker) = tracker();
    tracker.feed(&sse(&[
        json!({"type": "message_start", "message": {"usage": {
            "input_tokens": 10,
            "cache_read_input_tokens": 3000,
            "output_tokens": 1
        }}}),
        json!({"type": "content_block_delta", "delta": {"type": "text_delta", "text": "hi"}}),
        // Newer Anthropic streams repeat the input usage in `message_delta`.
        json!({"type": "message_delta", "usage": {
            "input_tokens": 10,
            "cache_read_input_tokens": 3000,
            "output_tokens": 7
        }}),
        json!({"type": "message_stop"}),
    ]));
    assert_eq!(
        tracker.settlement(),
        Settlement {
            tokens: 3017,
            estimated: false
        }
    );
    drop(tracker);
    assert_eq!(used(&manager, &id), 3017);
}

#[test]
fn an_anthropic_stream_cut_before_message_delta_is_charged_an_estimate() {
    let (manager, id, mut tracker) = tracker();
    tracker.feed(&sse(&[
        json!({"type": "message_start", "message": {"usage": {"input_tokens": 10, "output_tokens": 1}}}),
        json!({"type": "content_block_start", "index": 0, "content_block": {"type": "thinking", "thinking": ""}}),
        json!({"type": "content_block_delta", "delta": {"type": "thinking_delta", "thinking": "a".repeat(400)}}),
        json!({"type": "content_block_delta", "delta": {"type": "text_delta", "text": "b".repeat(400)}}),
        json!({"type": "content_block_delta", "delta": {"type": "input_json_delta", "partial_json": "c".repeat(200)}}),
    ]));
    // The client disconnects here: no `message_delta`, no `message_stop`.
    let settlement = tracker.settlement();
    assert!(settlement.estimated);
    assert_eq!(settlement.tokens, 10 + 250);
    drop(tracker);
    let charged = used(&manager, &id);
    assert!(
        charged > 10,
        "output must not be charged as zero: {charged}"
    );
    assert_eq!(charged, 260);
}

#[test]
fn every_dialect_is_estimated_when_cut_short() {
    let chat = sse(&[
        json!({"object": "chat.completion.chunk", "choices": [{"delta": {"content": "x".repeat(40)}, "finish_reason": null}], "usage": null}),
        json!({"object": "chat.completion.chunk", "choices": [{"delta": {"tool_calls": [{"function": {"arguments": "y".repeat(40)}}]}}]}),
    ]);
    let responses = sse(&[
        json!({"type": "response.created", "response": {"id": "resp_1"}}),
        json!({"type": "response.output_text.delta", "delta": "x".repeat(40)}),
        json!({"type": "response.function_call_arguments.delta", "delta": "y".repeat(40)}),
    ]);
    let gemini = sse(&[
        json!({"candidates": [{"content": {"parts": [{"text": "x".repeat(80)}]}}], "usageMetadata": {"promptTokenCount": 0}}),
    ]);
    let code_assist = sse(&[
        json!({"response": {"candidates": [{"content": {"parts": [{"text": "x".repeat(80)}]}}]}}),
    ]);
    for (name, body) in [
        ("chat", chat),
        ("responses", responses),
        ("gemini", gemini),
        ("code assist", code_assist),
    ] {
        let (_manager, _id, mut tracker) = tracker();
        tracker.feed(&body);
        assert_eq!(
            tracker.settlement(),
            Settlement {
                tokens: 20,
                estimated: true
            },
            "{name}"
        );
    }
}

#[test]
fn final_usage_is_trusted_over_the_estimate() {
    let finished = [
        sse(&[
            json!({"object": "chat.completion.chunk", "choices": [{"delta": {"content": "x".repeat(400)}}]}),
            json!({"object": "chat.completion.chunk", "choices": [], "usage": {"prompt_tokens": 3, "completion_tokens": 2, "total_tokens": 5}}),
        ]),
        sse(&[
            json!({"type": "response.output_text.delta", "delta": "x".repeat(400)}),
            json!({"type": "response.completed", "response": {"usage": {"input_tokens": 3, "output_tokens": 2, "total_tokens": 5}}}),
        ]),
        sse(&[
            json!({"candidates": [{"content": {"parts": [{"text": "x".repeat(400)}]}, "finishReason": "STOP"}], "usageMetadata": {"promptTokenCount": 3, "candidatesTokenCount": 2, "totalTokenCount": 5}}),
        ]),
        sse(&[
            json!({"type": "content_block_delta", "delta": {"type": "text_delta", "text": "x".repeat(400)}}),
            json!({"type": "message_delta", "usage": {"input_tokens": 3, "output_tokens": 2}}),
        ]),
    ];
    for body in finished {
        let (_manager, _id, mut tracker) = tracker();
        tracker.feed(&body);
        assert_eq!(
            tracker.settlement(),
            Settlement {
                tokens: 5,
                estimated: false
            }
        );
    }
}

#[test]
fn a_stream_cut_before_any_output_is_charged_its_input_only() {
    let (_manager, _id, mut tracker) = tracker();
    tracker.feed(&sse(&[json!({"type": "message_start", "message": {"usage": {"input_tokens": 10, "output_tokens": 1}}})]));
    assert_eq!(
        tracker.settlement(),
        Settlement {
            tokens: 11,
            estimated: false
        }
    );
}

#[test]
fn a_reservation_is_settled_with_the_estimate_on_disconnect() {
    let manager = TokenManager::new("usage-settlement-secret");
    let token = manager
        .issue(&crate::token::IssueRequest {
            ttl_hours: 1,
            label: "reserved",
            max_tokens: Some(10_000),
            ..crate::token::IssueRequest::default()
        })
        .unwrap();
    let id = manager.validate_token(&token).unwrap().sub;
    manager.enforce_request_budget_reserving(&id, 1000).unwrap();
    {
        let mut tracker = ReservationGuard::new(manager.clone(), &id, 1000).into_tracker();
        tracker.feed(&sse(&[
            json!({"type": "message_start", "message": {"usage": {"input_tokens": 10, "output_tokens": 1}}}),
            json!({"type": "content_block_delta", "delta": {"type": "text_delta", "text": "z".repeat(40)}}),
        ]));
    }
    let record = manager.store().get(&id).unwrap().unwrap();
    assert_eq!(record.used_tokens, 20);
    assert_eq!(record.reserved_tokens, 0);
}

#[test]
fn only_response_delta_events_count_as_streamed_output() {
    let delta = |kind: &str| streamed_output_chars(&json!({"type": kind, "delta": "abc"}));
    assert_eq!(delta("response.output_text.delta"), 3);
    assert_eq!(delta("response.reasoning_summary_text.delta"), 3);
    // A finished or unrelated event repeats text already counted, or none.
    assert_eq!(delta("response.output_text.done"), 0);
    assert_eq!(delta("response.created"), 0);
    assert_eq!(delta("thread.message.delta"), 0);
}
