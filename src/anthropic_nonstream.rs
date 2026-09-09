//! Native Anthropic SSE assembly for clients that requested one JSON message.

use std::collections::BTreeMap;

use axum::body::{Body, to_bytes};
use axum::http::header::{CONTENT_LENGTH, CONTENT_TYPE, TRANSFER_ENCODING};
use axum::http::{HeaderValue, StatusCode};
use axum::response::Response;
use serde_json::{Map, Value};

const MAX_BUFFERED_RESPONSE: usize = 64 * 1024 * 1024;

/// Collapse a successful native Anthropic event stream into one Messages response.
pub async fn collect_response(response: Response, surface: crate::metrics::Surface) -> Response {
    if !response.status().is_success() || !is_event_stream(response.headers().get(CONTENT_TYPE)) {
        return response;
    }
    let (mut parts, body) = response.into_parts();
    let body = match to_bytes(body, MAX_BUFFERED_RESPONSE).await {
        Ok(body) => body,
        Err(error) => {
            return upstream_error(
                surface,
                &format!("z.ai response could not be buffered: {error}"),
            );
        }
    };
    let payload = match assemble(&body) {
        Ok(payload) => payload,
        Err(error) => {
            return upstream_error(surface, &format!("invalid z.ai event stream: {error}"));
        }
    };
    let body = match serde_json::to_vec(&payload) {
        Ok(body) => body,
        Err(error) => {
            return upstream_error(
                surface,
                &format!("z.ai response could not be encoded: {error}"),
            );
        }
    };
    parts.headers.remove(CONTENT_LENGTH);
    parts.headers.remove(TRANSFER_ENCODING);
    parts
        .headers
        .insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));
    Response::from_parts(parts, Body::from(body))
}

fn upstream_error(surface: crate::metrics::Surface, message: &str) -> Response {
    crate::api_error::error_response_for_surface(
        surface,
        StatusCode::BAD_GATEWAY,
        "api_error",
        message,
    )
}

fn is_event_stream(content_type: Option<&HeaderValue>) -> bool {
    content_type
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.split(';').next())
        .is_some_and(|value| value.trim().eq_ignore_ascii_case("text/event-stream"))
}

fn assemble(body: &[u8]) -> Result<Value, String> {
    let mut buffer = Vec::new();
    let mut message = None;
    let mut blocks = BTreeMap::<u64, Value>::new();
    let mut partial_inputs = BTreeMap::<u64, String>::new();
    let mut stopped = false;

    for block in crate::sse::push_blocks(&mut buffer, body) {
        let data = crate::openai::extract_sse_data(&block);
        if data.is_empty() {
            continue;
        }
        let event: Value = serde_json::from_str(&data)
            .map_err(|error| format!("event contains invalid JSON: {error}"))?;
        match event.get("type").and_then(Value::as_str) {
            Some("message_start") => {
                let started = event
                    .get("message")
                    .and_then(Value::as_object)
                    .ok_or("message_start omitted message")?;
                message = Some(Value::Object(started.clone()));
                if let Some(content) = started.get("content").and_then(Value::as_array) {
                    blocks.extend(
                        content
                            .iter()
                            .enumerate()
                            .map(|(index, value)| (index as u64, value.clone())),
                    );
                }
            }
            Some("content_block_start") => {
                let index = event_index(&event)?;
                let content = event
                    .get("content_block")
                    .and_then(Value::as_object)
                    .ok_or("content_block_start omitted content_block")?;
                blocks.insert(index, Value::Object(content.clone()));
            }
            Some("content_block_delta") => {
                apply_delta(
                    event_index(&event)?,
                    event
                        .get("delta")
                        .ok_or("content_block_delta omitted delta")?,
                    &mut blocks,
                    &mut partial_inputs,
                )?;
            }
            Some("content_block_stop") => {
                finish_input(event_index(&event)?, &mut blocks, &mut partial_inputs)?;
            }
            Some("message_delta") => {
                let current = message
                    .as_mut()
                    .ok_or("message_delta preceded message_start")?;
                merge_object(current, event.get("delta"));
                merge_named_object(current, "usage", event.get("usage"));
            }
            Some("message_stop") => stopped = true,
            Some("error") => {
                let detail = event
                    .pointer("/error/message")
                    .and_then(Value::as_str)
                    .unwrap_or("upstream emitted an error event");
                return Err(detail.to_string());
            }
            Some("ping") => {}
            Some(other) => return Err(format!("unsupported Anthropic event type {other}")),
            None => return Err("event omitted type".to_string()),
        }
    }
    if !buffer.iter().all(u8::is_ascii_whitespace) {
        return Err("event stream ended with an incomplete frame".to_string());
    }
    if !stopped {
        return Err("event stream omitted message_stop".to_string());
    }
    let mut message = message.ok_or("event stream omitted message_start")?;
    while let Some(index) = partial_inputs.keys().next().copied() {
        finish_input(index, &mut blocks, &mut partial_inputs)?;
    }
    message["content"] = Value::Array(blocks.into_values().collect());
    Ok(message)
}

