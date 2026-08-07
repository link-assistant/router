//! Anthropic Messages surface over non-Anthropic upstreams.
//!
//! Claude Code (and every other client that speaks only the Anthropic dialect)
//! sends `POST /v1/messages`. Before this module existed, that surface could
//! only be served by the Anthropic upstream, so a Codex/Qwen/Gemini
//! subscription could not back Claude Code — the gap named by issue #45.
//!
//! The bridge is deliberately an *adapter*, not a second forwarder: it
//! translates the request into the `OpenAI` dialect the target provider already
//! understands, delegates to the existing per-provider forwarder (which owns
//! credential resolution, refresh, account selection, cooldowns and budget
//! enforcement), and translates the reply back into Anthropic shape.
//!
//! Streaming replies are translated incrementally by
//! [`crate::anthropic_stream::AnthropicStreamTranslator`].

use axum::body::{Body, Bytes};
use axum::http::{HeaderMap, HeaderValue, StatusCode};
use axum::response::{IntoResponse, Response};
use futures_util::StreamExt;
use serde_json::{Value, json};

use crate::anthropic_stream::{AnthropicStreamTranslator, map_stop_reason};
use crate::app_state::AppState;
use crate::config::UpstreamProvider;
use crate::metrics::Surface;

/// Default `max_tokens` used when a bridged Anthropic request omits it.
/// The Anthropic Messages API requires the field; `OpenAI` upstreams do not.
const DEFAULT_MAX_TOKENS: u64 = 4096;

/// Whether the Anthropic surface must be bridged for this upstream provider.
///
/// `Anthropic` needs no translation, and `Gonka`/`Crater` keep the behaviour
/// they already had on this surface.
#[must_use]
pub const fn is_bridged(provider: UpstreamProvider) -> bool {
    matches!(
        provider,
        UpstreamProvider::Codex
            | UpstreamProvider::Qwen
            | UpstreamProvider::Gemini
            | UpstreamProvider::OpenAICompatible
    )
}

/// Resolve the upstream model id for a bridged request.
///
/// The client sends an Anthropic model name (`claude-…`), which means nothing
/// to a Codex or Qwen upstream. Resolution order: the operator's configured
/// `--bridge-model`, then a per-provider default. For the generic
/// OpenAI-compatible provider an empty string is returned so that the
/// provider's own `default_model` is applied by its forwarder.
#[must_use]
pub fn resolve_bridge_model(state: &AppState) -> String {
    if let Some(model) = state.bridge_model.as_deref() {
        if !model.is_empty() {
            return model.to_string();
        }
    }
    match state.upstream_provider {
        UpstreamProvider::Codex => "gpt-5-codex".to_string(),
        UpstreamProvider::Qwen => "qwen3-coder-plus".to_string(),
        UpstreamProvider::Gemini => crate::gemini::DEFAULT_MODEL.to_string(),
        // Left empty on purpose: `forward_openai_compatible` substitutes the
        // provider record's `default_model` when `model` is absent or empty.
        _ => state
            .openai_compatible
            .default_model
            .clone()
            .unwrap_or_default(),
    }
}

