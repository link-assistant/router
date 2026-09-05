use std::sync::{Arc, Mutex};

use axum::body::Body;
use axum::extract::{OriginalUri, Path, Query, State};
use axum::http::{HeaderMap, HeaderValue, Method, Request, StatusCode, Uri};
use axum::response::Response;
use http_body_util::BodyExt as _;

use crate::config::UpstreamProvider;

#[derive(Clone, Debug)]
struct Seen {
    method: Method,
    uri: String,
    headers: HeaderMap,
    body: Vec<u8>,
}

async fn lifecycle_upstream() -> (String, Arc<Mutex<Vec<Seen>>>, tokio::task::JoinHandle<()>) {
    let seen = Arc::new(Mutex::new(Vec::new()));
    let captured = Arc::clone(&seen);
    let app = axum::Router::new().fallback(move |request: Request<Body>| {
        let captured = Arc::clone(&captured);
        async move {
            let method = request.method().clone();
            let uri = request.uri().to_string();
            if method == Method::GET && request.uri().path() == "/v1/models" {
                return json(
                    StatusCode::OK,
                    serde_json::json!({
                        "object": "list",
                        "data": [{"id": "future-model", "object": "model"}]
                    }),
                );
            }
            let headers = request.headers().clone();
            let body = request.into_body().collect().await.unwrap().to_bytes();
            captured.lock().unwrap().push(Seen {
                method: method.clone(),
                uri: uri.clone(),
                headers,
                body: body.to_vec(),
            });
            if uri.contains("failure=raw") {
                return Response::builder()
                    .status(StatusCode::TOO_MANY_REQUESTS)
                    .header("x-provider-limit", "7")
                    .header("content-type", "application/problem+json")
                    .body(Body::from(r#"{"upstream":"native"}"#))
                    .unwrap();
            }
            match (method, uri.split('?').next().unwrap_or_default()) {
                (Method::POST, "/v1/responses") => json(
                    StatusCode::OK,
                    serde_json::json!({
                        "id": "resp.?opaque",
                        "object": "response",
                        "status": "completed",
                        "model": "future-model",
                        "output": []
                    }),
                ),
                (Method::GET, "/v1/responses/resp.%3Fopaque") => json(
                    StatusCode::OK,
                    serde_json::json!({"id":"resp.?opaque","object":"response"}),
                ),
                (Method::POST, "/v1/responses/resp.%3Fopaque/cancel") => json(
                    StatusCode::OK,
                    serde_json::json!({"id":"resp.?opaque","status":"cancelled"}),
                ),
                (
                    Method::GET,
                    "/v1/responses/resp.%3Fopaque/input_items"
                    | "/v1/chat/completions/chatcmpl.%3Fopaque/messages",
                ) => json(
                    StatusCode::OK,
                    serde_json::json!({"object":"list","data":[]}),
                ),
                (Method::DELETE, "/v1/responses/resp.%3Fopaque") => {
                    Response::builder().status(204).body(Body::empty()).unwrap()
                }
                (Method::POST, "/v1/chat/completions") => json(
                    StatusCode::OK,
                    serde_json::json!({
                        "id":"chatcmpl.?opaque",
                        "object":"chat.completion",
                        "metadata":{"case":"sensitive-fixture"},
                        "choices":[]
                    }),
                ),
                (Method::GET, "/v1/chat/completions") => json(
                    StatusCode::OK,
                    serde_json::json!({
                        "object":"list",
                        "data":[
                            {"id":"chatcmpl.?opaque","object":"chat.completion"},
                            {"id":"foreign","object":"chat.completion","metadata":{"secret":"x"}}
                        ],
                        "has_more":false
                    }),
                ),
                (Method::GET | Method::POST, "/v1/chat/completions/chatcmpl.%3Fopaque") => json(
                    StatusCode::OK,
                    serde_json::json!({
                        "id":"chatcmpl.?opaque",
                        "object":"chat.completion",
                        "metadata":{"updated":"yes"}
                    }),
                ),
                (Method::DELETE, "/v1/chat/completions/chatcmpl.%3Fopaque") => json(
                    StatusCode::OK,
                    serde_json::json!({
                        "id":"chatcmpl.?opaque",
                        "object":"chat.completion.deleted",
                        "deleted":true
                    }),
                ),
                _ => json(
                    StatusCode::NOT_FOUND,
                    serde_json::json!({"error":{"message":"not found"}}),
                ),
            }
        }
    });
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let base_url = format!("http://{}/v1", listener.local_addr().unwrap());
    let task = tokio::spawn(async move { axum::serve(listener, app).await.unwrap() });
    (base_url, seen, task)
}

#[allow(clippy::needless_pass_by_value)]
fn json(status: StatusCode, value: serde_json::Value) -> Response {
    Response::builder()
        .status(status)
        .header("content-type", "application/json")
        .body(Body::from(serde_json::to_vec(&value).unwrap()))
        .unwrap()
}

fn install_provider(state: &crate::app_state::AppState, base_url: &str) {
    install_named_provider(state, "lifecycle", base_url);
}

fn install_named_provider(state: &crate::app_state::AppState, name: &str, base_url: &str) {
    state
        .provider_store
        .upsert(crate::providers::ProviderUpsert {
            name: name.into(),
            kind: None,
            base_url: base_url.into(),
            default_model: Some("future-model".into()),
            models: Some(vec!["future-model".into()]),
            supported_clients: Some(vec!["codex".into(), "opencode".into()]),
            api_key: Some("upstream-secret".into()),
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

fn headers(
    state: &crate::app_state::AppState,
    client: crate::clients::ClientKind,
    principal: &str,
) -> HeaderMap {
    let token = crate::model_routing::tests::bound_client_token(state, client, Some(principal));
    let mut headers = HeaderMap::new();
    headers.insert(
        "authorization",
        HeaderValue::from_str(&format!("Bearer {token}")).unwrap(),
    );
    match client {
        crate::clients::ClientKind::Codex => {
            headers.insert("user-agent", HeaderValue::from_static("codex/test-fixture"));
            headers.insert(
                "x-codex-turn-metadata",
                HeaderValue::from_static("turn-fixture"),
            );
        }
        crate::clients::ClientKind::Opencode => {
            headers.insert(
                "user-agent",
                HeaderValue::from_static("opencode/test-fixture"),
            );
            headers.insert("x-session-id", HeaderValue::from_static("session-fixture"));
        }
        _ => unreachable!(),
    }
    headers
}

fn request(method: Method, uri: &str, headers: &HeaderMap, body: &'static str) -> Request<Body> {
    let mut builder = Request::builder().method(method).uri(uri);
    for (name, value) in headers {
        builder = builder.header(name, value);
    }
    builder
        .header("content-type", "application/json")
        .body(Body::from(body))
        .unwrap()
}

#[tokio::test]
async fn responses_create_lifecycle_is_owner_scoped_pinned_and_raw() {
    let data_dir = tempfile::tempdir().unwrap();
    let mut state = crate::model_routing::tests::auto_state(Vec::new(), data_dir.path());
    let (base_url, seen, task) = lifecycle_upstream().await;
    install_provider(&state, &base_url);
    state.upstream_provider = UpstreamProvider::OpenAICompatible;
    state.openai_compatible.provider_name = "lifecycle".into();
    let client_headers = headers(&state, crate::clients::ClientKind::Codex, "owner-a");

    let created = crate::proxy::openai_responses(
        State(state.clone()),
        client_headers.clone(),
        Ok(axum::Json(serde_json::json!({
            "model":"future-model",
            "input":"hello",
            "store":true
        }))),
    )
    .await;
    assert_eq!(created.status(), StatusCode::OK);

    let mut continuation_state = state.clone();
    continuation_state.upstream_provider = UpstreamProvider::Auto;
    install_named_provider(&continuation_state, "unrelated", "http://127.0.0.1:9/v1");
    let continued = crate::proxy::openai_responses(
        State(continuation_state),
        client_headers.clone(),
        Ok(axum::Json(serde_json::json!({
            "model":"future-model",
            "input":"continue",
            "previous_response_id":"resp.?opaque",
            "store":true
        }))),
    )
    .await;
    assert_eq!(continued.status(), StatusCode::OK);

    let wrong_owner_headers = headers(&state, crate::clients::ClientKind::Codex, "owner-b");
    let before = seen.lock().unwrap().len();
    let wrong_owner = crate::responses_lifecycle::retrieve(
        State(state.clone()),
        Path("resp.?opaque".into()),
        OriginalUri(Uri::from_static(
            "/api/services/openai/v1/responses/resp.%3Fopaque",
        )),
        request(
            Method::GET,
            "/api/services/openai/v1/responses/resp.%3Fopaque",
            &wrong_owner_headers,
            "",
        ),
    )
    .await;
    assert_eq!(wrong_owner.status(), StatusCode::NOT_FOUND);
    assert_eq!(seen.lock().unwrap().len(), before);

    let retrieved = crate::responses_lifecycle::retrieve(
        State(state.clone()),
        Path("resp.?opaque".into()),
        OriginalUri(
            "/api/services/openai/v1/responses/resp.%3Fopaque?include[]=reasoning.encrypted_content&starting_after=item_1"
                .parse()
                .unwrap(),
        ),
        request(
            Method::GET,
            "/api/services/openai/v1/responses/resp.%3Fopaque",
            &client_headers,
            "",
        ),
    )
    .await;
    assert_eq!(retrieved.status(), StatusCode::OK);
    let raw_failure = crate::responses_lifecycle::retrieve(
        State(state.clone()),
        Path("resp.?opaque".into()),
        OriginalUri(
            "/api/services/openai/v1/responses/resp.%3Fopaque?failure=raw"
                .parse()
                .unwrap(),
        ),
        request(
            Method::GET,
            "/api/services/openai/v1/responses/resp.%3Fopaque?failure=raw",
            &client_headers,
            "",
        ),
    )
    .await;
    assert_eq!(raw_failure.status(), StatusCode::TOO_MANY_REQUESTS);
    assert_eq!(raw_failure.headers()["x-provider-limit"], "7");
    assert_eq!(
        raw_failure.into_body().collect().await.unwrap().to_bytes(),
        r#"{"upstream":"native"}"#
    );
    let input_items = crate::responses_lifecycle::input_items(
        State(state.clone()),
        Path("resp.?opaque".into()),
        OriginalUri(
            "/api/services/openai/v1/responses/resp.%3Fopaque/input_items?after=item_1&limit=20&order=desc"
                .parse()
                .unwrap(),
        ),
        request(
            Method::GET,
            "/api/services/openai/v1/responses/resp.%3Fopaque/input_items",
            &client_headers,
            "",
        ),
    )
    .await;
    assert_eq!(input_items.status(), StatusCode::OK);
    let cancelled = crate::responses_lifecycle::cancel(
        State(state.clone()),
        Path("resp.?opaque".into()),
        OriginalUri(Uri::from_static(
            "/api/services/openai/v1/responses/resp.%3Fopaque/cancel",
        )),
        request(
            Method::POST,
            "/api/services/openai/v1/responses/resp.%3Fopaque/cancel",
            &client_headers,
            r#"{"reason":"client"}"#,
        ),
    )
    .await;
    assert_eq!(cancelled.status(), StatusCode::OK);
    let deleted = crate::responses_lifecycle::delete(
        State(state.clone()),
        Path("resp.?opaque".into()),
        OriginalUri(Uri::from_static(
            "/api/services/openai/v1/responses/resp.%3Fopaque",
        )),
        request(
            Method::DELETE,
            "/api/services/openai/v1/responses/resp.%3Fopaque",
            &client_headers,
            "",
        ),
    )
    .await;
    assert_eq!(deleted.status(), StatusCode::NO_CONTENT);
    let after_delete = crate::responses_lifecycle::retrieve(
        State(state.clone()),
        Path("resp.?opaque".into()),
        OriginalUri(Uri::from_static(
            "/api/services/openai/v1/responses/resp.%3Fopaque",
        )),
        request(
            Method::GET,
            "/api/services/openai/v1/responses/resp.%3Fopaque",
            &client_headers,
            "",
        ),
    )
    .await;
    assert_eq!(after_delete.status(), StatusCode::NOT_FOUND);
    let seen = seen.lock().unwrap();
    assert!(seen.iter().any(|request| {
        request.method == Method::GET
            && request.uri == "/v1/responses/resp.%3Fopaque?include[]=reasoning.encrypted_content&starting_after=item_1"
    }));
    assert!(seen.iter().any(|request| {
        request.uri == "/v1/responses/resp.%3Fopaque/input_items?after=item_1&limit=20&order=desc"
    }));
    assert!(seen.iter().all(|request| {
        request
            .headers
            .get("authorization")
            .map(HeaderValue::as_bytes)
            == Some(b"Bearer upstream-secret")
    }));
    assert!(
        seen.iter()
            .any(|request| request.body == br#"{"reason":"client"}"#)
    );
    drop(seen);
    task.abort();
}

#[tokio::test]
async fn native_subscription_response_lifecycle_reuses_the_exact_account() {
    let data_dir = tempfile::tempdir().unwrap();
    let codex_home = tempfile::tempdir().unwrap();
    std::fs::write(
        codex_home.path().join("auth.json"),
        r#"{"tokens":{"access_token":"codex-upstream","account_id":"account-42"}}"#,
    )
    .unwrap();
    let reader = crate::subscription::SubscriptionReader::new(
        crate::subscription::SubscriptionProvider::Codex,
        codex_home.path(),
    );
    let (base_url, seen, task) = lifecycle_upstream().await;
    let mut state = crate::app_state::AppState::for_tests(data_dir.path());
    state.upstream_provider = UpstreamProvider::Codex;
    state.subscription_base_url = Some(base_url);
    state.subscription_reader = Some(reader.clone());
    state.subscription_readers = vec![reader];
    let client_headers = headers(
        &state,
        crate::clients::ClientKind::Codex,
        crate::credential_recovery_store::PRIMARY_ACCOUNT,
    );

    let created = crate::proxy::openai_responses_native(
        State(state.clone()),
        client_headers.clone(),
        Ok(axum::Json(serde_json::json!({
            "model":"future-model",
            "input":"hello"
        }))),
    )
    .await;
    assert_eq!(created.status(), StatusCode::OK);

    let retrieved = crate::responses_lifecycle::retrieve(
        State(state),
        Path("resp.?opaque".into()),
        OriginalUri(Uri::from_static(
            "/api/services/codex/v1/responses/resp.%3Fopaque",
        )),
        request(
            Method::GET,
            "/api/services/codex/v1/responses/resp.%3Fopaque",
            &client_headers,
            "",
        ),
    )
    .await;
    assert_eq!(retrieved.status(), StatusCode::OK);
    let seen = seen.lock().unwrap();
    let lifecycle = seen
        .iter()
        .find(|request| request.method == Method::GET)
        .expect("subscription lifecycle request");
    assert_eq!(lifecycle.uri, "/v1/responses/resp.%3Fopaque");
    assert_eq!(lifecycle.headers["authorization"], "Bearer codex-upstream");
    assert_eq!(lifecycle.headers["chatgpt-account-id"], "account-42");
    drop(seen);
    task.abort();
}

#[tokio::test]
async fn sse_identity_is_durable_before_the_success_response_is_returned() {
    let data_dir = tempfile::tempdir().unwrap();
    let mut state = crate::model_routing::tests::auto_state(Vec::new(), data_dir.path());
    let (base_url, _seen, task) = lifecycle_upstream().await;
    install_provider(&state, &base_url);
    state.upstream_provider = UpstreamProvider::OpenAICompatible;
    state.openai_compatible.provider_name = "lifecycle".into();
    let client_headers = headers(&state, crate::clients::ClientKind::Codex, "owner-a");
    let capture = crate::resource_capture::prepare(
        &state,
        &client_headers,
        crate::response_affinity::ResponseNamespace::OpenAiResponses,
    )
    .await
    .unwrap();
    let source = futures_util::stream::iter([
        Ok::<_, std::io::Error>(bytes::Bytes::from_static(
            b"event: response.created\ndata: {\"response\":{\"id\":\"resp_sse\"}}\n\n",
        )),
        Ok(bytes::Bytes::from_static(
            b"event: response.completed\ndata: {\"response\":{\"id\":\"resp_sse\"}}\n\n",
        )),
    ]);
    let response = Response::builder()
        .status(StatusCode::OK)
        .header("content-type", "text/event-stream")
        .body(Body::from_stream(source))
        .unwrap();
    let captured = crate::resource_capture::capture(&state, capture, response).await;
    let owner = crate::response_affinity::ResponseOwner::new("codex", "owner-a");
    assert!(
        state
            .provider_store
            .response_affinities()
            .lookup(
                crate::response_affinity::ResponseNamespace::OpenAiResponses,
                "resp_sse",
                &owner,
            )
            .unwrap()
            .is_some()
    );
    let bytes = captured.into_body().collect().await.unwrap().to_bytes();
    assert!(String::from_utf8_lossy(&bytes).contains("response.completed"));
    task.abort();
}

#[tokio::test]
async fn stored_chat_full_lifecycle_filters_list_and_preserves_metadata() {
    let data_dir = tempfile::tempdir().unwrap();
    let mut state = crate::model_routing::tests::auto_state(Vec::new(), data_dir.path());
    let (base_url, seen, task) = lifecycle_upstream().await;
    install_provider(&state, &base_url);
    state.upstream_provider = UpstreamProvider::OpenAICompatible;
    state.openai_compatible.provider_name = "lifecycle".into();
    let client_headers = headers(&state, crate::clients::ClientKind::Opencode, "owner-a");
    let created = crate::proxy::openai_chat_completions(
        State(state.clone()),
        Query(std::collections::BTreeMap::new()),
        client_headers.clone(),
        Ok(axum::Json(serde_json::json!({
            "model":"future-model",
            "messages":[{"role":"user","content":"hello"}],
            "store":true,
            "metadata":{"case":"sensitive-fixture"}
        }))),
    )
    .await;
    assert_eq!(created.status(), StatusCode::OK);

    let retrieved = crate::chat_lifecycle::retrieve(
        State(state.clone()),
        Path("chatcmpl.?opaque".into()),
        OriginalUri(Uri::from_static(
            "/api/services/openai/v1/chat/completions/chatcmpl.%3Fopaque",
        )),
        request(
            Method::GET,
            "/api/services/openai/v1/chat/completions/chatcmpl.%3Fopaque",
            &client_headers,
            "",
        ),
    )
    .await;
    assert_eq!(retrieved.status(), StatusCode::OK);

    let listed = crate::chat_lifecycle::list(
        State(state.clone()),
        OriginalUri(
            "/api/services/openai/v1/chat/completions?after=chatcmpl_0&limit=20&order=asc"
                .parse()
                .unwrap(),
        ),
        request(
            Method::GET,
            "/api/services/openai/v1/chat/completions",
            &client_headers,
            "",
        ),
    )
    .await;
    assert_eq!(listed.status(), StatusCode::OK);
    let payload: serde_json::Value =
        serde_json::from_slice(&listed.into_body().collect().await.unwrap().to_bytes()).unwrap();
    assert_eq!(payload["data"].as_array().unwrap().len(), 1);
    assert_eq!(payload["data"][0]["id"], "chatcmpl.?opaque");

    let updated = crate::chat_lifecycle::update(
        State(state.clone()),
        Path("chatcmpl.?opaque".into()),
        OriginalUri(Uri::from_static(
            "/api/services/openai/v1/chat/completions/chatcmpl.%3Fopaque",
        )),
        request(
            Method::POST,
            "/api/services/openai/v1/chat/completions/chatcmpl.%3Fopaque",
            &client_headers,
            r#"{"metadata":{"updated":"yes"}}"#,
        ),
    )
    .await;
    assert_eq!(updated.status(), StatusCode::OK);
    let messages = crate::chat_lifecycle::messages(
        State(state.clone()),
        Path("chatcmpl.?opaque".into()),
        OriginalUri(
            "/api/services/openai/v1/chat/completions/chatcmpl.%3Fopaque/messages?after=msg_1&limit=20&order=asc"
                .parse()
                .unwrap(),
        ),
        request(
            Method::GET,
            "/api/services/openai/v1/chat/completions/chatcmpl.%3Fopaque/messages",
            &client_headers,
            "",
        ),
    )
    .await;
    assert_eq!(messages.status(), StatusCode::OK);
    let before_unknown = seen.lock().unwrap().len();
    let unknown = crate::chat_lifecycle::retrieve(
        State(state.clone()),
        Path("unknown".into()),
        OriginalUri(Uri::from_static(
            "/api/services/openai/v1/chat/completions/unknown",
        )),
        request(
            Method::GET,
            "/api/services/openai/v1/chat/completions/unknown",
            &client_headers,
            "",
        ),
    )
    .await;
    assert_eq!(unknown.status(), StatusCode::NOT_FOUND);
    assert_eq!(seen.lock().unwrap().len(), before_unknown);
    let deleted = crate::chat_lifecycle::delete(
        State(state.clone()),
        Path("chatcmpl.?opaque".into()),
        OriginalUri(Uri::from_static(
            "/api/services/openai/v1/chat/completions/chatcmpl.%3Fopaque",
        )),
        request(
            Method::DELETE,
            "/api/services/openai/v1/chat/completions/chatcmpl.%3Fopaque",
            &client_headers,
            "",
        ),
    )
    .await;
    assert_eq!(deleted.status(), StatusCode::OK);
    let after_delete = crate::chat_lifecycle::retrieve(
        State(state.clone()),
        Path("chatcmpl.?opaque".into()),
        OriginalUri(Uri::from_static(
            "/api/services/openai/v1/chat/completions/chatcmpl.%3Fopaque",
        )),
        request(
            Method::GET,
            "/api/services/openai/v1/chat/completions/chatcmpl.%3Fopaque",
            &client_headers,
            "",
        ),
    )
    .await;
    assert_eq!(after_delete.status(), StatusCode::NOT_FOUND);
    let seen = seen.lock().unwrap();
    let create: serde_json::Value = serde_json::from_slice(&seen[0].body).unwrap();
    assert_eq!(create["store"], true);
    assert_eq!(create["metadata"]["case"], "sensitive-fixture");
    assert!(seen.iter().any(|request| {
        request.method == Method::GET
            && request.uri == "/v1/chat/completions?after=chatcmpl_0&limit=20&order=asc"
    }));
    assert!(seen.iter().any(|request| {
        request.method == Method::POST && request.body == br#"{"metadata":{"updated":"yes"}}"#
    }));
    assert!(seen.iter().any(|request| {
        request.uri
            == "/v1/chat/completions/chatcmpl.%3Fopaque/messages?after=msg_1&limit=20&order=asc"
    }));
    drop(seen);
    task.abort();
}

#[tokio::test]
async fn unsupported_chat_storage_is_rejected_before_inference_but_store_false_remains_compatible()
{
    let data_dir = tempfile::tempdir().unwrap();
    let mut state = crate::model_routing::tests::auto_state(Vec::new(), data_dir.path());
    state.upstream_provider = UpstreamProvider::Anthropic;
    let client_headers = headers(&state, crate::clients::ClientKind::Opencode, "owner-a");
    let stored = crate::proxy::openai_chat_completions(
        State(state.clone()),
        Query(std::collections::BTreeMap::new()),
        client_headers.clone(),
        Ok(axum::Json(serde_json::json!({
            "model":"future-model",
            "messages":[{"role":"user","content":"hello"}],
            "store":true
        }))),
    )
    .await;
    assert_eq!(stored.status(), StatusCode::BAD_REQUEST);
    let ordinary = crate::proxy::openai_chat_completions(
        State(state),
        Query(std::collections::BTreeMap::new()),
        client_headers,
        Ok(axum::Json(serde_json::json!({
            "model":"future-model",
            "messages":[{"role":"user","content":"hello"}],
            "store":false
        }))),
    )
    .await;
    assert_ne!(ordinary.status(), StatusCode::BAD_REQUEST);
}
