use super::*;

fn state_with_live_claude_catalog(
    data: &std::path::Path,
    claude_home: &std::path::Path,
    models: &[&str],
) -> crate::app_state::AppState {
    fs::write(
        claude_home.join(".credentials.json"),
        r#"{"claudeAiOauth":{"accessToken":"claude-live","expiresAt":9999999999999}}"#,
    )
    .unwrap();
    let state = crate::model_routing::tests::auto_state(
        vec![crate::subscription::SubscriptionReader::new(
            crate::subscription::SubscriptionProvider::Claude,
            claude_home,
        )],
        data,
    );
    state.model_catalogs.record_success(
        crate::subscription::SubscriptionProvider::Claude,
        models.iter().map(|model| (*model).to_string()).collect(),
    );
    state
}

async fn claude_catalog_response(
    state: crate::app_state::AppState,
) -> (StatusCode, serde_json::Value) {
    let headers = client_headers(&state, ClientKind::ClaudeCode, "primary");
    let response = crate::model_routing::models(
        axum::extract::State(state),
        axum::extract::OriginalUri("/api/services/anthropic/v1/models".parse().unwrap()),
        headers,
    )
    .await;
    let status = response.status();
    let body = response.into_body().collect().await.unwrap().to_bytes();
    (status, serde_json::from_slice(&body).unwrap())
}

#[tokio::test]
async fn live_provider_add_merges_without_clearing_the_subscription_catalog() {
    let (base_url, requests, handle) = recording_upstream().await;
    let data = tempfile::tempdir().unwrap();
    let claude = tempfile::tempdir().unwrap();
    let mut state = state_with_live_claude_catalog(data.path(), claude.path(), &["future-claude"]);

    let (status, before) = claude_catalog_response(state.clone()).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(before["data"][0]["id"], "future-claude");

    install_provider_for_subscriber(&mut state, &base_url, &[], "primary");
    state.upstream_provider = crate::config::UpstreamProvider::Auto;
    let (status, after) = claude_catalog_response(state).await;
    assert_eq!(status, StatusCode::OK);
    let ids = after["data"]
        .as_array()
        .unwrap()
        .iter()
        .filter_map(|model| model["id"].as_str())
        .collect::<Vec<_>>();
    assert!(ids.contains(&"future-claude"), "{after}");
    assert!(ids.contains(&"future-saffron-91"), "{after}");
    assert_eq!(requests.lock().unwrap().len(), 1);
    handle.abort();
}

#[tokio::test]
async fn same_id_subscription_and_zai_catalog_is_an_explicit_conflict() {
    let (base_url, _, handle) = recording_upstream().await;
    let data = tempfile::tempdir().unwrap();
    let claude = tempfile::tempdir().unwrap();
    let mut state = state_with_live_claude_catalog(data.path(), claude.path(), &["glm-5"]);
    install_provider_for_subscriber(&mut state, &base_url, &[], "primary");
    state.upstream_provider = crate::config::UpstreamProvider::Auto;

    let (status, body) = claude_catalog_response(state).await;
    assert_eq!(status, StatusCode::CONFLICT);
    let rendered = body.to_string();
    assert!(rendered.contains("glm-5"), "{rendered}");
    assert!(!rendered.contains("claude-zai-"), "{rendered}");
    assert!(!rendered.contains("z.ai/glm-5"), "{rendered}");
    handle.abort();
}

#[tokio::test]
async fn failed_zai_refresh_keeps_the_live_claude_catalog() {
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let base_url = format!("http://{}", listener.local_addr().unwrap());
    let handle = tokio::spawn(async move {
        axum::serve(
            listener,
            axum::Router::new().fallback(|| async { (StatusCode::BAD_GATEWAY, "private body") }),
        )
        .await
        .unwrap();
    });
    let data = tempfile::tempdir().unwrap();
    let claude = tempfile::tempdir().unwrap();
    let mut state = state_with_live_claude_catalog(data.path(), claude.path(), &["future-claude"]);
    install_provider_for_subscriber(&mut state, &base_url, &[], "primary");
    state.upstream_provider = crate::config::UpstreamProvider::Auto;

    let (status, body) = claude_catalog_response(state).await;
    assert_eq!(status, StatusCode::OK);
    assert!(body.to_string().contains("future-claude"), "{body}");
    assert!(
        body["degraded_providers"]
            .as_array()
            .unwrap()
            .iter()
            .any(|v| v == "z.ai")
    );
    assert!(!body.to_string().contains("private body"), "{body}");
    handle.abort();
}

