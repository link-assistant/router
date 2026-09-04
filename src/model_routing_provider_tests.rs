use super::tests::auto_state;
use super::*;
use axum::body::Body;
use axum::extract::{OriginalUri, Query, State};
use axum::http::{HeaderMap, HeaderValue, Request, StatusCode};
use axum::response::Response;
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
        crate::clients::ClientKind::Opencode
        | crate::clients::ClientKind::GrokCli
        | crate::clients::ClientKind::Cursor
        | crate::clients::ClientKind::Agent => {
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
            if_absent: false,
        })
        .expect("store the provider");
}

async fn live_catalog_upstream(models: &[&str]) -> (String, tokio::task::JoinHandle<()>) {
    let models = models
        .iter()
        .map(std::string::ToString::to_string)
        .collect::<Vec<_>>();
    let app = axum::Router::new().route(
        "/v1/models",
        axum::routing::get(move || {
            let models = models.clone();
            async move {
                axum::Json(serde_json::json!({
                    "object": "list",
                    "data": models.into_iter().map(|id| serde_json::json!({
                        "id": id,
                        "object": "model",
                        "vendor_metadata": {"live": true}
                    })).collect::<Vec<_>>()
                }))
            }
        }),
    );
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let base_url = format!("http://{}/v1", listener.local_addr().unwrap());
    let task = tokio::spawn(async move { axum::serve(listener, app).await.unwrap() });
    (base_url, task)
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
            if request.method() == axum::http::Method::GET && path.ends_with("/models") {
                return axum::Json(serde_json::json!({
                    "object": "list",
                    "data": [{"id": "shared-future", "object": "model"}]
                }));
            }
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

#[derive(Clone, Debug)]
struct CapturedLefineRequest {
    headers: HeaderMap,
    body: Vec<u8>,
}

async fn lefine_upstream(
    response_status: StatusCode,
    response_content_type: &'static str,
    response_body: &'static str,
) -> (
    String,
    Arc<Mutex<Vec<CapturedLefineRequest>>>,
    tokio::task::JoinHandle<()>,
) {
    let requests = Arc::new(Mutex::new(Vec::new()));
    let captured = Arc::clone(&requests);
    let app = axum::Router::new().fallback(move |request: Request<Body>| {
        let captured = Arc::clone(&captured);
        async move {
            if request.method() == axum::http::Method::GET && request.uri().path() == "/v1/models" {
                return Response::builder()
                    .header("content-type", "application/json")
                    .body(Body::from(r#"{"data":[{"id":"vendor/live-exact"}]}"#))
                    .unwrap();
            }
            let headers = request.headers().clone();
            let body = request.into_body().collect().await.unwrap().to_bytes();
            captured.lock().unwrap().push(CapturedLefineRequest {
                headers,
                body: body.to_vec(),
            });
            Response::builder()
                .status(response_status)
                .header("content-type", response_content_type)
                .header("x-request-id", "lefine-response-id")
                .header("x-provider-meta", "preserved")
                .body(Body::from(response_body))
                .unwrap()
        }
    });
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let base_url = format!("http://{}/v1", listener.local_addr().unwrap());
    let task = tokio::spawn(async move { axum::serve(listener, app).await.unwrap() });
    (base_url, requests, task)
}

fn store_lefine(state: &AppState, base_url: String) {
    state
        .provider_store
        .upsert(crate::providers::ProviderUpsert {
            name: "lefine".into(),
            kind: Some("lefine".into()),
            base_url,
            default_model: None,
            models: Some(vec!["configured/fallback".into()]),
            supported_clients: None,
            api_key: Some("lefine-secret".into()),
            api_key_env: None,
            encrypted_api_key: None,
            enabled: Some(true),
            subscriber_id: None,
            acknowledge_intermediary_risk: None,
            acknowledge_unsupported_clients: None,
            if_absent: false,
        })
        .unwrap();
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
    let (base_url, task) = live_catalog_upstream(&["formal-ai-mini"]).await;
    store_provider_at(&state, "formal-ai", &base_url, &["formal-ai-mini"]);

    let routed = crate::model_routing::route_state_with_subscription_for_client(
        &state,
        &serde_json::json!({"model": "formal-ai-mini"}),
        &[],
        Some(crate::clients::ClientKind::Opencode),
        false,
    )
    .await
    .expect("a live model must route")
    .state;

    assert_eq!(routed.upstream_provider, UpstreamProvider::OpenAICompatible);
    assert_eq!(routed.openai_compatible.provider_name, "formal-ai");
    assert_eq!(routed.bridge_model.as_deref(), Some("formal-ai-mini"));
    // The deployment itself is untouched: this routed one request.
    assert_eq!(state.upstream_provider, UpstreamProvider::Auto);
    task.abort();
}

#[tokio::test]
async fn a_compatible_client_reaches_an_ordinary_provider_end_to_end() {
    let (base_url, requests, task) = captured_model_upstream().await;
    let data_dir = tempfile::tempdir().expect("data dir");
    let state = auto_state(Vec::new(), data_dir.path());
    store_provider_at(&state, "formal-ai", &base_url, &["shared-future"]);

    let response = crate::proxy::openai_chat_completions(
        State(state.clone()),
        Query(BTreeMap::new()),
        bearer(&state),
        Ok(axum::Json(serde_json::json!({
            "model": "shared-future",
            "messages": [{"role": "user", "content": "hello"}]
        }))),
    )
    .await;

    assert_eq!(response.status(), StatusCode::OK);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(payload["model"], "shared-future");
    assert_eq!(payload["choices"][0]["message"]["content"], "ok");

    let requests = requests.lock().unwrap();
    assert_eq!(requests.len(), 1);
    assert_eq!(requests[0].0, "/v1/chat/completions");
    assert_eq!(requests[0].1["model"], "shared-future");
    drop(requests);
    task.abort();
}

#[tokio::test]
async fn lefine_chat_completions_preserve_native_body_headers_tools_usage_and_errors() {
    const SUCCESS: &str = r#"{"id":"chat-native","object":"chat.completion","model":"provider/native-id","choices":[{"index":0,"message":{"role":"assistant","content":null,"tool_calls":[{"id":"call-1","type":"function","function":{"name":"lookup","arguments":"{\"q\":\"x\"}"}}]},"finish_reason":"tool_calls"}],"usage":{"prompt_tokens":7,"completion_tokens":3,"total_tokens":10}}"#;
    const ERROR: &str = r#"{"error":{"message":"model refused","type":"invalid_request_error","code":"model_not_found"}}"#;
    let (base_url, requests, task) =
        lefine_upstream(StatusCode::OK, "application/json", SUCCESS).await;
    let data_dir = tempfile::tempdir().expect("data dir");
    let state = auto_state(Vec::new(), data_dir.path());
    store_lefine(&state, base_url);
    let mut headers = bearer(&state);
    headers.insert("content-type", HeaderValue::from_static("application/json"));
    headers.insert("x-native-required", HeaderValue::from_static("preserved"));
    headers.insert(
        "x-request-id",
        HeaderValue::from_static("client-request-id"),
    );
    headers.insert("x-forwarded-for", HeaderValue::from_static("203.0.113.1"));
    headers.insert(
        "x-link-assistant-internal",
        HeaderValue::from_static("private"),
    );
    let request_body = serde_json::json!({
        "model": "vendor/live-exact",
        "messages": [
            {"role": "system", "content": "be exact"},
            {"role": "user", "content": "use a tool"}
        ],
        "tools": [{"type":"function","function":{"name":"lookup","parameters":{"type":"object"}}}],
        "tool_choice": "auto"
    });

    let response = crate::proxy::openai_chat_completions(
        State(state),
        Query(BTreeMap::new()),
        headers,
        Ok(axum::Json(request_body.clone())),
    )
    .await;

    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(response.headers()["x-request-id"], "lefine-response-id");
    assert_eq!(response.headers()["x-provider-meta"], "preserved");
    let body = response.into_body().collect().await.unwrap().to_bytes();
    assert_eq!(body.as_ref(), SUCCESS.as_bytes());
    {
        let captured = requests.lock().unwrap();
        assert_eq!(captured.len(), 1);
        assert_eq!(
            serde_json::from_slice::<serde_json::Value>(&captured[0].body).unwrap(),
            request_body
        );
        assert_eq!(captured[0].headers["authorization"], "Bearer lefine-secret");
        assert_eq!(captured[0].headers["user-agent"], "opencode/test-fixture");
        assert_eq!(captured[0].headers["x-session-id"], "provider-test");
        assert_eq!(captured[0].headers["x-native-required"], "preserved");
        assert_eq!(captured[0].headers["x-request-id"], "client-request-id");
        assert!(!captured[0].headers.contains_key("x-forwarded-for"));
        assert!(
            !captured[0]
                .headers
                .contains_key("x-link-assistant-internal")
        );
        drop(captured);
    }
    task.abort();

    let (base_url, _requests, task) =
        lefine_upstream(StatusCode::BAD_REQUEST, "application/json", ERROR).await;
    let data_dir = tempfile::tempdir().expect("data dir");
    let state = auto_state(Vec::new(), data_dir.path());
    store_lefine(&state, base_url);
    let response = crate::proxy::openai_chat_completions(
        State(state.clone()),
        Query(BTreeMap::new()),
        bearer(&state),
        Ok(axum::Json(serde_json::json!({
            "model": "vendor/live-exact",
            "messages": [{"role":"user","content":"hello"}]
        }))),
    )
    .await;
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    assert_eq!(
        response
            .into_body()
            .collect()
            .await
            .unwrap()
            .to_bytes()
            .as_ref(),
        ERROR.as_bytes()
    );
    task.abort();
}

#[tokio::test]
async fn lefine_streaming_chat_completion_is_relayed_byte_for_byte() {
    const STREAM: &str = "data: {\"id\":\"chat-native\",\"choices\":[{\"delta\":{\"role\":\"assistant\"},\"finish_reason\":null}]}\n\ndata: {\"id\":\"chat-native\",\"choices\":[{\"delta\":{\"tool_calls\":[{\"index\":0,\"id\":\"call-1\",\"function\":{\"name\":\"lookup\",\"arguments\":\"{}\"}}]},\"finish_reason\":\"tool_calls\"}],\"usage\":{\"prompt_tokens\":2,\"completion_tokens\":1,\"total_tokens\":3}}\n\ndata: [DONE]\n\n";
    let (base_url, requests, task) =
        lefine_upstream(StatusCode::OK, "text/event-stream", STREAM).await;
    let data_dir = tempfile::tempdir().expect("data dir");
    let state = auto_state(Vec::new(), data_dir.path());
    store_lefine(&state, base_url);

    let response = crate::proxy::openai_chat_completions(
        State(state.clone()),
        Query(BTreeMap::new()),
        bearer(&state),
        Ok(axum::Json(serde_json::json!({
            "model": "vendor/live-exact",
            "messages": [{"role":"user","content":"stream"}],
            "stream": true
        }))),
    )
    .await;

    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(response.headers()["content-type"], "text/event-stream");
    let body = response.into_body().collect().await.unwrap().to_bytes();
    assert_eq!(body.as_ref(), STREAM.as_bytes());
    let captured = requests.lock().unwrap();
    assert_eq!(captured.len(), 1);
    assert_eq!(
        serde_json::from_slice::<serde_json::Value>(&captured[0].body).unwrap()["stream"],
        true
    );
    drop(captured);
    task.abort();
}

#[tokio::test]
async fn fixed_local_provider_catalogs_use_the_shared_authenticated_handler() {
    for provider in [UpstreamProvider::Gonka, UpstreamProvider::Crater] {
        let data_dir = tempfile::tempdir().expect("data dir");
        let mut state = auto_state(Vec::new(), data_dir.path());
        state.upstream_provider = provider;
        let response = models(
            State(state.clone()),
            OriginalUri("/api/services/openai/v1/models".parse().unwrap()),
            bearer(&state),
        )
        .await;
        assert_eq!(response.status(), StatusCode::OK, "{provider:?}");
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let catalog: serde_json::Value = serde_json::from_slice(&body).unwrap();
        let data = catalog["data"].as_array().expect("OpenAI model list");
        if provider == UpstreamProvider::Crater {
            assert!(!data.is_empty(), "{provider:?}");
        }
    }
}

/// A declared model appears in `/v1/models`, so one token reaches every model
/// the router can serve rather than only the discovered subscriptions.
#[tokio::test]
async fn declared_models_are_listed_alongside_subscription_catalogs() {
    let data_dir = tempfile::tempdir().expect("data dir");
    let state = auto_state(Vec::new(), data_dir.path());
    let (base_url, task) = live_catalog_upstream(&["formal-ai-mini", "formal-ai-large"]).await;
    store_provider_at(
        &state,
        "formal-ai",
        &base_url,
        &["formal-ai-mini", "formal-ai-large"],
    );

    let mut catalog = crate::model_routing::model_catalog(&[], &state.model_catalogs);
    let (claims, headers) = opencode_catalog_identity();
    crate::model_routing::append_stored_provider_models(
        &state,
        &claims,
        &headers,
        "/api/services/openai/v1/models",
        &mut catalog,
    )
    .await
    .unwrap();

    let ids: Vec<&str> = catalog["data"]
        .as_array()
        .expect("a data array")
        .iter()
        .filter_map(|entry| entry["id"].as_str())
        .collect();
    assert!(ids.contains(&"formal-ai-mini"), "{ids:?}");
    assert!(ids.contains(&"formal-ai-large"), "{ids:?}");
    assert_eq!(catalog["data"][0]["vendor_metadata"]["live"], true);
    task.abort();
}

#[tokio::test]
async fn lefine_catalog_is_visible_only_to_native_chat_completion_clients() {
    let data_dir = tempfile::tempdir().expect("data dir");
    let state = auto_state(Vec::new(), data_dir.path());
    let (base_url, task) = live_catalog_upstream(&["vendor/live-exact"]).await;
    state
        .provider_store
        .upsert(crate::providers::ProviderUpsert {
            name: "lefine".into(),
            kind: Some("lefine".into()),
            base_url,
            default_model: None,
            models: Some(vec!["configured/fallback".into()]),
            supported_clients: None,
            api_key: Some("lefine-secret".into()),
            api_key_env: None,
            encrypted_api_key: None,
            enabled: Some(true),
            subscriber_id: None,
            acknowledge_intermediary_risk: None,
            acknowledge_unsupported_clients: None,
            if_absent: false,
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
        .await
        .unwrap();
        let visible = catalog["data"]
            .as_array()
            .unwrap()
            .iter()
            .any(|model| model["id"] == "vendor/live-exact");
        assert_eq!(
            visible,
            matches!(
                client,
                crate::clients::ClientKind::GrokCli
                    | crate::clients::ClientKind::Opencode
                    | crate::clients::ClientKind::QwenCode
            ),
            "unexpected Lefine visibility for {client}"
        );
    }
    task.abort();
}

#[tokio::test]
async fn ordinary_provider_catalog_is_the_exact_supported_client_intersection() {
    let data_dir = tempfile::tempdir().expect("data dir");
    let state = auto_state(Vec::new(), data_dir.path());
    let (base_url, task) = live_catalog_upstream(&["future-provider-model"]).await;
    state
        .provider_store
        .upsert(crate::providers::ProviderUpsert {
            name: "codex-only".into(),
            kind: None,
            base_url,
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
            if_absent: false,
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
        .await
        .unwrap();
        assert_eq!(
            catalog["data"].as_array().unwrap().len(),
            usize::from(client == crate::clients::ClientKind::Codex),
            "{client}"
        );
    }
    task.abort();
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
            if_absent: false,
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
    let (base_url, task) = live_catalog_upstream(&["shared-model"]).await;
    store_provider_at(&state, "alpha", &base_url, &["shared-model"]);
    store_provider_at(&state, "beta", &base_url, &["shared-model"]);

    // Matched rather than `expect_err`: `AppState` holds credentials and so
    // deliberately does not implement `Debug`.
    let Err(error) = crate::model_routing::route_state_with_subscription_for_client(
        &state,
        &serde_json::json!({"model": "shared-model"}),
        &[],
        Some(crate::clients::ClientKind::Opencode),
        false,
    )
    .await
    else {
        panic!("an ambiguous name must be refused");
    };
    assert!(
        matches!(error, crate::model_routing::ModelRouteError::Conflict(_)),
        "{error:?}"
    );

    let qualified = crate::model_routing::route_state_with_subscription_for_client(
        &state,
        &serde_json::json!({"model": "beta/shared-model"}),
        &[],
        Some(crate::clients::ClientKind::Opencode),
        false,
    )
    .await;
    assert!(
        qualified.is_err(),
        "Router must not invent qualified aliases"
    );
    task.abort();
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
            if_absent: false,
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

/// A provider-looking name is still an exact id, never a Router alias.
#[tokio::test]
async fn a_provider_looking_name_is_not_interpreted_as_an_alias() {
    let data_dir = tempfile::tempdir().expect("data dir");
    let state = auto_state(Vec::new(), data_dir.path());
    let (base_url, task) = live_catalog_upstream(&["formal-ai-mini"]).await;
    store_provider_at(&state, "formal-ai", &base_url, &["formal-ai-mini"]);

    let Err(error) = crate::model_routing::route_state_with_subscription_for_client(
        &state,
        &serde_json::json!({"model": "formal-ai/not-declared"}),
        &[],
        Some(crate::clients::ClientKind::Opencode),
        false,
    )
    .await
    else {
        panic!("an undeclared qualified model must be refused");
    };

    assert!(
        matches!(error, crate::model_routing::ModelRouteError::NotFound(_)),
        "{error:?}"
    );
    task.abort();
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
    let (base_url, task) = live_catalog_upstream(&["shared-id"]).await;
    store_provider_at(&state, "formal-ai", &base_url, &["shared-id"]);

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
    )
    .await;
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
    task.abort();
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
    let (base_url, task) = live_catalog_upstream(&["shared-id"]).await;
    store_provider_at(&state, "formal-ai", &base_url, &["shared-id"]);

    let bare = crate::model_routing::route_state_with_subscription_for_client(
        &state,
        &serde_json::json!({"model": "shared-id"}),
        &[crate::subscription::SubscriptionProvider::Claude],
        Some(crate::clients::ClientKind::Opencode),
        false,
    )
    .await;
    assert!(matches!(
        bare,
        Err(crate::model_routing::ModelRouteError::Conflict(_))
    ));

    let qualified = crate::model_routing::route_state_with_subscription_for_client(
        &state,
        &serde_json::json!({"model": "formal-ai/shared-id"}),
        &[crate::subscription::SubscriptionProvider::Claude],
        Some(crate::clients::ClientKind::Opencode),
        false,
    )
    .await;
    assert!(qualified.is_err(), "qualified aliases are not exposed");
    task.abort();
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
