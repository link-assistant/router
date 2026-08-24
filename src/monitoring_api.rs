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
        return (StatusCode::OK, axum::Json(single_account_view(&state))).into_response();
    };
    let snap: Vec<serde_json::Value> = router
        .health_snapshot_with(Some(&state.subscription_cache))
        .into_iter()
        .map(|health| {
            serde_json::json!({
                "name": health.name,
                "home": health.home.display().to_string(),
                "healthy": health.healthy,
                "credential": health.credential.label(),
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

/// The credential this deployment holds when there is no account pool.
///
/// An empty `accounts` array used to be the whole answer here, which the CLI
/// could only read as "nothing is configured" — the same sentence it prints for
/// a deployment with no credential at all. A single-subscription router serving
/// traffic was therefore reported as unauthorized, pointing an operator at a
/// re-authentication it did not need (issue #281).
///
/// Each provider this deployment reads is named with the verdict the pooled
/// surfaces use, so both modes answer the question `auth status` actually asks.
/// `accounts` stays empty and keeps its meaning — *no account pool* — while
/// `credentials` carries the credential state, so a reader of either field
/// still gets what it expects.
///
/// Disk-only, like the pooled snapshot beside it: this is an admin `GET`, and
/// probing each vendor upstream would turn one request into several outbound
/// ones. `refreshable` already distinguishes "expired but recoverable" from
/// dead, which is the distinction the empty array was destroying.
fn single_account_view(state: &AppState) -> serde_json::Value {
    let now_ms = chrono::Utc::now().timestamp_millis();
    let credentials: Vec<serde_json::Value> = state
        .subscription_readers
        .iter()
        .map(|reader| {
            let credential = crate::accounts::credential_state_of(
                reader,
                "primary",
                now_ms,
                Some(&state.subscription_cache),
            );
            serde_json::json!({
                "name": reader.provider().to_string(),
                "home": reader.home().display().to_string(),
                "credential": credential.label(),
                "healthy": credential.can_serve(),
            })
        })
        .collect();
    serde_json::json!({
        "accounts": [],
        "credentials": credentials,
        "note": "single-account mode (no AccountRouter configured)",
    })
}
