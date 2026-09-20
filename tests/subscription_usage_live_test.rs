//! Opt-in acceptance tests for protected subscription credentials.
//!
//! Usage probes do not call inference. The Codex identity and z.ai Claude
//! compatibility regressions use small inference requests. Every test is a
//! no-op unless its protected environment variable is present; secret values
//! are never printed or included in assertion output.

mod common;

use axum::body::to_bytes;
use axum::extract::{Json, OriginalUri, Path as AxumPath, State};
use axum::http::{HeaderMap, HeaderValue, StatusCode};
use link_assistant_router::app_state::{AppState, VendorClis};
use link_assistant_router::cli::Cli;
use link_assistant_router::clients::ClientKind;
use link_assistant_router::config::Config;
use link_assistant_router::providers::ProviderUpsert;
use link_assistant_router::route_contract::ListenerKind;
use link_assistant_router::subscription::{SubscriptionProvider, SubscriptionReader};
use link_assistant_router::subscription_usage::usage_provider;
use link_assistant_router::token::IssueRequest;
use lino_arguments::Parser as _;
use serde_json::Value;
use std::path::Path;
use std::process::{Command, Output, Stdio};
use std::sync::Arc;
use std::time::Duration;
use wait_timeout::ChildExt as _;

const LIVE_TEST_SECRET: &str = "real-usage-smoke-router-secret";

