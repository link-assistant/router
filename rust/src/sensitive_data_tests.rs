use super::*;
use axum::{Json, Router};
use flate2::{Compression, write::GzEncoder};
use serde_json::json;
use std::io::Write as _;
use tokio::net::TcpListener;
use tower::ServiceExt as _;

const TOKEN: &str = "fixture_loopback_scanner_credential";
const PERSON: &str = "Synthetic \"Person\"";
const MARKER: &str = "[[Router_00000000000000000000000000000000_Person_1]]";

async fn echo_scan(headers: HeaderMap, Json(value): Json<Value>) -> (StatusCode, Json<Value>) {
    let expected = format!("Bearer {TOKEN}");
    if headers
        .get("authorization")
        .and_then(|value| value.to_str().ok())
        != Some(expected.as_str())
    {
        return (StatusCode::UNAUTHORIZED, Json(Value::Null));
    }
    let mut document = value["document"].clone();
    if document["body"].is_object() {
        document["body"]["input"] = json!(MARKER);
    }
    for key in ["headers", "query"] {
        for entry in document[key].as_array_mut().unwrap() {
            if entry[1] == "private" {
                entry[1] = json!(MARKER);
            }
        }
    }
    let mut replacements = json!([[MARKER, PERSON]]);
    match document["body"]["fixture"].as_str() {
        Some("bad-pairs") => document["headers"] = json!([["host", MARKER]]),
        Some("bad-header") => document["headers"][0][1] = json!("bad\r\nvalue"),
        Some("bad-body") => document["body"] = json!("not an object"),
        Some("bad-tokens") => replacements = json!([["not scoped", PERSON]]),
        Some("large-body") => document["body"]["input"] = json!(MARKER.repeat(100)),
        _ => {}
    }
    (
        StatusCode::OK,
        Json(json!({"document": document, "replacements": replacements})),
    )
}

async fn scanner_stub() -> (String, tokio::task::JoinHandle<()>) {
    let router = Router::new().route("/scan", axum::routing::post(echo_scan));
    let (origin, task) = serve_fixture(router).await;
    (format!("{origin}/scan"), task)
}

async fn serve_fixture(router: Router) -> (String, tokio::task::JoinHandle<()>) {
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let origin = format!("http://{}", listener.local_addr().unwrap());
    let task = tokio::spawn(async move {
        axum::serve(listener, router).await.unwrap();
    });
    (origin, task)
}

fn inference(encoding: &str, body: impl Into<Body>) -> Request {
    axum::http::Request::builder()
        .method("POST")
        .uri("/api/services/openai/v1/responses?tag=private")
        .header("authorization", "Bearer fixture-client")
        .header("content-type", "application/json")
        .header("content-encoding", encoding)
        .header("x-application-value", "private")
        .header(SESSION, "fixture")
        .body(body.into())
        .unwrap()
}

