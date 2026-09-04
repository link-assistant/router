use super::tests::auto_state;
use super::*;
use axum::body::Body;
use axum::extract::{Query, State};
use axum::http::{HeaderMap, HeaderValue, Request, StatusCode};
use http_body_util::BodyExt as _;
use std::collections::BTreeMap;
use std::fs;
use std::sync::{Arc, Mutex};

fn opencode_catalog_identity() -> (crate::token::TokenClaims, HeaderMap) {
    let claims = crate::token::TokenClaims {
        sub: "token-id".into(),
        iat: 1,
        exp: i64::MAX,
        label: String::new(),
        scope: String::new(),
        github_repos: Vec::new(),
        client_kind: Some("opencode".into()),
        principal_id: Some("primary".into()),
    };
    let mut headers = HeaderMap::new();
    headers.insert("authorization", HeaderValue::from_static("Bearer redacted"));
    (claims, headers)
}

fn catalog_identity_for(
    client: crate::clients::ClientKind,
) -> (crate::token::TokenClaims, HeaderMap, &'static str) {
    let claims = crate::token::TokenClaims {
        sub: "token-id".into(),
        iat: 1,
        exp: i64::MAX,
        label: String::new(),
        scope: String::new(),
        github_repos: Vec::new(),
        client_kind: Some(client.canonical_name().into()),
        principal_id: Some("primary".into()),
    };
    let mut headers = HeaderMap::new();
    let path = match client {
        crate::clients::ClientKind::ClaudeCode => {
            headers.insert("x-api-key", HeaderValue::from_static("redacted"));
            "/api/services/anthropic/v1/models"
        }
        crate::clients::ClientKind::GeminiCli => {
            headers.insert("x-goog-api-key", HeaderValue::from_static("redacted"));
            "/api/services/gemini/v1beta/models"
        }
        crate::clients::ClientKind::QwenCode => {
            headers.insert("authorization", HeaderValue::from_static("Bearer redacted"));
            "/api/services/qwen/v1/models"
        }
        crate::clients::ClientKind::Codex => {
            headers.insert("authorization", HeaderValue::from_static("Bearer redacted"));
            "/api/services/codex/v1/models"
        }
        crate::clients::ClientKind::Opencode | crate::clients::ClientKind::GrokCli => {
            headers.insert("authorization", HeaderValue::from_static("Bearer redacted"));
            "/api/services/openai/v1/models"
        }
        crate::clients::ClientKind::Cursor | crate::clients::ClientKind::Agent => {
            headers.insert("authorization", HeaderValue::from_static("Bearer redacted"));
            "/api/services/openai/v1/models"
        }
    };
    (claims, headers, path)
}

/// Add a stored OpenAI-compatible provider declaring `models`.
fn store_provider(state: &AppState, name: &str, models: &[&str]) {
    store_provider_at(state, name, "https://provider.example/v1", models);
}

fn store_provider_at(state: &AppState, name: &str, base_url: &str, models: &[&str]) {
    state
        .provider_store
        .upsert(crate::providers::ProviderUpsert {
            name: name.to_string(),
            kind: None,
            base_url: base_url.to_string(),
            default_model: models.first().map(|model| (*model).to_string()),
            models: Some(models.iter().map(|model| (*model).to_string()).collect()),
            supported_clients: Some(vec![
                "claude".to_string(),
                "codex".to_string(),
                "opencode".to_string(),
            ]),
            api_key: Some("provider-key".to_string()),
            api_key_env: None,
            encrypted_api_key: None,
            enabled: Some(true),
            subscriber_id: None,
            acknowledge_intermediary_risk: None,
            acknowledge_unsupported_clients: None,
        })
        .expect("store the provider");
}