/// Translate an Anthropic Messages request body into an `OpenAI` Chat
/// Completions request body.
///
/// Vendor blocks with no `OpenAI` equivalent (`thinking`, `redacted_thinking`)
/// are dropped rather than guessed at; that limitation is documented in
/// `docs/use-cases/chatgpt-in-claude-code.md`.
#[must_use]
pub fn anthropic_to_chat_request(body: &Value, upstream_model: &str) -> Value {
    let mut messages: Vec<Value> = Vec::new();

    if let Some(system) = body.get("system") {
        if let Some(text) = system_text(system) {
            messages.push(json!({"role": "system", "content": text}));
        }
    }

    for message in body
        .get("messages")
        .and_then(Value::as_array)
        .map(Vec::as_slice)
        .unwrap_or_default()
    {
        let role = message
            .get("role")
            .and_then(Value::as_str)
            .unwrap_or("user");
        let content = message.get("content").unwrap_or(&Value::Null);
        match content {
            Value::String(text) => {
                messages.push(json!({"role": role, "content": text}));
            }
            Value::Array(blocks) => translate_content_blocks(role, blocks, &mut messages),
            _ => {}
        }
    }

    let max_tokens = body
        .get("max_tokens")
        .and_then(Value::as_u64)
        .unwrap_or(DEFAULT_MAX_TOKENS);

    let mut out = json!({
        "model": upstream_model,
        "messages": messages,
        "max_tokens": max_tokens,
    });

    for key in ["temperature", "top_p"] {
        if let Some(value) = body.get(key) {
            out[key] = value.clone();
        }
    }
    if body.get("stream").and_then(Value::as_bool) == Some(true) {
        out["stream"] = json!(true);
    }
    if let Some(stops) = body.get("stop_sequences") {
        out["stop"] = stops.clone();
    }
    if let Some(tools) = body.get("tools").and_then(Value::as_array) {
        let mapped = translate_tools(tools);
        if !mapped.is_empty() {
            out["tools"] = Value::Array(mapped);
        }
    }
    if let Some(choice) = body.get("tool_choice") {
        if let Some(mapped) = translate_tool_choice(choice) {
            out["tool_choice"] = mapped;
        }
    }
    out
}

/// `system` accepts a plain string or an array of text blocks.
fn system_text(system: &Value) -> Option<String> {
    match system {
        Value::String(s) if !s.is_empty() => Some(s.clone()),
        Value::Array(blocks) => {
            let joined = blocks
                .iter()
                .filter_map(|b| b.get("text").and_then(Value::as_str))
                .collect::<Vec<_>>()
                .join("\n\n");
            (!joined.is_empty()).then_some(joined)
        }
        _ => None,
    }
}

/// Translate one Anthropic message's content blocks, appending the resulting
/// `OpenAI` messages. `tool_result` blocks become separate `role: "tool"`
/// messages, which is how the `OpenAI` dialect models the same thing.
fn translate_content_blocks(role: &str, blocks: &[Value], messages: &mut Vec<Value>) {
    let mut text = String::new();
    let mut parts: Vec<Value> = Vec::new();
    let mut tool_calls: Vec<Value> = Vec::new();
    let mut tool_results: Vec<Value> = Vec::new();

    for block in blocks {
        match block.get("type").and_then(Value::as_str).unwrap_or("text") {
            "text" => {
                let value = block.get("text").and_then(Value::as_str).unwrap_or("");
                text.push_str(value);
                parts.push(json!({"type": "text", "text": value}));
            }
            "image" => {
                if let Some(url) = image_data_url(block.get("source")) {
                    parts.push(json!({"type": "image_url", "image_url": {"url": url}}));
                }
            }
            "tool_use" => {
                let input = block.get("input").cloned().unwrap_or_else(|| json!({}));
                tool_calls.push(json!({
                    "id": block.get("id").and_then(Value::as_str).unwrap_or_default(),
                    "type": "function",
                    "function": {
                        "name": block.get("name").and_then(Value::as_str).unwrap_or_default(),
                        "arguments": serde_json::to_string(&input).unwrap_or_else(|_| "{}".into()),
                    }
                }));
            }
            "tool_result" => {
                tool_results.push(json!({
                    "role": "tool",
                    "tool_call_id": block
                        .get("tool_use_id")
                        .and_then(Value::as_str)
                        .unwrap_or_default(),
                    "content": tool_result_text(block.get("content")),
                }));
            }
            // `thinking` / `redacted_thinking` and any future vendor block have
            // no OpenAI equivalent and are dropped.
            _ => {}
        }
    }

    let has_image = parts
        .iter()
        .any(|p| p.get("type").and_then(Value::as_str) == Some("image_url"));
    if !text.is_empty() || !tool_calls.is_empty() || has_image {
        let content = if has_image {
            Value::Array(parts)
        } else {
            Value::String(text)
        };
        let mut message = json!({"role": role, "content": content});
        if !tool_calls.is_empty() {
            message["tool_calls"] = Value::Array(tool_calls);
        }
        messages.push(message);
    }
    messages.extend(tool_results);
}

