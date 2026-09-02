//! Regression tests for the security review of issue #52.
//!
//! Each test here pins one property that the review checked by hand, so that a
//! later refactor cannot quietly undo it:
//!
//! * the bootstrap claim can be won exactly once, no matter which channel wins
//!   it — the web UI and the chat bots share one claim;
//! * an ordinary client token is never enough where an admin credential is
//!   required, on either port;
//! * the read-only endpoints that name tokens, accounts and filesystem paths
//!   are admin-only on the network-facing proxy port;
//! * the admin listener hardens its responses, because its client keeps the
//!   credential in `localStorage`.

use std::sync::Arc;
use std::time::Duration;

use axum::body::Body;
use axum::http::{Request, StatusCode, header};
use http_body_util::BodyExt;
use link_assistant_router::admin::AdminClaim;
use link_assistant_router::app_state::AppState;
use link_assistant_router::chat_admin::{ChatAdmin, ChatAdminConfig, ChatChannel};
use link_assistant_router::cli::Cli;
use link_assistant_router::providers::ProviderStore;
use link_assistant_router::token::TokenManager;
use lino_arguments::Parser as _;
use tower::ServiceExt;

/// A claim that has to be won, with a generous candidate TTL.
fn claim(dir: &std::path::Path) -> Arc<AdminClaim> {
    Arc::new(AdminClaim::load(None, dir, Duration::from_secs(120)))
}

