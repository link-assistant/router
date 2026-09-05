//! OpenAI-compatible provider API and forwarding helpers.

#![allow(clippy::unused_async)]

use axum::body::Body;
use axum::extract::{Path, State};
use axum::http::{HeaderMap, HeaderValue, StatusCode};
use axum::response::{IntoResponse, Response};
use futures_util::StreamExt;
use sha2::{Digest as _, Sha256};
use std::collections::HashSet;
use std::time::{Duration, Instant};

use crate::metrics::Surface;
use crate::providers::{
    CachedProviderCatalog, LiveProviderModel, ProviderError, ProviderKind, ProviderUpsert,
    ResolvedProvider,
};
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
    match crate::provider_acceptance::provision(&state.client, &state.provider_store, input).await {
        Ok(result) => (StatusCode::OK, axum::Json(result.response())).into_response(),
        Err(error) => {
            use crate::provider_acceptance::ProviderProvisionFailureKind as Kind;
            let status = match error.kind() {
                Kind::InvalidCandidate | Kind::CredentialRejected => StatusCode::BAD_REQUEST,
                Kind::RateLimited => StatusCode::TOO_MANY_REQUESTS,
                Kind::Unverified | Kind::PersistenceUncertain => StatusCode::SERVICE_UNAVAILABLE,
            };
            (
                status,
                axum::Json(serde_json::json!({
                    "type": "error",
                    "error": {
                        "type": "provider_acceptance_error",
                        "outcome": error.kind(),
                        "message": error.to_string(),
                    }
                })),
            )
                .into_response()
        }
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
    body: serde_json::Value,
    path: &str,
    surface: Surface,
) -> Response {
    let routing_body = body.clone();
    forward_provider_at_routed(
        state,
        headers,
        body,
        &routing_body,
        ProviderForwardOptions {
            path,
            upstream_path: path,
            surface,
            copy_anthropic_headers: false,
            protocol: protocol_for_request(surface, path),
            native_protocol: false,
        },
    )
    .await
}

pub(crate) async fn forward_openai_compatible_routed(
    state: &AppState,
    headers: &HeaderMap,
    body: serde_json::Value,
    routing_body: &serde_json::Value,
    path: &str,
    surface: Surface,
) -> Response {
    forward_provider_at_routed(
        state,
        headers,
        body,
        routing_body,
        ProviderForwardOptions {
            path,
            upstream_path: path,
            surface,
            copy_anthropic_headers: false,
            protocol: protocol_for_request(surface, path),
            native_protocol: false,
        },
    )
    .await
}

pub(crate) struct ProviderForwardOptions<'a> {
    pub path: &'a str,
    pub upstream_path: &'a str,
    pub surface: Surface,
    pub copy_anthropic_headers: bool,
    pub protocol: crate::client_policy::ClientProtocol,
    pub native_protocol: bool,
}

fn protocol_for_request(surface: Surface, path: &str) -> crate::client_policy::ClientProtocol {
    if path.contains("/api/services/gemini/") {
        return crate::client_policy::ClientProtocol::GeminiNative;
    }
    match surface {
        Surface::Anthropic => crate::client_policy::ClientProtocol::AnthropicMessages,
        Surface::OpenAIChat => crate::client_policy::ClientProtocol::OpenAIChat,
        Surface::OpenAIResponses => crate::client_policy::ClientProtocol::OpenAIResponses,
    }
}

