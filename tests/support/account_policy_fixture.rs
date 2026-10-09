//! Deterministic HTTP policy tests: no vendor credentials or external services.
use axum::{
    Json, Router,
    body::Body,
    http::{HeaderMap, Request, StatusCode},
    response::{IntoResponse, Response},
    routing::post,
};
use link_assistant_router::account_routing_policy::{AccountRoutingPolicy, ModelAlias};
use link_assistant_router::accounts::{AccountRouter, AccountRouterOptions, SelectionStrategy};
use link_assistant_router::app_state::AppState;
use link_assistant_router::subscription::SubscriptionProvider;
use lino_arguments::Parser as _;
use serde_json::{Value, json};
use std::sync::{Arc, Mutex};
use tower::ServiceExt;
pub struct Fixture {
    pub(super) state: AppState,
    pub(super) seen: Arc<Mutex<Vec<(HeaderMap, Value)>>>,
    pub(super) server: tokio::task::JoinHandle<()>,
    pub(super) homes: Vec<tempfile::TempDir>,
}
impl Fixture {
    pub(super) async fn new(policy: AccountRoutingPolicy, status: StatusCode, error: &str) -> Self {
        Self::for_provider(policy, status, error, SubscriptionProvider::Claude).await
    }
    pub(super) async fn for_provider(
        policy: AccountRoutingPolicy,
        status: StatusCode,
        error: &str,
        provider: SubscriptionProvider,
    ) -> Self {
        let homes: Vec<_> = (0..3).map(|_| tempfile::tempdir().unwrap()).collect();
        for (index, home) in homes[1..].iter().enumerate() {
            std::fs::write(
                home.path().join("credentials.json"),
                json!({"accessToken":format!("vendor-{index}")}).to_string(),
            )
            .unwrap();
        }
        for (index, home) in homes[1..].iter().enumerate() {
            std::fs::write(
                home.path().join("auth.json"),
                json!({"tokens":{"access_token":format!("vendor-{index}")}}).to_string(),
            )
            .unwrap();
            std::fs::write(
                home.path().join("oauth_creds.json"),
                json!({"access_token":format!("vendor-{index}")}).to_string(),
            )
            .unwrap();
        }
        policy.save(homes[1].path()).unwrap();
        let seen = Arc::new(Mutex::new(Vec::new()));
        let capture = Arc::clone(&seen);
        let error = error.to_string();
        let handler = post(move |headers: HeaderMap, bytes: bytes::Bytes| {
            let seen = Arc::clone(&capture);
            let error = error.clone();
            async move {
                let decoded = if headers.get("content-encoding").is_some_and(|v| v == "zstd") {
                    use std::io::Read as _;
                    let reader = zstd::stream::read::Decoder::new(bytes.as_ref()).unwrap();
                    let mut decoded = Vec::new();
                    reader
                        .take(1024 * 1024 + 1)
                        .read_to_end(&mut decoded)
                        .unwrap();
                    assert!(decoded.len() <= 1024 * 1024);
                    decoded
                } else {
                    bytes.to_vec()
                };
                let body: Value = serde_json::from_slice(&decoded).unwrap();
                seen.lock().unwrap().push((headers.clone(), body.clone()));
                if headers["authorization"] == "Bearer vendor-0" && !status.is_success() {
                    return (status, [("retry-after", "60")], error).into_response();
                }
                if provider == SubscriptionProvider::Codex {
                    return (StatusCode::OK, [("content-type", "text/event-stream")], format!("event: response.completed\ndata: {}\n\n", json!({"type":"response.completed","response":{"id":"resp-fixture","object":"response","model":body["model"],"status":"completed","output":[{"type":"message","role":"assistant","content":[{"type":"output_text","text":"native"}]}]}}))).into_response();
                }
                if body["stream"] == true {
                    let payload = format!(
                        "event: message_start\r\ndata: {}\r\n\r\ndata: [DONE]\n\n",
                        json!({"type":"message_start","message":{"model":body["model"],"content":[{"text":"native café"}]}})
                    );
                    let chunks: Vec<_> = payload
                        .as_bytes()
                        .chunks(3)
                        .map(|chunk| Ok::<_, std::io::Error>(bytes::Bytes::copy_from_slice(chunk)))
                        .collect();
                    return (
                        StatusCode::OK,
                        [("content-type", "text/event-stream")],
                        Body::from_stream(futures_util::stream::iter(chunks)),
                    )
                        .into_response();
                }
                Json(json!({"model":body["model"],"content":[{"type":"text","text":"native"}]}))
                    .into_response()
            }
        });
        let upstream = Router::new()
            .route("/v1/messages", handler.clone())
            .route("/v1/responses", handler.clone())
            .route("/responses", handler);
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let base = format!("http://{}", listener.local_addr().unwrap());
        let server = tokio::spawn(async move {
            axum::serve(listener, upstream).await.unwrap();
        });
        let mut state = test_state(homes[0].path());
        state.client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(5))
            .build()
            .unwrap();
        state.upstream_provider = match provider {
            SubscriptionProvider::Claude => {
                link_assistant_router::config::UpstreamProvider::Anthropic
            }
            SubscriptionProvider::Codex => link_assistant_router::config::UpstreamProvider::Codex,
            SubscriptionProvider::Gemini => link_assistant_router::config::UpstreamProvider::Gemini,
            SubscriptionProvider::Qwen => link_assistant_router::config::UpstreamProvider::Qwen,
        };
        state.upstream_base_url.clone_from(&base);
        state.subscription_base_url = Some(base);
        if provider == SubscriptionProvider::Codex {
            state
                .provider_store
                .set_subscription_entitlement_policy(
                    link_assistant_router::client_policy::SubscriptionEntitlementPolicy::parse([
                        "claude-code:codex",
                    ])
                    .unwrap(),
                )
                .unwrap();
        }
        let router = AccountRouter::new_for_provider(
            homes[1].path().into(),
            &[homes[2].path().into()],
            provider,
            AccountRouterOptions {
                strategy: SelectionStrategy::Priority,
                ..Default::default()
            },
        );
        router.register_credential_stores(&state.subscription_cache);
        state.account_router = Some(router);
        for account in ["primary", "account-1"] {
            state.model_catalogs.record_success_for_account(
                provider,
                account,
                None,
                vec!["native".into(), "excluded".into()],
            );
        }
        Self {
            state,
            seen,
            server,
            homes,
        }
    }
    pub(super) fn token(&self, allowed: &str, pin: Option<&str>) -> String {
        self.state
            .token_manager
            .issue_with_model_policy(
                &link_assistant_router::token::IssueRequest {
                    client_kind: Some("claude-code"),
                    principal_id: Some(pin.unwrap_or("primary")),
                    account: pin,
                    ..Default::default()
                },
                &if allowed.is_empty() {
                    link_assistant_router::model_contract::ModelAccessPolicy::default()
                } else {
                    link_assistant_router::model_contract::ModelAccessPolicy::exact(allowed)
                },
            )
            .unwrap()
    }
    pub(super) async fn request(
        &self,
        model: &str,
        allowed: &str,
        pin: Option<&str>,
        stream: bool,
    ) -> Response {
        let config = link_assistant_router::cli::Cli::try_parse_from([
            "router",
            "--token-secret",
            "policy-fixture-secret",
            "--data-dir",
            self.homes[0].path().to_str().unwrap(),
        ])
        .unwrap()
        .into_config()
        .unwrap();
        let app = link_assistant_router::server_router::router(self.state.clone(), &config);
        app.oneshot(
            Request::post("/api/services/anthropic/v1/messages")
                .header("content-type", "application/json")
                .header("user-agent", "claude-cli/2.1.259")
                .header("anthropic-version", "2023-06-01")
                .header("x-api-key", self.token(allowed, pin))
                .header("x-request-id", "trace-123")
                .header("cookie", "client-secret")
                .body(Body::from(
                    json!({"model":model,"stream":stream,"max_tokens":16,"messages":[{"role":"user","content":"hi"}]}).to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap()
    }
    pub(super) async fn close(self) {
        self.server.abort();
        assert!(self.server.await.unwrap_err().is_cancelled());
    }
}
pub async fn value(response: Response) -> Value {
    serde_json::from_slice(
        &axum::body::to_bytes(response.into_body(), 1024 * 1024)
            .await
            .unwrap(),
    )
    .unwrap()
}
pub fn aliased() -> AccountRoutingPolicy {
    AccountRoutingPolicy {
        model_aliases: vec![ModelAlias {
            model: "native".into(),
            alias: "friendly".into(),
            fork: false,
        }],
        excluded_models: vec!["excl*".into()],
        headers: [
            ("x-static".into(), "operator".into()),
            ("x-trace".into(), "$X-Request-Id".into()),
        ]
        .into(),
        ..Default::default()
    }
}

fn test_state(data_dir: &std::path::Path) -> AppState {
    use std::sync::Arc;
    AppState {
        client: reqwest::Client::new(),
        token_manager: link_assistant_router::token::TokenManager::new("test-secret"),
        oauth_provider: link_assistant_router::oauth::OAuthProvider::new(
            &data_dir.to_string_lossy(),
        ),
        account_router: None,
        subscription_reader: None,
        subscription_base_url: None,
        subscription_readers: Vec::new(),
        model_catalogs: Arc::new(link_assistant_router::model_catalog::ModelCatalogCache::new()),
        subscription_cache: Arc::new(link_assistant_router::refresh::TokenCache::new()),
        upstream_base_url: "https://api.anthropic.com".to_string(),
        upstream_provider: link_assistant_router::config::UpstreamProvider::Auto,
        gonka: None,
        bridge_model: None,
        bridge_model_policy: link_assistant_router::bridge_selection::BridgeModelPolicy::default(),
        crater: None,
        openai_compatible: link_assistant_router::config::default_openai_compatible_config(),
        provider_store: link_assistant_router::providers::ProviderStore::open(
            data_dir,
            "test-secret",
        )
        .expect("open a provider store"),
        logger: log_lazy::LogLazy::new(),
        admin: Arc::new(link_assistant_router::admin::AdminClaim::load(
            None,
            data_dir,
            std::time::Duration::from_secs(60),
        )),
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
