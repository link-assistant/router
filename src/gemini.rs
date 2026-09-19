//! Google Gemini (Code Assist) subscription upstream.
//!
//! Gemini speaks neither the Anthropic nor the `OpenAI` wire format, so requests
//! are translated `OpenAI` ↔ Gemini `generateContent` and forwarded to the Code
//! Assist endpoint (`cloudcode-pa.googleapis.com`, `v1internal`) using the
//! subscription OAuth token read by [`crate::subscription`].
//!
//! The Code Assist API wraps a standard `GenerateContentRequest` in an envelope
//! that also carries the `model` and (optionally) a Cloud project id. We build
//! that envelope here. Streaming calls use Code Assist's SSE endpoint and are
//! translated event by event without buffering the completed generation.

#![allow(clippy::unused_async)]

use axum::body::Body;
use axum::http::{HeaderMap, StatusCode};
use axum::response::Response;
use futures_util::StreamExt as _;
use serde_json::{Value, json};

mod native;
mod responses;
mod stream;
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

pub use crate::gemini_bridge::chat_to_gemini_request;

/// Wrap a `GenerateContentRequest` in the Code Assist envelope.
#[must_use]
pub fn code_assist_envelope(model: &str, request: &Value) -> Value {
    let model = model.strip_prefix("models/").unwrap_or(model);
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
pub fn gemini_response_to_chat(resp: &Value, _model: &str) -> Value {
    // Code Assist nests the real response under `response`; standard Gemini
    // returns it at the top level. Accept both.
    let inner = resp.get("response").unwrap_or(resp);
    let mut text = String::new();
    let mut tool_calls = Vec::new();
    let mut finish_reason = "stop";
    if let Some(parts) = inner
        .pointer("/candidates/0/content/parts")
        .and_then(Value::as_array)
    {
        for part in parts {
            if let Some(t) = part.get("text").and_then(Value::as_str) {
                text.push_str(t);
            } else if let Some(call) = part.get("functionCall") {
                let id = call
                    .get("id")
                    .and_then(Value::as_str)
                    .filter(|id| !id.is_empty())
                    .map_or_else(|| format!("call_{}", uuid::Uuid::new_v4()), str::to_string);
                tool_calls.push(json!({
                    "id": id,
                    "type": "function",
                    "function": {
                        "name": call.get("name").and_then(Value::as_str).unwrap_or_default(),
                        "arguments": call.get("args").cloned()
                            .unwrap_or_else(|| json!({})).to_string(),
                    }
                }));
            }
        }
    }
    if let Some(reason) = gemini_finish_reason(resp) {
        finish_reason = map_finish_reason(reason);
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

    let mut message = json!({"role": "assistant", "content": text});
    if !tool_calls.is_empty() {
        message["tool_calls"] = Value::Array(tool_calls);
        if message["content"].as_str().is_some_and(str::is_empty) {
            message["content"] = Value::Null;
        }
        if finish_reason == "stop" {
            finish_reason = "tool_calls";
        }
    }

    let served_model = inner
        .get("modelVersion")
        .and_then(Value::as_str)
        .unwrap_or_default();
    json!({
        "id": format!("chatcmpl-{}", uuid::Uuid::new_v4()),
        "object": "chat.completion",
        "created": chrono::Utc::now().timestamp(),
        "model": served_model,
        "choices": [{
            "index": 0,
            "message": message,
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
        "STOP" => "stop",
        "MAX_TOKENS" => "length",
        _ => "content_filter",
    }
}

fn gemini_finish_reason(response: &Value) -> Option<&str> {
    let inner = response.get("response").unwrap_or(response);
    inner
        .pointer("/candidates/0/finishReason")
        .or_else(|| inner.pointer("/promptFeedback/blockReason"))
        .and_then(Value::as_str)
}

#[cfg(test)]
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
    routing_body: &Value,
    surface: Surface,
    subscription: Option<&crate::model_routing::ValidatedSubscription>,
) -> Response {
    forward(
        state,
        headers,
        body,
        routing_body,
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

#[derive(Clone, Copy, Eq, PartialEq)]
enum ShapeIn {
    Chat,
    Responses,
}

struct RoutedGeminiToken {
    claims: crate::token::TokenClaims,
    token: crate::subscription::SubscriptionToken,
    account: String,
    /// Spend reserved at admission, carrying the token id it was taken
    /// against; released when the response settles.
    reservation: crate::usage::ReservationGuard,
    model_policy: crate::model_contract::ModelAccessPolicy,
    selector_kind: crate::model_contract::ModelSelectorKind,
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
    let requested_model = routing_body
        .get("model")
        .and_then(Value::as_str)
        .unwrap_or_default();
    let model_policy = if requested_model.is_empty() {
        match crate::proxy::model_policy_for_claims(state, &claims) {
            Ok(policy) if policy.allowed_models.is_empty() => policy,
            Ok(_) => {
                return Err(error_response(
                    StatusCode::BAD_REQUEST,
                    "model_required",
                    "a pinned credential requires a non-empty exact model",
                ));
            }
            Err(error) => {
                return Err(error_response(
                    StatusCode::SERVICE_UNAVAILABLE,
                    "model_policy_unavailable",
                    &error.to_string(),
                ));
            }
        }
    } else {
        crate::proxy::authorize_model_for_claims(
            state,
            &claims,
            requested_model,
            crate::api_error::ApiDialect::Gemini,
        )?
    };
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
    let selector_kind = state.model_catalogs.selector_kind_for(
        crate::subscription::SubscriptionProvider::Gemini,
        &selected.name,
        requested_model,
    );
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
        claims,
        token,
        account: selected.name,
        reservation,
        model_policy,
        selector_kind,
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
    let claims = routed.claims;
    let sub_token = routed.token;
    let selected_account = Some(routed.account);
    // The reservation carries the token id; usage settles through it.
    let mut reservation = routed.reservation;
    let model_policy = routed.model_policy;
    let selector_kind = routed.selector_kind;
    let requested_model = routing_body
        .get("model")
        .and_then(Value::as_str)
        .unwrap_or_default()
        .to_string();

    // Normalize Responses input into the Chat `messages` shape so a single
    // translator handles both surfaces.
    let chat_body = match shape {
        ShapeIn::Chat => body,
        ShapeIn::Responses => match crate::gemini_bridge::responses_to_chat_checked(&body) {
            Ok(chat) => chat,
            Err(reason) => return bridge_request_error(surface, &reason),
        },
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

    let gemini_request = match crate::gemini_bridge::chat_to_gemini_request_checked(&chat_body) {
        Ok(request) => request,
        Err(reason) => return bridge_request_error(surface, &reason),
    };
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
    let upstream_url = if stream_requested {
        format!("{base}/v1internal:streamGenerateContent?alt=sse")
    } else {
        format!("{base}/v1internal:generateContent")
    };

    let mut upstream_request = state
        .client
        .post(upstream_url)
        .header("content-type", "application/json")
        .header(
            "authorization",
            format!("Bearer {}", sub_token.access_token),
        )
        .body(serialized);
    if stream_requested {
        upstream_request = upstream_request.header("accept", "text/event-stream");
    }
    if let Some(request_id) = crate::proxy::translated_request_id(headers) {
        upstream_request = upstream_request.header("x-request-id", request_id);
    }
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
    let response_headers = crate::proxy::relay_response_headers(upstream_resp.headers());
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

    if status.is_success() && stream_requested {
        state.metrics.record_bytes(bytes_sent, 0);
        let response_log = std::sync::Arc::clone(&state.request_log);
        let metrics = std::sync::Arc::clone(&state.metrics);
        let mut usage = reservation.take().into_tracker();
        let response_model = if requested_model.is_empty() {
            model.clone()
        } else {
            requested_model.clone()
        };
        let translator = stream::OpenAiStreamTranslator::new(response_model);
        let responses_translator = stream::ResponsesStreamTranslator::new(requested_model.clone());
        let identity = crate::output_limit::ResponsesStreamRewriter::new(&requested_model, None)
            .with_model_policy(&model_policy)
            .with_selector_kind(selector_kind);
        let completion_audit = crate::audit::ResponseModelAudit::new(
            state,
            &claims,
            surface,
            "/api/services/openai/v1/chat/completions",
        )
        .with_models(Some(&requested_model), Some(&model))
        .with_provider(Some("gemini"))
        .with_provider_account(selected_account.as_deref())
        .with_provider_endpoint(Some(&base))
        .with_selector_kind(selector_kind);
        let translation_state = std::sync::Arc::new(std::sync::Mutex::new((
            translator,
            responses_translator,
            identity,
            false,
        )));
        let chunk_translation_state = std::sync::Arc::clone(&translation_state);
        let chunk_completion_audit = completion_audit.clone();
        let stream = upstream_resp.bytes_stream().map(move |chunk| match chunk {
            Err(error) => Err(std::io::Error::other(error)),
            Ok(bytes) => {
                response_log.record_upstream_body(&correlation_id, &bytes);
                metrics.record_bytes(0, bytes.len() as u64);
                usage.feed(&bytes);
                {
                    let mut state = chunk_translation_state
                        .lock()
                        .expect("stream translation state lock");
                    let (translator, responses_translator, identity, model_audited) = &mut *state;
                    let verified = identity.push(&bytes);
                    let served_model = identity.upstream_model().map(str::to_string);
                    if !*model_audited && let Some(served_model) = served_model.as_deref() {
                        chunk_completion_audit.record_verified(served_model);
                        *model_audited = true;
                    }
                    let output = if shape == ShapeIn::Responses {
                        responses_translator.push(verified.as_bytes())
                    } else {
                        translator.push(verified.as_bytes())
                    };
                    drop(state);
                    output
                }
            }
        });
        let stream = stream.chain(futures_util::stream::once(async move {
            {
                let mut state = translation_state
                    .lock()
                    .expect("stream translation state lock");
                let (translator, responses_translator, identity, model_audited) = &mut *state;
                let verified = identity.finish();
                let served_model = identity.upstream_model().map(str::to_string);
                if !*model_audited && let Some(served_model) = served_model.as_deref() {
                    completion_audit.record_verified(served_model);
                    *model_audited = true;
                }
                let output = if shape == ShapeIn::Responses {
                    responses_translator.push(verified.as_bytes())
                } else {
                    translator.push(verified.as_bytes())
                };
                drop(state);
                output
            }
        }));
        let mut response = Response::new(Body::from_stream(stream));
        *response.status_mut() = status;
        *response.headers_mut() = response_headers;
        response.headers_mut().insert(
            "content-type",
            axum::http::HeaderValue::from_static("text/event-stream"),
        );
        return response;
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
        let body: Vec<u8> = if surface == Surface::Anthropic {
            upstream_body.to_vec()
        } else {
            crate::api_error::openai_error_body(status.as_u16(), &upstream_body)
                .to_string()
                .into_bytes()
        };
        let mut response = Response::new(Body::from(body));
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
    let served_model = match crate::model_contract::validate_translated_response_for_selector(
        &requested_model,
        &gemini_json,
        &model_policy,
        selector_kind,
    ) {
        Ok(served_model) => served_model,
        Err(error) => {
            return error_response(StatusCode::BAD_GATEWAY, &error.code, &error.to_string());
        }
    };
    if let Some(served_model) = served_model.as_deref() {
        crate::audit::ResponseModelAudit::new(
            state,
            &claims,
            surface,
            "/api/services/openai/v1/chat/completions",
        )
        .with_models(Some(&requested_model), Some(&model))
        .with_provider(Some("gemini"))
        .with_provider_account(selected_account.as_deref())
        .with_provider_endpoint(Some(&base))
        .with_selector_kind(selector_kind)
        .record_completed(served_model);
    }
    let concrete_served_model = served_model.as_deref().unwrap_or_default();
    let chat = gemini_response_to_chat(&gemini_json, concrete_served_model);
    let output = if shape == ShapeIn::Responses {
        let finish = gemini_finish_reason(&gemini_json)
            .map_or(responses::Finish::Completed, responses::Finish::from_gemini);
        responses::from_chat(&chat, concrete_served_model, finish)
    } else {
        chat
    };

    let mut response = Response::new(Body::from(output.to_string()));
    *response.status_mut() = StatusCode::OK;
    response.headers_mut().insert(
        "content-type",
        axum::http::HeaderValue::from_static("application/json"),
    );
    response
}

/// Project an `OpenAI` Responses request onto the Chat Completions shape.
fn bridge_request_error(surface: Surface, reason: &str) -> Response {
    crate::api_error::error_response_for_surface(
        surface,
        StatusCode::BAD_REQUEST,
        "invalid_request_error",
        reason,
    )
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
        let chat = crate::gemini_bridge::responses_to_chat_checked(&body).unwrap();
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
}

#[cfg(test)]
#[path = "gemini_translation_tests.rs"]
mod translation_tests;