#[tokio::test]
async fn rejected_health_returns_a_successful_empty_catalog_without_hiding_other_providers() {
    let requests = Arc::new(Mutex::new(Vec::<String>::new()));
    let recorded = Arc::clone(&requests);
    let app = axum::Router::new().fallback(move |request: Request<Body>| {
        let recorded = Arc::clone(&recorded);
        async move {
            let path = request.uri().path().to_string();
            recorded.lock().unwrap().push(path.clone());
            if path == "/v1/models" {
                (
                    StatusCode::OK,
                    r#"{"data":[{"id":"ordinary-model","object":"model"}]}"#,
                )
            } else {
                (StatusCode::UNAUTHORIZED, "rejected")
            }
        }
    });
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let base_url = format!("http://{}", listener.local_addr().unwrap());
    let handle = tokio::spawn(async move { axum::serve(listener, app).await.unwrap() });
    let data = tempfile::tempdir().unwrap();
    let mut state = crate::model_routing::tests::auto_state(Vec::new(), data.path());
    install_provider(&mut state, &base_url, &[]);
    state
        .provider_store
        .upsert(crate::providers::ProviderUpsert {
            name: "ordinary-api".into(),
            kind: Some("openai-compatible".into()),
            base_url: format!("{base_url}/v1"),
            default_model: None,
            models: Some(vec!["ordinary-model".into()]),
            supported_clients: Some(vec!["codex".into()]),
            api_key: None,
            api_key_env: None,
            encrypted_api_key: None,
            enabled: Some(true),
            subscriber_id: None,
            acknowledge_intermediary_risk: None,
            acknowledge_unsupported_clients: None,
            if_absent: false,
        })
        .unwrap();
    state.upstream_provider = crate::config::UpstreamProvider::Auto;
    let mut headers = client_headers(&state, ClientKind::Codex, "owner-a");
    headers.insert("x-link-assistant-client", HeaderValue::from_static("codex"));
    let response = crate::model_routing::models(
        axum::extract::State(state),
        axum::extract::OriginalUri("/api/services/codex/v1/models".parse().unwrap()),
        headers,
    )
    .await;
    assert_eq!(response.status(), StatusCode::OK);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let body = String::from_utf8_lossy(&body);
    assert!(body.contains("ordinary-model"), "{body}");
    assert!(!body.contains("\"id\":\"glm-5\""), "{body}");
    assert!(
        body.contains("z.ai"),
        "degraded provider remains diagnosable: {body}"
    );
    assert_eq!(requests.lock().unwrap().len(), 2);
    handle.abort();
}

