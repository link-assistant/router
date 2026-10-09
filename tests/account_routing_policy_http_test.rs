//! Deterministic HTTP policy tests: no vendor credentials or external services.
use axum::{
    Json, Router,
    body::Body,
    extract::State,
    http::{HeaderMap, Request, StatusCode},
    response::{IntoResponse, Response},
    routing::post,
};
use link_assistant_router::account_routing_policy::{
    AccountRoutingPolicy, ErrorAction, ModelAlias, RequestScopedError,
};
use link_assistant_router::accounts::{AccountRouter, AccountRouterOptions, SelectionStrategy};
use link_assistant_router::app_state::AppState;
use link_assistant_router::subscription::SubscriptionProvider;
use lino_arguments::Parser as _;
use serde_json::{Value, json};
use std::sync::{Arc, Mutex};
use tower::ServiceExt;

struct Fixture {
    state: AppState,
    seen: Arc<Mutex<Vec<(HeaderMap, Value)>>>,
    server: tokio::task::JoinHandle<()>,
    homes: Vec<tempfile::TempDir>,
}
impl Fixture {
    async fn new(policy: AccountRoutingPolicy, status: StatusCode, error: &str) -> Self {
        Self::for_provider(policy, status, error, SubscriptionProvider::Claude).await
    }
    async fn for_provider(
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
        let handler = post(move |headers: HeaderMap, Json(body): Json<Value>| {
            let seen = Arc::clone(&capture);
            let error = error.clone();
            async move {
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
    fn token(&self, allowed: &str, pin: Option<&str>) -> String {
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
    async fn request(
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
    async fn close(self) {
        self.server.abort();
        assert!(self.server.await.unwrap_err().is_cancelled());
    }
}
async fn value(response: Response) -> Value {
    serde_json::from_slice(
        &axum::body::to_bytes(response.into_body(), 1024 * 1024)
            .await
            .unwrap(),
    )
    .unwrap()
}
fn aliased() -> AccountRoutingPolicy {
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

#[tokio::test]
async fn alias_catalog_request_response_and_safe_headers() {
    let f = Fixture::new(aliased(), StatusCode::OK, "").await;
    let mut headers = HeaderMap::new();
    headers.insert("x-api-key", f.token("native", None).parse().unwrap());
    let catalog = link_assistant_router::model_routing::models(
        State(f.state.clone()),
        axum::extract::OriginalUri("/api/services/anthropic/v1/models".parse().unwrap()),
        headers,
    )
    .await;
    assert_eq!(catalog.status(), StatusCode::OK);
    let catalog = value(catalog).await;
    assert_eq!(catalog["data"][0]["id"], "friendly", "{catalog}");
    assert_eq!(catalog["data"].as_array().unwrap().len(), 1);
    let response = f.request("friendly", "native", None, false).await;
    assert_eq!(response.status(), StatusCode::OK);
    let result = value(response).await;
    assert_eq!(result["model"], "friendly");
    assert_eq!(result["content"][0]["text"], "native");
    {
        let seen = f.seen.lock().unwrap().clone();
        assert_eq!(seen.len(), 1);
        assert_eq!(seen[0].1["model"], "native");
        assert_eq!(seen[0].0["authorization"], "Bearer vendor-0");
        assert_eq!(seen[0].0["x-static"], "operator");
        assert_eq!(seen[0].0["x-trace"], "trace-123");
        assert!(!seen[0].0.contains_key("cookie"));
    }
    f.close().await;
}

#[tokio::test]
async fn alias_cannot_bypass_upstream_grant_or_invent_live_model() {
    let f = Fixture::new(aliased(), StatusCode::OK, "").await;
    assert_eq!(
        f.request("friendly", "friendly", None, false)
            .await
            .status(),
        StatusCode::FORBIDDEN
    );
    assert_eq!(
        f.request("excluded", "", Some("primary"), false)
            .await
            .status(),
        StatusCode::NOT_FOUND
    );
    let mut policy = aliased();
    policy.model_aliases[0].model = "not-live".into();
    f.state
        .account_router
        .as_ref()
        .unwrap()
        .set_routing_policy("primary", policy)
        .unwrap();
    assert_eq!(
        f.request("friendly", "", None, false).await.status(),
        StatusCode::NOT_FOUND
    );
    assert!(f.seen.lock().unwrap().is_empty());
    f.close().await;
}

#[tokio::test]
async fn aliases_hide_shadowed_records_and_preserve_other_accounts_native_models() {
    let f = Fixture::new(aliased(), StatusCode::OK, "").await;
    for account in ["primary", "account-1"] {
        f.state.model_catalogs.record_success_for_account(
            SubscriptionProvider::Claude,
            account,
            None,
            vec!["native".into(), "friendly".into()],
        );
    }
    for (account, expected_status) in [
        ("primary", StatusCode::FORBIDDEN),
        ("account-1", StatusCode::OK),
    ] {
        let mut headers = HeaderMap::new();
        headers.insert(
            "x-api-key",
            f.token("friendly", Some(account)).parse().unwrap(),
        );
        let catalog = link_assistant_router::model_routing::models(
            State(f.state.clone()),
            axum::extract::OriginalUri("/api/services/anthropic/v1/models".parse().unwrap()),
            headers,
        )
        .await;
        assert_eq!(catalog.status(), StatusCode::OK);
        let catalog = value(catalog).await;
        if account == "primary" {
            assert!(catalog["data"].as_array().unwrap().is_empty(), "{catalog}");
        } else {
            assert_eq!(catalog["data"][0]["id"], "friendly", "{catalog}");
            assert_eq!(catalog["data"].as_array().unwrap().len(), 1);
        }
        assert_eq!(
            f.request("friendly", "friendly", Some(account), false)
                .await
                .status(),
            expected_status
        );
    }
    {
        let seen = f.seen.lock().unwrap().clone();
        assert_eq!(seen.len(), 1);
        assert_eq!(seen[0].0["authorization"], "Bearer vendor-1");
        assert_eq!(seen[0].1["model"], "friendly");
    }
    f.close().await;
}

struct RuntimeProcess(std::process::Child);
impl Drop for RuntimeProcess {
    fn drop(&mut self) {
        let _ = self.0.kill();
        let _ = self.0.wait();
    }
}

#[tokio::test]
async fn runtime_single_primary_without_policy_keeps_legacy_rate_limit_behavior() {
    let f = Fixture::new(
        AccountRoutingPolicy::default(),
        StatusCode::TOO_MANY_REQUESTS,
        "rate limited",
    )
    .await;
    std::fs::remove_file(f.homes[1].path().join("routing-policy.json")).unwrap();
    let args = [
        "--token-secret",
        "runtime-fixture-secret",
        "--storage-policy",
        "text",
        "--data-dir",
        f.homes[0].path().to_str().unwrap(),
        "--claude-code-home",
        f.homes[1].path().to_str().unwrap(),
        "--upstream-provider",
        "anthropic",
        "--upstream-base-url",
        &f.state.upstream_base_url,
    ];
    let binary = env!("CARGO_BIN_EXE_router");
    let issued = std::process::Command::new(binary)
        .args(args)
        .args(["tokens", "issue", "--admin"])
        .output()
        .unwrap();
    assert!(issued.status.success());
    let stdout = String::from_utf8(issued.stdout).unwrap();
    let admin = stdout
        .lines()
        .find(|line| line.starts_with(link_assistant_router::token::TOKEN_PREFIX))
        .unwrap();
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let port = listener.local_addr().unwrap().port().to_string();
    drop(listener);
    let log = std::fs::File::create(f.homes[0].path().join("runtime.log")).unwrap();
    let process = RuntimeProcess(
        std::process::Command::new(binary)
            .args(args)
            .args(["--host", "127.0.0.1", "--port", &port])
            .stdout(log.try_clone().unwrap())
            .stderr(log)
            .spawn()
            .unwrap(),
    );
    let base = format!("http://127.0.0.1:{port}");
    let deadline = tokio::time::Instant::now() + std::time::Duration::from_secs(5);
    while tokio::net::TcpStream::connect(format!("127.0.0.1:{port}"))
        .await
        .is_err()
    {
        assert!(
            tokio::time::Instant::now() < deadline,
            "runtime startup exceeded five seconds"
        );
        tokio::time::sleep(std::time::Duration::from_millis(25)).await;
    }
    let token: Value = f
        .state
        .client
        .post(format!("{base}/api/management/tokens/client"))
        .bearer_auth(admin)
        .json(&json!({"client_kind":"claude-code"}))
        .send()
        .await
        .unwrap()
        .json()
        .await
        .unwrap();
    let token = token["token"].as_str().expect("bound consumer token");
    let mut statuses = Vec::new();
    for policy in [
        None,
        Some(json!({"headers":{"X-Policy":"enabled"}})),
        Some(json!({})),
    ] {
        if let Some(policy) = policy {
            let response = f
                .state
                .client
                .post(format!("{base}/api/management/accounts/primary/policy"))
                .bearer_auth(admin)
                .json(&policy)
                .send()
                .await
                .unwrap();
            assert_eq!(response.status(), StatusCode::OK);
        }
        for _ in 0..2 {
            let response = f.state.client.post(format!("{base}/api/services/anthropic/v1/messages"))
                .header("x-api-key", token).header("user-agent", "claude-cli/2.1.259")
                .header("anthropic-version", "2023-06-01")
                .json(&json!({"model":"native","max_tokens":16,"messages":[{"role":"user","content":"hi"}]}))
                .send().await.unwrap();
            statuses.push(response.status());
        }
    }
    drop(process);
    let calls = f.seen.lock().unwrap().clone();
    f.close().await;
    assert_eq!(
        statuses,
        [
            StatusCode::TOO_MANY_REQUESTS,
            StatusCode::TOO_MANY_REQUESTS,
            StatusCode::TOO_MANY_REQUESTS,
            StatusCode::SERVICE_UNAVAILABLE,
            StatusCode::TOO_MANY_REQUESTS,
            StatusCode::TOO_MANY_REQUESTS
        ]
    );
    assert_eq!(calls.len(), 5);
    assert_eq!(calls[2].0["x-policy"], "enabled");
    for call in [&calls[0], &calls[1], &calls[3], &calls[4]] {
        assert!(!call.0.contains_key("x-policy"));
    }
}

#[tokio::test]
async fn alias_is_rewritten_in_stream_metadata() {
    let f = Fixture::new(aliased(), StatusCode::OK, "").await;
    let response = f.request("friendly", "native", None, true).await;
    assert_eq!(response.status(), StatusCode::OK);
    let bytes = axum::body::to_bytes(response.into_body(), 1024 * 1024)
        .await
        .unwrap();
    let text = std::str::from_utf8(&bytes).unwrap();
    assert!(text.contains("\"model\":\"friendly\""), "{text}");
    assert!(text.contains("data: [DONE]"));
    assert!(text.contains("native café"), "{text}");
    f.close().await;
}

#[tokio::test]
async fn aliases_cannot_bypass_native_model_cooldowns() {
    let f = Fixture::new(aliased(), StatusCode::OK, "").await;
    let router = f.state.account_router.as_ref().unwrap();
    router.set_routing_policy("account-1", aliased()).unwrap();
    let headers = HeaderMap::new();
    router.observe_upstream(&link_assistant_router::accounts::UpstreamObservation {
        account: "primary",
        model: Some("native"),
        status: 429,
        headers: &headers,
        body: br#"{"error":{"message":"native quota exceeded"}}"#,
        retry_after: Some(std::time::Duration::from_secs(60)),
    });
    let response = f.request("friendly", "native", None, false).await;
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(
        f.seen.lock().unwrap()[0].0["authorization"],
        "Bearer vendor-1"
    );
    f.close().await;
}

#[tokio::test]
async fn error_rules_relay_cooldown_and_retry_before_first_byte() {
    for action in [
        ErrorAction::Relay,
        ErrorAction::Cooldown,
        ErrorAction::RetryNext,
    ] {
        let policy = AccountRoutingPolicy {
            request_scoped_errors: vec![RequestScopedError {
                status: 429,
                body_match: "workspace quota".into(),
                action,
            }],
            ..Default::default()
        };
        let f = Fixture::new(policy, StatusCode::TOO_MANY_REQUESTS, "workspace quota").await;
        let response = f.request("native", "", None, false).await;
        if action == ErrorAction::RetryNext {
            assert_eq!(response.status(), StatusCode::OK);
            assert_eq!(f.seen.lock().unwrap().len(), 2);
        } else {
            assert_eq!(response.status(), StatusCode::TOO_MANY_REQUESTS);
            assert_eq!(response.headers()["retry-after"], "60");
            assert_eq!(
                axum::body::to_bytes(response.into_body(), 1024)
                    .await
                    .unwrap(),
                "workspace quota"
            );
            assert_eq!(f.seen.lock().unwrap().len(), 1);
        }
        let health = f.state.account_router.as_ref().unwrap().health_snapshot();
        assert_eq!(
            health[0].cooldown_remaining.is_some(),
            action != ErrorAction::Relay
        );
        assert_eq!(health[0].used, 1);
        f.close().await;
    }
}

#[tokio::test]
async fn retry_override_zero_and_strict_pins_stop_account_switching() {
    for (retry, pin) in [(Some(0), None), (Some(2), Some("primary")), (Some(1), None)] {
        let f = Fixture::new(
            AccountRoutingPolicy {
                request_retry: retry,
                ..Default::default()
            },
            StatusCode::SERVICE_UNAVAILABLE,
            "busy",
        )
        .await;
        let response = f.request("native", "", pin, false).await;
        let expected = if retry == Some(1) {
            StatusCode::OK
        } else {
            StatusCode::SERVICE_UNAVAILABLE
        };
        assert_eq!(response.status(), expected);
        assert_eq!(
            f.seen.lock().unwrap().len(),
            if expected.is_success() { 2 } else { 1 }
        );
        f.close().await;
    }
}

#[tokio::test]
async fn policy_management_requires_admin_and_persists_live_changes() {
    let f = Fixture::new(AccountRoutingPolicy::default(), StatusCode::OK, "").await;
    let mut state = f.state.clone();
    state.admin_key = Some("admin-fixture".into());
    let app = Router::new()
        .route(
            "/policy/{name}",
            post(link_assistant_router::account_policy_management::set_policy),
        )
        .with_state(state);
    let request = |key: &str, policy: Value| {
        Request::post("/policy/primary")
            .header("authorization", format!("Bearer {key}"))
            .header("content-type", "application/json")
            .body(Body::from(policy.to_string()))
            .unwrap()
    };
    assert_eq!(
        app.clone()
            .oneshot(request("client", json!({"weight":3})))
            .await
            .unwrap()
            .status(),
        StatusCode::UNAUTHORIZED
    );
    assert_eq!(
        app.clone()
            .oneshot(request(
                "admin-fixture",
                json!({"headers":{"x-copy":"$Cookie"}})
            ))
            .await
            .unwrap()
            .status(),
        StatusCode::BAD_REQUEST
    );
    assert_eq!(
        app.oneshot(request("admin-fixture", json!({"weight":3})))
            .await
            .unwrap()
            .status(),
        StatusCode::OK
    );
    assert_eq!(
        f.state
            .account_router
            .as_ref()
            .unwrap()
            .routing_policy("primary")
            .unwrap()
            .weight,
        3
    );
    assert_eq!(
        AccountRoutingPolicy::load(f.homes[1].path())
            .unwrap()
            .weight,
        3
    );
    f.close().await;
}

#[tokio::test]
async fn production_anthropic_handler_preserves_alias_and_actual_retry_account() {
    let mut policy = aliased();
    policy.request_retry = Some(1);
    let f = Fixture::new(policy.clone(), StatusCode::SERVICE_UNAVAILABLE, "busy").await;
    f.state
        .account_router
        .as_ref()
        .unwrap()
        .set_routing_policy("account-1", policy)
        .unwrap();
    let response = f.request("friendly", "native", None, false).await;
    let status = response.status();
    let result = value(response).await;
    assert_eq!(status, StatusCode::OK, "{result}");
    assert_eq!(result["model"], "friendly");
    {
        let seen = f.seen.lock().unwrap().clone();
        assert_eq!(seen.len(), 2);
        assert_eq!(seen[1].0["authorization"], "Bearer vendor-1");
        assert_eq!(seen[1].1["model"], "native");
        assert_eq!(seen[1].0["x-static"], "operator");
    }
    f.close().await;
}

struct PolicyEditingStore {
    reader: link_assistant_router::subscription::SubscriptionReader,
    router: AccountRouter,
}
impl std::fmt::Debug for PolicyEditingStore {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("PolicyEditingStore").finish_non_exhaustive()
    }
}
impl link_assistant_router::credential_store::CredentialStore for PolicyEditingStore {
    fn reload(&self) -> Option<link_assistant_router::subscription::SubscriptionToken> {
        // An admin edit after the middleware snapshots its authorized selector.
        let mut policy = aliased();
        policy.model_aliases[0].model = "other".into();
        self.router.set_routing_policy("primary", policy).unwrap();
        self.reader.read_token().ok()
    }
    fn persist(
        &self,
        token: &link_assistant_router::subscription::SubscriptionToken,
    ) -> Result<(), String> {
        self.reader.persist(token)
    }
    fn lock_path(&self) -> Option<std::path::PathBuf> {
        self.reader.lock_path()
    }
    fn describe(&self) -> String {
        self.reader.describe()
    }
}

#[tokio::test]
async fn live_policy_edit_cannot_retarget_the_validated_upstream_model() {
    let f = Fixture::new(aliased(), StatusCode::OK, "").await;
    let router = f.state.account_router.as_ref().unwrap();
    let reader = router.subscription_readers().remove(0).1;
    f.state.subscription_cache.register_store(
        SubscriptionProvider::Claude,
        "primary",
        Arc::new(PolicyEditingStore {
            reader,
            router: router.clone(),
        }),
    );
    f.state.model_catalogs.record_success_for_account(
        SubscriptionProvider::Claude,
        "primary",
        None,
        vec!["native".into(), "other".into()],
    );
    // Both native models are granted: selector stability is a separate check.
    let response = f.request("friendly", "", None, false).await;
    let status = response.status();
    let result = value(response).await;
    assert_eq!(status, StatusCode::BAD_GATEWAY, "{result}");
    assert!(f.seen.lock().unwrap().is_empty());
    f.close().await;
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

#[tokio::test]
async fn codex_bridge_uses_exact_alias_and_retains_legacy_model_selection() {
    for requested in ["friendly", "claude-client-model"] {
        let policy = if requested == "friendly" {
            aliased()
        } else {
            AccountRoutingPolicy {
                weight: 2,
                ..Default::default()
            }
        };
        let mut f =
            Fixture::for_provider(policy, StatusCode::OK, "", SubscriptionProvider::Codex).await;
        // A different configured bridge model must not displace an explicit operator alias.
        f.state.bridge_model = Some(
            if requested == "friendly" {
                "excluded"
            } else {
                "native"
            }
            .into(),
        );
        let response = f.request(requested, "native", None, false).await;
        let status = response.status();
        let result = value(response).await;
        assert_eq!(status, StatusCode::OK, "{result}");
        assert_eq!(result["model"], requested);
        assert_eq!(f.seen.lock().unwrap()[0].1["model"], "native");
        f.close().await;
    }
}

#[tokio::test]
async fn native_gemini_catalog_uses_aliases_and_upstream_grants() {
    let mut policy = aliased();
    policy.model_aliases[0].model = "models/native".into();
    let mut f =
        Fixture::for_provider(policy, StatusCode::OK, "", SubscriptionProvider::Gemini).await;
    f.state.model_catalogs.record_success_for_account(
        SubscriptionProvider::Gemini,
        "primary",
        None,
        vec!["models/native".into(), "models/excluded".into()],
    );
    let token = f
        .state
        .token_manager
        .issue_with_model_policy(
            &link_assistant_router::token::IssueRequest {
                client_kind: Some("gemini-cli"),
                principal_id: Some("primary"),
                ..Default::default()
            },
            &link_assistant_router::model_contract::ModelAccessPolicy::exact("native"),
        )
        .unwrap();
    let mut headers = HeaderMap::new();
    headers.insert("x-goog-api-key", token.parse().unwrap());
    headers.insert("user-agent", "GeminiCLI-tui/0.51.0".parse().unwrap());
    let response = link_assistant_router::gemini::native_models(
        State(f.state.clone()),
        axum::extract::OriginalUri("/api/services/gemini/v1beta/models".parse().unwrap()),
        headers,
    )
    .await;
    let status = response.status();
    let result = value(response).await;
    assert_eq!(status, StatusCode::OK, "{result}");
    assert_eq!(result["models"][0]["name"], "friendly");
    assert_eq!(result["models"].as_array().unwrap().len(), 1);
    for automatic in [false, true] {
        if automatic {
            f.state.upstream_provider = link_assistant_router::config::UpstreamProvider::Auto;
        }
        let config = link_assistant_router::cli::Cli::try_parse_from([
            "router",
            "--token-secret",
            "policy-fixture-secret",
            "--data-dir",
            f.homes[0].path().to_str().unwrap(),
        ])
        .unwrap()
        .into_config()
        .unwrap();
        let app = link_assistant_router::server_router::router(f.state.clone(), &config);
        let response = app
            .oneshot(
                Request::post("/api/services/gemini/v1beta/models/friendly:generateContent")
                    .header("content-type", "application/json")
                    .header("user-agent", "GeminiCLI-tui/0.51.0")
                    .header("x-goog-api-client", "gl-node/test gccl/test")
                    .header("x-goog-api-key", &token)
                    .body(Body::from(
                        json!({"contents":[{"role":"user","parts":[{"text":"hi"}]}]}).to_string(),
                    ))
                    .unwrap(),
            )
            .await
            .unwrap();
        let status = response.status();
        let result = value(response).await;
        assert_eq!(
            status,
            StatusCode::FORBIDDEN,
            "automatic={automatic}: {result}"
        );
    }
    let seen = f.seen.lock().unwrap().clone();
    assert!(
        seen.is_empty(),
        "unreviewed Gemini entitlement must remain blocked"
    );
    f.close().await;
}

#[tokio::test]
async fn native_gemini_alias_uses_authorized_claude_bridge() {
    let mut f = Fixture::new(aliased(), StatusCode::OK, "").await;
    f.state
        .provider_store
        .set_subscription_entitlement_policy(
            link_assistant_router::client_policy::SubscriptionEntitlementPolicy::parse([
                "gemini-cli:claude",
            ])
            .unwrap(),
        )
        .unwrap();
    let token = f
        .state
        .token_manager
        .issue_with_model_policy(
            &link_assistant_router::token::IssueRequest {
                client_kind: Some("gemini-cli"),
                principal_id: Some("primary"),
                ..Default::default()
            },
            &link_assistant_router::model_contract::ModelAccessPolicy::exact("native"),
        )
        .unwrap();
    for automatic in [false, true] {
        if automatic {
            f.state.upstream_provider = link_assistant_router::config::UpstreamProvider::Auto;
        }
        let config = link_assistant_router::cli::Cli::try_parse_from([
            "router",
            "--token-secret",
            "policy-fixture-secret",
            "--data-dir",
            f.homes[0].path().to_str().unwrap(),
        ])
        .unwrap()
        .into_config()
        .unwrap();
        let app = link_assistant_router::server_router::router(f.state.clone(), &config);
        let response = app
            .oneshot(
                Request::post("/api/services/gemini/v1beta/models/friendly:generateContent")
                    .header("content-type", "application/json")
                    .header("x-goog-api-client", "gl-node/test gccl/test")
                    .header("x-goog-api-key", &token)
                    .body(Body::from(
                        json!({"contents":[{"role":"user","parts":[{"text":"hi"}]}]}).to_string(),
                    ))
                    .unwrap(),
            )
            .await
            .unwrap();
        let status = response.status();
        let result = value(response).await;
        assert_eq!(status, StatusCode::OK, "automatic={automatic}: {result}");
        assert_eq!(result["modelVersion"], "friendly");
        assert_eq!(
            result["candidates"][0]["content"]["parts"][0]["text"],
            "native"
        );
    }
    let seen = f.seen.lock().unwrap().clone();
    assert_eq!(seen.len(), 2);
    assert_eq!(seen[0].1["model"], "native");
    assert_eq!(seen[1].0["authorization"], "Bearer vendor-0");
    f.close().await;
}
