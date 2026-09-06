#[tokio::test]
async fn native_lists_expose_only_resources_owned_by_the_router_principal() {
    let data = tempfile::tempdir().unwrap();
    let state = AppState::for_tests(data.path());
    let destination = AffinityDestination::Subscription {
        provider: SubscriptionProvider::Claude,
        account: "account-a".to_string(),
        upstream_account_id: Some("workspace-a".to_string()),
        base_url: "https://api.anthropic.test".to_string(),
    };
    let owner = ResponseOwner::new("claude", "owner-a");
    let foreign = ResponseOwner::new("claude", "owner-b");
    state
        .provider_store
        .response_affinities()
        .record(
            ResponseNamespace::AnthropicFiles,
            "file_owned",
            owner.clone(),
            destination.clone(),
        )
        .unwrap();
    state
        .provider_store
        .response_affinities()
        .record(
            ResponseNamespace::AnthropicFiles,
            "file_foreign",
            foreign,
            destination,
        )
        .unwrap();
    let mut response = Response::new(Body::from(
        serde_json::json!({
            "data": [
                {"id": "file_foreign", "filename": "private.txt"},
                {"id": "file_owned", "filename": "owned.txt", "future": true}
            ],
            "first_id": "file_foreign",
            "last_id": "file_owned",
            "has_more": true,
            "next_page": "opaque-cursor",
            "future_top_level": {"kept": true}
        })
        .to_string(),
    ));
    response
        .headers_mut()
        .insert("content-type", HeaderValue::from_static("application/json"));

    let filtered = filter_native_list_response(
        &state,
        &owner,
        &NativeListRequest {
            namespace: ResponseNamespace::AnthropicFiles,
            parent_id: None,
        },
        response,
    )
    .await;

    assert_eq!(filtered.status(), StatusCode::OK);
    let value: serde_json::Value =
        serde_json::from_slice(&filtered.into_body().collect().await.unwrap().to_bytes()).unwrap();
    assert_eq!(
        value,
        serde_json::json!({
            "data": [
                {"id": "file_owned", "filename": "owned.txt", "future": true}
            ],
            "first_id": "file_owned",
            "last_id": "file_owned",
            "has_more": true,
            "next_page": "opaque-cursor",
            "future_top_level": {"kept": true}
        })
    );
}

#[tokio::test]
async fn native_file_upload_requires_the_selected_claude_scope_before_upstream() {
    let calls = Arc::new(AtomicUsize::new(0));
    let upstream_calls = Arc::clone(&calls);
    let upstream = axum::Router::new().fallback(move || {
        let calls = Arc::clone(&upstream_calls);
        async move {
            calls.fetch_add(1, Ordering::Relaxed);
            axum::Json(serde_json::json!({"id": "should-not-exist"}))
        }
    });
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let origin = format!("http://{}", listener.local_addr().unwrap());
    let server = tokio::spawn(async move { axum::serve(listener, upstream).await.unwrap() });

    let data = tempfile::tempdir().unwrap();
    let claude_home = tempfile::tempdir().unwrap();
    std::fs::write(
            claude_home.path().join(".credentials.json"),
            r#"{"claudeAiOauth":{"accessToken":"inference-only","expiresAt":9999999999999,"scopes":["user:inference"]}}"#,
        )
        .unwrap();
    let reader = crate::subscription::SubscriptionReader::new(
        SubscriptionProvider::Claude,
        claude_home.path(),
    );
    let mut state = AppState::for_tests(data.path());
    state.upstream_provider = crate::config::UpstreamProvider::Anthropic;
    state.subscription_base_url = Some(origin);
    state.subscription_reader = Some(reader.clone());
    state.subscription_readers = vec![reader];
    let token =
        crate::model_routing::tests::bound_client_token(&state, ClientKind::ClaudeCode, None);
    let request = Request::builder()
        .method(Method::POST)
        .uri("/api/services/anthropic/v1/files")
        .header("authorization", format!("Bearer {token}"))
        .header("user-agent", "claude-code/test-fixture")
        .header("content-type", "multipart/form-data; boundary=opaque")
        .body(Body::from("--opaque--"))
        .unwrap();
    let response = anthropic(State(state), request).await;
    assert_eq!(response.status(), StatusCode::FORBIDDEN);
    assert_eq!(calls.load(Ordering::Relaxed), 0);
    server.abort();
}

