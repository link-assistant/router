fn codex_apps_state(
    data: &std::path::Path,
    home: &std::path::Path,
    upstream: &str,
) -> AppState {
    std::fs::write(
        home.join("auth.json"),
        serde_json::json!({
            "tokens": {
                "access_token": "codex-upstream",
                "account_id": "workspace-a"
            }
        })
        .to_string(),
    )
    .unwrap();
    let reader = crate::subscription::SubscriptionReader::new(SubscriptionProvider::Codex, home);
    let mut state = AppState::for_tests(data);
    state.upstream_provider = crate::config::UpstreamProvider::Codex;
    state.subscription_base_url = Some(format!("{upstream}/backend-api/codex"));
    state.subscription_reader = Some(reader.clone());
    state.subscription_readers = vec![reader];
    state
}

fn codex_apps_token(state: &AppState, principal: &str) -> String {
    let token = state
        .token_manager
        .issue_with_id(&crate::token::IssueRequest {
            ttl_hours: 1,
            label: "Codex Apps fixture",
            account: None,
            max_requests: None,
            max_tokens: None,
            rate_limit_per_minute: None,
            scope: "",
            github_repos: Vec::new(),
            sliding_window_seconds: None,
            client_kind: Some(ClientKind::Codex.canonical_name()),
            principal_id: Some(principal),
        })
        .unwrap()
        .0;
    crate::token::codex_token_alias(&token).unwrap()
}

fn codex_backend_request(
    method: Method,
    path: &str,
    token: &str,
    body: &'static str,
) -> Request {
    Request::builder()
        .method(method)
        .uri(path)
        .header("authorization", format!("Bearer {token}"))
        .header("content-type", "application/json")
        .body(Body::from(body))
        .unwrap()
}

#[tokio::test]
async fn created_workspace_plugin_lists_expose_only_the_router_principal() {
    let data = tempfile::tempdir().unwrap();
    let state = AppState::for_tests(data.path());
    let destination = AffinityDestination::Subscription {
        provider: SubscriptionProvider::Codex,
        account: "account-a".to_string(),
        upstream_account_id: Some("workspace-a".to_string()),
        base_url: "https://chatgpt.example/backend-api/codex".to_string(),
    };
    let owner = ResponseOwner::new("codex", "principal-a");
    let foreign = ResponseOwner::new("codex", "principal-b");
    for (id, owner) in [("plugin-owned", owner.clone()), ("plugin-foreign", foreign)] {
        state
            .provider_store
            .response_affinities()
            .record(
                ResponseNamespace::CodexWorkspacePlugins,
                id,
                owner,
                destination.clone(),
            )
            .unwrap();
    }
    let mut upstream = Response::new(Body::from(
        serde_json::json!({
            "plugins": [
                {"id": "plugin-foreign", "private": "foreign"},
                {"id": "plugin-owned", "private": "owned"}
            ],
            "pagination": {"next_page_token": "opaque"}
        })
        .to_string(),
    ));
    upstream
        .headers_mut()
        .insert("content-type", HeaderValue::from_static("application/json"));

    let filtered = filter_native_list_response(
        &state,
        &owner,
        &NativeListRequest {
            namespace: ResponseNamespace::CodexWorkspacePlugins,
            parent_id: None,
        },
        upstream,
    )
    .await;
    assert_eq!(filtered.status(), StatusCode::OK);
    let body: serde_json::Value =
        serde_json::from_slice(&filtered.into_body().collect().await.unwrap().to_bytes()).unwrap();
    assert_eq!(body["plugins"], serde_json::json!([{
        "id": "plugin-owned",
        "private": "owned"
    }]));
    assert_eq!(body["pagination"]["next_page_token"], "opaque");
}

