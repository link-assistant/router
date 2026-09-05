//! Native `OpenAI` Responses WebSocket forwarding.
//!
//! Routing is resolved from the first `response.create` event and the resulting
//! provider credential is pinned for the lifetime of the socket. Router never
//! translates this stateful protocol: unsupported bridge destinations fail
//! before an upstream WebSocket is opened.

use std::collections::{HashMap, HashSet, VecDeque};
use std::time::Duration;

use axum::extract::State;
use axum::extract::ws::{CloseFrame, Message, WebSocket, WebSocketUpgrade};
use axum::http::{HeaderMap, HeaderValue, StatusCode};
use axum::response::Response;
use futures_util::{SinkExt, StreamExt};
use serde_json::{Value, json};
use tokio_tungstenite::tungstenite;
use tokio_tungstenite::tungstenite::client::IntoClientRequest;

use crate::accounts::SelectedSubscriptionAccount;
use crate::app_state::AppState;
use crate::client_policy::ClientProtocol;
use crate::config::UpstreamProvider;
use crate::metrics::Surface;
use crate::providers::ProviderKind;
use crate::subscription::SubscriptionProvider;

#[path = "responses_websocket/relay.rs"]
mod relay_session;
use relay_session::relay;

const RESPONSES_PATH: &str = "/v1/responses";
const MAX_NAMED_STREAMS: usize = 32;
const MAX_STREAM_ID_CHARS: usize = 256;
const MAX_CONNECTION_AGE: Duration = Duration::from_secs(60 * 60);
const CONNECT_TIMEOUT: Duration = Duration::from_secs(15);

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(crate) enum Namespace {
    OpenAi,
    Codex,
}

#[derive(Debug)]
struct UpstreamTarget {
    url: String,
    headers: HeaderMap,
    allowed_models: Vec<String>,
    provider: UpstreamProvider,
}

struct TurnTracking {
    by_lane: HashMap<Option<String>, VecDeque<crate::usage::UsageTracker>>,
}

impl TurnTracking {
    fn new() -> Self {
        Self {
            by_lane: HashMap::new(),
        }
    }

    fn push(&mut self, lane: Option<String>, tracker: crate::usage::UsageTracker) {
        self.by_lane.entry(lane).or_default().push_back(tracker);
    }

    fn feed_terminal(&mut self, value: &Value, bytes: &[u8]) {
        let event_type = value
            .get("type")
            .and_then(Value::as_str)
            .unwrap_or_default();
        if !matches!(
            event_type,
            "response.completed" | "response.incomplete" | "response.failed" | "error"
        ) {
            return;
        }
        let lane = value
            .get("stream_id")
            .and_then(Value::as_str)
            .map(str::to_string);
        let remove_lane = self.by_lane.get_mut(&lane).is_some_and(|queue| {
            if let Some(mut tracker) = queue.pop_front() {
                tracker.feed(bytes);
            }
            queue.is_empty()
        });
        if remove_lane {
            self.by_lane.remove(&lane);
        }
    }
}

pub async fn openai(
    State(state): State<AppState>,
    headers: HeaderMap,
    upgrade: WebSocketUpgrade,
) -> Response {
    upgrade_response(state, headers, upgrade, Namespace::OpenAi)
}

pub async fn codex(
    State(state): State<AppState>,
    headers: HeaderMap,
    upgrade: WebSocketUpgrade,
) -> Response {
    upgrade_response(state, headers, upgrade, Namespace::Codex)
}

/// Qwen does not implement the native Responses WebSocket protocol. Refuse the
/// upgrade instead of opening a connection that could only support a subset.
pub async fn unsupported_qwen(State(state): State<AppState>, headers: HeaderMap) -> Response {
    if let Err(error) = crate::proxy::authenticate_client_error(&state, &headers) {
        return error.render(crate::api_error::ApiDialect::OpenAi);
    }
    crate::proxy::error_response(
        StatusCode::BAD_REQUEST,
        "invalid_request_error",
        "the qwen service does not support native Responses WebSocket mode",
    )
}

