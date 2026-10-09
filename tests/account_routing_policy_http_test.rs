//! Deterministic HTTP policy tests: no vendor credentials or external services.
use axum::{
    body::Body,
    extract::State,
    http::{HeaderMap, Request, StatusCode},
};
use link_assistant_router::account_routing_policy::{
    AccountRoutingPolicy, ErrorAction, RequestScopedError,
};
use link_assistant_router::accounts::AccountRouter;
use link_assistant_router::subscription::SubscriptionProvider;
use lino_arguments::Parser as _;
use serde_json::{Value, json};
use std::sync::Arc;
use tower::ServiceExt;
#[path = "support/account_policy_management.rs"]
mod management;

#[path = "support/account_policy_fixture.rs"]
mod fixture;
use fixture::{Fixture, aliased, value};

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
    management::assert_access_controls(state.clone()).await;
    let config = link_assistant_router::cli::Cli::try_parse_from([
        "router",
        "--token-secret",
        "policy-management-fixture-secret",
    ])
    .unwrap()
    .into_config()
    .unwrap();
    let app = link_assistant_router::server_router::router(state, &config);
    let request = |key: &str, policy: Value| {
        Request::post("/api/management/accounts/primary/policy")
            .header("authorization", format!("Bearer {key}"))
            .header("content-type", "application/json")
            .extension(axum::extract::ConnectInfo(
                "127.0.0.1:12345".parse::<std::net::SocketAddr>().unwrap(),
            ))
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
    for (uri_model, visible_model, prefix) in [
        ("friendly", "friendly", None),
        ("team%2Ffriendly", "team/friendly", Some("team")),
        ("caf%C3%A9%2Bpro", "café+pro", None),
    ] {
        let mut policy = aliased();
        policy.prefix = prefix.map(str::to_string);
        if prefix.is_none() {
            policy.model_aliases[0].alias = visible_model.into();
        }
        f.state
            .account_router
            .as_ref()
            .unwrap()
            .set_routing_policy("primary", policy)
            .unwrap();
        for automatic in [false, true] {
            f.state.upstream_provider = if automatic {
                link_assistant_router::config::UpstreamProvider::Auto
            } else {
                link_assistant_router::config::UpstreamProvider::Anthropic
            };
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
                    Request::post(format!(
                        "/api/services/gemini/v1beta/models/{uri_model}:generateContent"
                    ))
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
            assert_eq!(
                status,
                StatusCode::OK,
                "{uri_model}, automatic={automatic}: {result}"
            );
            assert_eq!(result["modelVersion"], visible_model);
            assert_eq!(
                result["candidates"][0]["content"]["parts"][0]["text"],
                "native"
            );
        }
    }
    let seen = f.seen.lock().unwrap().clone();
    assert_eq!(seen.len(), 6);
    assert_eq!(seen[0].1["model"], "native");
    assert_eq!(seen[1].0["authorization"], "Bearer vendor-0");
    f.close().await;
}
