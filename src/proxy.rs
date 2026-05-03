//! Transparent API proxy for forwarding requests to upstream APIs.
//!
//! Supports three API formats required by the Claude Code LLM Gateway spec:
//! - Anthropic Messages (`/v1/messages`, `/v1/messages/count_tokens`)
//! - Bedrock `InvokeModel` (`/invoke`, `/invoke-with-response-stream`)
//! - Vertex AI rawPredict (`:rawPredict`, `:streamRawPredict`)
//!
//! Handles token swap (custom -> OAuth), header forwarding, and
//! pass-through of streaming (SSE) responses.

// Several handlers are `async fn` purely to match axum's handler signature
// even when their body is currently synchronous; they may grow await points
// later, and removing `async` would force a uniform sync signature here.
#![allow(clippy::unused_async)]

use axum::body::Body;
use axum::extract::{Request, State};
use axum::http::{HeaderMap, HeaderValue, StatusCode};
use axum::response::{IntoResponse, Response};
use futures_util::StreamExt;
use log_lazy::LogLazy;
use reqwest::Client;
use std::sync::Arc;

use crate::accounts::AccountRouter;
use crate::oauth::OAuthProvider;
use crate::openai;
use crate::token::TokenManager;

/// Shared application state accessible by all route handlers.
#[derive(Clone)]
pub struct AppState {
    /// HTTP client for upstream requests.
    pub client: Client,
    /// Token manager for validating custom tokens.
    pub token_manager: TokenManager,
    /// OAuth provider for obtaining upstream credentials (legacy single-account).
    pub oauth_provider: OAuthProvider,
    /// Multi-account router (when configured). When `None`, the legacy
    /// `oauth_provider` is used directly.
    pub account_router: Option<AccountRouter>,
    /// Base URL for the upstream Anthropic API.
    pub upstream_base_url: String,
    /// Lazy logger for verbose output.
    pub logger: LogLazy,
    /// Optional admin key (Bearer) required for `/api/tokens` issuance.
    pub admin_key: Option<String>,
    /// Live metrics counter handle.
    pub metrics: Arc<crate::metrics::Metrics>,
}

/// The legacy API path prefix used to route requests through the proxy.
pub const API_PREFIX: &str = "/api/latest/anthropic/";

/// Headers that Claude Code LLM Gateway spec requires to be forwarded.
pub const REQUIRED_FORWARD_HEADERS: &[&str] = &[
    "anthropic-beta",
    "anthropic-version",
    "x-claude-code-session-id",
];

/// Hop-by-hop headers that must not be forwarded.
const HOP_BY_HOP_HEADERS: &[&str] = &["host", "connection", "transfer-encoding", "keep-alive"];

/// Health check endpoint.
#[allow(clippy::unused_async)]
pub async fn health() -> impl IntoResponse {
    (StatusCode::OK, "ok")
}

/// Token issuance endpoint.
///
/// Issues a new custom token.
/// Expects a JSON body: `{"ttl_hours": 24, "label": "my-token"}`
///
/// When `admin_key` is configured the caller MUST present it as a Bearer
/// token in `Authorization`; otherwise the endpoint is open (matching the
/// original behaviour, kept for backwards compatibility).
pub async fn issue_token(
    State(state): State<AppState>,
    headers: HeaderMap,
    axum::Json(req): axum::Json<IssueTokenRequest>,
) -> impl IntoResponse {
    if let Some(ref required) = state.admin_key {
        let provided = headers
            .get("authorization")
            .and_then(|v| v.to_str().ok())
            .and_then(|v| v.strip_prefix("Bearer "));
        if provided != Some(required.as_str()) {
            return error_response(
                StatusCode::UNAUTHORIZED,
                "authentication_error",
                "missing or invalid admin Bearer key",
            );
        }
    }

    let ttl = req.ttl_hours.unwrap_or(24);
    let label = req.label.unwrap_or_default();

    match state
        .token_manager
        .issue_token_for(ttl, &label, req.account.as_deref())
    {
        Ok(token) => {
            state.metrics.record_token_issued();
            (
                StatusCode::OK,
                axum::Json(serde_json::json!({
                    "token": token,
                    "ttl_hours": ttl,
                    "label": label,
                    "account": req.account,
                })),
            )
                .into_response()
        }
        Err(e) => error_response(
            StatusCode::INTERNAL_SERVER_ERROR,
            "api_error",
            &format!("Failed to issue token: {e}"),
        ),
    }
}

