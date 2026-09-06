#[path = "native_service/tests/native_service_private_tests.rs"]
mod private_logging;

#[test]
fn every_history_notes_path_has_one_redacted_operation_name() {
    let paths = [
        ("history/v2/list_windows", "codex.history.list_windows"),
        ("history/v2/list_items", "codex.history.list_items"),
        ("history/v2/read_item", "codex.history.read_item"),
        (
            "history/v2/search_contents",
            "codex.history.search_contents",
        ),
        ("notes/v2/thread_hint", "codex.notes.thread_hint"),
        (
            "notes/v2/list_files_by_prefix",
            "codex.notes.list_files_by_prefix",
        ),
        ("notes/v2/read_file", "codex.notes.read_file"),
        ("notes/v2/search_contents", "codex.notes.search_contents"),
        ("notes/v2/append_to_file", "codex.notes.append_to_file"),
        ("notes/v2/write_file", "codex.notes.write_file"),
    ];
    for (suffix, operation) in paths {
        assert_eq!(
            codex_history_notes_operation(&format!("/api/services/codex/v1/alpha/{suffix}")),
            Some(operation)
        );
    }
    assert_eq!(
        codex_history_notes_operation("/api/services/codex/v1/responses"),
        None
    );
}

#[test]
fn native_resource_routes_have_exact_create_and_lifecycle_contracts() {
    let cases = [
        (
            Method::POST,
            "/api/services/openai/v1/realtime/calls",
            ResponseNamespace::OpenAiRealtimeCalls,
            NativeResourceAction::Create,
            None,
        ),
        (
            Method::POST,
            "/api/services/openai/v1/realtime/calls/call_1/accept",
            ResponseNamespace::OpenAiRealtimeCalls,
            NativeResourceAction::Use,
            Some("call_1"),
        ),
        (
            Method::POST,
            "/api/services/anthropic/v1/files",
            ResponseNamespace::AnthropicFiles,
            NativeResourceAction::Create,
            None,
        ),
        (
            Method::GET,
            "/api/services/anthropic/v1/files/file_1/content",
            ResponseNamespace::AnthropicFiles,
            NativeResourceAction::Use,
            Some("file_1"),
        ),
        (
            Method::DELETE,
            "/api/services/anthropic/v1/files/file_1",
            ResponseNamespace::AnthropicFiles,
            NativeResourceAction::Delete,
            Some("file_1"),
        ),
        (
            Method::POST,
            "/api/services/anthropic/v1/messages/batches",
            ResponseNamespace::AnthropicBatches,
            NativeResourceAction::Create,
            None,
        ),
        (
            Method::POST,
            "/api/services/anthropic/v1/messages/batches/batch_1/cancel",
            ResponseNamespace::AnthropicBatches,
            NativeResourceAction::Use,
            Some("batch_1"),
        ),
        (
            Method::POST,
            "/api/services/anthropic/v1/skills/skill_1/versions",
            ResponseNamespace::AnthropicSkillVersions,
            NativeResourceAction::Create,
            Some("skill_1"),
        ),
        (
            Method::DELETE,
            "/api/services/anthropic/v1/skills/skill_1",
            ResponseNamespace::AnthropicSkills,
            NativeResourceAction::Delete,
            Some("skill_1"),
        ),
        (
            Method::DELETE,
            "/api/services/anthropic/v1/skills/skill_1/versions/7",
            ResponseNamespace::AnthropicSkillVersions,
            NativeResourceAction::Delete,
            Some("7"),
        ),
        (
            Method::GET,
            "/api/services/anthropic/v1/skills/skill_1/versions/7/content",
            ResponseNamespace::AnthropicSkillVersions,
            NativeResourceAction::Use,
            Some("7"),
        ),
        (
            Method::POST,
            "/api/services/codex/backend-api/files",
            ResponseNamespace::CodexFiles,
            NativeResourceAction::Create,
            None,
        ),
        (
            Method::POST,
            "/api/services/codex/backend-api/files/file_1/uploaded",
            ResponseNamespace::CodexFiles,
            NativeResourceAction::Use,
            Some("file_1"),
        ),
    ];
    for (method, path, namespace, action, id) in cases {
        let request = native_resource_request(&method, path)
            .unwrap_or_else(|| panic!("missing native resource contract for {method} {path}"));
        assert_eq!(request.namespace, namespace, "{method} {path}");
        assert_eq!(request.action, action, "{method} {path}");
        assert_eq!(request.id.as_deref(), id, "{method} {path}");
    }

    for (method, path) in [
        (Method::GET, "/api/services/anthropic/v1/files"),
        (Method::GET, "/api/services/anthropic/v1/messages/batches"),
        (Method::GET, "/api/services/anthropic/v1/skills"),
        (Method::POST, "/api/services/openai/v1/images/generations"),
    ] {
        assert!(
            native_resource_request(&method, path).is_none(),
            "{method} {path}"
        );
    }
}

