//! End-to-end tests of the admin port: the two-phase first-visitor claim, the
//! credential it produces, and the embedded UI.
//!
//! These drive the real admin router with `tower::ServiceExt::oneshot`, so the
//! middleware, the handlers and the claim state machine are all exercised
//! together — the part that is easy to get wrong is which routes stay open
//! before a credential exists.

use std::sync::Arc;
use std::time::Duration;

use axum::body::Body;
use axum::http::{Request, StatusCode};
use http_body_util::BodyExt;
use link_assistant_router::admin::AdminClaim;
use link_assistant_router::app_state::AppState;
use link_assistant_router::providers::ProviderStore;
use link_assistant_router::token::TokenManager;
use tower::ServiceExt;

fn state_with(admin: Arc<AdminClaim>, data_dir: &std::path::Path) -> AppState {
    AppState {
        client: reqwest::Client::new(),
        token_manager: TokenManager::new("test-secret"),
        oauth_provider: link_assistant_router::oauth::OAuthProvider::new(
            data_dir.to_str().expect("utf-8 path"),
        ),
        account_router: None,
        subscription_reader: None,
        subscription_readers: vec![],
        subscription_cache: Arc::new(link_assistant_router::refresh::TokenCache::new()),
        upstream_base_url: "https://api.anthropic.com".to_string(),
        upstream_provider: link_assistant_router::config::UpstreamProvider::Anthropic,
        gonka: None,
        bridge_model: None,
        crater: None,
        openai_compatible: link_assistant_router::config::default_openai_compatible_config(),
        provider_store: ProviderStore::open(data_dir, "test-secret").expect("provider store"),
        logger: log_lazy::LogLazy::new(),
        admin,
        admin_key: None,
        allow_anonymous_admin: false,
        metrics: Arc::new(link_assistant_router::metrics::Metrics::default()),
        audit: Arc::new(link_assistant_router::audit::AuditLog::to_path(None)),
        activitypub_actor_base_url: "https://router.example".to_string(),
        activitypub_public_key_pem:
            link_assistant_router::config::default_activitypub_public_key_pem(),
        mpp: link_assistant_router::config::default_mpp_config(),
        login_manager: link_assistant_router::login::LoginManager::new(
            link_assistant_router::login::LoginConfig::default(),
        ),
    }
}

struct Harness {
    state: AppState,
    _dir: tempfile::TempDir,
}

impl Harness {
    fn new(env_key: Option<String>, ttl: Duration) -> Self {
        let dir = tempfile::tempdir().expect("tempdir");
        let admin = Arc::new(AdminClaim::load(env_key, dir.path(), ttl));
        Self {
            state: state_with(admin, dir.path()),
            _dir: dir,
        }
    }

    async fn call(&self, request: Request<Body>) -> (StatusCode, serde_json::Value) {
        let response = link_assistant_router::admin_api::router(self.state.clone())
            .oneshot(request)
            .await
            .expect("router responds");
        let status = response.status();
        let bytes = response
            .into_body()
            .collect()
            .await
            .expect("body")
            .to_bytes();
        let body = serde_json::from_slice(&bytes).unwrap_or(serde_json::Value::Null);
        (status, body)
    }

    async fn get(&self, path: &str, token: Option<&str>) -> (StatusCode, serde_json::Value) {
        self.call(build(path, "GET", token, None)).await
    }

    async fn post(
        &self,
        path: &str,
        token: Option<&str>,
        body: Option<serde_json::Value>,
    ) -> (StatusCode, serde_json::Value) {
        self.call(build(path, "POST", token, body)).await
    }
}

fn build(
    path: &str,
    method: &str,
    token: Option<&str>,
    body: Option<serde_json::Value>,
) -> Request<Body> {
    let mut request = Request::builder().method(method).uri(path);
    if let Some(token) = token {
        request = request.header("authorization", format!("Bearer {token}"));
    }
    match body {
        Some(value) => request
            .header("content-type", "application/json")
            .body(Body::from(value.to_string()))
            .expect("request"),
        None => request
            .header("content-type", "application/json")
            .body(Body::from("{}"))
            .expect("request"),
    }
}

const fn minutes(n: u64) -> Duration {
    Duration::from_secs(n * 60)
}

