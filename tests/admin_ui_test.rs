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

fn state_with(
    admin: Arc<AdminClaim>,
    tokens: TokenManager,
    data_dir: &std::path::Path,
) -> AppState {
    AppState {
        client: reqwest::Client::new(),
        token_manager: tokens,
        oauth_provider: link_assistant_router::oauth::OAuthProvider::new(
            data_dir.to_str().expect("utf-8 path"),
        ),
        account_router: None,
        subscription_reader: None,
        subscription_base_url: None,
        subscription_readers: vec![],
        model_catalogs: Arc::new(link_assistant_router::model_catalog::ModelCatalogCache::new()),
        subscription_cache: Arc::new(link_assistant_router::refresh::TokenCache::new()),
        upstream_base_url: "https://api.anthropic.com".to_string(),
        upstream_provider: link_assistant_router::config::UpstreamProvider::Anthropic,
        gonka: None,
        bridge_model: None,
        bridge_model_policy: link_assistant_router::bridge_selection::BridgeModelPolicy::default(),
        crater: None,
        openai_compatible: link_assistant_router::config::default_openai_compatible_config(),
        provider_store: ProviderStore::open(data_dir, "test-secret").expect("provider store"),
        logger: log_lazy::LogLazy::new(),
        admin,
        admin_key: None,
        allow_anonymous_admin: false,
        metrics: Arc::new(link_assistant_router::metrics::Metrics::default()),
        audit: Arc::new(link_assistant_router::audit::AuditLog::to_path(None)),
        request_log: Arc::new(link_assistant_router::request_log::RequestLog::new(
            data_dir.join("requests"),
            1024 * 1024,
        )),
        activitypub_actor_base_url: "https://router.example".to_string(),
        activitypub_public_key_pem:
            link_assistant_router::config::default_activitypub_public_key_pem(),
        mpp: link_assistant_router::config::default_mpp_config(),
        login_manager: link_assistant_router::login::LoginManager::new(
            link_assistant_router::login::LoginConfig::default(),
        ),
        github: link_assistant_router::github_proxy::GitHubProxyConfig::default(),
        max_proxy_request_bytes: link_assistant_router::config::DEFAULT_MAX_PROXY_REQUEST_BYTES,
    }
}

struct Harness {
    state: AppState,
    env_key: Option<String>,
    ttl: Duration,
    dir: tempfile::TempDir,
}

impl Harness {
    fn new(env_key: Option<String>, ttl: Duration) -> Self {
        let dir = tempfile::tempdir().expect("tempdir");
        Self::boot(dir, env_key, ttl)
    }

    /// Boot a router over an existing data directory — a real deployment keeps
    /// both the claim file and the token store on disk, so this is what a
    /// restart looks like.
    fn boot(dir: tempfile::TempDir, env_key: Option<String>, ttl: Duration) -> Self {
        let store: Arc<dyn link_assistant_router::storage::TokenStore> = Arc::new(
            link_assistant_router::storage::TextTokenStore::open(dir.path().join("tokens.lino"))
                .expect("token store"),
        );
        let tokens = TokenManager::with_store("test-secret", store);
        // The claim shares the router's token manager, so the credential it
        // mints is an ordinary admin-scoped `la_sk_` JWT.
        let admin = Arc::new(
            AdminClaim::load(env_key.clone(), dir.path(), ttl).with_token_manager(tokens.clone()),
        );
        Self {
            state: state_with(admin, tokens, dir.path()),
            env_key,
            ttl,
            dir,
        }
    }

    fn restart(self) -> Self {
        let Self {
            dir, env_key, ttl, ..
        } = self;
        Self::boot(dir, env_key, ttl)
    }

    /// Complete the two-phase claim and return the credential.
    async fn claim(&self, ttl_hours: Option<i64>) -> String {
        let body = ttl_hours.map(|hours| serde_json::json!({"ttl_hours": hours}));
        let (status, minted) = self
            .post("/api/management/admin/bootstrap", None, body)
            .await;
        assert_eq!(status, StatusCode::OK, "mint: {minted}");
        let token = minted["token"].as_str().expect("token").to_string();
        let (status, _) = self
            .post(
                "/api/management/admin/bootstrap/confirm",
                Some(&token),
                Some(serde_json::json!({"claim_id": minted["claim_id"]})),
            )
            .await;
        assert_eq!(status, StatusCode::OK);
        token
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
    let (status, body) = harness.get("/api/management/admin/status", None).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["claimed"], false);
    assert_eq!(body["bootstrap_open"], true);
}