fn upgrade_response(
    state: AppState,
    headers: HeaderMap,
    upgrade: WebSocketUpgrade,
    namespace: Namespace,
) -> Response {
    if let Err(error) = crate::proxy::authenticate_client_error(&state, &headers) {
        return error.render(crate::api_error::ApiDialect::OpenAi);
    }
    let limit = state.max_proxy_request_bytes;
    upgrade
        .max_message_size(limit)
        .max_frame_size(limit)
        .on_upgrade(move |socket| session(state, headers, socket, namespace))
}

async fn session(
    state: AppState,
    headers: HeaderMap,
    mut downstream: WebSocket,
    namespace: Namespace,
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
    let Ok(first_bytes) = serde_json::to_vec(&first_event) else {
        fail_and_close(
            &mut downstream,
            websocket_error(
                StatusCode::INTERNAL_SERVER_ERROR,
                "api_error",
                "serialization_error",
                "failed to serialize the Responses WebSocket event",
                None,
                first_lane.as_deref(),
            ),
            1011,
        )
        .await;
        return;
    };
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
        tokio_tungstenite::connect_async_with_config(request, Some(config), false),
    )
    .await;
    let (mut upstream, _) = match connected {
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
    tracking.push(first_lane, first_tracker);
    relay(
        &state,
        &headers,
        &claims,
        path,
        &target,
        &mut named_streams,
        &mut tracking,
        downstream,
        upstream,
    )
    .await;
}

async fn prepare_target(
    state: &AppState,
    headers: &HeaderMap,
    claims: &crate::token::TokenClaims,
    event: &mut Value,
    namespace: Namespace,
    path: &str,
) -> Result<UpstreamTarget, Value> {
    let routed = crate::proxy::route_openai_request(
        state,
        headers,
        event,
        ClientProtocol::OpenAIResponses,
        path,
    )
    .await
    .map_err(response_as_websocket_error)?;
    crate::proxy::rewrite_routed_model(event, &routed.state, routed.subscription.as_ref());
    let model = event
        .get("model")
        .and_then(Value::as_str)
        .filter(|model| !model.is_empty())
        .ok_or_else(|| {
            websocket_error(
                StatusCode::BAD_REQUEST,
                "invalid_request_error",
                "model_required",
                "model is required for Responses WebSocket mode",
                Some("model"),
                stream_id(event).as_deref(),
            )
        })?;

    if let Some(provider) = routed.state.upstream_provider.subscription_provider() {
        if provider != SubscriptionProvider::Codex {
            return Err(unsupported_bridge(
                provider.as_str(),
                stream_id(event).as_deref(),
            ));
        }
        if namespace == Namespace::Codex || namespace == Namespace::OpenAi {
            return subscription_target(
                &routed.state,
                headers,
                claims,
                event,
                routed.subscription.as_ref(),
                provider,
                path,
            )
            .await;
        }
    }
    if namespace == Namespace::Codex {
        return Err(unsupported_bridge(
            routed.state.upstream_provider.as_str(),
            stream_id(event).as_deref(),
        ));
    }
    if routed.state.upstream_provider != UpstreamProvider::OpenAICompatible {
        return Err(unsupported_bridge(
            routed.state.upstream_provider.as_str(),
            stream_id(event).as_deref(),
        ));
    }
    let provider = crate::provider_proxy::resolve_openai_compatible_provider(&routed.state)
        .map_err(|error| {
            websocket_error(
                StatusCode::SERVICE_UNAVAILABLE,
                "api_error",
                "provider_unavailable",
                &format!("provider lookup failed: {error}"),
                None,
                stream_id(event).as_deref(),
            )
        })?;
    if provider.kind != ProviderKind::OpenAICompatible {
        return Err(unsupported_bridge(
            provider.kind.as_str(),
            stream_id(event).as_deref(),
        ));
    }
    let (client, _) = crate::client_policy::bound_client(claims).map_err(|message| {
        websocket_error(
            StatusCode::FORBIDDEN,
            "permission_error",
            "permission_denied",
            &message,
            None,
            stream_id(event).as_deref(),
        )
    })?;
    if !provider.supports_client(client)
        || !crate::client_policy::request_evidence(
            client,
            ClientProtocol::OpenAIResponses,
            path,
            headers,
        )
    {
        return Err(websocket_error(
            StatusCode::FORBIDDEN,
            "permission_error",
            "permission_denied",
            "the selected provider has no tested compatible adapter for this signed client request",
            None,
            stream_id(event).as_deref(),
        ));
    }
    let live = crate::provider_proxy::live_openai_compatible_catalog(&routed.state, &provider)
        .await
        .map_err(|message| {
            websocket_error(
                StatusCode::SERVICE_UNAVAILABLE,
                "api_error",
                "provider_unavailable",
                &message,
                None,
                stream_id(event).as_deref(),
            )
        })?;
    let allowed_models = live
        .into_iter()
        .map(|candidate| candidate.id)
        .collect::<Vec<_>>();
    if !allowed_models.iter().any(|candidate| candidate == model) {
        return Err(websocket_error(
            StatusCode::NOT_FOUND,
            "not_found_error",
            "model_not_found",
            &format!("model '{model}' is not available from the selected provider"),
            Some("model"),
            stream_id(event).as_deref(),
        ));
    }
    let api_key = provider.api_key.as_deref().ok_or_else(|| {
        websocket_error(
            StatusCode::SERVICE_UNAVAILABLE,
            "authentication_error",
            "upstream_credential_unavailable",
            "the selected provider credential is unavailable",
            None,
            stream_id(event).as_deref(),
        )
    })?;
    Ok(UpstreamTarget {
        url: websocket_url(&crate::provider_proxy::join_openai_compatible_url(
            &provider.base_url,
            RESPONSES_PATH,
        ))?,
        headers: crate::proxy::native_request_headers(headers, api_key),
        allowed_models,
        provider: UpstreamProvider::OpenAICompatible,
    })
}

