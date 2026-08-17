//! OpenAI-compatible provider API and forwarding helpers.

#![allow(clippy::unused_async)]

use axum::body::Body;
use axum::extract::{Path, State};
use axum::http::{HeaderMap, HeaderValue, StatusCode};
use axum::response::{IntoResponse, Response};
use futures_util::StreamExt;

use crate::metrics::Surface;
use crate::providers::{ProviderError, ProviderUpsert, ResolvedProvider};
use crate::proxy::{AppState, error_response, is_admin_authorised, maybe_mpp_challenge};

/// List configured upstream providers with secrets redacted.
#[allow(clippy::needless_pass_by_value)]
pub async fn list_providers(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> impl IntoResponse {
    if !is_admin_authorised(&state, &headers) {
        return error_response(
            StatusCode::UNAUTHORIZED,
            "authentication_error",
            "admin Bearer key required",
        );
    }
    match state.provider_store.list_redacted() {
        Ok(records) => (
            StatusCode::OK,
            axum::Json(serde_json::json!({"data": records})),
        )
            .into_response(),
        Err(e) => error_response(
            StatusCode::INTERNAL_SERVER_ERROR,
            "api_error",
            &format!("{e}"),
        ),
    }
}

/// Show one configured upstream provider with secrets redacted.
#[allow(clippy::needless_pass_by_value)]
pub async fn show_provider(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(name): Path<String>,
) -> impl IntoResponse {
    if !is_admin_authorised(&state, &headers) {
        return error_response(
            StatusCode::UNAUTHORIZED,
            "authentication_error",
            "admin Bearer key required",
        );
    }
    match state.provider_store.get(&name) {
        Ok(Some(record)) => (StatusCode::OK, axum::Json(record.redacted())).into_response(),
        Ok(None) => error_response(
            StatusCode::NOT_FOUND,
            "not_found_error",
            "provider not found",
        ),
        Err(e) => error_response(
            StatusCode::INTERNAL_SERVER_ERROR,
            "api_error",
            &format!("{e}"),
        ),
    }
}

/// Add or replace an upstream provider, encrypting inline API keys at rest.
#[allow(clippy::needless_pass_by_value)]
pub async fn upsert_provider(
    State(state): State<AppState>,
    headers: HeaderMap,
    axum::Json(input): axum::Json<ProviderUpsert>,
) -> impl IntoResponse {
    if !is_admin_authorised(&state, &headers) {
        return error_response(
            StatusCode::UNAUTHORIZED,
            "authentication_error",
            "admin Bearer key required",
        );
    }
    match state.provider_store.upsert(input) {
        Ok(record) => (StatusCode::OK, axum::Json(record.redacted())).into_response(),
        Err(e) => error_response(
            StatusCode::BAD_REQUEST,
            "invalid_request_error",
            &format!("{e}"),
        ),
    }
}

/// Delete one upstream provider.
#[allow(clippy::needless_pass_by_value)]
pub async fn delete_provider(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(name): Path<String>,
) -> impl IntoResponse {
    if !is_admin_authorised(&state, &headers) {
        return error_response(
            StatusCode::UNAUTHORIZED,
            "authentication_error",
            "admin Bearer key required",
        );
    }
    match state.provider_store.delete(&name) {
        Ok(true) => (
            StatusCode::OK,
            axum::Json(serde_json::json!({"deleted": name})),
        )
            .into_response(),
        Ok(false) => error_response(
            StatusCode::NOT_FOUND,
            "not_found_error",
            "provider not found",
        ),
        Err(e) => error_response(
            StatusCode::INTERNAL_SERVER_ERROR,
            "api_error",
            &format!("{e}"),
        ),
    }
}

/// Forward one OpenAI-compatible request to the selected provider.
pub async fn forward_openai_compatible(
    state: &AppState,
    headers: &HeaderMap,
    mut body: serde_json::Value,
    path: &str,
    surface: Surface,
) -> Response {
    if let Some(resp) = maybe_mpp_challenge(state, headers, path) {
        return resp;
    }

    let claims = match crate::proxy::authenticate_client(state, headers) {
        Ok(claims) => claims,
        Err(response) => return *response,
    };
    // Per-token request budgets apply to every upstream, not just the
    // subscription ones, so a task token cannot escape its cap by being
    // pointed at an OpenAI-compatible gateway.
    let reserved = crate::token_reservation::estimate(&body).total();
    if let Err(e) = state
        .token_manager
        .enforce_request_budget_reserving(&claims.sub, reserved)
    {
        return crate::token_http::budget_error_response(&e);
    }
    let mut reservation = crate::usage::ReservationGuard::new(
        state.token_manager.clone(),
        claims.sub.clone(),
        reserved,
    );
    crate::audit::record_authorised_request(state, &claims, surface, path, Some(&body));

    let provider = match resolve_openai_compatible_provider(state) {
        Ok(provider) => provider,
        Err(e) => {
            return error_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                "api_error",
                &format!("provider lookup failed: {e}"),
            );
        }
    };

    if !matches!(body.get("model").and_then(serde_json::Value::as_str), Some(s) if !s.is_empty())
        && let Some(model) = provider.default_model.as_deref()
    {
        body["model"] = serde_json::Value::String(model.to_string());
    }
    let stream_requested = body
        .get("stream")
        .and_then(serde_json::Value::as_bool)
        .unwrap_or(false);
    let serialized = match serde_json::to_vec(&body) {
        Ok(v) => v,
        Err(e) => {
            return error_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                "api_error",
                &format!("failed to serialize OpenAI-compatible body: {e}"),
            );
        }
    };
    let bytes_sent = serialized.len() as u64;

    let upstream_url = join_openai_compatible_url(&provider.base_url, path);
    let mut upstream_req = state
        .client
        .post(upstream_url)
        .header("content-type", "application/json")
        .body(serialized);
    if let Some(api_key) = provider.api_key.as_deref() {
        upstream_req = upstream_req.header("authorization", format!("Bearer {api_key}"));
    }

    let correlation_id = crate::request_log::correlation_id(headers);
    let upstream_resp = match state
        .request_log
        .send_upstream(&correlation_id, &state.client, upstream_req)
        .await
    {
        Ok(resp) => resp,
        Err(e) => {
            state.metrics.record_request(surface, 502, None);
            return error_response(
                StatusCode::BAD_GATEWAY,
                "api_error",
                &format!("OpenAI-compatible upstream request failed: {e}"),
            );
        }
    };
    let status = StatusCode::from_u16(upstream_resp.status().as_u16())
        .unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
    state.metrics.record_request(surface, status.as_u16(), None);

    let content_type = upstream_resp
        .headers()
        .get("content-type")
        .cloned()
        .unwrap_or_else(|| HeaderValue::from_static("application/json"));

    if stream_requested || is_event_stream(&content_type) {
        let response_log = std::sync::Arc::clone(&state.request_log);
        let mut usage = status
            .is_success()
            .then(|| reservation.take().into_tracker());
        let stream = upstream_resp.bytes_stream().map(move |chunk| {
            if let Ok(bytes) = &chunk {
                response_log.record_upstream_body(&correlation_id, bytes);
                if let Some(tracker) = &mut usage {
                    tracker.feed(bytes);
                }
            }
            chunk.map_err(std::io::Error::other)
        });
        let mut response = Response::new(Body::from_stream(stream));
        *response.status_mut() = status;
        response.headers_mut().insert("content-type", content_type);
        return response;
    }

    let upstream_body = match upstream_resp.bytes().await {
        Ok(bytes) => bytes,
        Err(e) => {
            state.metrics.record_request(surface, 502, None);
            return error_response(
                StatusCode::BAD_GATEWAY,
                "api_error",
                &format!("OpenAI-compatible upstream body read failed: {e}"),
            );
        }
    };
    state
        .request_log
        .record_upstream_body(&correlation_id, &upstream_body);
    state
        .metrics
        .record_bytes(bytes_sent, upstream_body.len() as u64);
    if status.is_success() {
        let mut usage = reservation.take().into_tracker();
        usage.feed(&upstream_body);
    }

    let mut response = Response::new(Body::from(upstream_body));
    *response.status_mut() = status;
    response.headers_mut().insert("content-type", content_type);
    response
}