#[tokio::test]
async fn anonymizes_request_metadata_and_restores_json_after_network_rechunking() {
    let (endpoint, task) = scanner_stub().await;
    let scanner = Scanner::new(&endpoint, TOKEN.to_owned(), "full").unwrap();
    let mut gzip = GzEncoder::new(Vec::new(), Compression::default());
    gzip.write_all(
        serde_json::to_string(&json!({"input": PERSON}))
            .unwrap()
            .as_bytes(),
    )
    .unwrap();
    let request = inference("gzip", gzip.finish().unwrap());
    let session = scanner.session_key(request.headers()).unwrap();
    let (protected, replacements) = protect(request, &scanner, 8192, session).await.unwrap();
    assert_eq!(protected.headers()["x-application-value"], MARKER);
    assert_eq!(
        protected.headers()["authorization"],
        "Bearer fixture-client"
    );
    assert!(protected.headers().get("content-encoding").is_none());
    assert!(protected.headers().get(SESSION).is_none());
    let pairs: Vec<_> =
        url::form_urlencoded::parse(protected.uri().query().unwrap().as_bytes()).collect();
    assert_eq!(pairs[0].0, "tag");
    assert_eq!(pairs[0].1, MARKER);
    let input = to_bytes(protected.into_body(), 8192).await.unwrap();
    assert_eq!(
        serde_json::from_slice::<Value>(&input).unwrap()["input"],
        MARKER
    );

    let event = format!("data: {{\"delta\":\"{MARKER}\"}}\n\ndata: [DONE]\n\n");
    let (first, second) = event.as_bytes().split_at(28);
    let chunks = [first, second].map(|part| Ok::<_, std::io::Error>(Bytes::copy_from_slice(part)));
    let response = axum::http::Response::builder()
        .header("content-type", "text/event-stream")
        .header("content-length", event.len())
        .body(Body::from_stream(futures_util::stream::iter(chunks)))
        .unwrap();
    let restored = response::restore(response, replacements);
    assert!(restored.headers().get("content-length").is_none());
    let output = to_bytes(restored.into_body(), 8192).await.unwrap();
    assert_eq!(
        std::str::from_utf8(&output).unwrap(),
        format!("data: {{\"delta\":{}}}\n\ndata: [DONE]\n\n", json!(PERSON))
    );
    task.abort();
}

