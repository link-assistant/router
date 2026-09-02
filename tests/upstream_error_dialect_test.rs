//! One upstream failure, rendered correctly on every client surface (issue #213).
//!
//! The Anthropic and Gemini surfaces already translated upstream errors into
//! their own dialect; the `OpenAI` surfaces relayed the vendor's body verbatim.
//! That had two consequences: a client written against the `OpenAI` SDK could not
//! classify the failure, and the body carried fields describing the *router
//! operator's* subscription — `plan_type`, `eligible_promo`, `resets_at` — which
//! say nothing about the caller's request and, in a shared deployment, disclose
//! the operator's billing posture to anyone who triggers a `429`.
//!
//! The upstream body below is the real one from the issue.

use std::sync::Arc;
use std::time::Duration;

use axum::Router;
use axum::body::Body;
use axum::http::{HeaderValue, StatusCode};
use axum::response::Response;
use link_assistant_router::app_state::AppState;
use link_assistant_router::clients::ClientKind;
use link_assistant_router::config::UpstreamProvider;
use link_assistant_router::model_catalog::ModelCatalogCache;
use link_assistant_router::oauth::OAuthProvider;
use link_assistant_router::refresh::TokenCache;
use link_assistant_router::subscription::{SubscriptionProvider, SubscriptionReader};
use link_assistant_router::token::{IssueRequest, TokenManager};
use lino_arguments::Parser as _;
use serde_json::{Value, json};
use tempfile::TempDir;

/// The vendor's rate-limit body, verbatim from the issue: an error `type` that
/// is not an `OpenAI` type, beside three operator-account fields.
const UPSTREAM_RATE_LIMIT: &str = r#"{"error":{"type":"usage_limit_reached","message":"The usage limit has been reached","plan_type":"free","resets_at":1789529537,"eligible_promo":null,"resets_in_seconds":2488890}}"#;

/// Fields that describe the operator's subscription rather than the request.
const OPERATOR_FIELDS: [&str; 4] = [
    "plan_type",
    "eligible_promo",
    "resets_at",
    "usage_limit_reached",
];

struct TestRouter {
    client: reqwest::Client,
    url: String,
    claude_token: String,
    codex_token: String,
    opencode_token: String,
    tasks: Vec<tokio::task::JoinHandle<()>>,
    _data: TempDir,
}

