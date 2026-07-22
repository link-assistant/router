//! Google Gemini (Code Assist) subscription upstream.
//!
//! Gemini speaks neither the Anthropic nor the `OpenAI` wire format, so requests
//! are translated `OpenAI` ↔ Gemini `generateContent` and forwarded to the Code
//! Assist endpoint (`cloudcode-pa.googleapis.com`, `v1internal`) using the
//! subscription OAuth token read by [`crate::subscription`].
//!
//! The Code Assist API wraps a standard `GenerateContentRequest` in an envelope
//! that also carries the `model` and (optionally) a Cloud project id. We build
//! that envelope here. Streaming clients receive a synthesized single-delta SSE
//! sequence: the upstream is called non-streaming and the result re-emitted in
//! `OpenAI`'s `chat.completion.chunk` shape, which keeps the translation simple
//! and fully deterministic without a Gemini SSE parser.

#![allow(clippy::unused_async)]

use axum::body::Body;
use axum::extract::{Path, State};
use axum::http::{HeaderMap, StatusCode};
use axum::response::{IntoResponse, Response};
use serde_json::{Value, json};

use crate::metrics::Surface;
use crate::proxy::{
    AppState, error_response, extract_client_token, maybe_mpp_challenge, request_routing_context,
    retry_after_duration,
};

/// Environment variable carrying the Google Cloud project id for Code Assist.
pub const PROJECT_ENV: &str = "GEMINI_PROJECT";

/// Default Gemini model used when a request omits `model`.
pub const DEFAULT_MODEL: &str = "gemini-2.5-pro";

/// `GET /v1/models` listing for the Gemini subscription upstream.
#[must_use]
pub fn list_models() -> Value {
    let now = chrono::Utc::now().timestamp();
    let entries = [
        "gemini-2.5-pro",
        "gemini-2.5-flash",
        "gemini-2.0-flash",
        "gemini-2.0-flash-lite",
    ];
    let data: Vec<Value> = entries
        .iter()
        .map(|id| {
            json!({
                "id": id,
                "object": "model",
                "created": now,
                "owned_by": "google",
            })
        })
        .collect();
    json!({"object": "list", "data": data})
}

/// Translate an `OpenAI` Chat Completions request body to a Gemini
/// `GenerateContentRequest`.
#[must_use]
pub fn chat_to_gemini_request(body: &Value) -> Value {
    let mut contents: Vec<Value> = Vec::new();
    let mut system_parts: Vec<Value> = Vec::new();

    if let Some(messages) = body.get("messages").and_then(Value::as_array) {
        for msg in messages {
            let role = msg.get("role").and_then(Value::as_str).unwrap_or("user");
            let text = extract_message_text(msg.get("content"));
            match role {
                "system" | "developer" => {
                    system_parts.push(json!({ "text": text }));
                }
                "assistant" => contents.push(json!({
                    "role": "model",
                    "parts": [{ "text": text }],
                })),
                // user, tool, and anything else map to a user turn.
                _ => contents.push(json!({
                    "role": "user",
                    "parts": [{ "text": text }],
                })),
            }
        }
    }

    let mut generation_config = json!({});
    if let Some(max) = body
        .get("max_completion_tokens")
        .or_else(|| body.get("max_tokens"))
        .and_then(Value::as_u64)
    {
        generation_config["maxOutputTokens"] = json!(max);
    }
    if let Some(t) = body.get("temperature").and_then(Value::as_f64) {
        generation_config["temperature"] = json!(t);
    }
    if let Some(t) = body.get("top_p").and_then(Value::as_f64) {
        generation_config["topP"] = json!(t);
    }

    let mut request = json!({ "contents": contents });
    if !system_parts.is_empty() {
        request["systemInstruction"] = json!({ "parts": system_parts });
    }
    if generation_config.as_object().is_some_and(|o| !o.is_empty()) {
        request["generationConfig"] = generation_config;
    }
    request
}

