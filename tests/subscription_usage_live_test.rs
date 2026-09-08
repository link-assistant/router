//! Opt-in acceptance tests for protected subscription credentials.
//!
//! Usage probes do not call inference. The Codex model-identity regression uses
//! the smallest streaming request for each currently advertised model. Every
//! test is a no-op unless its protected environment variable is present;
//! secret values are never printed or included in assertion output.

use axum::body::to_bytes;
use axum::extract::{Json, OriginalUri, Path as AxumPath, State};
use axum::http::{HeaderMap, HeaderValue, StatusCode};
use link_assistant_router::app_state::{AppState, VendorClis};
use link_assistant_router::clients::ClientKind;
use link_assistant_router::providers::ProviderUpsert;
use link_assistant_router::subscription::{SubscriptionProvider, SubscriptionReader};
use link_assistant_router::subscription_usage::usage_provider;
use link_assistant_router::token::IssueRequest;
use serde_json::Value;
use std::sync::Arc;
use std::time::Duration;

fn test_state(data_dir: &std::path::Path) -> AppState {
    let secret = "real-usage-smoke-router-secret";
    AppState {
        client: reqwest::Client::new(),
        token_manager: link_assistant_router::token::TokenManager::new(secret),
        oauth_provider: link_assistant_router::oauth::OAuthProvider::new(
            &data_dir.to_string_lossy(),
        ),
        account_router: None,
        subscription_reader: None,
        subscription_base_url: None,
        subscription_readers: Vec::new(),
        model_catalogs: Arc::new(link_assistant_router::model_catalog::ModelCatalogCache::new()),
        subscription_cache: Arc::new(link_assistant_router::refresh::TokenCache::new()),
        upstream_base_url: "https://api.anthropic.com".into(),
        upstream_provider: link_assistant_router::config::UpstreamProvider::Auto,
        gonka: None,
        bridge_model: None,
        bridge_model_policy: link_assistant_router::bridge_selection::BridgeModelPolicy::default(),
        crater: None,
        openai_compatible: link_assistant_router::config::default_openai_compatible_config(),
        provider_store: link_assistant_router::providers::ProviderStore::open(data_dir, secret)
            .expect("open live-smoke provider store"),
        logger: log_lazy::LogLazy::new(),
        admin: Arc::new(link_assistant_router::admin::AdminClaim::load(
            None,
            data_dir,
            Duration::from_secs(60),
        )),
        admin_key: None,
        allow_anonymous_admin: false,
        metrics: Arc::new(link_assistant_router::metrics::Metrics::default()),
        audit: Arc::new(link_assistant_router::audit::AuditLog::disabled()),
        request_log: Arc::new(link_assistant_router::request_log::RequestLog::new(
            data_dir.join("requests"),
            1024 * 1024,
        )),
        activitypub_actor_base_url: "https://router.test".into(),
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

fn protected(name: &str) -> Option<String> {
    std::env::var(name)
        .ok()
        .filter(|value| !value.trim().is_empty())
}

fn client_headers(state: &AppState, client: ClientKind) -> HeaderMap {
    let token = state
        .token_manager
        .issue(&IssueRequest {
            ttl_hours: 1,
            label: "real usage smoke",
            account: Some("primary"),
            client_kind: Some(client.canonical_name()),
            principal_id: Some("primary"),
            ..IssueRequest::default()
        })
        .expect("issue live-smoke client token");
    let mut headers = HeaderMap::new();
    headers.insert(
        "authorization",
        HeaderValue::from_str(&format!("Bearer {token}")).expect("client authorization header"),
    );
    match client {
        ClientKind::ClaudeCode => {
            headers.insert("user-agent", HeaderValue::from_static("claude-cli/2.1.263"));
            headers.insert("anthropic-version", HeaderValue::from_static("2023-06-01"));
        }
        ClientKind::Codex => {
            headers.insert("user-agent", HeaderValue::from_static("codex_exec/0.153.4"));
            headers.insert("originator", HeaderValue::from_static("codex_exec"));
        }
        _ => unreachable!("the live usage smoke uses native supported clients"),
    }
    headers
}

async fn probe(state: AppState, provider: &str, client: ClientKind) -> (StatusCode, Value) {
    let path = format!("/api/usage/{provider}");
    let headers = client_headers(&state, client);
    let response = usage_provider(
        State(state),
        OriginalUri(path.parse().expect("usage URI")),
        AxumPath(provider.to_string()),
        headers,
    )
    .await;
    let status = response.status();
    let body = to_bytes(response.into_body(), 2 * 1024 * 1024)
        .await
        .expect("bounded usage response");
    let value = serde_json::from_slice(&body).expect("normalized usage JSON");
    (status, value)
}

fn assert_available(status: StatusCode, body: &Value, provider: &str, secret: &str) {
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["subscriptions"].as_array().map(Vec::len), Some(1));
    assert_eq!(body["subscriptions"][0]["provider"], provider);
    assert_eq!(body["subscriptions"][0]["state"], "available");
    let public = body.to_string();
    assert!(
        !public.contains(secret),
        "protected input reached public output"
    );
    for forbidden in ["access_token", "refresh_token", "account_id", "email"] {
        assert!(
            !public.contains(forbidden),
            "public output exposed {forbidden}"
        );
    }
}

async fn oauth_probe(
    variable: &str,
    provider: SubscriptionProvider,
    public_name: &str,
    client: ClientKind,
) {
    let Some(document) = protected(variable) else {
        return;
    };
    assert!(
        serde_json::from_str::<Value>(&document).is_ok(),
        "protected credential is not a JSON document"
    );
    let root = tempfile::tempdir().expect("live usage data dir");
    let home = root.path().join(provider.as_str());
    std::fs::create_dir_all(&home).expect("create isolated credential home");
    std::fs::write(
        home.join(provider.canonical_credential_filename()),
        &document,
    )
    .expect("write isolated credential copy");
    let reader = SubscriptionReader::new(provider, home);
    let mut state = test_state(root.path());
    state.subscription_reader = Some(reader.clone());
    state.subscription_readers = vec![reader];
    state.register_credential_recovery_in(root.path(), &VendorClis::default());

    let (status, body) = probe(state, public_name, client).await;
    assert_available(status, &body, public_name, &document);
}

#[tokio::test]
async fn real_anthropic_usage_source_is_normalized_without_inference() {
    oauth_probe(
        "ROUTER_LIVE_CLAUDE_CREDENTIAL_JSON",
        SubscriptionProvider::Claude,
        "anthropic",
        ClientKind::ClaudeCode,
    )
    .await;
}

#[tokio::test]
async fn real_openai_usage_source_is_normalized_without_inference() {
    oauth_probe(
        "ROUTER_LIVE_CODEX_CREDENTIAL_JSON",
        SubscriptionProvider::Codex,
        "openai",
        ClientKind::Codex,
    )
    .await;
}

/// Issue #548: the real subscription catalog can advertise a stable alias such
/// as `codex-auto-review` while inference reports the concrete selected model.
/// Every advertised id must remain the public identity on both lifecycle
/// events that carry a complete Responses object.
#[tokio::test]
async fn every_real_codex_model_keeps_its_native_stream_identity() {
    let Some(document) = protected("ROUTER_LIVE_CODEX_CREDENTIAL_JSON") else {
        return;
    };
    assert!(
        serde_json::from_str::<Value>(&document).is_ok(),
        "protected credential is not a JSON document"
    );
    let root = tempfile::tempdir().expect("live Codex identity data dir");
    let home = root.path().join("codex");
    std::fs::create_dir_all(&home).expect("create isolated Codex home");
    std::fs::write(
        home.join(SubscriptionProvider::Codex.canonical_credential_filename()),
        &document,
    )
    .expect("write isolated credential copy");
    let reader = SubscriptionReader::new(SubscriptionProvider::Codex, home);
    let mut state = test_state(root.path());
    state.upstream_provider = link_assistant_router::config::UpstreamProvider::Codex;
    state.subscription_reader = Some(reader.clone());
    state.subscription_readers = vec![reader.clone()];
    state.register_credential_recovery_in(root.path(), &VendorClis::default());
    link_assistant_router::model_catalog::refresh_catalogs(
        &state.client,
        &[reader],
        &state.subscription_cache,
        &state.model_catalogs,
    )
    .await;

    let headers = client_headers(&state, ClientKind::Codex);
    let catalog_path = "/api/services/codex/v1/models";
    let catalog_response = link_assistant_router::model_routing::models(
        State(state.clone()),
        OriginalUri(catalog_path.parse().expect("catalog URI")),
        headers.clone(),
    )
    .await;
    assert_eq!(catalog_response.status(), StatusCode::OK);
    let catalog_bytes = to_bytes(catalog_response.into_body(), 4 * 1024 * 1024)
        .await
        .expect("bounded live catalog response");
    let catalog: Value = serde_json::from_slice(&catalog_bytes).expect("live Codex catalog JSON");
    let models = catalog["data"]
        .as_array()
        .expect("live Codex catalog data")
        .iter()
        .filter_map(|model| model["id"].as_str().map(str::to_string))
        .collect::<Vec<_>>();
    assert!(
        !models.is_empty(),
        "live Codex catalog must advertise models"
    );

    for model in models {
        let response = link_assistant_router::proxy::openai_responses_native(
            State(state.clone()),
            headers.clone(),
            Ok(Json(serde_json::json!({
                "model": model,
                "input": [{
                    "type": "message",
                    "role": "user",
                    "content": [{"type": "input_text", "text": "Reply with one word: test"}]
                }],
                "tools": [],
                "tool_choice": "auto",
                "parallel_tool_calls": false,
                "reasoning": {"effort": "low", "summary": "auto", "context": "all_turns"},
                "include": ["reasoning.encrypted_content"],
                "store": false,
                "stream": true
            }))),
        )
        .await;
        assert_eq!(response.status(), StatusCode::OK, "native Responses status");
        assert!(
            response
                .headers()
                .keys()
                .all(|name| !name.as_str().starts_with("x-router-")),
            "native Responses emitted a Router-specific header"
        );
        let bytes = to_bytes(response.into_body(), 16 * 1024 * 1024)
            .await
            .expect("bounded native Responses stream");
        let stream = std::str::from_utf8(&bytes).expect("UTF-8 native Responses stream");
        assert!(!stream.contains("x_router_"));
        let mut created = false;
        let mut completed = false;
        for event in stream
            .lines()
            .filter_map(|line| line.strip_prefix("data: "))
            .filter(|payload| *payload != "[DONE]")
            .filter_map(|payload| serde_json::from_str::<Value>(payload).ok())
        {
            match event["type"].as_str() {
                Some("response.created") => {
                    assert_eq!(event["response"]["model"], model);
                    created = true;
                }
                Some("response.completed") => {
                    assert_eq!(event["response"]["model"], model);
                    completed = true;
                }
                _ => {}
            }
        }
        assert!(created, "native Responses omitted response.created");
        assert!(completed, "native Responses omitted response.completed");
    }
}

#[tokio::test]
async fn real_zai_usage_sources_are_normalized_without_inference() {
    let Some(api_key) = protected("ROUTER_LIVE_ZAI_API_KEY") else {
        return;
    };
    let root = tempfile::tempdir().expect("live usage data dir");
    let state = test_state(root.path());
    state
        .provider_store
        .upsert(ProviderUpsert {
            name: "z-ai".into(),
            kind: Some("zai-coding-plan".into()),
            base_url: "https://api.z.ai".into(),
            default_model: None,
            models: None,
            supported_clients: None,
            api_key: Some(api_key.clone()),
            api_key_env: None,
            encrypted_api_key: None,
            enabled: Some(true),
            subscriber_id: Some("primary".into()),
            acknowledge_intermediary_risk: Some(true),
            acknowledge_unsupported_clients: None,
            if_absent: false,
        })
        .expect("configure isolated z.ai credential");

    let (status, body) = probe(state, "z-ai", ClientKind::ClaudeCode).await;
    assert_available(status, &body, "z-ai", &api_key);
}