fn state_with(admin: Arc<AdminClaim>, data_dir: &std::path::Path) -> AppState {
    AppState {
        client: reqwest::Client::new(),
        token_manager: TokenManager::new("test-secret"),
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

/// The combined network listener with its real route-level authentication.
fn proxy_router(state: AppState, data_dir: &std::path::Path) -> axum::Router {
    let config = Cli::try_parse_from([
        "router",
        "--token-secret",
        "test-secret",
        "--data-dir",
        data_dir.to_str().expect("UTF-8 data directory"),
    ])
    .expect("test CLI parses")
    .into_config()
    .expect("test config is valid");
    link_assistant_router::server_router::router(state, &config)
}

fn get_request(path: &str, token: Option<&str>) -> Request<Body> {
    let mut request = Request::builder().method("GET").uri(path);
    if let Some(token) = token {
        request = request.header("authorization", format!("Bearer {token}"));
    }
    request.body(Body::empty()).expect("request")
}

async fn status_of(router: axum::Router, path: &str, token: Option<&str>) -> StatusCode {
    router
        .oneshot(get_request(path, token))
        .await
        .expect("router responds")
        .status()
}

/// The whole point of the two-phase claim is that exactly one visitor becomes
/// the administrator. The web UI and the chat bots hold the *same*
/// [`AdminClaim`], so a claim won in chat must close bootstrap for HTTP.
#[tokio::test]
async fn the_bootstrap_claim_can_be_won_only_once_across_channels() {
    let dir = tempfile::tempdir().expect("tempdir");
    let admin = claim(dir.path());
    let chat = ChatAdmin::new(
        Arc::clone(&admin),
        TokenManager::new("test-secret"),
        None,
        ChatAdminConfig::default(),
    );

    // Chat wins the race: mint a candidate and confirm it by sending it back.
    let minted = chat.handle(ChatChannel::Telegram, "1", "/start").text;
    let token = minted
        .split_whitespace()
        .find(|word| word.starts_with(link_assistant_router::admin::ADMIN_TOKEN_PREFIX))
        .expect("the mint reply carries the candidate token")
        .to_string();
    let confirmed = chat.handle(ChatChannel::Telegram, "1", &token).text;
    assert!(
        admin.status().claimed,
        "confirming in chat must claim the router: {confirmed}"
    );

    // HTTP now finds bootstrap closed, and a second chat user gets nothing.
    let state = state_with(Arc::clone(&admin), dir.path());
    let response = link_assistant_router::admin_api::router(state)
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/management/admin/bootstrap")
                .body(Body::empty())
                .expect("request"),
        )
        .await
        .expect("router responds");
    assert_eq!(
        response.status(),
        StatusCode::CONFLICT,
        "a claim won in chat must close the HTTP bootstrap"
    );
    let second = chat.handle(ChatChannel::Vk, "999", "/start").text;
    assert!(
        !second.contains(link_assistant_router::admin::ADMIN_TOKEN_PREFIX),
        "a second channel must not be handed a candidate: {second}"
    );
}

/// An ordinary client token authorises API traffic, never administration.
#[tokio::test]
async fn a_client_token_is_refused_where_an_admin_credential_is_required() {
    let dir = tempfile::tempdir().expect("tempdir");
    let state = state_with(claim(dir.path()), dir.path());
    let client_token = state
        .token_manager
        .issue_token(1, "ordinary client")
        .expect("issue");

    assert_eq!(
        status_of(
            link_assistant_router::admin_api::router(state.clone()),
            "/api/management/admin/summary",
            Some(&client_token),
        )
        .await,
        StatusCode::UNAUTHORIZED,
        "the admin port must not accept a client token"
    );
    assert_eq!(
        status_of(
            proxy_router(state, dir.path()),
            "/api/management/usage",
            Some(&client_token),
        )
        .await,
        StatusCode::UNAUTHORIZED,
        "the proxy port must not accept a client token for admin reads"
    );
}

/// `/api/management/usage` names tokens and `/api/management/accounts` names
/// credential directories.
/// Both are served on the port that faces the network, so both need the admin
/// credential, as do metrics and subscription health in the management namespace.
#[tokio::test]
async fn every_management_read_endpoint_requires_an_administrator() {
    let dir = tempfile::tempdir().expect("tempdir");
    let state = state_with(claim(dir.path()), dir.path());
    let admin_token = state
        .token_manager
        .issue_admin_token(1, "ops")
        .expect("issue admin");

    for path in [
        "/api/management/usage",
        "/api/management/accounts",
        "/api/management/metrics",
        "/api/management/health/subscriptions",
    ] {
        assert_eq!(
            status_of(proxy_router(state.clone(), dir.path()), path, None).await,
            StatusCode::UNAUTHORIZED,
            "{path} must not answer an unauthenticated caller"
        );
        assert_eq!(
            status_of(
                proxy_router(state.clone(), dir.path()),
                path,
                Some(&admin_token),
            )
            .await,
            StatusCode::OK,
            "{path} must still answer an administrator"
        );
    }
}

/// Subscription health must never name an account, a credential path, or a
/// token even to an authenticated administrator (issue #318).
#[tokio::test]
async fn subscription_health_discloses_no_more_than_the_vendor_names() {
    let dir = tempfile::tempdir().expect("tempdir");
    let qwen = tempfile::tempdir().expect("qwen home");
    let credential_body = "private-credential-body-marker";
    std::fs::write(dir.path().join("auth.json"), credential_body).expect("malformed credential");
    std::fs::write(
        qwen.path().join("oauth_creds.json"),
        r#"{"access_token":"qwen-live"}"#,
    )
    .expect("qwen credential");
    let mut state = state_with(claim(dir.path()), dir.path());
    state.subscription_readers = vec![
        link_assistant_router::subscription::SubscriptionReader::new(
            link_assistant_router::subscription::SubscriptionProvider::Codex,
            dir.path(),
        ),
        link_assistant_router::subscription::SubscriptionReader::new(
            link_assistant_router::subscription::SubscriptionProvider::Qwen,
            qwen.path(),
        ),
    ];
    state.model_catalogs.record_success(
        link_assistant_router::subscription::SubscriptionProvider::Qwen,
        vec!["qwen-live-model".into()],
    );
    state.subscription_cache.record_credential_rejected(
        link_assistant_router::subscription::SubscriptionProvider::Qwen,
    );
    let admin_token = state
        .token_manager
        .issue_admin_token(1, "ops")
        .expect("issue admin token");
    let response = proxy_router(state, dir.path())
        .oneshot(get_request(
            "/api/management/health/subscriptions",
            Some(&admin_token),
        ))
        .await
        .expect("health responds");
    assert_eq!(response.status(), StatusCode::SERVICE_UNAVAILABLE);
    let body = axum::body::to_bytes(response.into_body(), 64 * 1024)
        .await
        .expect("read body");
    let body = String::from_utf8_lossy(&body);

    for secret in [
        "la_sk_",
        "Bearer",
        "refresh_token",
        "access_token",
        credential_body,
    ] {
        assert!(
            !body.contains(secret),
            "a health answer must not contain {secret}: {body}"
        );
    }
    assert!(
        !body.contains(&dir.path().to_string_lossy().to_string()),
        "it must not name a credential directory: {body}"
    );
    assert!(
        !body.contains(&qwen.path().to_string_lossy().to_string()),
        "it must not name another credential directory: {body}"
    );
}

/// The console keeps its credential in `localStorage`, so the listener that
/// serves it must forbid framing and foreign scripts — on API responses, on the
/// UI assets, and on the auth middleware's own refusals.
#[tokio::test]
async fn every_admin_response_is_hardened() {
    let dir = tempfile::tempdir().expect("tempdir");
    let state = state_with(claim(dir.path()), dir.path());
    for (path, token) in [
        ("/api/management/admin/status", None),
        ("/api/management/admin/summary", None),
        ("/", None),
    ] {
        let response = link_assistant_router::admin_api::router(state.clone())
            .oneshot(get_request(path, token))
            .await
            .expect("router responds");
        let headers = response.headers();
        assert_eq!(
            headers
                .get(header::X_FRAME_OPTIONS)
                .and_then(|v| v.to_str().ok()),
            Some("DENY"),
            "{path} may be framed"
        );
        let csp = headers
            .get(header::CONTENT_SECURITY_POLICY)
            .and_then(|v| v.to_str().ok())
            .unwrap_or_default();
        assert!(
            csp.contains("frame-ancestors 'none'") && csp.contains("script-src 'self'"),
            "{path} carries a weak policy: {csp}"
        );
        // Consume the body so the assertion failure message above is the first
        // thing a reader sees, not a dangling-body warning.
        let _ = response.into_body().collect().await;
    }
}