/// Wrap a `GenerateContentRequest` in the Code Assist envelope.
#[must_use]
pub fn code_assist_envelope(model: &str, request: &Value) -> Value {
    let mut envelope = json!({
        "model": model,
        "request": request,
    });
    if let Ok(project) = std::env::var(PROJECT_ENV) {
        if !project.is_empty() {
            envelope["project"] = Value::String(project);
        }
    }
    envelope
}

/// Translate a Gemini `GenerateContentResponse` to an `OpenAI` Chat Completion.
#[must_use]
pub fn gemini_response_to_chat(resp: &Value, model: &str) -> Value {
    // Code Assist nests the real response under `response`; standard Gemini
    // returns it at the top level. Accept both.
    let inner = resp.get("response").unwrap_or(resp);
    let mut text = String::new();
    let mut finish_reason = "stop";
    if let Some(candidate) = inner
        .get("candidates")
        .and_then(Value::as_array)
        .and_then(|c| c.first())
    {
        if let Some(parts) = candidate
            .get("content")
            .and_then(|c| c.get("parts"))
            .and_then(Value::as_array)
        {
            for part in parts {
                if let Some(t) = part.get("text").and_then(Value::as_str) {
                    text.push_str(t);
                }
            }
        }
        if let Some(reason) = candidate.get("finishReason").and_then(Value::as_str) {
            finish_reason = map_finish_reason(reason);
        }
    }

    let usage = inner.get("usageMetadata");
    let prompt_tokens = usage
        .and_then(|u| u.get("promptTokenCount"))
        .and_then(Value::as_u64)
        .unwrap_or(0);
    let completion_tokens = usage
        .and_then(|u| u.get("candidatesTokenCount"))
        .and_then(Value::as_u64)
        .unwrap_or(0);

    json!({
        "id": format!("chatcmpl-{}", uuid::Uuid::new_v4()),
        "object": "chat.completion",
        "created": chrono::Utc::now().timestamp(),
        "model": model,
        "choices": [{
            "index": 0,
            "message": { "role": "assistant", "content": text },
            "finish_reason": finish_reason,
        }],
        "usage": {
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens": prompt_tokens + completion_tokens,
        },
    })
}

fn map_finish_reason(gemini: &str) -> &'static str {
    match gemini {
        "MAX_TOKENS" => "length",
        "SAFETY" | "RECITATION" | "BLOCKLIST" | "PROHIBITED_CONTENT" => "content_filter",
        _ => "stop",
    }
}

fn extract_message_text(content: Option<&Value>) -> String {
    match content {
        Some(Value::String(s)) => s.clone(),
        Some(Value::Array(parts)) => {
            let mut buf = String::new();
            for part in parts {
                if let Some(t) = part.get("text").and_then(Value::as_str) {
                    buf.push_str(t);
                } else if let Some(s) = part.as_str() {
                    buf.push_str(s);
                }
            }
            buf
        }
        _ => String::new(),
    }
}

/// `POST /v1/chat/completions` for the Gemini subscription upstream.
pub async fn forward_chat_completions(
    state: &AppState,
    headers: &HeaderMap,
    body: Value,
) -> Response {
    forward(state, headers, body, Surface::OpenAIChat, ShapeIn::Chat).await
}

/// `POST /v1/responses` for the Gemini subscription upstream.
pub async fn forward_responses(state: &AppState, headers: &HeaderMap, body: Value) -> Response {
    forward(
        state,
        headers,
        body,
        Surface::OpenAIResponses,
        ShapeIn::Responses,
    )
    .await
}

#[derive(Clone, Copy)]
enum ShapeIn {
    Chat,
    Responses,
}

struct RoutedGeminiToken {
    token: crate::subscription::SubscriptionToken,
    account: String,
}

