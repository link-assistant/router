//! The native Gemini namespace (`/api/gemini/v1beta`, `/api/vertex`).
//!
//! These routes list and serve the union of every connected subscription:
//! each model is routed to the vendor that owns it, so Gemini CLI can run on a
//! Codex or Claude subscription with one router JWT.

use axum::body::Body;
use axum::extract::{Path, State};
use axum::http::{HeaderMap, StatusCode};
use axum::response::{IntoResponse, Response};
use serde_json::{Value, json};

use super::{AppState, code_assist_envelope, route_gemini_token};
use crate::metrics::Surface;
use crate::proxy::{error_response, retry_after_duration};

fn native_model_document(
    model: &str,
    provider: crate::subscription::SubscriptionProvider,
) -> Value {
    let model = model.trim_start_matches("models/");
    json!({
        "name": format!("models/{model}"),
        "displayName": model,
        "description": format!(
            "{provider} subscription model routed by Link.Assistant.Router over the native Gemini \
             namespace"
        ),
        "inputTokenLimit": 1_048_576,
        "outputTokenLimit": 65_536,
        "supportedGenerationMethods": ["generateContent", "streamGenerateContent"]
    })
}

/// Subscriptions whose live catalogs the Gemini namespace may advertise.
///
/// In automatic mode every healthy subscription contributes, so one router JWT
/// exposes Codex, Claude, Qwen and Gemini models to Gemini CLI. A pinned
/// `UPSTREAM_PROVIDER` narrows the namespace to that single subscription.
async fn advertised_models(
    state: &AppState,
) -> Vec<(crate::subscription::SubscriptionProvider, String)> {
    let snapshot = crate::model_routing::configured_catalog_snapshot(state).await;
    let healthy = snapshot.healthy_providers();
    let providers = match state.upstream_provider {
        crate::config::UpstreamProvider::Auto => healthy,
        provider => provider
            .subscription_provider()
            .filter(|provider| healthy.contains(provider))
            .into_iter()
            .collect(),
    };
    providers
        .into_iter()
        .flat_map(|provider| {
            snapshot
                .models(provider)
                .into_iter()
                .map(move |model| (provider, model))
        })
        .collect()
}

/// Native Gemini `ListModels` response.
///
/// The listing is the union of the *live* catalogs of every connected
/// subscription; nothing is synthesized for a provider that is disconnected or
/// no longer advertises a model.
pub async fn native_models(State(state): State<AppState>) -> impl IntoResponse {
    let models = advertised_models(&state)
        .await
        .into_iter()
        .map(|(provider, model)| native_model_document(&model, provider))
        .collect::<Vec<_>>();
    (StatusCode::OK, axum::Json(json!({"models": models})))
}

/// Native Gemini `GetModel` response.
pub async fn native_model(
    State(state): State<AppState>,
    Path(model): Path<String>,
) -> impl IntoResponse {
    let model = model.trim_start_matches("models/").to_string();
    let owner = advertised_models(&state)
        .await
        .into_iter()
        .find_map(|(owner, candidate)| (candidate == model).then_some(owner));
    owner.map_or_else(
        || {
            (
                StatusCode::NOT_FOUND,
                axum::Json(crate::gemini_bridge::openai_error_to_gemini(
                    404,
                    &json!({"error": {"message": format!("model '{model}' is not available")}}),
                )),
            )
        },
        |owner| {
            (
                StatusCode::OK,
                axum::Json(native_model_document(&model, owner)),
            )
        },
    )
}

pub(super) fn parse_native_target(path: &str) -> Option<(String, bool)> {
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
    body: Result<axum::Json<Value>, axum::extract::rejection::JsonRejection>,
) -> Response {
    let body = match body {
        Ok(axum::Json(body)) => body,
        Err(error) => {
            return crate::api_error::malformed_json_response_for_dialect(
                crate::api_error::ApiDialect::Gemini,
                &error.to_string(),
            );
        }
    };
    forward_native(&state, &headers, &path, body).await
}

/// Forward a Vertex publisher-model request using the same native Gemini body.
pub async fn forward_native_vertex(
    State(state): State<AppState>,
    Path(path): Path<String>,
    headers: HeaderMap,
    body: Result<axum::Json<Value>, axum::extract::rejection::JsonRejection>,
) -> Response {
    let body = match body {
        Ok(axum::Json(body)) => body,
        Err(error) => {
            return crate::api_error::malformed_json_response_for_dialect(
                crate::api_error::ApiDialect::Gemini,
                &error.to_string(),
            );
        }
    };
    forward_native(&state, &headers, &path, body).await
}

/// Native Gemini error envelope, so Gemini CLI can surface router failures.
fn native_error(status: StatusCode, message: &str) -> Response {
    let body = crate::gemini_bridge::openai_error_to_gemini(
        status.as_u16(),
        &json!({"error": {"message": message}}),
    );
    (status, axum::Json(body)).into_response()
}

