//! Source overlays exercised through production management and inference routes.
use super::*;
use axum::body::Body;
use axum::extract::ConnectInfo;
use axum::http::{HeaderMap, Request, StatusCode};
use axum::response::IntoResponse as _;
use http_body_util::BodyExt as _;
use lino_arguments::Parser as _;
use serde_json::json;
use std::sync::{Arc, Mutex};
use tower::ServiceExt as _;

fn configure(state: &crate::app_state::AppState, entries: &[&str]) {
    state
        .model_catalogs
        .sources()
        .configure(CatalogSourcesConfig {
            local_models: entries
                .iter()
                .map(|entry| local_model(entry).unwrap())
                .collect(),
            ..CatalogSourcesConfig::default()
        })
        .unwrap();
}

fn token(state: &crate::app_state::AppState, model: &str) -> String {
    state
        .token_manager
        .issue_with_model_policy(
            &crate::token::IssueRequest {
                ttl_hours: 1,
                client_kind: Some("opencode"),
                principal_id: Some("primary"),
                account: Some("primary"),
                ..crate::token::IssueRequest::default()
            },
            &crate::model_contract::ModelAccessPolicy::exact(model),
        )
        .unwrap()
}

async fn json_body(response: axum::response::Response) -> Value {
    serde_json::from_slice(&response.into_body().collect().await.unwrap().to_bytes()).unwrap()
}

#[tokio::test]
async fn source_metadata_survives_account_aliases_without_widening_grants() {
    let dir = tempfile::tempdir().unwrap();
    let account = tempfile::tempdir().unwrap();
    let mut state = crate::app_state::AppState::for_tests(dir.path());
    state.upstream_provider = crate::config::UpstreamProvider::Anthropic;
    let router = crate::accounts::AccountRouter::new_for_provider(
        account.path().into(),
        &[],
        crate::subscription::SubscriptionProvider::Claude,
        crate::accounts::AccountRouterOptions::default(),
    );
    router
        .set_routing_policy(
            "primary",
            crate::account_routing_policy::AccountRoutingPolicy {
                model_aliases: vec![crate::account_routing_policy::ModelAlias {
                    model: "live".into(),
                    alias: "friendly".into(),
                    fork: false,
                }],
                excluded_models: vec!["excluded".into()],
                ..Default::default()
            },
        )
        .unwrap();
    state.account_router = Some(router);
    configure(&state, &["live=claude:live", "excluded=claude:excluded"]);
    state.model_catalogs.record_success_for_account(
        crate::subscription::SubscriptionProvider::Claude,
        "primary",
        None,
        vec!["live".into(), "excluded".into()],
    );
    for (allowed, visible) in [("live", true), ("friendly", false), ("excluded", false)] {
        let credential = state
            .token_manager
            .issue_with_model_policy(
                &crate::token::IssueRequest {
                    client_kind: Some("claude-code"),
                    principal_id: Some("primary"),
                    account: Some("primary"),
                    ..Default::default()
                },
                &crate::model_contract::ModelAccessPolicy::exact(allowed),
            )
            .unwrap();
        let mut headers = HeaderMap::new();
        headers.insert("x-api-key", credential.parse().unwrap());
        headers.insert("user-agent", "claude-cli/2.1.259".parse().unwrap());
        let response = crate::model_routing::models(
            axum::extract::State(state.clone()),
            axum::extract::OriginalUri("/api/models".parse().unwrap()),
            headers,
        )
        .await;
        assert_eq!(response.status(), StatusCode::OK);
        let catalog = json_body(response).await;
        let data = catalog["data"].as_array().unwrap();
        assert_eq!(data.len(), usize::from(visible), "{allowed}: {catalog}");
        if visible {
            assert_eq!(data[0]["id"], "friendly");
            assert_eq!(data[0]["canonical_id"], "live");
            assert_eq!(
                data[0]["router_model_definition"]["capability_provenance"]["source_kind"],
                "operator_override"
            );
        }
    }
}

