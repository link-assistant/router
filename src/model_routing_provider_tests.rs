use super::tests::auto_state;
use super::*;
use axum::body::Body;
use axum::extract::{Query, State};
use axum::http::{HeaderMap, HeaderValue, Request, StatusCode};
use http_body_util::BodyExt as _;
use std::collections::BTreeMap;
use std::fs;
use std::sync::{Arc, Mutex};

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
    let token = state.token_manager.issue_token(1, "provider test").unwrap();
    let mut headers = HeaderMap::new();
    headers.insert(
        "authorization",
        HeaderValue::from_str(&format!("Bearer {token}")).unwrap(),
    );
    headers.insert(
        "user-agent",
        HeaderValue::from_static("opencode/test-fixture"),
    );
    headers
}

async fn response_json(response: axum::response::Response) -> serde_json::Value {
    let bytes = response.into_body().collect().await.unwrap().to_bytes();
    serde_json::from_slice(&bytes).unwrap()
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
    crate::model_routing::append_stored_provider_models(&state, &mut catalog);

    let ids: Vec<&str> = catalog["data"]
        .as_array()
        .expect("a data array")
        .iter()
        .filter_map(|entry| entry["id"].as_str())
        .collect();
    assert!(ids.contains(&"formal-ai-mini"), "{ids:?}");
    assert!(ids.contains(&"formal-ai-large"), "{ids:?}");
}

/// A model declared by two stored providers is refused rather than resolved by
/// declaration order — the rule subscriptions already follow.
#[tokio::test]
async fn a_model_declared_twice_is_ambiguous_until_qualified() {
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
        matches!(error, crate::model_routing::ModelRouteError::Ambiguous(_)),
        "{error:?}"
    );

    // Naming the provider resolves it.
    let routed = crate::model_routing::route_state(
        &state,
        &serde_json::json!({"model": "beta/shared-model"}),
    )
    .await
    .expect("a qualified name is unambiguous");
    assert_eq!(routed.openai_compatible.provider_name, "beta");
    assert_eq!(routed.bridge_model.as_deref(), Some("shared-model"));
}

#[tokio::test]
async fn qualified_collisions_send_canonical_ids_and_preserve_response_aliases() {
    let (base_url, requests, task) = captured_model_upstream().await;
    let data_dir = tempfile::tempdir().expect("data dir");
    let state = auto_state(Vec::new(), data_dir.path());
    store_provider_at(&state, "alpha", &base_url, &["shared-future"]);
    store_provider_at(&state, "beta", &base_url, &["shared-future"]);
    let exposed = "beta/shared-future";

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
    assert_eq!(chat.status(), StatusCode::OK);
    assert_eq!(
        chat.headers()
            .get(crate::output_limit::UPSTREAM_MODEL_HEADER)
            .unwrap(),
        "shared-future"
    );
    let chat = response_json(chat).await;
    assert_eq!(chat["model"], exposed);
    assert_eq!(
        chat[crate::output_limit::UPSTREAM_MODEL_FIELD],
        "shared-future"
    );

    let responses = crate::proxy::openai_responses(
        State(state.clone()),
        bearer(&state),
        Ok(axum::Json(serde_json::json!({
            "model": exposed,
            "input": "hello"
        }))),
    )
    .await;
    assert_eq!(responses.status(), StatusCode::OK);
    assert_eq!(
        responses
            .headers()
            .get(crate::output_limit::UPSTREAM_MODEL_HEADER)
            .unwrap(),
        "shared-future"
    );
    let responses = response_json(responses).await;
    assert_eq!(responses["model"], exposed);
    assert_eq!(
        responses[crate::output_limit::UPSTREAM_MODEL_FIELD],
        "shared-future"
    );

    let requests = requests.lock().unwrap();
    assert_eq!(requests.len(), 2);
    assert_eq!(requests[0].0, "/v1/chat/completions");
    assert_eq!(requests[0].1["model"], "shared-future");
    assert_eq!(requests[1].0, "/v1/responses");
    assert_eq!(requests[1].1["model"], "shared-future");
    drop(requests);
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

/// A stored model whose id collides with a subscription's is listed in its
/// qualified form, so both stay reachable and the bare id stays ambiguous.
#[tokio::test]
async fn a_colliding_declared_model_is_listed_qualified() {
    let data_dir = tempfile::tempdir().expect("data dir");
    let state = auto_state(Vec::new(), data_dir.path());
    store_provider(&state, "formal-ai", &["shared-id"]);

    let mut catalog = serde_json::json!({
        "object": "list",
        "data": [{"id": "shared-id", "object": "model", "owned_by": "anthropic"}]
    });
    crate::model_routing::append_stored_provider_models(&state, &mut catalog);

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
    assert!(
        ids.contains(&"formal-ai/shared-id"),
        "the stored provider is reachable by its qualified name: {ids:?}"
    );
}

#[tokio::test]
async fn a_bare_subscription_collision_routes_the_catalogs_bare_identity() {
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
        crate::model_routing::route_state(&state, &serde_json::json!({"model": "shared-id"}))
            .await
            .expect("the bare catalog identity belongs to the subscription");
    assert_eq!(bare.upstream_provider, UpstreamProvider::Anthropic);

    let qualified = crate::model_routing::route_state(
        &state,
        &serde_json::json!({"model": "formal-ai/shared-id"}),
    )
    .await
    .expect("the stored collision remains explicitly reachable");
    assert_eq!(
        qualified.upstream_provider,
        UpstreamProvider::OpenAICompatible
    );
    assert_eq!(qualified.bridge_model.as_deref(), Some("shared-id"));
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
