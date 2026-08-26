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
    let mut body = crate::metrics::render_prometheus(&state.metrics);
    // A dead subscription had no counter of its own, so no scrape could see it
    // (issue #318). Rendered here rather than in `metrics.rs` so the counter
    // registry stays free of subscription types.
    let health = crate::model_routing::configured_provider_health(
        &state.subscription_readers,
        &state.subscription_cache,
        &state.model_catalogs,
    );
    let gauges = health
        .iter()
        .map(|entry| (entry.provider.as_str(), entry.healthy))
        .collect::<Vec<_>>();
    body.push_str(&crate::metrics::render_subscription_health(&gauges));
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::subscription::{SubscriptionProvider, SubscriptionReader};

    /// A single-account deployment names its credentials, not an empty pool.
    ///
    /// `accounts: []` alone could only be read as "nothing is configured", the
    /// same answer given for a deployment holding no credential at all — so a
    /// router serving live traffic was reported as unauthorized (issue #281).
    #[test]
    fn a_single_account_view_reports_each_provider() {
        let dir = tempfile::tempdir().expect("data dir");
        let home = tempfile::tempdir().expect("home");
        std::fs::write(
            home.path().join(".credentials.json"),
            serde_json::json!({
                "claudeAiOauth": {
                    "accessToken": "live-access",
                    "refreshToken": "live-refresh",
                    // Far enough out that the verdict cannot be a clock artefact.
                    "expiresAt": 4_102_444_800_000_i64,
                }
            })
            .to_string(),
        )
        .expect("plant a live credential");

        let mut state = AppState::for_tests(dir.path());
        state.subscription_readers = vec![
            SubscriptionReader::new(SubscriptionProvider::Claude, home.path()),
            SubscriptionReader::new(SubscriptionProvider::Codex, dir.path()),
        ];

        let view = single_account_view(&state);

        assert_eq!(
            view["accounts"].as_array().map(Vec::len),
            Some(0),
            "the pool is genuinely empty and keeps its meaning"
        );
        assert!(
            view["note"]
                .as_str()
                .is_some_and(|n| n.contains("single-account")),
            "the server keeps explaining why: {view}"
        );
        let credentials = view["credentials"].as_array().expect("credentials");
        assert_eq!(credentials.len(), 2, "{view}");
        assert_eq!(credentials[0]["name"], "claude");
        assert_eq!(
            credentials[0]["credential"], "ok",
            "a live credential must not read as missing: {view}"
        );
        assert_eq!(credentials[0]["healthy"], true);
        assert_eq!(
            credentials[1]["credential"], "missing",
            "and an absent one must still say so: {view}"
        );
        assert_eq!(credentials[1]["healthy"], false);
    }
}