#[tokio::test]
async fn admin_api_is_closed_before_a_claim_exists() {
    let harness = Harness::new(None, minutes(2));
    let (status, _) = harness.get("/api/management/tokens", None).await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);
    let (status, _) = harness.get("/api/management/admin/summary", None).await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn mint_alone_does_not_close_bootstrap_or_authorise() {
    let harness = Harness::new(None, minutes(2));
    let (status, minted) = harness
        .post("/api/management/admin/bootstrap", None, None)
        .await;
    assert_eq!(status, StatusCode::OK);
    let token = minted["token"].as_str().expect("token").to_string();

    // The candidate is not a credential yet.
    let (status, _) = harness.get("/api/management/tokens", Some(&token)).await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);

    // And the system is still unclaimed, so a lost response is recoverable.
    let (_, state) = harness.get("/api/management/admin/status", None).await;
    assert_eq!(state["claimed"], false);
    assert_eq!(state["bootstrap_open"], true);
}

#[tokio::test]
async fn confirm_activates_the_credential_and_closes_bootstrap() {
    let harness = Harness::new(None, minutes(2));
    let (_, minted) = harness
        .post("/api/management/admin/bootstrap", None, None)
        .await;
    let token = minted["token"].as_str().expect("token").to_string();
    let claim_id = minted["claim_id"].as_str().expect("claim_id").to_string();

    let (status, body) = harness
        .post(
            "/api/management/admin/bootstrap/confirm",
            Some(&token),
            Some(serde_json::json!({"claim_id": claim_id})),
        )
        .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["claimed"], true);

    let (status, _) = harness.get("/api/management/tokens", Some(&token)).await;
    assert_eq!(status, StatusCode::OK);

    let (status, _) = harness
        .post("/api/management/admin/bootstrap", None, None)
        .await;
    assert_eq!(status, StatusCode::CONFLICT);
}

#[tokio::test]
async fn confirm_requires_the_candidate_token_itself() {
    let harness = Harness::new(None, minutes(2));
    let (_, minted) = harness
        .post("/api/management/admin/bootstrap", None, None)
        .await;
    let claim_id = minted["claim_id"].as_str().expect("claim_id").to_string();

    let (status, _) = harness
        .post(
            "/api/management/admin/bootstrap/confirm",
            None,
            Some(serde_json::json!({"claim_id": claim_id.clone()})),
        )
        .await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);

    let (status, _) = harness
        .post(
            "/api/management/admin/bootstrap/confirm",
            Some("la_admin_wrong"),
            Some(serde_json::json!({"claim_id": claim_id})),
        )
        .await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);

    // Still unclaimed: a failed confirm must never brick the deployment.
    let (_, state) = harness.get("/api/management/admin/status", None).await;
    assert_eq!(state["bootstrap_open"], true);
}

#[tokio::test]
async fn only_the_first_confirmer_wins() {
    let harness = Harness::new(None, minutes(2));
    let (_, first) = harness
        .post("/api/management/admin/bootstrap", None, None)
        .await;
    let (_, second) = harness
        .post("/api/management/admin/bootstrap", None, None)
        .await;

    // The first visitor's candidate was discarded by the second mint.
    let (status, _) = harness
        .post(
            "/api/management/admin/bootstrap/confirm",
            Some(first["token"].as_str().expect("token")),
            Some(serde_json::json!({"claim_id": first["claim_id"]})),
        )
        .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);

    let (status, _) = harness
        .post(
            "/api/management/admin/bootstrap/confirm",
            Some(second["token"].as_str().expect("token")),
            Some(serde_json::json!({"claim_id": second["claim_id"]})),
        )
        .await;
    assert_eq!(status, StatusCode::OK);
}

#[tokio::test]
async fn an_expired_candidate_leaves_bootstrap_open() {
    let harness = Harness::new(None, Duration::from_secs(0));
    let (_, minted) = harness
        .post("/api/management/admin/bootstrap", None, None)
        .await;

    let (status, _) = harness
        .post(
            "/api/management/admin/bootstrap/confirm",
            Some(minted["token"].as_str().expect("token")),
            Some(serde_json::json!({"claim_id": minted["claim_id"]})),
        )
        .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);

    let (_, state) = harness.get("/api/management/admin/status", None).await;
    assert_eq!(state["bootstrap_open"], true);

    // Trying again works — this is the recovery path.
    let (status, _) = harness
        .post("/api/management/admin/bootstrap", None, None)
        .await;
    assert_eq!(status, StatusCode::OK);
}

