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
use axum::http::{HeaderMap, StatusCode};
use axum::response::Response;
use serde_json::{Value, json};

mod native;
#[cfg(test)]
pub(crate) use native::forward_native_gemini_authorized;
pub use native::{forward_native_gemini, forward_native_vertex, native_model, native_models};

use crate::metrics::Surface;
use crate::proxy::{
    AppState, error_response, maybe_mpp_challenge, request_routing_context, retry_after_duration,
};

/// Environment variable carrying the Google Cloud project id for Code Assist.
pub const PROJECT_ENV: &str = "GEMINI_PROJECT";

/// Model owner reported for Gemini catalog entries.
pub const MODEL_OWNER: &str = "google";

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
    if let Ok(project) = std::env::var(PROJECT_ENV)
        && !project.is_empty()
    {
        envelope["project"] = Value::String(project);
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
    let routing_body = body.clone();
    forward(
        state,
        headers,
        body,
        &routing_body,
        Surface::OpenAIChat,
        ShapeIn::Chat,
        None,
    )
    .await
}

pub(crate) async fn forward_chat_completions_routed(
    state: &AppState,
    headers: &HeaderMap,
    body: Value,
    routing_body: &Value,
    subscription: Option<&crate::model_routing::ValidatedSubscription>,
) -> Response {
    forward(
        state,
        headers,
        body,
        routing_body,
        Surface::OpenAIChat,
        ShapeIn::Chat,
        subscription,
    )
    .await
}

/// `POST /v1/chat/completions` with an explicit metrics surface.
///
/// Used by the Anthropic bridge, where the client-facing surface is Anthropic
/// even though the upstream request is `OpenAI`-shaped.
pub async fn forward_chat_completions_as(
    state: &AppState,
    headers: &HeaderMap,
    body: Value,
    surface: Surface,
) -> Response {
    let routing_body = body.clone();
    forward(
        state,
        headers,
        body,
        &routing_body,
        surface,
        ShapeIn::Chat,
        None,
    )
    .await
}

pub(crate) async fn forward_chat_completions_as_routed(
    state: &AppState,
    headers: &HeaderMap,
    body: Value,
    surface: Surface,
    subscription: Option<&crate::model_routing::ValidatedSubscription>,
) -> Response {
    let routing_body = body.clone();
    forward(
        state,
        headers,
        body,
        &routing_body,
        surface,
        ShapeIn::Chat,
        subscription,
    )
    .await
}

/// `POST /v1/responses` for the Gemini subscription upstream.
pub async fn forward_responses(state: &AppState, headers: &HeaderMap, body: Value) -> Response {
    let routing_body = body.clone();
    forward(
        state,
        headers,
        body,
        &routing_body,
        Surface::OpenAIResponses,
        ShapeIn::Responses,
        None,
    )
    .await
}

pub(crate) async fn forward_responses_routed(
    state: &AppState,
    headers: &HeaderMap,
    body: Value,
    routing_body: &Value,
    subscription: Option<&crate::model_routing::ValidatedSubscription>,
) -> Response {
    forward(
        state,
        headers,
        body,
        routing_body,
        Surface::OpenAIResponses,
        ShapeIn::Responses,
        subscription,
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
    /// Spend reserved at admission, carrying the token id it was taken
    /// against; released when the response settles.
    reservation: crate::usage::ReservationGuard,
}

async fn route_gemini_token(
    state: &AppState,
    headers: &HeaderMap,
    body: &Value,
    routing_body: &Value,
    surface: Surface,
    path: &str,
    validated: Option<&crate::model_routing::ValidatedSubscription>,
) -> Result<RoutedGeminiToken, Response> {
    let claims = crate::proxy::authenticate_client(state, headers).map_err(|response| *response)?;
    let reserved = crate::token_reservation::estimate(body).total();
    state
        .token_manager
        .enforce_request_budget_reserving(&claims.sub, reserved)
        .map_err(|error| crate::token_http::budget_error_response(&error))?;
    let reservation = crate::usage::ReservationGuard::new(
        state.token_manager.clone(),
        claims.sub.clone(),
        reserved,
    );
    crate::audit::record_authorised_request_with_resolved_model(
        state,
        &claims,
        surface,
        path,
        Some(routing_body),
        body.get("model").and_then(Value::as_str),
    );
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
    let selected = if let Some(validated) = validated {
        if validated.provider != crate::subscription::SubscriptionProvider::Gemini {
            return Err(error_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                "api_error",
                "validated subscription does not match the Gemini provider",
            ));
        }
        validated
            .for_dispatch_with_context(state, &routing_context)
            .await
            .map_err(|error| {
                error_response(
                    StatusCode::SERVICE_UNAVAILABLE,
                    "authentication_error",
                    &error,
                )
            })?
    } else if let Some(router) = state.account_router.as_ref() {
        router
            .select_subscription_where_authoritative(
                &routing_context,
                &state.subscription_cache,
                |_| true,
            )
            .await
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
        state
            .subscription_cache
            .register_reader(crate::credential_recovery_store::PRIMARY_ACCOUNT, reader);
        let token = state
            .subscription_cache
            .load_authoritative(
                crate::subscription::SubscriptionProvider::Gemini,
                crate::credential_recovery_store::PRIMARY_ACCOUNT,
            )
            .await
            .map_err(|_| {
                error_response(
                    StatusCode::BAD_GATEWAY,
                    "authentication_error",
                    "failed to read Gemini subscription credentials",
                )
            })?
            .ok_or_else(|| {
                error_response(
                    StatusCode::BAD_GATEWAY,
                    "authentication_error",
                    "failed to read Gemini subscription credentials",
                )
            })?;
        crate::accounts::SelectedSubscriptionAccount {
            name: "primary".to_string(),
            token,
        }
    };
    let token = if validated.is_some() {
        selected.token
    } else {
        let now_ms = chrono::Utc::now().timestamp_millis();
        state
            .subscription_cache
            .get_fresh_loaded(
                &state.client,
                crate::subscription::SubscriptionProvider::Gemini,
                &selected.name,
                selected.token,
                now_ms,
            )
            .await
            .map_err(|error| {
                error_response(
                    StatusCode::SERVICE_UNAVAILABLE,
                    "authentication_error",
                    &error,
                )
            })?
    };
    Ok(RoutedGeminiToken {
        token,
        account: selected.name,
        reservation,
    })
}