#[tokio::test]
async fn status_reports_an_open_bootstrap_before_any_claim() {
    let harness = Harness::new(None, minutes(2));
    let (status, body) = harness.get("/api/admin/status", None).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["claimed"], false);
    assert_eq!(body["bootstrap_open"], true);
}

#[tokio::test]
async fn admin_api_is_closed_before_a_claim_exists() {
    let harness = Harness::new(None, minutes(2));
    let (status, _) = harness.get("/api/tokens/list", None).await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);
    let (status, _) = harness.get("/api/admin/summary", None).await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn mint_alone_does_not_close_bootstrap_or_authorise() {
    let harness = Harness::new(None, minutes(2));
    let (status, minted) = harness.post("/api/admin/bootstrap", None, None).await;
    assert_eq!(status, StatusCode::OK);
    let token = minted["token"].as_str().expect("token").to_string();

    // The candidate is not a credential yet.
    let (status, _) = harness.get("/api/tokens/list", Some(&token)).await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);

    // And the system is still unclaimed, so a lost response is recoverable.
    let (_, state) = harness.get("/api/admin/status", None).await;
    assert_eq!(state["claimed"], false);
    assert_eq!(state["bootstrap_open"], true);
}

#[tokio::test]
async fn confirm_activates_the_credential_and_closes_bootstrap() {
    let harness = Harness::new(None, minutes(2));
    let (_, minted) = harness.post("/api/admin/bootstrap", None, None).await;
    let token = minted["token"].as_str().expect("token").to_string();
    let claim_id = minted["claim_id"].as_str().expect("claim_id").to_string();

    let (status, body) = harness
        .post(
            "/api/admin/bootstrap/confirm",
            Some(&token),
            Some(serde_json::json!({"claim_id": claim_id})),
        )
        .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["claimed"], true);

    let (status, _) = harness.get("/api/tokens/list", Some(&token)).await;
    assert_eq!(status, StatusCode::OK);

    let (status, _) = harness.post("/api/admin/bootstrap", None, None).await;
    assert_eq!(status, StatusCode::CONFLICT);
}

#[tokio::test]
async fn confirm_requires_the_candidate_token_itself() {
    let harness = Harness::new(None, minutes(2));
    let (_, minted) = harness.post("/api/admin/bootstrap", None, None).await;
    let claim_id = minted["claim_id"].as_str().expect("claim_id").to_string();

    let (status, _) = harness
        .post(
            "/api/admin/bootstrap/confirm",
            None,
            Some(serde_json::json!({"claim_id": claim_id.clone()})),
        )
        .await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);

    let (status, _) = harness
        .post(
            "/api/admin/bootstrap/confirm",
            Some("la_admin_wrong"),
            Some(serde_json::json!({"claim_id": claim_id})),
        )
        .await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);

    // Still unclaimed: a failed confirm must never brick the deployment.
    let (_, state) = harness.get("/api/admin/status", None).await;
    assert_eq!(state["bootstrap_open"], true);
}

#[tokio::test]
async fn only_the_first_confirmer_wins() {
    let harness = Harness::new(None, minutes(2));
    let (_, first) = harness.post("/api/admin/bootstrap", None, None).await;
    let (_, second) = harness.post("/api/admin/bootstrap", None, None).await;

    // The first visitor's candidate was discarded by the second mint.
    let (status, _) = harness
        .post(
            "/api/admin/bootstrap/confirm",
            Some(first["token"].as_str().expect("token")),
            Some(serde_json::json!({"claim_id": first["claim_id"]})),
        )
        .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);

    let (status, _) = harness
        .post(
            "/api/admin/bootstrap/confirm",
            Some(second["token"].as_str().expect("token")),
            Some(serde_json::json!({"claim_id": second["claim_id"]})),
        )
        .await;
    assert_eq!(status, StatusCode::OK);
}