#[tokio::test]
async fn management_definitions_use_live_scope_and_existing_admin_listener_boundary() {
    let dir = tempfile::tempdir().unwrap();
    let mut state = crate::app_state::AppState::for_tests(dir.path());
    state.admin_key = Some("catalog-admin".into());
    configure(
        &state,
        &["live=claude:live", "unavailable=claude:unavailable"],
    );
    state.model_catalogs.record_success_for_account(
        crate::subscription::SubscriptionProvider::Claude,
        "primary",
        Some("live-account".into()),
        vec!["live".into()],
    );
    let cli =
        crate::cli::Cli::try_parse_from(["router", "--token-secret", "test", "serve"]).unwrap();
    let config = cli.into_config().unwrap();
    let path = "/api/management/routing/model-definitions/claude";
    let client = token(&state, "live");
    for (listener, ip, authorization, expected) in [
        (
            crate::route_contract::ListenerKind::Combined,
            "127.0.0.1:1234",
            "",
            StatusCode::UNAUTHORIZED,
        ),
        (
            crate::route_contract::ListenerKind::Combined,
            "127.0.0.1:1234",
            client.as_str(),
            StatusCode::UNAUTHORIZED,
        ),
        (
            crate::route_contract::ListenerKind::Combined,
            "198.51.100.1:1234",
            "catalog-admin",
            StatusCode::FORBIDDEN,
        ),
        (
            crate::route_contract::ListenerKind::InferenceOnly,
            "127.0.0.1:1234",
            "catalog-admin",
            StatusCode::NOT_FOUND,
        ),
        (
            crate::route_contract::ListenerKind::Admin,
            "198.51.100.1:1234",
            "catalog-admin",
            StatusCode::OK,
        ),
    ] {
        let app = crate::server_router::router_for_listener(state.clone(), &config, listener);
        let request = Request::builder()
            .uri(path)
            .header("authorization", format!("Bearer {authorization}"))
            .extension(ConnectInfo(ip.parse::<std::net::SocketAddr>().unwrap()))
            .body(Body::empty())
            .unwrap();
        let response = app.oneshot(request).await.unwrap();
        assert_eq!(response.status(), expected, "{listener:?} {ip}");
        if expected == StatusCode::OK {
            let body = json_body(response).await;
            assert_eq!(body["channel"], "anthropic");
            assert_eq!(body["models"].as_array().unwrap().len(), 1);
            assert_eq!(body["models"][0]["requested_selector"], "live");
            assert_eq!(body["models"][0]["route"]["account"], "live-account");
            assert_eq!(
                body["models"][0]["capability_provenance"]["source_kind"],
                "operator_override"
            );
            crate::contracts::validation::http(&http::Method::GET, path, 200, &body).unwrap();
        }
    }
    assert_eq!(
        state
            .model_catalogs
            .models(crate::subscription::SubscriptionProvider::Claude),
        vec!["live"]
    );
    assert_eq!(
        state
            .token_manager
            .model_policy_for(&state.token_manager.validate_token(&client).unwrap().sub)
            .unwrap()
            .allowed_models,
        vec!["live"]
    );
}