impl TestRouter {
    async fn start() -> Self {
        let data = tempfile::tempdir().expect("temporary test data");
        let stub = Router::new().fallback(rate_limited_vendor);
        let (stub_url, stub_task) = spawn(stub).await;

        let token_manager = TokenManager::new("upstream-error-secret");
        let issue_client = |client: ClientKind| {
            token_manager
                .issue(&IssueRequest {
                    ttl_hours: 1,
                    label: "upstream error client",
                    account: Some("primary"),
                    client_kind: Some(client.canonical_name()),
                    principal_id: Some("primary"),
                    ..IssueRequest::default()
                })
                .expect("issue bound test token")
        };
        let claude_token = issue_client(ClientKind::ClaudeCode);
        let codex_token = issue_client(ClientKind::Codex);
        let opencode_token = issue_client(ClientKind::Opencode);
        let oauth_provider = OAuthProvider::new(data.path().to_str().expect("UTF-8 test path"));
        oauth_provider.set_token("stub-anthropic-oauth-token");

        let codex_home = data.path().join("codex");
        std::fs::create_dir_all(&codex_home).expect("create Codex home");
        std::fs::write(
            codex_home.join("auth.json"),
            r#"{"tokens":{"access_token":"stub-codex-oauth-token","account_id":"acct_stub"}}"#,
        )
        .expect("write Codex credentials");

        let catalogs = Arc::new(ModelCatalogCache::new());
        catalogs.record_success_for(
            SubscriptionProvider::Codex,
            Some("acct_stub".to_string()),
            vec!["gpt-5".to_string()],
        );

        let config = link_assistant_router::cli::Cli::try_parse_from(vec![
            "router",
            "--token-secret",
            "upstream-error-secret",
            "--data-dir",
            data.path().to_str().expect("UTF-8 test path"),
        ])
        .expect("test CLI parses")
        .into_config()
        .expect("test config is valid");

        let provider_store = link_assistant_router::providers::ProviderStore::open(
            data.path(),
            "upstream-error-secret",
        )
        .expect("provider store");
        provider_store
            .set_subscription_entitlement_policy(
                link_assistant_router::client_policy::SubscriptionEntitlementPolicy::parse([
                    "claude:codex",
                    "opencode:codex",
                ])
                .expect("upstream error bridge policy"),
            )
            .expect("install upstream error bridge policy");
        let state = AppState {
            client: reqwest::Client::new(),
            token_manager,
            oauth_provider,
            account_router: None,
            subscription_reader: None,
            subscription_base_url: Some(stub_url.clone()),
            subscription_readers: vec![SubscriptionReader::new(
                SubscriptionProvider::Codex,
                &codex_home,
            )],
            model_catalogs: catalogs,
            subscription_cache: Arc::new(TokenCache::new()),
            upstream_base_url: stub_url,
            upstream_provider: UpstreamProvider::Auto,
            gonka: None,
            bridge_model: None,
            bridge_model_policy:
                link_assistant_router::bridge_selection::BridgeModelPolicy::default(),
            crater: None,
            openai_compatible: link_assistant_router::config::default_openai_compatible_config(),
            provider_store,
            logger: log_lazy::LogLazy::new(),
            admin: Arc::new(link_assistant_router::admin::AdminClaim::load(
                Some("admin-only".to_string()),
                data.path(),
                Duration::from_secs(60),
            )),
            admin_key: Some("admin-only".to_string()),
            allow_anonymous_admin: false,
            metrics: Arc::new(link_assistant_router::metrics::Metrics::default()),
            audit: Arc::new(link_assistant_router::audit::AuditLog::to_path(None)),
            request_log: Arc::new(link_assistant_router::request_log::RequestLog::new(
                data.path().join("requests"),
                1024 * 1024,
            )),
            activitypub_actor_base_url: "https://router.test".to_string(),
            activitypub_public_key_pem:
                link_assistant_router::config::default_activitypub_public_key_pem(),
            mpp: link_assistant_router::config::default_mpp_config(),
            login_manager: link_assistant_router::login::LoginManager::new(
                link_assistant_router::login::LoginConfig::default(),
            ),
            github: link_assistant_router::github_proxy::GitHubProxyConfig::default(),
            max_proxy_request_bytes: link_assistant_router::config::DEFAULT_MAX_PROXY_REQUEST_BYTES,
        };

        let app = link_assistant_router::server_router::router(state, &config);
        let (url, router_task) = spawn(app).await;

        Self {
            client: reqwest::Client::new(),
            url,
            claude_token,
            codex_token,
            opencode_token,
            tasks: vec![stub_task, router_task],
            _data: data,
        }
    }

    async fn post(&self, path: &str, body: &Value) -> (StatusCode, Value) {
        let request = self.client.post(format!("{}{path}", self.url));
        let request = if path.ends_with("/v1/messages") {
            request
                .header("x-api-key", &self.claude_token)
                .header("anthropic-version", "2023-06-01")
        } else if path.ends_with("/v1/responses") {
            request
                .bearer_auth(&self.codex_token)
                .header("x-openai-internal-codex-responses-lite", "true")
        } else {
            request
                .bearer_auth(&self.opencode_token)
                .header("user-agent", "opencode/upstream-error-test")
                .header("x-session-id", "upstream-error-test")
        };
        let response = request.json(body).send().await.expect("router POST");
        let status = response.status();
        let text = response.text().await.expect("router POST body");
        (
            status,
            serde_json::from_str(&text).unwrap_or(Value::String(text)),
        )
    }
}

