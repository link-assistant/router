use super::*;

fn messages_request(headers: &HeaderMap, body: &serde_json::Value) -> Request<Body> {
    let mut request = Request::builder()
        .method("POST")
        .uri("/api/services/anthropic/v1/messages")
        .body(Body::from(serde_json::to_vec(body).unwrap()))
        .unwrap();
    *request.headers_mut() = headers.clone();
    request
}

#[tokio::test]
async fn messages_ingress_rejects_required_fields_before_zai_catalog_or_inference() {
    let (base_url, requests, handle) = recording_upstream().await;
    let data = tempfile::tempdir().unwrap();
    let mut state = crate::model_routing::tests::auto_state(Vec::new(), data.path());
    install_provider(&mut state, &base_url, &[]);
    let headers = client_headers(&state, ClientKind::ClaudeCode, "owner-a");
    let complete = serde_json::json!({
        "model": "glm-5.3-flash",
        "max_tokens": 8,
        "messages": [{"role": "user", "content": "ping"}]
    });

    for field in ["model", "max_tokens", "messages"] {
        let mut body = complete.clone();
        body.as_object_mut().unwrap().remove(field);
        let response = crate::proxy::proxy_handler(
            axum::extract::State(state.clone()),
            messages_request(&headers, &body),
        )
        .await;
        assert_eq!(response.status(), StatusCode::BAD_REQUEST, "{field}");
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(payload["type"], "error", "{field}: {payload}");
        assert_eq!(payload["error"]["type"], "invalid_request_error");
        assert!(
            payload["error"]["message"]
                .as_str()
                .is_some_and(|message| message.contains(field)),
            "{field}: {payload}"
        );
    }

    assert!(
        requests.lock().unwrap().is_empty(),
        "invalid Messages input contacted z.ai"
    );
    handle.abort();
}

#[tokio::test]
async fn valid_glm_flash_messages_request_still_reaches_zai() {
    let (base_url, requests, handle) = recording_upstream().await;
    let data = tempfile::tempdir().unwrap();
    let mut state = crate::model_routing::tests::auto_state(Vec::new(), data.path());
    install_provider(&mut state, &base_url, &[]);
    let headers = client_headers(&state, ClientKind::ClaudeCode, "owner-a");
    let body = serde_json::json!({
        "model": "glm-5.3-flash",
        "max_tokens": 8,
        "messages": [{"role": "user", "content": "ping"}]
    });
    let response = crate::proxy::proxy_handler(
        axum::extract::State(state),
        messages_request(&headers, &body),
    )
    .await;

    assert_eq!(response.status(), StatusCode::OK);
    let calls = requests.lock().unwrap();
    assert_eq!(calls.len(), 2, "one catalog call and one inference call");
    assert_eq!(calls[0].0, crate::zai_coding_plan::CATALOG_PATH);
    assert_eq!(calls[1].0, "/api/anthropic/v1/messages");
    assert_eq!(
        serde_json::from_str::<serde_json::Value>(&calls[1].2).unwrap(),
        body
    );
    drop(calls);
    handle.abort();
}