#[test]
fn responses_helpers_pin_native_compaction_to_existing_state() {
    assert_eq!(
        created_response_namespace(Service::OpenAi, "/api/services/openai/v1/responses/compact"),
        Some(ResponseNamespace::OpenAiResponses)
    );
    assert_eq!(
        created_response_namespace(Service::Codex, "/api/services/codex/v1/responses/compact"),
        Some(ResponseNamespace::CodexResponses)
    );
    assert_eq!(
        response_references(
            Service::OpenAi,
            "/api/services/openai/v1/responses/compact",
            br#"{"previous_response_id":"resp_1"}"#,
        ),
        vec![(ResponseNamespace::OpenAiResponses, "resp_1".to_string())]
    );
    assert_eq!(
        response_references(
            Service::Codex,
            "/api/services/codex/v1/responses/compact",
            br#"{"previous_response_id":"resp_2"}"#,
        ),
        vec![(ResponseNamespace::CodexResponses, "resp_2".to_string())]
    );
    assert_eq!(
        response_references(
            Service::OpenAi,
            "/api/services/openai/v1/images/generations",
            br#"{"previous_response_id":"resp_3"}"#,
        ),
        vec![]
    );
    assert_eq!(
        response_references(
            Service::OpenAi,
            "/api/services/openai/v1/responses/input_tokens",
            br#"{"previous_response_id":"resp_4","conversation":{"id":"conv_1"}}"#,
        ),
        vec![
            (ResponseNamespace::OpenAiResponses, "resp_4".to_string()),
            (ResponseNamespace::OpenAiConversations, "conv_1".to_string()),
        ]
    );
    assert_eq!(
        response_references(
            Service::OpenAi,
            "/api/services/openai/v1/responses/input_tokens",
            br#"{"conversation":"conv_2"}"#,
        ),
        vec![(ResponseNamespace::OpenAiConversations, "conv_2".to_string())]
    );
}

#[test]
fn native_json_operations_reject_malformed_or_non_object_bodies_locally() {
    for (service, path) in [
        (Service::OpenAi, "/api/services/openai/v1/responses/compact"),
        (
            Service::OpenAi,
            "/api/services/openai/v1/responses/input_tokens",
        ),
        (
            Service::OpenAi,
            "/api/services/openai/v1/images/generations",
        ),
        (Service::OpenAi, "/api/services/openai/v1/audio/speech"),
        (Service::Codex, "/api/services/codex/v1/responses/compact"),
        (Service::Codex, "/api/services/codex/v1/images/generations"),
        (Service::Codex, "/api/services/codex/v1/images/edits"),
        (Service::Codex, "/api/services/codex/v1/alpha/search"),
    ] {
        assert!(requires_json_object(service, &Method::POST, path), "{path}");
    }
    assert!(!requires_json_object(
        Service::OpenAi,
        &Method::POST,
        "/api/services/openai/v1/images/edits"
    ));
    assert!(!requires_json_object(
        Service::OpenAi,
        &Method::POST,
        "/api/services/openai/v1/realtime/calls"
    ));
    for body in [br"[]".as_slice(), br"null", br"not-json"] {
        assert!(
            !serde_json::from_slice::<serde_json::Value>(body).is_ok_and(|value| value.is_object())
        );
    }
}

#[test]
fn realtime_sideband_routes_extract_only_their_opaque_call_id() {
    assert_eq!(
        realtime_sideband(
            Service::OpenAi,
            "/api/services/openai/v1/realtime",
            Some("model=future&call_id=call%2Done&extra=1"),
        )
        .unwrap(),
        Some((
            ResponseNamespace::OpenAiRealtimeCalls,
            "call-one".to_string()
        ))
    );
    assert_eq!(
        realtime_sideband(Service::Codex, "/api/services/codex/v1/live/call_2", None,).unwrap(),
        Some((ResponseNamespace::CodexRealtimeCalls, "call_2".to_string()))
    );
    assert_eq!(
        realtime_sideband(
            Service::Codex,
            "/api/services/codex/v1/realtime",
            Some("model=gpt-future"),
        )
        .unwrap(),
        None
    );
    assert!(
        realtime_sideband(
            Service::Codex,
            "/api/services/codex/v1/realtime",
            Some("call_id=one&call_id=two"),
        )
        .is_err()
    );
}