async fn forward(
    state: &AppState,
    headers: &HeaderMap,
    body: Value,
    routing_body: &Value,
    surface: Surface,
    shape: ShapeIn,
    validated: Option<&crate::model_routing::ValidatedSubscription>,
) -> Response {
    if let Some(resp) =
        maybe_mpp_challenge(state, headers, "/api/services/openai/v1/chat/completions")
    {
        return resp;
    }
    let routed = match route_gemini_token(
        state,
        headers,
        &body,
        routing_body,
        surface,
        "/api/services/openai/v1/chat/completions",
        validated,
    )
    .await
    {
        Ok(routed) => routed,
        Err(response) => return response,
    };
    let sub_token = routed.token;
    let selected_account = Some(routed.account);
    // The reservation carries the token id; usage settles through it.
    let mut reservation = routed.reservation;
    let requested_model = routing_body
        .get("model")
        .and_then(Value::as_str)
        .unwrap_or_default()
        .to_string();

    // Normalize Responses input into the Chat `messages` shape so a single
    // translator handles both surfaces.
    let chat_body = match shape {
        ShapeIn::Chat => body,
        ShapeIn::Responses => responses_to_chat(&body),
    };

    let catalog = state
        .model_catalogs
        .models(crate::subscription::SubscriptionProvider::Gemini);
    let Some(model) = select_model(
        chat_body.get("model").and_then(Value::as_str),
        &catalog,
        state.bridge_model_policy,
    ) else {
        return error_response(
            StatusCode::SERVICE_UNAVAILABLE,
            crate::bridge_selection::MODEL_SELECTION_REQUIRED,
            "the requested model is not advertised by the Gemini account's live catalog",
        );
    };
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

    let upstream_request = state
        .client
        .post(upstream_url)
        .header("content-type", "application/json")
        .header(
            "authorization",
            format!("Bearer {}", sub_token.access_token),
        )
        .body(serialized);
    let correlation_id = crate::request_log::correlation_id(headers);
    let upstream_resp = match state
        .request_log
        .send_upstream(&correlation_id, &state.client, upstream_request)
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
    state
        .subscription_cache
        .record_status_for_credential(
            crate::subscription::SubscriptionProvider::Gemini,
            selected_account
                .as_deref()
                .unwrap_or(crate::credential_recovery_store::PRIMARY_ACCOUNT),
            &sub_token,
            status.as_u16(),
        )
        .await;
    let retry_after = retry_after_duration(upstream_resp.headers());
    if status == StatusCode::TOO_MANY_REQUESTS
        && let (Some(router), Some(account)) =
            (state.account_router.as_ref(), selected_account.as_deref())
    {
        router.report_failure_with_retry_after(
            account,
            "Gemini subscription upstream returned 429",
            retry_after,
        );
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
        .request_log
        .record_upstream_body(&correlation_id, &upstream_body);
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
    let mut usage = reservation.take().into_tracker();
    usage.feed(&upstream_body);

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
    let mut chat = gemini_response_to_chat(&gemini_json, &model);
    let upstream_model = crate::output_limit::preserve_model_identity(&mut chat, &requested_model);

    if stream_requested {
        return sse_from_chat_completion(&chat, &requested_model, upstream_model.as_deref());
    }
    let mut response = Response::new(Body::from(chat.to_string()));
    *response.status_mut() = StatusCode::OK;
    response.headers_mut().insert(
        "content-type",
        axum::http::HeaderValue::from_static("application/json"),
    );
    if let Some(upstream_model) = upstream_model.as_deref()
        && let Ok(value) = axum::http::HeaderValue::from_str(upstream_model)
    {
        response
            .headers_mut()
            .insert(crate::output_limit::UPSTREAM_MODEL_HEADER, value);
    }
    response
}

/// Re-emit a non-streamed chat completion as an `OpenAI` SSE stream
/// (`chat.completion.chunk` deltas followed by `[DONE]`).
fn sse_from_chat_completion(
    chat: &Value,
    requested_model: &str,
    upstream_model: Option<&str>,
) -> Response {
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

    let mut role_chunk = json!({
        "id": id, "object": "chat.completion.chunk", "created": created, "model": requested_model,
        "choices": [{ "index": 0, "delta": { "role": "assistant" }, "finish_reason": null }],
    });
    let mut content_chunk = json!({
        "id": id, "object": "chat.completion.chunk", "created": created, "model": requested_model,
        "choices": [{ "index": 0, "delta": { "content": content }, "finish_reason": null }],
    });
    let mut stop_chunk = json!({
        "id": id, "object": "chat.completion.chunk", "created": created, "model": requested_model,
        "choices": [{ "index": 0, "delta": {}, "finish_reason": "stop" }],
    });
    if let Some(upstream_model) = upstream_model {
        for chunk in [&mut role_chunk, &mut content_chunk, &mut stop_chunk] {
            chunk[crate::output_limit::UPSTREAM_MODEL_FIELD] =
                Value::String(upstream_model.to_string());
        }
    }
    let payload = format!(
        "data: {role_chunk}\n\ndata: {content_chunk}\n\ndata: {stop_chunk}\n\ndata: [DONE]\n\n"
    );
    let mut response = Response::new(Body::from(payload));
    *response.status_mut() = StatusCode::OK;
    response.headers_mut().insert(
        "content-type",
        axum::http::HeaderValue::from_static("text/event-stream"),
    );
    if let Some(upstream_model) = upstream_model
        && let Ok(value) = axum::http::HeaderValue::from_str(upstream_model)
    {
        response
            .headers_mut()
            .insert(crate::output_limit::UPSTREAM_MODEL_HEADER, value);
    }
    response
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

/// Choose the Gemini model to serve a request with.
///
/// The router holds no built-in Gemini model names and never substitutes one
/// for an unknown request (issue #192): a request that names a model the
/// account advertises is served, a request that names nothing falls back to the
/// operator policy over the live catalog, and anything else fails so the caller
/// learns the model is unavailable instead of silently getting a different one.
fn select_model(
    requested: Option<&str>,
    catalog: &[String],
    policy: crate::bridge_selection::BridgeModelPolicy,
) -> Option<String> {
    match requested {
        Some(model) if !model.is_empty() => {
            // An empty catalog means discovery has not completed; the upstream
            // remains the authority on whether the name is real.
            (catalog.is_empty() || catalog.iter().any(|entry| entry == model))
                .then(|| model.to_string())
        }
        _ => policy.choose(catalog),
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
    fn select_model_uses_the_live_catalog_only() {
        // Synthetic names: the router must hold no real Gemini ids (issue #192).
        let catalog = vec!["nimbus-3-flash".to_string(), "nimbus-9-pro".to_string()];
        // A model the account advertises is served unchanged.
        assert_eq!(
            select_model(
                Some("nimbus-3-flash"),
                &catalog,
                crate::bridge_selection::BridgeModelPolicy::default()
            ),
            Some("nimbus-3-flash".to_string())
        );
        // A model it does not advertise is refused, not substituted.
        assert_eq!(
            select_model(
                Some("absent-1"),
                &catalog,
                crate::bridge_selection::BridgeModelPolicy::default()
            ),
            None
        );
        // No requested model falls back to the operator policy over the catalog.
        assert_eq!(
            select_model(
                None,
                &catalog,
                crate::bridge_selection::BridgeModelPolicy::default()
            ),
            Some("nimbus-3-flash".to_string())
        );
        // Nothing discovered and nothing requested selects nothing.
        assert_eq!(
            select_model(
                None,
                &[],
                crate::bridge_selection::BridgeModelPolicy::default()
            ),
            None
        );
    }

    #[test]
    fn parses_gemini_and_vertex_native_actions() {
        assert_eq!(
            native::parse_native_target("models/gemini-2.5-pro:generateContent"),
            Some(("gemini-2.5-pro".into(), false))
        );
        assert_eq!(
            native::parse_native_target(
                "projects/p/locations/us/publishers/google/models/gemini-2.5-flash:streamGenerateContent"
            ),
            Some(("gemini-2.5-flash".into(), true))
        );
        assert!(native::parse_native_target("models/gemini-2.5-pro:countTokens").is_none());
    }

    /// Translation of an `OpenAI` chat body into Gemini's request shape,
    /// including the system-instruction split and generation config.
    #[test]
    fn chat_requests_translate_into_the_gemini_shape() {
        let body = json!({
            "messages": [
                {"role": "system", "content": "be brief"},
                {"role": "user", "content": "hello"},
                {"role": "assistant", "content": "hi"},
                {"role": "tool", "content": "result"}
            ],
            "max_tokens": 128,
            "temperature": 0.4,
            "top_p": 0.9
        });
        let request = chat_to_gemini_request(&body);

        assert_eq!(request["systemInstruction"]["parts"][0]["text"], "be brief");
        let contents = request["contents"].as_array().expect("contents");
        assert_eq!(contents.len(), 3, "system is lifted out of the turn list");
        assert_eq!(contents[0]["role"], "user");
        assert_eq!(contents[1]["role"], "model", "assistant maps to model");
        assert_eq!(
            contents[2]["role"], "user",
            "tool results map to a user turn"
        );
        assert_eq!(request["generationConfig"]["maxOutputTokens"], 128);
        assert_eq!(request["generationConfig"]["temperature"], 0.4);
        assert_eq!(request["generationConfig"]["topP"], 0.9);
    }

    #[test]
    fn a_request_without_knobs_omits_the_generation_config() {
        let request = chat_to_gemini_request(&json!({"messages": []}));
        assert!(request.get("generationConfig").is_none());
        assert!(request.get("systemInstruction").is_none());
    }

    #[test]
    fn max_completion_tokens_is_accepted_as_the_output_cap() {
        let request = chat_to_gemini_request(&json!({
            "messages": [],
            "max_completion_tokens": 64
        }));
        assert_eq!(request["generationConfig"]["maxOutputTokens"], 64);
    }

    #[test]
    fn the_code_assist_envelope_carries_the_model() {
        let envelope = code_assist_envelope("nimbus-3-flash", &json!({"contents": []}));
        assert_eq!(envelope["model"], "nimbus-3-flash");
        assert_eq!(envelope["request"]["contents"], json!([]));
    }

    /// Responses are translated back into the `OpenAI` completion shape, with
    /// usage carried across so spend accounting stays truthful.
    #[test]
    fn gemini_responses_translate_back_with_usage() {
        let response = json!({
            "candidates": [{
                "content": {"parts": [{"text": "one "}, {"text": "two"}]},
                "finishReason": "STOP"
            }],
            "usageMetadata": {"promptTokenCount": 11, "candidatesTokenCount": 5}
        });
        let chat = gemini_response_to_chat(&response, "nimbus-3-flash");

        assert_eq!(chat["model"], "nimbus-3-flash");
        assert_eq!(chat["choices"][0]["message"]["content"], "one two");
        assert_eq!(chat["choices"][0]["finish_reason"], "stop");
        assert_eq!(chat["usage"]["prompt_tokens"], 11);
        assert_eq!(chat["usage"]["completion_tokens"], 5);
        assert_eq!(chat["usage"]["total_tokens"], 16);
    }

    /// Code Assist nests the payload under `response`; both shapes are read.
    #[test]
    fn a_nested_code_assist_response_is_unwrapped() {
        let nested = json!({
            "response": {
                "candidates": [{"content": {"parts": [{"text": "inner"}]}}]
            }
        });
        let chat = gemini_response_to_chat(&nested, "nimbus-3-flash");
        assert_eq!(chat["choices"][0]["message"]["content"], "inner");
    }

    #[test]
    fn finish_reasons_map_onto_the_openai_vocabulary() {
        assert_eq!(map_finish_reason("MAX_TOKENS"), "length");
        for blocked in ["SAFETY", "RECITATION", "BLOCKLIST", "PROHIBITED_CONTENT"] {
            assert_eq!(map_finish_reason(blocked), "content_filter", "{blocked}");
        }
        assert_eq!(map_finish_reason("STOP"), "stop");
        assert_eq!(map_finish_reason("SOMETHING_NEW"), "stop");
    }

    #[test]
    fn message_text_is_extracted_from_both_content_shapes() {
        assert_eq!(extract_message_text(Some(&json!("plain"))), "plain");
        assert_eq!(
            extract_message_text(Some(&json!([{"text": "a"}, {"text": "b"}]))),
            "ab"
        );
        assert_eq!(extract_message_text(Some(&json!(["a", "b"]))), "ab");
        assert_eq!(extract_message_text(None), "");
        assert_eq!(extract_message_text(Some(&json!(42))), "");
    }
}
