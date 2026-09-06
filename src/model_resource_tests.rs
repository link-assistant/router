use std::sync::{Arc, Mutex};

use axum::body::Body;
use axum::extract::{OriginalUri, Path, State};
use axum::http::{HeaderMap, HeaderValue, Request, StatusCode, Uri};
use axum::response::IntoResponse;
use http_body_util::BodyExt as _;

#[tokio::test]
async fn exact_visible_model_uses_native_path_and_unknown_ids_do_not_probe() {
    let seen = Arc::new(Mutex::new(Vec::new()));
    let captured = Arc::clone(&seen);
    let upstream = axum::Router::new().fallback(move |request: Request<Body>| {
        let captured = Arc::clone(&captured);
        async move {
            captured
                .lock()
                .unwrap()
                .push((request.uri().to_string(), request.headers().clone()));
            match request.uri().path() {
                "/v1/models" => axum::Json(serde_json::json!({
                    "object":"list",
                    "data":[{"id":"future-model","object":"model","owned_by":"native-owner"}]
                }))
                .into_response(),
                "/v1/models/future-model" => axum::response::Response::builder()
                    .status(StatusCode::OK)
                    .header("content-type", "application/json")
                    .header("x-provider-model", "native")
                    .body(Body::from(
                        r#"{"id":"future-model","object":"model","owned_by":"native-owner"}"#,
                    ))
                    .unwrap(),
                _ => StatusCode::NOT_FOUND.into_response(),
            }
        }
    });
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let base_url = format!("http://{}/v1", listener.local_addr().unwrap());
    let task = tokio::spawn(async move { axum::serve(listener, upstream).await.unwrap() });

    let data_dir = tempfile::tempdir().unwrap();
    let mut state = crate::model_routing::tests::auto_state(Vec::new(), data_dir.path());
    state
        .provider_store
        .upsert(crate::providers::ProviderUpsert {
            name: "native-owner".into(),
            kind: None,
            base_url,
            default_model: Some("future-model".into()),
            models: Some(vec!["future-model".into()]),
            supported_clients: Some(vec!["opencode".into()]),
            api_key: Some("provider-secret".into()),
            api_key_env: None,
            encrypted_api_key: None,
            enabled: Some(true),
            subscriber_id: None,
            acknowledge_intermediary_risk: None,
            acknowledge_unsupported_clients: None,
            if_absent: false,
        })
        .unwrap();
    state.upstream_provider = crate::config::UpstreamProvider::OpenAICompatible;
    state.openai_compatible.provider_name = "native-owner".into();
    let token = crate::model_routing::tests::bound_client_token(
        &state,
        crate::clients::ClientKind::Opencode,
        Some("owner-a"),
    );
    let mut headers = HeaderMap::new();
    headers.insert(
        "authorization",
        HeaderValue::from_str(&format!("Bearer {token}")).unwrap(),
    );
    headers.insert("user-agent", HeaderValue::from_static("opencode/test"));
    headers.insert("x-session-id", HeaderValue::from_static("session-test"));
    headers.insert("openai-project", HeaderValue::from_static("project-test"));

    let response = crate::model_resource::retrieve(
        State(state.clone()),
        Path("future-model".into()),
        OriginalUri(Uri::from_static(
            "/api/services/openai/v1/models/future-model",
        )),
        headers.clone(),
    )
    .await;
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(response.headers()["x-provider-model"], "native");
    let body = response.into_body().collect().await.unwrap().to_bytes();
    assert_eq!(
        serde_json::from_slice::<serde_json::Value>(&body).unwrap()["owned_by"],
        "native-owner"
    );

    let before = seen.lock().unwrap().len();
    let unknown = crate::model_resource::retrieve(
        State(state.clone()),
        Path("unknown-model".into()),
        OriginalUri(Uri::from_static(
            "/api/services/openai/v1/models/unknown-model",
        )),
        headers.clone(),
    )
    .await;
    assert_eq!(unknown.status(), StatusCode::NOT_FOUND);
    assert_eq!(seen.lock().unwrap().len(), before);

    let malformed = crate::model_resource::retrieve(
        State(state),
        Path("bad/id".into()),
        OriginalUri(Uri::from_static("/api/services/openai/v1/models/bad%2Fid")),
        headers,
    )
    .await;
    assert_eq!(malformed.status(), StatusCode::NOT_FOUND);
    assert_eq!(seen.lock().unwrap().len(), before);

    let seen = seen.lock().unwrap();
    assert_eq!(seen[1].0, "/v1/models/future-model");
    assert_eq!(seen[1].1["authorization"], "Bearer provider-secret");
    assert_eq!(seen[1].1["openai-project"], "project-test");
    drop(seen);
    task.abort();
}