#[tokio::test]
async fn refuses_opaque_input_and_a_rejected_loopback_exchange() {
    let (endpoint, task) = scanner_stub().await;
    let scanner = Scanner::new(
        &endpoint,
        "fixture_incorrect_scanner_credential".to_owned(),
        "full",
    )
    .unwrap();
    let opaque = inference("identity", r#"{"image_url":"https://example.test/image"}"#);
    assert!(matches!(
        protect(opaque, &scanner, 8192, None).await,
        Err(Failure::UnsupportedBody)
    ));
    let rejected = inference("identity", r#"{"input":"private"}"#);
    assert!(matches!(
        protect(rejected, &scanner, 8192, None).await,
        Err(Failure::Unavailable)
    ));
    task.abort();
}

#[test]
fn caller_credentials_and_session_ids_separate_restore_state() {
    let scanner = Scanner::new("http://127.0.0.1:8081/scan", TOKEN.to_owned(), "full").unwrap();
    let request = inference("identity", "");
    let mut headers = request.headers().clone();
    let original = scanner.session_key(&headers).unwrap().unwrap();
    assert_eq!(original.len(), 64);
    headers.insert(
        "authorization",
        HeaderValue::from_static("Bearer other-client"),
    );
    assert_ne!(scanner.session_key(&headers).unwrap().unwrap(), original);
    headers.insert(
        "authorization",
        HeaderValue::from_static("Bearer fixture-client"),
    );
    headers.insert(SESSION, HeaderValue::from_static("another-session"));
    assert_ne!(scanner.session_key(&headers).unwrap().unwrap(), original);
    headers.append(SESSION, HeaderValue::from_static("second-value"));
    assert!(matches!(
        scanner.session_key(&headers),
        Err(Failure::InvalidSession)
    ));
    assert!(Scanner::new("http://example.test:8081/scan", TOKEN.to_owned(), "full").is_none());
}

#[tokio::test]
async fn joins_sse_fragments_with_interleaved_outputs() {
    let replacements = Replacements::new(vec![(MARKER.to_owned(), PERSON.to_owned())]).unwrap();
    let delta = |item_id: &str, value: &str| {
        format!(
            "data: {}\r\n\r\n",
            json!({"type": "response.output_text.delta", "item_id": item_id, "delta": value})
        )
    };
    let wire = delta("first", &format!("Hello {}", &MARKER[..14]))
        + &delta("other", "ordinary output")
        + &delta("first", &format!("{}!", &MARKER[14..]))
        + &delta("other", "Literal [")
        + "data: [DONE]\r\n\r\n";
    let response = axum::http::Response::builder()
        .header("content-type", "text/event-stream")
        .body(Body::from(wire))
        .unwrap();
    let output = to_bytes(response::restore(response, replacements).into_body(), 8192)
        .await
        .unwrap();
    let output = std::str::from_utf8(&output).unwrap();
    let deltas: Vec<Value> = output
        .lines()
        .filter_map(|line| serde_json::from_str(line.strip_prefix("data: ")?).ok())
        .collect();
    assert_eq!(deltas[0]["delta"], "Hello ");
    assert_eq!(deltas[1]["delta"], "ordinary output");
    assert_eq!(deltas[2]["delta"], format!("{PERSON}!"));
    assert_eq!(deltas[3]["delta"], "Literal [");
    assert!(output.ends_with("data: [DONE]\r\n\r\n"));
}

#[tokio::test]
async fn protected_routes_fail_closed_and_leave_other_routes_available() {
    let mut env = crate::operation_context::OperationContext::isolated("privacy-fixture");
    env.environment
        .remove(std::ffi::OsStr::new("ROUTER_SENSITIVE_DATA_SCANNER_URL"));
    env.environment
        .remove(std::ffi::OsStr::new("ROUTER_SENSITIVE_DATA_SCANNER_TOKEN"));
    assert!(env.scope(|| PrivacyRoute::from_env(LIMIT)).is_none());
    let (endpoint, task) = scanner_stub().await;
    env.set_env("ROUTER_SENSITIVE_DATA_SCANNER_URL", endpoint);
    let invalid = env.scope(|| PrivacyRoute::from_env(LIMIT)).unwrap();
    let app = |policy| {
        Router::new()
            .fallback(|request: Request| async move {
                let scoped = request.extensions().get::<WebSocketPrivacy>().is_some();
                let data = to_bytes(request.into_body(), LIMIT).await.unwrap();
                let body = serde_json::from_slice::<Value>(&data).unwrap_or(Value::Null);
                Json(json!({"scoped": scoped, "body": body}))
            })
            .layer(axum::middleware::from_fn_with_state(policy, route))
    };
    for (path, status) in [
        (
            "/api/services/openai/v1/responses",
            StatusCode::SERVICE_UNAVAILABLE,
        ),
        ("/health", StatusCode::OK),
    ] {
        let mut request = inference("identity", "{}");
        *request.uri_mut() = path.parse().unwrap();
        assert_eq!(
            app(invalid.clone())
                .oneshot(request)
                .await
                .unwrap()
                .status(),
            status
        );
    }

    env.set_env("ROUTER_SENSITIVE_DATA_SCANNER_TOKEN", TOKEN);
    env.set_env("ROUTER_SENSITIVE_DATA_SCOPE", "body");
    let app = app(env.scope(|| PrivacyRoute::from_env(1024)).unwrap());
    for (request, status) in [
        (inference("identity", "[]"), StatusCode::BAD_REQUEST),
        (inference("identity", "not-json"), StatusCode::BAD_REQUEST),
        (inference("br", "{}"), StatusCode::UNSUPPORTED_MEDIA_TYPE),
        (
            inference("identity", r#"{"nested":[{"fileData":{"type":"file"}}]}"#),
            StatusCode::UNSUPPORTED_MEDIA_TYPE,
        ),
        (
            inference("identity", r#"{"nested":[{"type":"input_audio"}]}"#),
            StatusCode::UNSUPPORTED_MEDIA_TYPE,
        ),
        (
            inference("identity", r#"{"nested":["DATA:text/plain,opaque"]}"#),
            StatusCode::UNSUPPORTED_MEDIA_TYPE,
        ),
        (inference("gzip", "corrupt-gzip"), StatusCode::BAD_REQUEST),
        (
            inference("identity", "x".repeat(1025)),
            StatusCode::PAYLOAD_TOO_LARGE,
        ),
        (
            inference("identity", r#"{"fixture":"bad-body"}"#),
            StatusCode::SERVICE_UNAVAILABLE,
        ),
        (
            inference("identity", r#"{"fixture":"bad-tokens"}"#),
            StatusCode::SERVICE_UNAVAILABLE,
        ),
        (
            inference("identity", r#"{"fixture":"bad-pairs"}"#),
            StatusCode::SERVICE_UNAVAILABLE,
        ),
    ] {
        let response = app.clone().oneshot(request).await.unwrap();
        assert_eq!(response.status(), status);
        let detail = to_bytes(response.into_body(), 4096).await.unwrap();
        assert_eq!(
            serde_json::from_slice::<Value>(&detail).unwrap()["error"]["type"],
            "sensitive_data_protection"
        );
    }
    let mut large = GzEncoder::new(Vec::new(), Compression::default());
    large.write_all(&[b' '; 1025]).unwrap();
    let rejected = app
        .clone()
        .oneshot(inference("gzip", large.finish().unwrap()))
        .await
        .unwrap();
    assert_eq!(rejected.status(), StatusCode::PAYLOAD_TOO_LARGE);
    let compressed = zstd::stream::encode_all(&br#"{"input":"original"}"#[..], 1).unwrap();
    let response = app
        .clone()
        .oneshot(inference("zstd", compressed))
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(response_json(response).await["body"]["input"], PERSON);

    let mut no_session = inference("identity", "");
    no_session.headers_mut().remove(SESSION);
    no_session
        .headers_mut()
        .insert("upgrade", HeaderValue::from_static("websocket"));
    assert_eq!(
        response_json(app.clone().oneshot(no_session).await.unwrap()).await["scoped"],
        true
    );

    let mut invalid_session = inference("identity", "{}");
    invalid_session
        .headers_mut()
        .insert(SESSION, HeaderValue::from_static("bad session"));
    assert_eq!(
        app.clone().oneshot(invalid_session).await.unwrap().status(),
        StatusCode::BAD_REQUEST
    );
    for path in [
        "/api/services/openai/v1/realtime?call_id=rtc_fixture",
        "/api/services/openai/v1/realtime/calls",
        "/api/services/codex/v1/live/rtc_fixture",
    ] {
        let mut request = inference("identity", "");
        *request.uri_mut() = path.parse().unwrap();
        request
            .headers_mut()
            .insert("upgrade", HeaderValue::from_static("websocket"));
        assert_eq!(
            app.clone().oneshot(request).await.unwrap().status(),
            StatusCode::UNSUPPORTED_MEDIA_TYPE
        );
    }
    task.abort();
    let _ = task.await;
}

async fn response_json(response: Response) -> Value {
    let body = to_bytes(response.into_body(), 8192).await.unwrap();
    serde_json::from_slice(&body).unwrap()
}

#[tokio::test]
async fn validates_scanner_output_and_authenticated_websocket_events() {
    let (endpoint, task) = scanner_stub().await;
    let scanner = Arc::new(Scanner::new(&endpoint, TOKEN.to_owned(), "full").unwrap());
    for fixture in ["bad-header", "bad-pairs"] {
        let body = json!({"fixture": fixture}).to_string();
        assert!(matches!(
            protect(inference("identity", body), &scanner, 8192, None).await,
            Err(Failure::Unavailable)
        ));
    }
    let mut multipart = inference("identity", "{}");
    multipart.headers_mut().insert(
        "content-type",
        HeaderValue::from_static("multipart/form-data"),
    );
    assert!(matches!(
        protect(multipart, &scanner, 8192, None).await,
        Err(Failure::UnsupportedBody)
    ));
    let mut repeated = inference("identity", "{}");
    repeated
        .headers_mut()
        .append("content-encoding", HeaderValue::from_static("gzip"));
    assert!(matches!(
        protect(repeated, &scanner, 8192, None).await,
        Err(Failure::UnsupportedBody)
    ));

    let mut socket = WebSocketPrivacy {
        scanner,
        session: "fixture".to_owned(),
        limit: 512,
        replacements: Replacements::new(Vec::new()).unwrap(),
    };
    let input = json!({"type":"response.create", "input":PERSON});
    let protected = socket.scan_event(input.clone()).await.unwrap();
    assert_eq!(protected["input"], MARKER);
    assert_eq!(
        socket.restore_event(&protected.to_string()),
        input.to_string()
    );
    for invalid in [
        json!([]),
        json!({"type":"input_audio"}),
        json!({"fixture":"bad-pairs"}),
        json!({"fixture":"bad-body"}),
        json!({"fixture":"bad-tokens"}),
        json!({"fixture":"large-body"}),
    ] {
        assert!(socket.scan_event(invalid).await.is_err());
    }
    assert_eq!(
        socket.restore_event(&protected.to_string()),
        input.to_string()
    );
    task.abort();
    let _ = task.await;
}

#[tokio::test]
async fn respects_replacement_limits_and_response_media_types() {
    let entries = || vec![(MARKER.to_owned(), PERSON.to_owned())];
    assert!(Replacements::new(entries().repeat(257)).is_none());
    let mut duplicate = entries();
    duplicate.extend(entries());
    assert!(Replacements::new(duplicate).is_none());
    for (mime, encoding, expected) in [
        (
            "application/problem+json",
            "identity",
            json!(PERSON).to_string(),
        ),
        ("application/json", "gzip", json!(MARKER).to_string()),
        ("text/plain", "identity", json!(MARKER).to_string()),
    ] {
        let response = Response::builder()
            .header("content-type", mime)
            .header("content-encoding", encoding)
            .body(Body::from(json!(MARKER).to_string()))
            .unwrap();
        let output = response::restore(response, Replacements::new(entries()).unwrap());
        assert_eq!(
            to_bytes(output.into_body(), 1024).await.unwrap().as_ref(),
            expected.as_bytes()
        );
    }
    let mut restorer = Replacements::new(entries()).unwrap();
    let foreign = MARKER.replace("Person", "Company");
    assert_eq!(
        restorer.feed(foreign.as_bytes(), true).unwrap().as_ref(),
        foreign.as_bytes()
    );
    let oversized = vec![(MARKER.to_owned(), "private".repeat(1024 * 1024))];
    assert!(
        Replacements::new(oversized)
            .unwrap()
            .feed(MARKER.repeat(2).as_bytes(), true)
            .is_err()
    );
}

#[tokio::test]
async fn native_and_responses_websockets_mask_upstream_events_and_restore_client_text() {
    use axum::extract::WebSocketUpgrade;
    use axum::routing::get;
    use futures_util::{SinkExt as _, StreamExt as _};
    use tokio_tungstenite::tungstenite::{Message as Frame, client::IntoClientRequest as _};

    let (tx, mut captured) = tokio::sync::mpsc::unbounded_channel();
    let echo = move |upgrade: WebSocketUpgrade| {
        let tx = tx.clone();
        async move {
            upgrade.on_upgrade(move |mut socket| async move {
                while let Some(Ok(message)) = socket.recv().await {
                    if let Message::Text(text) = message {
                        let value: Value = serde_json::from_str(text.as_str()).unwrap();
                        tx.send(value.clone()).unwrap();
                        let output = json!({
                            "type": "response.completed",
                            "response": {
                                "id": "resp_privacy_fixture",
                                "input": value["input"],
                                "usage": {"input_tokens": 1, "output_tokens": 1}
                            }
                        });
                        if socket
                            .send(Message::Text(output.to_string().into()))
                            .await
                            .is_err()
                        {
                            break;
                        }
                    }
                }
            })
        }
    };
    let upstream = Router::new()
        .route(
            "/v1/models",
            get(|| async { Json(json!({"data":[{"id":"gpt-unit"}]})) }),
        )
        .route("/v1/responses", get(echo.clone()))
        .route("/v1/realtime", get(echo));
    let (origin, provider) = serve_fixture(upstream).await;
    let data = tempfile::tempdir().unwrap();
    let mut state = crate::app_state::AppState::for_tests(data.path());
    state.upstream_provider = crate::config::UpstreamProvider::OpenAICompatible;
    state.openai_compatible.base_url = format!("{origin}/v1");
    state.openai_compatible.api_key = Some("provider-test-credential".to_owned());
    state.openai_compatible.models = vec!["gpt-unit".to_owned()];
    state.openai_compatible.supported_clients = vec!["codex".to_owned()];
    let token = state
        .token_manager
        .issue(&crate::token::IssueRequest {
            ttl_hours: 1,
            label: "privacy fixture",
            account: Some("primary"),
            client_kind: Some("codex"),
            principal_id: Some("primary"),
            ..Default::default()
        })
        .unwrap();
    let native_state = state.clone();
    let (endpoint, scanner) = scanner_stub().await;
    let app = Router::new()
        .route(
            "/api/services/openai/v1/responses",
            get(crate::responses_websocket::protected_openai),
        )
        .route(
            "/api/services/openai/v1/realtime",
            get(move |request: Request| {
                let state = native_state.clone();
                let url = format!("{origin}/v1/realtime");
                async move {
                    let target = crate::native_service::Target {
                        client: state.client.clone(),
                        url,
                        headers: HeaderMap::new(),
                    };
                    crate::native_service::upgrade_websocket(state, request, target, None).await
                }
            }),
        )
        .with_state(state)
        .layer(axum::middleware::from_fn_with_state(
            PrivacyRoute {
                scanner: Some(Arc::new(
                    Scanner::new(&endpoint, TOKEN.to_owned(), "full").unwrap(),
                )),
                limit: LIMIT,
            },
            route,
        ));
    let (origin, router) = serve_fixture(app).await;
    tokio::time::timeout(Duration::from_secs(15), async {
        for surface in ["responses", "realtime"] {
            let mut request = format!(
                "{}/api/services/openai/v1/{surface}",
                origin.replacen("http", "ws", 1)
            )
            .into_client_request()
            .unwrap();
            let headers = request.headers_mut();
            headers.insert("authorization", format!("Bearer {token}").parse().unwrap());
            headers.insert("user-agent", HeaderValue::from_static("codex_exec/0.153.0"));
            headers.insert(
                "openai-beta",
                HeaderValue::from_static("responses_websockets=2026-02-06"),
            );
            headers.insert("originator", HeaderValue::from_static("codex_cli_rs"));
            headers.insert(
                "x-codex-turn-metadata",
                HeaderValue::from_static("responses-websocket-unit"),
            );
            headers.insert(
                "x-openai-internal-codex-responses-lite",
                HeaderValue::from_static("true"),
            );
            headers.insert(SESSION, HeaderValue::from_static("fixture"));
            let (mut socket, _) = tokio_tungstenite::connect_async(request).await.unwrap();
            for kind in ["response.create", "conversation.item.create"] {
                let event = json!({"type":kind,"model":"gpt-unit","input":PERSON});
                socket
                    .send(Frame::Text(event.to_string().into()))
                    .await
                    .unwrap();
                let Frame::Text(reply) = socket.next().await.unwrap().unwrap() else {
                    panic!("expected restored JSON");
                };
                let reply: Value = serde_json::from_str(reply.as_str()).unwrap();
                assert_eq!(reply["response"]["input"], PERSON, "{surface}: {reply}");
                assert_eq!(captured.recv().await.unwrap()["input"], MARKER);
            }
            socket.send(Frame::Ping(vec![7, 8].into())).await.unwrap();
            assert_eq!(
                socket.next().await.unwrap().unwrap(),
                Frame::Pong(vec![7, 8].into())
            );
            socket.send(Frame::Binary(vec![1, 2].into())).await.unwrap();
            assert!(matches!(
                socket.next().await.unwrap().unwrap(),
                Frame::Close(Some(_))
            ));
        }
    })
    .await
    .unwrap();
    assert!(captured.try_recv().is_err());
    for task in [scanner, provider, router] {
        task.abort();
        let _ = task.await;
    }
}
