use super::*;

async fn recording_upstream() -> (
    String,
    Arc<Mutex<Option<(HeaderMap, Value)>>>,
    tokio::task::JoinHandle<()>,
) {
    let request = Arc::new(Mutex::new(None));
    let seen = Arc::clone(&request);
    let app = axum::Router::new().fallback(move |request: Request<Body>| {
        let seen = Arc::clone(&seen);
        async move {
            let (parts, body) = request.into_parts();
            let bytes = body.collect().await.unwrap().to_bytes();
            let body = serde_json::from_slice(&bytes).unwrap();
            *seen.lock().unwrap() = Some((parts.headers, body));
            (StatusCode::OK, "{}")
        }
    });
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let base_url = format!("http://{}", listener.local_addr().unwrap());
    let task = tokio::spawn(async move { axum::serve(listener, app).await.unwrap() });
    (base_url, request, task)
}

fn proxied_codex_headers(state: &AppState) -> HeaderMap {
    let token =
        super::super::tests::bound_client_token(state, crate::clients::ClientKind::Codex, None);
    let mut headers = HeaderMap::new();
    headers.insert(
        "authorization",
        HeaderValue::from_str(&format!("Bearer {token}")).unwrap(),
    );
    headers.insert(
        crate::client_policy::PROXIED_CLIENT_EVIDENCE_HEADER,
        HeaderValue::from_static(crate::client_policy::PROXIED_CODEX_EVIDENCE_VALUE),
    );
    headers.insert("content-type", HeaderValue::from_static("application/json"));
    headers
}

#[tokio::test]
async fn canonical_codex_responses_route_requires_the_proxied_client_opt_in() {
    let (base_url, request_seen, task) = recording_upstream().await;
    let data = tempfile::tempdir().unwrap();
    let home = tempfile::tempdir().unwrap();
    let mut state = state_for(SubscriptionProvider::Codex, &data, &home, &base_url);
    state.upstream_provider = UpstreamProvider::Auto;
    let headers = proxied_codex_headers(&state);
    let body = json!({"model": MODEL, "input": "hello", "store": false}).to_string();
    let request = Request::builder()
        .method("POST")
        .uri("/api/services/codex/v1/responses")
        .body(Body::from(body.clone()))
        .unwrap();
    let mut request = request;
    *request.headers_mut() = headers.clone();

    let denied = crate::proxy::openai_responses_route(
        State(state.clone()),
        OriginalUri("/api/services/codex/v1/responses".parse().unwrap()),
        request,
    )
    .await;
    assert_eq!(denied.status(), StatusCode::FORBIDDEN);
    assert!(request_seen.lock().unwrap().is_none());

    state
        .provider_store
        .set_subscription_entitlement_policy(
            crate::client_policy::SubscriptionEntitlementPolicy::default()
                .with_proxied_clients(["codex"])
                .unwrap(),
        )
        .unwrap();
    let request = Request::builder()
        .method("POST")
        .uri("/api/services/codex/v1/responses")
        .body(Body::from(body))
        .unwrap();
    let mut request = request;
    *request.headers_mut() = headers;
    let allowed = crate::proxy::openai_responses_route(
        State(state),
        OriginalUri("/api/services/codex/v1/responses".parse().unwrap()),
        request,
    )
    .await;
    assert_eq!(allowed.status(), StatusCode::OK);
    let (upstream_headers, upstream_body) = request_seen.lock().unwrap().clone().unwrap();
    assert!(
        upstream_headers["user-agent"]
            .to_str()
            .unwrap()
            .starts_with("codex_cli_rs/")
    );
    assert!(
        upstream_headers
            .get(crate::client_policy::PROXIED_CLIENT_EVIDENCE_HEADER)
            .is_none()
    );
    assert_eq!(upstream_body["stream"], true);
    assert_eq!(upstream_body["store"], false);
    assert!(upstream_body["input"].is_array());
    assert_eq!(
        upstream_body["instructions"],
        "You are a helpful assistant."
    );
    task.abort();
}

#[tokio::test]
async fn canonical_codex_catalog_keeps_its_existing_signed_marker_evidence() {
    let data = tempfile::tempdir().unwrap();
    let home = tempfile::tempdir().unwrap();
    let state = state_for(
        SubscriptionProvider::Codex,
        &data,
        &home,
        "http://127.0.0.1:1",
    );
    let mut headers = proxied_codex_headers(&state);
    headers.remove(crate::client_policy::PROXIED_CLIENT_EVIDENCE_HEADER);
    headers.insert("x-link-assistant-client", HeaderValue::from_static("codex"));
    let uri = OriginalUri("/api/services/codex/v1/models".parse().unwrap());

    let baseline = models(State(state.clone()), uri.clone(), headers.clone()).await;
    assert_eq!(baseline.status(), StatusCode::OK);

    state
        .provider_store
        .set_subscription_entitlement_policy(
            crate::client_policy::SubscriptionEntitlementPolicy::default()
                .with_proxied_clients(["codex"])
                .unwrap(),
        )
        .unwrap();
    let with_override = models(State(state), uri, headers).await;
    assert_eq!(with_override.status(), StatusCode::OK);
    let body = with_override
        .into_body()
        .collect()
        .await
        .unwrap()
        .to_bytes();
    let body: Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(body["data"][0]["id"], MODEL);
}