async fn captured_model_upstream() -> (
    String,
    Arc<Mutex<Vec<(String, serde_json::Value)>>>,
    tokio::task::JoinHandle<()>,
) {
    let requests = Arc::new(Mutex::new(Vec::new()));
    let captured = Arc::clone(&requests);
    let app = axum::Router::new().fallback(move |request: Request<Body>| {
        let captured = Arc::clone(&captured);
        async move {
            let path = request.uri().path().to_string();
            let bytes = request.into_body().collect().await.unwrap().to_bytes();
            let payload: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
            captured.lock().unwrap().push((path.clone(), payload));
            if path.ends_with("/responses") {
                axum::Json(serde_json::json!({
                    "id": "resp_1",
                    "object": "response",
                    "model": "shared-future",
                    "status": "completed",
                    "output": [],
                    "usage": {"input_tokens": 1, "output_tokens": 1}
                }))
            } else {
                axum::Json(serde_json::json!({
                    "id": "chat_1",
                    "object": "chat.completion",
                    "model": "shared-future",
                    "choices": [{
                        "index": 0,
                        "message": {"role": "assistant", "content": "ok"},
                        "finish_reason": "stop"
                    }],
                    "usage": {"prompt_tokens": 1, "completion_tokens": 1}
                }))
            }
        }
    });
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let base_url = format!("http://{}/v1", listener.local_addr().unwrap());
    let task = tokio::spawn(async move { axum::serve(listener, app).await.unwrap() });
    (base_url, requests, task)
}

fn bearer(state: &AppState) -> HeaderMap {
    let token = crate::model_routing::tests::bound_client_token(
        state,
        crate::clients::ClientKind::Opencode,
        None,
    );
    let mut headers = HeaderMap::new();
    headers.insert(
        "authorization",
        HeaderValue::from_str(&format!("Bearer {token}")).unwrap(),
    );
    headers.insert(
        "user-agent",
        HeaderValue::from_static("opencode/test-fixture"),
    );
    headers.insert("x-session-id", HeaderValue::from_static("provider-test"));
    headers
}

/// The bug in issue #260: a stored provider was reachable only by pinning
/// `UPSTREAM_PROVIDER`, which pins the whole deployment — so one router could
/// serve vendor subscriptions or a local endpoint, never both.
#[tokio::test]
async fn a_stored_providers_declared_model_routes_in_automatic_mode() {
    let data_dir = tempfile::tempdir().expect("data dir");
    let state = auto_state(Vec::new(), data_dir.path());
    store_provider(&state, "formal-ai", &["formal-ai-mini"]);

    let routed =
        crate::model_routing::route_state(&state, &serde_json::json!({"model": "formal-ai-mini"}))
            .await
            .expect("a declared model must route");

    assert_eq!(routed.upstream_provider, UpstreamProvider::OpenAICompatible);
    assert_eq!(routed.openai_compatible.provider_name, "formal-ai");
    assert_eq!(routed.bridge_model.as_deref(), Some("formal-ai-mini"));
    // The deployment itself is untouched: this routed one request.
    assert_eq!(state.upstream_provider, UpstreamProvider::Auto);
}

/// A declared model appears in `/v1/models`, so one token reaches every model
/// the router can serve rather than only the discovered subscriptions.
#[tokio::test]
async fn declared_models_are_listed_alongside_subscription_catalogs() {
    let data_dir = tempfile::tempdir().expect("data dir");
    let state = auto_state(Vec::new(), data_dir.path());
    store_provider(&state, "formal-ai", &["formal-ai-mini", "formal-ai-large"]);

    let mut catalog = crate::model_routing::model_catalog(&[], &state.model_catalogs);
    let (claims, headers) = opencode_catalog_identity();
    crate::model_routing::append_stored_provider_models(
        &state,
        &claims,
        &headers,
        "/api/services/openai/v1/models",
        &mut catalog,
    )
    .unwrap();

    let ids: Vec<&str> = catalog["data"]
        .as_array()
        .expect("a data array")
        .iter()
        .filter_map(|entry| entry["id"].as_str())
        .collect();
    assert!(ids.contains(&"formal-ai-mini"), "{ids:?}");
    assert!(ids.contains(&"formal-ai-large"), "{ids:?}");
}

