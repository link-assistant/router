use super::*;

fn provider_input(base_url: String) -> ProviderUpsert {
    ProviderUpsert {
        name: "fixture".into(),
        kind: Some("openai-compatible".into()),
        base_url,
        default_model: Some("beta".into()),
        models: Some(vec!["beta".into()]),
        supported_clients: Some(vec!["codex".into()]),
        api_key: Some("upstream-secret".into()),
        api_key_env: None,
        encrypted_api_key: None,
        enabled: Some(true),
        subscriber_id: None,
        acknowledge_intermediary_risk: None,
        acknowledge_unsupported_clients: None,
        if_absent: false,
    }
}

#[tokio::test]
async fn forwarding_entrypoints_authenticate_before_provider_or_network_work() {
    let data = tempfile::tempdir().expect("provider data");
    let state = crate::app_state::AppState::for_tests(data.path());
    let headers = HeaderMap::new();
    let body = serde_json::json!({"model": "never-routed"});

    let anthropic = forward_openai_compatible(
        &state,
        &headers,
        body.clone(),
        "/v1/messages",
        Surface::Anthropic,
    )
    .await;
    assert_eq!(anthropic.status(), StatusCode::UNAUTHORIZED);

    let responses = forward_openai_compatible_routed(
        &state,
        &headers,
        body.clone(),
        &body,
        "/v1/responses",
        Surface::OpenAIResponses,
    )
    .await;
    assert_eq!(responses.status(), StatusCode::UNAUTHORIZED);

    let gemini = forward_openai_compatible(
        &state,
        &headers,
        body,
        "/api/services/gemini/v1beta/models/gemini:generateContent",
        Surface::OpenAIChat,
    )
    .await;
    assert_eq!(gemini.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn provider_management_handlers_cover_the_complete_crud_contract() {
    use axum::response::IntoResponse as _;

    let data = tempfile::tempdir().expect("provider data");
    let mut state = crate::app_state::AppState::for_tests(data.path());

    for response in [
        list_providers(State(state.clone()), HeaderMap::new())
            .await
            .into_response(),
        show_provider(
            State(state.clone()),
            HeaderMap::new(),
            Path("fixture".into()),
        )
        .await
        .into_response(),
        upsert_provider(
            State(state.clone()),
            HeaderMap::new(),
            axum::Json(provider_input("https://provider.example/v1".into())),
        )
        .await
        .into_response(),
        delete_provider(
            State(state.clone()),
            HeaderMap::new(),
            Path("fixture".into()),
        )
        .await
        .into_response(),
    ] {
        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }

    state.allow_anonymous_admin = true;
    let empty = list_providers(State(state.clone()), HeaderMap::new())
        .await
        .into_response();
    assert_eq!(empty.status(), StatusCode::OK);

    let invalid = upsert_provider(
        State(state.clone()),
        HeaderMap::new(),
        axum::Json(provider_input(String::new())),
    )
    .await
    .into_response();
    assert_eq!(invalid.status(), StatusCode::BAD_REQUEST);

    let added = upsert_provider(
        State(state.clone()),
        HeaderMap::new(),
        axum::Json(provider_input("https://provider.example/v1".into())),
    )
    .await
    .into_response();
    assert_eq!(added.status(), StatusCode::OK);

    let shown = show_provider(
        State(state.clone()),
        HeaderMap::new(),
        Path("fixture".into()),
    )
    .await
    .into_response();
    assert_eq!(shown.status(), StatusCode::OK);

    let listed = list_providers(State(state.clone()), HeaderMap::new())
        .await
        .into_response();
    assert_eq!(listed.status(), StatusCode::OK);

    let deleted = delete_provider(
        State(state.clone()),
        HeaderMap::new(),
        Path("fixture".into()),
    )
    .await
    .into_response();
    assert_eq!(deleted.status(), StatusCode::OK);

    for response in [
        show_provider(
            State(state.clone()),
            HeaderMap::new(),
            Path("fixture".into()),
        )
        .await
        .into_response(),
        delete_provider(State(state), HeaderMap::new(), Path("fixture".into()))
            .await
            .into_response(),
    ] {
        assert_eq!(response.status(), StatusCode::NOT_FOUND);
    }
}

#[tokio::test]
async fn rejected_zai_replacement_preserves_the_encrypted_record_byte_for_byte() {
    use axum::routing::get;

    let app = axum::Router::new().route(
        crate::zai_coding_plan::CATALOG_PATH,
        get(|| async {
            axum::Json(serde_json::json!({
                "success": false,
                "code": 401,
                "message": "invalid authorization"
            }))
        }),
    );
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let base_url = format!("http://{}", listener.local_addr().unwrap());
    let server = tokio::spawn(async move { axum::serve(listener, app).await.unwrap() });
    let data = tempfile::tempdir().expect("provider data");
    let mut state = crate::app_state::AppState::for_tests(data.path());
    state.allow_anonymous_admin = true;
    let mut current = provider_input(base_url.clone());
    current.name = "z-ai-personal".into();
    current.kind = Some("z.ai-coding-plan".into());
    current.supported_clients = None;
    current.subscriber_id = Some("owner".into());
    current.acknowledge_intermediary_risk = Some(true);
    state.provider_store.upsert(current.clone()).unwrap();
    let store_path = data.path().join("providers.lenv");
    let original = std::fs::read(&store_path).unwrap();
    current.api_key = Some("invalid-candidate-secret".into());

    let response = upsert_provider(State(state.clone()), HeaderMap::new(), axum::Json(current))
        .await
        .into_response();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    let response_body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let response_body = String::from_utf8(response_body.to_vec()).unwrap();
    assert!(
        response_body.contains("credential_rejected"),
        "{response_body}"
    );
    assert!(!response_body.contains("invalid-candidate-secret"));
    assert!(!response_body.contains("upstream-secret"));
    assert!(!response_body.contains(&data.path().display().to_string()));
    assert_eq!(std::fs::read(&store_path).unwrap(), original);
    assert_eq!(
        state
            .provider_store
            .resolve("z-ai-personal")
            .unwrap()
            .unwrap()
            .api_key
            .as_deref(),
        Some("upstream-secret")
    );
    server.abort();
}

#[tokio::test]
async fn ordinary_provider_catalog_is_authenticated_exact_filtered_and_cached() {
    use std::sync::Arc;
    use std::sync::atomic::{AtomicUsize, Ordering};
    use tokio::io::{AsyncReadExt as _, AsyncWriteExt as _};

    let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
        .await
        .expect("catalog listener");
    let port = listener.local_addr().expect("catalog address").port();
    let requests = Arc::new(AtomicUsize::new(0));
    let observed = Arc::clone(&requests);
    let upstream = tokio::spawn(async move {
        let (mut socket, _) = listener.accept().await.expect("catalog request");
        let mut request = vec![0_u8; 4096];
        let read = socket.read(&mut request).await.expect("read request");
        let request = String::from_utf8_lossy(&request[..read]);
        assert!(request.starts_with("GET /v1/models HTTP/1.1"), "{request}");
        assert!(
            request
                .to_ascii_lowercase()
                .contains("authorization: bearer upstream-secret"),
            "{request}"
        );
        observed.fetch_add(1, Ordering::SeqCst);

        let body = r#"{"data":[{"id":"alpha","tier":"preview"},{"id":"beta","tier":"stable"}]}"#;
        socket
            .write_all(
                format!(
                    "HTTP/1.1 200 OK\r\ncontent-type: application/json\r\ncontent-length: {}\r\nconnection: close\r\n\r\n{body}",
                    body.len()
                )
                .as_bytes(),
            )
            .await
            .expect("write catalog");
    });

    let data = tempfile::tempdir().expect("provider data");
    let state = crate::app_state::AppState::for_tests(data.path());
    let provider = ResolvedProvider {
        name: "fixture".into(),
        kind: ProviderKind::OpenAICompatible,
        base_url: format!("http://127.0.0.1:{port}/v1"),
        default_model: Some("beta".into()),
        models: vec!["beta".into()],
        supported_clients: vec!["codex".into()],
        api_key: Some("upstream-secret".into()),
        subscriber_id: None,
        intermediary_risk_acknowledged: false,
        unsupported_clients: Vec::new(),
    };

    let first = live_openai_compatible_catalog(&state, &provider)
        .await
        .expect("live catalog");
    assert_eq!(first.len(), 1);
    assert_eq!(first[0].id, "beta");
    assert_eq!(first[0].raw["tier"], "stable");
    upstream.await.expect("catalog server");

    let cached = live_openai_compatible_catalog(&state, &provider)
        .await
        .expect("cached catalog");
    assert_eq!(cached, first);
    assert_eq!(requests.load(Ordering::SeqCst), 1);
}

async fn raw_catalog_upstream(status: &str, body: &str) -> (String, tokio::task::JoinHandle<()>) {
    use tokio::io::{AsyncReadExt as _, AsyncWriteExt as _};

    let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
        .await
        .expect("catalog listener");
    let port = listener.local_addr().expect("catalog address").port();
    let status = status.to_string();
    let body = body.to_string();
    let task = tokio::spawn(async move {
        let (mut socket, _) = listener.accept().await.expect("catalog request");
        let mut request = [0_u8; 2048];
        let _ = socket.read(&mut request).await.expect("read request");
        socket
            .write_all(
                format!(
                    "HTTP/1.1 {status}\r\ncontent-type: application/json\r\ncontent-length: {}\r\nconnection: close\r\n\r\n{body}",
                    body.len()
                )
                .as_bytes(),
            )
            .await
            .expect("write catalog");
    });
    (format!("http://127.0.0.1:{port}/v1"), task)
}

fn resolved_catalog_provider(name: &str, base_url: String) -> ResolvedProvider {
    ResolvedProvider {
        name: name.into(),
        kind: ProviderKind::OpenAICompatible,
        base_url,
        default_model: None,
        models: Vec::new(),
        supported_clients: vec!["codex".into()],
        api_key: None,
        subscriber_id: None,
        intermediary_risk_acknowledged: false,
        unsupported_clients: Vec::new(),
    }
}

#[tokio::test]
async fn ordinary_provider_catalog_fails_closed_for_every_invalid_shape() {
    let data = tempfile::tempdir().expect("provider data");
    let state = crate::app_state::AppState::for_tests(data.path());
    let cases = [
        ("500 Broken", r#"{"data":[]}"#),
        ("200 OK", "not-json"),
        ("200 OK", r#"{"models":[]}"#),
        ("200 OK", r#"{"data":[7]}"#),
        ("200 OK", r#"{"data":[{"id":""}]}"#),
        ("200 OK", r#"{"data":[{"id":"same"},{"id":"same"}]}"#),
    ];

    for (index, (status, body)) in cases.into_iter().enumerate() {
        let (base_url, task) = raw_catalog_upstream(status, body).await;
        let provider = resolved_catalog_provider(&format!("invalid-{index}"), base_url);
        let error = live_openai_compatible_catalog(&state, &provider)
            .await
            .expect_err("invalid catalogs must fail closed");
        assert_eq!(error, "provider live model catalog is unavailable");
        task.await.expect("catalog server");

        let cached = live_openai_compatible_catalog(&state, &provider)
            .await
            .expect_err("a recent failed refresh must not hammer the provider");
        assert_eq!(cached, error);
    }

    let mut wrong_kind = resolved_catalog_provider("wrong-kind", "https://unused.example".into());
    wrong_kind.kind = ProviderKind::ZaiCodingPlan;
    assert_eq!(
        live_openai_compatible_catalog(&state, &wrong_kind)
            .await
            .expect_err("the catalog contract is kind-specific"),
        "provider does not use the OpenAI-compatible catalog contract"
    );
}

#[tokio::test]
async fn lefine_catalog_uses_only_configured_exact_ids_when_live_discovery_is_unavailable() {
    let data = tempfile::tempdir().expect("provider data");
    let state = crate::app_state::AppState::for_tests(data.path());
    let (base_url, task) = raw_catalog_upstream("404 Not Found", r#"{"error":"absent"}"#).await;
    let mut provider = resolved_catalog_provider("lefine", base_url);
    provider.kind = ProviderKind::Lefine;
    provider.models = vec!["configured/exact-a".into(), "configured/exact-b".into()];
    provider.supported_clients = crate::lefine::COMPATIBLE_CLIENTS
        .into_iter()
        .map(str::to_string)
        .collect();
    provider.api_key = Some("lefine-secret".into());

    let models = live_openai_compatible_catalog(&state, &provider)
        .await
        .expect("configured Lefine fallback");

    assert_eq!(
        models
            .iter()
            .map(|model| model.id.as_str())
            .collect::<Vec<_>>(),
        ["configured/exact-a", "configured/exact-b"]
    );
    assert!(
        models
            .iter()
            .all(|model| model.raw["catalog_source"] == "configured_fallback")
    );
    task.await.unwrap();
}

#[test]
fn an_unconfigured_openai_compatible_catalog_is_empty() {
    let data = tempfile::tempdir().expect("provider data");
    let mut state = crate::app_state::AppState::for_tests(data.path());
    state.upstream_provider = crate::config::UpstreamProvider::OpenAICompatible;
    state.openai_compatible.default_model = None;
    state.openai_compatible.models.clear();

    let catalog = openai_compatible_models(&state);
    assert_eq!(catalog["data"], serde_json::json!([]));
    assert!(
        !catalog.to_string().contains("default"),
        "Router must not invent a model absent from live or operator configuration"
    );
}

/// `/v1` in the configured base URL must not be duplicated by the request
/// path, and a base without it keeps the path verbatim.
#[test]
fn base_urls_are_joined_without_duplicating_the_version_segment() {
    assert_eq!(
        join_openai_compatible_url("https://api.example/v1", "/v1/chat/completions"),
        "https://api.example/v1/chat/completions"
    );
    assert_eq!(
        join_openai_compatible_url("https://api.example/v1/", "/v1/chat/completions"),
        "https://api.example/v1/chat/completions"
    );
    assert_eq!(
        join_openai_compatible_url("https://api.example", "/v1/chat/completions"),
        "https://api.example/v1/chat/completions"
    );
    // A path that does not start with /v1 is appended as-is.
    assert_eq!(
        join_openai_compatible_url("https://api.example/v1", "/responses"),
        "https://api.example/v1/responses"
    );
    assert_eq!(
        join_openai_compatible_url("https://api.example/", "/responses"),
        "https://api.example/responses"
    );
}

#[test]
fn event_stream_content_types_are_detected_case_insensitively() {
    for value in [
        "text/event-stream",
        "text/event-stream; charset=utf-8",
        "TEXT/EVENT-STREAM",
    ] {
        assert!(
            is_event_stream(&HeaderValue::from_str(value).expect("header")),
            "{value} should be recognised as a stream"
        );
    }
    for value in ["application/json", "text/plain"] {
        assert!(
            !is_event_stream(&HeaderValue::from_str(value).expect("header")),
            "{value} should not be recognised as a stream"
        );
    }
}

/// A stream this relay forwards starts as a stream it will settle.
///
/// Before issue #258 this path recorded every frame and then simply
/// stopped, so its exchanges reached the log with no terminal record and
/// were reported as ending in an unknown state.
#[test]
fn a_forwarded_stream_starts_settled_as_a_stream() {
    let outcome = new_stream_outcome(&reqwest::header::HeaderMap::new());

    assert!(outcome.streamed, "this path only handles streams");
    assert!(
        outcome.inspectable,
        "an unencoded body can be scanned for a terminator"
    );
    assert!(!outcome.terminated, "nothing has been seen yet");
    assert_eq!(outcome.frames, 0);
    assert_eq!(outcome.bytes, 0);
    assert!(outcome.detail.is_none());
}

/// A compressed stream is marked unreadable up front, so its frames are
/// never mistaken for evidence of a truncation (issue #255).
#[test]
fn a_compressed_stream_starts_uninspectable() {
    let mut headers = reqwest::header::HeaderMap::new();
    headers.insert(
        reqwest::header::CONTENT_ENCODING,
        reqwest::header::HeaderValue::from_static("gzip"),
    );

    let outcome = new_stream_outcome(&headers);

    assert!(outcome.streamed);
    assert!(!outcome.inspectable);
    assert_eq!(outcome.label(), "encoded_not_verifiable");
}

/// An event-stream content type is recognised however it is spelled, since
/// it is what routes a response into the streaming path at all.
#[test]
fn an_event_stream_content_type_is_recognised() {
    for value in [
        "text/event-stream",
        "text/event-stream; charset=utf-8",
        "TEXT/EVENT-STREAM",
    ] {
        assert!(
            is_event_stream(&HeaderValue::from_str(value).unwrap()),
            "{value} should route into the streaming path"
        );
    }
    assert!(!is_event_stream(&HeaderValue::from_static(
        "application/json"
    )));
}

/// Relaying a finished stream must leave an outcome that says so.
///
/// The terminal record is derived from this accumulation, so a terminator
/// missed here becomes an exchange whose ending the log cannot account for.
#[test]
fn a_terminating_frame_completes_the_outcome() {
    let mut outcome = new_stream_outcome(&reqwest::header::HeaderMap::new());

    account_for_frame(&mut outcome, b"data: {\"choices\":[{\"delta\":{}}]}\n\n");
    assert!(!outcome.terminated, "an ordinary frame ends nothing");
    assert_eq!(outcome.frames, 1);

    account_for_frame(&mut outcome, b"data: [DONE]\n\n");
    assert!(outcome.terminated, "[DONE] ends an OpenAI stream");
    assert_eq!(outcome.frames, 2);
    assert!(outcome.is_complete());
    assert_eq!(outcome.label(), "completed");
}

/// Every dialect this relay can carry must be recognised, including Gemini,
/// which names no terminating event and marks a finished turn with
/// `finishReason` on its last chunk.
#[test]
fn every_dialect_terminator_completes_the_outcome() {
    for frame in [
        &b"data: [DONE]\n\n"[..],
        b"event: message_stop\ndata: {}\n\n",
        b"event: response.completed\ndata: {}\n\n",
        b"data: {\"candidates\":[{\"finishReason\":\"STOP\"}]}\n\n",
    ] {
        let mut outcome = new_stream_outcome(&reqwest::header::HeaderMap::new());
        account_for_frame(&mut outcome, frame);
        assert!(
            outcome.terminated,
            "unrecognised terminator: {}",
            String::from_utf8_lossy(frame)
        );
    }
}

/// A stream that stops without a terminator must stay incomplete, so a real
/// truncation is still reported (issue #230).
#[test]
fn a_stream_without_a_terminator_stays_incomplete() {
    let mut outcome = new_stream_outcome(&reqwest::header::HeaderMap::new());

    account_for_frame(&mut outcome, b"data: {\"choices\":[{\"delta\":{}}]}\n\n");

    assert!(!outcome.is_complete());
    assert_eq!(outcome.label(), "ended_without_terminator");
    assert_eq!(outcome.bytes, 34);
}

/// Relaying a real stream must record every frame and settle the turn.
///
/// Driven through an actual HTTP response rather than a constructed value:
/// the defect in issue #258 was that this path forwarded bytes and then
/// simply stopped, which only shows up when the stream is consumed to its
/// end.
#[tokio::test]
async fn relaying_a_stream_records_frames_and_settles_the_turn() {
    use futures_util::StreamExt as _;

    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let port = listener.local_addr().unwrap().port();
    tokio::spawn(async move {
        if let Ok((mut socket, _)) = listener.accept().await {
            use tokio::io::{AsyncReadExt as _, AsyncWriteExt as _};
            let mut scratch = [0; 1024];
            let _ = socket.read(&mut scratch).await;
            let body = "data: {\"choices\":[{\"delta\":{}}]}\n\ndata: [DONE]\n\n";
            let _ = socket
                .write_all(
                    format!(
                        "HTTP/1.1 200 OK\r\ncontent-type: text/event-stream\r\n\
                         content-length: {}\r\nconnection: close\r\n\r\n{body}",
                        body.len()
                    )
                    .as_bytes(),
                )
                .await;
        }
    });

    let directory = tempfile::tempdir().expect("temporary log directory");
    let log = std::sync::Arc::new(crate::request_log::RequestLog::new(
        directory.path().to_path_buf(),
        1024 * 1024,
    ));
    let upstream = reqwest::get(format!("http://127.0.0.1:{port}/"))
        .await
        .expect("reach the upstream");

    let mut stream = Box::pin(settled_relay_stream(
        upstream,
        std::sync::Arc::clone(&log),
        "relayed".to_string(),
        log_lazy::LogLazy::default(),
        None,
        None,
    ));
    let mut relayed = Vec::new();
    while let Some(chunk) = stream.next().await {
        relayed.extend_from_slice(&chunk.expect("the relay must forward its bytes"));
    }

    // The client sees the body unchanged: the terminal marker is filtered
    // out, never forwarded.
    let forwarded = String::from_utf8_lossy(&relayed);
    assert!(forwarded.contains("[DONE]"), "{forwarded}");
    assert!(
        !forwarded.contains(crate::request_log::STREAM_END_MARKER),
        "the sentinel must not reach the client: {forwarded}"
    );

    let written = std::fs::read_to_string(directory.path().join("unauthenticated/requests.lino"))
        .expect("read the log");
    let settled: serde_json::Value = written
        .lines()
        .filter_map(crate::lino_json::decode_line)
        .find(|record| record.get("phase").and_then(|p| p.as_str()) == Some("stream_end"))
        .expect("the relay must settle the stream it forwarded");

    assert_eq!(settled["outcome"], "completed", "{settled}");
    assert_eq!(settled["complete"], serde_json::Value::Bool(true));
    assert_eq!(settled["streamed"], serde_json::Value::Bool(true));
    assert!(
        settled["frames"].as_u64().unwrap_or(0) >= 1,
        "every frame is counted: {settled}"
    );
}
