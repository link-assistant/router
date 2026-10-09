use futures_util::{SinkExt, StreamExt};
use serde_json::{Value, json};
use tokio_tungstenite::tungstenite;
use tokio_tungstenite::tungstenite::client::IntoClientRequest;

use super::*;

fn websocket_request(server: &TestRouter, path: &str) -> http::Request<()> {
    let url = format!("{}{}", server.url.replacen("http://", "ws://", 1), path);
    let mut request = url.into_client_request().expect("WebSocket request");
    let authorization = format!("Bearer {}", server.codex_token)
        .parse()
        .expect("authorization header");
    request.headers_mut().insert("authorization", authorization);
    request
        .headers_mut()
        .insert("user-agent", "codex_exec/0.153.0".parse().unwrap());
    request.headers_mut().insert(
        "x-codex-turn-metadata",
        "router-e2e-websocket".parse().unwrap(),
    );
    request
        .headers_mut()
        .insert("originator", "codex_cli_rs".parse().unwrap());
    request.headers_mut().insert(
        "openai-beta",
        "responses_websockets=2026-02-06".parse().unwrap(),
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
                    .expect("pong");
            }
            _ => {}
        }
    }
}

#[tokio::test]
async fn native_responses_websocket_is_affine_transparent_and_multiplexed() {
    let server = TestRouter::start(UpstreamProvider::OpenAICompatible).await;
    let (mut socket, _) = tokio_tungstenite::connect_async(websocket_request(
        &server,
        "/api/services/openai/v1/responses",
    ))
    .await
    .expect("connect through Router");

    let first = json!({
        "type": "response.create",
        "stream_id": "main",
        "model": "gpt-5",
        "store": false,
        "generate": false,
        "input": "warm up",
        "future_native_field": {"preserve": true}
    });
    socket
        .send(tungstenite::Message::Text(first.to_string().into()))
        .await
        .expect("send first turn");
    let progress = next_json(&mut socket).await;
    let completed = next_json(&mut socket).await;
    assert_eq!(progress["type"], "response.in_progress");
    assert_eq!(progress["stream_id"], "main");
    assert_eq!(progress["vendor_extension"]["preserved"], true);
    assert_eq!(completed["type"], "response.completed");

    let second = json!({
        "type": "response.create",
        "stream_id": "tools",
        "model": "gpt-5",
        "store": false,
        "previous_response_id": "resp_ws_stub",
        "input": [{"type":"function_call_output","call_id":"call_1","output":"ok"}]
    });
    socket
        .send(tungstenite::Message::Text(second.to_string().into()))
        .await
        .expect("send continuation");
    assert_eq!(next_json(&mut socket).await["stream_id"], "tools");
    assert_eq!(next_json(&mut socket).await["stream_id"], "tools");

    socket
        .send(tungstenite::Message::Ping(b"router-ping".to_vec().into()))
        .await
        .expect("send ping");
    loop {
        if let tungstenite::Message::Pong(bytes) = socket
            .next()
            .await
            .expect("pong frame")
            .expect("valid pong")
        {
            assert_eq!(bytes.as_ref(), b"router-ping");
            break;
        }
    }
    socket
        .close(Some(tungstenite::protocol::CloseFrame {
            code: tungstenite::protocol::frame::coding::CloseCode::Normal,
            reason: "done".into(),
        }))
        .await
        .expect("close WebSocket");

    let requests = server.requests.lock().expect("request lock");
    assert_eq!(requests.as_slice(), &[first, second]);
    drop(requests);
    let headers = server.upstream_headers.lock().expect("header lock");
    let websocket_headers = headers
        .iter()
        .find(|headers| headers.contains_key("sec-websocket-key"))
        .expect("captured upstream WebSocket handshake");
    assert_eq!(
        websocket_headers
            .get("authorization")
            .and_then(|value| value.to_str().ok()),
        Some("Bearer stub-openai-compatible-key")
    );
    assert_eq!(
        websocket_headers
            .get("openai-beta")
            .and_then(|value| value.to_str().ok()),
        Some("responses_websockets=2026-02-06")
    );
    assert!(!websocket_headers.contains_key("x-router-token"));
    drop(headers);
}

