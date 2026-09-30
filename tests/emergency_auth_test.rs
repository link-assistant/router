//! Emergency any-token mode (issue #645) and token authentication
//! diagnostics (issue #644), driven through the real router with its
//! authentication middleware.
//!
//! The tests pin the contract documented in `docs/security/emergency-auth.md`:
//!
//! * the mode is off unless explicitly enabled, and off means every existing
//!   check applies unchanged;
//! * on, any non-empty token in any client carrier passes client routes, and a
//!   request with no token is still refused;
//! * management routes keep normal admin authentication;
//! * nothing in the durable token store is written: a revoked token is not
//!   revived, a budget is not consumed, and disabling restores every check on
//!   the very next request;
//! * each authentication failure is counted under its own reason without the
//!   token value ever appearing in diagnostics.

use std::sync::Arc;
use std::time::Duration;

use axum::body::Body;
use axum::http::{Method, Request, StatusCode};
use http_body_util::BodyExt as _;
use link_assistant_router::admin::AdminClaim;
use link_assistant_router::app_state::AppState;
use link_assistant_router::cli::Cli;
use link_assistant_router::config::StoragePolicy;
use link_assistant_router::emergency_auth::{EmergencyAuthConfig, HEALTH_HEADER};
use link_assistant_router::model_catalog::ModelCatalogCache;
use link_assistant_router::oauth::OAuthProvider;
use link_assistant_router::providers::ProviderStore;
use link_assistant_router::refresh::TokenCache;
use link_assistant_router::storage::build_token_store;
use link_assistant_router::token::{IssueRequest, TokenManager};
use lino_arguments::Parser as _;
use serde_json::Value;
use tower::ServiceExt as _;

const SECRET: &str = "emergency-test-secret";
const ADMIN_KEY: &str = "emergency-admin-key";
/// A client route that answers without an upstream once authenticated.
const CLIENT_ROUTE: &str = "/api/models";
/// Claude Code's user agent, the client evidence for Bearer and `x-api-key`.
const CLAUDE_USER_AGENT: &str = "claude-cli/2.0.0 (external, cli)";

struct Harness {
    app: axum::Router,
    manager: TokenManager,
    dir: tempfile::TempDir,
}

impl Harness {
    /// A router over a durable text token store in a fresh data root.
    fn new() -> Self {
        let dir = tempfile::tempdir().expect("tempdir");
        let store = build_token_store(StoragePolicy::Text, dir.path()).expect("token store");
        let manager = TokenManager::with_store(SECRET, store);
        let app = router(dir.path(), manager.clone());
        Self { app, manager, dir }
    }

    /// The same data root served by a fresh process: a restart.
    fn restart(&self) -> axum::Router {
        let store = build_token_store(StoragePolicy::Text, self.dir.path()).expect("token store");
        router(self.dir.path(), TokenManager::with_store(SECRET, store))
    }

    fn tokens_file(&self) -> Vec<u8> {
        std::fs::read(self.dir.path().join("tokens.lino")).unwrap_or_default()
    }

    fn issue(&self, max_requests: Option<u64>) -> String {
        self.manager
            .issue(&IssueRequest {
                ttl_hours: 1,
                label: "emergency client",
                account: Some("alice"),
                max_requests,
                max_tokens: None,
                rate_limit_per_minute: None,
                scope: "",
                github_repos: Vec::new(),
                sliding_window_seconds: None,
                client_kind: Some("claude"),
                principal_id: Some("alice"),
            })
            .expect("issue client token")
    }

    fn issue_bound(&self) -> String {
        self.manager
            .issue(&IssueRequest {
                ttl_hours: 1,
                label: "bound client",
                account: Some("alice"),
                max_requests: None,
                max_tokens: None,
                rate_limit_per_minute: None,
                scope: "",
                github_repos: Vec::new(),
                sliding_window_seconds: None,
                client_kind: Some("gemini"),
                principal_id: Some("alice"),
            })
            .expect("issue bound client token")
    }
}