/// Return OpenAI-shaped model data for the selected OpenAI-compatible provider.
#[must_use]
pub fn openai_compatible_models(state: &AppState) -> serde_json::Value {
    let provider = resolve_openai_compatible_provider(state)
        .ok()
        .unwrap_or_else(|| state.openai_compatible.resolve());
    let now = chrono::Utc::now().timestamp();
    let ResolvedProvider {
        name: owner,
        default_model,
        mut models,
        ..
    } = provider;
    if models.is_empty()
        && let Some(model) = default_model
    {
        models.push(model);
    }
    if models.is_empty() {
        models.push("default".to_string());
    }
    let data: Vec<serde_json::Value> = models
        .into_iter()
        .map(|id| {
            serde_json::json!({
                "id": id,
                "object": "model",
                "created": now,
                "owned_by": owner.clone(),
            })
        })
        .collect();
    serde_json::json!({"object": "list", "data": data})
}

fn resolve_openai_compatible_provider(state: &AppState) -> Result<ResolvedProvider, ProviderError> {
    state
        .provider_store
        .resolve(&state.openai_compatible.provider_name)
        .map(|provider| provider.unwrap_or_else(|| state.openai_compatible.resolve()))
}

fn join_openai_compatible_url(base_url: &str, path: &str) -> String {
    let base = base_url.trim_end_matches('/');
    if base.ends_with("/v1") {
        let suffix = path.strip_prefix("/v1").unwrap_or(path);
        format!("{base}{suffix}")
    } else {
        format!("{base}{path}")
    }
}