fn image_data_url(source: Option<&Value>) -> Option<String> {
    let source = source?;
    match source.get("type").and_then(Value::as_str) {
        Some("url") => source.get("url").and_then(Value::as_str).map(String::from),
        Some("base64") => {
            let media = source.get("media_type").and_then(Value::as_str)?;
            let data = source.get("data").and_then(Value::as_str)?;
            Some(format!("data:{media};base64,{data}"))
        }
        _ => None,
    }
}

fn tool_result_text(content: Option<&Value>) -> String {
    match content {
        Some(Value::String(s)) => s.clone(),
        Some(Value::Array(blocks)) => blocks
            .iter()
            .filter_map(|b| b.get("text").and_then(Value::as_str))
            .collect::<Vec<_>>()
            .join("\n"),
        Some(other) => other.to_string(),
        None => String::new(),
    }
}

fn translate_tools(tools: &[Value]) -> Vec<Value> {
    tools
        .iter()
        .filter_map(|tool| {
            let name = tool.get("name").and_then(Value::as_str)?;
            Some(json!({
                "type": "function",
                "function": {
                    "name": name,
                    "description": tool
                        .get("description")
                        .cloned()
                        .unwrap_or(Value::String(String::new())),
                    "parameters": tool
                        .get("input_schema")
                        .cloned()
                        .unwrap_or_else(|| json!({"type": "object", "properties": {}})),
                }
            }))
        })
        .collect()
}

fn translate_tool_choice(choice: &Value) -> Option<Value> {
    match choice.get("type").and_then(Value::as_str)? {
        "auto" => Some(json!("auto")),
        "any" => Some(json!("required")),
        "none" => Some(json!("none")),
        "tool" => {
            let name = choice.get("name").and_then(Value::as_str)?;
            Some(json!({"type": "function", "function": {"name": name}}))
        }
        _ => None,
    }
}

/// Translate an `OpenAI` Chat Completions **or** Responses JSON object into an
/// Anthropic `message` object.
///
/// The shape is detected from the payload because the bridged providers do not
/// all answer with the same one: Codex replies with a Responses object while
/// the others reply with a chat completion.
#[must_use]
pub fn openai_json_to_anthropic_message(payload: &Value, requested_model: &str) -> Value {
    if payload.get("object").and_then(Value::as_str) == Some("response")
        || payload.get("output").is_some()
    {
        responses_to_anthropic_message(payload, requested_model)
    } else {
        chat_completion_to_anthropic_message(payload, requested_model)
    }
}

fn chat_completion_to_anthropic_message(payload: &Value, requested_model: &str) -> Value {
    let choice = payload
        .get("choices")
        .and_then(Value::as_array)
        .and_then(|c| c.first())
        .cloned()
        .unwrap_or(Value::Null);
    let message = choice.get("message").unwrap_or(&Value::Null);

    let mut content: Vec<Value> = Vec::new();
    if let Some(text) = message.get("content").and_then(Value::as_str) {
        if !text.is_empty() {
            content.push(json!({"type": "text", "text": text}));
        }
    }
    for call in message
        .get("tool_calls")
        .and_then(Value::as_array)
        .map(Vec::as_slice)
        .unwrap_or_default()
    {
        content.push(tool_use_block(
            call.get("id").and_then(Value::as_str).unwrap_or_default(),
            call.get("function")
                .and_then(|f| f.get("name"))
                .and_then(Value::as_str)
                .unwrap_or_default(),
            call.get("function")
                .and_then(|f| f.get("arguments"))
                .and_then(Value::as_str)
                .unwrap_or("{}"),
        ));
    }

    let stop_reason = choice
        .get("finish_reason")
        .and_then(Value::as_str)
        .map_or("end_turn", map_stop_reason);
    let usage = payload.get("usage");
    message_envelope(
        payload.get("id").and_then(Value::as_str),
        requested_model,
        &content,
        stop_reason,
        usage_field(usage, &["prompt_tokens", "input_tokens"]),
        usage_field(usage, &["completion_tokens", "output_tokens"]),
    )
}