#[test]
fn ordinary_provider_catalog_is_the_exact_supported_client_intersection() {
    let data_dir = tempfile::tempdir().expect("data dir");
    let state = auto_state(Vec::new(), data_dir.path());
    state
        .provider_store
        .upsert(crate::providers::ProviderUpsert {
            name: "codex-only".into(),
            kind: None,
            base_url: "https://provider.example/v1".into(),
            default_model: None,
            models: Some(vec!["future-provider-model".into()]),
            supported_clients: Some(vec!["codex".into()]),
            api_key: Some("secret".into()),
            api_key_env: None,
            encrypted_api_key: None,
            enabled: Some(true),
            subscriber_id: None,
            acknowledge_intermediary_risk: None,
            acknowledge_unsupported_clients: None,
        })
        .unwrap();

    for client in crate::clients::ClientKind::ALL {
        let (claims, headers, path) = catalog_identity_for(client);
        let mut catalog = serde_json::json!({"object":"list","data":[]});
        crate::model_routing::append_stored_provider_models(
            &state,
            &claims,
            &headers,
            path,
            &mut catalog,
        )
        .unwrap();
        assert_eq!(
            catalog["data"].as_array().unwrap().len(),
            usize::from(client == crate::clients::ClientKind::Codex),
            "{client}"
        );
    }
}

#[tokio::test]
async fn incompatible_direct_request_is_rejected_before_upstream() {
    let (base_url, requests, task) = captured_model_upstream().await;
    let data_dir = tempfile::tempdir().expect("data dir");
    let mut state = auto_state(Vec::new(), data_dir.path());
    state
        .provider_store
        .upsert(crate::providers::ProviderUpsert {
            name: "opencode-only".into(),
            kind: None,
            base_url,
            default_model: None,
            models: Some(vec!["future-provider-model".into()]),
            supported_clients: Some(vec!["opencode".into()]),
            api_key: Some("secret".into()),
            api_key_env: None,
            encrypted_api_key: None,
            enabled: Some(true),
            subscriber_id: None,
            acknowledge_intermediary_risk: None,
            acknowledge_unsupported_clients: None,
        })
        .unwrap();
    state.upstream_provider = UpstreamProvider::OpenAICompatible;
    state.openai_compatible.provider_name = "opencode-only".into();
    let token = crate::model_routing::tests::bound_client_token(
        &state,
        crate::clients::ClientKind::Codex,
        None,
    );
    let mut headers = HeaderMap::new();
    headers.insert(
        "authorization",
        HeaderValue::from_str(&format!("Bearer {token}")).unwrap(),
    );
    headers.insert("user-agent", HeaderValue::from_static("codex_exec/0.153.0"));
    headers.insert("x-codex-turn-metadata", HeaderValue::from_static("fixture"));
    let response = crate::proxy::openai_responses(
        State(state),
        headers,
        Ok(axum::Json(serde_json::json!({
            "model":"future-provider-model",
            "input":"hello"
        }))),
    )
    .await;
    assert_eq!(response.status(), StatusCode::FORBIDDEN);
    assert!(requests.lock().unwrap().is_empty());
    task.abort();
}

/// A model declared by two stored providers is refused rather than resolved by
/// declaration order — the rule subscriptions already follow.
#[tokio::test]
async fn a_model_declared_twice_is_an_explicit_conflict_without_router_aliases() {
    let data_dir = tempfile::tempdir().expect("data dir");
    let state = auto_state(Vec::new(), data_dir.path());
    store_provider(&state, "alpha", &["shared-model"]);
    store_provider(&state, "beta", &["shared-model"]);

    // Matched rather than `expect_err`: `AppState` holds credentials and so
    // deliberately does not implement `Debug`.
    let Err(error) =
        crate::model_routing::route_state(&state, &serde_json::json!({"model": "shared-model"}))
            .await
    else {
        panic!("an ambiguous name must be refused");
    };
    assert!(
        matches!(error, crate::model_routing::ModelRouteError::Conflict(_)),
        "{error:?}"
    );

    let qualified = crate::model_routing::route_state(
        &state,
        &serde_json::json!({"model": "beta/shared-model"}),
    )
    .await;
    assert!(
        qualified.is_err(),
        "Router must not invent qualified aliases"
    );
}