#[tokio::test]
async fn codex_realtime_multipart_becomes_the_exact_backend_json_envelope() {
    let multipart = concat!(
        "--codex-boundary\r\n",
        "Content-Disposition: form-data; name=\"sdp\"\r\n",
        "Content-Type: application/sdp\r\n\r\n",
        "v=0\r\na=opaque:future\r\n",
        "\r\n--codex-boundary\r\n",
        "Content-Disposition: form-data; name=\"session\"\r\n",
        "Content-Type: application/json\r\n\r\n",
        r#"{"type":"realtime","future":{"nested":[1,true,"kept"]}}"#,
        "\r\n--codex-boundary--\r\n",
    );
    let mut headers = HeaderMap::new();
    headers.insert(
        "content-type",
        HeaderValue::from_static("multipart/form-data; boundary=codex-boundary"),
    );
    let body = collect_native_body(Body::from(multipart), 4096, true)
        .await
        .unwrap();

    let translated = translate_codex_realtime_call(&mut headers, body)
        .await
        .unwrap();

    assert_eq!(headers.get("content-type").unwrap(), "application/json");
    let NativeRequestBody::Memory(bytes) = translated else {
        panic!("translated backend JSON must be held in memory");
    };
    assert_eq!(
        serde_json::from_slice::<serde_json::Value>(&bytes).unwrap(),
        serde_json::json!({
            "sdp": "v=0\r\na=opaque:future\r\n",
            "session": {
                "type": "realtime",
                "future": {"nested": [1, true, "kept"]}
            }
        })
    );
}

#[test]
fn codex_live_call_maps_to_backend_create_without_reencoding_existing_query() {
    let uri: axum::http::Uri = "/api/services/codex/v1/live?future=one&future=two%2Bthree"
        .parse()
        .unwrap();
    assert_eq!(
        codex_subscription_path(&uri),
        "/v1/realtime/calls?future=one&future=two%2Bthree&intent=quicksilver&architecture=avas"
    );

    let legacy: axum::http::Uri =
        "/api/services/codex/v1/realtime/calls?intent=quicksilver&architecture=avas"
            .parse()
            .unwrap();
    assert_eq!(
        codex_subscription_path(&legacy),
        "/v1/realtime/calls?intent=quicksilver&architecture=avas"
    );
}

#[test]
fn realtime_call_location_is_rewritten_to_the_corresponding_router_path() {
    for (service, request_path, expected) in [
        (
            Service::OpenAi,
            "/api/services/openai/v1/realtime/calls",
            "/api/services/openai/v1/realtime/calls/rtc_openai?trace=one",
        ),
        (
            Service::Codex,
            "/api/services/codex/v1/realtime/calls",
            "/api/services/codex/v1/realtime/calls/rtc_codex?trace=two",
        ),
        (
            Service::Codex,
            "/api/services/codex/v1/live",
            "/api/services/codex/v1/live/rtc_live?trace=three",
        ),
    ] {
        let id = expected
            .split('?')
            .next()
            .unwrap()
            .rsplit('/')
            .next()
            .unwrap();
        let query = expected.split_once('?').unwrap().1;
        let mut response = Response::new(Body::from("v=answer\r\n"));
        response.headers_mut().insert(
            "location",
            HeaderValue::from_str(&format!(
                "https://upstream.example/v1/realtime/calls/calls/{id}?{query}"
            ))
            .unwrap(),
        );

        rewrite_realtime_location(service, request_path, &mut response).unwrap();

        assert_eq!(
            response.headers().get("location").unwrap(),
            expected,
            "{request_path}"
        );
    }
}