#[tokio::test]
async fn multipart_requests_are_bounded_and_spooled_byte_exactly() {
    let chunks = futures_util::stream::iter([
        Ok::<_, std::convert::Infallible>(Bytes::from_static(b"--boundary\r\nzero:")),
        Ok(Bytes::from_static(b"\0\xff\r\n--boundary--\r\n")),
    ]);
    let body = Body::from_stream(chunks);
    let collected = collect_native_body(body, 64, true).await.unwrap();
    let NativeRequestBody::Spool { file, len } = collected else {
        panic!("multipart body was buffered in memory");
    };
    assert_eq!(len, 35);
    assert_eq!(
        std::fs::read(file.path()).unwrap(),
        b"--boundary\r\nzero:\0\xff\r\n--boundary--\r\n"
    );

    let too_large = collect_native_body(Body::from("12345"), 4, true).await;
    assert!(too_large.is_err());
}

#[test]
fn anthropic_batches_validate_every_nested_model_for_the_selected_account() {
    let data = tempfile::tempdir().unwrap();
    let state = AppState::for_tests(data.path());
    state.model_catalogs.record_success_for_account(
        SubscriptionProvider::Claude,
        crate::credential_recovery_store::PRIMARY_ACCOUNT,
        None,
        vec!["claude-a".to_string(), "claude-b".to_string()],
    );
    let destination = AffinityDestination::Subscription {
        provider: SubscriptionProvider::Claude,
        account: crate::credential_recovery_store::PRIMARY_ACCOUNT.to_string(),
        upstream_account_id: None,
        base_url: "https://example.invalid".to_string(),
    };
    let good = br#"{"requests":[{"params":{"model":"claude-a"}},{"params":{"model":"claude-b"}}]}"#;
    assert!(validate_anthropic_batch(&state, &destination, good).is_ok());
    for bad in [
        br#"{"requests":[{"params":{"model":"claude-a"}},{"params":{"model":"other"}}]}"#
            .as_slice(),
        br#"{"requests":[{"params":{}}]}"#.as_slice(),
        br#"{"requests":[]}"#.as_slice(),
        br"not-json".as_slice(),
    ] {
        assert!(validate_anthropic_batch(&state, &destination, bad).is_err());
    }
}