async fn route_gemini_token(
    state: &AppState,
    headers: &HeaderMap,
    body: &Value,
) -> Result<RoutedGeminiToken, Response> {
    let Some(token) = extract_client_token(headers) else {
        return Err(error_response(
            StatusCode::UNAUTHORIZED,
            "authentication_error",
            "Missing Authorization Bearer token or x-api-key",
        ));
    };
    let claims = state.token_manager.validate_token(token).map_err(|error| {
        let status = if matches!(error, crate::token::TokenError::Revoked) {
            StatusCode::FORBIDDEN
        } else {
            StatusCode::UNAUTHORIZED
        };
        error_response(status, "authentication_error", &error.to_string())
    })?;
    state
        .token_manager
        .enforce_request_budget(&claims.sub)
        .map_err(|error| {
            error_response(
                StatusCode::TOO_MANY_REQUESTS,
                "rate_limit_error",
                &error.to_string(),
            )
        })?;
    let pinned_account = state
        .token_manager
        .account_for(&claims.sub)
        .map_err(|error| {
            error_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                "api_error",
                &format!("failed to resolve token account binding: {error}"),
            )
        })?;
    let routing_context = request_routing_context(headers, body, pinned_account);
    let selected = if let Some(router) = state.account_router.as_ref() {
        router
            .select_subscription(&routing_context)
            .map_err(|error| {
                error_response(
                    StatusCode::SERVICE_UNAVAILABLE,
                    "account_unavailable",
                    &error.to_string(),
                )
            })?
    } else {
        let reader = state.subscription_reader.as_ref().ok_or_else(|| {
            error_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                "api_error",
                "subscription credentials reader is not configured",
            )
        })?;
        let token = reader.read_token().map_err(|error| {
            error_response(
                StatusCode::BAD_GATEWAY,
                "authentication_error",
                &format!("failed to read Gemini subscription credentials: {error}"),
            )
        })?;
        crate::accounts::SelectedSubscriptionAccount {
            name: "primary".to_string(),
            token,
        }
    };
    let now_ms = chrono::Utc::now().timestamp_millis();
    let token = state
        .subscription_cache
        .get_fresh_for(
            &state.client,
            crate::subscription::SubscriptionProvider::Gemini,
            &selected.name,
            selected.token,
            now_ms,
        )
        .await;
    Ok(RoutedGeminiToken {
        token,
        account: selected.name,
    })
}

