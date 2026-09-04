//! Full-stack logging contract for requests refused before upstream (#429).

use std::sync::Arc;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::time::Duration;

use axum::body::Body;
use axum::http::{Request, StatusCode};
use axum::middleware::from_fn_with_state;
use axum::routing::any;
use http_body_util::BodyExt as _;
use link_assistant_router::app_state::AppState;
use link_assistant_router::cli::Cli;
use link_assistant_router::config::UpstreamProvider;
use link_assistant_router::model_catalog::ModelCatalogCache;
use link_assistant_router::oauth::OAuthProvider;
use link_assistant_router::providers::ProviderStore;
use link_assistant_router::refresh::TokenCache;
use link_assistant_router::route_contract::ListenerKind;
use link_assistant_router::token::IssueRequest;
use link_assistant_router::token::TokenManager;
use lino_arguments::Parser as _;
use serde_json::{Value, json};
use tower::ServiceExt as _;

fn issue_client_token(state: &AppState, client: &'static str, label: &'static str) -> String {
    state
        .token_manager
        .issue(&IssueRequest {
            ttl_hours: 1,
            label,
            account: Some("primary"),
            max_requests: None,
            max_tokens: None,
            rate_limit_per_minute: None,
            scope: "",
            github_repos: Vec::new(),
            sliding_window_seconds: None,
            client_kind: Some(client),
            principal_id: Some("primary"),
        })
        .expect("issue bound client token")
}

fn request(
    method: &'static str,
    path: &'static str,
    token: &str,
    marker: &'static str,
    body: Option<Value>,
) -> Request<Body> {
    let mut builder = Request::builder()
        .method(method)
        .uri(path)
        .header("authorization", format!("Bearer {token}"))
        .header("x-test-marker", marker)
        .header("content-type", "application/json");
    if path.contains("anthropic") {
        builder = builder
            .header("anthropic-version", "2023-06-01")
            .header("user-agent", "claude-cli/2.1.259");
    } else {
        builder = builder
            .header("user-agent", "codex_exec/0.153.3")
            .header("x-codex-turn-metadata", "synthetic-turn");
    }
    let bytes = body.map_or_else(Vec::new, |body| serde_json::to_vec(&body).unwrap());
    builder
        .header("content-length", bytes.len())
        .body(Body::from(bytes))
        .unwrap()
}

fn records(root: &std::path::Path) -> Vec<Value> {
    let mut records = Vec::new();
    for directory in std::fs::read_dir(root).expect("request-log root") {
        let path = directory
            .expect("request-log identity")
            .path()
            .join("requests.lino");
        let Ok(text) = std::fs::read_to_string(path) else {
            continue;
        };
        records.extend(
            text.lines()
                .filter_map(link_assistant_router::lino_json::decode_line),
        );
    }
    records
}

