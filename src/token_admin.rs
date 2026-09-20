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

use crate::model_contract::ModelAccessPolicy;
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
        client_kind: None,
        principal_id: None,
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

/// Mint a short-lived token bound to one managed client and subscriber.
///
/// Kept separate from [`issue_token`] so ordinary/manual issuance never gains
/// consumer-subscription authority merely by choosing a suggestive label.
pub async fn issue_client_token(
    State(state): State<AppState>,
    headers: HeaderMap,
    axum::Json(req): axum::Json<IssueClientTokenRequest>,
) -> impl IntoResponse {
    if !is_admin_authorised(&state, &headers) {
        return error_response(
            StatusCode::UNAUTHORIZED,
            "authentication_error",
            "missing or invalid admin Bearer key",
        );
    }
    let Some(client) = crate::clients::ClientKind::from_str_opt(&req.client_kind) else {
        return error_response(
            StatusCode::BAD_REQUEST,
            "invalid_request_error",
            "unknown Router client kind",
        );
    };
    if matches!(client, crate::clients::ClientKind::Cursor) {
        return error_response(
            StatusCode::BAD_REQUEST,
            "invalid_request_error",
            "Cursor has no native Router adapter and cannot receive a bound token",
        );
    }
    let ttl = req.ttl_hours.unwrap_or(24);
    let label = req
        .label
        .unwrap_or_else(|| format!("client-{}", client.canonical_name()));
    let principal = crate::credential_recovery_store::PRIMARY_ACCOUNT;
    let request = IssueRequest {
        ttl_hours: ttl,
        label: &label,
        account: Some(principal),
        max_requests: req.max_requests,
        max_tokens: None,
        rate_limit_per_minute: None,
        scope: "",
        github_repos: Vec::new(),
        sliding_window_seconds: req
            .sliding_expiry
            .unwrap_or(false)
            .then(|| ttl.saturating_mul(3_600)),
        client_kind: Some(client.canonical_name()),
        principal_id: Some(principal),
    };
    if let Err(message) = request.validate() {
        return error_response(StatusCode::BAD_REQUEST, "invalid_request_error", &message);
    }
    let model_policy = ModelAccessPolicy {
        allowed_models: req.allowed_models.clone(),
        allow_substitution: req.allow_model_substitution,
        substitution_source: req.model_substitution_source.clone().or_else(|| {
            req.allow_model_substitution
                .then(|| "client token issuance API".to_string())
        }),
    };
    if let Err(message) = model_policy.validate() {
        return error_response(StatusCode::BAD_REQUEST, "invalid_request_error", &message);
    }
    if req.run_lease && !req.ephemeral {
        return error_response(
            StatusCode::BAD_REQUEST,
            "invalid_request_error",
            "run_lease requires an ephemeral wrapper credential",
        );
    }
    match if req.run_lease {
        state
            .token_manager
            .issue_ephemeral_with_model_policy_and_run_lease(&request, &model_policy)
    } else if req.ephemeral {
        state
            .token_manager
            .issue_ephemeral_with_model_policy(&request, &model_policy)
    } else {
        state
            .token_manager
            .issue_with_model_policy(&request, &model_policy)
    } {
        Ok(token) => {
            state.metrics.record_token_issued();
            (
                StatusCode::OK,
                axum::Json(serde_json::json!({
                    "token": token,
                    "ttl_hours": ttl,
                    "label": label,
                    "client_kind": client.canonical_name(),
                    "principal_id": principal,
                    "model_policy": model_policy,
                })),
            )
                .into_response()
        }
        Err(error) => error_response(
            StatusCode::INTERNAL_SERVER_ERROR,
            "api_error",
            &format!("Failed to issue bound client token: {error}"),
        ),
    }
}

/// Renew the authenticated wrapper's own liveness lease.
pub async fn renew_run_lease(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> impl IntoResponse {
    let claims = match crate::proxy::authenticate_client_error(&state, &headers) {
        Ok(claims) => claims,
        Err(error) => return error.render(crate::api_error::ApiDialect::Anthropic),
    };
    match state.token_manager.renew_run_lease(&claims.sub) {
        Ok(expires_at) => (
            StatusCode::OK,
            axum::Json(serde_json::json!({ "run_lease_expires_at": expires_at })),
        )
            .into_response(),
        Err(TokenError::Storage(_)) => error_response(
            StatusCode::INTERNAL_SERVER_ERROR,
            "api_error",
            "could not persist the run lease",
        ),
        Err(_) => error_response(
            StatusCode::CONFLICT,
            "invalid_request_error",
            "this credential has no renewable live run lease",
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

/// `POST /api/management/tokens/rotate-client` — reissue one client token by id.
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
                "use /api/management/tokens/rotate to rotate an admin credential",
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

/// Request body for the managed client-token issuance endpoint.
#[derive(serde::Deserialize)]
#[cfg_attr(test, derive(serde::Serialize))]
pub struct IssueClientTokenRequest {
    pub client_kind: String,
    pub ttl_hours: Option<i64>,
    pub sliding_expiry: Option<bool>,
    pub label: Option<String>,
    pub max_requests: Option<u64>,
    /// Mark a credential as owned by one wrapper run so dead records can be
    /// compacted during later issuance.
    #[serde(default)]
    pub ephemeral: bool,
    /// Give this wrapper-owned credential a renewable process-liveness lease.
    #[serde(default)]
    pub run_lease: bool,
    /// Exact provider-advertised ids this credential may request. Empty keeps
    /// the established unpinned behavior for callers that omitted a model.
    #[serde(default)]
    pub allowed_models: Vec<String>,
    /// Permit a response to identify a different concrete served model.
    #[serde(default)]
    pub allow_model_substitution: bool,
    /// User-controlled setting that explicitly enabled substitution. Wrapper
    /// callers preserve their exact flag name; direct API callers may omit it
    /// and receive the generic issuance-API provenance above.
    #[serde(default)]
    pub model_substitution_source: Option<String>,
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