async fn forward(
    state: &AppState,
    headers: &HeaderMap,
    body: Value,
    surface: Surface,
    shape: ShapeIn,
) -> Response {
    if let Some(resp) = maybe_mpp_challenge(state, headers, "/v1/chat/completions") {
        return resp;
    }
    let routed = match route_gemini_token(state, headers, &body).await {
        Ok(routed) => routed,
        Err(response) => return response,
    };
    let sub_token = routed.token;
    let selected_account = Some(routed.account);

    // Normalize Responses input into the Chat `messages` shape so a single
    // translator handles both surfaces.
    let chat_body = match shape {
        ShapeIn::Chat => body,
        ShapeIn::Responses => responses_to_chat(&body),
    };

    let model = chat_body
        .get("model")
        .and_then(Value::as_str)
        .map_or_else(|| DEFAULT_MODEL.to_string(), map_model);
    let stream_requested = chat_body
        .get("stream")
        .and_then(Value::as_bool)
        .unwrap_or(false);

    let gemini_request = chat_to_gemini_request(&chat_body);
    let envelope = code_assist_envelope(&model, &gemini_request);
    let serialized = match serde_json::to_vec(&envelope) {
        Ok(v) => v,
        Err(e) => {
            return error_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                "api_error",
                &format!("failed to serialize Gemini request: {e}"),
            );
        }
    };
    let bytes_sent = serialized.len() as u64;

    let base = sub_token
        .base_url(crate::subscription::SubscriptionProvider::Gemini)
        .trim_end_matches('/')
        .to_string();
    // Non-streaming upstream call keeps the translation deterministic; we
    // synthesize `OpenAI` SSE below when the client asked to stream.
    let upstream_url = format!("{base}/v1internal:generateContent");

    let upstream_resp = match state
        .client
        .post(upstream_url)
        .header("content-type", "application/json")
        .header(
            "authorization",
            format!("Bearer {}", sub_token.access_token),
        )
        .body(serialized)
        .send()
        .await
    {
        Ok(resp) => resp,
        Err(e) => {
            state
                .metrics
                .record_request(surface, 502, selected_account.as_deref());
            return error_response(
                StatusCode::BAD_GATEWAY,
                "api_error",
                &format!("Gemini subscription upstream request failed: {e}"),
            );
        }
    };
    let status = StatusCode::from_u16(upstream_resp.status().as_u16())
        .unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
    state
        .metrics
        .record_request(surface, status.as_u16(), selected_account.as_deref());
    let retry_after = retry_after_duration(upstream_resp.headers());
    if status == StatusCode::TOO_MANY_REQUESTS {
        if let (Some(router), Some(account)) =
            (state.account_router.as_ref(), selected_account.as_deref())
        {
            router.report_failure_with_retry_after(
                account,
                "Gemini subscription upstream returned 429",
                retry_after,
            );
        }
    }

    let upstream_body = match upstream_resp.bytes().await {
        Ok(bytes) => bytes,
        Err(e) => {
            state
                .metrics
                .record_request(surface, 502, selected_account.as_deref());
            return error_response(
                StatusCode::BAD_GATEWAY,
                "api_error",
                &format!("Gemini subscription upstream body read failed: {e}"),
            );
        }
    };
    state
        .metrics
        .record_bytes(bytes_sent, upstream_body.len() as u64);

    if !status.is_success() {
        // Pass upstream errors through verbatim for diagnosability.
        let mut response = Response::new(Body::from(upstream_body));
        *response.status_mut() = status;
        response.headers_mut().insert(
            "content-type",
            axum::http::HeaderValue::from_static("application/json"),
        );
        return response;
    }

    let gemini_json: Value = match serde_json::from_slice(&upstream_body) {
        Ok(v) => v,
        Err(e) => {
            return error_response(
                StatusCode::BAD_GATEWAY,
                "api_error",
                &format!("failed to parse Gemini response: {e}"),
            );
        }
    };
    let chat = gemini_response_to_chat(&gemini_json, &model);

    if stream_requested {
        return sse_from_chat_completion(&chat, &model);
    }
    let mut response = Response::new(Body::from(chat.to_string()));
    *response.status_mut() = StatusCode::OK;
    response.headers_mut().insert(
        "content-type",
        axum::http::HeaderValue::from_static("application/json"),
    );
    response
}

/// Re-emit a non-streamed chat completion as an `OpenAI` SSE stream
/// (`chat.completion.chunk` deltas followed by `[DONE]`).
fn sse_from_chat_completion(chat: &Value, model: &str) -> Response {
    let id = chat
        .get("id")
        .and_then(Value::as_str)
        .unwrap_or("chatcmpl-gemini");
    let content = chat
        .get("choices")
        .and_then(|c| c.get(0))
        .and_then(|c| c.get("message"))
        .and_then(|m| m.get("content"))
        .and_then(Value::as_str)
        .unwrap_or("");
    let created = chat
        .get("created")
        .and_then(Value::as_i64)
        .unwrap_or_default();

    let role_chunk = json!({
        "id": id, "object": "chat.completion.chunk", "created": created, "model": model,
        "choices": [{ "index": 0, "delta": { "role": "assistant" }, "finish_reason": null }],
    });
    let content_chunk = json!({
        "id": id, "object": "chat.completion.chunk", "created": created, "model": model,
        "choices": [{ "index": 0, "delta": { "content": content }, "finish_reason": null }],
    });
    let stop_chunk = json!({
        "id": id, "object": "chat.completion.chunk", "created": created, "model": model,
        "choices": [{ "index": 0, "delta": {}, "finish_reason": "stop" }],
    });
    let payload = format!(
        "data: {role_chunk}\n\ndata: {content_chunk}\n\ndata: {stop_chunk}\n\ndata: [DONE]\n\n"
    );
    let mut response = Response::new(Body::from(payload));
    *response.status_mut() = StatusCode::OK;
    response.headers_mut().insert(
        "content-type",
        axum::http::HeaderValue::from_static("text/event-stream"),
    );
    response
}

