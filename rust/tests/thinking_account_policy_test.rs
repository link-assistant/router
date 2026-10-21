//! Thinking controls compose with selected-account aliases and policy retries.
use axum::{
    body::Body,
    http::{Request, StatusCode},
    response::Response,
};
use link_assistant_router::{
    account_routing_policy::AccountRoutingPolicy, subscription::SubscriptionProvider,
};
use lino_arguments::Parser as _;
use serde_json::{Value, json};
use tower::ServiceExt as _;

#[path = "support/account_policy_fixture.rs"]
mod fixture;
use fixture::{Fixture, aliased, value};

async fn request(f: &Fixture, body: Value, allowed: &str) -> Response {
    let config = link_assistant_router::cli::Cli::try_parse_from([
        "router",
        "--token-secret",
        "thinking-policy-fixture",
        "--data-dir",
        f.homes[0].path().to_str().unwrap(),
    ])
    .unwrap()
    .into_config()
    .unwrap();
    link_assistant_router::server_router::router(f.state.clone(), &config)
        .oneshot(
            Request::post("/api/services/anthropic/v1/messages")
                .header("content-type", "application/json")
                .header("user-agent", "claude-cli/2.1.259")
                .header("anthropic-version", "2023-06-01")
                .header("x-api-key", f.token(allowed, None))
                .body(Body::from(body.to_string()))
                .unwrap(),
        )
        .await
        .unwrap()
}

fn body(model: &str) -> Value {
    json!({"model":model,"max_tokens":50000,"messages":[{"role":"user","content":"hi"}]})
}

fn capability(f: &Fixture, provider: SubscriptionProvider, account: &str, thinking: Value) {
    use link_assistant_router::{client_policy::ClientProtocol, model_catalog::CatalogRecord};
    let (endpoint, protocol) = match provider {
        SubscriptionProvider::Claude => ("/v1/models", ClientProtocol::AnthropicMessages),
        SubscriptionProvider::Codex => ("/models", ClientProtocol::OpenAIResponses),
        _ => panic!("fixture provider"),
    };
    let endpoint = format!("{}{endpoint}", f.state.upstream_base_url);
    let mut raw = json!({"router_account":account,
        "router_endpoint":endpoint,"router_source_url":endpoint,
        "router_health_generation":"policy-fixture-generation",
        "router_protocols":[protocol]})
    .as_object()
    .unwrap()
    .clone();
    raw.insert("thinking".into(), thinking);
    f.state.model_catalogs.record_records_for_account(
        provider,
        account,
        None,
        vec![CatalogRecord {
            provider,
            account: account.into(),
            canonical_id: "native".into(),
            raw,
            source_order: 0,
            fetched_at: chrono::Utc::now().timestamp(),
            health_generation: "policy-fixture-generation".into(),
            protocols: std::iter::once(protocol).collect(),
        }],
    );
}

async fn retry_fixture(provider: SubscriptionProvider) -> Fixture {
    let policy = AccountRoutingPolicy {
        request_retry: Some(1),
        ..aliased()
    };
    let f = Fixture::for_provider(policy, StatusCode::TOO_MANY_REQUESTS, "retry", provider).await;
    f.state
        .account_router
        .as_ref()
        .unwrap()
        .set_routing_policy("account-1", aliased())
        .unwrap();
    f
}