#[allow(clippy::too_many_arguments)]
async fn subscription_target(
    state: &AppState,
    headers: &HeaderMap,
    claims: &crate::token::TokenClaims,
    event: &Value,
    validated: Option<&crate::model_routing::ValidatedSubscription>,
    provider: SubscriptionProvider,
    path: &str,
) -> Result<UpstreamTarget, Value> {
    crate::client_policy::enforce_subscription_for_claims(
        state,
        claims,
        headers,
        provider,
        ClientProtocol::OpenAIResponses,
        path,
    )
    .map_err(response_as_websocket_error)?;
    let pinned_account = state
        .token_manager
        .account_for(&claims.sub)
        .map_err(|error| {
            websocket_error(
                StatusCode::INTERNAL_SERVER_ERROR,
                "api_error",
                "account_binding_failed",
                &format!("failed to resolve token account binding: {error}"),
                None,
                stream_id(event).as_deref(),
            )
        })?;
    let context = crate::request_routing::request_routing_context(headers, event, pinned_account);
    let selected = select_subscription(state, validated, provider, &context, event).await?;
    let token = if validated.is_some() {
        selected.token
    } else {
        state
            .subscription_cache
            .get_fresh_loaded(
                &state.client,
                provider,
                &selected.name,
                selected.token,
                chrono::Utc::now().timestamp_millis(),
            )
            .await
            .map_err(|message| {
                websocket_error(
                    StatusCode::SERVICE_UNAVAILABLE,
                    "authentication_error",
                    "upstream_credential_unavailable",
                    &message,
                    None,
                    stream_id(event).as_deref(),
                )
            })?
    };
    let allowed_models = state
        .model_catalogs
        .status_for(provider, &selected.name)
        .routable_models()
        .to_vec();
    let model = event
        .get("model")
        .and_then(Value::as_str)
        .unwrap_or_default();
    if !allowed_models.iter().any(|candidate| candidate == model) {
        return Err(websocket_error(
            StatusCode::NOT_FOUND,
            "not_found_error",
            "model_not_found",
            &format!("model '{model}' is not available from the selected provider account"),
            Some("model"),
            stream_id(event).as_deref(),
        ));
    }
    let base_url = state
        .subscription_base_url
        .clone()
        .unwrap_or_else(|| token.base_url(provider));
    let mut upstream_headers = crate::proxy::native_request_headers(headers, &token.access_token);
    if let Some(account_id) = token.account_id.as_deref()
        && let Ok(value) = HeaderValue::from_str(account_id)
    {
        upstream_headers.insert("chatgpt-account-id", value);
    }
    Ok(UpstreamTarget {
        url: websocket_url(&crate::subscription_proxy::join_subscription_url(
            provider,
            &base_url,
            RESPONSES_PATH,
        ))?,
        headers: upstream_headers,
        allowed_models,
        provider: UpstreamProvider::Codex,
    })
}

