//! Replay recorded real-client requests against the router (issue #211).
//!
//! The fast tests otherwise assert hand-written request shapes, and nothing
//! checks those shapes against what the real clients send. The one tier that
//! uses real binaries is opt-in and runs nowhere in CI, so the suite can stay
//! green while its assumptions drift away from the wire.
//!
//! Issue #206 is the worked example: every unit test passed while the
//! documented Gemini CLI setup returned `401` on its first request, because no
//! test sent what Gemini CLI actually sends. These fixtures carry the real
//! headers, paths and credential carriers, so that class of defect fails here —
//! in milliseconds, offline, with no vendor credential involved.
//!
//! Recording needs a subscription; replaying does not. See
//! `tests/fixtures/clients/README.md` for how to refresh one.

use std::sync::Arc;
use std::time::Duration;

use axum::body::Body;
use axum::http::{Method, Request, StatusCode};
use http_body_util::BodyExt as _;
use link_assistant_router::admin::AdminClaim;
use link_assistant_router::app_state::AppState;
use link_assistant_router::cli::Cli;
use link_assistant_router::clients::ClientKind;
use link_assistant_router::model_catalog::ModelCatalogCache;
use link_assistant_router::oauth::OAuthProvider;
use link_assistant_router::providers::ProviderStore;
use link_assistant_router::refresh::TokenCache;
use link_assistant_router::token::TokenManager;
use lino_arguments::Parser as _;
use serde_json::Value;
use tower::ServiceExt as _;

/// A model every fixture is rewritten to request, so routing is deterministic.
const FIXTURE_MODEL: &str = "gpt-5";

struct Fixture {
    file: String,
    client: String,
    method: String,
    path: String,
    carrier: String,
    headers: Vec<(String, String)>,
    body: Value,
}

fn load_fixtures() -> Vec<Fixture> {
    let dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures/clients");
    let mut fixtures = Vec::new();
    for entry in std::fs::read_dir(&dir).expect("fixture directory exists") {
        let path = entry.expect("readable fixture entry").path();
        if path.extension().and_then(|e| e.to_str()) != Some("json") {
            continue;
        }
        let file = path
            .file_name()
            .and_then(|n| n.to_str())
            .expect("UTF-8 fixture name")
            .to_string();
        let raw = std::fs::read_to_string(&path).expect("read fixture");
        let value: Value = serde_json::from_str(&raw)
            .unwrap_or_else(|error| panic!("{file} is not valid JSON: {error}"));
        let headers = value["headers"]
            .as_object()
            .unwrap_or_else(|| panic!("{file} has no headers object"))
            .iter()
            .map(|(name, value)| {
                (
                    name.clone(),
                    value
                        .as_str()
                        .expect("header value is a string")
                        .to_string(),
                )
            })
            .collect();
        fixtures.push(Fixture {
            client: value["client"].as_str().expect("client").to_string(),
            method: value["method"].as_str().expect("method").to_string(),
            path: value["path"]
                .as_str()
                .expect("path")
                .replace("{model}", FIXTURE_MODEL),
            carrier: value["credential_carrier"]
                .as_str()
                .expect("credential_carrier")
                .to_string(),
            headers,
            body: replace_model(&value["body"]),
            file,
        });
    }
    assert!(!fixtures.is_empty(), "no client fixtures were loaded");
    fixtures
}

/// Substitute the `{model}` placeholder anywhere it appears in a body.
fn replace_model(body: &Value) -> Value {
    match body {
        Value::String(text) => Value::String(text.replace("{model}", FIXTURE_MODEL)),
        Value::Array(items) => Value::Array(items.iter().map(replace_model).collect()),
        Value::Object(fields) => Value::Object(
            fields
                .iter()
                .map(|(key, value)| (key.clone(), replace_model(value)))
                .collect(),
        ),
        other => other.clone(),
    }
}

