use std::collections::HashSet;

use axum::extract::ws::{CloseFrame, Message, WebSocket};
use axum::http::{HeaderMap, StatusCode};
use futures_util::{SinkExt as _, StreamExt as _};
use serde_json::Value;
use tokio_tungstenite::tungstenite;
use tokio_tungstenite::tungstenite::client::IntoClientRequest;

use super::{
    AppState, CONNECT_TIMEOUT, Namespace, Surface, UpstreamProvider, UpstreamTarget,
    WebSocketPrivacy, connect_upstream, fail_and_close, namespace_path, prepare_target,
    relay_session::relay, reserve_turn, target_state, thinking_controls, tracking::TurnTracking,
    validate_stream_id, websocket_error,
};
use super::thinking_controls::parse_create_event;

pub(super) async fn run(
    state: AppState,
    headers: HeaderMap,
    mut downstream: WebSocket,
    namespace: Namespace,
    mut privacy: Option<WebSocketPrivacy>,
    correlation: String,
) {
    let first = match downstream.next().await {
        Some(Ok(Message::Text(text))) => text.to_string(),
        Some(Ok(Message::Close(frame))) => {
            let _ = downstream.send(Message::Close(frame)).await;
            return;
        }
        Some(Ok(_)) => {
            fail_and_close(
                &mut downstream,
                websocket_error(
                    StatusCode::BAD_REQUEST,
                    "invalid_request_error",
                    "invalid_websocket_event",
                    "the first WebSocket message must be a JSON response.create event",
                    None,
                    None,
                ),
                1003,
            )
            .await;
            return;
        }
        Some(Err(_)) | None => return,
    };
    let mut first_event = match parse_create_event(first.as_bytes()) {
        Ok(event) => event,
        Err(error) => {
            fail_and_close(&mut downstream, error, 1008).await;
            return;
        }
    };
    crate::geolocation::sanitize(
        &mut first_event,
        crate::geolocation::shares_geolocation(&headers),
    );
    let first_lane = match validate_stream_id(&first_event) {
        Ok(lane) => lane,
        Err(error) => {
            fail_and_close(&mut downstream, error, 1008).await;
            return;
        }
    };
    let path = namespace_path(namespace);
    let claims = match crate::proxy::authenticate_client_error(&state, &headers) {
        Ok(claims) => claims,
        Err(error) => {
            fail_and_close(
                &mut downstream,
                websocket_error(
                    error.status,
                    "authentication_error",
                    "authentication_failed",
                    &error.message,
                    None,
                    first_lane.as_deref(),
                ),
                1008,
            )
            .await;
            return;
        }
    };
    let target =
        match prepare_target(&state, &headers, &claims, &mut first_event, namespace, path).await {
            Ok(target) => target,
            Err(error) => {
                fail_and_close(&mut downstream, error, 1008).await;
                return;
            }
        };
    if let Err(error) = thinking_controls::apply_for_target(&state, &target, &mut first_event) {
        fail_and_close(&mut downstream, error, 1008).await;
        return;
    }
    if let Some(policy) = &mut privacy {
        let Ok(protected) = policy.scan_event(first_event).await else {
            let _ = downstream
                .send(Message::Close(Some(CloseFrame {
                    code: 1008,
                    reason: "sensitive data scan rejected".into(),
                })))
                .await;
            return;
        };
        first_event = protected;
    }
    if let Err(reason) = crate::runtime_config::egress::websocket(
        &state,
        &correlation,
        &headers,
        &claims,
        target.provider,
        &mut first_event,
    ) {
        fail_and_close(
            &mut downstream,
            payload_rule_error(reason, first_lane.as_deref()),
            1008,
        )
        .await;
        return;
    }
    let first_bytes = serde_json::to_vec(&first_event).expect("JSON values always serialize");
    let first_tracker = match reserve_turn(&state, &claims, &first_event) {
        Ok(tracker) => tracker,
        Err(error) => {
            fail_and_close(&mut downstream, error, 1008).await;
            return;
        }
    };
    crate::audit::record_authorised_request_with_resolved_model(
        &target_state(&state, &target),
        &claims,
        Surface::OpenAIResponses,
        path,
        Some(&first_event),
        first_event.get("model").and_then(Value::as_str),
    );

    let request = match websocket_request(&target) {
        Ok(request) => request,
        Err(message) => {
            fail_and_close(
                &mut downstream,
                websocket_error(
                    StatusCode::BAD_GATEWAY,
                    "api_error",
                    "websocket_connection_failed",
                    &message,
                    None,
                    first_lane.as_deref(),
                ),
                1011,
            )
            .await;
            return;
        }
    };
    let config = tungstenite::protocol::WebSocketConfig::default()
        .max_message_size(Some(state.max_proxy_request_bytes))
        .max_frame_size(Some(state.max_proxy_request_bytes))
        .max_write_buffer_size(state.max_proxy_request_bytes.saturating_mul(2));
    let connected = tokio::time::timeout(
        CONNECT_TIMEOUT,
        connect_upstream(
            request,
            config,
            target.provider == UpstreamProvider::OpenAICompatible,
        ),
    )
    .await;
    let (mut upstream, handshake) = match connected {
        Ok(Ok(connected)) => connected,
        Ok(Err(error)) => {
            fail_and_close(
                &mut downstream,
                websocket_error(
                    StatusCode::BAD_GATEWAY,
                    "api_error",
                    "websocket_connection_failed",
                    &format!("upstream WebSocket connection failed: {error}"),
                    None,
                    first_lane.as_deref(),
                ),
                1011,
            )
            .await;
            return;
        }
        Err(_) => {
            fail_and_close(
                &mut downstream,
                websocket_error(
                    StatusCode::GATEWAY_TIMEOUT,
                    "api_error",
                    "websocket_connection_timeout",
                    "upstream WebSocket connection timed out",
                    None,
                    first_lane.as_deref(),
                ),
                1011,
            )
            .await;
            return;
        }
    };
    if target.codex_cookie_scope
        && let Some(url) = crate::codex_cloudflare_cookies::websocket_url_to_https(&target.url)
    {
        crate::codex_cloudflare_cookies::store_response_headers(
            handshake.headers().get_all("set-cookie").iter(),
            &url,
        );
    }
    if upstream
        .send(tungstenite::Message::Text(
            String::from_utf8(first_bytes)
                .expect("serialized JSON is UTF-8")
                .into(),
        ))
        .await
        .is_err()
    {
        fail_and_close(
            &mut downstream,
            websocket_error(
                StatusCode::BAD_GATEWAY,
                "api_error",
                "websocket_upstream_closed",
                "upstream closed before accepting the first response.create event",
                None,
                first_lane.as_deref(),
            ),
            1011,
        )
        .await;
        return;
    }

    let mut named_streams = HashSet::new();
    if let Some(lane) = first_lane.clone() {
        named_streams.insert(lane);
    }
    let mut tracking = TurnTracking::new();
    tracking.push(first_lane, first_tracker, &target, &first_event);
    relay(
        &state,
        &headers,
        &claims,
        &correlation,
        path,
        &target,
        &mut named_streams,
        &mut tracking,
        downstream,
        upstream,
        privacy,
    )
    .await;
}

pub(super) fn websocket_request(target: &UpstreamTarget) -> Result<http::Request<()>, String> {
    let mut request = target
        .url
        .as_str()
        .into_client_request()
        .map_err(|error| format!("invalid upstream WebSocket URL: {error}"))?;
    for (name, value) in &target.headers {
        request.headers_mut().append(name, value.clone());
    }
    if target.codex_cookie_scope
        && let Some(url) = crate::codex_cloudflare_cookies::websocket_url_to_https(&target.url)
        && let Some(cookie) = crate::codex_cloudflare_cookies::cookie_header(&url)
    {
        request.headers_mut().insert("cookie", cookie);
    }
    Ok(request)
}

pub(super) fn payload_rule_error(reason: &str, stream_id: Option<&str>) -> Value {
    websocket_error(
        StatusCode::BAD_GATEWAY,
        "api_error",
        "payload_rule_failed",
        reason,
        None,
        stream_id,
    )
}
