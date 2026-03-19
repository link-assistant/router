//! Transparent API proxy for forwarding requests to the Anthropic API.
//!
//! Handles token swap (custom → OAuth), header adjustment, and
//! pass-through of streaming (SSE) responses.

use axum::body::Body;
use axum::extract::{Request, State};
use axum::http::{HeaderMap, HeaderValue, StatusCode};
use axum::response::{IntoResponse, Response};
use futures_util::StreamExt;
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
}

/// The API path prefix used to route requests through the proxy.
pub const API_PREFIX: &str = "/api/latest/anthropic/";

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
/// credentials, and forwards the request upstream — preserving SSE streaming.
pub async fn proxy_handler(State(state): State<AppState>, req: Request) -> impl IntoResponse {
    // Extract the downstream path after the API prefix
    let path = req.uri().path();
    let downstream_path = path.strip_prefix("/api/latest/anthropic").unwrap_or(path);

    // Build upstream URL
    let upstream_url = format!(
        "{}{}",
        state.upstream_base_url.trim_end_matches('/'),
        downstream_path
    );

    // Add query string if present
    let upstream_url = if let Some(query) = req.uri().query() {
        format!("{upstream_url}?{query}")
    } else {
        upstream_url
    };

    // Extract and validate the bearer token from the Authorization header
    let auth_header = req
        .headers()
        .get("authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "));

    let custom_token = match auth_header {
        Some(token) => token.to_string(),
        None => {
            return (
                StatusCode::UNAUTHORIZED,
                axum::Json(serde_json::json!({
                    "type": "error",
                    "error": {
                        "type": "authentication_error",
                        "message": "Missing Authorization header with Bearer token"
                    }
                })),
            )
                .into_response();
        }
    };

    // Validate custom token
    if let Err(e) = state.token_manager.validate_token(&custom_token) {
        let status = match &e {
            crate::token::TokenError::Revoked => StatusCode::FORBIDDEN,
            _ => StatusCode::UNAUTHORIZED,
        };
        return (
            status,
            axum::Json(serde_json::json!({
                "type": "error",
                "error": {
                    "type": "authentication_error",
                    "message": format!("{e}")
                }
            })),
        )
            .into_response();
    }

    // Get the real OAuth token
    let oauth_token = match state.oauth_provider.get_token() {
        Ok(token) => token,
        Err(e) => {
            tracing::error!("Failed to get OAuth token: {e}");
            return (
                StatusCode::BAD_GATEWAY,
                axum::Json(serde_json::json!({
                    "type": "error",
                    "error": {
                        "type": "api_error",
                        "message": "Upstream authentication unavailable"
                    }
                })),
            )
                .into_response();
        }
    };

    // Build upstream request
    let method = req.method().clone();
    let mut upstream_headers = HeaderMap::new();

    // Copy relevant headers from the original request
    for (name, value) in req.headers() {
        let name_str = name.as_str().to_lowercase();
        // Skip hop-by-hop headers and the original authorization
        if matches!(
            name_str.as_str(),
            "host" | "authorization" | "connection" | "transfer-encoding"
        ) {
            continue;
        }
        upstream_headers.insert(name.clone(), value.clone());
    }

    // Set the real OAuth authorization
    if let Ok(auth_val) = HeaderValue::from_str(&format!("Bearer {oauth_token}")) {
        upstream_headers.insert("authorization", auth_val);
    }

    // Read the request body
    let body_bytes = match axum::body::to_bytes(req.into_body(), 10 * 1024 * 1024).await {
        Ok(bytes) => bytes,
        Err(e) => {
            return (
                StatusCode::BAD_REQUEST,
                axum::Json(serde_json::json!({
                    "type": "error",
                    "error": {
                        "type": "invalid_request_error",
                        "message": format!("Failed to read request body: {e}")
                    }
                })),
            )
                .into_response();
        }
    };

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
            return (
                StatusCode::BAD_GATEWAY,
                axum::Json(serde_json::json!({
                    "type": "error",
                    "error": {
                        "type": "api_error",
                        "message": format!("Upstream request failed: {e}")
                    }
                })),
            )
                .into_response();
        }
    };

    // Build the response — stream it back to preserve SSE
    let status = StatusCode::from_u16(upstream_resp.status().as_u16())
        .unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);

    let mut response_headers = HeaderMap::new();
    for (name, value) in upstream_resp.headers() {
        let name_str = name.as_str().to_lowercase();
        // Skip hop-by-hop headers
        if matches!(
            name_str.as_str(),
            "connection" | "transfer-encoding" | "keep-alive"
        ) {
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