fn responses_to_anthropic_message(payload: &Value, requested_model: &str) -> Value {
    let mut content: Vec<Value> = Vec::new();
    let mut saw_tool_call = false;
    for item in payload
        .get("output")
        .and_then(Value::as_array)
        .map(Vec::as_slice)
        .unwrap_or_default()
    {
        match item.get("type").and_then(Value::as_str).unwrap_or("") {
            "message" => {
                let text: String = item
                    .get("content")
                    .and_then(Value::as_array)
                    .map(|parts| {
                        parts
                            .iter()
                            .filter_map(|p| p.get("text").and_then(Value::as_str))
                            .collect::<Vec<_>>()
                            .join("")
                    })
                    .unwrap_or_default();
                if !text.is_empty() {
                    content.push(json!({"type": "text", "text": text}));
                }
            }
            "function_call" => {
                saw_tool_call = true;
                content.push(tool_use_block(
                    item.get("call_id")
                        .or_else(|| item.get("id"))
                        .and_then(Value::as_str)
                        .unwrap_or_default(),
                    item.get("name").and_then(Value::as_str).unwrap_or_default(),
                    item.get("arguments")
                        .and_then(Value::as_str)
                        .unwrap_or("{}"),
                ));
            }
            _ => {}
        }
    }

    let stop_reason = if saw_tool_call {
        "tool_use"
    } else if payload.get("status").and_then(Value::as_str) == Some("incomplete") {
        "max_tokens"
    } else {
        "end_turn"
    };
    let usage = payload.get("usage");
    message_envelope(
        payload.get("id").and_then(Value::as_str),
        requested_model,
        &content,
        stop_reason,
        usage_field(usage, &["input_tokens", "prompt_tokens"]),
        usage_field(usage, &["output_tokens", "completion_tokens"]),
    )
}

fn tool_use_block(id: &str, name: &str, arguments: &str) -> Value {
    let input = serde_json::from_str::<Value>(arguments).unwrap_or_else(|_| json!({}));
    json!({
        "type": "tool_use",
        "id": if id.is_empty() { format!("toolu_{}", uuid::Uuid::new_v4().simple()) } else { id.to_string() },
        "name": name,
        "input": input,
    })
}

fn usage_field(usage: Option<&Value>, keys: &[&str]) -> u64 {
    usage
        .and_then(|u| keys.iter().find_map(|k| u.get(*k).and_then(Value::as_u64)))
        .unwrap_or(0)
}

fn message_envelope(
    id: Option<&str>,
    model: &str,
    content: &[Value],
    stop_reason: &str,
    input_tokens: u64,
    output_tokens: u64,
) -> Value {
    json!({
        "id": id.map_or_else(|| format!("msg_{}", uuid::Uuid::new_v4().simple()), String::from),
        "type": "message",
        "role": "assistant",
        "model": model,
        "content": content,
        "stop_reason": stop_reason,
        "stop_sequence": Value::Null,
        "usage": {"input_tokens": input_tokens, "output_tokens": output_tokens},
    })
}

/// Estimate the input token count of an Anthropic Messages request.
///
/// `POST /v1/messages/count_tokens` has no equivalent on the bridged
/// upstreams, so the router answers locally. The estimate uses the widely
/// quoted ~4 characters per token heuristic plus a small per-message overhead;
/// it is documented as an estimate rather than an exact count.
#[must_use]
pub fn count_tokens_estimate(body: &Value) -> u64 {
    let mut chars = 0usize;
    let mut messages = 0usize;
    if let Some(system) = body.get("system").and_then(system_text) {
        chars += system.len();
    }
    for message in body
        .get("messages")
        .and_then(Value::as_array)
        .map(Vec::as_slice)
        .unwrap_or_default()
    {
        messages += 1;
        chars += json_text_len(message.get("content").unwrap_or(&Value::Null));
    }
    if let Some(tools) = body.get("tools") {
        chars += tools.to_string().len();
    }
    // 4 chars/token, plus ~4 tokens of role and delimiter overhead per message.
    (chars as u64).div_ceil(4) + (messages as u64) * 4
}

