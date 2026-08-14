//! Admin HTTP endpoints for managing router-issued tokens.
//!
//! These endpoints let an operator mint, list, and revoke the `la_sk_...`
//! tokens that downstream tasks present to the proxy. When `admin_key` is
//! configured they require it as a Bearer credential; the proxy's shared
//! authorization helper enforces that. They are intentionally kept in their
//! own module so the core
//! request-forwarding logic in [`crate::proxy`] stays focused and under the
//! repository's per-file line budget.

// These handlers are `async fn` purely to match axum's handler signature;
// none of them currently `.await`. Mirrors the same allow in `crate::proxy`.
#![allow(clippy::unused_async)]

use axum::extract::State;
use axum::http::{HeaderMap, StatusCode};
use axum::response::IntoResponse;

use crate::proxy::{AppState, error_response, extract_admin_bearer, is_admin_authorised};
use crate::token::{ADMIN_SCOPE, IssueRequest, TokenError};

/// Token issuance endpoint.
///
/// Issues a new custom token. Expects a JSON body such as
/// `{"ttl_hours": 24, "label": "my-token", "max_requests": 100}`.
///
/// When `admin_key` is configured the caller MUST present it as a Bearer
/// token in `Authorization`; otherwise the endpoint is open (matching the
/// original behaviour, kept for backwards compatibility).
pub async fn issue_token(
    State(state): State<AppState>,
    headers: HeaderMap,
    axum::Json(req): axum::Json<IssueTokenRequest>,
) -> impl IntoResponse {
    if !is_admin_authorised(&state, &headers) {
        return error_response(
            StatusCode::UNAUTHORIZED,
            "authentication_error",
            "missing or invalid admin Bearer key",
        );
    }

    let ttl = req.ttl_hours.unwrap_or(24);
    let label = req.label.unwrap_or_default();
    let scope = req.scope.unwrap_or_default();
    if !scope.is_empty() && scope != ADMIN_SCOPE {
        return error_response(
            StatusCode::BAD_REQUEST,
            "invalid_request_error",
            &format!("unknown scope '{scope}'; expected '{ADMIN_SCOPE}' or none"),
        );
    }

    match state.token_manager.issue(&IssueRequest {
        ttl_hours: ttl,
        label: &label,
        account: req.account.as_deref(),
        max_requests: req.max_requests,
        max_tokens: req.max_tokens,
        rate_limit_per_minute: req.rate_limit_per_minute,
        scope: &scope,
    }) {
        Ok(token) => {
            state.metrics.record_token_issued();
            (
                StatusCode::OK,
                axum::Json(serde_json::json!({
                    "token": token,
                    "ttl_hours": ttl,
                    "label": label,
                    "account": req.account,
                    "max_requests": req.max_requests,
                    "max_tokens": req.max_tokens,
                    "rate_limit_per_minute": req.rate_limit_per_minute,
                    "scope": scope,
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
        Err(e @ TokenError::NotFound(_)) => {
            error_response(StatusCode::NOT_FOUND, "not_found", &format!("{e}"))
        }
        Err(e) => error_response(
            StatusCode::INTERNAL_SERVER_ERROR,
            "api_error",
            &format!("{e}"),
        ),
    }
}

/// Rotate the admin token used to make this call.
///
/// Issues a replacement admin token and revokes the caller's own `sub` in one
/// step — "new token, old one expired". The caller must authenticate with an
/// admin-scoped JWT: the flat `TOKEN_ADMIN_KEY` has no subject to revoke, so
/// it cannot rotate itself and gets HTTP 400 instead.
pub async fn rotate_admin_token(
    State(state): State<AppState>,
    headers: HeaderMap,
    axum::Json(req): axum::Json<RotateTokenRequest>,
) -> impl IntoResponse {
    let Some(bearer) = extract_admin_bearer(&headers) else {
        return error_response(
            StatusCode::UNAUTHORIZED,
            "authentication_error",
            "admin Bearer token required",
        );
    };
    let Ok(claims) = state.token_manager.validate_admin_token(bearer) else {
        return error_response(
            StatusCode::BAD_REQUEST,
            "invalid_request_error",
            "rotation requires an admin-scoped token; the flat admin key has no subject to revoke",
        );
    };

    let ttl = req.ttl_hours.unwrap_or(24);
    let label = req.label.unwrap_or_else(|| claims.label.clone());
    match state
        .token_manager
        .rotate_admin_token(&claims.sub, ttl, &label)
    {
        Ok(token) => {
            state.metrics.record_token_issued();
            state.metrics.record_token_revoked();
            (
                StatusCode::OK,
                axum::Json(serde_json::json!({
                    "token": token,
                    "ttl_hours": ttl,
                    "label": label,
                    "scope": ADMIN_SCOPE,
                    "revoked": claims.sub,
                })),
            )
                .into_response()
        }
        Err(e) => error_response(
            StatusCode::INTERNAL_SERVER_ERROR,
            "api_error",
            &format!("Failed to rotate admin token: {e}"),
        ),
    }
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
    /// Optional cap on the number of upstream requests the token may make.
    /// `None` (omitted) means unlimited.
    pub max_requests: Option<u64>,
    /// Optional cap on actual input plus output tokens reported by upstreams.
    pub max_tokens: Option<u64>,
    /// Optional number of requests admitted per one-minute window.
    pub rate_limit_per_minute: Option<u64>,
    /// Privilege scope. Omit (or empty) for an ordinary client token; pass
    /// `"admin"` to mint a credential that also unlocks the admin endpoints.
    pub scope: Option<String>,
}

/// Request body for the admin rotation endpoint. All fields are optional.
#[derive(serde::Deserialize, Default)]
pub struct RotateTokenRequest {
    /// TTL of the replacement token in hours (default: 24).
    pub ttl_hours: Option<i64>,
    /// Label for the replacement token; defaults to the current token's label.
    pub label: Option<String>,
}

/// Request body for the token revocation endpoint.
#[derive(serde::Deserialize)]
pub struct RevokeTokenRequest {
    pub id: String,
}