fn router(dir: &std::path::Path, token_manager: TokenManager) -> axum::Router {
    let dir_arg = dir.to_str().expect("UTF-8 test path");
    let config = Cli::try_parse_from(vec![
        "router",
        "--token-secret",
        SECRET,
        "--data-dir",
        dir_arg,
        "--upstream-base-url",
        "http://127.0.0.1:9",
    ])
    .expect("test CLI parses")
    .into_config()
    .expect("test config is valid");
    let state = AppState {
        client: reqwest::Client::new(),
        token_manager,
        oauth_provider: OAuthProvider::new(dir_arg),
        account_router: None,
        subscription_reader: None,
        subscription_base_url: None,
        subscription_readers: vec![],
        model_catalogs: Arc::new(ModelCatalogCache::new()),
        subscription_cache: Arc::new(TokenCache::new()),
        upstream_base_url: config.upstream_base_url.clone(),
        upstream_provider: config.upstream_provider,
        gonka: None,
        bridge_model: None,
        bridge_model_policy: link_assistant_router::bridge_selection::BridgeModelPolicy::default(),
        crater: None,
        openai_compatible: config.openai_compatible.clone(),
        provider_store: ProviderStore::open(dir, SECRET).expect("provider store"),
        logger: log_lazy::LogLazy::new(),
        admin: Arc::new(AdminClaim::load(
            Some(ADMIN_KEY.to_string()),
            dir,
            Duration::from_secs(60),
        )),
        admin_key: Some(ADMIN_KEY.to_string()),
        allow_anonymous_admin: false,
        metrics: Arc::new(link_assistant_router::metrics::Metrics::default()),
        audit: Arc::new(link_assistant_router::audit::AuditLog::disabled()),
        request_log: Arc::new(link_assistant_router::request_log::RequestLog::new(
            dir.join("requests"),
            1024 * 1024,
        )),
        activitypub_actor_base_url: "https://router.test".to_string(),
        activitypub_public_key_pem:
            link_assistant_router::config::default_activitypub_public_key_pem(),
        mpp: config.mpp.clone(),
        login_manager: link_assistant_router::login::LoginManager::new(config.login.clone()),
        github: link_assistant_router::github_proxy::GitHubProxyConfig::default(),
        max_proxy_request_bytes: link_assistant_router::config::DEFAULT_MAX_PROXY_REQUEST_BYTES,
    };
    link_assistant_router::server_router::router(state, &config)
}

/// Every header a supported client may carry its Router token in.
fn carriers(token: &str) -> Vec<(&'static str, String)> {
    vec![
        ("authorization", format!("Bearer {token}")),
        ("x-api-key", token.to_string()),
        ("x-goog-api-key", token.to_string()),
    ]
}

async fn send(
    app: &axum::Router,
    method: Method,
    path: &str,
    header: Option<(&str, String)>,
) -> (StatusCode, axum::http::HeaderMap, Value) {
    let mut request = Request::builder()
        .method(method)
        .uri(path)
        .header("content-type", "application/json");
    if let Some((name, value)) = header {
        // The evidence a real client sends with that carrier: the emergency
        // mode bypasses token checks, not the client/provider entitlement
        // matrix, which still needs to know which client is calling.
        if name != "x-goog-api-key" {
            request = request.header("user-agent", CLAUDE_USER_AGENT);
        }
        request = request.header(name, value);
    }
    let response = app
        .clone()
        .oneshot(request.body(Body::empty()).expect("request"))
        .await
        .expect("router response");
    let status = response.status();
    let headers = response.headers().clone();
    let body = response
        .into_body()
        .collect()
        .await
        .expect("response body")
        .to_bytes();
    let body = serde_json::from_slice(&body)
        .unwrap_or_else(|_| Value::String(String::from_utf8_lossy(&body).into_owned()));
    (status, headers, body)
}

async fn client_status(app: &axum::Router, header: Option<(&str, String)>) -> StatusCode {
    send(app, Method::GET, CLIENT_ROUTE, header).await.0
}

/// Authentication refusals: 401 for an unusable token, 403 for a revoked one.
fn is_refusal(status: StatusCode) -> bool {
    status == StatusCode::UNAUTHORIZED || status == StatusCode::FORBIDDEN
}

#[allow(clippy::unnecessary_wraps)] // Reads as the header argument it is.
fn admin() -> Option<(&'static str, String)> {
    Some(("authorization", format!("Bearer {ADMIN_KEY}")))
}