pub(crate) async fn forward_provider_at_routed(
    state: &AppState,
    headers: &HeaderMap,
    mut body: serde_json::Value,
    routing_body: &serde_json::Value,
    options: ProviderForwardOptions<'_>,
) -> Response {
    let ProviderForwardOptions {
        path,
        upstream_path,
        surface,
        copy_anthropic_headers,
        protocol,
        native_protocol,
    } = options;
    if let Some(resp) = maybe_mpp_challenge(state, headers, path) {
        return resp;
    }

    let claims = match crate::proxy::authenticate_client(state, headers) {
        Ok(claims) => claims,
        Err(response) => return *response,
    };
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
    let native_protocol = native_protocol
        || (provider.kind == ProviderKind::Lefine
            && protocol == crate::client_policy::ClientProtocol::OpenAIChat);
    let client = match crate::client_policy::bound_client(&claims) {
        Ok((client, _)) => client,
        Err(error) => {
            return error_response(StatusCode::FORBIDDEN, "permission_error", &error);
        }
    };
    if !provider.supports_client(client)
        || !crate::client_policy::request_evidence(client, protocol, path, headers)
    {
        return error_response(
            StatusCode::FORBIDDEN,
            "permission_error",
            "the selected provider has no tested compatible adapter for this signed client request",
        );
    }
    if matches!(
        provider.kind,
        ProviderKind::OpenAICompatible | ProviderKind::Lefine
    ) {
        if !matches!(body.get("model").and_then(serde_json::Value::as_str), Some(s) if !s.is_empty())
            && let Some(model) = provider.default_model.as_deref()
        {
            body["model"] = serde_json::Value::String(model.to_string());
        }
        let model = body
            .get("model")
            .and_then(serde_json::Value::as_str)
            .unwrap_or_default();
        let live = match live_openai_compatible_catalog(state, &provider).await {
            Ok(live) => live,
            Err(error) => {
                return error_response(StatusCode::SERVICE_UNAVAILABLE, "api_error", &error);
            }
        };
        if model.is_empty() || !live.iter().any(|candidate| candidate.id == model) {
            return error_response(
                StatusCode::NOT_FOUND,
                "not_found_error",
                &format!("model '{model}' is not available from the selected provider"),
            );
        }
    }
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
    if !matches!(body.get("model").and_then(serde_json::Value::as_str), Some(s) if !s.is_empty())
        && let Some(model) = provider.default_model.as_deref()
    {
        body["model"] = serde_json::Value::String(model.to_string());
    }
    let requested_model = routing_body
        .get("model")
        .and_then(serde_json::Value::as_str)
        .unwrap_or_default()
        .to_string();
    let resolved_model = body
        .get("model")
        .and_then(serde_json::Value::as_str)
        .unwrap_or_default()
        .to_string();
    crate::audit::record_authorised_request_with_resolved_model(
        state,
        &claims,
        surface,
        path,
        Some(routing_body),
        (!resolved_model.is_empty()).then_some(resolved_model.as_str()),
    );
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

    let upstream_url = join_openai_compatible_url(&provider.base_url, upstream_path);
    let mut upstream_req = state.client.post(upstream_url);
    if native_protocol {
        let Some(api_key) = provider.api_key.as_deref() else {
            return error_response(
                StatusCode::SERVICE_UNAVAILABLE,
                "authentication_error",
                "the selected provider credential is unavailable",
            );
        };
        upstream_req = upstream_req.headers(crate::proxy::native_request_headers(headers, api_key));
    } else {
        upstream_req = upstream_req.header("content-type", "application/json");
        if let Some(request_id) = crate::proxy::translated_request_id(headers) {
            upstream_req = upstream_req.header("x-request-id", request_id);
        }
        if let Some(api_key) = provider.api_key.as_deref() {
            upstream_req = upstream_req.header("authorization", format!("Bearer {api_key}"));
        }
    }
    upstream_req = upstream_req.body(serialized);
    if copy_anthropic_headers && !native_protocol {
        for name in ["anthropic-version", "anthropic-beta"] {
            if let Some(value) = headers.get(name) {
                upstream_req = upstream_req.header(name, value);
            }
        }
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
    let response_headers = crate::proxy::relay_response_headers(upstream_resp.headers());

    if stream_requested || is_event_stream(&content_type) {
        let response_log = std::sync::Arc::clone(&state.request_log);
        let mut usage = status
            .is_success()
            .then(|| reservation.take().into_tracker());
        // Settle the stream the way the Anthropic relay does. Without this the
        // turn reached the log with no terminal record at all, so how it ended
        // could only be guessed at — and every such exchange was reported as
        // ending in an unknown state (issue #258).
        let stream = settled_relay_stream(
            upstream_resp,
            response_log,
            correlation_id,
            state.logger.clone(),
            usage.take(),
            (!native_protocol).then_some(requested_model.as_str()),
        );
        let mut response = Response::new(Body::from_stream(stream));
        *response.status_mut() = status;
        *response.headers_mut() = response_headers;
        response.headers_mut().insert("content-type", content_type);
        if !native_protocol
            && !resolved_model.is_empty()
            && resolved_model != requested_model
            && let Ok(value) = HeaderValue::from_str(&resolved_model)
        {
            response
                .headers_mut()
                .insert(crate::output_limit::UPSTREAM_MODEL_HEADER, value);
        }
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

    let mut response_body = upstream_body;
    let mut served_model = None;
    if !native_protocol
        && status.is_success()
        && let Ok(mut payload) = serde_json::from_slice::<serde_json::Value>(&response_body)
    {
        served_model = crate::output_limit::preserve_model_identity(&mut payload, &requested_model);
        response_body =
            bytes::Bytes::from(serde_json::to_vec(&payload).expect("JSON values always serialize"));
    }

    let mut response = Response::new(Body::from(response_body));
    *response.status_mut() = status;
    *response.headers_mut() = response_headers;
    response.headers_mut().insert("content-type", content_type);
    if let Some(served) = served_model.as_deref()
        && let Ok(value) = HeaderValue::from_str(served)
    {
        response
            .headers_mut()
            .insert(crate::output_limit::UPSTREAM_MODEL_HEADER, value);
    }
    response
}

const PROVIDER_CATALOG_TTL: Duration = Duration::from_secs(5 * 60);
const PROVIDER_FAILED_REFRESH_RETRY: Duration = Duration::from_secs(15);

fn openai_provider_catalog_fingerprint(provider: &ResolvedProvider) -> String {
    let mut digest = Sha256::new();
    for value in [
        provider.name.as_str(),
        provider.base_url.as_str(),
        provider.api_key.as_deref().unwrap_or_default(),
    ] {
        digest.update(value.as_bytes());
        digest.update([0]);
    }
    for model in &provider.models {
        digest.update(model.as_bytes());
        digest.update([0]);
    }
    hex::encode(digest.finalize())
}

fn cache_openai_provider_failure(
    state: &AppState,
    provider: &ResolvedProvider,
    fingerprint: String,
    detail: &str,
) -> Result<Vec<LiveProviderModel>, String> {
    tracing::warn!(provider = %provider.name, "provider catalog refresh failed: {detail}");
    let previous = state
        .provider_store
        .cached_provider_catalog(&provider.name)
        .ok()
        .flatten()
        .filter(|entry| entry.fingerprint == fingerprint);
    let _ = state.provider_store.cache_provider_catalog(
        &provider.name,
        CachedProviderCatalog {
            fingerprint,
            models: previous
                .as_ref()
                .map_or_else(Vec::new, |entry| entry.models.clone()),
            last_success: previous.and_then(|entry| entry.last_success),
            last_attempt: Instant::now(),
            error: Some("provider catalog refresh failed".into()),
        },
    );
    Err("provider live model catalog is unavailable".into())
}

/// Fetch one API provider's authenticated non-inference `/models` catalog.
/// Generic configured IDs restrict live results; Lefine uses them only as an
/// outage fallback after provisioning has already established the key.
pub(crate) async fn live_openai_compatible_catalog(
    state: &AppState,
    provider: &ResolvedProvider,
) -> Result<Vec<LiveProviderModel>, String> {
    if !matches!(
        provider.kind,
        ProviderKind::OpenAICompatible | ProviderKind::Lefine
    ) {
        return Err("provider does not use the OpenAI-compatible catalog contract".into());
    }
    let fingerprint = openai_provider_catalog_fingerprint(provider);
    if let Some(cached) = state
        .provider_store
        .cached_provider_catalog(&provider.name)
        .map_err(|error| error.to_string())?
        .filter(|entry| entry.fingerprint == fingerprint)
    {
        if cached.error.is_none()
            && cached
                .last_success
                .is_some_and(|at| at.elapsed() < PROVIDER_CATALOG_TTL)
        {
            return Ok(cached.models);
        }
        if cached.error.is_some() && cached.last_attempt.elapsed() < PROVIDER_FAILED_REFRESH_RETRY {
            return Err("provider live model catalog is unavailable".into());
        }
    }

    if provider.kind == ProviderKind::Lefine {
        let models = match crate::lefine::fetch_catalog(&state.client, provider).await {
            Ok(models) => models,
            Err(error) if error.kind() != crate::lefine::CatalogFailureKind::CredentialRejected => {
                tracing::warn!(provider = %provider.name, "live Lefine catalog unavailable; using configured exact ids");
                match crate::lefine::configured_catalog(provider) {
                    Ok(models) => models,
                    Err(_) => {
                        return cache_openai_provider_failure(
                            state,
                            provider,
                            fingerprint,
                            &error.to_string(),
                        );
                    }
                }
            }
            Err(error) => {
                return cache_openai_provider_failure(
                    state,
                    provider,
                    fingerprint,
                    &error.to_string(),
                );
            }
        };
        let now = Instant::now();
        state
            .provider_store
            .cache_provider_catalog(
                &provider.name,
                CachedProviderCatalog {
                    fingerprint,
                    models: models.clone(),
                    last_success: Some(now),
                    last_attempt: now,
                    error: None,
                },
            )
            .map_err(|error| error.to_string())?;
        return Ok(models);
    }

    let url = join_openai_compatible_url(&provider.base_url, "/v1/models");
    let mut request = state.client.get(url);
    if let Some(key) = provider.api_key.as_deref().filter(|key| !key.is_empty()) {
        request = request.bearer_auth(key);
    }
    let response = match request.send().await {
        Ok(response) => response,
        Err(error) => {
            return cache_openai_provider_failure(state, provider, fingerprint, &error.to_string());
        }
    };
    if !response.status().is_success() {
        return cache_openai_provider_failure(
            state,
            provider,
            fingerprint,
            &format!("non-inference endpoint returned {}", response.status()),
        );
    }
    let payload = match response.json::<serde_json::Value>().await {
        Ok(payload) => payload,
        Err(error) => {
            return cache_openai_provider_failure(state, provider, fingerprint, &error.to_string());
        }
    };
    let Some(entries) = payload.get("data").and_then(serde_json::Value::as_array) else {
        return cache_openai_provider_failure(
            state,
            provider,
            fingerprint,
            "response has no data array",
        );
    };
    let restrictions = &provider.models;
    let mut seen = HashSet::new();
    let mut models = Vec::new();
    for entry in entries {
        let Some(raw) = entry.as_object().cloned() else {
            return cache_openai_provider_failure(
                state,
                provider,
                fingerprint,
                "model record is not an object",
            );
        };
        let Some(id) = raw
            .get("id")
            .and_then(serde_json::Value::as_str)
            .map(str::trim)
            .filter(|id| !id.is_empty())
        else {
            return cache_openai_provider_failure(
                state,
                provider,
                fingerprint,
                "model record has no exact id",
            );
        };
        if !seen.insert(id.to_string()) {
            return cache_openai_provider_failure(
                state,
                provider,
                fingerprint,
                &format!("duplicate exact model id '{id}'"),
            );
        }
        if restrictions.is_empty() || restrictions.iter().any(|allowed| allowed == id) {
            models.push(LiveProviderModel {
                id: id.to_string(),
                raw,
            });
        }
    }
    let now = Instant::now();
    state
        .provider_store
        .cache_provider_catalog(
            &provider.name,
            CachedProviderCatalog {
                fingerprint,
                models: models.clone(),
                last_success: Some(now),
                last_attempt: now,
                error: None,
            },
        )
        .map_err(|error| error.to_string())?;
    Ok(models)
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
    if state.upstream_provider == crate::config::UpstreamProvider::ZaiCodingPlan {
        return crate::zai_coding_plan::resolve(state)
            .map_err(ProviderError::Invalid)?
            .ok_or_else(|| ProviderError::Invalid("z.ai Coding Plan is not enabled".into()));
    }
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

/// Relay an upstream stream, recording each frame and settling it at the end.
///
/// Split out so the settlement can be exercised directly: this is the code path
/// whose absence left every `OpenAI` and Gemini stream without a terminal record
/// (issue #258), and a defect here is invisible until a log is read days later.
fn settled_relay_stream(
    upstream: reqwest::Response,
    response_log: std::sync::Arc<crate::request_log::RequestLog>,
    correlation_id: String,
    logger: log_lazy::LogLazy,
    mut usage: Option<crate::usage::UsageTracker>,
    requested_model: Option<&str>,
) -> impl futures_util::Stream<Item = Result<bytes::Bytes, std::io::Error>> + use<> {
    let started = std::time::Instant::now();
    let outcome = std::sync::Arc::new(std::sync::Mutex::new(new_stream_outcome(
        upstream.headers(),
    )));
    let end_outcome = std::sync::Arc::clone(&outcome);
    let end_log = std::sync::Arc::clone(&response_log);
    let end_id = correlation_id.clone();
    let mut identity = crate::output_limit::ResponsesStreamRewriter::new(
        requested_model.unwrap_or_default(),
        None,
    );
    upstream
        .bytes_stream()
        .map(move |chunk| {
            let mut settled = outcome.lock().expect("stream outcome lock");
            match &chunk {
                Ok(bytes) => {
                    response_log.record_upstream_body(&correlation_id, bytes);
                    account_for_frame(&mut settled, bytes);
                    if let Some(tracker) = &mut usage {
                        tracker.feed(bytes);
                    }
                }
                Err(error) => settled.detail = Some(error.to_string()),
            }
            drop(settled);
            chunk
                .map(|bytes| {
                    if identity.active() {
                        bytes::Bytes::from(identity.push(&bytes))
                    } else {
                        bytes
                    }
                })
                .map_err(std::io::Error::other)
        })
        .chain(futures_util::stream::once(async move {
            crate::request_log::settle_stream(
                &end_log,
                &end_id,
                &end_outcome,
                started.elapsed().as_millis(),
                &logger,
            );
            Err(std::io::Error::other(
                crate::request_log::STREAM_END_MARKER,
            ))
        }))
        .take_while(|item| {
            futures_util::future::ready(
                !matches!(item, Err(error) if error.to_string() == crate::request_log::STREAM_END_MARKER),
            )
        })
}

/// Fold one relayed frame into the outcome being accumulated.
///
/// Counting the frame is bookkeeping; noticing the dialect's terminator is the
/// part that matters, since it is what lets the terminal record say the turn
/// completed rather than leaving its ending unknown (issue #258).
fn account_for_frame(outcome: &mut crate::request_log::StreamOutcome, bytes: &[u8]) {
    outcome.frames += 1;
    outcome.bytes += bytes.len() as u64;
    if crate::request_log::frame_terminates_stream(bytes) {
        outcome.terminated = true;
    }
}

/// The starting outcome for a stream this relay is about to forward.
///
/// A relay that never settles its streams leaves every one of its exchanges
/// with no terminal record, so the log can only report the ending as unknown
/// (issue #258). `inspectable` comes from the upstream headers, since a
/// compressed body cannot be scanned for a terminator (issue #255).
fn new_stream_outcome(headers: &reqwest::header::HeaderMap) -> crate::request_log::StreamOutcome {
    crate::request_log::StreamOutcome {
        streamed: true,
        terminated: false,
        inspectable: crate::request_log::body_is_inspectable(headers),
        detail: None,
        frames: 0,
        bytes: 0,
        duration_ms: 0,
    }
}

fn is_event_stream(content_type: &HeaderValue) -> bool {
    content_type
        .to_str()
        .is_ok_and(|value| value.to_ascii_lowercase().contains("text/event-stream"))
}

#[cfg(test)]
#[path = "provider_proxy_tests.rs"]
mod tests;