#[tokio::test]
async fn alias_and_prefix_suffixes_use_upstream_grants_and_body_precedence() {
    let f = Fixture::new(aliased(), StatusCode::OK, "").await;
    let response = request(&f, body("friendly(high)"), "native").await;
    let status = response.status();
    let result = value(response).await;
    assert_eq!(status, StatusCode::OK, "{result}");
    assert_eq!(result["model"], "friendly");
    assert_eq!(f.seen.lock().unwrap()[0].1["model"], "native");
    assert_eq!(
        f.seen.lock().unwrap()[0].1["thinking"]["budget_tokens"],
        24576
    );
    assert_eq!(
        f.request("friendly(high)", "friendly", None, false)
            .await
            .status(),
        StatusCode::FORBIDDEN
    );
    let mut explicit = body("friendly(high)");
    explicit["thinking"] = json!({"type":"enabled","budget_tokens":1280});
    assert_eq!(
        request(&f, explicit, "native").await.status(),
        StatusCode::OK
    );
    assert_eq!(
        f.seen.lock().unwrap()[1].1["thinking"]["budget_tokens"],
        1280
    );
    f.state
        .account_router
        .as_ref()
        .unwrap()
        .set_routing_policy(
            "primary",
            AccountRoutingPolicy {
                prefix: Some("team".into()),
                ..aliased()
            },
        )
        .unwrap();
    let response = request(&f, body("team/friendly(8192)"), "native").await;
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(value(response).await["model"], "team/friendly");
    assert_eq!(
        f.seen.lock().unwrap()[2].1["thinking"]["budget_tokens"],
        8192
    );
    assert_eq!(
        request(&f, body("team/friendly(typo)"), "native")
            .await
            .status(),
        StatusCode::FORBIDDEN
    );
    f.close().await;
}

#[tokio::test]
async fn policy_retry_restores_intent_dropped_for_the_first_account() {
    let f = retry_fixture(SubscriptionProvider::Claude).await;
    capability(
        &f,
        SubscriptionProvider::Claude,
        "primary",
        json!({"supported":false}),
    );
    capability(
        &f,
        SubscriptionProvider::Claude,
        "account-1",
        json!({"supported":true}),
    );
    let mut input = body("friendly");
    input["thinking"] = json!({"type":"enabled","budget_tokens":8192});
    let response = request(&f, input, "native").await;
    let status = response.status();
    let result = value(response).await;
    assert_eq!(status, StatusCode::OK, "{result}");
    let seen = f.seen.lock().unwrap().clone();
    assert_eq!(seen.len(), 2);
    assert!(seen[0].1.get("thinking").is_none());
    assert_eq!(seen[1].1["thinking"]["budget_tokens"], 8192);
    assert_eq!(seen[1].0["authorization"], "Bearer vendor-1");
    f.close().await;
}

#[tokio::test]
async fn policy_retry_revalidates_suffix_budget_for_the_new_account() {
    let f = retry_fixture(SubscriptionProvider::Claude).await;
    capability(
        &f,
        SubscriptionProvider::Claude,
        "primary",
        json!({"supported":true,"min_budget_tokens":1024,"max_budget_tokens":2048}),
    );
    capability(
        &f,
        SubscriptionProvider::Claude,
        "account-1",
        json!({"supported":true,"min_budget_tokens":1024,"max_budget_tokens":6144}),
    );
    let mut input = body("friendly(8192)");
    input["messages"] = json!([
        {"role":"assistant","content":[
            {"type":"thinking","thinking":"private","signature":"first-account-only"},
            {"type":"text","text":"keep this"}]},
        {"role":"user","content":"hi"}
    ]);
    let response = request(&f, input, "native").await;
    let status = response.status();
    let result = value(response).await;
    assert_eq!(status, StatusCode::OK, "{result}");
    let seen = f.seen.lock().unwrap().clone();
    assert_eq!(seen.len(), 2);
    assert_eq!(seen[0].1["thinking"]["budget_tokens"], 2048);
    assert_eq!(seen[1].1["thinking"]["budget_tokens"], 6144);
    assert_eq!(
        seen[0].1["messages"][0]["content"][0]["signature"],
        "first-account-only"
    );
    assert_eq!(
        seen[1].1["messages"][0]["content"],
        json!([{"type":"text","text":"keep this"}])
    );
    f.close().await;
}

