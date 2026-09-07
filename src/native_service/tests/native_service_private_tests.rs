//! Full-stack privacy fixture for native Codex history and notes.

use super::*;

#[tokio::test]
async fn history_notes_relay_is_byte_transparent_private_and_account_bound() {
    use axum::middleware::from_fn_with_state;
    use lino_arguments::Parser as _;
    use tower::ServiceExt as _;

    type Capture = (String, HeaderMap, Bytes);
    let captured = Arc::new(Mutex::new(Vec::<Capture>::new()));
    let server_capture = Arc::clone(&captured);
    let response_bytes = Bytes::from_static(
            br#"{ "encrypted_output" : "opaque-output", "images" : [{"id":"image-private"}], "future" : {"kept":true} }"#,
        );
    let upstream_response = response_bytes.clone();
    let upstream = axum::Router::new().fallback(move |request: Request| {
        let captured = Arc::clone(&server_capture);
        let response = upstream_response.clone();
        async move {
            let uri = request.uri().to_string();
            let headers = request.headers().clone();
            let body = request.into_body().collect().await.unwrap().to_bytes();
            captured.lock().unwrap().push((uri, headers, body));
            let mut returned = Response::new(Body::from(response));
            returned
                .headers_mut()
                .insert("content-type", HeaderValue::from_static("application/json"));
            returned
                .headers_mut()
                .insert("x-request-id", HeaderValue::from_static("req-public"));
            returned.headers_mut().insert(
                "x-ratelimit-remaining-requests",
                HeaderValue::from_static("19"),
            );
            returned
        }
    });
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let origin = format!("http://{}", listener.local_addr().unwrap());
    let server = tokio::spawn(async move { axum::serve(listener, upstream).await.unwrap() });

    let data = tempfile::tempdir().unwrap();
    let codex_home = tempfile::tempdir().unwrap();
    std::fs::write(
        codex_home.path().join("auth.json"),
        r#"{"tokens":{"access_token":"upstream-secret","account_id":"upstream-account"}}"#,
    )
    .unwrap();
    let reader = crate::subscription::SubscriptionReader::new(
        SubscriptionProvider::Codex,
        codex_home.path(),
    );
    let audit_path = data.path().join("audit.jsonl");
    let mut state = AppState::for_tests(data.path());
    state.upstream_provider = crate::config::UpstreamProvider::Codex;
    state.subscription_base_url = Some(format!("{origin}/backend-api/codex"));
    state.subscription_reader = Some(reader.clone());
    state.subscription_readers = vec![reader];
    state.audit = Arc::new(crate::audit::AuditLog::to_path(audit_path.to_str()));
    let token = crate::model_routing::tests::bound_client_token(&state, ClientKind::Codex, None);
    let alias = crate::token::codex_token_alias(&token).unwrap();

    let whoami_request = Request::builder()
        .method(Method::GET)
        .uri("/api/services/codex/v1/user-auth-credential/whoami")
        .header("authorization", format!("Bearer {alias}"))
        .body(Body::empty())
        .unwrap();
    let whoami = codex(State(state.clone()), whoami_request).await;
    assert_eq!(whoami.status(), StatusCode::OK);
    let whoami: serde_json::Value =
        serde_json::from_slice(&whoami.into_body().collect().await.unwrap().to_bytes()).unwrap();
    let account_handle = whoami["chatgpt_account_id"].as_str().unwrap();
    assert!(account_handle.starts_with("acct_"));
    assert_eq!(whoami["chatgpt_plan_type"], "unknown");
    assert_eq!(whoami["chatgpt_account_is_fedramp"], false);
    assert!(!whoami.to_string().contains("upstream-account"));
    let data_dir = data.path().to_str().unwrap();
    let config = crate::cli::Cli::try_parse_from([
        "router",
        "--token-secret",
        "test-secret",
        "--data-dir",
        data_dir,
        "--upstream-provider",
        "codex",
        "--disable-login-api",
    ])
    .unwrap()
    .into_config()
    .unwrap();
    let app = crate::server_router::router_for_listener(
        state.clone(),
        &config,
        crate::route_contract::ListenerKind::Combined,
    )
    .layer(from_fn_with_state(
        state.clone(),
        crate::request_log::log_http_exchange,
    ));

    let request_bytes = Bytes::from_static(
            br#"{ "path":"private-notes.md", "future":{"preserve":true}, "context":{"session_id":"private-session","current_agent_name":"/root/private-agent"} }"#,
        );
    let paths = [
        "/api/services/codex/v1/alpha/history/v2/list_windows",
        "/api/services/codex/v1/alpha/history/v2/list_items",
        "/api/services/codex/v1/alpha/history/v2/read_item",
        "/api/services/codex/v1/alpha/history/v2/search_contents",
        "/api/services/codex/v1/alpha/notes/v2/thread_hint",
        "/api/services/codex/v1/alpha/notes/v2/list_files_by_prefix",
        "/api/services/codex/v1/alpha/notes/v2/read_file?view=raw",
        "/api/services/codex/v1/alpha/notes/v2/search_contents",
        "/api/services/codex/v1/alpha/notes/v2/append_to_file",
        "/api/services/codex/v1/alpha/notes/v2/write_file",
    ];
    for path in paths {
        let request = Request::builder()
            .method(Method::POST)
            .uri(path)
            .header("authorization", format!("Bearer {alias}"))
            .header("chatgpt-account-id", account_handle)
            .header("content-type", "application/json")
            .header(
                "x-openai-tool-output-truncation-policy",
                r#"{"bytes":1024}"#,
            )
            .header("x-openai-encrypted-tool-arguments", "true")
            .header("x-codex-session-id", "private-session")
            .body(Body::from(request_bytes.clone()))
            .unwrap();
        let response = app.clone().oneshot(request).await.unwrap();
        assert_eq!(response.status(), StatusCode::OK, "{path}");
        assert_eq!(response.headers()["x-request-id"], "req-public");
        assert_eq!(response.headers()["x-ratelimit-remaining-requests"], "19");
        assert_eq!(
            response.into_body().collect().await.unwrap().to_bytes(),
            response_bytes,
            "{path}"
        );
    }

    let (uri, headers, body) = {
        let requests = captured.lock().unwrap();
        assert_eq!(requests.len(), paths.len());
        requests
            .iter()
            .find(|(uri, _, _)| uri.contains("notes/v2/read_file"))
            .unwrap()
            .clone()
    };
    assert_eq!(uri, "/backend-api/codex/alpha/notes/v2/read_file?view=raw");
    assert_eq!(headers["authorization"], "Bearer upstream-secret");
    assert_eq!(headers["chatgpt-account-id"], "upstream-account");
    assert_eq!(
        headers["x-openai-tool-output-truncation-policy"],
        r#"{"bytes":1024}"#
    );
    assert_eq!(headers["x-openai-encrypted-tool-arguments"], "true");
    assert_eq!(body, request_bytes);

    let invalid = Request::builder()
        .method(Method::POST)
        .uri("/api/services/codex/v1/alpha/notes/v2/read_file")
        .header("authorization", format!("Bearer {alias}"))
        .header("chatgpt-account-id", "acct_not-for-this-principal")
        .body(Body::from(request_bytes.clone()))
        .unwrap();
    let invalid = app.oneshot(invalid).await.unwrap();
    assert_eq!(invalid.status(), StatusCode::FORBIDDEN);
    assert_eq!(captured.lock().unwrap().len(), paths.len());

    let audit = std::fs::read_to_string(audit_path).unwrap();
    assert!(audit.contains("codex.notes.read_file"));
    for private in [
        "private-notes.md",
        "private-session",
        "private-agent",
        "upstream-secret",
        "upstream-account",
        "opaque-output",
        "image-private",
        account_handle,
    ] {
        assert!(!audit.contains(private), "audit leaked {private}: {audit}");
    }
    let logs = std::fs::read_dir(data.path().join("requests"))
        .into_iter()
        .flatten()
        .filter_map(Result::ok)
        .filter_map(|entry| std::fs::read_to_string(entry.path().join("requests.lino")).ok())
        .collect::<Vec<_>>()
        .join("\n");
    for path in paths {
        let path = path.split('?').next().unwrap();
        assert!(logs.contains(path), "missing safe route {path}: {logs}");
    }
    assert!(logs.contains("req-public"));
    for private in [
        "view=raw",
        "private-notes.md",
        "private-session",
        "private-agent",
        "x-openai-tool-output-truncation-policy",
        "x-openai-encrypted-tool-arguments",
        "x-codex-session-id",
        "upstream-secret",
        "upstream-account",
        "opaque-output",
        "image-private",
        account_handle,
    ] {
        assert!(
            !logs.contains(private),
            "request log leaked {private}: {logs}"
        );
    }
    server.abort();
}