async fn select_subscription(
    state: &AppState,
    validated: Option<&crate::model_routing::ValidatedSubscription>,
    provider: SubscriptionProvider,
    context: &crate::accounts::RoutingContext,
    event: &Value,
) -> Result<SelectedSubscriptionAccount, Value> {
    if let Some(validated) = validated {
        if validated.provider != provider {
            return Err(websocket_error(
                StatusCode::INTERNAL_SERVER_ERROR,
                "api_error",
                "provider_mismatch",
                "validated subscription does not match the routed provider",
                None,
                stream_id(event).as_deref(),
            ));
        }
        return validated
            .for_dispatch_with_context(state, context)
            .await
            .map_err(|message| {
                websocket_error(
                    StatusCode::SERVICE_UNAVAILABLE,
                    "authentication_error",
                    "upstream_credential_unavailable",
                    &message,
                    None,
                    stream_id(event).as_deref(),
                )
            });
    }
    if let Some(router) = state.account_router.as_ref() {
        return router
            .select_subscription_where_authoritative(context, &state.subscription_cache, |_| true)
            .await
            .map_err(|error| {
                websocket_error(
                    StatusCode::SERVICE_UNAVAILABLE,
                    "account_unavailable",
                    "account_unavailable",
                    &error.to_string(),
                    None,
                    stream_id(event).as_deref(),
                )
            });
    }
    let reader = state.subscription_reader.as_ref().ok_or_else(|| {
        websocket_error(
            StatusCode::INTERNAL_SERVER_ERROR,
            "api_error",
            "upstream_credential_unavailable",
            "subscription credentials reader is not configured",
            None,
            stream_id(event).as_deref(),
        )
    })?;
    state
        .subscription_cache
        .register_reader(crate::credential_recovery_store::PRIMARY_ACCOUNT, reader);
    let token = state
        .subscription_cache
        .load_authoritative(provider, crate::credential_recovery_store::PRIMARY_ACCOUNT)
        .await
        .map_err(|message| {
            websocket_error(
                StatusCode::BAD_GATEWAY,
                "authentication_error",
                "upstream_credential_unavailable",
                &message,
                None,
                stream_id(event).as_deref(),
            )
        })?
        .ok_or_else(|| {
            websocket_error(
                StatusCode::BAD_GATEWAY,
                "authentication_error",
                "upstream_credential_unavailable",
                &format!("failed to read {provider} subscription credentials"),
                None,
                stream_id(event).as_deref(),
            )
        })?;
    Ok(SelectedSubscriptionAccount {
        name: crate::credential_recovery_store::PRIMARY_ACCOUNT.to_string(),
        token,
    })
}