#[tokio::test]
async fn invalid_explicit_budget_on_retry_remains_a_client_error() {
    let f = retry_fixture(SubscriptionProvider::Claude).await;
    capability(
        &f,
        SubscriptionProvider::Claude,
        "primary",
        json!({"supported":true,"min_budget_tokens":1024,"max_budget_tokens":20000}),
    );
    capability(
        &f,
        SubscriptionProvider::Claude,
        "account-1",
        json!({"supported":true,"min_budget_tokens":1024,"max_budget_tokens":4096}),
    );
    let mut input = body("friendly");
    input["thinking"] = json!({"type":"enabled","budget_tokens":8192});
    let response = request(&f, input, "native").await;
    let status = response.status();
    let result = value(response).await;
    assert_eq!(status, StatusCode::BAD_REQUEST, "{result}");
    assert_eq!(f.seen.lock().unwrap().len(), 1);
    f.close().await;
}

#[tokio::test]
async fn codex_policy_retry_restores_translated_thinking() {
    let f = retry_fixture(SubscriptionProvider::Codex).await;
    capability(
        &f,
        SubscriptionProvider::Codex,
        "primary",
        json!({"supported":false}),
    );
    capability(
        &f,
        SubscriptionProvider::Codex,
        "account-1",
        json!({"supported":true,"levels":["low","medium","high"]}),
    );
    let response = request(&f, body("friendly(8192)"), "native").await;
    let status = response.status();
    let result = value(response).await;
    assert_eq!(status, StatusCode::OK, "{result}");
    assert_eq!(result["model"], "friendly");
    let seen = f.seen.lock().unwrap().clone();
    assert_eq!(seen.len(), 2);
    assert!(
        seen[0].1.pointer("/reasoning/effort").is_none(),
        "{}",
        seen[0].1
    );
    assert_eq!(seen[1].1["reasoning"]["effort"], "medium");
    assert_eq!(seen[1].0["authorization"], "Bearer vendor-1");
    f.close().await;
}

#[tokio::test]
async fn compressed_native_retry_restores_effort_and_summary_without_encrypted_history() {
    let f = retry_fixture(SubscriptionProvider::Codex).await;
    capability(
        &f,
        SubscriptionProvider::Codex,
        "primary",
        json!({"supported":false}),
    );
    capability(
        &f,
        SubscriptionProvider::Codex,
        "account-1",
        json!({"supported":true,"levels":["high"]}),
    );
    let token = f
        .state
        .token_manager
        .issue_with_model_policy(
            &link_assistant_router::token::IssueRequest {
                client_kind: Some("codex"),
                principal_id: Some("primary"),
                ..Default::default()
            },
            &link_assistant_router::model_contract::ModelAccessPolicy::exact("native"),
        )
        .unwrap();
    let config = link_assistant_router::cli::Cli::try_parse_from([
        "router",
        "--token-secret",
        "thinking-policy-fixture",
        "--data-dir",
        f.homes[0].path().to_str().unwrap(),
    ])
    .unwrap()
    .into_config()
    .unwrap();
    let input = json!({"model":"friendly(low)","reasoning":{"effort":"high","summary":"detailed"},
        "input":[{"type":"reasoning","encrypted_content":"first-account-only"},
            {"role":"user","content":"keep this"}],"stream":true,"store":false});
    let bytes = zstd::encode_all(input.to_string().as_bytes(), 0).unwrap();
    let response = link_assistant_router::server_router::router(f.state.clone(), &config)
        .oneshot(
            Request::post("/api/services/codex/v1/responses")
                .header("content-type", "application/json")
                .header("content-encoding", "zstd")
                .header("authorization", format!("Bearer {token}"))
                .header("user-agent", "codex_exec/0.153.0")
                .header("originator", "codex_cli_rs")
                .header("x-codex-turn-metadata", "thinking-policy-fixture")
                .body(Body::from(bytes))
                .unwrap(),
        )
        .await
        .unwrap();
    let status = response.status();
    let output = axum::body::to_bytes(response.into_body(), 1024 * 1024)
        .await
        .unwrap();
    assert_eq!(
        status,
        StatusCode::OK,
        "{}",
        String::from_utf8_lossy(&output)
    );
    assert!(String::from_utf8_lossy(&output).contains("\"model\":\"friendly\""));
    let seen = f.seen.lock().unwrap().clone();
    assert_eq!(seen.len(), 2);
    assert!(seen[0].1.pointer("/reasoning/effort").is_none());
    assert_eq!(seen[0].1["reasoning"]["summary"], "detailed");
    assert_eq!(
        seen[0].1["input"][0]["encrypted_content"],
        "first-account-only"
    );
    assert_eq!(
        seen[1].1["reasoning"],
        json!({"effort":"high","summary":"detailed"})
    );
    assert_eq!(
        seen[1].1["input"],
        json!([{"role":"user","content":"keep this"}])
    );
    assert_eq!(seen[1].0["content-encoding"], "zstd");
    assert_eq!(seen[1].0["authorization"], "Bearer vendor-1");
    f.close().await;
}