/// A token signed with this deployment's secret whose `exp` has passed.
fn expired_token() -> String {
    let now = chrono::Utc::now().timestamp();
    let claims = serde_json::json!({
        "sub": uuid::Uuid::new_v4().to_string(),
        "iat": now - 7200,
        "exp": now - 3600,
        "label": "expired",
    });
    let jwt = jsonwebtoken::encode(
        &jsonwebtoken::Header::default(),
        &claims,
        &jsonwebtoken::EncodingKey::from_secret(SECRET.as_bytes()),
    )
    .expect("sign expired token");
    format!("la_sk_{jwt}")
}

/// Tokens of every kind that normal authentication refuses.
fn refused_tokens(harness: &Harness) -> Vec<(&'static str, String)> {
    let revoked = harness.issue(None);
    let revoked_id = harness
        .manager
        .validate_token(&revoked)
        .expect("valid before revocation")
        .sub;
    harness.manager.revoke_token(&revoked_id).expect("revoke");
    vec![
        ("garbage la_sk_", "la_sk_not-a-jwt".to_string()),
        ("garbage at-", "at-not-a-jwt".to_string()),
        ("no prefix", "sk-ant-something-else".to_string()),
        (
            "foreign secret",
            TokenManager::new("another-routers-secret")
                .issue_token(1, "foreign")
                .expect("foreign token"),
        ),
        ("expired", expired_token()),
        ("revoked", revoked),
    ]
}

#[tokio::test]
async fn off_by_default_every_refused_token_stays_refused_in_every_carrier() {
    let harness = Harness::new();
    assert!(!harness.manager.emergency().is_active());
    for (kind, token) in refused_tokens(&harness) {
        for (carrier, value) in carriers(&token) {
            let status = client_status(&harness.app, Some((carrier, value))).await;
            assert!(
                is_refusal(status),
                "{kind} in {carrier} must be refused while the mode is off, got {status}"
            );
        }
    }
    // Valid tokens bound to the client each carrier belongs to still pass.
    let claude = harness.issue(None);
    let gemini = harness.issue_bound();
    for (carrier, value) in carriers(&claude)
        .into_iter()
        .filter(|(carrier, _)| *carrier != "x-goog-api-key")
        .chain([("x-goog-api-key", gemini)])
    {
        assert_eq!(
            client_status(&harness.app, Some((carrier, value))).await,
            StatusCode::OK,
            "a valid token in {carrier} must pass"
        );
    }
}

#[tokio::test]
async fn on_any_token_in_any_carrier_passes_but_no_token_is_still_refused() {
    let harness = Harness::new();
    let tokens = refused_tokens(&harness);
    harness.manager.emergency().enable_for_minutes(5);
    for (kind, token) in &tokens {
        for (carrier, value) in carriers(token) {
            assert_eq!(
                client_status(&harness.app, Some((carrier, value))).await,
                StatusCode::OK,
                "{kind} in {carrier} must pass while the mode is on"
            );
        }
    }
    assert_eq!(
        client_status(&harness.app, None).await,
        StatusCode::UNAUTHORIZED,
        "a request with no token is refused even in emergency mode"
    );
    let status = harness.manager.emergency().status();
    assert!(status.active);
    assert_eq!(
        status.bypassed_requests,
        u64::try_from(tokens.len() * 3).expect("count fits")
    );
    for reason in [
        "malformed",
        "invalid_prefix",
        "signature_invalid",
        "expired",
        "revoked",
    ] {
        assert!(
            status.bypassed_by_reason.contains_key(reason),
            "bypass reason {reason} missing from {:?}",
            status.bypassed_by_reason
        );
    }
}

#[tokio::test]
async fn management_routes_keep_normal_admin_authentication() {
    let harness = Harness::new();
    harness.manager.emergency().enable_for_minutes(5);
    let client = harness.issue(None);
    for token in ["la_sk_not-a-jwt".to_string(), client] {
        for path in [
            "/api/management/tokens",
            "/api/management/emergency-auth",
            "/api/management/auth/diagnostics",
        ] {
            let (status, _, _) = send(
                &harness.app,
                Method::GET,
                path,
                Some(("authorization", format!("Bearer {token}"))),
            )
            .await;
            assert_eq!(
                status,
                StatusCode::UNAUTHORIZED,
                "{path} must not open to a client token in emergency mode"
            );
        }
    }
    let (status, _, _) = send(
        &harness.app,
        Method::POST,
        "/api/management/emergency-auth/disable",
        Some(("authorization", "Bearer la_sk_not-a-jwt".to_string())),
    )
    .await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);
    assert!(harness.manager.emergency().is_active());
}

