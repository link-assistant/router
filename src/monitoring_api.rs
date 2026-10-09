//! Monitoring endpoints served on the proxy port.

use axum::extract::{Path, State};
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
    let health = crate::model_routing::configured_provider_health_report(&state).await;
    let mut gauges = health
        .iter()
        .map(|entry| (entry.provider.as_str(), entry.is_serving()))
        .collect::<Vec<_>>();
    if let Some(healthy) = crate::zai_coding_plan::configured_health(&state).await {
        gauges.push(("z.ai", healthy));
    }
    body.push_str(&crate::metrics::render_subscription_health(&gauges));
    body.push_str(&state.token_manager.diagnostics().render_prometheus());
    body.push_str(&state.token_manager.emergency().render_prometheus());
    if let Some(router) = state.account_router.as_ref() {
        body.push_str(&router.limit_counts().render_prometheus());
    }
    (
        StatusCode::OK,
        [("content-type", "text/plain; version=0.0.4")],
        body,
    )
        .into_response()
}

/// `GET /api/management/usage` — JSON usage snapshot. Requires an admin credential.
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

/// `GET /api/management/accounts` — admin-only health snapshot of configured accounts.
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
            let mut value = serde_json::json!({
                "name": health.name,
                "home": health.home.display().to_string(),
                "healthy": health.healthy,
                "credential": health.credential.label(),
                "used": health.used,
                "request_limit": health.request_limit,
                "remaining_requests": health.remaining_requests,
                "last_error": health.last_error,
                "cooldown_remaining_seconds": health.cooldown_remaining.map(|d| d.as_secs()),
                "cooldown_reason": health.limits.cooldown_reason,
                "cooldown_until_unix": health.limits.cooldown_until_unix,
                "model_cooldowns": health.limits.model_cooldowns,
                "paused": health.limits.paused_at(crate::account_limits::now_unix()),
                "pause": health.limits.pause,
                "windows": health.limits.windows,
            });
            value.as_object_mut().expect("account object").extend(
                crate::account_policy_management::fields(router, &health.name)
                    .as_object()
                    .unwrap()
                    .clone(),
            );
            value
        })
        .collect();
    (
        StatusCode::OK,
        axum::Json(serde_json::json!({"accounts": snap})),
    )
        .into_response()
}

/// `POST /api/management/accounts/{name}/pause` — take a pooled account out of
/// rotation until it is resumed (issue #677).
///
/// An optional JSON body may carry
/// `until_unix` (lift on its own then) and `reason`. Admin-only.
pub async fn account_pause_endpoint(
    State(state): State<AppState>,
    Path(name): Path<String>,
    headers: HeaderMap,
    body: Option<axum::Json<serde_json::Value>>,
) -> impl IntoResponse {
    if !is_admin_authorised(&state, &headers) {
        return admin_required();
    }
    let Some(router) = state.account_router.as_ref() else {
        return no_pool();
    };
    let body = body.map(|axum::Json(body)| body).unwrap_or_default();
    let until_unix = body.get("until_unix").and_then(serde_json::Value::as_u64);
    let reason = body
        .get("reason")
        .and_then(serde_json::Value::as_str)
        .unwrap_or("paused by an operator");
    match router.pause(&name, until_unix, reason) {
        Ok(()) => (
            StatusCode::OK,
            axum::Json(
                serde_json::json!({"account": name, "paused": true, "until_unix": until_unix}),
            ),
        )
            .into_response(),
        Err(error) => error_response(StatusCode::NOT_FOUND, "not_found_error", &error.to_string()),
    }
}

/// `POST /api/management/accounts/{name}/resume` — lift a manual or threshold
/// pause (issue #677). Admin-only.
pub async fn account_resume_endpoint(
    State(state): State<AppState>,
    Path(name): Path<String>,
    headers: HeaderMap,
) -> impl IntoResponse {
    if !is_admin_authorised(&state, &headers) {
        return admin_required();
    }
    let Some(router) = state.account_router.as_ref() else {
        return no_pool();
    };
    match router.resume(&name) {
        Ok(was_paused) => (
            StatusCode::OK,
            axum::Json(
                serde_json::json!({"account": name, "paused": false, "was_paused": was_paused}),
            ),
        )
            .into_response(),
        Err(error) => error_response(StatusCode::NOT_FOUND, "not_found_error", &error.to_string()),
    }
}

fn no_pool() -> Response {
    error_response(
        StatusCode::CONFLICT,
        "invalid_request_error",
        "no account pool is configured",
    )
}

/// `GET /api/management/auth/status` — provider-verified credential status.
pub async fn credential_status_endpoint(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> impl IntoResponse {
    if !is_admin_authorised(&state, &headers) {
        return admin_required();
    }
    let catalog_override = state
        .upstream_provider
        .subscription_provider()
        .zip(state.subscription_base_url.as_deref());
    let reports = crate::credential_status::evaluate(
        &state.client,
        &state.subscription_cache,
        &state.subscription_readers,
        catalog_override,
    )
    .await;
    (
        StatusCode::OK,
        axum::Json(serde_json::json!({"credentials": reports})),
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
    let now_ms = crate::operation_context::now().timestamp_millis();
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