#[tokio::test]
async fn hosted_mcp_sessions_are_principal_scoped_and_removed_on_delete() {
    let seen = Arc::new(Mutex::new(Vec::<(Method, Option<String>, String)>::new()));
    let upstream_seen = Arc::clone(&seen);
    let upstream = axum::Router::new().fallback(
        move |method: Method, headers: HeaderMap| {
            let seen = Arc::clone(&upstream_seen);
            async move {
                let session = headers
                    .get("mcp-session-id")
                    .and_then(|value| value.to_str().ok())
                    .map(str::to_string);
                let authorization = headers
                    .get("authorization")
                    .and_then(|value| value.to_str().ok())
                    .unwrap_or_default()
                    .to_string();
                seen.lock()
                    .unwrap()
                    .push((method.clone(), session.clone(), authorization));
                match (method, session) {
                    (Method::POST, None) => (
                        StatusCode::OK,
                        [("mcp-session-id", "mcp-private-session")],
                        r#"{"jsonrpc":"2.0","result":{}}"#,
                    ),
                    (Method::POST, Some(_)) => (
                        StatusCode::ACCEPTED,
                        [("mcp-session-id", "mcp-private-session")],
                        "",
                    ),
                    (Method::DELETE, Some(_)) => (
                        StatusCode::NO_CONTENT,
                        [("mcp-session-id", "mcp-private-session")],
                        "",
                    ),
                    _ => (
                        StatusCode::METHOD_NOT_ALLOWED,
                        [("mcp-session-id", "mcp-private-session")],
                        "",
                    ),
                }
            }
        },
    );
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let origin = format!("http://{}", listener.local_addr().unwrap());
    let server = tokio::spawn(async move { axum::serve(listener, upstream).await.unwrap() });
    let data = tempfile::tempdir().unwrap();
    let home = tempfile::tempdir().unwrap();
    let state = codex_apps_state(data.path(), home.path(), &origin);
    let owner = codex_apps_token(&state, "principal-a");
    let foreign = codex_apps_token(&state, "principal-b");
    let path = "/api/services/codex/backend-api/ps/mcp";

    let created = codex_backend(
        State(state.clone()),
        codex_backend_request(Method::POST, path, &owner, r#"{"jsonrpc":"2.0"}"#),
    )
    .await;
    assert_eq!(created.status(), StatusCode::OK);
    assert_eq!(created.headers()["mcp-session-id"], "mcp-private-session");

    let session_request = |method: Method, token: &str| {
        let mut request = codex_backend_request(method, path, token, "");
        request.headers_mut().insert(
            "mcp-session-id",
            HeaderValue::from_static("mcp-private-session"),
        );
        request
    };
    let denied = codex_backend(
        State(state.clone()),
        session_request(Method::POST, &foreign),
    )
    .await;
    assert_eq!(denied.status(), StatusCode::NOT_FOUND);

    let resumed = codex_backend(
        State(state.clone()),
        session_request(Method::POST, &owner),
    )
    .await;
    assert_eq!(resumed.status(), StatusCode::ACCEPTED);
    let deleted = codex_backend(
        State(state.clone()),
        session_request(Method::DELETE, &owner),
    )
    .await;
    assert_eq!(deleted.status(), StatusCode::NO_CONTENT);
    let expired = codex_backend(State(state), session_request(Method::POST, &owner)).await;
    assert_eq!(expired.status(), StatusCode::NOT_FOUND);
    assert_eq!(seen.lock().unwrap().len(), 3);
    assert!(seen
        .lock()
        .unwrap()
        .iter()
        .all(|(_, _, authorization)| authorization == "Bearer codex-upstream"));
    server.abort();
}

#[tokio::test]
async fn workspace_plugin_uploads_and_mutations_are_principal_scoped() {
    let calls = Arc::new(AtomicUsize::new(0));
    let upstream_calls = Arc::clone(&calls);
    let upstream = axum::Router::new().fallback(move |method: Method, uri: axum::http::Uri| {
        let calls = Arc::clone(&upstream_calls);
        async move {
            calls.fetch_add(1, Ordering::SeqCst);
            match (method, uri.path()) {
                (Method::POST, "/backend-api/public/plugins/workspace/upload-url") => (
                    StatusCode::OK,
                    [("content-type", "application/json")],
                    r#"{"file_id":"upload-private","upload_url":"https://storage.invalid/signed?secret=opaque","etag":"etag-a"}"#,
                ),
                (Method::POST, "/backend-api/public/plugins/workspace") => (
                    StatusCode::OK,
                    [("content-type", "application/json")],
                    r#"{"plugin_id":"plugin-private","share_url":"https://example.invalid/private"}"#,
                ),
                (Method::PUT, "/backend-api/ps/plugins/plugin-private/shares") => (
                    StatusCode::OK,
                    [("content-type", "application/json")],
                    r#"{"principals":[],"discoverability":"PRIVATE"}"#,
                ),
                (Method::POST, "/backend-api/ps/plugins/catalog-plugin/install") => (
                    StatusCode::OK,
                    [("content-type", "application/json")],
                    r#"{"installed":true}"#,
                ),
                (Method::DELETE, "/backend-api/public/plugins/workspace/plugin-private")
                | (Method::POST, "/backend-api/ps/plugins/catalog-plugin/uninstall") => (
                    StatusCode::NO_CONTENT,
                    [("content-type", "application/json")],
                    "",
                ),
                _ => (
                    StatusCode::NOT_FOUND,
                    [("content-type", "application/json")],
                    r#"{"error":"unexpected"}"#,
                ),
            }
        }
    });
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let origin = format!("http://{}", listener.local_addr().unwrap());
    let server = tokio::spawn(async move { axum::serve(listener, upstream).await.unwrap() });
    let data = tempfile::tempdir().unwrap();
    let home = tempfile::tempdir().unwrap();
    let state = codex_apps_state(data.path(), home.path(), &origin);
    let owner = codex_apps_token(&state, "principal-a");
    let foreign = codex_apps_token(&state, "principal-b");

    let upload_path = "/api/services/codex/backend-api/public/plugins/workspace/upload-url";
    let upload = codex_backend(
        State(state.clone()),
        codex_backend_request(
            Method::POST,
            upload_path,
            &owner,
            r#"{"filename":"bundle.tar.gz","mime_type":"application/gzip","size_bytes":1}"#,
        ),
    )
    .await;
    assert_eq!(upload.status(), StatusCode::OK);

    let create_path = "/api/services/codex/backend-api/public/plugins/workspace";
    let finalize_body = r#"{"file_id":"upload-private","etag":"etag-a"}"#;
    let denied_upload = codex_backend(
        State(state.clone()),
        codex_backend_request(Method::POST, create_path, &foreign, finalize_body),
    )
    .await;
    assert_eq!(denied_upload.status(), StatusCode::NOT_FOUND);
    let created = codex_backend(
        State(state.clone()),
        codex_backend_request(Method::POST, create_path, &owner, finalize_body),
    )
    .await;
    assert_eq!(created.status(), StatusCode::OK);

    let shares = "/api/services/codex/backend-api/ps/plugins/plugin-private/shares";
    let denied_share = codex_backend(
        State(state.clone()),
        codex_backend_request(Method::PUT, shares, &foreign, r#"{"targets":[]}"#),
    )
    .await;
    assert_eq!(denied_share.status(), StatusCode::NOT_FOUND);
    let share_response = codex_backend(
        State(state.clone()),
        codex_backend_request(Method::PUT, shares, &owner, r#"{"targets":[]}"#),
    )
    .await;
    assert_eq!(share_response.status(), StatusCode::OK);

    let install = "/api/services/codex/backend-api/ps/plugins/catalog-plugin/install";
    let installed = codex_backend(
        State(state.clone()),
        codex_backend_request(Method::POST, install, &owner, "{}"),
    )
    .await;
    assert_eq!(installed.status(), StatusCode::OK);
    let uninstall = "/api/services/codex/backend-api/ps/plugins/catalog-plugin/uninstall";
    let denied_uninstall = codex_backend(
        State(state.clone()),
        codex_backend_request(Method::POST, uninstall, &foreign, ""),
    )
    .await;
    assert_eq!(denied_uninstall.status(), StatusCode::NOT_FOUND);
    let uninstalled = codex_backend(
        State(state.clone()),
        codex_backend_request(Method::POST, uninstall, &owner, ""),
    )
    .await;
    assert_eq!(uninstalled.status(), StatusCode::NO_CONTENT);

    let delete = "/api/services/codex/backend-api/public/plugins/workspace/plugin-private";
    let denied_delete = codex_backend(
        State(state.clone()),
        codex_backend_request(Method::DELETE, delete, &foreign, ""),
    )
    .await;
    assert_eq!(denied_delete.status(), StatusCode::NOT_FOUND);
    let deleted = codex_backend(
        State(state.clone()),
        codex_backend_request(Method::DELETE, delete, &owner, ""),
    )
    .await;
    assert_eq!(deleted.status(), StatusCode::NO_CONTENT);
    let removed = codex_backend(
        State(state),
        codex_backend_request(Method::PUT, shares, &owner, r#"{"targets":[]}"#),
    )
    .await;
    assert_eq!(removed.status(), StatusCode::NOT_FOUND);
    assert_eq!(calls.load(Ordering::SeqCst), 6);
    server.abort();
}