/// List all known tokens (admin endpoint).
pub async fn list_tokens(State(state): State<AppState>, headers: HeaderMap) -> impl IntoResponse {
    if !is_admin_authorised(&state, &headers) {
        return error_response(
            StatusCode::UNAUTHORIZED,
            "authentication_error",
            "admin Bearer key required",
        );
    }
    match state.token_manager.list_tokens() {
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

/// Revoke a token by id (admin endpoint).
pub async fn revoke_token(
    State(state): State<AppState>,
    headers: HeaderMap,
    axum::Json(req): axum::Json<RevokeTokenRequest>,
) -> impl IntoResponse {
    if !is_admin_authorised(&state, &headers) {
        return error_response(
            StatusCode::UNAUTHORIZED,
            "authentication_error",
            "admin Bearer key required",
        );
    }
    match state.token_manager.revoke_token(&req.id) {
        Ok(()) => {
            state.metrics.record_token_revoked();
            (
                StatusCode::OK,
                axum::Json(serde_json::json!({"revoked": req.id})),
            )
                .into_response()
        }
        Err(e) => error_response(
            StatusCode::INTERNAL_SERVER_ERROR,
            "api_error",
            &format!("{e}"),
        ),
    }
}

fn is_admin_authorised(state: &AppState, headers: &HeaderMap) -> bool {
    let Some(required) = state.admin_key.as_deref() else {
        return true;
    };
    let provided = headers
        .get("authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "));
    provided == Some(required)
}

/// Request body for the token issuance endpoint.
#[derive(serde::Deserialize)]
pub struct IssueTokenRequest {
    /// Time-to-live in hours (default: 24).
    pub ttl_hours: Option<i64>,
    /// Optional label for the token.
    pub label: Option<String>,
    /// Optional account binding (multi-account mode).
    pub account: Option<String>,
}

/// Request body for the token revocation endpoint.
#[derive(serde::Deserialize)]
pub struct RevokeTokenRequest {
    pub id: String,
}

/// Proxy handler for upstream API forwarding.
///
/// Catches all requests, validates the custom token, swaps it for OAuth
/// credentials, and forwards the request upstream -- preserving SSE streaming.
///
/// Supports all three Claude Code LLM Gateway API formats:
/// - Anthropic Messages: `/v1/messages`, `/v1/messages/count_tokens`
/// - Bedrock `InvokeModel`: `/invoke`, `/invoke-with-response-stream`
/// - Vertex rawPredict: paths ending in `:rawPredict`, `:streamRawPredict`
/// - Legacy: `/api/latest/anthropic/*`
pub async fn proxy_handler(State(state): State<AppState>, req: Request) -> impl IntoResponse {
    let path = req.uri().path().to_string();
    let method = req.method().clone();

    state.logger.verbose(|| format!("Incoming {method} {path}"));

    // Resolve the upstream path based on which API format the request matches
    let upstream_path = resolve_upstream_path(&path);

    state
        .logger
        .debug(|| format!("Resolved upstream path: {upstream_path}"));

    // Build upstream URL
    let upstream_url = format!(
        "{}{}",
        state.upstream_base_url.trim_end_matches('/'),
        upstream_path
    );

    let upstream_url = if let Some(query) = req.uri().query() {
        format!("{upstream_url}?{query}")
    } else {
        upstream_url
    };

    // Log session tracking header if present
    if let Some(session_id) = req.headers().get("x-claude-code-session-id") {
        state
            .logger
            .verbose(|| format!("Session: {}", session_id.to_str().unwrap_or("<invalid>")));
    }

    // Extract and validate the bearer token from the Authorization header
    let auth_header = req
        .headers()
        .get("authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "));

    let Some(token) = auth_header else {
        state.logger.debug(|| "Missing Authorization header");
        return error_response(
            StatusCode::UNAUTHORIZED,
            "authentication_error",
            "Missing Authorization header with Bearer token",
        );
    };
    let custom_token = token.to_string();

    // Validate custom token
    if let Err(e) = state.token_manager.validate_token(&custom_token) {
        let status = match &e {
            crate::token::TokenError::Revoked => StatusCode::FORBIDDEN,
            _ => StatusCode::UNAUTHORIZED,
        };
        state
            .logger
            .debug(|| format!("Token validation failed: {e}"));
        return error_response(status, "authentication_error", &format!("{e}"));
    }

    // Get the real OAuth token (multi-account aware).
    let (oauth_token, selected_account) = match resolve_upstream_credentials(&state) {
        Ok(pair) => pair,
        Err(e) => {
            tracing::error!("Failed to resolve upstream credentials: {e}");
            return error_response(
                StatusCode::BAD_GATEWAY,
                "api_error",
                "Upstream authentication unavailable",
            );
        }
    };

    // Build upstream headers
    let upstream_headers = build_upstream_headers(req.headers(), &oauth_token, &state.logger);

    // Read the request body
    let body_bytes = match axum::body::to_bytes(req.into_body(), 10 * 1024 * 1024).await {
        Ok(bytes) => bytes,
        Err(e) => {
            return error_response(
                StatusCode::BAD_REQUEST,
                "invalid_request_error",
                &format!("Failed to read request body: {e}"),
            );
        }
    };

    state.logger.verbose(|| {
        format!(
            "Forwarding {method} {upstream_url} ({} bytes)",
            body_bytes.len()
        )
    });

    // Forward request to upstream
    let upstream_req = state
        .client
        .request(method, &upstream_url)
        .headers(upstream_headers)
        .body(body_bytes);

    let upstream_resp = match upstream_req.send().await {
        Ok(resp) => resp,
        Err(e) => {
            tracing::error!("Upstream request failed: {e}");
            return error_response(
                StatusCode::BAD_GATEWAY,
                "api_error",
                &format!("Upstream request failed: {e}"),
            );
        }
    };

    let status = StatusCode::from_u16(upstream_resp.status().as_u16())
        .unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);

    state
        .logger
        .verbose(|| format!("Upstream responded: {status}"));

    // Record metrics; flag account as cooling-down on 429/insufficient_quota.
    state.metrics.record_request(
        crate::metrics::Surface::Anthropic,
        status.as_u16(),
        selected_account.as_deref(),
    );
    if status.as_u16() == 429 {
        if let (Some(router), Some(name)) =
            (state.account_router.as_ref(), selected_account.as_deref())
        {
            router.report_failure(name, "upstream returned 429");
        }
    }

    // Build the response -- stream it back to preserve SSE
    let mut response_headers = HeaderMap::new();
    for (name, value) in upstream_resp.headers() {
        let name_lower = name.as_str().to_lowercase();
        if HOP_BY_HOP_HEADERS.contains(&name_lower.as_str()) {
            continue;
        }
        response_headers.insert(name.clone(), value.clone());
    }

    // Stream the response body
    let stream = upstream_resp
        .bytes_stream()
        .map(|chunk| chunk.map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e)));

    let body = Body::from_stream(stream);

    let mut response = Response::new(body);
    *response.status_mut() = status;
    *response.headers_mut() = response_headers;

    response
}

