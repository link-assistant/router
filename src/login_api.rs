//! HTTP endpoints for authorizing a deployment (issue #47).
//!
//! ```text
//! POST   /api/login            -> { login_id, provider, url, status, ... }
//! GET    /api/login/{id}       -> { status: "awaiting_code" | "awaiting_device" | ... }
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
use crate::subscription::SubscriptionProvider;

/// Start a login and return the URL the human must open.
///
/// The spawned CLI keeps running after this responds — the session is what
/// [`submit_code`] later writes to.
pub async fn begin_login(
    State(state): State<AppState>,
    headers: HeaderMap,
    request: Option<axum::Json<BeginLoginRequest>>,
) -> impl IntoResponse {
    let Some(manager) = guard(&state, &headers) else {
        return unauthorised();
    };
    let provider = requested_provider(request.as_ref().and_then(|body| body.provider.as_deref()));
    let Some(provider) = provider else {
        return error_response(
            StatusCode::BAD_REQUEST,
            "invalid_request_error",
            "`provider` must be `claude` or `codex`",
        );
    };
    // An explicit mode wins; otherwise fall back to what configuration selects,
    // so `LOGIN_CLI_ARGS=setup-token` keeps working (issue #193).
    let mode = match request.as_ref().and_then(|body| body.mode.as_deref()) {
        Some(value) => match crate::claude_auth::ClaudeAuthMode::parse(value) {
            Ok(mode) => mode,
            Err(message) => {
                return error_response(StatusCode::BAD_REQUEST, "invalid_request_error", &message);
            }
        },
        None => manager.configured_mode(),
    };
    match manager.begin_with_mode(provider, mode).await {
        Ok(view) => (StatusCode::OK, axum::Json(view)).into_response(),
        Err(e) => login_error_response(&e),
    }
}

/// Optional body for [`begin_login`]. An empty request remains Claude for
/// compatibility with the original endpoint.
#[derive(Default, serde::Deserialize)]
pub struct BeginLoginRequest {
    /// Subscription provider (`claude` or `codex`).
    pub provider: Option<String>,
    /// Claude login mode: `full` (default) or `setup-token` for the narrow
    /// `user:inference` scope. Ignored for Codex, which has one flow.
    pub mode: Option<String>,
}

fn requested_provider(value: Option<&str>) -> Option<SubscriptionProvider> {
    match value
        .unwrap_or("claude")
        .trim()
        .to_ascii_lowercase()
        .as_str()
    {
        "claude" => Some(SubscriptionProvider::Claude),
        "codex" => Some(SubscriptionProvider::Codex),
        _ => None,
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn provider_defaults_to_claude_and_rejects_unexposed_aliases() {
        assert_eq!(requested_provider(None), Some(SubscriptionProvider::Claude));
        assert_eq!(
            requested_provider(Some("codex")),
            Some(SubscriptionProvider::Codex)
        );
        assert_eq!(requested_provider(Some("chatgpt")), None);
        assert_eq!(requested_provider(Some("gemini")), None);
    }

    /// The mode field accepts the documented spellings and rejects the rest,
    /// so a typo cannot silently start the wrong-scope flow (issue #193).
    #[test]
    fn login_modes_parse_from_the_documented_spellings() {
        use crate::claude_auth::ClaudeAuthMode;
        for value in ["full", "FULL", "login", "default", ""] {
            assert_eq!(
                ClaudeAuthMode::parse(value),
                Ok(ClaudeAuthMode::Full),
                "{value}"
            );
        }
        for value in ["setup-token", "setup_token", "inference", "NARROW"] {
            assert_eq!(
                ClaudeAuthMode::parse(value),
                Ok(ClaudeAuthMode::SetupToken),
                "{value}"
            );
        }
        let error = ClaudeAuthMode::parse("scopes-please").expect_err("must reject");
        assert!(error.contains("setup-token"), "{error}");
    }

    /// Each error maps onto the status code that describes it, so a caller can
    /// tell a disabled surface from a broken one.
    #[test]
    fn login_errors_map_onto_their_status_codes() {
        for (error, expected) in [
            (LoginError::Disabled, StatusCode::NOT_FOUND),
            (LoginError::NotFound, StatusCode::NOT_FOUND),
            (
                LoginError::TooManySessions(4),
                StatusCode::TOO_MANY_REQUESTS,
            ),
            (
                LoginError::NotPending(crate::login::LoginStatus::Authorized),
                StatusCode::CONFLICT,
            ),
            (LoginError::Spawn("boom".into()), StatusCode::BAD_GATEWAY),
            (LoginError::NoUrl("boom".into()), StatusCode::BAD_GATEWAY),
            (LoginError::Storage("boom".into()), StatusCode::BAD_GATEWAY),
        ] {
            assert_eq!(
                login_error_response(&error).status(),
                expected,
                "{error:?} should map to {expected}"
            );
        }
    }

    #[test]
    fn an_unauthorised_caller_is_told_a_bearer_key_is_required() {
        assert_eq!(unauthorised().status(), StatusCode::UNAUTHORIZED);
    }

    /// Provider selection is an allowlist: an unknown or unexposed provider is
    /// rejected rather than silently defaulting.
    #[test]
    fn provider_selection_rejects_unknown_names() {
        assert_eq!(
            requested_provider(Some("CLAUDE")),
            Some(SubscriptionProvider::Claude)
        );
        assert_eq!(
            requested_provider(Some("  codex  ")),
            Some(SubscriptionProvider::Codex)
        );
        for unknown in ["qwen", "gemini", "anthropic", ""] {
            assert_eq!(requested_provider(Some(unknown)), None, "{unknown}");
        }
    }
}
