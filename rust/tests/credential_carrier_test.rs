//! Which headers may carry a client token, per API surface (issue #206).
//!
//! Every vendor dialect names its credential differently. Gemini CLI sends
//! `x-goog-api-key`, which is what Google's documentation specifies and what
//! `GEMINI_API_KEY` becomes; the Anthropic SDKs send `x-api-key`; everything
//! else sends `Authorization: Bearer`. The router accepted the first two but
//! not the third, so the launch path documented in
//! `docs/use-cases/cli-gemini-cli.md` answered `401` on every request while the
//! identical token in a `Authorization` header answered `200`.
//!
//! These tests drive the *real* router — `server_router::router`, with the
//! authentication middleware attached — because the defect lived in the
//! middleware and a hand-mounted route cannot observe it.

use std::sync::Arc;
use std::time::Duration;

use axum::body::Body;
use axum::http::{Method, Request, StatusCode};
use http_body_util::BodyExt as _;
use link_assistant_router::admin::AdminClaim;
use link_assistant_router::app_state::AppState;
use link_assistant_router::cli::Cli;
use link_assistant_router::model_catalog::ModelCatalogCache;
use link_assistant_router::oauth::OAuthProvider;
use link_assistant_router::providers::ProviderStore;
use link_assistant_router::refresh::TokenCache;
use link_assistant_router::token::{IssueRequest, TokenManager};
use lino_arguments::Parser as _;
use serde_json::Value;
use tower::ServiceExt as _;

/// A router with no reachable upstream: these tests assert on the
/// authentication verdict, which is decided before any upstream is contacted.
fn test_app(dir: &std::path::Path) -> (axum::Router, String) {
    let dir_arg = dir.to_str().expect("UTF-8 test path");
    let config = Cli::try_parse_from(vec![
        "router",
        "--token-secret",
        "carrier-secret",
        "--data-dir",
        dir_arg,
        "--upstream-base-url",
        "http://127.0.0.1:9",
    ])
    .expect("test CLI parses")
    .into_config()
    .expect("test config is valid");
    let token_manager = TokenManager::new("carrier-secret");
    let token = token_manager
        .issue(&IssueRequest {
            ttl_hours: 1,
            label: "carrier client",
            account: Some("carrier-principal"),
            max_requests: None,
            max_tokens: None,
            rate_limit_per_minute: None,
            scope: "",
            github_repos: Vec::new(),
            sliding_window_seconds: None,
            client_kind: Some("gemini"),
            principal_id: Some("carrier-principal"),
        })
        .expect("issue bound Gemini client token");
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
        provider_store: ProviderStore::open(dir, "carrier-secret").expect("provider store"),
        logger: log_lazy::LogLazy::new(),
        admin: Arc::new(AdminClaim::load(
            Some("carrier-admin".to_string()),
            dir,
            Duration::from_secs(60),
        )),
        admin_key: Some("carrier-admin".to_string()),
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

/// Issue the request the Gemini CLI issues, varying only the credential
/// carrier.
async fn carrier_status(
    app: axum::Router,
    path: &str,
    header: Option<(&str, String)>,
) -> (StatusCode, Value) {
    let mut request = Request::builder()
        .method(Method::GET)
        .uri(path)
        .header("content-type", "application/json");
    if let Some((name, value)) = header {
        request = request.header(name, value);
    }
    let response = app
        .oneshot(request.body(Body::empty()).expect("request"))
        .await
        .expect("router response");
    let status = response.status();
    let body = response
        .into_body()
        .collect()
        .await
        .expect("response body")
        .to_bytes();
    let body = serde_json::from_slice(&body).unwrap_or(Value::Null);
    (status, body)
}

/// `POST` the request Gemini CLI actually issues, with the credential in
/// `x-goog-api-key`, and report only how far authentication got.
async fn post_carrier_status(app: axum::Router, path: &str, token: &str) -> StatusCode {
    let request = Request::builder()
        .method(Method::POST)
        .uri(path)
        .header("content-type", "application/json")
        .header("x-goog-api-key", token)
        .body(Body::from(
            r#"{"contents":[{"role":"user","parts":[{"text":"ping"}]}]}"#,
        ))
        .expect("request");
    app.oneshot(request)
        .await
        .expect("router response")
        .status()
}

/// The header Gemini CLI actually sends must authenticate. This is the defect
/// reported in issue #206.
#[tokio::test]
async fn gemini_cli_key_header_authenticates() {
    let dir = tempfile::tempdir().expect("tempdir");
    let (app, token) = test_app(dir.path());
    let (status, body) = carrier_status(
        app,
        "/api/services/gemini/v1beta/models",
        Some(("x-goog-api-key", token)),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "{body}");
}

#[tokio::test]
async fn aggregate_catalog_uses_the_bound_clients_native_carrier() {
    let dir = tempfile::tempdir().expect("tempdir");
    let (app, token) = test_app(dir.path());
    let (status, body) = carrier_status(app, "/api/models", Some(("x-goog-api-key", token))).await;
    assert_eq!(status, StatusCode::OK, "{body}");
    assert_eq!(body["object"], "list");
    assert_eq!(body["data"], serde_json::json!([]));
}

/// The fix must not degrade into accepting anything presented in that header.
#[tokio::test]
async fn an_invalid_gemini_key_is_still_rejected() {
    let dir = tempfile::tempdir().expect("tempdir");
    let (app, _) = test_app(dir.path());
    let (status, _) = carrier_status(
        app,
        "/api/services/gemini/v1beta/models",
        Some(("x-goog-api-key", "la_sk_not_a_real_token".to_string())),
    )
    .await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);
}