#[tokio::test]
async fn websocket_normalizes_thinking_suffix_on_every_create() {
    let server = TestRouter::start(UpstreamProvider::OpenAICompatible).await;
    let (mut socket, _) = tokio_tungstenite::connect_async(websocket_request(
        &server,
        "/api/services/openai/v1/responses",
    ))
    .await
    .unwrap();
    for level in ["low", "high"] {
        socket
            .send(tungstenite::Message::Text(
                json!({"type":"response.create","model":format!("gpt-5({level})"),"input":"hi"})
                    .to_string()
                    .into(),
            ))
            .await
            .unwrap();
        assert_eq!(next_json(&mut socket).await["type"], "response.in_progress");
        assert_eq!(next_json(&mut socket).await["type"], "response.completed");
    }
    socket.close(None).await.unwrap();
    let requests = server.requests.lock().unwrap();
    assert_eq!(requests.len(), 2);
    for (request, effort) in requests.iter().zip(["low", "high"]) {
        assert_eq!(request["model"], "gpt-5");
        assert_eq!(request["reasoning"]["effort"], effort);
    }
}

#[tokio::test]
async fn codex_websocket_applies_selected_account_thinking_evidence_on_every_turn() {
    let server = TestRouter::start(UpstreamProvider::Codex).await;
    let account = link_assistant_router::credential_recovery_store::PRIMARY_ACCOUNT;
    let mut records = server
        .state_catalogs()
        .status_for(SubscriptionProvider::Codex, account)
        .records;
    let endpoint = format!("{}/models", server.upstream_url);
    for record in &mut records {
        record
            .raw
            .insert("thinking".into(), json!({"supported":false}));
        record.raw.insert("router_endpoint".into(), json!(endpoint));
        record
            .raw
            .insert("router_source_url".into(), json!(endpoint));
        record
            .raw
            .insert("router_account".into(), json!(record.account));
        record
            .raw
            .insert("router_protocols".into(), json!(["openai_responses"]));
        record.raw.insert(
            "router_health_generation".into(),
            json!(record.health_generation),
        );
    }
    server.state_catalogs().record_records_for_account(
        SubscriptionProvider::Codex,
        account,
        Some("acct_stub".into()),
        records,
    );

    // The same authenticated catalog already constrains HTTP Responses.
    let response = server
        .post(
            "/api/services/codex/v1/responses",
            &json!({
                "model":"gpt-5(high)", "input":"hi", "stream":true,
            }),
        )
        .send()
        .await
        .unwrap();
    assert_eq!(
        response.status(),
        StatusCode::OK,
        "{}",
        response.text().await.unwrap()
    );
    assert!(
        server.requests.lock().unwrap()[0]
            .pointer("/reasoning/effort")
            .is_none()
    );

    let (mut socket, _) = tokio_tungstenite::connect_async(websocket_request(
        &server,
        "/api/services/codex/v1/responses",
    ))
    .await
    .unwrap();
    for level in ["low", "high"] {
        socket
            .send(tungstenite::Message::Text(
                json!({
                    "type":"response.create", "model":format!("gpt-5({level})"), "input":"hi",
                })
                .to_string()
                .into(),
            ))
            .await
            .unwrap();
        assert_eq!(next_json(&mut socket).await["type"], "response.in_progress");
        assert_eq!(next_json(&mut socket).await["type"], "response.completed");
    }
    socket.close(None).await.unwrap();
    let requests = server.requests.lock().unwrap();
    assert_eq!(requests.len(), 3);
    for request in &requests[1..] {
        assert_eq!(request["model"], "gpt-5");
        assert!(request.pointer("/reasoning/effort").is_none(), "{request}");
    }
}

#[tokio::test]
async fn unsupported_and_malformed_websocket_requests_make_no_inference_call() {
    let server = TestRouter::start(UpstreamProvider::OpenAICompatible).await;
    let before = server.requests.lock().expect("request lock").len();
    let qwen = tokio_tungstenite::connect_async(websocket_request(
        &server,
        "/api/services/qwen/v1/responses",
    ))
    .await;
    assert!(qwen.is_err(), "unsupported Qwen upgrade must be rejected");

    let (mut socket, _) = tokio_tungstenite::connect_async(websocket_request(
        &server,
        "/api/services/openai/v1/responses",
    ))
    .await
    .expect("Router accepts authenticated upgrade");
    socket
        .send(tungstenite::Message::Text(
            json!({"type":"response.cancel"}).to_string().into(),
        ))
        .await
        .expect("send malformed first event");
    let error = next_json(&mut socket).await;
    assert_eq!(error["type"], "error");
    assert_eq!(error["error"]["code"], "invalid_websocket_event");
    assert_eq!(
        server.requests.lock().expect("request lock").len(),
        before,
        "no generation reaches upstream"
    );
}