fn native_model_document(model: &str) -> Value {
    let model = model.trim_start_matches("models/");
    json!({
        "name": format!("models/{model}"),
        "displayName": model,
        "description": "Gemini Code Assist subscription model routed by Link.Assistant.Router",
        "inputTokenLimit": 1_048_576,
        "outputTokenLimit": 65_536,
        "supportedGenerationMethods": ["generateContent", "streamGenerateContent"]
    })
}

/// Native Gemini `ListModels` response.
pub async fn native_models() -> impl IntoResponse {
    let models = [
        "gemini-2.5-pro",
        "gemini-2.5-flash",
        "gemini-2.0-flash",
        "gemini-2.0-flash-lite",
    ]
    .iter()
    .map(|model| native_model_document(model))
    .collect::<Vec<_>>();
    (StatusCode::OK, axum::Json(json!({"models": models})))
}

/// Native Gemini `GetModel` response.
pub async fn native_model(Path(model): Path<String>) -> impl IntoResponse {
    (StatusCode::OK, axum::Json(native_model_document(&model)))
}

fn parse_native_target(path: &str) -> Option<(String, bool)> {
    let (resource, action) = path.rsplit_once(':')?;
    let streaming = match action {
        "generateContent" => false,
        "streamGenerateContent" => true,
        _ => return None,
    };
    let model = resource
        .rsplit_once("/models/")
        .map_or(resource, |(_, model)| model)
        .trim_start_matches("models/")
        .trim_matches('/');
    (!model.is_empty()).then(|| (model.to_string(), streaming))
}

/// Forward a native Gemini `GenerateContentRequest` without translating it to
/// an `OpenAI` shape.
pub async fn forward_native_gemini(
    State(state): State<AppState>,
    Path(path): Path<String>,
    headers: HeaderMap,
    axum::Json(body): axum::Json<Value>,
) -> Response {
    forward_native(&state, &headers, &path, body).await
}

/// Forward a Vertex publisher-model request using the same native Gemini body.
pub async fn forward_native_vertex(
    State(state): State<AppState>,
    Path(path): Path<String>,
    headers: HeaderMap,
    axum::Json(body): axum::Json<Value>,
) -> Response {
    forward_native(&state, &headers, &path, body).await
}