/// A router with no reachable upstream. These tests assert on authentication
/// and dispatch, both of which are decided before any upstream is contacted.
fn test_app(dir: &std::path::Path, client: ClientKind) -> (axum::Router, String) {
    let dir_arg = dir.to_str().expect("UTF-8 test path");
    let config = Cli::try_parse_from(vec![
        "router",
        "--token-secret",
        "fixture-secret",
        "--data-dir",
        dir_arg,
        "--upstream-base-url",
        "http://127.0.0.1:9",
    ])
    .expect("test CLI parses")
    .into_config()
    .expect("test config is valid");
    let token_manager = TokenManager::new("fixture-secret");
    let token = token_manager
        .issue(&link_assistant_router::token::IssueRequest {
            ttl_hours: 1,
            label: "fixture client",
            account: Some("primary"),
            client_kind: Some(client.canonical_name()),
            principal_id: Some("primary"),
            ..link_assistant_router::token::IssueRequest::default()
        })
        .expect("issue bound client token");
    let provider_store = ProviderStore::open(dir, "fixture-secret").expect("provider store");
    provider_store
        .set_subscription_entitlement_policy(
            link_assistant_router::client_policy::SubscriptionEntitlementPolicy::parse([
                "opencode:claude",
                "qwen:claude",
                "gemini:claude",
            ])
            .expect("fixture bridge policy"),
        )
        .expect("install fixture bridge policy");
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
        provider_store,
        logger: log_lazy::LogLazy::new(),
        admin: Arc::new(AdminClaim::load(
            Some("fixture-admin".to_string()),
            dir,
            Duration::from_secs(60),
        )),
        admin_key: Some("fixture-admin".to_string()),
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

/// Replay a fixture, optionally overriding the credential it presents.
async fn replay(fixture: &Fixture, credential: Option<&str>) -> (StatusCode, Value) {
    let dir = tempfile::tempdir().expect("tempdir");
    let client = ClientKind::from_str_opt(&fixture.client).expect("known fixture client");
    let (app, token) = test_app(dir.path(), client);
    let credential = credential.map_or(token, str::to_string);
    let mut request = Request::builder()
        .method(Method::from_bytes(fixture.method.as_bytes()).expect("method"))
        .uri(&fixture.path);
    for (name, value) in &fixture.headers {
        request = request.header(name, value);
    }
    // The recorded credential value is never stored; it is injected here into
    // the carrier the real client uses.
    let value = if fixture.carrier.eq_ignore_ascii_case("authorization") {
        format!("Bearer {credential}")
    } else {
        credential
    };
    let request = request
        .header(&fixture.carrier, value)
        .body(Body::from(
            serde_json::to_vec(&fixture.body).expect("serialize fixture body"),
        ))
        .expect("build fixture request");
    let response = app.oneshot(request).await.expect("router response");
    let status = response.status();
    let body = response
        .into_body()
        .collect()
        .await
        .expect("response body")
        .to_bytes();
    (status, serde_json::from_slice(&body).unwrap_or(Value::Null))
}

/// Every fixture must authenticate with the carrier its real client uses. This
/// is the precise contract issue #206 violated.
#[tokio::test]
async fn every_recorded_client_authenticates_with_its_own_carrier() {
    for fixture in load_fixtures() {
        let (status, body) = replay(&fixture, None).await;
        assert!(
            status != StatusCode::UNAUTHORIZED && status != StatusCode::FORBIDDEN,
            "{} ({}) was refused at the credential check via {}: {status} {body}",
            fixture.file,
            fixture.client,
            fixture.carrier
        );
    }
}

/// Every fixture must reach a real route. This is the other half of #206: the
/// path a client actually calls can differ from the one synthetic tests
/// exercise — Gemini CLI calls `:streamGenerateContent?alt=sse`, not
/// `:generateContent`.
///
/// The router answers `route not found` for an unserved path, and a
/// *model*-not-found for a served path whose catalog is empty (which is the
/// case here, since no subscription is connected). Only the former is a
/// routing failure, so the two `404`s are told apart by their message rather
/// than collapsed.
#[tokio::test]
async fn every_recorded_client_reaches_a_route() {
    for fixture in load_fixtures() {
        let (status, body) = replay(&fixture, None).await;
        if status != StatusCode::NOT_FOUND {
            continue;
        }
        let message = serde_json::to_string(&body).unwrap_or_default();
        assert!(
            !message.contains("route not found"),
            "{} ({}) hit no route at {} {}: {message}",
            fixture.file,
            fixture.client,
            fixture.method,
            fixture.path
        );
    }
}

/// An invalid credential in the same carrier must still be refused, so the
/// contract above cannot be satisfied by accepting anything.
#[tokio::test]
async fn every_recorded_client_is_refused_an_invalid_credential() {
    for fixture in load_fixtures() {
        let (status, _) = replay(&fixture, Some("la_sk_not_a_real_token")).await;
        assert_eq!(
            status,
            StatusCode::UNAUTHORIZED,
            "{} ({}) accepted an invalid credential in {}",
            fixture.file,
            fixture.client,
            fixture.carrier
        );
    }
}

/// The vendor headers real clients send must not disturb routing. Seven of the
/// eight headers catalogued in issue #211 appear nowhere in the tree; the
/// router very likely handles them by ignoring them, but that was an assumption
/// no test stated.
#[tokio::test]
async fn vendor_specific_headers_do_not_disturb_routing() {
    for fixture in load_fixtures() {
        let (with_headers, _) = replay(&fixture, None).await;
        let stripped = Fixture {
            headers: fixture
                .headers
                .iter()
                .filter(|(name, _)| name == "content-type" || name == "anthropic-version")
                .cloned()
                .collect(),
            ..fixture
        };
        let (without_headers, _) = replay(&stripped, None).await;
        assert_eq!(
            with_headers, without_headers,
            "{} routed differently once its vendor headers were removed",
            stripped.file
        );
    }
}