#[tokio::test]
async fn an_expired_candidate_leaves_bootstrap_open() {
    let harness = Harness::new(None, Duration::from_secs(0));
    let (_, minted) = harness.post("/api/admin/bootstrap", None, None).await;

    let (status, _) = harness
        .post(
            "/api/admin/bootstrap/confirm",
            Some(minted["token"].as_str().expect("token")),
            Some(serde_json::json!({"claim_id": minted["claim_id"]})),
        )
        .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);

    let (_, state) = harness.get("/api/admin/status", None).await;
    assert_eq!(state["bootstrap_open"], true);

    // Trying again works — this is the recovery path.
    let (status, _) = harness.post("/api/admin/bootstrap", None, None).await;
    assert_eq!(status, StatusCode::OK);
}

#[tokio::test]
async fn an_environment_key_disables_bootstrap_entirely() {
    let harness = Harness::new(Some("env-admin-key".to_string()), minutes(2));
    let (_, state) = harness.get("/api/admin/status", None).await;
    assert_eq!(state["claimed"], true);
    assert_eq!(state["bootstrap_open"], false);
    assert_eq!(state["provisioned_by_environment"], true);

    let (status, _) = harness.post("/api/admin/bootstrap", None, None).await;
    assert_eq!(status, StatusCode::CONFLICT);

    let (status, _) = harness
        .get("/api/admin/summary", Some("env-admin-key"))
        .await;
    assert_eq!(status, StatusCode::OK);
}

#[tokio::test]
async fn rotation_replaces_the_claimed_credential() {
    let harness = Harness::new(None, minutes(2));
    let (_, minted) = harness.post("/api/admin/bootstrap", None, None).await;
    let old = minted["token"].as_str().expect("token").to_string();
    harness
        .post(
            "/api/admin/bootstrap/confirm",
            Some(&old),
            Some(serde_json::json!({"claim_id": minted["claim_id"]})),
        )
        .await;

    let (status, rotated) = harness.post("/api/admin/rotate", Some(&old), None).await;
    assert_eq!(status, StatusCode::OK);
    let new = rotated["token"].as_str().expect("token").to_string();
    assert_ne!(new, old);

    let (status, _) = harness.get("/api/tokens/list", Some(&new)).await;
    assert_eq!(status, StatusCode::OK);
    let (status, _) = harness.get("/api/tokens/list", Some(&old)).await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn tokens_can_be_issued_listed_and_revoked_through_the_admin_port() {
    let harness = Harness::new(Some("env-admin-key".to_string()), minutes(2));
    let key = Some("env-admin-key");

    let (status, issued) = harness
        .post(
            "/api/tokens",
            key,
            Some(serde_json::json!({"label": "ci", "ttl_hours": 1, "max_requests": 5})),
        )
        .await;
    assert_eq!(status, StatusCode::OK);
    assert!(issued["token"].as_str().is_some_and(|t| !t.is_empty()));

    let (status, listed) = harness.get("/api/tokens/list", key).await;
    assert_eq!(status, StatusCode::OK);
    let records = listed["data"].as_array().expect("records");
    assert_eq!(records.len(), 1);
    let id = records[0]["id"].as_str().expect("id").to_string();
    assert_eq!(records[0]["label"], "ci");

    let (status, _) = harness
        .post(
            "/api/tokens/revoke",
            key,
            Some(serde_json::json!({"id": id})),
        )
        .await;
    assert_eq!(status, StatusCode::OK);

    let (_, listed) = harness.get("/api/tokens/list", key).await;
    assert_eq!(listed["data"][0]["revoked"], true);
}

#[tokio::test]
async fn the_ui_is_served_from_the_embedded_bundle() {
    let harness = Harness::new(None, minutes(2));
    let response = link_assistant_router::admin_api::router(harness.state.clone())
        .oneshot(build("/", "GET", None, None))
        .await
        .expect("router responds");
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(
        response
            .headers()
            .get("content-type")
            .and_then(|value| value.to_str().ok()),
        Some("text/html; charset=utf-8")
    );
    let body = response
        .into_body()
        .collect()
        .await
        .expect("body")
        .to_bytes();
    let html = String::from_utf8_lossy(&body);
    assert!(html.contains("<div id=\"root\">"), "index.html is served");
}

#[tokio::test]
async fn unknown_api_paths_do_not_fall_back_to_the_app_shell() {
    let harness = Harness::new(None, minutes(2));
    let response = link_assistant_router::admin_api::router(harness.state.clone())
        .oneshot(build("/api/does-not-exist", "GET", None, None))
        .await
        .expect("router responds");
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}