#[tokio::test]
async fn an_environment_key_disables_bootstrap_entirely() {
    let harness = Harness::new(Some("env-admin-key".to_string()), minutes(2));
    let (_, state) = harness.get("/api/management/admin/status", None).await;
    assert_eq!(state["claimed"], true);
    assert_eq!(state["bootstrap_open"], false);
    assert_eq!(state["provisioned_by_environment"], true);

    let (status, _) = harness
        .post("/api/management/admin/bootstrap", None, None)
        .await;
    assert_eq!(status, StatusCode::CONFLICT);

    let (status, _) = harness
        .get("/api/management/admin/summary", Some("env-admin-key"))
        .await;
    assert_eq!(status, StatusCode::OK);
}

#[tokio::test]
async fn rotation_replaces_the_claimed_credential() {
    let harness = Harness::new(None, minutes(2));
    let (_, minted) = harness
        .post("/api/management/admin/bootstrap", None, None)
        .await;
    let old = minted["token"].as_str().expect("token").to_string();
    harness
        .post(
            "/api/management/admin/bootstrap/confirm",
            Some(&old),
            Some(serde_json::json!({"claim_id": minted["claim_id"]})),
        )
        .await;

    let (status, rotated) = harness
        .post("/api/management/admin/rotate", Some(&old), None)
        .await;
    assert_eq!(status, StatusCode::OK);
    let new = rotated["token"].as_str().expect("token").to_string();
    assert_ne!(new, old);

    let (status, _) = harness.get("/api/management/tokens", Some(&new)).await;
    assert_eq!(status, StatusCode::OK);
    let (status, _) = harness.get("/api/management/tokens", Some(&old)).await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn tokens_can_be_issued_listed_and_revoked_through_the_admin_port() {
    let harness = Harness::new(Some("env-admin-key".to_string()), minutes(2));
    let key = Some("env-admin-key");

    let (status, issued) = harness
        .post(
            "/api/management/tokens",
            key,
            Some(serde_json::json!({"label": "ci", "ttl_hours": 1, "max_requests": 5})),
        )
        .await;
    assert_eq!(status, StatusCode::OK);
    assert!(issued["token"].as_str().is_some_and(|t| !t.is_empty()));

    let (status, listed) = harness.get("/api/management/tokens", key).await;
    assert_eq!(status, StatusCode::OK);
    let records = listed["data"].as_array().expect("records");
    assert_eq!(records.len(), 1);
    let id = records[0]["id"].as_str().expect("id").to_string();
    assert_eq!(records[0]["label"], "ci");

    let (status, _) = harness
        .post(
            "/api/management/tokens/revoke",
            key,
            Some(serde_json::json!({"id": id})),
        )
        .await;
    assert_eq!(status, StatusCode::OK);

    let (_, listed) = harness.get("/api/management/tokens", key).await;
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

// ---------------------------------------------------------------------------
// The credential model itself: what the first visitor actually receives.
// ---------------------------------------------------------------------------

#[tokio::test]
async fn the_first_visitor_receives_an_admin_scoped_jwt() {
    let harness = Harness::new(None, minutes(2));
    let token = harness.claim(None).await;
    assert!(
        token.starts_with(link_assistant_router::token::TOKEN_PREFIX),
        "the web claim mints the same credential model as everything else: {token}"
    );

    let claims = harness
        .state
        .token_manager
        .validate_admin_token(&token)
        .expect("an admin-scoped JWT");
    assert!(!claims.sub.is_empty(), "the credential has an identity");
    assert_eq!(claims.scope, link_assistant_router::token::ADMIN_SCOPE);
    assert!(claims.exp > claims.iat, "and a lifetime");
    assert_eq!(claims.label, "first-visitor-admin");

    let (_, status) = harness.get("/api/management/admin/status", None).await;
    assert_eq!(status["credential_kind"], "jwt");
    assert_eq!(status["token_id"], claims.sub);
}

#[tokio::test]
async fn the_first_administrator_may_limit_the_credential_lifetime() {
    let harness = Harness::new(None, minutes(2));
    let (_, minted) = harness
        .post(
            "/api/management/admin/bootstrap",
            None,
            Some(serde_json::json!({"ttl_hours": 3})),
        )
        .await;
    assert_eq!(minted["ttl_hours"], 3);
    let token = minted["token"].as_str().expect("token").to_string();
    harness
        .post(
            "/api/management/admin/bootstrap/confirm",
            Some(&token),
            Some(serde_json::json!({"claim_id": minted["claim_id"]})),
        )
        .await;

    let claims = harness
        .state
        .token_manager
        .validate_admin_token(&token)
        .expect("claims");
    assert_eq!(
        claims.exp - claims.iat,
        3 * 3600,
        "the chosen TTL is honoured"
    );
}

#[tokio::test]
async fn claiming_retires_the_startup_bootstrap_credential() {
    let harness = Harness::new(None, minutes(2));
    // What `main` prints at startup so a fresh deployment is administrable.
    let bootstrap = harness
        .state
        .token_manager
        .issue_admin_token(24, "bootstrap-admin")
        .expect("bootstrap token");
    let (status, _) = harness
        .get("/api/management/tokens", Some(&bootstrap))
        .await;
    assert_eq!(status, StatusCode::OK, "it administers the router");

    let claimed = harness.claim(None).await;

    // One credential model means the superseded one is retired, not merely
    // ignored: the API says so, so the UI, the CLI and the bots agree.
    let (status, _) = harness
        .get("/api/management/tokens", Some(&bootstrap))
        .await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);
    let (_, listed) = harness.get("/api/management/tokens", Some(&claimed)).await;
    let records = listed["data"].as_array().expect("records");
    let retired = records
        .iter()
        .find(|record| record["label"] == "bootstrap-admin")
        .expect("the startup token is still listed");
    assert_eq!(retired["revoked"], true, "and shown as revoked: {retired}");
}

#[tokio::test]
async fn a_claimed_credential_survives_a_restart() {
    let harness = Harness::new(None, minutes(2));
    let token = harness.claim(None).await;

    let harness = harness.restart();
    let (_, status) = harness.get("/api/management/admin/status", None).await;
    assert_eq!(status["claimed"], true);
    assert_eq!(status["bootstrap_open"], false);
    let (status, _) = harness.get("/api/management/tokens", Some(&token)).await;
    assert_eq!(
        status,
        StatusCode::OK,
        "the credential the operator stored still works after a restart"
    );
}

#[tokio::test]
async fn rotation_is_atomic_across_a_restart() {
    let harness = Harness::new(None, minutes(2));
    let old = harness.claim(None).await;
    let (_, before) = harness.get("/api/management/admin/status", None).await;

    let (status, rotated) = harness
        .post("/api/management/admin/rotate", Some(&old), None)
        .await;
    assert_eq!(status, StatusCode::OK);
    let new = rotated["token"].as_str().expect("token").to_string();
    assert_eq!(rotated["credential_kind"], "jwt");
    assert_ne!(
        rotated["token_id"], before["token_id"],
        "rotation mints a new identity"
    );

    // Both halves of the swap are on disk: the new credential is the claim and
    // the old one is revoked by id.
    let harness = harness.restart();
    let (status, _) = harness.get("/api/management/tokens", Some(&new)).await;
    assert_eq!(status, StatusCode::OK);
    let (status, _) = harness.get("/api/management/tokens", Some(&old)).await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn an_expired_credential_stops_administering() {
    let harness = Harness::new(None, minutes(2));
    harness.claim(Some(1)).await;

    // Age the deployment past its TTL: the claim names an admin JWT that has
    // expired. Nothing else about the router changes.
    let stale = harness
        .state
        .token_manager
        .issue_admin_token(-1, "aged-admin")
        .expect("issue");
    let id = harness
        .state
        .token_manager
        .list_tokens()
        .expect("list")
        .into_iter()
        .find(|record| record.label == "aged-admin")
        .expect("record")
        .id;
    std::fs::write(
        harness
            .dir
            .path()
            .join(link_assistant_router::admin::CLAIM_FILE_NAME),
        serde_json::json!({"token_id": id, "ttl_hours": 1, "claimed_at": 1}).to_string(),
    )
    .expect("write claim");

    let harness = harness.restart();
    let (_, status) = harness.get("/api/management/admin/status", None).await;
    assert_eq!(status["claimed"], true, "the claim is still on record");
    let (status, _) = harness.get("/api/management/tokens", Some(&stale)).await;
    assert_eq!(
        status,
        StatusCode::UNAUTHORIZED,
        "expiry is enforced on the admin surface like any other token"
    );
}

/// `GET /api/management/accounts` must report a credential that cannot serve a
/// request as unhealthy, and say why.
///
/// The admin API is what the UI and any automated health check read. It
/// reported `healthy: true` for an account whose token was expired with no
/// refresh token left, because health consulted only an in-memory cooldown
/// timer that is unset until a live request has already failed (issue #242).
/// The endpoint's payload had no test at all, only its authorisation.
#[tokio::test]
async fn the_accounts_endpoint_reports_a_dead_credential_as_unhealthy() {
    let mut harness = Harness::new(None, Duration::from_secs(60));
    let credentials = tempfile::tempdir().expect("credential home");
    // Expired, and nothing left to refresh with: terminally unusable.
    std::fs::write(
        credentials.path().join("credentials.json"),
        r#"{"claudeAiOauth":{"accessToken":"sk-ant-oat01-probe","expiresAt":1600000000000}}"#,
    )
    .expect("write the credential");
    harness.state.account_router = Some(link_assistant_router::accounts::AccountRouter::new(
        credentials.path().to_path_buf(),
        &[],
        link_assistant_router::accounts::SelectionStrategy::RoundRobin,
        Duration::from_secs(60),
    ));
    let token = harness.claim(None).await;

    let (status, body) = harness.get("/api/management/accounts", Some(&token)).await;

    assert_eq!(status, StatusCode::OK, "{body}");
    let account = &body["accounts"][0];
    assert_eq!(
        account["healthy"], false,
        "dead credential reported healthy"
    );
    assert_eq!(account["credential"], "expired");
}

/// The chat `/status` summary must name *why* an account is unhealthy.
///
/// An account that failed a live request carries a `last_error` to print. One
/// that was never tried does not, so before this the line degraded to a bare
/// "unhealthy" — which is the same non-answer `accounts list` used to give
/// (issue #242). The credential state is the reason, so it is what gets shown.
#[test]
fn the_chat_status_summary_names_why_an_account_is_unhealthy() {
    use link_assistant_router::chat_commands::RouterStatus as _;

    let dir = tempfile::tempdir().expect("tempdir");
    let store: Arc<dyn link_assistant_router::storage::TokenStore> = Arc::new(
        link_assistant_router::storage::TextTokenStore::open(dir.path().join("tokens.lino"))
            .expect("token store"),
    );
    let tokens = TokenManager::with_store("test-secret", store);
    let admin = Arc::new(AdminClaim::in_memory(None, Duration::from_secs(60)));
    let mut state = state_with(admin, tokens, dir.path());

    let credentials = tempfile::tempdir().expect("credential home");
    std::fs::write(
        credentials.path().join("credentials.json"),
        r#"{"claudeAiOauth":{"accessToken":"sk-ant-oat01-probe","expiresAt":1600000000000}}"#,
    )
    .expect("write the credential");
    state.account_router = Some(link_assistant_router::accounts::AccountRouter::new(
        credentials.path().to_path_buf(),
        &[],
        link_assistant_router::accounts::SelectionStrategy::RoundRobin,
        Duration::from_secs(60),
    ));

    let lines = state.status_lines().join("\n");

    assert!(lines.contains("Accounts: 0/1 healthy"), "{lines}");
    assert!(lines.contains("primary: expired"), "{lines}");
}

/// `GET /api/management/accounts` must not call a revoked chain `refreshable`.
///
/// The endpoint is what the admin UI and any automated health check read. A
/// revoked refresh token is still a non-empty string on disk, so the file alone
/// cannot tell it from a live one; the refresh ladder can, and until now the
/// endpoint never asked it (issue #245).
#[tokio::test]
async fn the_accounts_endpoint_reports_a_refused_chain_as_rejected() {
    let mut harness = Harness::new(None, Duration::from_secs(60));
    let credentials = tempfile::tempdir().expect("credential home");
    std::fs::write(
        credentials.path().join("credentials.json"),
        r#"{"claudeAiOauth":{"accessToken":"sk-ant-oat01-probe","refreshToken":"revoked-chain","expiresAt":1600000000000}}"#,
    )
    .expect("write the credential");
    harness.state.account_router = Some(link_assistant_router::accounts::AccountRouter::new(
        credentials.path().to_path_buf(),
        &[],
        link_assistant_router::accounts::SelectionStrategy::RoundRobin,
        Duration::from_secs(60),
    ));
    let token = harness.claim(None).await;

    // With nothing yet known, "expired but holds a refresh token" is honest.
    let (_, before) = harness.get("/api/management/accounts", Some(&token)).await;
    assert_eq!(before["accounts"][0]["credential"], "refreshable");
    assert_eq!(before["accounts"][0]["healthy"], true);

    // The ladder is refused for exactly this credential.
    harness.state.subscription_cache.record_refresh_refused(
        link_assistant_router::subscription::SubscriptionProvider::Claude,
        "primary",
        &link_assistant_router::subscription::SubscriptionToken {
            access_token: "sk-ant-oat01-probe".into(),
            refresh_token: Some("revoked-chain".into()),
            expires_at_ms: Some(1_600_000_000_000),
            account_id: None,
            resource_url: None,
        },
    );

    let (status, body) = harness.get("/api/management/accounts", Some(&token)).await;

    assert_eq!(status, StatusCode::OK, "{body}");
    assert_eq!(body["accounts"][0]["credential"], "rejected");
    assert_eq!(
        body["accounts"][0]["healthy"], false,
        "a refused chain reported healthy"
    );
}
