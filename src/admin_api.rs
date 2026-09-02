//! HTTP surface of the admin UI: the bootstrap claim, credential rotation,
//! and read-only status, plus the router that serves them on the dedicated
//! admin port.
//!
//! Everything under `/api/management` except the three bootstrap routes requires
//! the admin credential. The bootstrap routes carry their own rules — see
//! [`crate::admin`] for the two-phase claim protocol.

// The handlers here are `async fn` to match axum's handler signature even when
// their bodies are synchronous. Mirrors the same allow in `crate::proxy`.
#![allow(clippy::unused_async)]

use std::sync::Arc;

use axum::Router;
use axum::extract::State;
use axum::http::{HeaderMap, StatusCode};
use axum::middleware::from_fn;
use axum::response::{IntoResponse, Response};

use crate::admin::{AdminClaim, ClaimError};
use crate::proxy::{AppState, error_response};
use crate::route_contract::{RouteId, route_template};

/// Build the admin-port router: the bootstrap/status API, the admin-only
/// management API, and the embedded React UI.
pub fn router(state: AppState) -> Router {
    let login_enabled = state.login_manager.is_enabled();
    router_with_features(state, login_enabled, true)
}

/// Build the admin UI listener with the same feature switches as the public
/// listener. Both listener shapes consume the same management-route builder.
pub fn router_with_config(state: AppState, config: &crate::config::Config) -> Router {
    router_with_features(state, config.login.enabled, config.enable_metrics)
}

fn router_with_features(state: AppState, login_enabled: bool, metrics_enabled: bool) -> Router {
    crate::server_router::management_routes(state.clone(), login_enabled, metrics_enabled)
        .fallback(crate::admin_ui::serve_asset)
        // Outermost, so the UI assets and the error responses of the auth
        // middleware are hardened too — see [`crate::security_headers`].
        .layer(from_fn(crate::security_headers::apply))
        .with_state(state)
}

fn bearer(headers: &HeaderMap) -> Option<&str> {
    headers
        .get("authorization")
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.strip_prefix("Bearer "))
}

/// `GET /api/admin/status` — is admin claimed, and may bootstrap run?
pub async fn admin_status(State(state): State<AppState>) -> impl IntoResponse {
    (StatusCode::OK, axum::Json(state.admin.status())).into_response()
}

/// `POST /api/admin/bootstrap` — phase 1 of the claim.
///
/// Mints a candidate admin JWT. Bootstrap stays **open**: the token is minted
/// revoked, so it is not valid for anything until the client confirms it.
///
/// An optional `{"ttl_hours": n}` body lets the first administrator choose the
/// credential lifetime; it is clamped to
/// [`crate::admin::DEFAULT_CLAIM_TTL_HOURS`].
pub async fn bootstrap(
    State(state): State<AppState>,
    body: Option<axum::Json<TtlRequest>>,
) -> impl IntoResponse {
    let ttl_hours = body.and_then(|axum::Json(request)| request.ttl_hours);
    match state.admin.begin_with_ttl(ttl_hours) {
        Ok(candidate) => (
            StatusCode::OK,
            axum::Json(serde_json::json!({
                "claim_id": candidate.claim_id,
                "token": candidate.token,
                "expires_in_secs": candidate.expires_in_secs,
                "ttl_hours": candidate.ttl_hours,
                "confirm_url": route_template(RouteId::AdminBootstrapConfirm),
            })),
        )
            .into_response(),
        Err(e) => claim_error_response(e),
    }
}

