//! Subscription health reporting (issue #318).
//!
//! Separate from `proxy::health`, which answers liveness only: `/health` drives
//! both Kubernetes probes and a restart cannot mint an OAuth token.

use axum::extract::State;
use axum::http::StatusCode;
use axum::response::IntoResponse;

use crate::app_state::AppState;

/// `GET /health/subscriptions` — can this router serve what it advertises?
///
/// The signal that did not exist. A revoked subscription left `/health` at
/// `ok`, `degraded_providers` empty and no counter anywhere, so the operator
/// learned about it from a client hours later via a message that named neither
/// the subscription nor the credential (issue #318).
///
/// Answers `503` when a *configured* subscription is degraded, which is what
/// lets a stock uptime check fire without knowing anything about router
/// internals. A readable credential still awaiting its first live catalog is
/// listed as starting and answers `200`; a deployment with no credential also
/// answers `200` with empty provider lists.
#[allow(clippy::unused_async)]
pub async fn subscription_health(State(state): State<AppState>) -> impl IntoResponse {
    let providers = crate::model_routing::configured_provider_health(
        &state.subscription_readers,
        &state.subscription_cache,
        &state.model_catalogs,
    );
    let degraded = providers
        .iter()
        .filter(|health| health.is_degraded())
        .map(|health| {
            serde_json::json!({
                "provider": health.provider.as_str(),
                "reason": health.summary,
            })
        })
        .collect::<Vec<_>>();
    let healthy = providers
        .iter()
        .filter(|health| health.state == crate::model_routing::ProviderHealthState::Healthy)
        .map(|health| health.provider.as_str())
        .collect::<Vec<_>>();
    let starting = providers
        .iter()
        .filter(|health| health.state == crate::model_routing::ProviderHealthState::Starting)
        .map(|health| health.provider.as_str())
        .collect::<Vec<_>>();
    let status = if degraded.is_empty() {
        StatusCode::OK
    } else {
        StatusCode::SERVICE_UNAVAILABLE
    };
    (
        status,
        axum::Json(serde_json::json!({
            "status": if degraded.is_empty() { "ok" } else { "degraded" },
            "starting_providers": starting,
            "healthy_providers": healthy,
            "degraded_providers": degraded,
        })),
    )
        .into_response()
}
