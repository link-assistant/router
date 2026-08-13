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
pub(crate) const DEFAULT_MAX_TOKENS: u64 = 4096;

/// Response header used when a required Messages limit cannot be enforced.
pub const OUTPUT_LIMIT_HEADER: &str = "x-link-assistant-output-limit";

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
        // Answered locally, so no delegate forwarder validates the token for
        // us. Do it here: an expired or revoked token must not get an estimate
        // either. The request budget is deliberately *not* consumed, since
        // nothing is spent upstream.
        let claims = match count_tokens_claims(&state.token_manager, headers) {
            Ok(claims) => claims,
            Err(response) => return *response,
        };
        crate::audit::record_authorised_request(
            state,
            &claims,
            Surface::Anthropic,
            path,
            Some(&body),
        );
        return (
            StatusCode::OK,
            axum::Json(json!({"input_tokens": count_tokens_estimate(&body)})),
        )
            .into_response();
    }
    forward_anthropic_messages(state, headers, body).await
}

/// Validate the client token for a locally answered `count_tokens` request.
pub(crate) fn count_tokens_claims(
    token_manager: &crate::token::TokenManager,
    headers: &HeaderMap,
) -> Result<crate::token::TokenClaims, Box<Response>> {
    let Some(token) = crate::proxy::extract_client_token(headers) else {
        return Err(Box::new(anthropic_error(
            StatusCode::UNAUTHORIZED,
            b"Missing Authorization Bearer token or x-api-key",
        )));
    };
    token_manager.validate_token(token).map_err(|e| {
        let status = match &e {
            crate::token::TokenError::Revoked => StatusCode::FORBIDDEN,
            _ => StatusCode::UNAUTHORIZED,
        };
        Box::new(anthropic_error(status, e.to_string().as_bytes()))
    })
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
    if anthropic_body
        .get("max_tokens")
        .and_then(Value::as_u64)
        .is_none_or(|limit| limit == 0)
    {
        // Keep authentication ahead of request validation even though the
        // delegated forwarder is not reached for a malformed Messages body.
        if let Err(response) = count_tokens_claims(&state.token_manager, headers) {
            return *response;
        }
        return anthropic_error(StatusCode::BAD_REQUEST, b"max_tokens is required");
    }
    if anthropic_body
        .get("messages")
        .and_then(Value::as_array)
        .is_none_or(Vec::is_empty)
    {
        if let Err(response) = count_tokens_claims(&state.token_manager, headers) {
            return *response;
        }
        return anthropic_error(
            StatusCode::BAD_REQUEST,
            b"messages must contain at least one message",
        );
    }
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

    let mut response =
        translate_upstream_response(upstream, &requested_model, stream_requested).await;
    if state.upstream_provider == UpstreamProvider::Codex && response.status().is_success() {
        response
            .headers_mut()
            .insert(OUTPUT_LIMIT_HEADER, HeaderValue::from_static("unsupported"));
        response.headers_mut().insert(
            "warning",
            HeaderValue::from_static(
                "299 link-assistant-router \"max_tokens is required by Messages but cannot be enforced by the Codex subscription backend\"",
            ),
        );
    }
    response
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
        let mut response = anthropic_error(status, &bytes);
        *response.headers_mut() = parts.headers;
        response
            .headers_mut()
            .insert("content-type", HeaderValue::from_static("application/json"));
        return response;
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
        return anthropic_error(
            StatusCode::BAD_GATEWAY,
            b"Upstream returned a malformed response",
        );
    };
    let mut response = (
        StatusCode::OK,
        axum::Json(openai_json_to_anthropic_message(&payload, requested_model)),
    )
        .into_response();
    *response.headers_mut() = parts.headers;
    response
        .headers_mut()
        .insert("content-type", HeaderValue::from_static("application/json"));
    response
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
    *response.headers_mut() = crate::proxy::relay_response_headers(upstream);
    response.headers_mut().insert(
        "content-type",
        HeaderValue::from_static("text/event-stream"),
    );
    response
        .headers_mut()
        .insert("cache-control", HeaderValue::from_static("no-cache"));
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