fn test_state(data_dir: &std::path::Path) -> AppState {
    AppState {
        client: reqwest::Client::new(),
        token_manager: link_assistant_router::token::TokenManager::new(LIVE_TEST_SECRET),
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
        provider_store: link_assistant_router::providers::ProviderStore::open(
            data_dir,
            LIVE_TEST_SECRET,
        )
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

fn live_config(data_dir: &Path) -> Config {
    Cli::try_parse_from([
        "router",
        "--token-secret",
        LIVE_TEST_SECRET,
        "--data-dir",
        data_dir.to_str().expect("UTF-8 live-smoke data dir"),
        "--upstream-provider",
        "auto",
    ])
    .expect("live-smoke CLI parses")
    .into_config()
    .expect("live-smoke config is valid")
}

fn install_zai(state: &AppState, api_key: String) {
    state
        .provider_store
        .upsert(ProviderUpsert {
            name: "z-ai".into(),
            kind: Some("zai-coding-plan".into()),
            base_url: "https://api.z.ai".into(),
            default_model: None,
            models: None,
            supported_clients: None,
            api_key: Some(api_key),
            api_key_env: None,
            encrypted_api_key: None,
            enabled: Some(true),
            subscriber_id: Some("primary".into()),
            acknowledge_intermediary_risk: Some(true),
            acknowledge_unsupported_clients: None,
            if_absent: false,
        })
        .expect("configure isolated z.ai credential");
}

fn run_live_claude_context_attempt(home: &Path, origin: &str, token: &str, model: &str) -> Output {
    let mut child = Command::new(env!("CARGO_BIN_EXE_with-router"))
        .args([
            "--server",
            origin,
            "--token",
            token,
            "--model",
            model,
            "--non-interactive",
            "claude",
            "--debug",
            "--verbose",
            "--output-format",
            "stream-json",
            "--max-turns",
            "1",
            "Reply with exactly ROUTER_CONTEXT_OK.",
        ])
        .current_dir(env!("CARGO_MANIFEST_DIR"))
        .env("HOME", home)
        .env("XDG_CONFIG_HOME", home.join(".config"))
        .env("CI", "1")
        .env("NO_COLOR", "1")
        .env("DISABLE_AUTOUPDATER", "1")
        // These settings can override the very behavior this acceptance test
        // measures. The current client and its exact model metadata must own
        // the observed limit.
        .env_remove("CLAUDE_CODE_AUTO_COMPACT_WINDOW")
        .env_remove("CLAUDE_CODE_MAX_CONTEXT_TOKENS")
        .env_remove("DISABLE_COMPACT")
        .env("NO_PROXY", "127.0.0.1,localhost")
        .env("no_proxy", "127.0.0.1,localhost")
        .env("HTTP_PROXY", "http://127.0.0.1:9")
        .env("HTTPS_PROXY", "http://127.0.0.1:9")
        .env("ALL_PROXY", "http://127.0.0.1:9")
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .expect("attempt to launch the current Claude Code through Router");
    if child
        .wait_timeout(Duration::from_secs(120))
        .expect("wait for live Claude context probe")
        .is_none()
    {
        child
            .kill()
            .expect("stop timed-out live Claude context probe");
        panic!("the live Claude context probe did not finish within 120s");
    }
    child
        .wait_with_output()
        .expect("collect live Claude context output")
}

fn reported_claude_model_limit(output: &Output) -> Option<u64> {
    let combined = format!(
        "{}\n{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );
    let amount = combined
        .split("model limit of ")
        .nth(1)?
        .split_whitespace()
        .next()?
        .trim_matches(|character: char| !character.is_ascii_alphanumeric() && character != '.')
        .to_ascii_lowercase();
    let (number, multiplier) = amount.strip_suffix('k').map_or_else(
        || {
            amount
                .strip_suffix('m')
                .map_or((amount.as_str(), 1_u64), |number| (number, 1_000_000))
        },
        |number| (number, 1_000),
    );
    let number = number.replace(',', "");
    let (whole, fraction) = number.split_once('.').unwrap_or((&number, ""));
    let scaled_whole = whole.parse::<u64>().ok()?.checked_mul(multiplier)?;
    if fraction.is_empty() {
        return Some(scaled_whole);
    }
    let digits = u32::try_from(fraction.len()).ok()?;
    let divisor = 10_u64.checked_pow(digits)?;
    let scaled_fraction = fraction
        .parse::<u64>()
        .ok()?
        .checked_mul(multiplier)?
        .checked_add(divisor / 2)?
        / divisor;
    scaled_whole.checked_add(scaled_fraction)
}

fn exact_live_field<'a>(entry: &'a Value, field: &str) -> Option<&'a Value> {
    let evidence = entry.pointer(&format!("/capability_provenance/fields/{field}"))?;
    let model = entry["id"].as_str()?;
    (evidence["scope"]["model"] == model
        && evidence["unknown"] == false
        && evidence["conflict"] == false
        && evidence["source_url"].is_string())
    .then(|| &evidence["value"])
}

/// A live credential, announcing and counting the skip when it is absent.
///
/// Every live-tier skip goes through one place, so a run that passes can still
/// say which properties it did not prove (issue #567).
fn live_credential(test: &str, variable: &str) -> Option<String> {
    common::tiers::live_credential(test, variable)
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
            headers.insert("user-agent", HeaderValue::from_static("claude-cli/2.1.265"));
            headers.insert("anthropic-version", HeaderValue::from_static("2023-06-01"));
        }
        ClientKind::Codex => {
            headers.insert("user-agent", HeaderValue::from_static("codex_exec/0.154.0"));
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
    test: &str,
    variable: &str,
    provider: SubscriptionProvider,
    public_name: &str,
    client: ClientKind,
) {
    let Some(document) = live_credential(test, variable) else {
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
        "real_anthropic_usage_source_is_normalized_without_inference",
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
        "real_openai_usage_source_is_normalized_without_inference",
        "ROUTER_LIVE_CODEX_CREDENTIAL_JSON",
        SubscriptionProvider::Codex,
        "openai",
        ClientKind::Codex,
    )
    .await;
}

/// Native Responses bytes remain provider-owned. A stable request alias such
/// as `codex-auto-review` may therefore produce a concrete served model; both
/// lifecycle objects must report one non-empty, consistent upstream identity.
#[tokio::test]
async fn every_real_codex_model_reports_a_consistent_native_served_identity() {
    let Some(document) = live_credential(
        "every_real_codex_model_keeps_its_native_stream_identity",
        "ROUTER_LIVE_CODEX_CREDENTIAL_JSON",
    ) else {
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
    let models = catalog["models"]
        .as_array()
        .expect("live Codex ModelInfo catalog")
        .iter()
        .filter_map(|model| model["slug"].as_str().map(str::to_string))
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
        let mut created_model = None;
        let mut completed_model = None;
        for event in stream
            .lines()
            .filter_map(|line| line.strip_prefix("data: "))
            .filter(|payload| *payload != "[DONE]")
            .filter_map(|payload| serde_json::from_str::<Value>(payload).ok())
        {
            match event["type"].as_str() {
                Some("response.created") => {
                    created_model = event["response"]["model"].as_str().map(str::to_string);
                }
                Some("response.completed") => {
                    completed_model = event["response"]["model"].as_str().map(str::to_string);
                }
                _ => {}
            }
        }
        let created_model = created_model.expect("native Responses omitted served identity");
        assert!(
            !created_model.is_empty(),
            "served identity must be concrete"
        );
        assert_eq!(
            completed_model.as_deref(),
            Some(created_model.as_str()),
            "native lifecycle events must agree on served identity"
        );
    }
}

#[tokio::test]
async fn real_zai_usage_sources_are_normalized_without_inference() {
    let Some(api_key) = live_credential(
        "real_zai_usage_sources_are_normalized_without_inference",
        "ROUTER_LIVE_ZAI_API_KEY",
    ) else {
        return;
    };
    let root = tempfile::tempdir().expect("live usage data dir");
    let state = test_state(root.path());
    install_zai(&state, api_key.clone());

    let (status, body) = probe(state, "z-ai", ClientKind::ClaudeCode).await;
    assert_available(status, &body, "z-ai", &api_key);
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn real_zai_exact_model_is_pinned_and_served_identity_is_truthful() {
    let Some(api_key) = live_credential(
        "real_zai_exact_model_is_pinned_and_served_identity_is_truthful",
        "ROUTER_LIVE_ZAI_API_KEY",
    ) else {
        return;
    };
    eprintln!("RUN: validating live z.ai catalog, exact pin, and served identity");

    let root = tempfile::tempdir().expect("live z.ai data dir");
    let state = test_state(root.path());
    install_zai(&state, api_key);
    let config = live_config(root.path());
    let token_manager = state.token_manager.clone();
    let discovery_token = token_manager
        .issue(&IssueRequest {
            ttl_hours: 1,
            label: "live z.ai model discovery",
            account: Some("primary"),
            client_kind: Some(ClientKind::Codex.canonical_name()),
            principal_id: Some("primary"),
            ..IssueRequest::default()
        })
        .expect("issue live z.ai discovery token");
    let app = link_assistant_router::server_router::router_for_listener(
        state,
        &config,
        ListenerKind::Combined,
    );
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
        .await
        .expect("bind live z.ai Router");
    let origin = format!(
        "http://{}",
        listener.local_addr().expect("live Router address")
    );
    let server = tokio::spawn(async move {
        axum::serve(listener, app)
            .await
            .expect("serve live z.ai Router");
    });

    let catalog: Value = reqwest::Client::new()
        .get(format!("{origin}/api/models"))
        .bearer_auth(&discovery_token)
        .header("x-link-assistant-client", "codex")
        .header("user-agent", "codex_exec/live-model-truth")
        .send()
        .await
        .expect("fetch live z.ai Router catalog")
        .error_for_status()
        .expect("live z.ai Router catalog status")
        .json()
        .await
        .expect("live z.ai Router catalog JSON");
    let model = catalog["data"]
        .as_array()
        .and_then(|models| models.iter().find(|model| model["owned_by"] == "z.ai"))
        .and_then(|model| model["id"].as_str())
        .expect("live z.ai catalog exact model")
        .to_string();
    let catalog_entry = catalog["data"]
        .as_array()
        .and_then(|models| models.iter().find(|entry| entry["id"] == model))
        .expect("selected live catalog entry");
    for capability in [
        "context_window",
        "max_output_tokens",
        "modalities",
        "supported_reasoning_levels",
        "client_capabilities",
    ] {
        if catalog_entry.get(capability).is_some() {
            let evidence = &catalog_entry["capability_provenance"]["fields"][capability];
            assert_eq!(evidence["scope"]["model"], model);
            assert!(evidence["source_url"].is_string());
            assert!(evidence["retrieved_at"].is_string() || evidence["retrieved_at"].is_number());
            assert_eq!(evidence["unknown"], false);
        }
    }

    let token = token_manager
        .issue_with_model_policy(
            &IssueRequest {
                ttl_hours: 1,
                label: "live z.ai exact model",
                account: Some("primary"),
                client_kind: Some(ClientKind::Codex.canonical_name()),
                principal_id: Some("primary"),
                ..IssueRequest::default()
            },
            &link_assistant_router::model_contract::ModelAccessPolicy::exact(&model),
        )
        .expect("issue live z.ai exact-model token");
    let reply = reqwest::Client::new()
        .post(format!("{origin}/api/services/codex/v1/responses"))
        .bearer_auth(&token)
        .header("user-agent", "codex_exec/live-model-truth")
        .header("originator", "codex_exec")
        .json(&serde_json::json!({
            "model": model.clone(),
            "input": "Reply with exactly OK.",
            "max_output_tokens": 16,
            "stream": false
        }))
        .send()
        .await
        .expect("make live exact-model inference");
    let reply_status = reply.status();
    let reply_body = reply.bytes().await.expect("read live exact-model reply");
    assert!(
        reply_status.is_success(),
        "live exact-model inference failed with {reply_status}: {}",
        String::from_utf8_lossy(&reply_body)
    );
    let reply: Value = serde_json::from_slice(&reply_body).expect("live Responses JSON");
    assert_eq!(
        reply["model"], model,
        "the response must report the concrete model that served the request"
    );
    eprintln!("PROVEN: requested and served exact live z.ai model `{model}`");
    server.abort();
}

/// Issue #594's credentialed drift gate. This is deliberately separate from
/// the ordinary z.ai live probe because it requires a currently supported
/// `claude` binary and can bill one minimal inference per verified model.
///
/// An inventory-only catalog is expected to take the other valid branch: the
/// launch attempt must stop before Claude starts instead of giving both GLM
/// models one fabricated Anthropic identity and a 200K effective window.
#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn current_claude_reports_each_live_glm_context_or_router_blocks_the_launch() {
    let Some(api_key) = live_credential(
        "current_claude_reports_each_live_glm_context_or_router_blocks_the_launch",
        "ROUTER_LIVE_ZAI_API_KEY",
    ) else {
        return;
    };
    if std::env::var("ROUTER_LIVE_ZAI_CLAUDE_CONTEXT_TEST").as_deref() != Ok("1") {
        eprintln!(
            "SKIP [tier4-live-credentialed] \
             current_claude_reports_each_live_glm_context_or_router_blocks_the_launch: \
             ROUTER_LIVE_ZAI_CLAUDE_CONTEXT_TEST=1 was not set; the current-Claude, billed \
             context probe was not authorized."
        );
        return;
    }
    let version = Command::new("claude")
        .arg("--version")
        .stdin(Stdio::null())
        .output()
        .expect("ROUTER_LIVE_ZAI_CLAUDE_CONTEXT_TEST requires claude on PATH");
    assert!(
        version.status.success(),
        "the installed Claude Code could not report its version: {}",
        String::from_utf8_lossy(&version.stderr)
    );
    eprintln!(
        "RUN: probing exact GLM context with {}",
        String::from_utf8_lossy(&version.stdout).trim()
    );

    let root = tempfile::tempdir().expect("live z.ai Claude context data dir");
    let state = test_state(root.path());
    install_zai(&state, api_key);
    let config = live_config(root.path());
    let token_manager = state.token_manager.clone();
    let discovery_token = token_manager
        .issue(&IssueRequest {
            ttl_hours: 1,
            label: "live z.ai Claude context discovery",
            account: Some("primary"),
            client_kind: Some(ClientKind::ClaudeCode.canonical_name()),
            principal_id: Some("primary"),
            ..IssueRequest::default()
        })
        .expect("issue live z.ai Claude discovery token");
    let admin_token = token_manager
        .issue_admin_token(1, "live z.ai Claude context launcher")
        .expect("issue isolated live-test administrator token");
    let app = link_assistant_router::server_router::router_for_listener(
        state,
        &config,
        ListenerKind::Combined,
    );
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
        .await
        .expect("bind live z.ai Claude Router");
    let origin = format!(
        "http://{}",
        listener.local_addr().expect("live Claude Router address")
    );
    let server = tokio::spawn(async move {
        axum::serve(listener, app)
            .await
            .expect("serve live z.ai Claude Router");
    });

    let catalog: Value = reqwest::Client::new()
        .get(format!("{origin}/api/models"))
        .bearer_auth(&discovery_token)
        .header("x-link-assistant-client", "claude")
        .header("user-agent", "claude-cli/live-model-truth")
        .send()
        .await
        .expect("fetch live z.ai Claude catalog")
        .error_for_status()
        .expect("live z.ai Claude catalog status")
        .json()
        .await
        .expect("live z.ai Claude catalog JSON");

    for model in ["glm-5.3", "glm-5.3-flash"] {
        let entry = catalog["data"]
            .as_array()
            .and_then(|models| models.iter().find(|entry| entry["id"] == model))
            .unwrap_or_else(|| panic!("the live account did not advertise required `{model}`"));
        let verified_context = exact_live_field(entry, "context_window").and_then(Value::as_u64);
        let verified_claude =
            exact_live_field(entry, "client_capabilities").and_then(|value| value.get("claude"));

        let output = tokio::task::spawn_blocking({
            let home = root.path().join(format!("claude-{model}"));
            std::fs::create_dir_all(&home).expect("create isolated live Claude home");
            let origin = origin.clone();
            let admin_token = admin_token.clone();
            let model = model.to_string();
            move || run_live_claude_context_attempt(&home, &origin, &admin_token, &model)
        })
        .await
        .expect("join live Claude context process");
        let stderr = String::from_utf8_lossy(&output.stderr);

        if let (Some(expected), Some(_)) = (verified_context, verified_claude) {
            assert!(
                output.status.success(),
                "live Claude context run for `{model}` failed: {stderr}"
            );
            let reported = reported_claude_model_limit(&output).unwrap_or_else(|| {
                panic!(
                    "current Claude did not report its effective model/compaction limit for \
                     `{model}`; stderr: {stderr}"
                )
            });
            // Claude abbreviates limits (for example, `1m`) in diagnostic
            // output. Allow that presentation rounding while still
            // rejecting the observed 200K-versus-1M contradiction.
            let difference = reported.abs_diff(expected);
            assert!(
                difference <= expected / 10,
                "`{model}` advertised {expected} tokens but current Claude reported {reported}"
            );
            eprintln!("PROVEN: current Claude reported {reported} tokens for exact `{model}`");
        } else {
            assert!(
                !output.status.success(),
                "`{model}` lacks exact consumable Claude/context evidence but launched"
            );
            assert!(
                stderr.contains("no verified capability metadata")
                    || stderr.contains("incomplete capability metadata"),
                "`{model}` must fail with an actionable unsupported-capability error: {stderr}"
            );
            eprintln!(
                "PROVEN: `{model}` has no exact consumable Claude/context evidence and Router \
                 stopped before inference"
            );
        }
    }
    server.abort();
}