#[tokio::test]
async fn codex_live_call_is_translated_pinned_and_rewritten_end_to_end() {
    let seen = Arc::new(Mutex::new(None));
    let upstream_seen = Arc::clone(&seen);
    let upstream = axum::Router::new().fallback(
            move |method: Method,
                  uri: axum::http::Uri,
                  headers: HeaderMap,
                  body: Bytes| {
                let seen = Arc::clone(&upstream_seen);
                async move {
                    *seen.lock().unwrap() = Some((method, uri, headers, body));
                    (
                        StatusCode::CREATED,
                        [
                            ("content-type", "application/sdp"),
                            (
                                "location",
                                "https://chatgpt.example/backend-api/codex/realtime/calls/calls/rtc_e2e?opaque=kept",
                            ),
                        ],
                        "v=answer\r\n",
                    )
                }
            },
        );
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let origin = format!("http://{}", listener.local_addr().unwrap());
    let server = tokio::spawn(async move { axum::serve(listener, upstream).await.unwrap() });

    let data = tempfile::tempdir().unwrap();
    let codex_home = tempfile::tempdir().unwrap();
    std::fs::write(
        codex_home.path().join("auth.json"),
        serde_json::json!({
            "tokens": {
                "access_token": "codex-realtime-upstream",
                "account_id": "account-realtime"
            }
        })
        .to_string(),
    )
    .unwrap();
    let reader = crate::subscription::SubscriptionReader::new(
        SubscriptionProvider::Codex,
        codex_home.path(),
    );
    let mut state = AppState::for_tests(data.path());
    state.upstream_provider = crate::config::UpstreamProvider::Codex;
    state.subscription_base_url = Some(format!("{origin}/backend-api/codex"));
    state.subscription_reader = Some(reader.clone());
    state.subscription_readers = vec![reader];
    let token = crate::model_routing::tests::bound_client_token(&state, ClientKind::Codex, None);
    let multipart = concat!(
        "--codex-boundary\r\n",
        "Content-Disposition: form-data; name=\"sdp\"\r\n",
        "Content-Type: application/sdp\r\n\r\n",
        "v=offer\r\n",
        "\r\n--codex-boundary\r\n",
        "Content-Disposition: form-data; name=\"session\"\r\n",
        "Content-Type: application/json\r\n\r\n",
        r#"{"type":"realtime","future":{"preserved":true}}"#,
        "\r\n--codex-boundary--\r\n",
    );
    let request = Request::builder()
        .method(Method::POST)
        .uri("/api/services/codex/v1/live?future=one&future=two%2Bthree")
        .header("authorization", format!("Bearer {token}"))
        .header("user-agent", "codex-cli/exact-fixture")
        .header("originator", "codex_cli_rs")
        .header("x-session-id", "session-opaque")
        .header(
            "content-type",
            "multipart/form-data; boundary=codex-boundary",
        )
        .body(Body::from(multipart))
        .unwrap();

    let response = codex(State(state), request).await;

    assert_eq!(response.status(), StatusCode::CREATED);
    assert_eq!(
        response.headers().get("content-type").unwrap(),
        "application/sdp"
    );
    assert_eq!(
        response.headers().get("location").unwrap(),
        "/api/services/codex/v1/live/rtc_e2e?opaque=kept"
    );
    assert_eq!(
        response.into_body().collect().await.unwrap().to_bytes(),
        "v=answer\r\n"
    );
    let (method, uri, headers, body) = seen.lock().unwrap().take().unwrap();
    assert_eq!(method, Method::POST);
    assert_eq!(
        uri.to_string(),
        "/backend-api/codex/realtime/calls?future=one&future=two%2Bthree&intent=quicksilver&architecture=avas"
    );
    assert_eq!(
        headers.get("authorization").unwrap(),
        "Bearer codex-realtime-upstream"
    );
    assert_eq!(
        headers.get("chatgpt-account-id").unwrap(),
        "account-realtime"
    );
    assert_eq!(
        headers.get("user-agent").unwrap(),
        "codex-cli/exact-fixture"
    );
    assert_eq!(headers.get("originator").unwrap(), "codex_cli_rs");
    assert_eq!(headers.get("x-session-id").unwrap(), "session-opaque");
    assert!(headers.get("x-link-assistant-client").is_none());
    assert_eq!(
        serde_json::from_slice::<serde_json::Value>(&body).unwrap(),
        serde_json::json!({
            "sdp": "v=offer\r\n",
            "session": {"type": "realtime", "future": {"preserved": true}}
        })
    );
    server.abort();
}