#[tokio::test]
async fn history_notes_authentication_precedes_body_handling() {
    let data = tempfile::tempdir().unwrap();
    let mut state = AppState::for_tests(data.path());
    state.max_proxy_request_bytes = 1;
    let request = Request::builder()
        .method(Method::POST)
        .uri("/api/services/codex/v1/alpha/notes/v2/read_file")
        .body(Body::from("private body larger than the limit"))
        .unwrap();
    let response = codex(State(state), request).await;
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn codex_control_plane_requires_one_account_in_a_multi_account_pool() {
    let calls = Arc::new(AtomicUsize::new(0));
    let upstream_calls = Arc::clone(&calls);
    let upstream = axum::Router::new().fallback(move || {
        let calls = Arc::clone(&upstream_calls);
        async move {
            calls.fetch_add(1, Ordering::Relaxed);
            axum::Json(serde_json::json!({"accepted": true}))
        }
    });
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let origin = format!("http://{}", listener.local_addr().unwrap());
    let server = tokio::spawn(async move { axum::serve(listener, upstream).await.unwrap() });

    let data = tempfile::tempdir().unwrap();
    let primary = tempfile::tempdir().unwrap();
    let additional = tempfile::tempdir().unwrap();
    for (home, access, account) in [
        (&primary, "codex-primary", "workspace-primary"),
        (&additional, "codex-additional", "workspace-additional"),
    ] {
        std::fs::write(
            home.path().join("auth.json"),
            serde_json::json!({
                "tokens": {"access_token": access, "account_id": account}
            })
            .to_string(),
        )
        .unwrap();
    }
    let primary_reader =
        crate::subscription::SubscriptionReader::new(SubscriptionProvider::Codex, primary.path());
    let mut state = AppState::for_tests(data.path());
    state.upstream_provider = crate::config::UpstreamProvider::Codex;
    state.subscription_base_url = Some(format!("{origin}/backend-api/codex"));
    state.subscription_reader = Some(primary_reader.clone());
    state.subscription_readers = vec![primary_reader];
    let account_router = crate::accounts::AccountRouter::new_for_provider(
        primary.path().to_path_buf(),
        &[additional.path().to_path_buf()],
        SubscriptionProvider::Codex,
        crate::accounts::AccountRouterOptions::default(),
    );
    account_router.register_credential_stores_in(&state.subscription_cache, data.path());
    state.account_router = Some(account_router);
    let token = state
        .token_manager
        .issue_with_id(&crate::token::IssueRequest {
            ttl_hours: 1,
            label: "unbound codex control plane",
            account: None,
            max_requests: None,
            max_tokens: None,
            rate_limit_per_minute: None,
            scope: "",
            github_repos: Vec::new(),
            sliding_window_seconds: None,
            client_kind: Some(ClientKind::Codex.canonical_name()),
            principal_id: Some("principal-a"),
        })
        .unwrap()
        .0;
    let alias = crate::token::codex_token_alias(&token).unwrap();
    let request = || {
        Request::builder()
            .method(Method::POST)
            .uri("/api/services/codex/backend-api/codex/analytics-events/events")
            .header("authorization", format!("Bearer {alias}"))
            .header("content-type", "application/json")
            .body(Body::from(r#"{"events":[]}"#))
            .unwrap()
    };
    let ambiguous = codex_backend(State(state.clone()), request()).await;
    assert_eq!(ambiguous.status(), StatusCode::CONFLICT);
    assert_eq!(calls.load(Ordering::Relaxed), 0);

    let whoami = Request::builder()
        .uri("/api/services/codex/v1/user-auth-credential/whoami")
        .header("authorization", format!("Bearer {alias}"))
        .body(Body::empty())
        .unwrap();
    let whoami = codex(State(state.clone()), whoami).await;
    assert_eq!(whoami.status(), StatusCode::OK);
    let whoami: serde_json::Value =
        serde_json::from_slice(&whoami.into_body().collect().await.unwrap().to_bytes()).unwrap();
    let account = whoami["chatgpt_account_id"].as_str().unwrap();
    let mut pinned = request();
    pinned
        .headers_mut()
        .insert("chatgpt-account-id", account.parse().unwrap());
    assert_eq!(
        codex_backend(State(state), pinned).await.status(),
        StatusCode::OK
    );
    assert_eq!(calls.load(Ordering::Relaxed), 1);
    server.abort();
}

#[tokio::test]
async fn ambiguous_note_mutation_is_returned_once_and_never_replayed() {
    let calls = Arc::new(AtomicUsize::new(0));
    let upstream_calls = Arc::clone(&calls);
    let upstream = axum::Router::new().fallback(move || {
        let calls = Arc::clone(&upstream_calls);
        async move {
            calls.fetch_add(1, Ordering::Relaxed);
            (
                StatusCode::SERVICE_UNAVAILABLE,
                [
                    ("content-type", "application/json"),
                    ("x-request-id", "req-ambiguous"),
                ],
                r#"{ "error" : { "private" : "ambiguous" } }"#,
            )
        }
    });
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let origin = format!("http://{}", listener.local_addr().unwrap());
    let server = tokio::spawn(async move { axum::serve(listener, upstream).await.unwrap() });

    let data = tempfile::tempdir().unwrap();
    let codex_home = tempfile::tempdir().unwrap();
    std::fs::write(
        codex_home.path().join("auth.json"),
        r#"{"tokens":{"access_token":"upstream","account_id":"account"}}"#,
    )
    .unwrap();
    let reader = crate::subscription::SubscriptionReader::new(
        SubscriptionProvider::Codex,
        codex_home.path(),
    );
    let mut state = AppState::for_tests(data.path());
    state.upstream_provider = crate::config::UpstreamProvider::Codex;
    state.subscription_base_url = Some(origin);
    state.subscription_reader = Some(reader.clone());
    state.subscription_readers = vec![reader];
    let token = crate::model_routing::tests::bound_client_token(&state, ClientKind::Codex, None);
    let request = Request::builder()
        .method(Method::POST)
        .uri("/api/services/codex/v1/alpha/notes/v2/append_to_file")
        .header("authorization", format!("Bearer {token}"))
        .body(Body::from(r#"{"path":"private","text":"private"}"#))
        .unwrap();
    let response = codex(State(state), request).await;
    assert_eq!(response.status(), StatusCode::SERVICE_UNAVAILABLE);
    assert_eq!(response.headers()["x-request-id"], "req-ambiguous");
    assert_eq!(
        response.into_body().collect().await.unwrap().to_bytes(),
        r#"{ "error" : { "private" : "ambiguous" } }"#
    );
    assert_eq!(calls.load(Ordering::Relaxed), 1);
    server.abort();
}

#[tokio::test]
async fn websocket_upstream_handshake_failure_is_returned_before_downstream_upgrade() {
    use axum::routing::get;
    use tokio_tungstenite::tungstenite::client::IntoClientRequest as _;

    let upstream = axum::Router::new().route(
        "/realtime",
        get(|| async {
            (
                StatusCode::TOO_MANY_REQUESTS,
                [
                    ("content-type", "application/problem+json"),
                    ("retry-after", "17"),
                    ("x-request-id", "realtime-handshake-request"),
                ],
                r#"{"error":"native handshake rejected"}"#,
            )
        }),
    );
    let upstream_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let upstream_url = format!(
        "http://{}/realtime",
        upstream_listener.local_addr().unwrap()
    );
    let upstream_server =
        tokio::spawn(async move { axum::serve(upstream_listener, upstream).await.unwrap() });

    let data = tempfile::tempdir().unwrap();
    let state = AppState::for_tests(data.path());
    let router_state = state.clone();
    let router = axum::Router::new().route(
        "/realtime",
        get(move |request: Request| {
            let state = router_state.clone();
            let url = upstream_url.clone();
            async move {
                upgrade_websocket(
                    state.clone(),
                    request,
                    Target {
                        client: state.client.clone(),
                        url,
                        headers: HeaderMap::new(),
                    },
                    None,
                )
                .await
            }
        }),
    );
    let router_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let router_address = router_listener.local_addr().unwrap();
    let router_server =
        tokio::spawn(async move { axum::serve(router_listener, router).await.unwrap() });

    let request = format!("ws://{router_address}/realtime")
        .into_client_request()
        .unwrap();
    let failure = tokio_tungstenite::connect_async(request)
        .await
        .expect_err("the upstream HTTP rejection must precede the downstream upgrade");
    let tungstenite::Error::Http(response) = failure else {
        panic!("expected the native upstream HTTP response, got {failure}");
    };
    assert_eq!(response.status(), StatusCode::TOO_MANY_REQUESTS);
    assert_eq!(response.headers()["retry-after"], "17");
    assert_eq!(
        response.headers()["x-request-id"],
        "realtime-handshake-request"
    );
    assert_eq!(
        response.body().as_deref(),
        Some(br#"{"error":"native handshake rejected"}"#.as_slice())
    );
    router_server.abort();
    upstream_server.abort();
}

#[tokio::test]
async fn native_websocket_relay_preserves_subprotocol_frames_and_fresh_handshake() {
    use axum::extract::WebSocketUpgrade;
    use axum::routing::get;
    use tokio_tungstenite::tungstenite::client::IntoClientRequest as _;

    let captured = Arc::new(Mutex::new(None::<HeaderMap>));
    let upstream_capture = Arc::clone(&captured);
    let upstream = axum::Router::new().route(
        "/realtime",
        get(move |headers: HeaderMap, upgrade: WebSocketUpgrade| {
            *upstream_capture.lock().unwrap() = Some(headers);
            async move {
                upgrade
                    .protocols(["realtime"])
                    .on_upgrade(|mut socket| async move {
                        while let Some(Ok(message)) = socket.recv().await {
                            let closes = matches!(message, Message::Close(_));
                            if socket.send(message).await.is_err() || closes {
                                break;
                            }
                        }
                    })
            }
        }),
    );
    let upstream_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let upstream_url = format!(
        "http://{}/realtime",
        upstream_listener.local_addr().unwrap()
    );
    let upstream_server =
        tokio::spawn(async move { axum::serve(upstream_listener, upstream).await.unwrap() });

    let data = tempfile::tempdir().unwrap();
    let state = AppState::for_tests(data.path());
    let router_state = state.clone();
    let router = axum::Router::new().route(
        "/realtime",
        get(move |request: Request| {
            let state = router_state.clone();
            let url = upstream_url.clone();
            async move {
                let headers = crate::proxy::native_request_headers(
                    request.headers(),
                    "upstream-websocket-secret",
                );
                upgrade_websocket(
                    state.clone(),
                    request,
                    Target {
                        client: state.client.clone(),
                        url,
                        headers,
                    },
                    None,
                )
                .await
            }
        }),
    );
    let router_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let router_address = router_listener.local_addr().unwrap();
    let router_server =
        tokio::spawn(async move { axum::serve(router_listener, router).await.unwrap() });

    let mut request = format!("ws://{router_address}/realtime")
        .into_client_request()
        .unwrap();
    request
        .headers_mut()
        .insert("sec-websocket-protocol", "realtime".parse().unwrap());
    let (mut socket, response) = tokio_tungstenite::connect_async(request).await.unwrap();
    assert_eq!(response.headers()["sec-websocket-protocol"], "realtime");
    for message in [
        tungstenite::Message::Text("realtime text".into()),
        tungstenite::Message::Binary(vec![0, 1, 2, 255].into()),
    ] {
        socket.send(message.clone()).await.unwrap();
        assert_eq!(socket.next().await.unwrap().unwrap(), message);
    }
    socket
        .send(tungstenite::Message::Ping(vec![7, 8].into()))
        .await
        .unwrap();
    assert_eq!(
        socket.next().await.unwrap().unwrap(),
        tungstenite::Message::Pong(vec![7, 8].into())
    );
    socket.close(None).await.unwrap();

    let headers = captured.lock().unwrap().take().unwrap();
    assert_eq!(headers["authorization"], "Bearer upstream-websocket-secret");
    assert_eq!(headers["sec-websocket-protocol"], "realtime");
    assert_eq!(headers.get_all("sec-websocket-key").iter().count(), 1);
    assert_eq!(headers.get_all("sec-websocket-version").iter().count(), 1);
    router_server.abort();
    upstream_server.abort();
}

#[test]
fn realtime_usage_counts_each_completed_response_once() {
    let data = tempfile::tempdir().unwrap();
    let state = AppState::for_tests(data.path());
    let token = state
        .token_manager
        .issue_token(1, "realtime usage")
        .unwrap();
    let token_id = state.token_manager.validate_token(&token).unwrap().sub;
    let mut completed = std::collections::HashSet::new();
    let first = br#"{"type":"response.done","response":{"id":"resp_1","usage":{"input_tokens":4,"output_tokens":3,"input_token_details":{"audio_tokens":2},"output_token_details":{"audio_tokens":1}}}}"#;
    let second = br#"{"type":"response.done","response":{"id":"resp_2","usage":{"total_tokens":5,"input_tokens":3,"output_tokens":2}}}"#;

    assert!(!record_realtime_usage(
        &state.token_manager,
        &token_id,
        &mut completed,
        first
    ));
    assert!(!record_realtime_usage(
        &state.token_manager,
        &token_id,
        &mut completed,
        first
    ));
    assert!(!record_realtime_usage(
        &state.token_manager,
        &token_id,
        &mut completed,
        second
    ));

    assert_eq!(
        state
            .token_manager
            .store()
            .get(&token_id)
            .unwrap()
            .unwrap()
            .used_tokens,
        12
    );
}

#[tokio::test]
async fn native_http_usage_is_settled_without_rewriting_the_response() {
    let upstream_body =
        br#"{"id":"image_1","usage":{"input_tokens":6,"output_tokens":3,"total_tokens":9}}"#;
    let upstream = axum::Router::new().fallback(|| async {
        (
            StatusCode::OK,
            [
                ("content-type", "application/json; charset=utf-8"),
                ("x-request-id", "native-usage-request"),
            ],
            Body::from(upstream_body.as_slice()),
        )
    });
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let url = format!(
        "http://{}/images/generations",
        listener.local_addr().unwrap()
    );
    let server = tokio::spawn(async move { axum::serve(listener, upstream).await.unwrap() });

    let data = tempfile::tempdir().unwrap();
    let state = AppState::for_tests(data.path());
    let token = state.token_manager.issue_token(1, "native usage").unwrap();
    let token_id = state.token_manager.validate_token(&token).unwrap().sub;
    let response = relay_native_http(
        &state,
        &Method::POST,
        NativeRequestBody::Memory(Bytes::from_static(br#"{"prompt":"image"}"#)),
        Target {
            client: state.client.clone(),
            url,
            headers: HeaderMap::new(),
        },
        Some(&token_id),
    )
    .await;
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(response.headers()["x-request-id"], "native-usage-request");
    assert_eq!(
        response.into_body().collect().await.unwrap().to_bytes(),
        upstream_body.as_slice()
    );
    assert_eq!(
        state
            .token_manager
            .store()
            .get(&token_id)
            .unwrap()
            .unwrap()
            .used_tokens,
        9
    );
    assert!(!tracks_native_usage(
        Service::OpenAi,
        "/api/services/openai/v1/responses/input_tokens"
    ));
    assert!(tracks_native_usage(
        Service::OpenAi,
        "/api/services/openai/v1/images/generations"
    ));
    server.abort();
}

#[test]
fn codex_whoami_metadata_and_account_handle_follow_the_selected_workspace() {
    use base64::Engine as _;

    let payload = base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(
            br#"{"https://api.openai.com/auth":{"chatgpt_plan_type":"business","chatgpt_account_is_fedramp":true}}"#,
        );
    let id_token = format!("header.{payload}.signature");
    let home = tempfile::tempdir().unwrap();
    std::fs::write(
            home.path().join("auth.json"),
            format!(
                r#"{{"tokens":{{"id_token":"{id_token}","access_token":"opaque-access","account_id":"workspace-a"}}}}"#
            ),
        )
        .unwrap();
    let reader =
        crate::subscription::SubscriptionReader::new(SubscriptionProvider::Codex, home.path());
    let data = tempfile::tempdir().unwrap();
    let mut state = AppState::for_tests(data.path());
    state.subscription_reader = Some(reader.clone());
    state.subscription_readers = vec![reader.clone()];
    let token = reader.read_token().unwrap();

    assert_eq!(
        codex_identity_metadata(
            &state,
            crate::credential_recovery_store::PRIMARY_ACCOUNT,
            &token
        ),
        ("business".to_string(), true)
    );
    assert_ne!(
        codex_account_handle("principal", "primary", Some("workspace-a")),
        codex_account_handle("principal", "primary", Some("workspace-b"))
    );
}