/// Resolve the upstream path from the incoming request path.
///
/// Maps all supported API format paths to the correct upstream path:
/// - `/v1/messages` -> `/v1/messages` (Anthropic Messages)
/// - `/v1/messages/count_tokens` -> `/v1/messages/count_tokens` (Anthropic Messages)
/// - `/invoke` -> `/invoke` (Bedrock)
/// - `/invoke-with-response-stream` -> `/invoke-with-response-stream` (Bedrock)
/// - Paths ending in `:rawPredict` or `:streamRawPredict` -> pass through (Vertex)
/// - `/api/latest/anthropic/*` -> `/*` (legacy)
#[must_use]
pub fn resolve_upstream_path(path: &str) -> String {
    // Legacy prefix: strip and forward
    if let Some(rest) = path.strip_prefix("/api/latest/anthropic") {
        return rest.to_string();
    }

    // All other paths (Anthropic /v1/*, Bedrock /invoke*, Vertex *:rawPredict)
    // are forwarded as-is to the upstream
    path.to_string()
}

/// Build the upstream request headers.
///
/// Copies all headers except hop-by-hop and authorization, then sets the
/// real OAuth authorization. Ensures required LLM Gateway headers
/// (`anthropic-beta`, `anthropic-version`, `x-claude-code-session-id`)
/// are always forwarded.
fn build_upstream_headers(incoming: &HeaderMap, oauth_token: &str, logger: &LogLazy) -> HeaderMap {
    let mut headers = HeaderMap::new();

    for (name, value) in incoming {
        let name_lower = name.as_str().to_lowercase();
        if name_lower == "authorization" || HOP_BY_HOP_HEADERS.contains(&name_lower.as_str()) {
            continue;
        }
        headers.insert(name.clone(), value.clone());
    }

    // Set the real OAuth authorization
    if let Ok(auth_val) = HeaderValue::from_str(&format!("Bearer {oauth_token}")) {
        headers.insert("authorization", auth_val);
    }

    // Log required headers for observability
    for &header_name in REQUIRED_FORWARD_HEADERS {
        if let Some(val) = headers.get(header_name) {
            logger.trace(|| {
                format!(
                    "Forwarding {header_name}: {}",
                    val.to_str().unwrap_or("<non-utf8>")
                )
            });
        }
    }

    headers
}

