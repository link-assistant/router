//! Thinking controls use the connection's selected account on every turn.
use axum::http::StatusCode;
use serde_json::Value;

use super::{AppState, UpstreamTarget, stream_id, websocket_error};
use crate::subscription::SubscriptionProvider;
use crate::thinking::ThinkingProtocol;

#[derive(Debug)]
pub(super) struct AccountScope {
    pub(super) account: String,
    pub(super) base_url: String,
}

pub(super) fn apply_for_target(
    state: &AppState,
    target: &UpstreamTarget,
    event: &mut Value,
) -> Result<bool, Value> {
    let Some(scope) = target.thinking_account.as_ref() else {
        return Ok(false);
    };
    let model = event
        .get("model")
        .and_then(Value::as_str)
        .unwrap_or_default()
        .to_string();
    crate::thinking::apply_for_account(
        state,
        event,
        &model,
        SubscriptionProvider::Codex,
        &scope.account,
        &scope.base_url,
        ThinkingProtocol::Codex,
        ThinkingProtocol::OpenAIResponses,
        false,
    )
    .map_err(|reason| {
        websocket_error(
            StatusCode::BAD_REQUEST,
            "invalid_request_error",
            "invalid_thinking_config",
            &reason,
            Some("model"),
            stream_id(event).as_deref(),
        )
    })
}

pub(super) fn parse_create_event(bytes: &[u8]) -> Result<Value, Value> {
    let mut value = serde_json::from_slice::<Value>(bytes).map_err(|_| {
        websocket_error(
            StatusCode::BAD_REQUEST,
            "invalid_request_error",
            "invalid_websocket_event",
            "the first WebSocket message must be valid JSON",
            None,
            None,
        )
    })?;
    if !value.is_object() || value.get("type").and_then(Value::as_str) != Some("response.create") {
        return Err(websocket_error(
            StatusCode::BAD_REQUEST,
            "invalid_request_error",
            "invalid_websocket_event",
            "the first WebSocket message must be a response.create event",
            Some("type"),
            stream_id(&value).as_deref(),
        ));
    }
    crate::thinking::normalize_request(&mut value, ThinkingProtocol::OpenAIResponses).map_err(
        |reason| {
            websocket_error(
                StatusCode::BAD_REQUEST,
                "invalid_request_error",
                "invalid_websocket_event",
                &reason,
                Some("model"),
                stream_id(&value).as_deref(),
            )
        },
    )?;
    Ok(value)
}