#[tokio::test]
async fn native_file_lifecycle_is_principal_scoped_and_account_pinned() {
    let seen = Arc::new(Mutex::new(Vec::<String>::new()));
    let upstream_seen = Arc::clone(&seen);
    let upstream = axum::Router::new().fallback(
        move |method: Method, uri: axum::http::Uri, headers: HeaderMap| {
            let seen = Arc::clone(&upstream_seen);
            async move {
                seen.lock().unwrap().push(
                    headers
                        .get("authorization")
                        .and_then(|value| value.to_str().ok())
                        .unwrap_or_default()
                        .to_string(),
                );
                match (method, uri.path()) {
                    (Method::POST, "/v1/files") => (
                        StatusCode::OK,
                        [("content-type", "application/json")],
                        r#"{"id":"file_native_1","future":"opaque"}"#,
                    ),
                    (Method::GET, "/v1/files/file_native_1") => (
                        StatusCode::OK,
                        [("content-type", "application/json")],
                        r#"{"id":"file_native_1","future":"still-opaque"}"#,
                    ),
                    _ => (
                        StatusCode::NOT_FOUND,
                        [("content-type", "application/json")],
                        r#"{"error":"unexpected"}"#,
                    ),
                }
            }
        },
    );
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let origin = format!("http://{}", listener.local_addr().unwrap());
    let server = tokio::spawn(async move { axum::serve(listener, upstream).await.unwrap() });

    let data = tempfile::tempdir().unwrap();
    let primary = tempfile::tempdir().unwrap();
    let additional = tempfile::tempdir().unwrap();
    for (home, access) in [
        (&primary, "primary-upstream"),
        (&additional, "other-upstream"),
    ] {
        std::fs::write(
            home.path().join(".credentials.json"),
            serde_json::json!({
                "claudeAiOauth": {
                    "accessToken": access,
                    "expiresAt": 9_999_999_999_999_i64,
                    "scopes": ["user:file_upload"]
                }
            })
            .to_string(),
        )
        .unwrap();
    }
    let primary_reader =
        crate::subscription::SubscriptionReader::new(SubscriptionProvider::Claude, primary.path());
    let mut state = AppState::for_tests(data.path());
    state.upstream_provider = crate::config::UpstreamProvider::Anthropic;
    state.subscription_base_url = Some(origin);
    state.subscription_reader = Some(primary_reader.clone());
    state.subscription_readers = vec![primary_reader];
    let account_router = crate::accounts::AccountRouter::new_for_provider(
        primary.path().to_path_buf(),
        &[additional.path().to_path_buf()],
        SubscriptionProvider::Claude,
        crate::accounts::AccountRouterOptions::default(),
    );
    account_router.register_credential_stores_in(&state.subscription_cache, data.path());
    state.account_router = Some(account_router);

    let token_for = |principal: &str| {
        state
            .token_manager
            .issue_with_id(&crate::token::IssueRequest {
                ttl_hours: 1,
                label: "native file fixture",
                account: None,
                max_requests: None,
                max_tokens: None,
                rate_limit_per_minute: None,
                scope: "",
                github_repos: Vec::new(),
                sliding_window_seconds: None,
                client_kind: Some(ClientKind::ClaudeCode.canonical_name()),
                principal_id: Some(principal),
            })
            .unwrap()
            .0
    };
    let owner_token = token_for("owner-a");
    let foreign_token = token_for("owner-b");

    let create = Request::builder()
        .method(Method::POST)
        .uri("/api/services/anthropic/v1/files")
        .header("authorization", format!("Bearer {owner_token}"))
        .header("user-agent", "claude-code/test-fixture")
        .header("content-type", "multipart/form-data; boundary=opaque")
        .body(Body::from("--opaque--"))
        .unwrap();
    let create = anthropic(State(state.clone()), create).await;
    assert_eq!(create.status(), StatusCode::OK);
    assert_eq!(
        create.into_body().collect().await.unwrap().to_bytes(),
        r#"{"id":"file_native_1","future":"opaque"}"#
    );

    let get = Request::builder()
        .method(Method::GET)
        .uri("/api/services/anthropic/v1/files/file_native_1")
        .header("authorization", format!("Bearer {owner_token}"))
        .header("user-agent", "claude-code/test-fixture")
        .body(Body::empty())
        .unwrap();
    let get = anthropic(State(state.clone()), get).await;
    assert_eq!(get.status(), StatusCode::OK);
    assert_eq!(
        get.into_body().collect().await.unwrap().to_bytes(),
        r#"{"id":"file_native_1","future":"still-opaque"}"#
    );

    let foreign = Request::builder()
        .method(Method::GET)
        .uri("/api/services/anthropic/v1/files/file_native_1")
        .header("authorization", format!("Bearer {foreign_token}"))
        .header("user-agent", "claude-code/test-fixture")
        .body(Body::empty())
        .unwrap();
    let foreign = anthropic(State(state), foreign).await;
    assert_eq!(foreign.status(), StatusCode::NOT_FOUND);
    assert_eq!(
        seen.lock().unwrap().as_slice(),
        ["Bearer primary-upstream", "Bearer primary-upstream"]
    );
    server.abort();
}
