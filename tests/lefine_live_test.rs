//! Opt-in production-boundary acceptance for a real Lefine credential.
//!
//! The secret is read only from `LEFINE_API_KEY`. Without that environment
//! variable this test is an ordinary offline no-op.

use std::fs;
use std::process::Command;
use std::sync::Arc;
use std::time::Duration;

use axum::body::Body;
use axum::http::{Method, Request, StatusCode, header};
use axum::middleware::from_fn_with_state;
use http_body_util::BodyExt as _;
use link_assistant_router::admin::AdminClaim;
use link_assistant_router::app_state::AppState;
use link_assistant_router::cli::Cli;
use link_assistant_router::config::Config;
use link_assistant_router::model_catalog::ModelCatalogCache;
use link_assistant_router::oauth::OAuthProvider;
use link_assistant_router::providers::{ProviderStore, ProviderUpsert};
use link_assistant_router::refresh::TokenCache;
use link_assistant_router::request_log::{RequestLog, log_http_exchange};
use link_assistant_router::route_contract::ListenerKind;
use link_assistant_router::token::{IssueRequest, TokenManager};
use lino_arguments::Parser as _;
use serde_json::{Value, json};
use tower::ServiceExt as _;

const TOKEN_SECRET: &str = "lefine-live-router-secret";
const ADMIN_KEY: &str = "lefine-live-admin";

fn live_state(data_dir: &std::path::Path, api_key: String) -> (AppState, Config) {
    let data = data_dir.to_str().expect("UTF-8 data path");
    let config = Cli::try_parse_from([
        "router",
        "--token-secret",
        TOKEN_SECRET,
        "--data-dir",
        data,
        "--upstream-provider",
        "auto",
    ])
    .expect("live test CLI parses")
    .into_config()
    .expect("live test config is valid");
    let providers = ProviderStore::open(data_dir, TOKEN_SECRET).expect("provider store");
    providers
        .upsert(ProviderUpsert {
            name: "lefine".into(),
            kind: Some("lefine".into()),
            base_url: link_assistant_router::lefine::BASE_URL.into(),
            default_model: None,
            models: None,
            supported_clients: None,
            api_key: Some(api_key),
            api_key_env: None,
            encrypted_api_key: None,
            enabled: Some(true),
            subscriber_id: None,
            acknowledge_intermediary_risk: None,
            acknowledge_unsupported_clients: None,
            if_absent: false,
        })
        .expect("store encrypted Lefine credential");
    let token_manager = TokenManager::new(TOKEN_SECRET);
    let state = AppState {
        client: reqwest::Client::new(),
        token_manager,
        oauth_provider: OAuthProvider::new(data),
        account_router: None,
        subscription_reader: None,
        subscription_base_url: None,
        subscription_readers: Vec::new(),
        model_catalogs: Arc::new(ModelCatalogCache::new()),
        subscription_cache: Arc::new(TokenCache::new()),
        upstream_base_url: config.upstream_base_url.clone(),
        upstream_provider: config.upstream_provider,
        gonka: None,
        bridge_model: None,
        bridge_model_policy: config.bridge_model_policy,
        crater: None,
        openai_compatible: config.openai_compatible.clone(),
        provider_store: providers,
        logger: log_lazy::LogLazy::new(),
        admin: Arc::new(AdminClaim::load(
            Some(ADMIN_KEY.into()),
            data_dir,
            Duration::from_secs(60),
        )),
        admin_key: Some(ADMIN_KEY.into()),
        allow_anonymous_admin: false,
        metrics: Arc::new(link_assistant_router::metrics::Metrics::default()),
        audit: Arc::new(link_assistant_router::audit::AuditLog::disabled()),
        request_log: Arc::new(RequestLog::new(data_dir.join("requests"), 1024 * 1024)),
        activitypub_actor_base_url: "https://router.test".into(),
        activitypub_public_key_pem:
            link_assistant_router::config::default_activitypub_public_key_pem(),
        mpp: config.mpp.clone(),
        login_manager: link_assistant_router::login::LoginManager::new(config.login.clone()),
        github: link_assistant_router::github_proxy::GitHubProxyConfig::default(),
        max_proxy_request_bytes: link_assistant_router::config::DEFAULT_MAX_PROXY_REQUEST_BYTES,
    };
    (state, config)
}

fn client_headers(token: &str) -> [(header::HeaderName, String); 3] {
    [
        (header::AUTHORIZATION, format!("Bearer {token}")),
        (header::USER_AGENT, "opencode/lefine-live-test".into()),
        (header::CONTENT_TYPE, "application/json".into()),
    ]
}