#[tokio::test]
async fn one_unsupported_gemini_override_reuses_translation_and_revocation_is_immediate() {
    let (base_url, requests, handle) = recording_upstream().await;
    let data = tempfile::tempdir().unwrap();
    let mut state = crate::model_routing::tests::auto_state(Vec::new(), data.path());
    install_provider(&mut state, &base_url, &["gemini"]);
    state.upstream_provider = crate::config::UpstreamProvider::Auto;
    let headers = client_headers(&state, ClientKind::GeminiCli, "owner-a");
    let response = Box::pin(crate::gemini::forward_native_gemini(
        axum::extract::State(state.clone()),
        axum::extract::Path("v1beta/models/glm-5:generateContent".to_string()),
        headers,
        Ok(axum::Json(serde_json::json!({
            "contents": [{"role":"user","parts":[{"text":"hi"}]}]
        }))),
    ))
    .await;
    assert_eq!(response.status(), StatusCode::OK);
    let recorded = requests.lock().unwrap().clone();
    assert_eq!(recorded.len(), 2);
    assert_eq!(recorded[1].0, "/api/coding/paas/v4/chat/completions");
    assert!(recorded[1].2.contains(r#""model":"glm-5""#));

    state
        .provider_store
        .upsert(crate::providers::ProviderUpsert {
            name: "z-ai-personal".into(),
            kind: Some("z.ai-coding-plan".into()),
            base_url,
            default_model: Some("glm-5".into()),
            models: Some(vec!["glm-5".into()]),
            supported_clients: None,
            api_key: Some("zai-secret-key".into()),
            api_key_env: None,
            encrypted_api_key: None,
            enabled: Some(true),
            subscriber_id: Some("owner-a".into()),
            acknowledge_intermediary_risk: Some(true),
            acknowledge_unsupported_clients: Some(Vec::new()),
            if_absent: false,
        })
        .unwrap();
    let before = requests.lock().unwrap().len();
    let response = Box::pin(crate::gemini::forward_native_gemini(
        axum::extract::State(state.clone()),
        axum::extract::Path("v1beta/models/glm-5:generateContent".to_string()),
        client_headers(&state, ClientKind::GeminiCli, "owner-a"),
        Ok(axum::Json(serde_json::json!({"contents": []}))),
    ))
    .await;
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
    assert_eq!(
        requests.lock().unwrap().len(),
        before,
        "revocation is pre-upstream"
    );
    handle.abort();
}

#[tokio::test]
async fn streaming_tool_cycle_and_count_tokens_keep_the_exact_model_boundary() {
    let requests = Arc::new(Mutex::new(Vec::<(String, String, HeaderMap)>::new()));
    let recorded = Arc::clone(&requests);
    let app = axum::Router::new().fallback(move |request: Request<Body>| {
        let recorded = Arc::clone(&recorded);
        async move {
            let path = request.uri().path().to_string();
            let headers = request.headers().clone();
            let body = request.into_body().collect().await.unwrap().to_bytes();
            recorded
                .lock()
                .unwrap()
                .push((
                    path.clone(),
                    String::from_utf8_lossy(&body).into_owned(),
                    headers,
                ));
            if path == crate::zai_coding_plan::CATALOG_PATH {
                return axum::response::Response::builder()
                    .status(StatusCode::OK)
                    .body(Body::from(r#"{"data":[{"id":"glm-5"}]}"#))
                    .unwrap();
            }
            axum::response::Response::builder()
                .status(StatusCode::OK)
                .header("content-type", "text/event-stream")
                .body(Body::from(
                    "data: {\"model\":\"glm-5\",\"choices\":[{\"delta\":{\"tool_calls\":[{\"id\":\"call_1\",\"function\":{\"name\":\"lookup\",\"arguments\":\"{}\"}}]}}]}\n\ndata: [DONE]\n\n",
                ))
                .unwrap()
        }
    });
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let base_url = format!("http://{}", listener.local_addr().unwrap());
    let handle = tokio::spawn(async move { axum::serve(listener, app).await.unwrap() });
    let data = tempfile::tempdir().unwrap();
    let mut state = crate::model_routing::tests::auto_state(Vec::new(), data.path());
    install_provider(&mut state, &base_url, &[]);
    let headers = client_headers(&state, ClientKind::Opencode, "owner-a");
    let response = crate::zai_coding_plan::forward(
        &state,
        &headers,
        serde_json::json!({
            "model":"glm-5",
            "stream":true,
            "messages":[{"role":"user","content":"look up"}],
            "tools":[{"type":"function","function":{"name":"lookup","parameters":{"type":"object"}}}]
        }),
        "/v1/chat/completions",
        ClientProtocol::OpenAIChat,
        crate::metrics::Surface::OpenAIChat,
    )
    .await;
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(
        response.headers().get("content-type").unwrap(),
        "text/event-stream"
    );
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let body = String::from_utf8_lossy(&body);
    assert_eq!(
        body,
        "data: {\"model\":\"glm-5\",\"choices\":[{\"delta\":{\"tool_calls\":[{\"id\":\"call_1\",\"function\":{\"name\":\"lookup\",\"arguments\":\"{}\"}}]}}]}\n\ndata: [DONE]\n\n"
    );
    let recorded = requests.lock().unwrap();
    assert_eq!(recorded.len(), 2);
    assert!(recorded[1].1.contains(r#""model":"glm-5""#));
    assert!(recorded[1].1.contains(r#""tools""#));
    assert_eq!(recorded[1].2["user-agent"], "opencode/fixture");
    assert_eq!(recorded[1].2["x-session-id"], "fixture");
    assert_eq!(recorded[1].2["authorization"], "Bearer zai-secret-key");
    assert!(
        recorded[1]
            .2
            .keys()
            .all(|name| !name.as_str().starts_with("x-router-"))
    );
    drop(recorded);

    let claude_headers = client_headers(&state, ClientKind::ClaudeCode, "owner-a");
    let before = requests.lock().unwrap().len();
    let response = crate::zai_coding_plan::count_tokens(
        &state,
        &claude_headers,
        "/v1/messages/count_tokens",
        &serde_json::json!({
            "model":"glm-5",
            "messages":[{"role":"user","content":"hello"}]
        }),
    );
    assert_eq!(response.status(), StatusCode::SERVICE_UNAVAILABLE);
    assert_eq!(
        requests.lock().unwrap().len(),
        before,
        "unavailable counting never starts inference"
    );
    let ghost_response = crate::zai_coding_plan::count_tokens(
        &state,
        &claude_headers,
        "/v1/messages/count_tokens",
        &serde_json::json!({"model":"claude-sonnet-built-in","messages":[]}),
    );
    assert_eq!(ghost_response.status(), StatusCode::FORBIDDEN);
    assert_eq!(
        requests.lock().unwrap().len(),
        before,
        "ghost model is local denial"
    );
    handle.abort();
}