#[tokio::test]
async fn local_alias_rewrites_only_the_upstream_selector_and_keeps_exact_token_grants() {
    let dir = tempfile::tempdir().unwrap();
    let mut context = crate::operation_context::OperationContext::isolated(dir.path());
    context.set_env("UPSTREAM_ALLOW_PRIVATE_NETWORKS", "all");
    Box::pin(context.scope_async(async {
        let requests = Arc::new(Mutex::new(Vec::new()));
        let captured = Arc::clone(&requests);
        let mock = axum::Router::new()
            .route("/v1/models", axum::routing::get(|| async { axum::Json(json!({"data":[{"id":"upstream"}]})) }))
            .route("/v1/chat/completions", axum::routing::post(move |axum::Json(body): axum::Json<Value>| {
                let captured = Arc::clone(&captured);
                async move {
                    captured.lock().unwrap().push(body.clone());
                    let model = if body["messages"][0]["content"] == "wrong" {"different"} else {"upstream"};
                    if body["stream"] == true {
                        let frame = json!({"id":"response", "object":"chat.completion.chunk", "model":model,"choices":[{"index":0,"delta":{"content":"ok"},"finish_reason":"stop"}]});
                        return ([("content-type", "text/event-stream")], format!("data: {frame}\n\ndata: [DONE]\n\n")).into_response();
                    }
                    axum::Json(json!({"id":"response", "object":"chat.completion", "model":model,"choices":[{"index":0,"message":{"role":"assistant","content":"ok"},"finish_reason":"stop"}]})).into_response()
                }
            }));
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let base_url = format!("http://{}/v1", listener.local_addr().unwrap());
        let server = tokio::spawn(async move { axum::serve(listener, mock).await.unwrap() });
        let mut state = crate::app_state::AppState::for_tests(dir.path());
        state.upstream_provider = crate::config::UpstreamProvider::OpenAICompatible;
        state.openai_compatible.provider_name = "local".into();
        state.provider_store.upsert(crate::providers::ProviderUpsert {
            name:"local".into(), kind:None, base_url,
            default_model:None, models:None, supported_clients:Some(vec!["opencode".into()]),
            api_key:Some("provider-secret".into()), api_key_env:None, encrypted_api_key:None,
            enabled:Some(true), subscriber_id:None, acknowledge_intermediary_risk:None,
            acknowledge_unsupported_clients:None, if_absent:false,
        }).unwrap();
        configure(&state, &["friendly=local:upstream", "phantom=local:missing",
            "reserved=local:upstream", "account/friendly=local:upstream", "blocked=local:upstream"]);
        let credential = token(&state, "friendly");
        let mut headers = HeaderMap::new();
        headers.insert("authorization", format!("Bearer {credential}").parse().unwrap());
        headers.insert("user-agent", "opencode/fixture".parse().unwrap());
        headers.insert("x-session-id", "catalog-test".parse().unwrap());
        let catalog = crate::model_routing::models(
            axum::extract::State(state.clone()),
            axum::extract::OriginalUri("/api/services/openai/v1/models".parse().unwrap()),
            headers.clone(),
        ).await;
        assert_eq!(catalog.status(), StatusCode::OK);
        let catalog = json_body(catalog).await;
        assert_eq!(catalog["data"].as_array().unwrap().len(), 1);
        assert_eq!(catalog["data"][0]["id"], "friendly");
        for (model, content, expected) in [
            ("friendly", "hello", StatusCode::OK),
            ("upstream", "hello", StatusCode::FORBIDDEN),
            ("phantom", "hello", StatusCode::FORBIDDEN),
            ("friendly", "wrong", StatusCode::BAD_GATEWAY),
        ] {
            let response = crate::provider_proxy::forward_openai_compatible(&state, &headers,
                json!({"model":model,"messages":[{"role":"user","content":content}]}),
                "/v1/chat/completions", crate::metrics::Surface::OpenAIChat).await;
            let status = response.status();
            let body = json_body(response).await;
            assert_eq!(status, expected, "{model} {content}: {body}");
            if expected == StatusCode::OK {
                assert_eq!(body["model"], "upstream");
            }
        }
        for content in ["hello", "wrong"] {
            let response = crate::provider_proxy::forward_openai_compatible(&state, &headers,
                json!({"model":"friendly","stream":true,"messages":[{"role":"user","content":content}]}),
                "/v1/chat/completions", crate::metrics::Surface::OpenAIChat).await;
            assert_eq!(response.status(), StatusCode::OK);
            let bytes = response.into_body().collect().await.unwrap().to_bytes();
            let stream = std::str::from_utf8(&bytes).unwrap();
            if content == "hello" {
                assert!(stream.contains("\"model\":\"upstream\""), "{stream}");
                assert!(!stream.contains("model_substitution_not_allowed"), "{stream}");
            } else {
                assert!(stream.contains("model_substitution_not_allowed"), "{stream}");
                assert!(!stream.contains("\"content\":\"ok\""), "{stream}");
            }
        }
        assert_eq!(requests.lock().unwrap().len(), 4);
        assert!(requests.lock().unwrap().iter().all(|request| request["model"] == "upstream"));
        // A policy on a subscription account must leave compatible-provider
        // aliases and their exact credential grants available in auto mode.
        let account = tempfile::tempdir().unwrap();
        let router = crate::accounts::AccountRouter::new_for_provider(
            account.path().into(), &[], crate::subscription::SubscriptionProvider::Claude,
            crate::accounts::AccountRouterOptions::default(),
        );
        router.set_routing_policy("primary", crate::account_routing_policy::AccountRoutingPolicy {
            weight: 2,
            prefix: Some("account".into()),
            excluded_models: vec!["blocked".into()],
            model_aliases: vec![crate::account_routing_policy::ModelAlias {
                model: "blocked".into(), alias: "reserved".into(), fork: false,
            }],
            ..Default::default()
        }).unwrap();
        state.account_router = Some(router);
        state.upstream_provider = crate::config::UpstreamProvider::Auto;
        state.model_catalogs.record_success_for_account(
            crate::subscription::SubscriptionProvider::Claude,
            "primary", None, vec!["blocked".into()],
        );
        let config = crate::cli::Cli::try_parse_from(["router", "--token-secret", "test", "serve"])
            .unwrap().into_config().unwrap();
        for (model, expected) in [("friendly", StatusCode::OK), ("upstream", StatusCode::FORBIDDEN),
            ("reserved", StatusCode::FORBIDDEN), ("account/friendly", StatusCode::FORBIDDEN),
            ("blocked", StatusCode::FORBIDDEN)] {
            let mut request = Request::post("/api/services/openai/v1/chat/completions")
                .header("content-type", "application/json")
                .body(Body::from(json!({"model":model,"messages":[{"role":"user","content":"hello"}]}).to_string()))
                .unwrap();
            request.headers_mut().extend(headers.clone());
            if matches!(model, "reserved" | "account/friendly" | "blocked") {
                request.headers_mut().insert("authorization", format!("Bearer {}", token(&state, model)).parse().unwrap());
            }
            let response = crate::server_router::router(state.clone(), &config).oneshot(request).await.unwrap();
            let status = response.status();
            let body = json_body(response).await;
            assert_eq!(status, expected, "auto {model}: {body}");
            if expected == StatusCode::OK {
                assert_eq!(body["model"], "upstream");
            }
        }
        assert_eq!(requests.lock().unwrap().len(), 5);
        let response = model_definitions(axum::extract::State(state.clone()), axum::extract::Path("local".into())).await;
        let models = json_body(response).await;
        assert_eq!(models["models"].as_array().unwrap().len(), 5);
        let friendly = models["models"].as_array().unwrap().iter()
            .find(|model| model["requested_selector"] == "friendly").unwrap();
        assert_eq!(friendly["upstream_request_model"], "upstream");
        let policy = state.token_manager.model_policy_for(&state.token_manager.validate_token(&credential).unwrap().sub).unwrap();
        assert_eq!(policy.allowed_models, vec!["friendly"]);
        server.abort();
        let _ = server.await;
    })).await;
}
