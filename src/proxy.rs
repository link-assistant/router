//! Transparent API proxy for forwarding requests to upstream APIs.
//!
//! Supports three API formats required by the Claude Code LLM Gateway spec:
//! - Anthropic Messages (`/v1/messages`, `/v1/messages/count_tokens`)
//! - Bedrock `InvokeModel` (`/invoke`, `/invoke-with-response-stream`)
//! - Vertex AI rawPredict (`:rawPredict`, `:streamRawPredict`)
//!
//! Handles token swap (custom -> OAuth), header forwarding, and
//! pass-through of streaming (SSE) responses.

use axum::body::Body;
use axum::extract::{Request, State};
use axum::http::{HeaderMap, HeaderValue, StatusCode};
use axum::response::{IntoResponse, Response};
use futures_util::StreamExt;
use log_lazy::LogLazy;
use reqwest::Client;

use crate::oauth::OAuthProvider;
use crate::token::TokenManager;

/// Shared application state accessible by all route handlers.
#[derive(Clone)]
pub struct AppState {
    /// HTTP client for upstream requests.
    pub client: Client,
    /// Token manager for validating custom tokens.
    pub token_manager: TokenManager,
    /// OAuth provider for obtaining upstream credentials.
    pub oauth_provider: OAuthProvider,
    /// Base URL for the upstream Anthropic API.
    pub upstream_base_url: String,
    /// Lazy logger for verbose output.
    pub logger: LogLazy,
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
#[allow(clippy::unused_async)]
pub async fn issue_token(
    State(state): State<AppState>,
    axum::Json(req): axum::Json<IssueTokenRequest>,
) -> impl IntoResponse {
    let ttl = req.ttl_hours.unwrap_or(24);
    let label = req.label.unwrap_or_default();

    match state.token_manager.issue_token(ttl, &label) {
        Ok(token) => (
            StatusCode::OK,
            axum::Json(serde_json::json!({
                "token": token,
                "ttl_hours": ttl,
                "label": label,
            })),
        )
            .into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            axum::Json(serde_json::json!({
                "error": format!("Failed to issue token: {e}")
            })),
        )
            .into_response(),
    }
}

/// Request body for the token issuance endpoint.
#[derive(serde::Deserialize)]
pub struct IssueTokenRequest {
    /// Time-to-live in hours (default: 24).
    pub ttl_hours: Option<i64>,
    /// Optional label for the token.
    pub label: Option<String>,
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

    // Get the real OAuth token
    let oauth_token = match state.oauth_provider.get_token() {
        Ok(token) => token,
        Err(e) => {
            tracing::error!("Failed to get OAuth token: {e}");
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