#[tokio::test]
async fn the_token_store_is_never_written_and_nothing_is_revived() {
    let harness = Harness::new();
    let tokens = refused_tokens(&harness);
    let revoked = tokens
        .iter()
        .find(|(kind, _)| *kind == "revoked")
        .expect("revoked token")
        .1
        .clone();
    let budgeted = harness.issue(Some(1));
    let before = harness.tokens_file();
    assert!(!before.is_empty(), "the text store holds the records");

    harness.manager.emergency().enable_for_minutes(5);
    for _ in 0..3 {
        for token in [&revoked, &budgeted] {
            assert_eq!(
                client_status(&harness.app, Some(("x-api-key", token.clone()))).await,
                StatusCode::OK
            );
        }
    }
    assert_eq!(
        harness.tokens_file(),
        before,
        "emergency traffic must not rewrite tokens.lino"
    );

    assert!(harness.manager.emergency().disable());
    assert_eq!(
        client_status(&harness.app, Some(("x-api-key", revoked))).await,
        StatusCode::FORBIDDEN,
        "a revoked token is not revived by the mode"
    );
    let budgeted_id = harness
        .manager
        .validate_token(&budgeted)
        .expect("budgeted token is valid")
        .sub;
    assert!(
        harness
            .manager
            .enforce_request_budget_reserving(&budgeted_id, 0)
            .is_ok(),
        "the one-request budget was not consumed by emergency traffic"
    );
    assert!(
        harness
            .manager
            .enforce_request_budget_reserving(&budgeted_id, 0)
            .is_err(),
        "normal budget enforcement resumes after disable"
    );
}

#[tokio::test]
async fn disabling_through_the_api_restores_checks_on_the_next_request() {
    let harness = Harness::new();
    harness.manager.emergency().enable_for_minutes(5);
    let garbage = Some(("authorization", "Bearer la_sk_garbage".to_string()));
    assert_eq!(
        client_status(&harness.app, garbage.clone()).await,
        StatusCode::OK
    );

    let (status, _, body) = send(
        &harness.app,
        Method::GET,
        "/api/management/emergency-auth",
        admin(),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "{body}");
    assert_eq!(body["active"], true, "{body}");
    assert_eq!(body["bypassed_requests"], 1, "{body}");

    let (status, _, body) = send(
        &harness.app,
        Method::POST,
        "/api/management/emergency-auth/disable",
        admin(),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "{body}");
    assert_eq!(body["was_active"], true, "{body}");
    assert_eq!(body["status"]["active"], false, "{body}");

    assert_eq!(
        client_status(&harness.app, garbage).await,
        StatusCode::UNAUTHORIZED
    );
}

#[tokio::test]
async fn a_restart_without_the_flag_comes_back_with_normal_checks() {
    let harness = Harness::new();
    harness.manager.emergency().enable_for_minutes(5);
    let garbage = Some(("x-api-key", "la_sk_garbage".to_string()));
    assert_eq!(
        client_status(&harness.app, garbage.clone()).await,
        StatusCode::OK
    );
    let restarted = harness.restart();
    assert_eq!(
        client_status(&restarted, garbage).await,
        StatusCode::UNAUTHORIZED,
        "the mode is process state only and never persists across a restart"
    );
}

#[tokio::test]
async fn health_and_metrics_warn_while_the_mode_is_on() {
    let harness = Harness::new();
    let (status, headers, body) = send(&harness.app, Method::GET, "/api/health", None).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body, Value::String("ok".into()));
    assert!(headers.get(HEALTH_HEADER).is_none());

    harness.manager.emergency().enable_for_minutes(5);
    let (status, headers, body) = send(&harness.app, Method::GET, "/api/health", None).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(
        body,
        Value::String("ok".into()),
        "probes keep their bare ok"
    );
    let warning = headers
        .get(HEALTH_HEADER)
        .and_then(|value| value.to_str().ok())
        .expect("emergency header present");
    assert!(warning.starts_with("active; expires_at="), "{warning}");

    let _ = client_status(&harness.app, Some(("x-api-key", "la_sk_garbage".into()))).await;
    let (status, _, body) = send(
        &harness.app,
        Method::GET,
        "/api/management/metrics",
        admin(),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    let text = body.as_str().expect("prometheus text");
    assert!(
        text.contains("link_assistant_emergency_auth_active 1"),
        "{text}"
    );
    assert!(
        text.contains("link_assistant_emergency_auth_bypassed_total{reason=\"malformed\"} 1"),
        "{text}"
    );
    assert!(!text.contains("la_sk_garbage"));

    let (_, _, summary) = send(
        &harness.app,
        Method::GET,
        "/api/management/admin/summary",
        admin(),
    )
    .await;
    assert_eq!(summary["emergency_auth"]["active"], true, "{summary}");
}

