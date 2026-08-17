//! HTTP surface of the admin UI: the bootstrap claim, credential rotation,
//! and read-only status, plus the router that serves them on the dedicated
//! admin port.
//!
//! Everything under `/api/admin` except the three bootstrap routes requires the
//! admin credential. The bootstrap routes carry their own rules — see
//! [`crate::admin`] for the two-phase claim protocol.

// The handlers here are `async fn` to match axum's handler signature even when
// their bodies are synchronous. Mirrors the same allow in `crate::proxy`.
#![allow(clippy::unused_async)]

use std::sync::Arc;

use axum::Router;
use axum::extract::{Request, State};
use axum::http::{HeaderMap, StatusCode};
use axum::middleware::{Next, from_fn, from_fn_with_state};
use axum::response::{IntoResponse, Response};
use axum::routing::{get, post};

use crate::admin::{AdminClaim, ClaimError};
use crate::proxy::{AppState, error_response};
use crate::{provider_proxy, proxy, token_admin};

/// Routes that must stay reachable without an admin credential, because they
/// are how a credential comes into existence in the first place.
const OPEN_PATHS: &[&str] = &[
    "/api/admin/status",
    "/api/admin/bootstrap",
    "/api/admin/bootstrap/confirm",
];

/// Build the admin-port router: the bootstrap/status API, the admin-only
/// management API, and the embedded React UI.
pub fn router(state: AppState) -> Router {
    Router::new()
        .route("/api/admin/status", get(admin_status))
        .route("/api/admin/bootstrap", post(bootstrap))
        .route("/api/admin/bootstrap/confirm", post(bootstrap_confirm))
        .route("/api/admin/rotate", post(rotate_credential))
        .route("/api/admin/summary", get(admin_summary))
        .route("/api/admin/usage", get(proxy::usage_endpoint))
        .route("/api/admin/accounts", get(proxy::accounts_endpoint))
        .route(
            "/api/tokens",
            post(token_admin::issue_token).get(token_admin::list_tokens),
        )
        .route("/api/tokens/list", get(token_admin::list_tokens))
        .route("/api/tokens/revoke", post(token_admin::revoke_token))
        .route(
            "/api/tokens/rotate-client",
            post(token_admin::rotate_client_token),
        )
        .route("/api/providers", get(provider_proxy::list_providers))
        .route_layer(from_fn_with_state(state.clone(), require_admin))
        .fallback(crate::admin_ui::serve_asset)
        // Outermost, so the UI assets and the error responses of the auth
        // middleware are hardened too — see [`crate::security_headers`].
        .layer(from_fn(crate::security_headers::apply))
        .with_state(state)
}

/// Reject every admin-port API request that does not carry the admin
/// credential, except the bootstrap routes and the UI assets themselves.
///
/// Both ports now run the same rule ([`crate::proxy::is_admin_authorised`]):
/// the claimed credential, any admin-scoped `la_sk_…` JWT, or the flat
/// `TOKEN_ADMIN_KEY`. One credential model means an administrator does not
/// need a different token depending on which port they reach for.
async fn require_admin(State(state): State<AppState>, request: Request, next: Next) -> Response {
    let path = request.uri().path();
    let is_api = path.starts_with("/api/");
    if !is_api || OPEN_PATHS.contains(&path) {
        return next.run(request).await;
    }
    if proxy::is_admin_authorised(&state, request.headers()) {
        return next.run(request).await;
    }
    error_response(
        StatusCode::UNAUTHORIZED,
        "authentication_error",
        "admin credential required",
    )
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
                "confirm_url": "/api/admin/bootstrap/confirm",
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