/// Resolve the OAuth token and the name of the account that produced it.
///
/// When `state.account_router` is set we delegate to the multi-account
/// router; otherwise we fall back to the single-account legacy provider.
fn resolve_upstream_credentials(
    state: &AppState,
) -> Result<(String, Option<String>), Box<dyn std::error::Error + Send + Sync>> {
    if let Some(router) = state.account_router.as_ref() {
        let sel = router.select()?;
        return Ok((sel.token, Some(sel.name)));
    }
    let token = state.oauth_provider.get_token()?;
    Ok((token, None))
}

/// `GET /v1/models` — OpenAI-compatible model listing.
#[allow(clippy::unused_async)]
pub async fn openai_models() -> impl IntoResponse {
    (StatusCode::OK, axum::Json(openai::list_models())).into_response()
}

/// `POST /v1/chat/completions` — `OpenAI` Chat Completions.
///
/// Translates to Anthropic Messages, forwards via the same OAuth-substituting
/// pipeline used by [`proxy_handler`], and converts the response back.
pub async fn openai_chat_completions(
    State(state): State<AppState>,
    headers: HeaderMap,
    axum::Json(req): axum::Json<openai::OpenAIChatCompletionRequest>,
) -> Response {
    let requested_model = req.model.clone();
    let stream_requested = req.stream.unwrap_or(false);
    let body = openai::chat_completion_to_anthropic(&req);
    forward_openai(
        &state,
        &headers,
        body,
        crate::metrics::Surface::OpenAIChat,
        &requested_model,
        stream_requested,
        OpenAIShape::Chat,
    )
    .await
}

/// `POST /v1/responses` — `OpenAI` Responses API.
pub async fn openai_responses(
    State(state): State<AppState>,
    headers: HeaderMap,
    axum::Json(req): axum::Json<openai::OpenAIResponseRequest>,
) -> Response {
    let requested_model = req.model.clone();
    let stream_requested = req.stream.unwrap_or(false);
    let body = openai::response_to_anthropic(&req);
    forward_openai(
        &state,
        &headers,
        body,
        crate::metrics::Surface::OpenAIResponses,
        &requested_model,
        stream_requested,
        OpenAIShape::Response,
    )
    .await
}

#[derive(Clone, Copy)]
enum OpenAIShape {
    Chat,
    Response,
}