#[tokio::test]
async fn stored_provider_collisions_fail_before_any_upstream_request() {
    let (base_url, requests, task) = captured_model_upstream().await;
    let data_dir = tempfile::tempdir().expect("data dir");
    let state = auto_state(Vec::new(), data_dir.path());
    store_provider_at(&state, "alpha", &base_url, &["shared-future"]);
    store_provider_at(&state, "beta", &base_url, &["shared-future"]);
    let exposed = "shared-future";

    let chat = crate::proxy::openai_chat_completions(
        State(state.clone()),
        Query(BTreeMap::new()),
        bearer(&state),
        Ok(axum::Json(serde_json::json!({
            "model": exposed,
            "messages": [{"role": "user", "content": "hello"}]
        }))),
    )
    .await;
    assert_eq!(chat.status(), StatusCode::CONFLICT);

    let responses = crate::proxy::openai_responses(
        State(state.clone()),
        bearer(&state),
        Ok(axum::Json(serde_json::json!({
            "model": exposed,
            "input": "hello"
        }))),
    )
    .await;
    assert_eq!(responses.status(), StatusCode::CONFLICT);
    assert!(requests.lock().unwrap().is_empty());
    task.abort();
}

/// A disabled provider advertises nothing, so disabling one takes its models
/// out of both the catalog and the routing table.
#[tokio::test]
async fn a_disabled_provider_advertises_nothing() {
    let data_dir = tempfile::tempdir().expect("data dir");
    let state = auto_state(Vec::new(), data_dir.path());
    store_provider(&state, "formal-ai", &["formal-ai-mini"]);
    state
        .provider_store
        .upsert(crate::providers::ProviderUpsert {
            name: "formal-ai".to_string(),
            kind: None,
            base_url: "https://provider.example/v1".to_string(),
            default_model: None,
            models: Some(vec!["formal-ai-mini".to_string()]),
            supported_clients: Some(vec!["opencode".to_string()]),
            api_key: None,
            api_key_env: None,
            encrypted_api_key: None,
            enabled: Some(false),
            subscriber_id: None,
            acknowledge_intermediary_risk: None,
            acknowledge_unsupported_clients: None,
        })
        .expect("disable the provider");

    let Err(error) =
        crate::model_routing::route_state(&state, &serde_json::json!({"model": "formal-ai-mini"}))
            .await
    else {
        panic!("a disabled provider must not route");
    };
    assert!(
        matches!(error, crate::model_routing::ModelRouteError::NotFound(_)),
        "{error:?}"
    );
}

/// A qualified name that the provider does not advertise is an error naming
/// the provider, rather than a silent fall through to a subscription.
#[tokio::test]
async fn a_qualified_name_the_provider_lacks_is_reported() {
    let data_dir = tempfile::tempdir().expect("data dir");
    let state = auto_state(Vec::new(), data_dir.path());
    store_provider(&state, "formal-ai", &["formal-ai-mini"]);

    let Err(error) = crate::model_routing::route_state(
        &state,
        &serde_json::json!({"model": "formal-ai/not-declared"}),
    )
    .await
    else {
        panic!("an undeclared qualified model must be refused");
    };

    assert!(
        matches!(error, crate::model_routing::ModelRouteError::NotFound(_)),
        "{error:?}"
    );
    assert!(format!("{error:?}").contains("formal-ai"), "{error:?}");
}

/// A qualified name for a provider that does not exist falls through to
/// ordinary routing rather than being treated as a provider reference.
#[tokio::test]
async fn an_unknown_provider_prefix_is_not_a_provider_reference() {
    let data_dir = tempfile::tempdir().expect("data dir");
    let state = auto_state(Vec::new(), data_dir.path());

    let Err(error) =
        crate::model_routing::route_state(&state, &serde_json::json!({"model": "nobody/model"}))
            .await
    else {
        panic!("nothing advertises this model");
    };

    assert!(
        matches!(error, crate::model_routing::ModelRouteError::NotFound(_)),
        "{error:?}"
    );
}