fn event_index(event: &Value) -> Result<u64, String> {
    event
        .get("index")
        .and_then(Value::as_u64)
        .ok_or_else(|| "content event omitted index".to_string())
}

fn apply_delta(
    index: u64,
    delta: &Value,
    blocks: &mut BTreeMap<u64, Value>,
    partial_inputs: &mut BTreeMap<u64, String>,
) -> Result<(), String> {
    let kind = delta
        .get("type")
        .and_then(Value::as_str)
        .ok_or("content delta omitted type")?;
    let content = blocks
        .get_mut(&index)
        .ok_or_else(|| format!("content delta preceded block {index}"))?;
    match kind {
        "thinking_delta" => append_string(content, "thinking", delta.get("thinking")),
        "signature_delta" => append_string(content, "signature", delta.get("signature")),
        "text_delta" => append_string(content, "text", delta.get("text")),
        "input_json_delta" => {
            let fragment = delta
                .get("partial_json")
                .and_then(Value::as_str)
                .ok_or("input_json_delta omitted partial_json")?;
            partial_inputs.entry(index).or_default().push_str(fragment);
        }
        "citations_delta" => {
            let citation = delta
                .get("citation")
                .ok_or("citations_delta omitted citation")?;
            let object = content
                .as_object_mut()
                .ok_or("content block is not an object")?;
            object
                .entry("citations")
                .or_insert_with(|| Value::Array(Vec::new()))
                .as_array_mut()
                .ok_or("content citations is not an array")?
                .push(citation.clone());
        }
        other => return Err(format!("unsupported Anthropic delta type {other}")),
    }
    Ok(())
}

fn append_string(content: &mut Value, field: &str, addition: Option<&Value>) {
    let addition = addition.and_then(Value::as_str).unwrap_or_default();
    let current = content
        .get(field)
        .and_then(Value::as_str)
        .unwrap_or_default();
    content[field] = Value::String(format!("{current}{addition}"));
}

fn finish_input(
    index: u64,
    blocks: &mut BTreeMap<u64, Value>,
    partial_inputs: &mut BTreeMap<u64, String>,
) -> Result<(), String> {
    let Some(input) = partial_inputs.remove(&index) else {
        return Ok(());
    };
    let parsed = serde_json::from_str(&input)
        .map_err(|error| format!("tool input for block {index} is invalid: {error}"))?;
    blocks
        .get_mut(&index)
        .ok_or_else(|| format!("tool input preceded block {index}"))?["input"] = parsed;
    Ok(())
}

fn merge_object(target: &mut Value, source: Option<&Value>) {
    let (Some(target), Some(source)) = (target.as_object_mut(), source.and_then(Value::as_object))
    else {
        return;
    };
    target.extend(
        source
            .iter()
            .map(|(key, value)| (key.clone(), value.clone())),
    );
}

fn merge_named_object(target: &mut Value, name: &str, source: Option<&Value>) {
    let Some(source) = source.and_then(Value::as_object) else {
        return;
    };
    let target = target
        .as_object_mut()
        .expect("Anthropic message is an object")
        .entry(name)
        .or_insert_with(|| Value::Object(Map::new()));
    merge_object(target, Some(&Value::Object(source.clone())));
}