fn json_text_len(content: &Value) -> usize {
    match content {
        Value::String(s) => s.len(),
        Value::Array(blocks) => blocks.iter().map(json_text_len).sum(),
        Value::Object(_) => content
            .get("text")
            .and_then(Value::as_str)
            .map_or_else(|| content.to_string().len(), str::len),
        _ => 0,
    }
}

/// Entry point for the Anthropic surface when the upstream is not Anthropic.
///
/// `/v1/messages/count_tokens` is answered locally because the bridged
/// upstreams expose no equivalent endpoint; everything else is forwarded.
pub async fn handle_anthropic_surface(
    state: &AppState,
    headers: &HeaderMap,
    path: &str,
    body: Value,
) -> Response {
    if path.ends_with("/count_tokens") {
        return (
            StatusCode::OK,
            axum::Json(json!({"input_tokens": count_tokens_estimate(&body)})),
        )
            .into_response();
    }
    forward_anthropic_messages(state, headers, body).await
}

/// Serve `POST /v1/messages` from a non-Anthropic upstream.
///
/// Delegates to the provider's existing `OpenAI`-dialect forwarder and
/// translates both directions. Metrics are recorded by the delegate under
/// [`Surface::Anthropic`] so the bridged traffic is attributed to the surface
/// the client actually used.
pub async fn forward_anthropic_messages(
    state: &AppState,
    headers: &HeaderMap,
    anthropic_body: Value,
) -> Response {
    let requested_model = anthropic_body
        .get("model")
        .and_then(Value::as_str)
        .unwrap_or("claude-3-5-sonnet")
        .to_string();
    let stream_requested = anthropic_body
        .get("stream")
        .and_then(Value::as_bool)
        .unwrap_or(false);
    let upstream_model = resolve_bridge_model(state);
    let chat_body = anthropic_to_chat_request(&anthropic_body, &upstream_model);

    let upstream = match state.upstream_provider {
        UpstreamProvider::Codex => {
            let responses_body = crate::responses::chat_completion_to_responses(&chat_body);
            crate::subscription_proxy::forward_subscription_openai(
                state,
                headers,
                responses_body,
                &chat_body,
                "/v1/responses",
                Surface::Anthropic,
            )
            .await
        }
        UpstreamProvider::Qwen => {
            crate::subscription_proxy::forward_subscription_openai(
                state,
                headers,
                chat_body.clone(),
                &chat_body,
                "/v1/chat/completions",
                Surface::Anthropic,
            )
            .await
        }
        UpstreamProvider::Gemini => {
            crate::gemini::forward_chat_completions_as(
                state,
                headers,
                chat_body,
                Surface::Anthropic,
            )
            .await
        }
        _ => {
            crate::provider_proxy::forward_openai_compatible(
                state,
                headers,
                chat_body,
                "/v1/chat/completions",
                Surface::Anthropic,
            )
            .await
        }
    };

    translate_upstream_response(upstream, &requested_model, stream_requested).await
}

/// Convert the `OpenAI`-dialect response produced by a delegate forwarder into
/// the Anthropic dialect.
async fn translate_upstream_response(
    upstream: Response,
    requested_model: &str,
    stream_requested: bool,
) -> Response {
    let (parts, body) = upstream.into_parts();
    let status = parts.status;

    if !status.is_success() {
        let bytes = axum::body::to_bytes(body, 1024 * 1024)
            .await
            .unwrap_or_default();
        return anthropic_error(status, &bytes);
    }

    if stream_requested {
        return anthropic_sse_response(body, requested_model, &parts.headers);
    }

    let bytes = match axum::body::to_bytes(body, 32 * 1024 * 1024).await {
        Ok(bytes) => bytes,
        Err(e) => {
            return anthropic_error(
                StatusCode::BAD_GATEWAY,
                format!("failed to read upstream body: {e}").as_bytes(),
            );
        }
    };
    let Ok(payload) = serde_json::from_slice::<Value>(&bytes) else {
        return anthropic_error(StatusCode::BAD_GATEWAY, &bytes);
    };
    (
        StatusCode::OK,
        axum::Json(openai_json_to_anthropic_message(&payload, requested_model)),
    )
        .into_response()
}