fn reserve_turn(
    state: &AppState,
    claims: &crate::token::TokenClaims,
    event: &Value,
) -> Result<crate::usage::UsageTracker, Value> {
    let reserved = crate::token_reservation::estimate(event).total();
    state
        .token_manager
        .enforce_request_budget_reserving(&claims.sub, reserved)
        .map_err(|error| {
            websocket_error(
                StatusCode::TOO_MANY_REQUESTS,
                "rate_limit_error",
                "request_budget_exceeded",
                &error.client_message(),
                None,
                stream_id(event).as_deref(),
            )
        })?;
    Ok(crate::usage::ReservationGuard::new(
        state.token_manager.clone(),
        claims.sub.clone(),
        reserved,
    )
    .into_tracker())
}

fn websocket_request(target: &UpstreamTarget) -> Result<http::Request<()>, String> {
    let mut request = target
        .url
        .as_str()
        .into_client_request()
        .map_err(|error| format!("invalid upstream WebSocket URL: {error}"))?;
    for (name, value) in &target.headers {
        request.headers_mut().append(name, value.clone());
    }
    Ok(request)
}

fn target_state(state: &AppState, target: &UpstreamTarget) -> AppState {
    let mut routed = state.clone();
    // The request audit only exposes the public provider class; it never
    // records the credential, selected account, or request contents.
    routed.upstream_provider = target.provider;
    routed
}

