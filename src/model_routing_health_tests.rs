//! Health and metrics reporting for configured subscriptions (issue #318).
//!
//! Split from `model_routing_tests.rs` to stay inside the per-file line limit.

use super::tests::auto_state;
use super::*;
use axum::body::Body;
use axum::http::Request;
use axum::routing::get;
use http_body_util::BodyExt;
use std::fs;
use tempfile::tempdir;
use tower::ServiceExt;

/// A deployment with no subscription configured has nothing to be unhealthy
/// about, so the liveness answer stays exactly what every existing probe
/// expects (issue #318).
#[tokio::test]
async fn health_stays_a_bare_ok_when_no_subscription_is_configured() {
    let data = tempdir().unwrap();
    let state = auto_state(Vec::new(), data.path());
    let app = axum::Router::new()
        .route("/health", get(crate::proxy::health))
        .with_state(state);

    let response = app
        .oneshot(
            Request::builder()
                .uri("/health")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    assert_eq!(&body[..], b"ok");
}

/// The core of issue #318: a revoked subscription must be visible to a stock
/// uptime check. `/health` answered `ok` for twelve hours while the router
/// could not serve half of what it advertised.
#[tokio::test]
async fn subscription_health_reports_a_revoked_subscription_a_monitor_can_see() {
    let data = tempdir().unwrap();
    let claude = tempdir().unwrap();
    let codex = tempdir().unwrap();
    fs::write(
        claude.path().join(".credentials.json"),
        r#"{"claudeAiOauth":{"accessToken":"revoked"}}"#,
    )
    .unwrap();
    fs::write(
        codex.path().join("auth.json"),
        r#"{"tokens":{"access_token":"healthy"}}"#,
    )
    .unwrap();
    let state = auto_state(
        vec![
            SubscriptionReader::new(SubscriptionProvider::Claude, claude.path()),
            SubscriptionReader::new(SubscriptionProvider::Codex, codex.path()),
        ],
        data.path(),
    );
    state
        .model_catalogs
        .record_success(SubscriptionProvider::Claude, vec!["aurora-2-base".into()]);
    state
        .model_catalogs
        .record_success(SubscriptionProvider::Codex, vec!["gpt-live".into()]);
    // Everything is serving: the probe must not cry wolf.
    let app = axum::Router::new()
        .route(
            "/health/subscriptions",
            get(crate::subscription_health::subscription_health),
        )
        .with_state(state.clone());
    let response = app
        .oneshot(
            Request::builder()
                .uri("/health/subscriptions")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    // 17:44:49 — the refresh chain dies.
    state
        .subscription_cache
        .record_credential_rejected(SubscriptionProvider::Claude);

    // Liveness is unchanged: the process is up, and restarting it cannot mint
    // a new OAuth token. `/health` drives both Kubernetes probes, so failing it
    // here would crash-loop a deployment that still serves codex.
    let app = axum::Router::new()
        .route("/health", get(crate::proxy::health))
        .with_state(state.clone());
    let response = app
        .oneshot(
            Request::builder()
                .uri("/health")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(
        response.status(),
        StatusCode::OK,
        "liveness must not fail for a credential a restart cannot fix"
    );

    let app = axum::Router::new()
        .route(
            "/health/subscriptions",
            get(crate::subscription_health::subscription_health),
        )
        .with_state(state);
    let response = app
        .oneshot(
            Request::builder()
                .uri("/health/subscriptions")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(
        response.status(),
        StatusCode::SERVICE_UNAVAILABLE,
        "a router that cannot serve a configured subscription must say so"
    );
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let report: Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(report["status"], "degraded");
    assert_eq!(report["healthy_providers"], json!(["codex"]));
    assert_eq!(report["degraded_providers"][0]["provider"], "claude");
    assert!(
        report["degraded_providers"][0]["reason"].is_string(),
        "the degraded provider must say why: {report}"
    );
}

/// `/metrics` is what a monitor already polls, and it carried no signal at all
/// for a dead subscription (issue #318).
#[tokio::test]
async fn metrics_exposes_a_gauge_per_configured_subscription() {
    let data = tempdir().unwrap();
    let claude = tempdir().unwrap();
    fs::write(
        claude.path().join(".credentials.json"),
        r#"{"claudeAiOauth":{"accessToken":"revoked"}}"#,
    )
    .unwrap();
    let state = auto_state(
        vec![SubscriptionReader::new(
            SubscriptionProvider::Claude,
            claude.path(),
        )],
        data.path(),
    );
    state
        .model_catalogs
        .record_success(SubscriptionProvider::Claude, vec!["aurora-2-base".into()]);
    state
        .subscription_cache
        .record_credential_rejected(SubscriptionProvider::Claude);

    let app = axum::Router::new()
        .route("/metrics", get(crate::monitoring_api::metrics_endpoint))
        .with_state(state);
    let response = app
        .oneshot(
            Request::builder()
                .uri("/metrics")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let body = String::from_utf8_lossy(&body);
    assert!(
        body.contains("link_assistant_subscription_healthy{provider=\"claude\"} 0"),
        "a revoked subscription must be scrapeable as 0: {body}"
    );
    assert!(
        body.contains("# TYPE link_assistant_subscription_healthy gauge"),
        "the series must be typed as a gauge, not a counter: {body}"
    );
    // The existing counters are untouched.
    assert!(body.contains("link_assistant_requests_total"));
}