/// The subscription that must serve a native Gemini request for `model`.
async fn native_owner(
    state: &AppState,
    model: &str,
) -> Result<crate::model_routing::RoutedState, Response> {
    let routed = if state.upstream_provider == crate::config::UpstreamProvider::Auto {
        crate::model_routing::route_subscription_model(state, model).await
    } else {
        let provider = state
            .upstream_provider
            .subscription_provider()
            .ok_or_else(|| {
                native_error(
                    StatusCode::BAD_REQUEST,
                    &format!(
                        "UPSTREAM_PROVIDER={} does not back a subscription catalog",
                        state.upstream_provider.as_str()
                    ),
                )
            })?;
        crate::model_routing::route_pinned_subscription(state, provider).await
    };
    routed.map_err(|error| {
        let status = match error {
            crate::model_routing::ModelRouteError::NotFound(_) => StatusCode::NOT_FOUND,
            _ => StatusCode::BAD_REQUEST,
        };
        native_error(status, &error.to_string())
    })
}

async fn forward_native(
    state: &AppState,
    headers: &HeaderMap,
    path: &str,
    body: Value,
) -> Response {
    let Some((model, streaming)) = parse_native_target(path) else {
        return native_error(
            StatusCode::NOT_FOUND,
            "expected a model :generateContent or :streamGenerateContent action",
        );
    };
    let routed = match native_owner(state, &model).await {
        Ok(routed) => routed,
        Err(response) => return response,
    };
    let owner = routed
        .state
        .upstream_provider
        .subscription_provider()
        .expect("native routing always selects a subscription provider");
    if owner != crate::subscription::SubscriptionProvider::Gemini {
        // Codex, Claude and Qwen have no `generateContent` surface, so the
        // request crosses through the shared OpenAI Chat Completions path and
        // the response is translated back into Gemini's native shape.
        return forward_native_via_chat(routed, headers, &model, streaming, &body).await;
    }
    let state = &routed.state;
    let routed = match route_gemini_token(
        state,
        headers,
        &body,
        Surface::OpenAIChat,
        path,
        routed.subscription.as_ref(),
    )
    .await
    {
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
    let upstream_request = state
        .client
        .post(upstream_url)
        .header("content-type", "application/json")
        .header(
            "authorization",
            format!("Bearer {}", routed.token.access_token),
        )
        .body(serialized.clone());
    let correlation_id = crate::request_log::correlation_id(headers);
    let upstream = match state
        .request_log
        .send_upstream(&correlation_id, &state.client, upstream_request)
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
        .request_log
        .record_upstream_body(&correlation_id, &response_body);
    state
        .metrics
        .record_bytes(serialized.len() as u64, response_body.len() as u64);
    state
        .metrics
        .record_request(Surface::OpenAIChat, status.as_u16(), Some(&routed.account));
    if status == StatusCode::TOO_MANY_REQUESTS
        && let Some(router) = state.account_router.as_ref()
    {
        router.report_failure_with_retry_after(
            &routed.account,
            "Gemini subscription upstream returned 429",
            retry_after,
        );
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

/// Serve a native Gemini request from a non-Gemini subscription.
///
/// The Gemini body is translated into an `OpenAI` Chat Completions request and
/// handed to the same handler `/v1/chat/completions` uses, so provider
/// selection, budgets, auditing, metrics and capability gating stay in one
/// place. The completion is then translated back into a
/// `GenerateContentResponse`.
async fn forward_native_via_chat(
    routed: crate::model_routing::RoutedState,
    headers: &HeaderMap,
    model: &str,
    streaming: bool,
    body: &Value,
) -> Response {
    let chat_request = crate::gemini_bridge::gemini_request_to_chat(model, body);
    let state = routed.state;
    let response = crate::proxy::openai_chat_completions_routed(
        state.clone(),
        headers.clone(),
        chat_request,
        routed.subscription,
    )
    .await;

    let status = response.status();
    let bytes =
        match axum::body::to_bytes(response.into_body(), state.max_proxy_request_bytes).await {
            Ok(bytes) => bytes,
            Err(error) => {
                return native_error(
                    StatusCode::BAD_GATEWAY,
                    &format!("failed to read the translated upstream response: {error}"),
                );
            }
        };
    let parsed = serde_json::from_slice::<Value>(&bytes).unwrap_or_else(|error| {
        json!({"error": {"message": format!("failed to parse the translated response: {error}")}})
    });
    if !status.is_success() {
        return (
            status,
            axum::Json(crate::gemini_bridge::openai_error_to_gemini(
                status.as_u16(),
                &parsed,
            )),
        )
            .into_response();
    }
    let native = crate::gemini_bridge::chat_to_gemini_response(&parsed, model);
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
