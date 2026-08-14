//! Network-boundary regressions found during the issue #149 security audit.

use std::sync::Arc;
use std::time::Duration;

use axum::body::Body;
use axum::http::{Method, Request, StatusCode, header};
use http_body_util::BodyExt as _;
use link_assistant_router::admin::AdminClaim;
use link_assistant_router::app_state::AppState;
use link_assistant_router::cli::Cli;
use link_assistant_router::model_catalog::ModelCatalogCache;
use link_assistant_router::oauth::OAuthProvider;
use link_assistant_router::providers::ProviderStore;
use link_assistant_router::refresh::TokenCache;
use link_assistant_router::token::TokenManager;
use lino_arguments::Parser as _;
use tower::ServiceExt as _;

fn test_app(dir: &std::path::Path) -> (axum::Router, String) {
    test_app_with_mpp(dir, false)
}

fn test_app_with_mpp(dir: &std::path::Path, mpp: bool) -> (axum::Router, String) {
    let dir_arg = dir.to_str().expect("UTF-8 test path");
    let mut args = vec![
        "router",
        "--token-secret",
        "network-audit-secret",
        "--data-dir",
        dir_arg,
        "--upstream-provider",
        "anthropic",
        "--upstream-base-url",
        "http://127.0.0.1:9",
    ];
    if mpp {
        args.extend([
            "--mpp-enable",
            "--mpp-amount",
            "1.00",
            "--mpp-currency",
            "USD",
            "--mpp-recipient",
            "audit-merchant",
        ]);
    }
    let config = Cli::try_parse_from(args)
        .expect("test CLI parses")
        .into_config()
        .expect("test config is valid");
    let token_manager = TokenManager::new("network-audit-secret");
    let token = token_manager
        .issue_token(1, "network audit client")
        .expect("issue client token");
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
        crater: None,
        openai_compatible: config.openai_compatible.clone(),
        provider_store: ProviderStore::open(dir, "network-audit-secret").expect("provider store"),
        logger: log_lazy::LogLazy::new(),
        admin: Arc::new(AdminClaim::load(
            Some("network-audit-admin".to_string()),
            dir,
            Duration::from_secs(60),
        )),
        admin_key: Some("network-audit-admin".to_string()),
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
    (
        link_assistant_router::server_router::router(state, &config),
        token,
    )
}

async fn response(
    app: axum::Router,
    method: Method,
    path: &str,
    token: Option<&str>,
    body: &'static str,
) -> axum::response::Response {
    let mut request = Request::builder()
        .method(method)
        .uri(path)
        .header(header::CONTENT_TYPE, "application/json");
    if let Some(token) = token {
        request = request.header(header::AUTHORIZATION, format!("Bearer {token}"));
    }
    app.oneshot(request.body(Body::from(body)).expect("request"))
        .await
        .expect("router response")
}

#[tokio::test]
async fn unknown_paths_never_reach_the_oauth_upstream() {
    let dir = tempfile::tempdir().expect("tempdir");
    let (app, token) = test_app(dir.path());
    let response = response(
        app,
        Method::POST,
        "/not-a-supported-provider-path",
        Some(&token),
        r#"{"model":"claude-sonnet-4"}"#,
    )
    .await;

    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn only_documented_legacy_and_vertex_shapes_are_routable() {
    let dir = tempfile::tempdir().expect("tempdir");
    let (app, token) = test_app(dir.path());
    let allowed = [
        "/api/latest/anthropic/v1/messages",
        "/api/latest/anthropic/v1/messages/count_tokens",
        "/v1/projects/p/locations/l/publishers/anthropic/models/claude-sonnet-4:rawPredict",
        "/v1/projects/p/locations/l/publishers/anthropic/models/claude-sonnet-4:streamRawPredict",
        "/v1/projects/p/locations/l/publishers/anthropic/models/claude-sonnet-4/count-tokens:rawPredict",
    ];
    for path in allowed {
        let response = response(
            app.clone(),
            Method::POST,
            path,
            Some(&token),
            r#"{"model":"claude-sonnet-4"}"#,
        )
        .await;
        assert_ne!(response.status(), StatusCode::NOT_FOUND, "{path}");
    }

    let rejected = [
        "/api/latest/anthropic/v1/complete",
        "/v1/projects/p/locations/l/publishers/anthropic/models/claude-sonnet-4:delete",
        "/v1/projects/p/locations/l/publishers/anthropic/models/nested/claude-sonnet-4:rawPredict",
    ];
    for path in rejected {
        let response = response(
            app.clone(),
            Method::POST,
            path,
            Some(&token),
            r#"{"model":"claude-sonnet-4"}"#,
        )
        .await;
        assert_eq!(response.status(), StatusCode::NOT_FOUND, "{path}");
    }
}

#[tokio::test]
async fn client_authentication_precedes_body_parsing_and_provider_discovery() {
    let dir = tempfile::tempdir().expect("tempdir");
    let (app, _) = test_app(dir.path());
    let cases = [
        (Method::POST, "/v1/chat/completions", "{"),
        (Method::POST, "/v1/responses", "{"),
        (
            Method::POST,
            "/api/gemini/v1beta/models/gemini-2.5-pro:generateContent",
            "{",
        ),
        (
            Method::POST,
            "/api/vertex/v1/projects/p/locations/l/publishers/google/models/gemini-2.5-pro:generateContent",
            "{",
        ),
        (Method::GET, "/api/gemini/v1beta/models", ""),
        (Method::GET, "/api/gemini/v1beta/models/gemini-2.5-pro", ""),
        (Method::POST, "/api/tokens", "{"),
        (Method::POST, "/api/tokens/revoke", "{"),
        (Method::POST, "/api/providers", "{"),
        (Method::POST, "/api/login", "{"),
        (Method::POST, "/api/login/session/code", "{"),
    ];

    for (method, path, body) in cases {
        let response = response(app.clone(), method, path, None, body).await;
        let status = response.status();
        let payload = response
            .into_body()
            .collect()
            .await
            .expect("response body")
            .to_bytes();
        assert_eq!(
            status,
            StatusCode::UNAUTHORIZED,
            "{path} returned {status}: {}",
            String::from_utf8_lossy(&payload)
        );
    }
}

#[tokio::test]
async fn configured_mpp_challenge_precedes_client_authentication_and_parsing() {
    let dir = tempfile::tempdir().expect("tempdir");
    let (app, _) = test_app_with_mpp(dir.path(), true);
    let response = response(app, Method::POST, "/v1/responses", None, "{").await;

    assert_eq!(response.status(), StatusCode::PAYMENT_REQUIRED);
    assert_eq!(
        response
            .headers()
            .get(header::WWW_AUTHENTICATE)
            .expect("MPP challenge"),
        r#"Payment protocol="mpp", intent="charge", amount="1.00", currency="USD", recipient="audit-merchant", resource="/v1/responses""#
    );
}

#[tokio::test]
async fn operational_details_require_admin_not_an_ordinary_task_token() {
    let dir = tempfile::tempdir().expect("tempdir");
    let (app, token) = test_app(dir.path());

    for path in ["/v1/usage", "/v1/accounts"] {
        let ordinary = response(app.clone(), Method::GET, path, Some(&token), "").await;
        assert_eq!(ordinary.status(), StatusCode::UNAUTHORIZED, "{path}");

        let admin = response(
            app.clone(),
            Method::GET,
            path,
            Some("network-audit-admin"),
            "",
        )
        .await;
        assert_eq!(admin.status(), StatusCode::OK, "{path}");
    }
}