/// Wrap the upstream stream in an incremental Anthropic SSE translator.
fn anthropic_sse_response(body: Body, requested_model: &str, upstream: &HeaderMap) -> Response {
    let translator = AnthropicStreamTranslator::new(requested_model);
    let data = body.into_data_stream();
    let stream = futures_util::stream::unfold(
        (data, translator, false),
        |(mut data, mut translator, done)| async move {
            if done {
                return None;
            }
            loop {
                match data.next().await {
                    Some(Ok(chunk)) => {
                        let frames = translator.push(&chunk);
                        if frames.is_empty() {
                            continue;
                        }
                        return Some((
                            Ok::<Bytes, std::io::Error>(Bytes::from(frames.concat())),
                            (data, translator, false),
                        ));
                    }
                    Some(Err(e)) => {
                        return Some((Err(std::io::Error::other(e)), (data, translator, true)));
                    }
                    None => {
                        let frames = translator.finish();
                        return Some((Ok(Bytes::from(frames.concat())), (data, translator, true)));
                    }
                }
            }
        },
    );

    let mut response = Response::new(Body::from_stream(stream));
    *response.status_mut() = StatusCode::OK;
    response.headers_mut().insert(
        "content-type",
        HeaderValue::from_static("text/event-stream"),
    );
    response
        .headers_mut()
        .insert("cache-control", HeaderValue::from_static("no-cache"));
    // Relay rate-limit hints so clients keep seeing upstream back-pressure.
    for name in ["retry-after", "x-ratelimit-remaining", "x-ratelimit-reset"] {
        if let Some(value) = upstream.get(name) {
            if let Ok(header) = axum::http::HeaderName::try_from(name) {
                response.headers_mut().insert(header, value.clone());
            }
        }
    }
    response
}