/// A stored model whose exact id collides with a subscription fails explicitly.
#[tokio::test]
async fn a_colliding_declared_model_is_rejected_without_a_qualified_alias() {
    let data_dir = tempfile::tempdir().expect("data dir");
    let state = auto_state(Vec::new(), data_dir.path());
    store_provider(&state, "formal-ai", &["shared-id"]);

    let mut catalog = serde_json::json!({
        "object": "list",
        "data": [{"id": "shared-id", "object": "model", "owned_by": "anthropic"}]
    });
    let (claims, headers) = opencode_catalog_identity();
    let result = crate::model_routing::append_stored_provider_models(
        &state,
        &claims,
        &headers,
        "/api/services/openai/v1/models",
        &mut catalog,
    );
    assert!(matches!(
        result,
        Err(crate::model_routing::ModelRouteError::Conflict(_))
    ));

    let ids: Vec<&str> = catalog["data"]
        .as_array()
        .expect("data")
        .iter()
        .filter_map(|entry| entry["id"].as_str())
        .collect();
    assert!(
        ids.contains(&"shared-id"),
        "the subscription keeps its id: {ids:?}"
    );
    assert!(!ids.contains(&"formal-ai/shared-id"), "no aliases: {ids:?}");
}

#[tokio::test]
async fn a_subscription_collision_fails_instead_of_selecting_by_merge_order() {
    let data_dir = tempfile::tempdir().expect("data dir");
    let claude = tempfile::tempdir().expect("Claude home");
    fs::write(
        claude.path().join(".credentials.json"),
        r#"{"claudeAiOauth":{"accessToken":"claude-live"}}"#,
    )
    .expect("Claude credential");
    let state = auto_state(
        vec![crate::subscription::SubscriptionReader::new(
            crate::subscription::SubscriptionProvider::Claude,
            claude.path(),
        )],
        data_dir.path(),
    );
    state.model_catalogs.record_success(
        crate::subscription::SubscriptionProvider::Claude,
        vec!["shared-id".to_string()],
    );
    store_provider(&state, "formal-ai", &["shared-id"]);

    let bare =
        crate::model_routing::route_state(&state, &serde_json::json!({"model": "shared-id"})).await;
    assert!(matches!(
        bare,
        Err(crate::model_routing::ModelRouteError::Conflict(_))
    ));

    let qualified = crate::model_routing::route_state(
        &state,
        &serde_json::json!({"model": "formal-ai/shared-id"}),
    )
    .await;
    assert!(qualified.is_err(), "qualified aliases are not exposed");
}

/// A request with no model is refused before any provider is consulted.
#[tokio::test]
async fn a_request_without_a_model_is_refused() {
    let data_dir = tempfile::tempdir().expect("data dir");
    let state = auto_state(Vec::new(), data_dir.path());

    let Err(error) = crate::model_routing::route_state(&state, &serde_json::json!({})).await else {
        panic!("a model is required in automatic mode");
    };

    assert!(
        matches!(error, crate::model_routing::ModelRouteError::ModelRequired),
        "{error:?}"
    );
}

#[test]
fn automatic_routing_errors_never_expose_catalog_bodies_accounts_or_paths() {
    let catalogs = ModelCatalogCache::new();
    let sentinel = "vendor-body account-secret /private/credentials/codex.json";
    catalogs.record_failure(SubscriptionProvider::Codex, sentinel, true);

    let error = available_provider_for_model("gpt-secret", &[], &catalogs)
        .expect_err("a failed catalog is not routable")
        .to_string();

    assert!(error.contains("codex"));
    assert!(!error.contains("vendor-body"), "{error}");
    assert!(!error.contains("account-secret"), "{error}");
    assert!(!error.contains("/private/credentials"), "{error}");
}
