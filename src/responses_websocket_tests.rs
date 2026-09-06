use axum::Router;
use axum::extract::State;
use axum::extract::ws::{Message, WebSocket, WebSocketUpgrade};
use axum::http::{HeaderMap, HeaderValue, StatusCode};
use axum::response::Response;
use axum::routing::get;
use futures_util::{SinkExt, StreamExt};
use serde_json::{Value, json};
use tokio_tungstenite::tungstenite;
use tokio_tungstenite::tungstenite::client::IntoClientRequest as _;

use super::*;
use crate::clients::ClientKind;
use crate::token::IssueRequest;

#[test]
fn first_event_must_be_response_create() {
    assert!(parse_create_event(br#"{"type":"response.create","model":"gpt-test"}"#).is_ok());
    let error =
        parse_create_event(br#"{"type":"response.cancel","stream_id":"lane"}"#).unwrap_err();
    assert_eq!(error["error"]["code"], "invalid_websocket_event");
    assert_eq!(error["stream_id"], "lane");
    assert!(parse_create_event(b"not json").is_err());
}

#[test]
fn validates_official_stream_id_contract() {
    let event = json!({"stream_id":"planner-1.alpha_beta"});
    assert_eq!(
        validate_stream_id(&event).unwrap().as_deref(),
        Some("planner-1.alpha_beta")
    );
    assert!(validate_stream_id(&json!({})).unwrap().is_none());
    for invalid in ["", "contains space", "slash/name"] {
        assert_eq!(
            validate_stream_id(&json!({"stream_id": invalid})).unwrap_err()["error"]["code"],
            "invalid_stream_id"
        );
    }
    assert_eq!(
        validate_stream_id(&json!({"stream_id": 7})).unwrap_err()["error"]["code"],
        "invalid_stream_id"
    );
    assert!(validate_stream_id(&json!({"stream_id":"x".repeat(257)})).is_err());
}

#[test]
fn websocket_helpers_preserve_protocol_frames_and_error_context() {
    assert_eq!(
        websocket_url("https://api.openai.example/v1/responses").unwrap(),
        "wss://api.openai.example/v1/responses"
    );
    assert_eq!(
        websocket_url("http://127.0.0.1:8080/v1/responses").unwrap(),
        "ws://127.0.0.1:8080/v1/responses"
    );
    assert_eq!(
        websocket_url("ws://127.0.0.1/responses").unwrap(),
        "ws://127.0.0.1/responses"
    );
    assert!(websocket_url("not a URL").is_err());
    assert!(websocket_url("file:///tmp/responses").is_err());
    assert_eq!(
        namespace_path(Namespace::OpenAi),
        "/api/services/openai/v1/responses"
    );
    assert_eq!(
        namespace_path(Namespace::Codex),
        "/api/services/codex/v1/responses"
    );

    let error = websocket_error(
        StatusCode::BAD_REQUEST,
        "invalid_request_error",
        "fixture",
        "fixture failure",
        Some("model"),
        Some("lane"),
    );
    assert_eq!(error["status"], 400);
    assert_eq!(error["error"]["param"], "model");
    assert_eq!(error["stream_id"], "lane");
    assert_eq!(
        response_as_websocket_error(
            Response::builder()
                .status(StatusCode::FORBIDDEN)
                .body(axum::body::Body::empty())
                .unwrap()
        )["status"],
        403
    );
    assert_eq!(
        unsupported_bridge("fixture", Some("lane"))["error"]["code"],
        "websocket_mode_unsupported"
    );

    for message in [
        Message::Text("text".into()),
        Message::Binary(vec![1, 2].into()),
        Message::Ping(vec![3].into()),
        Message::Pong(vec![4].into()),
        Message::Close(Some(CloseFrame {
            code: 1000,
            reason: "done".into(),
        })),
    ] {
        let upstream = downstream_to_upstream(message.clone());
        assert_eq!(upstream_to_downstream(upstream), message);
    }
}

async fn upstream_websocket(upgrade: WebSocketUpgrade) -> Response {
    upgrade.on_upgrade(|mut socket: WebSocket| async move {
        while let Some(Ok(message)) = socket.next().await {
            match message {
                Message::Text(text) => {
                    let Ok(request) = serde_json::from_slice::<Value>(text.as_bytes()) else {
                        continue;
                    };
                    let mut response = json!({
                        "type": "response.completed",
                        "response": {
                            "id": "resp_unit_websocket",
                            "usage": {"input_tokens": 1, "output_tokens": 1}
                        }
                    });
                    if let Some(stream_id) = request.get("stream_id").and_then(Value::as_str) {
                        response["stream_id"] = Value::String(stream_id.to_string());
                    }
                    if socket
                        .send(Message::Text(response.to_string().into()))
                        .await
                        .is_err()
                    {
                        return;
                    }
                }
                Message::Ping(bytes) => {
                    if socket.send(Message::Pong(bytes)).await.is_err() {
                        return;
                    }
                }
                Message::Close(frame) => {
                    let _ = socket.send(Message::Close(frame)).await;
                    return;
                }
                _ => {}
            }
        }
    })
}

async fn spawn(app: Router) -> (String, tokio::task::JoinHandle<()>) {
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
        .await
        .expect("bind test server");
    let address = listener.local_addr().expect("test server address");
    let task = tokio::spawn(async move {
        axum::serve(listener, app).await.expect("serve test app");
    });
    (format!("http://{address}"), task)
}

fn bound_codex_token(state: &AppState) -> String {
    bound_codex_token_with_budget(state, None)
}

fn bound_codex_token_with_budget(state: &AppState, max_tokens: Option<u64>) -> String {
    state
        .token_manager
        .issue(&IssueRequest {
            ttl_hours: 1,
            label: "Responses WebSocket unit client",
            account: Some("primary"),
            max_tokens,
            client_kind: Some(ClientKind::Codex.canonical_name()),
            principal_id: Some("primary"),
            ..IssueRequest::default()
        })
        .expect("issue bound client token")
}

fn client_request(origin: &str, path: &str, token: Option<&str>) -> http::Request<()> {
    let url = format!("{}{path}", origin.replacen("http://", "ws://", 1));
    let mut request = url.into_client_request().expect("WebSocket request");
    if let Some(token) = token {
        request
            .headers_mut()
            .insert("authorization", format!("Bearer {token}").parse().unwrap());
    }
    request
        .headers_mut()
        .insert("user-agent", "codex_exec/0.153.0".parse().unwrap());
    request.headers_mut().insert(
        "x-codex-turn-metadata",
        "responses-websocket-unit".parse().unwrap(),
    );
    request
        .headers_mut()
        .insert("originator", "codex_cli_rs".parse().unwrap());
    request.headers_mut().insert(
        "openai-beta",
        "responses_websockets=2026-02-06".parse().unwrap(),
    );
    request.headers_mut().insert(
        "x-openai-internal-codex-responses-lite",
        HeaderValue::from_static("true"),
    );
    request
}

async fn next_json<S>(socket: &mut tokio_tungstenite::WebSocketStream<S>) -> Value
where
    S: tokio::io::AsyncRead + tokio::io::AsyncWrite + Unpin,
{
    loop {
        match socket
            .next()
            .await
            .expect("WebSocket message")
            .expect("valid frame")
        {
            tungstenite::Message::Text(text) => {
                return serde_json::from_slice(text.as_bytes()).expect("JSON event");
            }
            tungstenite::Message::Ping(bytes) => {
                socket
                    .send(tungstenite::Message::Pong(bytes))
                    .await
                    .unwrap();
            }
            _ => {}
        }
    }
}

#[tokio::test]
async fn in_process_websocket_covers_routing_multiplexing_and_rejections() {
    let upstream = Router::new()
        .route(
            "/v1/models",
            get(|| async { axum::Json(json!({"data":[{"id":"gpt-unit"}]})) }),
        )
        .route("/v1/responses", get(upstream_websocket))
        .route("/responses", get(upstream_websocket));
    let (upstream_origin, upstream_task) = spawn(upstream).await;

    let data = tempfile::tempdir().expect("test data");
    let mut state = AppState::for_tests(data.path());
    state.upstream_provider = UpstreamProvider::OpenAICompatible;
    state.openai_compatible.base_url = format!("{upstream_origin}/v1");
    state.openai_compatible.api_key = Some("upstream-unit-key".into());
    state.openai_compatible.models = vec!["gpt-unit".into()];
    state.openai_compatible.supported_clients = vec!["codex".into()];
    let token = bound_codex_token(&state);

    let mut direct_headers = HeaderMap::new();
    direct_headers.insert("authorization", format!("Bearer {token}").parse().unwrap());
    assert_eq!(
        unsupported_qwen(State(state.clone()), direct_headers)
            .await
            .status(),
        StatusCode::BAD_REQUEST
    );

    let app = Router::new()
        .route("/api/services/openai/v1/responses", get(openai))
        .with_state(state.clone());
    let (router_origin, router_task) = spawn(app).await;

    let unauthenticated = tokio_tungstenite::connect_async(client_request(
        &router_origin,
        namespace_path(Namespace::OpenAi),
        None,
    ))
    .await;
    assert!(unauthenticated.is_err());

    let limited_token = bound_codex_token_with_budget(&state, Some(1));
    let (mut limited, _) = tokio_tungstenite::connect_async(client_request(
        &router_origin,
        namespace_path(Namespace::OpenAi),
        Some(&limited_token),
    ))
    .await
    .expect("limited token upgrade");
    limited
        .send(tungstenite::Message::Text(
            json!({
                "type":"response.create",
                "stream_id":"limited",
                "model":"gpt-unit",
                "input":"this request exceeds a one-token budget"
            })
            .to_string()
            .into(),
        ))
        .await
        .unwrap();
    assert_eq!(
        next_json(&mut limited).await["error"]["code"],
        "request_budget_exceeded"
    );

    let revoked_token = bound_codex_token(&state);
    let (mut revoked, _) = tokio_tungstenite::connect_async(client_request(
        &router_origin,
        namespace_path(Namespace::OpenAi),
        Some(&revoked_token),
    ))
    .await
    .expect("revocable token upgrade");
    revoked
        .send(tungstenite::Message::Text(
            json!({"type":"response.create","stream_id":"revoked","model":"gpt-unit"})
                .to_string()
                .into(),
        ))
        .await
        .unwrap();
    assert_eq!(next_json(&mut revoked).await["type"], "response.completed");
    let revoked_id = state
        .token_manager
        .validate_token(&revoked_token)
        .unwrap()
        .sub;
    state.token_manager.revoke_token(&revoked_id).unwrap();
    revoked
        .send(tungstenite::Message::Text(
            json!({"type":"response.create","stream_id":"revoked","model":"gpt-unit"})
                .to_string()
                .into(),
        ))
        .await
        .unwrap();
    assert_eq!(
        next_json(&mut revoked).await["error"]["code"],
        "authentication_failed"
    );

    let revoked_before_first_token = bound_codex_token(&state);
    let (mut revoked_before_first, _) = tokio_tungstenite::connect_async(client_request(
        &router_origin,
        namespace_path(Namespace::OpenAi),
        Some(&revoked_before_first_token),
    ))
    .await
    .expect("revocable token upgrade before first event");
    let revoked_before_first_id = state
        .token_manager
        .validate_token(&revoked_before_first_token)
        .unwrap()
        .sub;
    state
        .token_manager
        .revoke_token(&revoked_before_first_id)
        .unwrap();
    revoked_before_first
        .send(tungstenite::Message::Text(
            json!({"type":"response.create","stream_id":"revoked-first","model":"gpt-unit"})
                .to_string()
                .into(),
        ))
        .await
        .unwrap();
    assert_eq!(
        next_json(&mut revoked_before_first).await["error"]["code"],
        "authentication_failed"
    );

    let (mut binary_first, _) = tokio_tungstenite::connect_async(client_request(
        &router_origin,
        namespace_path(Namespace::OpenAi),
        Some(&token),
    ))
    .await
    .expect("authenticated upgrade");
    binary_first
        .send(tungstenite::Message::Binary(vec![1, 2, 3].into()))
        .await
        .unwrap();
    assert_eq!(
        next_json(&mut binary_first).await["error"]["code"],
        "invalid_websocket_event"
    );

    let (mut invalid_lane_first, _) = tokio_tungstenite::connect_async(client_request(
        &router_origin,
        namespace_path(Namespace::OpenAi),
        Some(&token),
    ))
    .await
    .expect("authenticated upgrade");
    invalid_lane_first
        .send(tungstenite::Message::Text(
            json!({"type":"response.create","stream_id":"invalid lane","model":"gpt-unit"})
                .to_string()
                .into(),
        ))
        .await
        .unwrap();
    assert_eq!(
        next_json(&mut invalid_lane_first).await["error"]["code"],
        "invalid_stream_id"
    );

    let (mut wrong_first, _) = tokio_tungstenite::connect_async(client_request(
        &router_origin,
        namespace_path(Namespace::OpenAi),
        Some(&token),
    ))
    .await
    .expect("authenticated upgrade");
    wrong_first
        .send(tungstenite::Message::Text(
            json!({"type":"response.create","stream_id":"wrong","model":"not-live"})
                .to_string()
                .into(),
        ))
        .await
        .unwrap();
    assert_eq!(
        next_json(&mut wrong_first).await["error"]["code"],
        "model_not_found"
    );

    let (mut socket, _) = tokio_tungstenite::connect_async(client_request(
        &router_origin,
        namespace_path(Namespace::OpenAi),
        Some(&token),
    ))
    .await
    .expect("connect through in-process Router");
    let first = json!({
        "type": "response.create",
        "stream_id": "main",
        "model": "gpt-unit",
        "input": "first"
    });
    socket
        .send(tungstenite::Message::Text(first.to_string().into()))
        .await
        .unwrap();
    assert_eq!(next_json(&mut socket).await["stream_id"], "main");

    socket
        .send(tungstenite::Message::Text("not-json".into()))
        .await
        .unwrap();
    assert_eq!(
        next_json(&mut socket).await["error"]["code"],
        "invalid_websocket_event"
    );
    socket
        .send(tungstenite::Message::Text(
            json!({"type":"response.create","stream_id":"bad lane","model":"gpt-unit"})
                .to_string()
                .into(),
        ))
        .await
        .unwrap();
    assert_eq!(
        next_json(&mut socket).await["error"]["code"],
        "invalid_stream_id"
    );
    socket
        .send(tungstenite::Message::Text(
            json!({"type":"response.create","stream_id":"other","model":"wrong"})
                .to_string()
                .into(),
        ))
        .await
        .unwrap();
    assert_eq!(
        next_json(&mut socket).await["error"]["code"],
        "websocket_model_mismatch"
    );

    for index in 0..31 {
        let stream_id = format!("lane-{index}");
        socket
            .send(tungstenite::Message::Text(
                json!({"type":"response.create","stream_id":stream_id,"model":"gpt-unit"})
                    .to_string()
                    .into(),
            ))
            .await
            .unwrap();
        assert_eq!(next_json(&mut socket).await["type"], "response.completed");
    }
    socket
        .send(tungstenite::Message::Text(
            json!({"type":"response.create","stream_id":"overflow","model":"gpt-unit"})
                .to_string()
                .into(),
        ))
        .await
        .unwrap();
    assert_eq!(
        next_json(&mut socket).await["error"]["code"],
        "websocket_stream_limit_reached"
    );

    socket
        .send(tungstenite::Message::Ping(b"ping".to_vec().into()))
        .await
        .unwrap();
    loop {
        if let tungstenite::Message::Pong(bytes) = socket.next().await.unwrap().unwrap() {
            assert_eq!(bytes.as_ref(), b"ping");
            break;
        }
    }
    socket.close(None).await.unwrap();

    let claims = state.token_manager.validate_token(&token).unwrap();
    let target = UpstreamTarget {
        url: "ws://127.0.0.1/responses".into(),
        headers: HeaderMap::from_iter([(
            axum::http::header::AUTHORIZATION,
            HeaderValue::from_static("Bearer upstream"),
        )]),
        allowed_models: vec!["gpt-unit".into()],
        provider: UpstreamProvider::OpenAICompatible,
        codex_cookie_scope: false,
    };
    let request = websocket_request(&target).unwrap();
    assert_eq!(request.headers()["authorization"], "Bearer upstream");
    assert_eq!(
        target_state(&state, &target).upstream_provider,
        target.provider
    );
    assert!(reserve_turn(&state, &claims, &json!({"input":"budget"})).is_ok());

    let mut codex_namespace_event = json!({
        "type": "response.create",
        "stream_id": "codex-namespace",
        "model": "gpt-unit"
    });
    let codex_namespace_error = prepare_target(
        &state,
        &client_request(
            &router_origin,
            namespace_path(Namespace::Codex),
            Some(&token),
        )
        .headers()
        .clone(),
        &claims,
        &mut codex_namespace_event,
        Namespace::Codex,
        namespace_path(Namespace::Codex),
    )
    .await
    .unwrap_err();
    assert_eq!(
        codex_namespace_error["error"]["code"],
        "websocket_mode_unsupported"
    );

    let mut no_key_state = state.clone();
    no_key_state.openai_compatible.api_key = None;
    let mut no_key_event = json!({
        "type": "response.create",
        "stream_id": "no-key",
        "model": "gpt-unit"
    });
    let no_key_error = prepare_target(
        &no_key_state,
        &client_request(
            &router_origin,
            namespace_path(Namespace::OpenAi),
            Some(&token),
        )
        .headers()
        .clone(),
        &claims,
        &mut no_key_event,
        Namespace::OpenAi,
        namespace_path(Namespace::OpenAi),
    )
    .await
    .unwrap_err();
    assert_eq!(
        no_key_error["error"]["code"],
        "upstream_credential_unavailable"
    );

    let mut unsupported_client_state = state.clone();
    unsupported_client_state.openai_compatible.supported_clients = vec!["opencode".into()];
    let mut unsupported_client_event = json!({
        "type": "response.create",
        "stream_id": "unsupported-client",
        "model": "gpt-unit"
    });
    let unsupported_client_error = prepare_target(
        &unsupported_client_state,
        &client_request(
            &router_origin,
            namespace_path(Namespace::OpenAi),
            Some(&token),
        )
        .headers()
        .clone(),
        &claims,
        &mut unsupported_client_event,
        Namespace::OpenAi,
        namespace_path(Namespace::OpenAi),
    )
    .await
    .unwrap_err();
    assert_eq!(
        unsupported_client_error["error"]["code"],
        "permission_denied"
    );

    let closed_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let closed_origin = format!("http://{}", closed_listener.local_addr().unwrap());
    drop(closed_listener);
    let mut failed_catalog_state = state.clone();
    failed_catalog_state.openai_compatible.base_url = format!("{closed_origin}/v1");
    let mut failed_catalog_event = json!({
        "type": "response.create",
        "stream_id": "catalog-outage",
        "model": "gpt-unit"
    });
    let failed_catalog_error = prepare_target(
        &failed_catalog_state,
        &client_request(
            &router_origin,
            namespace_path(Namespace::OpenAi),
            Some(&token),
        )
        .headers()
        .clone(),
        &claims,
        &mut failed_catalog_event,
        Namespace::OpenAi,
        namespace_path(Namespace::OpenAi),
    )
    .await
    .unwrap_err();
    assert_eq!(
        failed_catalog_error["error"]["code"],
        "provider_unavailable"
    );

    let codex_data = tempfile::tempdir().expect("Codex test data");
    let codex_home = codex_data.path().join("codex");
    std::fs::create_dir_all(&codex_home).unwrap();
    std::fs::write(
        codex_home.join("auth.json"),
        r#"{"tokens":{"access_token":"codex-unit-token","account_id":"acct_unit"}}"#,
    )
    .unwrap();
    let reader =
        crate::subscription::SubscriptionReader::new(SubscriptionProvider::Codex, &codex_home);
    let mut codex_state = AppState::for_tests(codex_data.path());
    codex_state.upstream_provider = UpstreamProvider::Codex;
    codex_state.subscription_reader = Some(reader.clone());
    codex_state.subscription_base_url = Some(upstream_origin.clone());
    codex_state.model_catalogs.record_success_for_account(
        SubscriptionProvider::Codex,
        "primary",
        Some("acct_unit".into()),
        vec!["gpt-codex-unit".into()],
    );
    let codex_token = bound_codex_token(&codex_state);
    let codex_app = Router::new()
        .route("/api/services/codex/v1/responses", get(codex))
        .with_state(codex_state.clone());
    let (codex_origin, codex_router_task) = spawn(codex_app).await;
    let (mut codex_socket, _) = tokio_tungstenite::connect_async(client_request(
        &codex_origin,
        namespace_path(Namespace::Codex),
        Some(&codex_token),
    ))
    .await
    .expect("connect through the Codex subscription WebSocket");
    codex_socket
        .send(tungstenite::Message::Text(
            json!({
                "type":"response.create",
                "stream_id":"codex",
                "model":"gpt-codex-unit",
                "input":"native"
            })
            .to_string()
            .into(),
        ))
        .await
        .unwrap();
    assert_eq!(next_json(&mut codex_socket).await["stream_id"], "codex");
    codex_socket.close(None).await.unwrap();

    let codex_claims = codex_state
        .token_manager
        .validate_token(&codex_token)
        .unwrap();
    let codex_headers = client_request(
        &codex_origin,
        namespace_path(Namespace::Codex),
        Some(&codex_token),
    )
    .headers()
    .clone();
    let missing_model = subscription_target(
        &codex_state,
        &codex_headers,
        &codex_claims,
        &json!({"type":"response.create","stream_id":"missing","model":"absent"}),
        None,
        SubscriptionProvider::Codex,
        namespace_path(Namespace::Codex),
    )
    .await
    .unwrap_err();
    assert_eq!(missing_model["error"]["code"], "model_not_found");

    let empty_data = tempfile::tempdir().expect("empty subscription data");
    let empty_state = AppState::for_tests(empty_data.path());
    let event = json!({"stream_id":"missing-reader"});
    assert_eq!(
        select_subscription(
            &empty_state,
            None,
            SubscriptionProvider::Codex,
            &crate::accounts::RoutingContext::default(),
            &event,
        )
        .await
        .unwrap_err()["error"]["code"],
        "upstream_credential_unavailable"
    );
    let pool_primary = empty_data.path().join("pool-primary");
    let pool_additional = empty_data.path().join("pool-additional");
    std::fs::create_dir_all(&pool_primary).unwrap();
    std::fs::create_dir_all(&pool_additional).unwrap();
    let mut pool_state = AppState::for_tests(empty_data.path());
    let pool = crate::accounts::AccountRouter::new_for_provider(
        pool_primary,
        &[pool_additional],
        SubscriptionProvider::Codex,
        crate::accounts::AccountRouterOptions::default(),
    );
    pool.register_credential_stores_in(&pool_state.subscription_cache, empty_data.path());
    pool_state.account_router = Some(pool);
    assert_eq!(
        select_subscription(
            &pool_state,
            None,
            SubscriptionProvider::Codex,
            &crate::accounts::RoutingContext::default(),
            &event,
        )
        .await
        .unwrap_err()["error"]["code"],
        "account_unavailable"
    );
    let mut missing_state = AppState::for_tests(empty_data.path());
    missing_state.subscription_reader = Some(crate::subscription::SubscriptionReader::new(
        SubscriptionProvider::Codex,
        empty_data.path().join("missing"),
    ));
    assert_eq!(
        select_subscription(
            &missing_state,
            None,
            SubscriptionProvider::Codex,
            &crate::accounts::RoutingContext::default(),
            &event,
        )
        .await
        .unwrap_err()["error"]["code"],
        "upstream_credential_unavailable"
    );

    codex_router_task.abort();
    router_task.abort();
    upstream_task.abort();
}

#[tokio::test]
async fn rejected_upstream_websocket_handshake_is_reported_in_band() {
    let upstream = Router::new()
        .route(
            "/v1/models",
            get(|| async { axum::Json(json!({"data":[{"id":"gpt-unit"}]})) }),
        )
        .route("/v1/responses", get(|| async { "not a websocket" }));
    let (upstream_origin, upstream_task) = spawn(upstream).await;
    let data = tempfile::tempdir().expect("test data");
    let mut state = AppState::for_tests(data.path());
    state.upstream_provider = UpstreamProvider::OpenAICompatible;
    state.openai_compatible.base_url = format!("{upstream_origin}/v1");
    state.openai_compatible.api_key = Some("upstream-unit-key".into());
    state.openai_compatible.models = vec!["gpt-unit".into()];
    state.openai_compatible.supported_clients = vec!["codex".into()];
    let token = bound_codex_token(&state);
    let app = Router::new()
        .route("/api/services/openai/v1/responses", get(openai))
        .with_state(state);
    let (origin, router_task) = spawn(app).await;
    let (mut socket, _) = tokio_tungstenite::connect_async(client_request(
        &origin,
        namespace_path(Namespace::OpenAi),
        Some(&token),
    ))
    .await
    .expect("Router upgrade");
    socket
        .send(tungstenite::Message::Text(
            json!({"type":"response.create","stream_id":"handshake","model":"gpt-unit"})
                .to_string()
                .into(),
        ))
        .await
        .unwrap();
    assert_eq!(
        next_json(&mut socket).await["error"]["code"],
        "websocket_connection_failed"
    );
    router_task.abort();
    upstream_task.abort();
}

#[tokio::test]
async fn first_close_and_invalid_first_text_end_without_upstream_inference() {
    let data = tempfile::tempdir().expect("test data");
    let state = AppState::for_tests(data.path());
    let token = bound_codex_token(&state);
    let app = Router::new()
        .route("/api/services/openai/v1/responses", get(openai))
        .with_state(state);
    let (origin, task) = spawn(app).await;

    let (mut close_first, _) = tokio_tungstenite::connect_async(client_request(
        &origin,
        namespace_path(Namespace::OpenAi),
        Some(&token),
    ))
    .await
    .unwrap();
    close_first.close(None).await.unwrap();

    let (mut invalid, _) = tokio_tungstenite::connect_async(client_request(
        &origin,
        namespace_path(Namespace::OpenAi),
        Some(&token),
    ))
    .await
    .unwrap();
    invalid
        .send(tungstenite::Message::Text(
            json!({"type":"response.cancel","stream_id":"cancel"})
                .to_string()
                .into(),
        ))
        .await
        .unwrap();
    let error = next_json(&mut invalid).await;
    assert_eq!(error["error"]["code"], "invalid_websocket_event");
    assert_eq!(error["stream_id"], "cancel");

    task.abort();
}