/// Re-shape an upstream error body as an Anthropic error envelope.
fn anthropic_error(status: StatusCode, body: &[u8]) -> Response {
    let text = serde_json::from_slice::<Value>(body).map_or_else(
        |_| String::from_utf8_lossy(body).to_string(),
        |value| {
            value
                .get("error")
                .and_then(|e| e.get("message"))
                .and_then(Value::as_str)
                .map_or_else(|| value.to_string(), String::from)
        },
    );
    let error_type = match status {
        StatusCode::UNAUTHORIZED | StatusCode::FORBIDDEN => "authentication_error",
        StatusCode::TOO_MANY_REQUESTS => "rate_limit_error",
        StatusCode::BAD_REQUEST => "invalid_request_error",
        _ => "api_error",
    };
    (
        status,
        axum::Json(json!({
            "type": "error",
            "error": {"type": error_type, "message": text},
        })),
    )
        .into_response()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn translates_system_and_messages() {
        let body = json!({
            "model": "claude-sonnet-4-5",
            "max_tokens": 128,
            "system": "be terse",
            "messages": [
                {"role": "user", "content": "hi"},
                {"role": "assistant", "content": [{"type": "text", "text": "hello"}]}
            ],
            "temperature": 0.2,
            "stop_sequences": ["STOP"],
            "stream": true
        });
        let chat = anthropic_to_chat_request(&body, "gpt-5-codex");
        assert_eq!(chat["model"], "gpt-5-codex");
        assert_eq!(chat["max_tokens"], 128);
        assert_eq!(chat["messages"][0]["role"], "system");
        assert_eq!(chat["messages"][0]["content"], "be terse");
        assert_eq!(chat["messages"][1]["content"], "hi");
        assert_eq!(chat["messages"][2]["content"], "hello");
        assert_eq!(chat["temperature"], 0.2);
        assert_eq!(chat["stop"][0], "STOP");
        assert_eq!(chat["stream"], true);
    }

    #[test]
    fn system_block_array_is_joined() {
        let body = json!({
            "system": [{"type": "text", "text": "a"}, {"type": "text", "text": "b"}],
            "messages": []
        });
        let chat = anthropic_to_chat_request(&body, "m");
        assert_eq!(chat["messages"][0]["content"], "a\n\nb");
    }

    #[test]
    fn defaults_max_tokens_when_absent() {
        let chat = anthropic_to_chat_request(&json!({"messages": []}), "m");
        assert_eq!(chat["max_tokens"], DEFAULT_MAX_TOKENS);
    }

    #[test]
    fn translates_tools_and_tool_choice() {
        let body = json!({
            "messages": [],
            "tools": [{
                "name": "get_time",
                "description": "current time",
                "input_schema": {"type": "object", "properties": {"tz": {"type": "string"}}}
            }],
            "tool_choice": {"type": "tool", "name": "get_time"}
        });
        let chat = anthropic_to_chat_request(&body, "m");
        assert_eq!(chat["tools"][0]["type"], "function");
        assert_eq!(chat["tools"][0]["function"]["name"], "get_time");
        assert_eq!(
            chat["tools"][0]["function"]["parameters"]["properties"]["tz"]["type"],
            "string"
        );
        assert_eq!(chat["tool_choice"]["function"]["name"], "get_time");
    }

    #[test]
    fn tool_choice_any_becomes_required() {
        let chat = anthropic_to_chat_request(
            &json!({"messages": [], "tool_choice": {"type": "any"}}),
            "m",
        );
        assert_eq!(chat["tool_choice"], "required");
    }

    #[test]
    fn translates_tool_use_and_tool_result_blocks() {
        let body = json!({
            "messages": [
                {"role": "assistant", "content": [
                    {"type": "text", "text": "checking"},
                    {"type": "tool_use", "id": "toolu_1", "name": "get_time", "input": {"tz": "UTC"}}
                ]},
                {"role": "user", "content": [
                    {"type": "tool_result", "tool_use_id": "toolu_1", "content": "12:00"}
                ]}
            ]
        });
        let chat = anthropic_to_chat_request(&body, "m");
        let messages = chat["messages"].as_array().unwrap();
        assert_eq!(messages.len(), 2);
        assert_eq!(messages[0]["role"], "assistant");
        assert_eq!(messages[0]["tool_calls"][0]["id"], "toolu_1");
        assert_eq!(
            messages[0]["tool_calls"][0]["function"]["arguments"],
            "{\"tz\":\"UTC\"}"
        );
        assert_eq!(messages[1]["role"], "tool");
        assert_eq!(messages[1]["tool_call_id"], "toolu_1");
        assert_eq!(messages[1]["content"], "12:00");
    }

    #[test]
    fn drops_thinking_blocks() {
        let body = json!({
            "messages": [{"role": "assistant", "content": [
                {"type": "thinking", "thinking": "secret"},
                {"type": "text", "text": "visible"}
            ]}]
        });
        let chat = anthropic_to_chat_request(&body, "m");
        assert_eq!(chat["messages"][0]["content"], "visible");
        assert!(!chat.to_string().contains("secret"));
    }

    #[test]
    fn translates_base64_images() {
        let body = json!({
            "messages": [{"role": "user", "content": [
                {"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": "AAA"}},
                {"type": "text", "text": "what is this"}
            ]}]
        });
        let chat = anthropic_to_chat_request(&body, "m");
        let parts = chat["messages"][0]["content"].as_array().unwrap();
        assert_eq!(parts[0]["image_url"]["url"], "data:image/png;base64,AAA");
        assert_eq!(parts[1]["text"], "what is this");
    }

    #[test]
    fn chat_completion_becomes_anthropic_message() {
        let payload = json!({
            "id": "chatcmpl-1",
            "object": "chat.completion",
            "choices": [{
                "index": 0,
                "message": {"role": "assistant", "content": "hello"},
                "finish_reason": "stop"
            }],
            "usage": {"prompt_tokens": 7, "completion_tokens": 2}
        });
        let msg = openai_json_to_anthropic_message(&payload, "claude-sonnet-4-5");
        assert_eq!(msg["type"], "message");
        assert_eq!(msg["role"], "assistant");
        assert_eq!(msg["model"], "claude-sonnet-4-5");
        assert_eq!(msg["content"][0]["type"], "text");
        assert_eq!(msg["content"][0]["text"], "hello");
        assert_eq!(msg["stop_reason"], "end_turn");
        assert_eq!(msg["usage"]["input_tokens"], 7);
        assert_eq!(msg["usage"]["output_tokens"], 2);
    }

    #[test]
    fn chat_tool_calls_become_tool_use_blocks() {
        let payload = json!({
            "choices": [{
                "message": {
                    "role": "assistant",
                    "content": "",
                    "tool_calls": [{
                        "id": "call_1",
                        "type": "function",
                        "function": {"name": "get_time", "arguments": "{\"tz\":\"UTC\"}"}
                    }]
                },
                "finish_reason": "tool_calls"
            }]
        });
        let msg = openai_json_to_anthropic_message(&payload, "claude-sonnet-4-5");
        assert_eq!(msg["content"][0]["type"], "tool_use");
        assert_eq!(msg["content"][0]["id"], "call_1");
        assert_eq!(msg["content"][0]["name"], "get_time");
        assert_eq!(msg["content"][0]["input"]["tz"], "UTC");
        assert_eq!(msg["stop_reason"], "tool_use");
    }

    #[test]
    fn responses_object_becomes_anthropic_message() {
        let payload = json!({
            "id": "resp_1",
            "object": "response",
            "status": "completed",
            "output": [
                {"type": "message", "content": [{"type": "output_text", "text": "hi there"}]},
                {"type": "function_call", "call_id": "fc_1", "name": "lookup", "arguments": "{\"q\":1}"}
            ],
            "usage": {"input_tokens": 5, "output_tokens": 9}
        });
        let msg = openai_json_to_anthropic_message(&payload, "claude-opus-4-7");
        assert_eq!(msg["content"][0]["text"], "hi there");
        assert_eq!(msg["content"][1]["type"], "tool_use");
        assert_eq!(msg["content"][1]["input"]["q"], 1);
        assert_eq!(msg["stop_reason"], "tool_use");
        assert_eq!(msg["usage"]["input_tokens"], 5);
    }

    #[test]
    fn max_tokens_finish_reason_maps_to_anthropic() {
        let payload = json!({
            "choices": [{"message": {"content": "x"}, "finish_reason": "length"}]
        });
        let msg = openai_json_to_anthropic_message(&payload, "m");
        assert_eq!(msg["stop_reason"], "max_tokens");
    }

    #[test]
    fn count_tokens_estimate_scales_with_input() {
        let small =
            count_tokens_estimate(&json!({"messages": [{"role": "user", "content": "hi"}]}));
        let large = count_tokens_estimate(&json!({
            "system": "s".repeat(400),
            "messages": [{"role": "user", "content": "x".repeat(400)}]
        }));
        assert!(small >= 4, "per-message overhead is counted: {small}");
        assert!(large > small);
        assert!(large >= 200, "roughly 800 chars / 4: {large}");
    }

    #[test]
    fn bridged_providers_are_the_non_anthropic_openai_dialect_ones() {
        assert!(is_bridged(UpstreamProvider::Codex));
        assert!(is_bridged(UpstreamProvider::Qwen));
        assert!(is_bridged(UpstreamProvider::Gemini));
        assert!(is_bridged(UpstreamProvider::OpenAICompatible));
        assert!(!is_bridged(UpstreamProvider::Anthropic));
        assert!(!is_bridged(UpstreamProvider::Gonka));
        assert!(!is_bridged(UpstreamProvider::Crater));
    }
}
