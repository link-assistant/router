//! HTTP endpoints for authorizing a deployment (issue #47).
//!
//! ```text
//! POST   /api/login            -> { login_id, url, status: "awaiting_code", ... }
//! GET    /api/login/{id}       -> { status: "awaiting_code" | "authorized" | "failed" | "expired", ... }
//! POST   /api/login/{id}/code  -> { status: "authorized", expires_at, ... }
//! DELETE /api/login/{id}       -> { cancelled: true }
//! ```
//!
//! These endpoints start a process inside the deployment, so they are admin
//! endpoints: when `TOKEN_ADMIN_KEY` is configured they require it as a Bearer
//! credential, exactly like [`crate::token_admin`]. Deployments that expose the
//! router publicly should always set that key, or disable the surface with
//! `--disable-login-api`.

// Two handlers are `async fn` purely to match axum's handler signature.
// Mirrors the same allow in `crate::token_admin`.
#![allow(clippy::unused_async)]

use axum::extract::{Path, State};
use axum::http::{HeaderMap, StatusCode};
use axum::response::IntoResponse;

use crate::login::{LoginError, LoginManager};
use crate::proxy::{AppState, error_response, is_admin_authorised};

/// Start a login and return the URL the human must open.
///
/// The spawned CLI keeps running after this responds — the session is what
/// [`submit_code`] later writes to.
pub async fn begin_login(State(state): State<AppState>, headers: HeaderMap) -> impl IntoResponse {
    let Some(manager) = guard(&state, &headers) else {
        return unauthorised();
    };
    match manager.begin().await {
        Ok(view) => (StatusCode::OK, axum::Json(view)).into_response(),
        Err(e) => login_error_response(&e),
    }
}

/// Report the current state of a login session.
pub async fn login_status(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let Some(manager) = guard(&state, &headers) else {
        return unauthorised();
    };
    manager.status(&id).map_or_else(
        || login_error_response(&LoginError::NotFound),
        |view| (StatusCode::OK, axum::Json(view)).into_response(),
    )
}

/// Submit the authorization code the human copied from their browser.
pub async fn submit_code(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
    axum::Json(req): axum::Json<SubmitCodeRequest>,
) -> impl IntoResponse {
    let Some(manager) = guard(&state, &headers) else {
        return unauthorised();
    };
    if req.code.trim().is_empty() {
        return error_response(
            StatusCode::BAD_REQUEST,
            "invalid_request_error",
            "`code` must not be empty",
        );
    }
    match manager.submit_code(&id, &req.code).await {
        Ok(view) => {
            // The proxy caches the token it read at boot; a fresh credential
            // is useless until that cache is dropped.
            if view.status == crate::login::LoginStatus::Authorized {
                let _ = state.oauth_provider.refresh_token();
            }
            (StatusCode::OK, axum::Json(view)).into_response()
        }
        Err(e) => login_error_response(&e),
    }
}

/// Cancel a pending login, terminating its process.
pub async fn cancel_login(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let Some(manager) = guard(&state, &headers) else {
        return unauthorised();
    };
    if manager.cancel(&id) {
        (
            StatusCode::OK,
            axum::Json(serde_json::json!({"cancelled": id})),
        )
            .into_response()
    } else {
        login_error_response(&LoginError::NotFound)
    }
}

/// Request body for [`submit_code`].
#[derive(serde::Deserialize)]
pub struct SubmitCodeRequest {
    /// The authorization code the human pasted from the browser.
    pub code: String,
}

/// Return the manager when the caller is allowed to use it.
fn guard<'a>(state: &'a AppState, headers: &HeaderMap) -> Option<&'a LoginManager> {
    is_admin_authorised(state, headers).then_some(&state.login_manager)
}

fn unauthorised() -> axum::response::Response {
    error_response(
        StatusCode::UNAUTHORIZED,
        "authentication_error",
        "admin Bearer key required",
    )
}

/// Map a [`LoginError`] onto the status code that describes it.
fn login_error_response(error: &LoginError) -> axum::response::Response {
    let (status, kind) = match error {
        // A disabled API is indistinguishable from a missing route on purpose.
        LoginError::Disabled | LoginError::NotFound => (StatusCode::NOT_FOUND, "not_found_error"),
        LoginError::TooManySessions(_) => (StatusCode::TOO_MANY_REQUESTS, "rate_limit_error"),
        LoginError::NotPending(_) => (StatusCode::CONFLICT, "invalid_request_error"),
        LoginError::Spawn(_) | LoginError::NoUrl(_) | LoginError::Storage(_) => {
            (StatusCode::BAD_GATEWAY, "api_error")
        }
    };
    error_response(status, kind, &error.to_string())
}