#[tokio::test]
async fn concurrent_emergency_requests_are_all_counted() {
    let harness = Harness::new();
    harness.manager.emergency().enable_for_minutes(5);
    let requests = (0..32).map(|index| {
        let app = harness.app.clone();
        async move {
            client_status(
                &app,
                Some(("authorization", format!("Bearer la_sk_garbage_{index}"))),
            )
            .await
        }
    });
    let statuses = futures_util::future::join_all(requests).await;
    assert!(statuses.iter().all(|status| *status == StatusCode::OK));
    assert_eq!(harness.manager.emergency().status().bypassed_requests, 32);
}

/// The rollback scenario of issue #644: the server now answering holds a
/// store without the live client's record. Every failure class must be told
/// apart on the protected endpoint, and no token value may appear there.
#[tokio::test]
async fn diagnostics_distinguish_each_failure_without_token_values() {
    let harness = Harness::new();
    let tokens = refused_tokens(&harness);

    // A bound client token minted by the same issuer but whose record lives
    // in another data root: what a rollback to an older store looks like.
    let other = Harness::new();
    let missing_record = other.issue_bound();

    let mut presented = tokens.clone();
    presented.push(("missing record", missing_record));
    for (_, token) in &presented {
        let _ = client_status(&harness.app, Some(("x-api-key", token.clone()))).await;
    }
    let _ = client_status(&harness.app, None).await;

    let (status, _, body) = send(
        &harness.app,
        Method::GET,
        "/api/management/auth/diagnostics",
        admin(),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "{body}");
    let reasons = &body["diagnostics"]["failures_by_reason"];
    for reason in [
        "malformed",
        "invalid_prefix",
        "signature_invalid",
        "expired",
        "revoked",
        "missing_record",
        "missing_credential",
    ] {
        assert!(
            reasons[reason].as_u64().unwrap_or(0) >= 1,
            "{reason} not recorded: {reasons}"
        );
    }
    assert_eq!(body["emergency_auth"]["active"], false);
    let rendered = body.to_string();
    for (kind, token) in &presented {
        let jwt = token.trim_start_matches("la_sk_").trim_start_matches("at-");
        assert!(
            !rendered.contains(jwt),
            "{kind} token text leaked into diagnostics"
        );
    }
}

#[test]
fn the_cli_keeps_the_mode_off_unless_asked_and_parses_the_explicit_flags() {
    let defaults = Cli::try_parse_from(["router", "--token-secret", SECRET])
        .expect("parses")
        .into_config()
        .expect("config");
    assert!(!defaults.emergency_auth.enabled);

    let config = Cli::try_parse_from([
        "router",
        "--token-secret",
        SECRET,
        "--emergency-accept-any-token",
        "--emergency-duration-minutes",
        "15",
    ])
    .expect("parses")
    .into_config()
    .expect("config");
    assert_eq!(
        config.emergency_auth,
        EmergencyAuthConfig {
            enabled: true,
            allow_non_loopback: false,
            duration_minutes: 15,
        }
    );
    let loopback: std::net::SocketAddr = "127.0.0.1:8080".parse().expect("addr");
    let exposed: std::net::SocketAddr = "0.0.0.0:8080".parse().expect("addr");
    assert!(config.emergency_auth.check(&[loopback]).is_ok());
    let refusal = config
        .emergency_auth
        .check(&[exposed])
        .expect_err("non-loopback needs an acknowledgement");
    assert!(
        refusal.contains("--emergency-allow-non-loopback"),
        "{refusal}"
    );
    let acknowledged = EmergencyAuthConfig {
        allow_non_loopback: true,
        ..config.emergency_auth
    };
    assert!(acknowledged.check(&[exposed]).is_ok());
}