#[tokio::test]
async fn every_denial_has_one_client_exchange_and_zero_upstream_phases() {
    let upstream_hits = Arc::new(AtomicUsize::new(0));
    let hits = Arc::clone(&upstream_hits);
    let upstream = axum::Router::new().fallback(any(move || {
        let hits = Arc::clone(&hits);
        async move {
            hits.fetch_add(1, Ordering::SeqCst);
            (StatusCode::OK, axum::Json(json!({"unexpected": true})))
        }
    }));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let address = listener.local_addr().unwrap();
    let upstream_task = tokio::spawn(async move { axum::serve(listener, upstream).await.unwrap() });

    let directory = tempfile::tempdir().unwrap();
    let directory_arg = directory.path().to_str().unwrap();
    let upstream_url = format!("http://{address}");
    let config = Cli::try_parse_from([
        "router",
        "--token-secret",
        "test-secret",
        "--data-dir",
        directory_arg,
        "--upstream-provider",
        "anthropic",
        "--upstream-base-url",
        &upstream_url,
        "--disable-login-api",
    ])
    .unwrap()
    .into_config()
    .unwrap();
    let state = AppState {
        client: reqwest::Client::new(),
        token_manager: TokenManager::new("test-secret"),
        oauth_provider: OAuthProvider::new(directory_arg),
        account_router: None,
        subscription_reader: None,
        subscription_base_url: None,
        subscription_readers: Vec::new(),
        model_catalogs: Arc::new(ModelCatalogCache::new()),
        subscription_cache: Arc::new(TokenCache::new()),
        upstream_base_url: upstream_url,
        upstream_provider: UpstreamProvider::Anthropic,
        gonka: None,
        bridge_model: None,
        bridge_model_policy: link_assistant_router::bridge_selection::BridgeModelPolicy::default(),
        crater: None,
        openai_compatible: config.openai_compatible.clone(),
        provider_store: ProviderStore::open(directory.path(), "test-secret").unwrap(),
        logger: log_lazy::LogLazy::new(),
        admin: Arc::new(link_assistant_router::admin::AdminClaim::load(
            None,
            directory.path(),
            Duration::from_secs(60),
        )),
        admin_key: None,
        allow_anonymous_admin: false,
        metrics: Arc::new(link_assistant_router::metrics::Metrics::default()),
        audit: Arc::new(link_assistant_router::audit::AuditLog::disabled()),
        request_log: Arc::new(link_assistant_router::request_log::RequestLog::new(
            directory.path().join("requests"),
            1024 * 1024,
        )),
        activitypub_actor_base_url: "https://router.test".into(),
        activitypub_public_key_pem:
            link_assistant_router::config::default_activitypub_public_key_pem(),
        mpp: config.mpp.clone(),
        login_manager: link_assistant_router::login::LoginManager::new(config.login.clone()),
        github: link_assistant_router::github_proxy::GitHubProxyConfig::default(),
        max_proxy_request_bytes: link_assistant_router::config::DEFAULT_MAX_PROXY_REQUEST_BYTES,
    };
    let codex_token = issue_client_token(&state, "codex", "denied codex");
    let claude_token = issue_client_token(&state, "claude", "denied claude");
    let app = link_assistant_router::server_router::router_for_listener(
        state.clone(),
        &config,
        ListenerKind::Combined,
    )
    .layer(from_fn_with_state(
        state,
        link_assistant_router::request_log::log_http_exchange,
    ));

    let cases = [
        (
            request(
                "GET",
                "/api/services/anthropic/v1/models",
                "la_sk_invalid-catalog",
                "denied-auth-catalog",
                None,
            ),
            StatusCode::UNAUTHORIZED,
            "denied-auth-catalog",
            false,
        ),
        (
            request(
                "POST",
                "/api/services/anthropic/v1/messages",
                "la_sk_invalid-inference",
                "denied-auth-anthropic-stream",
                Some(json!({
                    "model": "synthetic-model",
                    "stream": true,
                    "messages": [{"role": "user", "content": "diagnostic-anthropic"}],
                    "api_key": "la_sk_never-log-auth"
                })),
            ),
            StatusCode::UNAUTHORIZED,
            "denied-auth-anthropic-stream",
            true,
        ),
        (
            request(
                "POST",
                "/api/services/anthropic/v1/messages",
                &codex_token,
                "denied-policy-anthropic",
                Some(json!({
                    "model": "synthetic-model",
                    "messages": [{"role": "user", "content": "diagnostic-policy-anthropic"}],
                    "api_key": "la_sk_never-log-policy-a"
                })),
            ),
            StatusCode::FORBIDDEN,
            "denied-policy-anthropic",
            true,
        ),
        (
            request(
                "POST",
                "/api/services/codex/v1/responses",
                &claude_token,
                "denied-policy-codex-stream",
                Some(json!({
                    "model": "synthetic-model",
                    "stream": true,
                    "input": "diagnostic-policy-codex",
                    "api_key": "la_sk_never-log-policy-c"
                })),
            ),
            StatusCode::FORBIDDEN,
            "denied-policy-codex-stream",
            true,
        ),
    ];

    for (request, expected, marker, has_body) in cases {
        let response = app.clone().oneshot(request).await.unwrap();
        assert_eq!(response.status(), expected, "{marker}");
        response.into_body().collect().await.unwrap();

        let records = records(&directory.path().join("requests"));
        let request = records
            .iter()
            .find(|record| {
                record["phase"] == "client_request" && record["headers"]["x-test-marker"] == marker
            })
            .unwrap_or_else(|| panic!("missing client_request for {marker}: {records:#?}"));
        let correlation = request["correlation_id"].as_str().unwrap();
        let exchange = records
            .iter()
            .filter(|record| record["correlation_id"] == correlation)
            .collect::<Vec<_>>();
        assert_eq!(
            exchange
                .iter()
                .filter(|record| record["phase"] == "client_request")
                .count(),
            1,
            "{marker}: {exchange:#?}"
        );
        assert_eq!(
            exchange
                .iter()
                .filter(|record| record["phase"] == "client_response")
                .count(),
            1,
            "{marker}: {exchange:#?}"
        );
        for forbidden in ["upstream_request", "upstream_response", "stream_end"] {
            assert!(
                exchange.iter().all(|record| record["phase"] != forbidden),
                "{marker} wrote {forbidden}: {exchange:#?}"
            );
        }
        if has_body {
            let rendered = request["body"].to_string();
            assert!(rendered.contains("diagnostic-"), "{marker}: {request}");
            assert!(!rendered.contains("la_sk_never-log"), "{marker}: {request}");
        }
    }
    assert_eq!(upstream_hits.load(Ordering::SeqCst), 0);
    upstream_task.abort();
}
