//! Health and metrics reporting for configured subscriptions (issue #318).
//!
//! Split from `model_routing_tests.rs` to stay inside the per-file line limit.

use super::tests::{auto_state, bound_client_token};
use super::*;
use axum::body::Body;
use axum::http::Request;
use axum::routing::get;
use http_body_util::BodyExt;
use std::fs;
use tempfile::tempdir;
use tower::ServiceExt;

async fn state_with_zai_health(
    status: StatusCode,
) -> (AppState, tempfile::TempDir, tokio::task::JoinHandle<()>) {
    let app = axum::Router::new()
        .fallback(move || async move { (status, r#"{"object":"list","data":[{"id":"glm-5"}]}"#) });
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let base_url = format!("http://{}", listener.local_addr().unwrap());
    let handle = tokio::spawn(async move { axum::serve(listener, app).await.unwrap() });
    let data = tempdir().unwrap();
    let state = auto_state(Vec::new(), data.path());
    state
        .provider_store
        .upsert(crate::providers::ProviderUpsert {
            name: "z-ai-personal".into(),
            kind: Some("z.ai-coding-plan".into()),
            base_url,
            default_model: Some("glm-5".into()),
            models: Some(vec!["glm-5".into()]),
            supported_clients: None,
            api_key: Some("zai-secret-key".into()),
            api_key_env: None,
            encrypted_api_key: None,
            enabled: Some(true),
            subscriber_id: Some("owner-a".into()),
            acknowledge_intermediary_risk: Some(true),
            acknowledge_unsupported_clients: Some(Vec::new()),
            if_absent: false,
        })
        .unwrap();
    (state, data, handle)
}

async fn subscription_report(state: AppState) -> (StatusCode, Value) {
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
    let status = response.status();
    let body = response.into_body().collect().await.unwrap().to_bytes();
    (status, serde_json::from_slice(&body).unwrap())
}

async fn model_report(state: AppState) -> Value {
    state
        .provider_store
        .set_subscription_entitlement_policy(
            crate::client_policy::SubscriptionEntitlementPolicy::parse(["claude:codex"]).unwrap(),
        )
        .unwrap();
    let client_token = bound_client_token(&state, crate::clients::ClientKind::ClaudeCode, None);
    let app = axum::Router::new()
        .route("/api/services/anthropic/v1/models", get(models))
        .with_state(state);
    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/services/anthropic/v1/models")
                .header("x-api-key", client_token)
                .header("x-link-assistant-client", "claude")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    serde_json::from_slice(&body).unwrap()
}

async fn metrics_report(state: AppState) -> String {
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
    let body = response.into_body().collect().await.unwrap().to_bytes();
    String::from_utf8(body.to_vec()).unwrap()
}

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

#[tokio::test]
async fn healthy_zai_coding_plan_is_visible_to_health_checks_and_metrics() {
    let (state, _data, handle) = state_with_zai_health(StatusCode::OK).await;

    let (status, report) = subscription_report(state.clone()).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(report["healthy_providers"], json!(["z.ai"]));
    assert_eq!(report["degraded_providers"], json!([]));

    let metrics = metrics_report(state).await;
    assert!(metrics.contains("link_assistant_subscription_healthy{provider=\"z.ai\"} 1"));
    handle.abort();
}

#[tokio::test]
async fn rejected_zai_key_is_degraded_without_hiding_other_health() {
    let (state, _data, handle) = state_with_zai_health(StatusCode::UNAUTHORIZED).await;

    let (status, report) = subscription_report(state.clone()).await;
    assert_eq!(status, StatusCode::SERVICE_UNAVAILABLE);
    assert_eq!(report["healthy_providers"], json!([]));
    assert_eq!(report["degraded_providers"][0]["provider"], "z.ai");
    assert_eq!(
        report["degraded_providers"][0]["reason"],
        "the Coding Plan credential was rejected upstream and needs replacement"
    );

    let metrics = metrics_report(state).await;
    assert!(metrics.contains("link_assistant_subscription_healthy{provider=\"z.ai\"} 0"));
    handle.abort();
}

/// Production constructs readers for every supported provider. Configuration
/// is evidenced by a readable credential, not by that construction detail.
#[tokio::test]
async fn only_codex_credentials_omit_all_other_provider_readers() {
    let data = tempdir().unwrap();
    let claude = tempdir().unwrap();
    let codex = tempdir().unwrap();
    let gemini = tempdir().unwrap();
    let qwen = tempdir().unwrap();
    fs::write(
        codex.path().join("auth.json"),
        r#"{"tokens":{"access_token":"codex-live"}}"#,
    )
    .unwrap();
    let state = auto_state(
        vec![
            SubscriptionReader::new(SubscriptionProvider::Claude, claude.path()),
            SubscriptionReader::new(SubscriptionProvider::Codex, codex.path()),
            SubscriptionReader::new(SubscriptionProvider::Gemini, gemini.path()),
            SubscriptionReader::new(SubscriptionProvider::Qwen, qwen.path()),
        ],
        data.path(),
    );

    let (status, report) = subscription_report(state.clone()).await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(report["starting_providers"], json!(["codex"]));
    assert_eq!(report["healthy_providers"], json!([]));
    assert_eq!(report["degraded_providers"], json!([]));
    let rendered = report.to_string();
    for absent in ["claude", "gemini", "qwen"] {
        assert!(
            !rendered.contains(absent),
            "absent {absent} leaked: {report}"
        );
    }
    let metrics = metrics_report(state).await;
    assert!(metrics.contains("link_assistant_subscription_healthy{provider=\"codex\"} 1"));
    for absent in ["claude", "gemini", "qwen"] {
        assert!(
            !metrics.contains(&format!("provider=\"{absent}\"")),
            "absent {absent} emitted a gauge: {metrics}"
        );
    }
}

#[tokio::test]
async fn claude_and_codex_credentials_are_the_only_starting_providers() {
    let data = tempdir().unwrap();
    let claude = tempdir().unwrap();
    let codex = tempdir().unwrap();
    let gemini = tempdir().unwrap();
    let qwen = tempdir().unwrap();
    fs::write(
        claude.path().join(".credentials.json"),
        r#"{"claudeAiOauth":{"accessToken":"claude-live"}}"#,
    )
    .unwrap();
    fs::write(
        codex.path().join("auth.json"),
        r#"{"tokens":{"access_token":"codex-live"}}"#,
    )
    .unwrap();
    let state = auto_state(
        vec![
            SubscriptionReader::new(SubscriptionProvider::Claude, claude.path()),
            SubscriptionReader::new(SubscriptionProvider::Codex, codex.path()),
            SubscriptionReader::new(SubscriptionProvider::Gemini, gemini.path()),
            SubscriptionReader::new(SubscriptionProvider::Qwen, qwen.path()),
        ],
        data.path(),
    );

    let (status, report) = subscription_report(state).await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(report["starting_providers"], json!(["claude", "codex"]));
    assert_eq!(report["healthy_providers"], json!([]));
    assert_eq!(report["degraded_providers"], json!([]));
}

/// A credential path that exists but is malformed or unreadable is configured
/// and degraded. Public endpoints may disclose neither the path nor the body.
#[tokio::test]
async fn malformed_and_unreadable_credentials_are_safely_degraded() {
    let data = tempdir().unwrap();
    let malformed = tempdir().unwrap();
    let unreadable = tempdir().unwrap();
    let rejected = tempdir().unwrap();
    let private_body = "private-upstream-body-marker";
    let upstream_body = "private-upstream-rejection-marker";
    fs::write(malformed.path().join("auth.json"), private_body).unwrap();
    // A directory at the credential filename deterministically fails
    // `read_to_string` without depending on Unix permission semantics or root.
    fs::create_dir(unreadable.path().join("oauth_creds.json")).unwrap();
    fs::write(
        rejected.path().join("oauth_creds.json"),
        r#"{"access_token":"qwen-live"}"#,
    )
    .unwrap();
    let state = auto_state(
        vec![
            SubscriptionReader::new(SubscriptionProvider::Codex, malformed.path()),
            SubscriptionReader::new(SubscriptionProvider::Gemini, unreadable.path()),
            SubscriptionReader::new(SubscriptionProvider::Qwen, rejected.path()),
        ],
        data.path(),
    );
    state.model_catalogs.record_failure(
        SubscriptionProvider::Qwen,
        &format!("HTTP 401: {upstream_body}"),
        true,
    );
    state
        .subscription_cache
        .record_credential_rejected(SubscriptionProvider::Qwen);

    let (status, report) = subscription_report(state.clone()).await;

    assert_eq!(status, StatusCode::SERVICE_UNAVAILABLE);
    assert_eq!(report["starting_providers"], json!([]));
    assert_eq!(report["healthy_providers"], json!([]));
    let degraded = report["degraded_providers"].as_array().unwrap();
    assert_eq!(degraded.len(), 3, "{report}");
    assert_eq!(degraded[0]["provider"], "codex");
    assert_eq!(degraded[1]["provider"], "gemini");
    assert_eq!(degraded[2]["provider"], "qwen");
    let public = report.to_string();
    assert!(
        !public.contains(private_body),
        "credential body leaked: {public}"
    );
    assert!(
        !public.contains(upstream_body),
        "upstream body leaked: {public}"
    );
    for path in [malformed.path(), unreadable.path(), rejected.path()] {
        assert!(
            !public.contains(&path.to_string_lossy().to_string()),
            "credential path leaked: {public}"
        );
    }

    let metrics = metrics_report(state.clone()).await;
    for provider in ["codex", "gemini", "qwen"] {
        assert!(
            metrics.contains(&format!(
                "link_assistant_subscription_healthy{{provider=\"{provider}\"}} 0"
            )),
            "configured unusable {provider} must emit gauge 0: {metrics}"
        );
    }

    let catalog = model_report(state).await;
    assert_eq!(catalog["data"], json!([]));
    assert!(catalog.get("degraded_providers").is_none());
    let public = catalog.to_string();
    assert!(
        !public.contains(private_body),
        "credential body leaked: {public}"
    );
    assert!(
        !public.contains(upstream_body),
        "upstream body leaked: {public}"
    );
    for path in [malformed.path(), unreadable.path(), rejected.path()] {
        assert!(
            !public.contains(&path.to_string_lossy().to_string()),
            "credential path leaked: {public}"
        );
    }
}

#[tokio::test]
async fn cold_start_moves_to_healthy_after_live_discovery() {
    let data = tempdir().unwrap();
    let codex = tempdir().unwrap();
    fs::write(
        codex.path().join("auth.json"),
        r#"{"tokens":{"access_token":"codex-live"}}"#,
    )
    .unwrap();
    let state = auto_state(
        vec![SubscriptionReader::new(
            SubscriptionProvider::Codex,
            codex.path(),
        )],
        data.path(),
    );

    let (status, starting) = subscription_report(state.clone()).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(starting["starting_providers"], json!(["codex"]));
    assert_eq!(starting["healthy_providers"], json!([]));
    assert_eq!(starting["degraded_providers"], json!([]));
    let starting_models = model_report(state.clone()).await;
    assert_eq!(starting_models["data"], json!([]));
    assert!(starting_models.get("healthy_providers").is_none());
    assert!(starting_models.get("degraded_providers").is_none());
    let metrics = metrics_report(state.clone()).await;
    assert!(
        metrics.contains("link_assistant_subscription_healthy{provider=\"codex\"} 1"),
        "starting remains serving/non-paging in the compatibility gauge: {metrics}"
    );

    state
        .model_catalogs
        .record_success(SubscriptionProvider::Codex, vec!["gpt-live".into()]);
    let (status, healthy) = subscription_report(state.clone()).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(healthy["starting_providers"], json!([]));
    assert_eq!(healthy["healthy_providers"], json!(["codex"]));
    assert_eq!(healthy["degraded_providers"], json!([]));
    let healthy_models = model_report(state).await;
    assert_eq!(healthy_models["data"][0]["id"], "gpt-live");
    assert!(healthy_models.get("healthy_providers").is_none());
    assert!(healthy_models.get("degraded_providers").is_none());
}

/// A provider-wide catalog cannot be reused after the credential changes to a
/// different known account. Until that account completes discovery it is a
/// fresh startup, and the previous account's models must remain private.
#[tokio::test]
async fn credential_rotation_requires_discovery_for_the_current_account() {
    let data = tempdir().unwrap();
    let codex = tempdir().unwrap();
    let credential_path = codex.path().join("auth.json");
    fs::write(
        &credential_path,
        r#"{"tokens":{"access_token":"codex-a","account_id":"account-a"}}"#,
    )
    .unwrap();
    let state = auto_state(
        vec![SubscriptionReader::new(
            SubscriptionProvider::Codex,
            codex.path(),
        )],
        data.path(),
    );
    state.model_catalogs.record_success(
        SubscriptionProvider::Codex,
        vec!["unknown-account-model".into()],
    );
    let (status, unknown_catalog_account) = subscription_report(state.clone()).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(
        unknown_catalog_account["starting_providers"],
        json!(["codex"])
    );
    assert_eq!(model_report(state.clone()).await["data"], json!([]));

    state.model_catalogs.record_success_for(
        SubscriptionProvider::Codex,
        Some("account-a".into()),
        vec!["account-a-model".into()],
    );

    let (status, account_a) = subscription_report(state.clone()).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(account_a["healthy_providers"], json!(["codex"]));
    assert_eq!(
        model_report(state.clone()).await["data"][0]["id"],
        "account-a-model"
    );
    assert!(
        metrics_report(state.clone())
            .await
            .contains("link_assistant_subscription_healthy{provider=\"codex\"} 1")
    );

    fs::write(
        &credential_path,
        r#"{"tokens":{"access_token":"codex-b","account_id":"account-b"}}"#,
    )
    .unwrap();

    let (status, account_b_starting) = subscription_report(state.clone()).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(account_b_starting["starting_providers"], json!(["codex"]));
    assert_eq!(account_b_starting["healthy_providers"], json!([]));
    assert_eq!(account_b_starting["degraded_providers"], json!([]));
    let stale_catalog = model_report(state.clone()).await;
    assert_eq!(stale_catalog["data"], json!([]));
    assert!(stale_catalog.get("healthy_providers").is_none());
    assert!(stale_catalog.get("degraded_providers").is_none());
    let Err(stale_route) = route_state(&state, &json!({"model": "account-a-model"})).await else {
        panic!("a previous account's catalog must not route the current credential");
    };
    assert!(
        matches!(stale_route, ModelRouteError::NotFound(_)),
        "the account-mismatched model is unavailable: {stale_route}"
    );
    assert!(
        metrics_report(state.clone())
            .await
            .contains("link_assistant_subscription_healthy{provider=\"codex\"} 1"),
        "a rotated account awaiting discovery remains non-paging"
    );

    state
        .subscription_cache
        .record_credential_rejected(SubscriptionProvider::Codex);
    let (status, account_b_rejected) = subscription_report(state.clone()).await;
    assert_eq!(status, StatusCode::SERVICE_UNAVAILABLE);
    assert_eq!(account_b_rejected["starting_providers"], json!([]));
    assert_eq!(account_b_rejected["healthy_providers"], json!([]));
    assert_eq!(
        account_b_rejected["degraded_providers"][0]["provider"],
        "codex"
    );
    assert_eq!(model_report(state.clone()).await["data"], json!([]));
    assert!(
        metrics_report(state.clone())
            .await
            .contains("link_assistant_subscription_healthy{provider=\"codex\"} 0")
    );

    state
        .subscription_cache
        .record_credential_working(SubscriptionProvider::Codex);

    state.model_catalogs.record_success_for(
        SubscriptionProvider::Codex,
        Some("account-b".into()),
        vec!["account-b-model".into()],
    );
    let (status, account_b) = subscription_report(state.clone()).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(account_b["starting_providers"], json!([]));
    assert_eq!(account_b["healthy_providers"], json!(["codex"]));
    let current_catalog = model_report(state).await;
    assert_eq!(current_catalog["data"].as_array().unwrap().len(), 1);
    assert_eq!(current_catalog["data"][0]["id"], "account-b-model");
}

#[tokio::test]
async fn post_success_transient_failure_retains_models_but_rejection_removes_them() {
    let data = tempdir().unwrap();
    let claude = tempdir().unwrap();
    fs::write(
        claude.path().join(".credentials.json"),
        r#"{"claudeAiOauth":{"accessToken":"claude-live"}}"#,
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
        .record_success(SubscriptionProvider::Claude, vec!["retained-model".into()]);

    state.model_catalogs.record_failure(
        SubscriptionProvider::Claude,
        "temporary vendor outage",
        false,
    );
    let (status, transient) = subscription_report(state.clone()).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(transient["healthy_providers"], json!(["claude"]));
    assert_eq!(transient["starting_providers"], json!([]));
    assert_eq!(transient["degraded_providers"], json!([]));
    let retained = model_report(state.clone()).await;
    assert_eq!(retained["data"][0]["id"], "retained-model");
    assert!(
        metrics_report(state.clone())
            .await
            .contains("link_assistant_subscription_healthy{provider=\"claude\"} 1")
    );

    state
        .model_catalogs
        .record_failure(SubscriptionProvider::Claude, "HTTP 401: rejected", true);
    state
        .subscription_cache
        .record_credential_rejected(SubscriptionProvider::Claude);
    let (status, rejected) = subscription_report(state.clone()).await;
    assert_eq!(status, StatusCode::SERVICE_UNAVAILABLE);
    assert_eq!(rejected["healthy_providers"], json!([]));
    assert_eq!(rejected["starting_providers"], json!([]));
    assert_eq!(rejected["degraded_providers"][0]["provider"], "claude");
    let removed = model_report(state.clone()).await;
    assert_eq!(removed["data"], json!([]));
    assert!(removed.get("healthy_providers").is_none());
    assert!(removed.get("degraded_providers").is_none());
    assert!(
        metrics_report(state)
            .await
            .contains("link_assistant_subscription_healthy{provider=\"claude\"} 0")
    );
}

/// The core of issue #318: a revoked subscription must be visible to a stock
/// uptime check. `/health` previously answered `ok` while the router could not
/// serve everything it advertised.
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

/// A subscription whose first catalog discovery has not finished yet is
/// starting, not dead. Paging on that would fire on every cold start and on
/// any transient catalog-endpoint failure (issue #318).
#[tokio::test]
async fn a_cold_start_is_not_reported_as_degraded() {
    let data = tempdir().unwrap();
    let claude = tempdir().unwrap();
    fs::write(
        claude.path().join(".credentials.json"),
        r#"{"claudeAiOauth":{"accessToken":"working"}}"#,
    )
    .unwrap();
    let state = auto_state(
        vec![SubscriptionReader::new(
            SubscriptionProvider::Claude,
            claude.path(),
        )],
        data.path(),
    );
    // Nothing recorded yet: this is the window between boot and the first tick.
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
    assert_eq!(
        response.status(),
        StatusCode::OK,
        "a router that has not finished starting must not page anyone"
    );

    // A transient catalog failure is not a credential verdict either.
    state
        .model_catalogs
        .record_failure(SubscriptionProvider::Claude, "vendor unavailable", false);
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
        StatusCode::OK,
        "a transient failure must not be reported as a dead subscription"
    );
}

/// A provider must never be reported healthy and degraded at once: a monitor
/// reading both lists would get contradictory answers from one response.
#[tokio::test]
async fn no_provider_is_both_healthy_and_degraded() {
    let data = tempdir().unwrap();
    let claude = tempdir().unwrap();
    let codex = tempdir().unwrap();
    let qwen = tempdir().unwrap();
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
    fs::write(
        qwen.path().join("oauth_creds.json"),
        r#"{"access_token":"starting"}"#,
    )
    .unwrap();
    let state = auto_state(
        vec![
            SubscriptionReader::new(SubscriptionProvider::Claude, claude.path()),
            SubscriptionReader::new(SubscriptionProvider::Codex, codex.path()),
            SubscriptionReader::new(SubscriptionProvider::Qwen, qwen.path()),
        ],
        data.path(),
    );
    state
        .model_catalogs
        .record_success(SubscriptionProvider::Claude, vec!["aurora-2-base".into()]);
    state
        .model_catalogs
        .record_success(SubscriptionProvider::Codex, vec!["gpt-live".into()]);
    state
        .subscription_cache
        .record_credential_rejected(SubscriptionProvider::Claude);

    let (health_status, health) = subscription_report(state.clone()).await;
    assert_eq!(health_status, StatusCode::SERVICE_UNAVAILABLE);
    let starting = health["starting_providers"].as_array().unwrap();
    let healthy = health["healthy_providers"].as_array().unwrap();
    let degraded = health["degraded_providers"].as_array().unwrap();
    assert_eq!(health["starting_providers"], json!(["qwen"]));
    assert_eq!(health["healthy_providers"], json!(["codex"]));
    assert_eq!(degraded[0]["provider"], "claude");
    for provider in SubscriptionProvider::ALL {
        let name = Value::from(provider.as_str());
        let appearances = usize::from(starting.contains(&name))
            + usize::from(healthy.contains(&name))
            + usize::from(degraded.iter().any(|entry| entry["provider"] == name));
        assert!(
            appearances <= 1,
            "{provider} appears in conflicting states: {health}"
        );
    }

    state
        .provider_store
        .set_subscription_entitlement_policy(
            crate::client_policy::SubscriptionEntitlementPolicy::parse(["claude:codex"]).unwrap(),
        )
        .unwrap();
    let client_token = bound_client_token(&state, crate::clients::ClientKind::ClaudeCode, None);
    let app = axum::Router::new()
        .route("/api/services/anthropic/v1/models", get(models))
        .with_state(state);
    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/services/anthropic/v1/models")
                .header("x-api-key", client_token)
                .header("x-link-assistant-client", "claude")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let catalog: Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(catalog["data"][0]["id"], "gpt-live");
    for router_only in [
        "healthy_providers",
        "degraded_providers",
        "degraded_reasons",
        "catalog_conflicts",
    ] {
        assert!(
            catalog.get(router_only).is_none(),
            "native catalog leaked {router_only}: {catalog}"
        );
    }
}

#[tokio::test]
async fn provider_health_state_helpers_match_serving_semantics() {
    let data = tempdir().unwrap();
    let codex = tempdir().unwrap();
    fs::write(
        codex.path().join("auth.json"),
        r#"{"tokens":{"access_token":"codex-live"}}"#,
    )
    .unwrap();
    let readers = vec![SubscriptionReader::new(
        SubscriptionProvider::Codex,
        codex.path(),
    )];
    let mut state = AppState::for_tests(data.path());
    state.subscription_readers = readers;
    state.subscription_cache.register_readers(
        crate::credential_recovery_store::PRIMARY_ACCOUNT,
        &state.subscription_readers,
    );

    let starting = configured_provider_health_report(&state).await;
    assert_eq!(starting[0].state, ProviderHealthState::Starting);
    assert!(!starting[0].is_degraded());
    assert!(starting[0].is_serving());

    state
        .model_catalogs
        .record_success(SubscriptionProvider::Codex, vec!["gpt-live".into()]);
    let healthy = configured_provider_health_report(&state).await;
    assert_eq!(healthy[0].state, ProviderHealthState::Healthy);
    assert!(!healthy[0].is_degraded());
    assert!(healthy[0].is_serving());

    state
        .subscription_cache
        .record_credential_rejected(SubscriptionProvider::Codex);
    let degraded = configured_provider_health_report(&state).await;
    assert_eq!(degraded[0].state, ProviderHealthState::Degraded);
    assert!(degraded[0].is_degraded());
    assert!(!degraded[0].is_serving());
}

/// A wrong model id with healthy credentials used to get a bare sentence: the
/// router refused, and withheld the catalog it was holding at that moment
/// (issue #323).
#[test]
fn an_unadvertised_model_is_refused_by_naming_what_is_advertised() {
    let catalogs = ModelCatalogCache::new();
    catalogs.record_success(
        SubscriptionProvider::Claude,
        vec!["claude-opus-5".into(), "claude-haiku-4-5-20251001".into()],
    );
    let error = available_provider_for_model("opus", &[SubscriptionProvider::Claude], &catalogs)
        .expect_err("a tier name is not an advertised id");
    let message = error.to_string();

    assert!(message.contains("'opus' is not advertised"), "{message}");
    assert!(
        message.contains("claude-opus-5") && message.contains("claude-haiku-4-5-20251001"),
        "the refusal must name the ids that would have worked: {message}"
    );
}

/// A credential problem still reports the credential, because that is the
/// cause and the catalog is empty for a reason (issue #239 stays fixed).
#[test]
fn a_credential_failure_is_still_named_ahead_of_the_catalog() {
    let catalogs = ModelCatalogCache::new();
    catalogs.record_success(SubscriptionProvider::Claude, vec!["claude-opus-5".into()]);
    catalogs.record_failure(SubscriptionProvider::Claude, "HTTP 401", true);
    let error =
        available_provider_for_model("claude-opus-5", &[SubscriptionProvider::Claude], &catalogs)
            .expect_err("a rejected credential advertises nothing");

    assert!(
        error.to_string().contains("not usable"),
        "the credential cause wins: {error}"
    );
}

/// A deployment serving nothing adds no list, rather than a dangling colon.
#[test]
fn a_router_with_no_catalog_yet_adds_no_list() {
    let catalogs = ModelCatalogCache::new();
    let error = available_provider_for_model("anything", &[], &catalogs)
        .expect_err("nothing is advertised");
    let message = error.to_string();
    assert!(
        message.ends_with("subscription"),
        "no dangling detail: {message}"
    );
}
