use std::collections::HashSet;

use axum::extract::ws::{CloseFrame, Message, WebSocket};
use axum::http::{HeaderMap, StatusCode};
use futures_util::{SinkExt, StreamExt};
use serde_json::Value;
use tokio_tungstenite::tungstenite;

use super::{
    AppState, MAX_CONNECTION_AGE, MAX_NAMED_STREAMS, Surface, TurnTracking, UpstreamTarget,
    downstream_to_upstream, fail_and_close, reserve_turn, target_state, upstream_to_downstream,
    validate_stream_id, websocket_error,
};

#[allow(clippy::too_many_arguments)]
pub(super) async fn relay<S>(
    state: &AppState,
    headers: &HeaderMap,
    initial_claims: &crate::token::TokenClaims,
    path: &str,
    target: &UpstreamTarget,
    named_streams: &mut HashSet<String>,
    tracking: &mut TurnTracking,
    mut downstream: WebSocket,
    mut upstream: tokio_tungstenite::WebSocketStream<S>,
) where
    S: tokio::io::AsyncRead + tokio::io::AsyncWrite + Unpin,
{
    let connection_limit = tokio::time::sleep(MAX_CONNECTION_AGE);
    tokio::pin!(connection_limit);
    loop {
        tokio::select! {
            biased;
            () = &mut connection_limit => {
                let error = websocket_error(
                    StatusCode::BAD_REQUEST,
                    "invalid_request_error",
                    "websocket_connection_limit_reached",
                    "Responses websocket connection limit reached (60 minutes). Create a new websocket connection to continue.",
                    None,
                    None,
                );
                let _ = downstream.send(Message::Text(error.to_string().into())).await;
                let _ = downstream.send(Message::Close(Some(CloseFrame { code: 1000, reason: "connection lifetime reached".into() }))).await;
                let _ = upstream.close(None).await;
                break;
            }
            client_message = downstream.next() => {
                let Some(client_message) = client_message else {
                    let _ = upstream.close(None).await;
                    break;
                };
                let Ok(message) = client_message else {
                    let _ = upstream.close(None).await;
                    break;
                };
                if let Message::Text(text) = &message {
                    let bytes = text.as_bytes();
                    let value = match serde_json::from_slice::<Value>(bytes) {
                        Ok(value) if value.is_object() => value,
                        _ => {
                            let error = websocket_error(
                                StatusCode::BAD_REQUEST,
                                "invalid_request_error",
                                "invalid_websocket_event",
                                "WebSocket messages must be JSON objects",
                                None,
                                None,
                            );
                            let _ = downstream.send(Message::Text(error.to_string().into())).await;
                            continue;
                        }
                    };
                    if value.get("type").and_then(Value::as_str) == Some("response.create") {
                        let lane = match validate_stream_id(&value) {
                            Ok(lane) => lane,
                            Err(error) => {
                                let _ = downstream.send(Message::Text(error.to_string().into())).await;
                                continue;
                            }
                        };
                        if let Some(lane_name) = lane.as_ref()
                            && !named_streams.contains(lane_name)
                            && named_streams.len() >= MAX_NAMED_STREAMS
                        {
                            let error = websocket_error(
                                StatusCode::BAD_REQUEST,
                                "invalid_request_error",
                                "websocket_stream_limit_reached",
                                "This WebSocket connection has reached its maximum number of distinct stream IDs (32). Reuse an existing stream_id or open a new WebSocket connection.",
                                Some("stream_id"),
                                Some(lane_name),
                            );
                            let _ = downstream.send(Message::Text(error.to_string().into())).await;
                            continue;
                        }
                        let claims = match crate::proxy::authenticate_client_error(state, headers) {
                            Ok(claims) if claims.sub == initial_claims.sub => claims,
                            Ok(_) => {
                                let error = websocket_error(
                                    StatusCode::FORBIDDEN,
                                    "authentication_error",
                                    "connection_identity_changed",
                                    "the Router client identity changed during the WebSocket connection",
                                    None,
                                    lane.as_deref(),
                                );
                                fail_and_close(&mut downstream, error, 1008).await;
                                let _ = upstream.close(None).await;
                                break;
                            }
                            Err(error) => {
                                let event = websocket_error(
                                    error.status,
                                    "authentication_error",
                                    "authentication_failed",
                                    &error.message,
                                    None,
                                    lane.as_deref(),
                                );
                                fail_and_close(&mut downstream, event, 1008).await;
                                let _ = upstream.close(None).await;
                                break;
                            }
                        };
                        let model = value.get("model").and_then(Value::as_str).unwrap_or_default();
                        if model.is_empty() || !target.allowed_models.iter().any(|candidate| candidate == model) {
                            let error = websocket_error(
                                StatusCode::BAD_REQUEST,
                                "invalid_request_error",
                                "websocket_model_mismatch",
                                "the requested model is not available from this connection's bound provider account",
                                Some("model"),
                                lane.as_deref(),
                            );
                            let _ = downstream.send(Message::Text(error.to_string().into())).await;
                            continue;
                        }
                        let tracker = match reserve_turn(state, &claims, &value) {
                            Ok(tracker) => tracker,
                            Err(error) => {
                                let _ = downstream.send(Message::Text(error.to_string().into())).await;
                                continue;
                            }
                        };
                        crate::audit::record_authorised_request_with_resolved_model(
                            &target_state(state, target),
                            &claims,
                            Surface::OpenAIResponses,
                            path,
                            Some(&value),
                            Some(model),
                        );
                        if let Some(lane_name) = lane.as_ref() {
                            named_streams.insert(lane_name.clone());
                        }
                        tracking.push(lane, tracker);
                    }
                }
                let closes = matches!(message, Message::Close(_));
                let upstream_message = downstream_to_upstream(message);
                if upstream.send(upstream_message).await.is_err() || closes {
                    break;
                }
            }
            upstream_message = upstream.next() => {
                let Some(upstream_message) = upstream_message else {
                    let _ = downstream.send(Message::Close(Some(CloseFrame { code: 1011, reason: "upstream disconnected".into() }))).await;
                    break;
                };
                let message = match upstream_message {
                    Ok(message) => message,
                    Err(error) => {
                        let event = websocket_error(
                            StatusCode::BAD_GATEWAY,
                            "api_error",
                            "websocket_upstream_error",
                            &format!("upstream WebSocket failed: {error}"),
                            None,
                            None,
                        );
                        let _ = downstream.send(Message::Text(event.to_string().into())).await;
                        let _ = downstream.send(Message::Close(Some(CloseFrame { code: 1011, reason: "upstream WebSocket failed".into() }))).await;
                        break;
                    }
                };
                if let tungstenite::Message::Text(text) = &message
                    && let Ok(value) = serde_json::from_slice::<Value>(text.as_bytes())
                {
                    tracking.feed_terminal(&value, text.as_bytes());
                }
                let closes = matches!(message, tungstenite::Message::Close(_));
                if downstream.send(upstream_to_downstream(message)).await.is_err() || closes {
                    break;
                }
            }
        }
    }
}