/// `POST /api/admin/bootstrap/confirm` — phase 2 of the claim.
///
/// The request must be authenticated with the candidate token itself; that is
/// the proof the client stored it. Only this call closes bootstrap.
pub async fn bootstrap_confirm(
    State(state): State<AppState>,
    headers: HeaderMap,
    axum::Json(req): axum::Json<ConfirmRequest>,
) -> impl IntoResponse {
    let Some(token) = bearer(&headers) else {
        return error_response(
            StatusCode::UNAUTHORIZED,
            "authentication_error",
            "confirm must present the candidate token as a Bearer credential",
        );
    };
    match state.admin.confirm(&req.claim_id, token) {
        Ok(()) => (
            StatusCode::OK,
            axum::Json(serde_json::json!({"claimed": true})),
        )
            .into_response(),
        Err(e) => claim_error_response(e),
    }
}

/// `POST /api/admin/rotate` — issue a replacement admin credential and retire
/// the current one. Requires the current credential.
pub async fn rotate_credential(
    State(state): State<AppState>,
    body: Option<axum::Json<TtlRequest>>,
) -> impl IntoResponse {
    let ttl_hours = body.and_then(|axum::Json(request)| request.ttl_hours);
    match state.admin.rotate_with_ttl(ttl_hours) {
        Ok(token) => {
            let status = state.admin.status();
            (
                StatusCode::OK,
                axum::Json(serde_json::json!({
                    "token": token,
                    "token_id": status.token_id,
                    "credential_kind": status.credential_kind,
                })),
            )
                .into_response()
        }
        Err(e) => claim_error_response(e),
    }
}

/// Optional body carrying an administrator-chosen credential lifetime.
#[derive(Debug, Default, serde::Deserialize)]
pub struct TtlRequest {
    /// Requested lifetime in hours; clamped by the claim.
    #[serde(default)]
    pub ttl_hours: Option<i64>,
}

/// `GET /api/admin/summary` — `doctor`-style read-only view of what the router
/// is wired to. Requires the admin credential.
pub async fn admin_summary(State(state): State<AppState>) -> impl IntoResponse {
    let accounts = state
        .account_router
        .as_ref()
        .map_or(0, crate::accounts::AccountRouter::len);
    let credential = state
        .oauth_provider
        .discover_credential_path()
        .map(|path| path.display().to_string());
    let subscription = state.subscription_reader.as_ref().map(|reader| {
        serde_json::json!({
            "home": reader.home().display().to_string(),
            "credential_found": reader.discover_credential_path().is_some(),
        })
    });
    let admin_status = state.admin.status();
    (
        StatusCode::OK,
        axum::Json(serde_json::json!({
            "version": crate::VERSION,
            "upstream_provider": state.upstream_provider.as_str(),
            "upstream_base_url": state.upstream_base_url,
            "accounts": accounts,
            "claude_credential": credential,
            "subscription": subscription,
            "login_api_enabled": state.login_manager.is_enabled(),
            "admin": admin_status,
        })),
    )
        .into_response()
}

/// Map a claim-protocol failure onto an HTTP response.
///
/// `409 Conflict` is used for "already claimed" so a client can tell a closed
/// bootstrap apart from a bad credential (`401`).
fn claim_error_response(error: ClaimError) -> Response {
    let (status, kind) = match error {
        ClaimError::AlreadyClaimed | ClaimError::ProvisionedByEnvironment => {
            (StatusCode::CONFLICT, "already_claimed")
        }
        ClaimError::NoCandidate | ClaimError::ClaimIdMismatch => {
            (StatusCode::BAD_REQUEST, "invalid_request_error")
        }
        ClaimError::TokenMismatch => (StatusCode::UNAUTHORIZED, "authentication_error"),
        ClaimError::Storage => (StatusCode::INTERNAL_SERVER_ERROR, "api_error"),
    };
    error_response(status, kind, &error.to_string())
}

/// Body of `POST /api/admin/bootstrap/confirm`.
#[derive(serde::Deserialize)]
pub struct ConfirmRequest {
    /// The `claim_id` returned by the mint call.
    pub claim_id: String,
}

/// Convenience accessor used by `main` when starting the admin listener.
#[must_use]
pub fn admin_handle(state: &AppState) -> Arc<AdminClaim> {
    Arc::clone(&state.admin)
}