fn request(
    method: Method,
    uri: &str,
    headers: &[(header::HeaderName, String)],
    body: Body,
) -> Request<Body> {
    let mut builder = Request::builder().method(method).uri(uri);
    for (name, value) in headers {
        builder = builder.header(name, value);
    }
    builder.body(body).expect("request")
}

fn logged_records(root: &std::path::Path) -> Vec<Value> {
    let mut records = Vec::new();
    for directory in fs::read_dir(root).expect("request-log root") {
        let path = directory
            .expect("request-log entry")
            .path()
            .join("requests.lino");
        let Ok(text) = fs::read_to_string(path) else {
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
async fn real_lefine_catalog_inference_and_operator_surfaces_are_secret_free() {
    let Ok(api_key) = std::env::var("LEFINE_API_KEY") else {
        return;
    };
    if api_key.is_empty() {
        return;
    }

    let data = tempfile::tempdir().expect("data dir");
    let (state, config) = live_state(data.path(), api_key.clone());
    let (client_token, _) = state
        .token_manager
        .issue_with_id(&IssueRequest {
            ttl_hours: 1,
            label: "Lefine live acceptance",
            account: Some("primary"),
            max_requests: None,
            max_tokens: None,
            rate_limit_per_minute: None,
            scope: "",
            github_repos: Vec::new(),
            sliding_window_seconds: None,
            client_kind: Some("opencode"),
            principal_id: Some("primary"),
        })
        .expect("issue OpenCode token");
    let app = link_assistant_router::server_router::router_for_listener(
        state.clone(),
        &config,
        ListenerKind::Combined,
    )
    .layer(from_fn_with_state(state.clone(), log_http_exchange));

    let headers = client_headers(&client_token);
    let catalog = app
        .clone()
        .oneshot(request(Method::GET, "/api/models", &headers, Body::empty()))
        .await
        .expect("catalog response");
    assert_eq!(catalog.status(), StatusCode::OK);
    let catalog: Value = serde_json::from_slice(
        &catalog
            .into_body()
            .collect()
            .await
            .expect("catalog body")
            .to_bytes(),
    )
    .expect("catalog JSON");
    let model = catalog["data"]
        .as_array()
        .and_then(|models| models.iter().find(|model| model["service"] == "lefine"))
        .and_then(|model| model["id"].as_str())
        .expect("live Lefine model")
        .to_string();

    let body = serde_json::to_vec(&json!({
        "model": model,
        "messages": [{"role": "user", "content": "Reply with OK."}],
        "stream": false
    }))
    .expect("inference body");
    let inference = app
        .clone()
        .oneshot(request(
            Method::POST,
            "/api/services/openai/v1/chat/completions",
            &headers,
            Body::from(body),
        ))
        .await
        .expect("inference response");
    assert!(inference.status().is_success());
    let inference_body = inference
        .into_body()
        .collect()
        .await
        .expect("inference body")
        .to_bytes();
    assert!(!inference_body.is_empty());
    assert!(!String::from_utf8_lossy(&inference_body).contains(&api_key));

    let management = app
        .oneshot(request(
            Method::GET,
            "/api/management/providers",
            &[(header::AUTHORIZATION, format!("Bearer {ADMIN_KEY}"))],
            Body::empty(),
        ))
        .await
        .expect("management response");
    assert_eq!(management.status(), StatusCode::OK);
    let management_body = management
        .into_body()
        .collect()
        .await
        .expect("management body")
        .to_bytes();
    assert!(!String::from_utf8_lossy(&management_body).contains(&api_key));

    let records = logged_records(&data.path().join("requests"));
    let correlation_id = records
        .iter()
        .find(|record| {
            record["phase"] == "upstream_request"
                && record["body"]["model"].as_str() == Some(model.as_str())
        })
        .and_then(|record| record["correlation_id"].as_str())
        .expect("logged live inference correlation id");
    let raw_logs = records
        .iter()
        .map(Value::to_string)
        .collect::<Vec<_>>()
        .join("\n");
    assert!(!raw_logs.contains(&api_key));
    assert!(!raw_logs.contains(&format!("Bearer {api_key}")));
    assert!(!raw_logs.contains(&client_token));

    let shown = Command::new(env!("CARGO_BIN_EXE_router"))
        .args([
            "--data-dir",
            data.path().to_str().expect("UTF-8 data path"),
            "--token-secret",
            TOKEN_SECRET,
            "logs",
            "show",
            correlation_id,
        ])
        .output()
        .expect("run logs show");
    assert!(shown.status.success());
    for output in [&shown.stdout, &shown.stderr] {
        let output = String::from_utf8_lossy(output);
        assert!(!output.contains(&api_key));
        assert!(!output.contains(&format!("Bearer {api_key}")));
        assert!(!output.contains(&client_token));
    }
}