async fn forward_native(
    state: &AppState,
    headers: &HeaderMap,
    path: &str,
    body: Value,
) -> Response {
    if state.upstream_provider != crate::config::UpstreamProvider::Gemini {
        return error_response(
            StatusCode::BAD_REQUEST,
            "invalid_request_error",
            "native Gemini and Vertex routes require UPSTREAM_PROVIDER=gemini",
        );
    }
    let Some((model, streaming)) = parse_native_target(path) else {
        return error_response(
            StatusCode::NOT_FOUND,
            "not_found_error",
            "expected a model :generateContent or :streamGenerateContent action",
        );
    };
    let routed = match route_gemini_token(state, headers, &body).await {
        Ok(routed) => routed,
        Err(response) => return response,
    };
    let envelope = code_assist_envelope(&model, &body);
    let serialized = match serde_json::to_vec(&envelope) {
        Ok(serialized) => serialized,
        Err(error) => {
            return error_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                "api_error",
                &format!("failed to serialize Gemini request: {error}"),
            );
        }
    };
    let base = routed
        .token
        .base_url(crate::subscription::SubscriptionProvider::Gemini);
    // Code Assist accepts the same envelope for both client modes. A
    // non-streaming upstream call lets us unwrap the native response reliably;
    // stream callers receive that response as a valid Gemini SSE data event.
    let upstream_url = format!("{}/v1internal:generateContent", base.trim_end_matches('/'));
    let upstream = match state
        .client
        .post(upstream_url)
        .header("content-type", "application/json")
        .header(
            "authorization",
            format!("Bearer {}", routed.token.access_token),
        )
        .body(serialized.clone())
        .send()
        .await
    {
        Ok(response) => response,
        Err(error) => {
            state
                .metrics
                .record_request(Surface::OpenAIChat, 502, Some(&routed.account));
            return error_response(
                StatusCode::BAD_GATEWAY,
                "api_error",
                &format!("Gemini subscription upstream request failed: {error}"),
            );
        }
    };
    let status = StatusCode::from_u16(upstream.status().as_u16())
        .unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
    let retry_after = retry_after_duration(upstream.headers());
    let retry_header = upstream.headers().get("retry-after").cloned();
    let response_body = match upstream.bytes().await {
        Ok(bytes) => bytes,
        Err(error) => {
            return error_response(
                StatusCode::BAD_GATEWAY,
                "api_error",
                &format!("Gemini subscription upstream body read failed: {error}"),
            );
        }
    };
    state
        .metrics
        .record_bytes(serialized.len() as u64, response_body.len() as u64);
    state
        .metrics
        .record_request(Surface::OpenAIChat, status.as_u16(), Some(&routed.account));
    if status == StatusCode::TOO_MANY_REQUESTS {
        if let Some(router) = state.account_router.as_ref() {
            router.report_failure_with_retry_after(
                &routed.account,
                "Gemini subscription upstream returned 429",
                retry_after,
            );
        }
    }
    if !status.is_success() {
        let mut response = Response::new(Body::from(response_body));
        *response.status_mut() = status;
        response.headers_mut().insert(
            "content-type",
            axum::http::HeaderValue::from_static("application/json"),
        );
        if let Some(value) = retry_header {
            response.headers_mut().insert("retry-after", value);
        }
        return response;
    }
    let parsed: Value = match serde_json::from_slice(&response_body) {
        Ok(parsed) => parsed,
        Err(error) => {
            return error_response(
                StatusCode::BAD_GATEWAY,
                "api_error",
                &format!("failed to parse Gemini response: {error}"),
            );
        }
    };
    let native = parsed.get("response").cloned().unwrap_or(parsed);
    if streaming {
        let mut response = Response::new(Body::from(format!("data: {native}\n\n")));
        *response.status_mut() = StatusCode::OK;
        response.headers_mut().insert(
            "content-type",
            axum::http::HeaderValue::from_static("text/event-stream"),
        );
        return response;
    }
    (StatusCode::OK, axum::Json(native)).into_response()
}

/// Project an `OpenAI` Responses request onto the Chat Completions shape.
fn responses_to_chat(body: &Value) -> Value {
    let mut messages: Vec<Value> = Vec::new();
    if let Some(instructions) = body.get("instructions").and_then(Value::as_str) {
        messages.push(json!({ "role": "system", "content": instructions }));
    }
    match body.get("input") {
        Some(Value::String(s)) => messages.push(json!({ "role": "user", "content": s })),
        Some(Value::Array(items)) => {
            for item in items {
                if let Some(role) = item.get("role").and_then(Value::as_str) {
                    let content = item.get("content").cloned().unwrap_or(Value::Null);
                    messages.push(json!({ "role": role, "content": content }));
                } else if let Some(text) = item.as_str() {
                    messages.push(json!({ "role": "user", "content": text }));
                }
            }
        }
        _ => {}
    }
    let mut out = json!({ "messages": messages });
    for key in [
        "model",
        "max_output_tokens",
        "temperature",
        "top_p",
        "stream",
    ] {
        if let Some(v) = body.get(key) {
            let mapped = if key == "max_output_tokens" {
                "max_tokens"
            } else {
                key
            };
            out[mapped] = v.clone();
        }
    }
    out
}