async fn forward_openai(
    state: &AppState,
    headers: &HeaderMap,
    body: serde_json::Value,
    surface: crate::metrics::Surface,
    requested_model: &str,
    stream_requested: bool,
    shape: OpenAIShape,
) -> Response {
    if stream_requested {
        // SSE translation for OpenAI streaming will be wired in a follow-up;
        // for now we explicitly fall back to non-streaming so callers always
        // get a correct response.
        tracing::debug!("openai stream requested — falling back to non-streaming");
    }

    // Validate caller token.
    let auth_header = headers
        .get("authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "));
    let Some(token) = auth_header else {
        return error_response(
            StatusCode::UNAUTHORIZED,
            "authentication_error",
            "Missing Authorization header with Bearer token",
        );
    };
    if let Err(e) = state.token_manager.validate_token(token) {
        let status = match &e {
            crate::token::TokenError::Revoked => StatusCode::FORBIDDEN,
            _ => StatusCode::UNAUTHORIZED,
        };
        return error_response(status, "authentication_error", &format!("{e}"));
    }

    // Resolve OAuth credentials.
    let (oauth_token, selected_account) = match resolve_upstream_credentials(state) {
        Ok(p) => p,
        Err(e) => {
            tracing::error!("openai: upstream credentials unavailable: {e}");
            return error_response(
                StatusCode::BAD_GATEWAY,
                "api_error",
                "Upstream authentication unavailable",
            );
        }
    };

    let upstream_url = format!(
        "{}/v1/messages",
        state.upstream_base_url.trim_end_matches('/')
    );
    let serialized = match serde_json::to_vec(&body) {
        Ok(v) => v,
        Err(e) => {
            return error_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                "api_error",
                &format!("failed to serialize translated body: {e}"),
            );
        }
    };
    let bytes_sent = serialized.len() as u64;

    let mut req_builder = state
        .client
        .post(&upstream_url)
        .header("authorization", format!("Bearer {oauth_token}"))
        .header("content-type", "application/json")
        .header("anthropic-version", "2023-06-01")
        .body(serialized);
    // Forward `anthropic-beta` if the caller supplied it (rare for OpenAI clients).
    if let Some(beta) = headers.get("anthropic-beta") {
        if let Ok(v) = beta.to_str() {
            req_builder = req_builder.header("anthropic-beta", v);
        }
    }
    let upstream_resp = match req_builder.send().await {
        Ok(r) => r,
        Err(e) => {
            state
                .metrics
                .record_request(surface, 502, selected_account.as_deref());
            return error_response(
                StatusCode::BAD_GATEWAY,
                "api_error",
                &format!("upstream request failed: {e}"),
            );
        }
    };
    let upstream_status = upstream_resp.status();
    let upstream_body = match upstream_resp.bytes().await {
        Ok(b) => b,
        Err(e) => {
            state
                .metrics
                .record_request(surface, 502, selected_account.as_deref());
            return error_response(
                StatusCode::BAD_GATEWAY,
                "api_error",
                &format!("upstream body read failed: {e}"),
            );
        }
    };
    let bytes_received = upstream_body.len() as u64;
    state.metrics.record_bytes(bytes_sent, bytes_received);

    if !upstream_status.is_success() {
        if upstream_status.as_u16() == 429 {
            if let (Some(router), Some(name)) =
                (state.account_router.as_ref(), selected_account.as_deref())
            {
                router.report_failure(name, "upstream returned 429");
            }
        }
        state.metrics.record_request(
            surface,
            upstream_status.as_u16(),
            selected_account.as_deref(),
        );
        let parsed: serde_json::Value =
            serde_json::from_slice(&upstream_body).unwrap_or_else(|_| serde_json::json!({}));
        let mut resp = (
            StatusCode::from_u16(upstream_status.as_u16()).unwrap_or(StatusCode::BAD_GATEWAY),
            axum::Json(parsed),
        )
            .into_response();
        resp.headers_mut()
            .insert("content-type", HeaderValue::from_static("application/json"));
        return resp;
    }

    let anthropic: serde_json::Value = match serde_json::from_slice(&upstream_body) {
        Ok(v) => v,
        Err(e) => {
            state
                .metrics
                .record_request(surface, 502, selected_account.as_deref());
            return error_response(
                StatusCode::BAD_GATEWAY,
                "api_error",
                &format!("upstream returned non-JSON: {e}"),
            );
        }
    };

    let translated = match shape {
        OpenAIShape::Chat => openai::anthropic_to_chat_completion(&anthropic, requested_model),
        OpenAIShape::Response => openai::anthropic_to_response(&anthropic, requested_model),
    };

    state
        .metrics
        .record_request(surface, 200, selected_account.as_deref());

    (StatusCode::OK, axum::Json(translated)).into_response()
}

/// `GET /metrics` — Prometheus text-exposition format.
pub async fn metrics_endpoint(State(state): State<AppState>) -> impl IntoResponse {
    let body = crate::metrics::render_prometheus(&state.metrics);
    (
        StatusCode::OK,
        [("content-type", "text/plain; version=0.0.4")],
        body,
    )
        .into_response()
}

/// `GET /v1/usage` — JSON usage snapshot.
pub async fn usage_endpoint(State(state): State<AppState>) -> impl IntoResponse {
    let snap = crate::metrics::usage_snapshot(&state.metrics);
    (StatusCode::OK, axum::Json(snap)).into_response()
}

/// `GET /v1/accounts` — Health snapshot of every configured account.
pub async fn accounts_endpoint(State(state): State<AppState>) -> impl IntoResponse {
    let Some(router) = state.account_router.as_ref() else {
        return (
            StatusCode::OK,
            axum::Json(serde_json::json!({
                "accounts": [],
                "note": "single-account mode (no AccountRouter configured)"
            })),
        )
            .into_response();
    };
    let snap: Vec<serde_json::Value> = router
        .health_snapshot()
        .into_iter()
        .map(|h| {
            serde_json::json!({
                "name": h.name,
                "home": h.home.display().to_string(),
                "healthy": h.healthy,
                "used": h.used,
                "last_error": h.last_error,
                "cooldown_remaining_seconds": h.cooldown_remaining.map(|d| d.as_secs()),
            })
        })
        .collect();
    (
        StatusCode::OK,
        axum::Json(serde_json::json!({"accounts": snap})),
    )
        .into_response()
}

/// Build an Anthropic-format error response.
fn error_response(status: StatusCode, error_type: &str, message: &str) -> Response {
    (
        status,
        axum::Json(serde_json::json!({
            "type": "error",
            "error": {
                "type": error_type,
                "message": message
            }
        })),
    )
        .into_response()
}