impl Drop for TestRouter {
    fn drop(&mut self) {
        for task in &self.tasks {
            task.abort();
        }
    }
}

async fn spawn(app: Router) -> (String, tokio::task::JoinHandle<()>) {
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
        .await
        .expect("bind test server");
    let address = listener.local_addr().expect("test server address");
    let task = tokio::spawn(async move {
        axum::serve(listener, app).await.expect("serve test app");
    });
    (format!("http://{address}"), task)
}

/// Every upstream call fails the same way, so one condition can be compared
/// across surfaces.
async fn rate_limited_vendor() -> Response {
    let mut response = Response::new(Body::from(UPSTREAM_RATE_LIMIT));
    *response.status_mut() = StatusCode::TOO_MANY_REQUESTS;
    response
        .headers_mut()
        .insert("content-type", HeaderValue::from_static("application/json"));
    response
}

fn body_text(body: &Value) -> String {
    serde_json::to_string(body).expect("serialize body")
}

/// The `OpenAI` surfaces must render the vendor failure in the `OpenAI` dialect
/// rather than passing it through.
#[tokio::test]
async fn openai_surfaces_render_upstream_errors_in_their_own_dialect() {
    let router = TestRouter::start().await;
    for path in [
        "/api/services/openai/v1/chat/completions",
        "/api/services/openai/v1/responses",
    ] {
        let (status, body) = router
            .post(
                path,
                &json!({"model": "gpt-5", "messages": [{"role": "user", "content": "hi"}]}),
            )
            .await;
        assert_eq!(status, StatusCode::TOO_MANY_REQUESTS, "{path}: {body}");
        assert_eq!(
            body["error"]["type"], "rate_limit_error",
            "{path} must use an OpenAI error type: {body}"
        );
        assert_eq!(
            body["error"]["code"], "rate_limit_exceeded",
            "{path} must be classifiable by code: {body}"
        );
        // The caller must still learn what happened.
        assert!(
            body["error"]["message"]
                .as_str()
                .is_some_and(|message| message.contains("usage limit")),
            "{path} lost the message: {body}"
        );
    }
}

/// The operator's account details must not reach the caller on any surface.
#[tokio::test]
async fn no_surface_forwards_operator_account_fields() {
    let router = TestRouter::start().await;
    for path in [
        "/api/services/openai/v1/chat/completions",
        "/api/services/openai/v1/responses",
    ] {
        let (_, body) = router
            .post(
                path,
                &json!({"model": "gpt-5", "messages": [{"role": "user", "content": "hi"}]}),
            )
            .await;
        let text = body_text(&body);
        for field in OPERATOR_FIELDS {
            assert!(
                !text.contains(field),
                "{path} leaked the operator field {field}: {text}"
            );
        }
    }
}

/// The Anthropic surface already translated correctly and must keep doing so:
/// it consumes the `OpenAI`-dialect body this change now produces.
#[tokio::test]
async fn the_anthropic_surface_rendering_is_unchanged() {
    let router = TestRouter::start().await;
    let (status, body) = router
        .post(
            "/api/services/anthropic/v1/messages",
            &json!({
                "model": "gpt-5",
                "max_tokens": 16,
                "messages": [{"role": "user", "content": "hi"}]
            }),
        )
        .await;
    assert_eq!(status, StatusCode::TOO_MANY_REQUESTS, "{body}");
    assert_eq!(body["type"], "error", "{body}");
    assert_eq!(body["error"]["type"], "rate_limit_error", "{body}");
    assert!(
        body["error"]["message"]
            .as_str()
            .is_some_and(|message| message.contains("usage limit")),
        "the Anthropic surface lost the message: {body}"
    );
    let text = body_text(&body);
    for field in OPERATOR_FIELDS {
        assert!(!text.contains(field), "leaked {field}: {text}");
    }
}