/// Map a requested model name to a Gemini model id.
fn map_model(requested: &str) -> String {
    if requested.starts_with("gemini") {
        return requested.to_string();
    }
    match requested {
        "gpt-4o-mini" | "gpt-4-mini" | "haiku" => "gemini-2.5-flash".to_string(),
        _ => DEFAULT_MODEL.to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn translates_chat_to_gemini_contents_and_system() {
        let body = json!({
            "model": "gemini-2.5-pro",
            "messages": [
                {"role": "system", "content": "be terse"},
                {"role": "user", "content": "hi"},
                {"role": "assistant", "content": "hello"},
                {"role": "user", "content": "more"}
            ],
            "temperature": 0.5,
            "max_tokens": 256
        });
        let g = chat_to_gemini_request(&body);
        let contents = g["contents"].as_array().unwrap();
        assert_eq!(contents.len(), 3);
        assert_eq!(contents[0]["role"], "user");
        assert_eq!(contents[1]["role"], "model");
        assert_eq!(g["systemInstruction"]["parts"][0]["text"], "be terse");
        assert_eq!(g["generationConfig"]["maxOutputTokens"], 256);
        assert_eq!(g["generationConfig"]["temperature"], 0.5);
    }

    #[test]
    fn translates_gemini_response_to_chat() {
        let resp = json!({
            "candidates": [{
                "content": { "role": "model", "parts": [{"text": "answer"}] },
                "finishReason": "STOP"
            }],
            "usageMetadata": { "promptTokenCount": 3, "candidatesTokenCount": 5 }
        });
        let chat = gemini_response_to_chat(&resp, "gemini-2.5-pro");
        assert_eq!(chat["choices"][0]["message"]["content"], "answer");
        assert_eq!(chat["choices"][0]["finish_reason"], "stop");
        assert_eq!(chat["usage"]["total_tokens"], 8);
    }

    #[test]
    fn unwraps_code_assist_response_envelope() {
        let resp = json!({
            "response": {
                "candidates": [{ "content": { "parts": [{"text": "x"}] }, "finishReason": "MAX_TOKENS" }]
            }
        });
        let chat = gemini_response_to_chat(&resp, "gemini-2.5-pro");
        assert_eq!(chat["choices"][0]["message"]["content"], "x");
        assert_eq!(chat["choices"][0]["finish_reason"], "length");
    }

    #[test]
    fn envelope_includes_model() {
        let env = code_assist_envelope("gemini-2.5-pro", &json!({"contents": []}));
        assert_eq!(env["model"], "gemini-2.5-pro");
        assert!(env.get("request").is_some());
    }

    #[test]
    fn responses_input_projects_to_messages() {
        let body = json!({
            "model": "gemini-2.5-pro",
            "instructions": "sys",
            "input": [{"role": "user", "content": "hi"}],
            "max_output_tokens": 100
        });
        let chat = responses_to_chat(&body);
        let messages = chat["messages"].as_array().unwrap();
        assert_eq!(messages[0]["role"], "system");
        assert_eq!(messages[1]["role"], "user");
        assert_eq!(chat["max_tokens"], 100);
    }

    #[test]
    fn map_model_passes_gemini_through() {
        assert_eq!(map_model("gemini-2.5-flash"), "gemini-2.5-flash");
        assert_eq!(map_model("gpt-4o"), DEFAULT_MODEL);
    }

    #[test]
    fn parses_gemini_and_vertex_native_actions() {
        assert_eq!(
            parse_native_target("models/gemini-2.5-pro:generateContent"),
            Some(("gemini-2.5-pro".into(), false))
        );
        assert_eq!(
            parse_native_target(
                "projects/p/locations/us/publishers/google/models/gemini-2.5-flash:streamGenerateContent"
            ),
            Some(("gemini-2.5-flash".into(), true))
        );
        assert!(parse_native_target("models/gemini-2.5-pro:countTokens").is_none());
    }
}