#[tokio::test]
async fn encoded_native_alias_suffix_preserves_controls_and_body_precedence() {
    for provider in [SubscriptionProvider::Claude, SubscriptionProvider::Codex] {
        let f = Fixture::for_provider(aliased(), StatusCode::OK, "", provider).await;
        f.state
            .provider_store
            .set_subscription_entitlement_policy(
                link_assistant_router::client_policy::SubscriptionEntitlementPolicy::parse([
                    &format!("gemini-cli:{}", provider.as_str()),
                ])
                .unwrap(),
            )
            .unwrap();
        capability(
            &f,
            provider,
            "primary",
            if provider == SubscriptionProvider::Claude {
                json!({"supported":true,"min_budget_tokens":1024,"max_budget_tokens":4096})
            } else {
                json!({"supported":true,"levels":["low"]})
            },
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
        let config = link_assistant_router::cli::Cli::try_parse_from([
            "router",
            "--token-secret",
            "thinking-policy-fixture",
            "--data-dir",
            f.homes[0].path().to_str().unwrap(),
        ])
        .unwrap()
        .into_config()
        .unwrap();
        let app = link_assistant_router::server_router::router(f.state.clone(), &config);
        for (thinking, expected) in [(json!({}), true), (json!({"thinkingBudget":0}), false)] {
            let response = app
                .clone()
                .oneshot(
                    Request::post(
                        "/api/services/gemini/v1beta/models/friendly%28high%29:generateContent",
                    )
                    .header("content-type", "application/json")
                    .header("user-agent", "GeminiCLI-tui/0.51.0")
                    .header("x-goog-api-client", "gl-node/test gccl/test")
                    .header("x-goog-api-key", &token)
                    .body(Body::from(
                        json!({"contents":[{"role":"user","parts":[{"text":"hi"}]}],
                    "generationConfig":{"maxOutputTokens":50000,"thinkingConfig":thinking}})
                        .to_string(),
                    ))
                    .unwrap(),
                )
                .await
                .unwrap();
            let status = response.status();
            let result = value(response).await;
            assert_eq!(status, StatusCode::OK, "{result}");
            assert_eq!(result["modelVersion"], "friendly");
            let forwarded = f.seen.lock().unwrap().last().unwrap().1.clone();
            let thinking = &forwarded["thinking"];
            if provider == SubscriptionProvider::Codex {
                assert_eq!(
                    forwarded["reasoning"]["effort"],
                    if expected { "low" } else { "none" }
                );
            } else if expected {
                assert_eq!(thinking["type"], "enabled");
                assert_eq!(thinking["budget_tokens"], 4096);
            } else {
                assert!(thinking.is_null());
                assert!(forwarded.pointer("/output_config/effort").is_none());
            }
        }
        f.close().await;
    }
}