fn parse_create_event(bytes: &[u8]) -> Result<Value, Value> {
    let value = serde_json::from_slice::<Value>(bytes).map_err(|_| {
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
    Ok(value)
}

fn validate_stream_id(event: &Value) -> Result<Option<String>, Value> {
    let Some(value) = event.get("stream_id") else {
        return Ok(None);
    };
    let Some(stream_id) = value.as_str() else {
        return Err(invalid_stream_id(None));
    };
    let valid = !stream_id.is_empty()
        && stream_id.chars().count() <= MAX_STREAM_ID_CHARS
        && stream_id.chars().all(|character| {
            character.is_ascii_alphanumeric() || matches!(character, '_' | '-' | '.')
        });
    if !valid {
        return Err(invalid_stream_id(Some(stream_id)));
    }
    Ok(Some(stream_id.to_string()))
}

fn invalid_stream_id(stream_id: Option<&str>) -> Value {
    websocket_error(
        StatusCode::BAD_REQUEST,
        "invalid_request_error",
        "invalid_stream_id",
        "The 'stream_id' field must be a non-empty string with at most 256 characters and may only contain letters, numbers, underscores, hyphens, and periods.",
        Some("stream_id"),
        stream_id,
    )
}

fn stream_id(event: &Value) -> Option<String> {
    event
        .get("stream_id")
        .and_then(Value::as_str)
        .map(str::to_string)
}

fn unsupported_bridge(provider: &str, stream_id: Option<&str>) -> Value {
    websocket_error(
        StatusCode::BAD_REQUEST,
        "invalid_request_error",
        "websocket_mode_unsupported",
        &format!(
            "Responses WebSocket mode requires a native OpenAI-compatible or Codex upstream; {provider} cannot preserve this protocol"
        ),
        None,
        stream_id,
    )
}

fn websocket_url(http_url: &str) -> Result<String, Value> {
    let mut url = url::Url::parse(http_url).map_err(|_| {
        websocket_error(
            StatusCode::BAD_GATEWAY,
            "api_error",
            "invalid_upstream_url",
            "the selected provider has an invalid upstream URL",
            None,
            None,
        )
    })?;
    let scheme = match url.scheme() {
        "http" => "ws",
        "https" => "wss",
        "ws" | "wss" => return Ok(url.into()),
        _ => {
            return Err(websocket_error(
                StatusCode::BAD_GATEWAY,
                "api_error",
                "invalid_upstream_url",
                "the selected provider does not use an HTTP or WebSocket URL",
                None,
                None,
            ));
        }
    };
    url.set_scheme(scheme).map_err(|()| {
        websocket_error(
            StatusCode::BAD_GATEWAY,
            "api_error",
            "invalid_upstream_url",
            "the selected provider URL cannot be used for WebSocket transport",
            None,
            None,
        )
    })?;
    Ok(url.into())
}

const fn namespace_path(namespace: Namespace) -> &'static str {
    match namespace {
        Namespace::OpenAi => "/api/services/openai/v1/responses",
        Namespace::Codex => "/api/services/codex/v1/responses",
    }
}

fn websocket_error(
    status: StatusCode,
    error_type: &str,
    code: &str,
    message: &str,
    param: Option<&str>,
    stream_id: Option<&str>,
) -> Value {
    let mut event = json!({
        "type": "error",
        "status": status.as_u16(),
        "error": {
            "type": error_type,
            "code": code,
            "message": message,
        }
    });
    if let Some(param) = param {
        event["error"]["param"] = Value::String(param.to_string());
    }
    if let Some(stream_id) = stream_id {
        event["stream_id"] = Value::String(stream_id.to_string());
    }
    event
}

fn response_as_websocket_error(response: Response) -> Value {
    let status = response.status();
    drop(response);
    websocket_error(
        status,
        "invalid_request_error",
        "request_rejected",
        "the Router rejected the WebSocket response.create event before inference",
        None,
        None,
    )
}

async fn fail_and_close(socket: &mut WebSocket, error: Value, code: u16) {
    let _ = socket.send(Message::Text(error.to_string().into())).await;
    let _ = socket
        .send(Message::Close(Some(CloseFrame {
            code,
            reason: "Responses WebSocket request rejected".into(),
        })))
        .await;
}

fn downstream_to_upstream(message: Message) -> tungstenite::Message {
    match message {
        Message::Text(text) => tungstenite::Message::Text(text.to_string().into()),
        Message::Binary(bytes) => tungstenite::Message::Binary(bytes.to_vec().into()),
        Message::Ping(bytes) => tungstenite::Message::Ping(bytes.to_vec().into()),
        Message::Pong(bytes) => tungstenite::Message::Pong(bytes.to_vec().into()),
        Message::Close(frame) => {
            tungstenite::Message::Close(frame.map(|frame| tungstenite::protocol::CloseFrame {
                code: frame.code.into(),
                reason: frame.reason.to_string().into(),
            }))
        }
    }
}

fn upstream_to_downstream(message: tungstenite::Message) -> Message {
    match message {
        tungstenite::Message::Text(text) => Message::Text(text.to_string().into()),
        tungstenite::Message::Binary(bytes) => Message::Binary(bytes.to_vec().into()),
        tungstenite::Message::Ping(bytes) => Message::Ping(bytes.to_vec().into()),
        tungstenite::Message::Pong(bytes) => Message::Pong(bytes.to_vec().into()),
        tungstenite::Message::Close(frame) => Message::Close(frame.map(|frame| CloseFrame {
            code: frame.code.into(),
            reason: frame.reason.to_string().into(),
        })),
        tungstenite::Message::Frame(_) => Message::Close(Some(CloseFrame {
            code: 1011,
            reason: "unexpected raw upstream frame".into(),
        })),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn first_event_must_be_response_create() {
        assert!(parse_create_event(br#"{"type":"response.create","model":"gpt-test"}"#).is_ok());
        let error = parse_create_event(br#"{"type":"response.cancel"}"#).unwrap_err();
        assert_eq!(error["error"]["code"], "invalid_websocket_event");
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
        assert!(validate_stream_id(&json!({"stream_id":"x".repeat(257)})).is_err());
    }

    #[test]
    fn maps_only_http_websocket_schemes() {
        assert_eq!(
            websocket_url("https://api.openai.example/v1/responses").unwrap(),
            "wss://api.openai.example/v1/responses"
        );
        assert_eq!(
            websocket_url("http://127.0.0.1:8080/v1/responses").unwrap(),
            "ws://127.0.0.1:8080/v1/responses"
        );
        assert!(websocket_url("file:///tmp/responses").is_err());
    }
}
