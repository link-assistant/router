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

    let request = IssueRequest {
        ttl_hours: ttl,
        label: &label,
        account: req.account.as_deref(),
        max_requests: req.max_requests,
        max_tokens: req.max_tokens,
        rate_limit_per_minute: req.rate_limit_per_minute,
        scope: &scope,
        github_repos: req.github_repos.clone().unwrap_or_default(),
        sliding_window_seconds: req
            .sliding_expiry
            .unwrap_or(false)
            .then(|| ttl.saturating_mul(3_600)),
    };
    // One shared rule set across HTTP, CLI and chat (issue #194), so the same
    // request cannot be accepted on one surface and refused on another.
    if let Err(message) = request.validate() {
        return error_response(StatusCode::BAD_REQUEST, "invalid_request_error", &message);
    }

    match state.token_manager.issue(&request) {
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

/// `POST /api/tokens/rotate-client` — reissue one client token by id.
///
/// Distinct from [`rotate_admin_token`], which rotates the caller's own admin
/// credential. Every constraint is preserved unless explicitly overridden, and
/// the previous value is revoked as part of the same operation (issue #194).
pub async fn rotate_client_token(
    State(state): State<AppState>,
    headers: HeaderMap,
    axum::Json(req): axum::Json<RotateClientTokenRequest>,
) -> impl IntoResponse {
    if !is_admin_authorised(&state, &headers) {
        return error_response(
            StatusCode::UNAUTHORIZED,
            "authentication_error",
            "missing or invalid admin Bearer key",
        );
    }

    // Rotating an admin credential through the client route would bypass the
    // proof-of-possession that `rotate_admin_token` requires.
    match state.token_manager.store().get(&req.id) {
        Ok(Some(record)) if record.scope == ADMIN_SCOPE => {
            return error_response(
                StatusCode::BAD_REQUEST,
                "invalid_request_error",
                "use /api/tokens/rotate to rotate an admin credential",
            );
        }
        Ok(Some(_)) => {}
        Ok(None) => {
            return error_response(
                StatusCode::NOT_FOUND,
                "invalid_request_error",
                &format!("unknown token id {}", req.id),
            );
        }
        Err(error) => {
            return error_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                "api_error",
                &format!("failed to read token: {error}"),
            );
        }
    }

    let overrides = crate::token::RotateOverrides {
        label: req.label.as_deref(),
        ttl_hours: req.ttl_hours,
        max_requests: req.max_requests,
        max_tokens: req.max_tokens,
        rate_limit_per_minute: req.rate_limit_per_minute,
        account: req.account.as_deref(),
    };
    match state.token_manager.rotate_token_with(&req.id, &overrides) {
        Ok(token) => {
            state.metrics.record_token_issued();
            state.metrics.record_token_revoked();
            (
                StatusCode::OK,
                axum::Json(serde_json::json!({
                    "token": token,
                    "revoked": req.id,
                })),
            )
                .into_response()
        }
        Err(crate::token::TokenError::Invalid(message)) => {
            error_response(StatusCode::BAD_REQUEST, "invalid_request_error", &message)
        }
        Err(e) => error_response(
            StatusCode::INTERNAL_SERVER_ERROR,
            "api_error",
            &format!("Failed to rotate token: {e}"),
        ),
    }
}

/// Request body for [`rotate_client_token`]. Every constraint is optional and
/// omitting one preserves the stored value.
#[derive(serde::Deserialize)]
pub struct RotateClientTokenRequest {
    /// Id of the token to reissue.
    pub id: String,
    /// Replacement label.
    pub label: Option<String>,
    /// Replacement TTL in hours.
    pub ttl_hours: Option<i64>,
    /// Replacement request cap.
    pub max_requests: Option<u64>,
    /// Replacement token spend cap.
    pub max_tokens: Option<u64>,
    /// Replacement per-minute request rate.
    pub rate_limit_per_minute: Option<u64>,
    /// Replacement account pin.
    pub account: Option<String>,
}

/// Request body for the token issuance endpoint.
#[derive(serde::Deserialize)]
pub struct IssueTokenRequest {
    /// Time-to-live in hours (default: 24).
    pub ttl_hours: Option<i64>,
    /// Extend the expiry to `now + ttl_hours` on each request served with
    /// this token, rather than fixing it at issue time (issue #354).
    pub sliding_expiry: Option<bool>,
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
    /// Repositories this token may reach through the GitHub proxy, as
    /// `owner/repo`. Omit for unrestricted access, which is the default and
    /// what every existing token keeps (issue #262).
    #[serde(default)]
    pub github_repos: Option<Vec<String>>,
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
