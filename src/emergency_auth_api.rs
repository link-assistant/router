//! Admin-protected endpoints for the emergency any-token mode (issue #645)
//! and the token authentication diagnostics (issue #644).
//!
//! Every handler here is mounted behind `authenticate_admin_route`, which the
//! emergency mode never relaxes.

use axum::extract::State;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};

use crate::app_state::AppState;

/// `GET /api/management/emergency-auth` — whether the mode is on, when it
/// lapses, and how many requests it admitted, by bypassed check.
pub async fn emergency_status(State(state): State<AppState>) -> Response {
    (
        StatusCode::OK,
        axum::Json(state.token_manager.emergency().status()),
    )
        .into_response()
}

/// `POST /api/management/emergency-auth/disable` — turn the mode off at once.
///
/// Normal checks apply to the very next request. There is deliberately no
/// matching `enable` endpoint: turning the mode on needs operator access to
/// the process configuration.
pub async fn emergency_disable(State(state): State<AppState>) -> Response {
    let was_active = state.token_manager.emergency().disable();
    if was_active {
        tracing::warn!("Emergency any-token mode disabled through the management API");
    }
    (
        StatusCode::OK,
        axum::Json(serde_json::json!({
            "disabled": true,
            "was_active": was_active,
            "status": state.token_manager.emergency().status(),
        })),
    )
        .into_response()
}

/// `GET /api/management/auth/diagnostics` — token authentication failures by
/// reason plus the most recent ones, identified by fingerprint and token id
/// only.
pub async fn auth_diagnostics(State(state): State<AppState>) -> Response {
    (
        StatusCode::OK,
        axum::Json(serde_json::json!({
            "diagnostics": state.token_manager.diagnostics().snapshot(),
            "emergency_auth": state.token_manager.emergency().status(),
        })),
    )
        .into_response()
}

/// Value of the [`crate::emergency_auth::HEALTH_HEADER`] liveness header, or
/// `None` while the mode is off.
#[must_use]
pub fn health_header(state: &AppState) -> Option<String> {
    state
        .token_manager
        .emergency()
        .active_until()
        .map(|until| format!("active; expires_at={until}"))
}