/// A token issued by a *different* secret must not be honoured merely because
/// it arrived in the Gemini carrier.
#[tokio::test]
async fn a_foreign_token_in_the_gemini_carrier_is_rejected() {
    let dir = tempfile::tempdir().expect("tempdir");
    let (app, _) = test_app(dir.path());
    let foreign = TokenManager::new("some-other-routers-secret")
        .issue_token(1, "foreign client")
        .expect("issue foreign token");
    let (status, _) = carrier_status(
        app,
        "/api/services/gemini/v1beta/models",
        Some(("x-goog-api-key", foreign)),
    )
    .await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);
}

/// The carriers that already worked must keep working.
#[tokio::test]
async fn bearer_and_x_api_key_still_authenticate() {
    let dir = tempfile::tempdir().expect("tempdir");
    let (app, token) = test_app(dir.path());
    for (name, value) in [
        ("authorization", format!("Bearer {token}")),
        ("x-api-key", token.clone()),
    ] {
        let (status, body) = carrier_status(
            app.clone(),
            "/api/services/gemini/v1beta/models",
            Some((name, value)),
        )
        .await;
        assert_eq!(status, StatusCode::OK, "{name}: {body}");
    }
}

/// A request with no credential at all is still refused.
#[tokio::test]
async fn a_missing_credential_is_refused() {
    let dir = tempfile::tempdir().expect("tempdir");
    let (app, _) = test_app(dir.path());
    let (status, _) = carrier_status(app, "/api/services/gemini/v1beta/models", None).await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);
}

/// A refusal must arrive in the dialect of the surface the caller used. Gemini
/// CLI parses Google's envelope (`error.code` / `error.status`), so an
/// Anthropic-shaped `401` is not something it can report usefully.
#[tokio::test]
async fn the_refusal_is_rendered_in_the_surfaces_own_dialect() {
    let dir = tempfile::tempdir().expect("tempdir");
    let (app, _) = test_app(dir.path());
    let (status, body) = carrier_status(app, "/api/services/gemini/v1beta/models", None).await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);
    assert_eq!(body["error"]["code"], 401, "{body}");
    assert_eq!(body["error"]["status"], "UNAUTHENTICATED", "{body}");
}

/// The `401` must name every carrier it accepts. A valid token in the wrong
/// header is otherwise indistinguishable from an invalid token, which is what
/// made issue #206 expensive to diagnose.
#[tokio::test]
async fn the_refusal_names_every_accepted_carrier() {
    let dir = tempfile::tempdir().expect("tempdir");
    let (app, _) = test_app(dir.path());
    let (_, body) = carrier_status(app, "/api/services/gemini/v1beta/models", None).await;
    let message = body["error"]["message"].as_str().expect("message");
    for carrier in ["Authorization: Bearer", "x-api-key", "x-goog-api-key"] {
        assert!(
            message.contains(carrier),
            "{carrier} missing from: {message}"
        );
    }
}

/// `?key=` is refused deliberately, and the refusal says so rather than
/// repeating the same opaque `401`. A URL is recorded by proxies, browser
/// history and server logs, so a token belongs in a header.
#[tokio::test]
async fn the_key_query_parameter_is_refused_and_explains_itself() {
    let dir = tempfile::tempdir().expect("tempdir");
    let (app, token) = test_app(dir.path());
    let (status, body) = carrier_status(
        app,
        &format!("/api/services/gemini/v1beta/models?key={token}"),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::UNAUTHORIZED, "{body}");
    let message = body["error"]["message"].as_str().expect("message");
    assert!(message.contains("?key="), "{message}");
}

/// The generation calls the CLI actually makes must pass authentication with
/// the Gemini carrier. There is no upstream in this test, so the request is
/// expected to fail *past* the credential check — anything but `401`/`403`
/// proves the caller was authenticated.
#[tokio::test]
async fn generate_and_stream_pass_authentication_with_the_gemini_carrier() {
    let dir = tempfile::tempdir().expect("tempdir");
    let (app, token) = test_app(dir.path());
    for path in [
        "/api/services/gemini/v1beta/models/gemini-2.5-pro:generateContent",
        "/api/services/gemini/v1beta/models/gemini-2.5-pro:streamGenerateContent?alt=sse",
        "/api/services/vertex/v1/projects/p/locations/l/publishers/google/models/gemini-2.5-pro:generateContent",
    ] {
        let status = post_carrier_status(app.clone(), path, &token).await;
        assert!(
            status != StatusCode::UNAUTHORIZED && status != StatusCode::FORBIDDEN,
            "{path} was refused at the credential check: {status}"
        );
    }
}

/// The same routes must still refuse an invalid token in that carrier.
#[tokio::test]
async fn generate_and_stream_still_refuse_an_invalid_gemini_carrier() {
    let dir = tempfile::tempdir().expect("tempdir");
    let (app, _) = test_app(dir.path());
    for path in [
        "/api/services/gemini/v1beta/models/gemini-2.5-pro:generateContent",
        "/api/services/gemini/v1beta/models/gemini-2.5-pro:streamGenerateContent?alt=sse",
    ] {
        let status = post_carrier_status(app.clone(), path, "la_sk_not_a_real_token").await;
        assert_eq!(status, StatusCode::UNAUTHORIZED, "{path}");
    }
}