fn is_event_stream(content_type: &HeaderValue) -> bool {
    content_type
        .to_str()
        .is_ok_and(|value| value.to_ascii_lowercase().contains("text/event-stream"))
}

#[cfg(test)]
mod tests {
    use super::*;

    /// `/v1` in the configured base URL must not be duplicated by the request
    /// path, and a base without it keeps the path verbatim.
    #[test]
    fn base_urls_are_joined_without_duplicating_the_version_segment() {
        assert_eq!(
            join_openai_compatible_url("https://api.example/v1", "/v1/chat/completions"),
            "https://api.example/v1/chat/completions"
        );
        assert_eq!(
            join_openai_compatible_url("https://api.example/v1/", "/v1/chat/completions"),
            "https://api.example/v1/chat/completions"
        );
        assert_eq!(
            join_openai_compatible_url("https://api.example", "/v1/chat/completions"),
            "https://api.example/v1/chat/completions"
        );
        // A path that does not start with /v1 is appended as-is.
        assert_eq!(
            join_openai_compatible_url("https://api.example/v1", "/responses"),
            "https://api.example/v1/responses"
        );
        assert_eq!(
            join_openai_compatible_url("https://api.example/", "/responses"),
            "https://api.example/responses"
        );
    }

    #[test]
    fn event_stream_content_types_are_detected_case_insensitively() {
        for value in [
            "text/event-stream",
            "text/event-stream; charset=utf-8",
            "TEXT/EVENT-STREAM",
        ] {
            assert!(
                is_event_stream(&HeaderValue::from_str(value).expect("header")),
                "{value} should be recognised as a stream"
            );
        }
        for value in ["application/json", "text/plain"] {
            assert!(
                !is_event_stream(&HeaderValue::from_str(value).expect("header")),
                "{value} should not be recognised as a stream"
            );
        }
    }
}
