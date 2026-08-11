//! Monitoring endpoints served on the proxy port.

use axum::extract::State;
use axum::http::{HeaderMap, StatusCode};
use axum::response::{IntoResponse, Response};

use crate::app_state::AppState;
use crate::proxy::{error_response, is_admin_authorised};

fn admin_required() -> Response {
    error_response(
        StatusCode::UNAUTHORIZED,
        "authentication_error",
        "admin credential required",
    )
}

/// `GET /metrics` — Prometheus text-exposition format.
///
/// Deliberately left open: it carries aggregate counters only, and scrapers
/// (Prometheus, container health checks) are typically unauthenticated.
pub async fn metrics_endpoint(State(state): State<AppState>) -> impl IntoResponse {
    let body = crate::metrics::render_prometheus(&state.metrics);
    (
        StatusCode::OK,
        [("content-type", "text/plain; version=0.0.4")],
        body,
    )
        .into_response()
}

/// `GET /v1/usage` — JSON usage snapshot. Requires an admin credential.
///
/// Unlike `/metrics`, this snapshot names individual tokens and accounts.
pub async fn usage_endpoint(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> impl IntoResponse {
    if !is_admin_authorised(&state, &headers) {
        return admin_required();
    }
    let snap = crate::metrics::usage_snapshot(&state.metrics);
    (StatusCode::OK, axum::Json(snap)).into_response()
}

/// `GET /v1/accounts` — admin-only health snapshot of configured accounts.
pub async fn accounts_endpoint(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> impl IntoResponse {
    if !is_admin_authorised(&state, &headers) {
        return admin_required();
    }
    let Some(router) = state.account_router.as_ref() else {
        return (
            StatusCode::OK,
            axum::Json(serde_json::json!({
                "accounts": [],
                "note": "single-account mode (no AccountRouter configured)"
            })),
        )
            .into_response();
    };
    let snap: Vec<serde_json::Value> = router
        .health_snapshot()
        .into_iter()
        .map(|health| {
            serde_json::json!({
                "name": health.name,
                "home": health.home.display().to_string(),
                "healthy": health.healthy,
                "used": health.used,
                "request_limit": health.request_limit,
                "remaining_requests": health.remaining_requests,
                "last_error": health.last_error,
                "cooldown_remaining_seconds": health.cooldown_remaining.map(|d| d.as_secs()),
            })
        })
        .collect();
    (
        StatusCode::OK,
        axum::Json(serde_json::json!({"accounts": snap})),
    )
        .into_response()
}
