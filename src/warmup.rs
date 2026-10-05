//! Local answers to Claude Code's "Warmup" probe (issue #677).
//!
//! Claude Code sends a one-message request whose text is `Warmup` when it
//! starts and when sub-agents spin up. Forwarded, every one spends
//! subscription quota and counts towards the vendor's rate-limit windows
//! without doing any work. With `INTERCEPT_WARMUP=true` the router answers it
//! itself with a minimal, well-formed Anthropic message — JSON, or an SSE
//! stream when the request asked to stream — and never calls the upstream.
//! Off by default.

use axum::body::Body;
use axum::http::{HeaderValue, StatusCode, header};
use axum::response::Response;
use serde_json::{Value, json};

/// The probe's text.
const WARMUP_TEXT: &str = "Warmup";

/// Whether `body` is a warmup probe: its messages are exactly one user message
/// whose text — a string or text blocks — is `Warmup`.
#[must_use]
pub fn is_warmup_request(body: &Value) -> bool {
    let Some([message]) = body
        .get("messages")
        .and_then(Value::as_array)
        .map(Vec::as_slice)
    else {
        return false;
    };
    if message.get("role").and_then(Value::as_str) != Some("user") {
        return false;
    }
    let text = match message.get("content") {
        Some(Value::String(text)) => text.clone(),
        Some(Value::Array(blocks)) if !blocks.is_empty() => {
            let mut text = String::new();
            for block in blocks {
                if block.get("type").and_then(Value::as_str) != Some("text") {
                    return false;
                }
                text.push_str(
                    block
                        .get("text")
                        .and_then(Value::as_str)
                        .unwrap_or_default(),
                );
            }
            text
        }
        _ => return false,
    };
    text.trim() == WARMUP_TEXT
}

/// The synthetic reply for a warmup probe, in the shape the request asked for.
#[must_use]
pub fn warmup_response(body: &Value) -> Response {
    let model = body
        .get("model")
        .and_then(Value::as_str)
        .unwrap_or("claude")
        .to_string();
    let id = format!("msg_warmup_{}", uuid::Uuid::new_v4().simple());
    let message = json!({
        "id": id,
        "type": "message",
        "role": "assistant",
        "model": model,
        "content": [{"type": "text", "text": "OK"}],
        "stop_reason": "end_turn",
        "stop_sequence": null,
        "usage": {"input_tokens": 0, "output_tokens": 0},
    });
    if body.get("stream").and_then(Value::as_bool) == Some(true) {
        return sse_response(&message);
    }
    let mut response = Response::new(Body::from(message.to_string()));
    response.headers_mut().insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static("application/json"),
    );
    response
}

fn sse_response(message: &Value) -> Response {
    let mut start = message.clone();
    start["content"] = json!([]);
    start["stop_reason"] = Value::Null;
    let events = [
        (
            "message_start",
            json!({"type": "message_start", "message": start}),
        ),
        (
            "content_block_start",
            json!({"type": "content_block_start", "index": 0,
                   "content_block": {"type": "text", "text": ""}}),
        ),
        (
            "content_block_delta",
            json!({"type": "content_block_delta", "index": 0,
                   "delta": {"type": "text_delta", "text": "OK"}}),
        ),
        (
            "content_block_stop",
            json!({"type": "content_block_stop", "index": 0}),
        ),
        (
            "message_delta",
            json!({"type": "message_delta",
                   "delta": {"stop_reason": "end_turn", "stop_sequence": null},
                   "usage": {"output_tokens": 0}}),
        ),
        ("message_stop", json!({"type": "message_stop"})),
    ];
    let mut text = String::new();
    for (event, data) in &events {
        text.push_str("event: ");
        text.push_str(event);
        text.push_str("\ndata: ");
        text.push_str(&data.to_string());
        text.push_str("\n\n");
    }
    let mut response = Response::new(Body::from(text));
    *response.status_mut() = StatusCode::OK;
    response.headers_mut().insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static("text/event-stream"),
    );
    response
        .headers_mut()
        .insert(header::CACHE_CONTROL, HeaderValue::from_static("no-cache"));
    response
}

#[cfg(test)]
#[path = "warmup_tests.rs"]
mod tests;
