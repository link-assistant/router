//! Byte-transparent native vendor service forwarding.
//!
//! These endpoints are provider-owned resources and control-plane operations,
//! not inference translations. Router authenticates and binds an upstream
//! account, swaps only credentials, and leaves request/response bytes opaque.

use axum::body::{Body, Bytes};
use axum::extract::ws::{CloseFrame, Message, WebSocket, WebSocketUpgrade};
use axum::extract::{FromRequestParts, Request, State};
use axum::http::{HeaderMap, HeaderValue, Method, StatusCode};
use axum::response::{IntoResponse, Response};
use futures_util::{SinkExt, StreamExt};
use sha2::{Digest as _, Sha256};
use tokio_tungstenite::tungstenite;
use tokio_tungstenite::tungstenite::client::IntoClientRequest as _;

use crate::app_state::AppState;
use crate::clients::ClientKind;
use crate::route_contract::{RouteId, route_for_path};
use crate::subscription::SubscriptionProvider;

const CONNECT_TIMEOUT: std::time::Duration = std::time::Duration::from_secs(15);

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum Service {
    OpenAi,
    Anthropic,
    Codex,
    CodexBackend,
}

pub struct Target {
    pub client: reqwest::Client,
    pub url: String,
    pub headers: HeaderMap,
}

pub async fn openai(State(state): State<AppState>, request: Request) -> Response {
    forward(state, request, Service::OpenAi).await
}

pub async fn anthropic(State(state): State<AppState>, request: Request) -> Response {
    forward(state, request, Service::Anthropic).await
}

pub async fn codex(State(state): State<AppState>, request: Request) -> Response {
    forward(state, request, Service::Codex).await
}

pub async fn codex_backend(State(state): State<AppState>, request: Request) -> Response {
    forward(state, request, Service::CodexBackend).await
}

async fn forward(state: AppState, request: Request, service: Service) -> Response {
    let method = request.method().clone();
    let uri = request.uri().clone();
    let path = uri.path();
    let Some(route) = route_for_path(&method, path).filter(|route| route_belongs(**route, service))
    else {
        return not_found();
    };
    if service == Service::CodexBackend && crate::codex_remote_control::is_remote_control_path(path)
    {
        return crate::codex_remote_control::forward(state, request).await;
    }
    let headers = request.headers().clone();
    let claims = match crate::proxy::authenticate_client_error(&state, &headers) {
        Ok(claims) => claims,
        Err(error) => return error.render(route.dialect),
    };
    if service == Service::CodexBackend {
        let supported = crate::proxy::extract_client_token(&headers)
            .is_some_and(|token| token.starts_with(crate::token::CODEX_TOKEN_PREFIX));
        if !supported {
            return error(
                StatusCode::UNAUTHORIZED,
                "authentication_error",
                "Codex backend routes require the paired Router-issued at- token",
            );
        }
    }
    if path == "/api/services/codex/v1/user-auth-credential/whoami" {
        return whoami(&state, &headers, &claims).await;
    }
    if path == "/api/services/openai/v1/realtime/client_secrets" {
        return error(
            StatusCode::NOT_IMPLEMENTED,
            "unsupported_operation",
            "Router does not expose upstream Realtime client secrets",
        );
    }
    if let Err(response) = authorize_service(&state, &claims, service) {
        return response;
    }
    if let Err(error) = state.token_manager.enforce_request_budget(&claims.sub) {
        return crate::token_http::budget_error_response(&error);
    }
    if method == Method::GET && is_websocket(&headers) {
        let target = match target(&state, &headers, &claims, service, &uri, None).await {
            Ok(target) => target,
            Err(response) => return response,
        };
        return upgrade_websocket(state, request, target).await;
    }
    let Ok(body) = axum::body::to_bytes(request.into_body(), state.max_proxy_request_bytes).await
    else {
        return error(
            StatusCode::PAYLOAD_TOO_LARGE,
            "invalid_request_error",
            "request body exceeds the proxy limit",
        );
    };
    let target = match target(&state, &headers, &claims, service, &uri, Some(&body)).await {
        Ok(target) => target,
        Err(response) => return response,
    };
    if let Some(operation) = codex_history_notes_operation(path) {
        crate::audit::record_control_plane_request(&state, &claims, "codex", operation);
    }
    relay_http(&state, &method, body, target).await
}

const fn route_belongs(route: crate::route_contract::RouteSpec, service: Service) -> bool {
    matches!(
        (route.id, service),
        (RouteId::NativeOpenAi, Service::OpenAi)
            | (RouteId::NativeAnthropic, Service::Anthropic)
            | (RouteId::NativeCodex, Service::Codex)
            | (RouteId::NativeCodexBackend, Service::CodexBackend)
    )
}

fn authorize_service(
    state: &AppState,
    claims: &crate::token::TokenClaims,
    service: Service,
) -> Result<(), Response> {
    let (client, _) = crate::client_policy::bound_client(claims)
        .map_err(|message| error(StatusCode::FORBIDDEN, "permission_error", &message))?;
    match service {
        Service::Codex | Service::CodexBackend if client != ClientKind::Codex => Err(error(
            StatusCode::FORBIDDEN,
            "permission_error",
            "the Codex service requires a Codex-bound Router token",
        )),
        Service::Anthropic if client != ClientKind::ClaudeCode => Err(error(
            StatusCode::FORBIDDEN,
            "permission_error",
            "the Anthropic native service requires a Claude-bound Router token",
        )),
        Service::OpenAi => {
            let provider = crate::provider_proxy::resolve_openai_compatible_provider(state)
                .map_err(|_| unavailable("the native OpenAI provider is unavailable"))?;
            if provider.supports_client(client) {
                Ok(())
            } else {
                Err(error(
                    StatusCode::FORBIDDEN,
                    "permission_error",
                    "the selected OpenAI provider does not support this client",
                ))
            }
        }
        _ => Ok(()),
    }
}

async fn whoami(
    state: &AppState,
    headers: &HeaderMap,
    claims: &crate::token::TokenClaims,
) -> Response {
    if crate::proxy::extract_client_token(headers)
        .is_none_or(|token| !token.starts_with(crate::token::CODEX_TOKEN_PREFIX))
    {
        return error(
            StatusCode::UNAUTHORIZED,
            "authentication_error",
            "Codex whoami requires the paired Router-issued at- token",
        );
    }
    if let Err(response) = authorize_service(state, claims, Service::Codex) {
        return response;
    }
    let selected = match selected_subscription(
        state,
        headers,
        claims,
        SubscriptionProvider::Codex,
        None,
    )
    .await
    {
        Ok(selected) => selected,
        Err(response) => return response,
    };
    let (_, principal) = crate::client_policy::bound_client(claims).expect("authorized above");
    let user = opaque_handle("usr", principal);
    let account = opaque_handle("acct", &format!("{principal}:{}", selected.name));
    axum::Json(serde_json::json!({
        "email": serde_json::Value::Null,
        "chatgpt_user_id": user,
        "chatgpt_account_id": account,
        // These fields are required by Codex's public PAT metadata schema.
        // Router has no need to reveal the subscriber's real plan or workspace
        // classification, so it supplies schema-valid conservative values.
        "chatgpt_plan_type": "unknown",
        "chatgpt_account_is_fedramp": false,
    }))
    .into_response()
}

fn opaque_handle(prefix: &str, value: &str) -> String {
    let digest = hex::encode(Sha256::digest(value.as_bytes()));
    format!("{prefix}_{}", &digest[..24])
}

async fn target(
    state: &AppState,
    incoming: &HeaderMap,
    claims: &crate::token::TokenClaims,
    service: Service,
    uri: &axum::http::Uri,
    body: Option<&Bytes>,
) -> Result<Target, Response> {
    match service {
        Service::OpenAi => provider_target(state, incoming, uri),
        Service::Anthropic => {
            subscription_target(
                state,
                incoming,
                claims,
                SubscriptionProvider::Claude,
                service,
                uri,
                body,
            )
            .await
        }
        Service::Codex | Service::CodexBackend => {
            subscription_target(
                state,
                incoming,
                claims,
                SubscriptionProvider::Codex,
                service,
                uri,
                body,
            )
            .await
        }
    }
}

fn provider_target(
    state: &AppState,
    incoming: &HeaderMap,
    uri: &axum::http::Uri,
) -> Result<Target, Response> {
    let provider = crate::provider_proxy::resolve_openai_compatible_provider(state)
        .map_err(|_| unavailable("the native OpenAI provider is unavailable"))?;
    if provider.kind != crate::providers::ProviderKind::OpenAICompatible {
        return Err(unavailable(
            "the selected provider does not implement native OpenAI resource APIs",
        ));
    }
    let key = provider
        .api_key
        .as_deref()
        .ok_or_else(|| unavailable("the native OpenAI provider credential is unavailable"))?;
    let path = strip_service_path(uri, Service::OpenAi);
    Ok(Target {
        client: state.client.clone(),
        url: crate::provider_proxy::join_openai_compatible_url(&provider.base_url, &path),
        headers: crate::proxy::native_request_headers(incoming, key),
    })
}

async fn subscription_target(
    state: &AppState,
    incoming: &HeaderMap,
    claims: &crate::token::TokenClaims,
    provider: SubscriptionProvider,
    service: Service,
    uri: &axum::http::Uri,
    body: Option<&Bytes>,
) -> Result<Target, Response> {
    let selected = selected_subscription(state, incoming, claims, provider, body).await?;
    let base = state
        .subscription_base_url
        .clone()
        .unwrap_or_else(|| selected.token.base_url(provider));
    let path = strip_service_path(uri, service);
    let url = if service == Service::CodexBackend {
        let root = base
            .strip_suffix("/codex")
            .unwrap_or(&base)
            .trim_end_matches('/');
        format!("{root}{path}")
    } else {
        crate::subscription_proxy::join_subscription_url(provider, &base, &path)
    };
    let mut headers = crate::proxy::native_request_headers(incoming, &selected.token.access_token);
    if provider == SubscriptionProvider::Codex {
        if let Some(account_id) = selected.token.account_id.as_deref()
            && let Ok(value) = HeaderValue::from_str(account_id)
        {
            headers.insert("chatgpt-account-id", value);
        }
        for (name, value) in crate::codex_identity::headers(selected.token.account_id.as_deref()) {
            if let Some(name) = name
                && name != "chatgpt-account-id"
                && !headers.contains_key(&name)
            {
                headers.insert(name, value);
            }
        }
    }
    Ok(Target {
        client: crate::upstream_client::subscription_client(
            &state.client,
            provider,
            state.subscription_base_url.is_some(),
        )
        .clone(),
        url,
        headers,
    })
}

fn strip_service_path(uri: &axum::http::Uri, service: Service) -> String {
    let prefix = match service {
        Service::OpenAi => "/api/services/openai",
        Service::Anthropic => "/api/services/anthropic",
        Service::Codex => "/api/services/codex",
        Service::CodexBackend => "/api/services/codex/backend-api",
    };
    let mut path = uri
        .path()
        .strip_prefix(prefix)
        .unwrap_or_else(|| uri.path())
        .to_string();
    if service == Service::CodexBackend {
        // The configured ChatGPT root already ends in `/backend-api`.
    } else if service == Service::Codex && !path.starts_with("/v1/") {
        path.insert_str(0, "/v1");
    }
    if let Some(query) = uri.query() {
        path.push('?');
        path.push_str(query);
    }
    path
}

fn codex_account_pin(
    state: &AppState,
    headers: &HeaderMap,
    principal: &str,
) -> Result<Option<String>, Response> {
    let values = headers.get_all("chatgpt-account-id");
    let mut values = values.iter();
    let Some(handle) = values.next() else {
        return Ok(None);
    };
    if values.next().is_some() {
        return Err(error(
            StatusCode::FORBIDDEN,
            "permission_error",
            "exactly one Router-issued Codex account handle is required",
        ));
    }
    let handle = handle.to_str().map_err(|_| {
        error(
            StatusCode::FORBIDDEN,
            "permission_error",
            "the Codex account handle is invalid",
        )
    })?;
    let accounts = state
        .account_router
        .as_ref()
        .filter(|router| router.provider() == SubscriptionProvider::Codex)
        .map(crate::accounts::AccountRouter::subscription_readers)
        .map_or_else(
            || vec![crate::credential_recovery_store::PRIMARY_ACCOUNT.to_string()],
            |accounts| {
                accounts
                    .into_iter()
                    .map(|(name, _)| name)
                    .collect::<Vec<_>>()
            },
        );
    accounts
        .into_iter()
        .find(|account| opaque_handle("acct", &format!("{principal}:{account}")) == handle)
        .map(Some)
        .ok_or_else(|| {
            error(
                StatusCode::FORBIDDEN,
                "permission_error",
                "the Codex account handle is not valid for this Router principal",
            )
        })
}

fn codex_history_notes_operation(path: &str) -> Option<&'static str> {
    match path {
        "/api/services/codex/v1/alpha/history/v2/list_windows" => {
            Some("codex.history.list_windows")
        }
        "/api/services/codex/v1/alpha/history/v2/list_items" => Some("codex.history.list_items"),
        "/api/services/codex/v1/alpha/history/v2/read_item" => Some("codex.history.read_item"),
        "/api/services/codex/v1/alpha/history/v2/search_contents" => {
            Some("codex.history.search_contents")
        }
        "/api/services/codex/v1/alpha/notes/v2/thread_hint" => Some("codex.notes.thread_hint"),
        "/api/services/codex/v1/alpha/notes/v2/list_files_by_prefix" => {
            Some("codex.notes.list_files_by_prefix")
        }
        "/api/services/codex/v1/alpha/notes/v2/read_file" => Some("codex.notes.read_file"),
        "/api/services/codex/v1/alpha/notes/v2/search_contents" => {
            Some("codex.notes.search_contents")
        }
        "/api/services/codex/v1/alpha/notes/v2/append_to_file" => {
            Some("codex.notes.append_to_file")
        }
        "/api/services/codex/v1/alpha/notes/v2/write_file" => Some("codex.notes.write_file"),
        _ => None,
    }
}

pub async fn selected_subscription(
    state: &AppState,
    headers: &HeaderMap,
    claims: &crate::token::TokenClaims,
    provider: SubscriptionProvider,
    body: Option<&Bytes>,
) -> Result<crate::accounts::SelectedSubscriptionAccount, Response> {
    let (client, principal) = crate::client_policy::bound_client(claims)
        .map_err(|message| error(StatusCode::FORBIDDEN, "permission_error", &message))?;
    let protocol = if provider == SubscriptionProvider::Claude {
        crate::client_policy::ClientProtocol::AnthropicMessages
    } else {
        crate::client_policy::ClientProtocol::OpenAIResponses
    };
    let policy = state
        .provider_store
        .subscription_entitlement_policy()
        .map_err(|_| unavailable("subscription policy is unavailable"))?;
    if policy.decide(Some(client), provider, protocol)
        != crate::client_policy::EntitlementDecision::Native
    {
        return Err(error(
            StatusCode::FORBIDDEN,
            "permission_error",
            "native service access is not entitled for this client and provider",
        ));
    }
    let pinned = state
        .token_manager
        .account_for(&claims.sub)
        .map_err(|_| unavailable("token account binding is unavailable"))?;
    let handle_pin = if provider == SubscriptionProvider::Codex {
        codex_account_pin(state, headers, principal)?
    } else {
        None
    };
    let pinned = match (pinned, handle_pin) {
        (Some(token), Some(handle)) if token != handle => {
            return Err(error(
                StatusCode::FORBIDDEN,
                "permission_error",
                "the Codex account handle does not match this Router token",
            ));
        }
        (Some(token), _) => Some(token),
        (None, handle) => handle,
    };
    let routing_body = body
        .and_then(|body| serde_json::from_slice::<serde_json::Value>(body).ok())
        .unwrap_or_else(|| serde_json::json!({}));
    let context = crate::proxy::request_routing_context(headers, &routing_body, pinned);
    let mut selected = if let Some(router) = state
        .account_router
        .as_ref()
        .filter(|router| router.provider() == provider)
    {
        router
            .select_subscription_where_authoritative(&context, &state.subscription_cache, |_| true)
            .await
            .map_err(|_| unavailable("the bound subscription account is unavailable"))?
    } else {
        if context
            .pinned_account
            .as_deref()
            .is_some_and(|name| name != crate::credential_recovery_store::PRIMARY_ACCOUNT)
        {
            return Err(unavailable("the bound subscription account is unavailable"));
        }
        let reader = state
            .subscription_readers
            .iter()
            .find(|reader| reader.provider() == provider)
            .or_else(|| {
                state
                    .subscription_reader
                    .as_ref()
                    .filter(|reader| reader.provider() == provider)
            })
            .ok_or_else(|| unavailable("the native subscription is not configured"))?;
        let account = crate::credential_recovery_store::PRIMARY_ACCOUNT;
        state.subscription_cache.register_reader(account, reader);
        let token = state
            .subscription_cache
            .load_authoritative(provider, account)
            .await
            .map_err(|_| unavailable("the native subscription credential is unreadable"))?
            .ok_or_else(|| unavailable("the native subscription credential is absent"))?;
        crate::accounts::SelectedSubscriptionAccount {
            name: account.to_string(),
            token,
        }
    };
    selected.token = state
        .subscription_cache
        .get_fresh_loaded(
            &state.client,
            provider,
            &selected.name,
            selected.token,
            chrono::Utc::now().timestamp_millis(),
        )
        .await
        .map_err(|_| unavailable("the native subscription credential cannot refresh"))?;
    Ok(selected)
}

pub async fn relay_http(
    state: &AppState,
    method: &Method,
    body: Bytes,
    target: Target,
) -> Response {
    let request = target
        .client
        .request(
            reqwest::Method::from_bytes(method.as_str().as_bytes()).expect("valid HTTP method"),
            target.url,
        )
        .headers(target.headers)
        .body(body.clone());
    let Ok(upstream) = request.send().await else {
        return unavailable("native service upstream request failed");
    };
    let status = StatusCode::from_u16(upstream.status().as_u16())
        .unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
    let headers = crate::proxy::relay_response_headers(upstream.headers());
    let metrics = std::sync::Arc::clone(&state.metrics);
    let stream = upstream.bytes_stream().map(move |chunk| {
        if let Ok(bytes) = &chunk {
            metrics.record_bytes(0, bytes.len() as u64);
        }
        chunk
    });
    let mut response = Response::new(Body::from_stream(stream));
    *response.status_mut() = status;
    *response.headers_mut() = headers;
    state.metrics.record_bytes(body.len() as u64, 0);
    response
}

fn is_websocket(headers: &HeaderMap) -> bool {
    headers
        .get("upgrade")
        .and_then(|value| value.to_str().ok())
        .is_some_and(|value| value.eq_ignore_ascii_case("websocket"))
}

pub async fn upgrade_websocket(state: AppState, request: Request, target: Target) -> Response {
    let (mut parts, _) = request.into_parts();
    let upgrade = match WebSocketUpgrade::from_request_parts(&mut parts, &state).await {
        Ok(upgrade) => upgrade,
        Err(rejection) => return rejection.into_response(),
    };
    let limit = state.max_proxy_request_bytes;
    upgrade
        .max_message_size(limit)
        .max_frame_size(limit)
        .on_upgrade(move |downstream| websocket_session(downstream, target, limit))
}

async fn websocket_session(mut downstream: WebSocket, target: Target, limit: usize) {
    let Ok(mut request) = websocket_url(&target.url)
        .and_then(|url| url.into_client_request().map_err(|error| error.to_string()))
    else {
        close(&mut downstream, 1011, "invalid upstream WebSocket URL").await;
        return;
    };
    for (name, value) in target.headers {
        if let Some(name) = name {
            request.headers_mut().append(name, value);
        }
    }
    let config = tungstenite::protocol::WebSocketConfig::default()
        .max_message_size(Some(limit))
        .max_frame_size(Some(limit))
        .max_write_buffer_size(limit.saturating_mul(2));
    let connected = tokio::time::timeout(
        CONNECT_TIMEOUT,
        tokio_tungstenite::connect_async_with_config(request, Some(config), false),
    )
    .await;
    let Ok(Ok((mut upstream, _))) = connected else {
        close(
            &mut downstream,
            1011,
            "upstream WebSocket connection failed",
        )
        .await;
        return;
    };
    loop {
        tokio::select! {
            message = downstream.next() => {
                let Some(Ok(message)) = message else {
                    let _ = upstream.close(None).await;
                    break;
                };
                let closes = matches!(message, Message::Close(_));
                if upstream.send(downstream_message(message)).await.is_err() || closes {
                    break;
                }
            }
            message = upstream.next() => {
                let Some(Ok(message)) = message else {
                    close(&mut downstream, 1011, "upstream WebSocket disconnected").await;
                    break;
                };
                let closes = matches!(message, tungstenite::Message::Close(_));
                if downstream.send(upstream_message(message)).await.is_err() || closes {
                    break;
                }
            }
        }
    }
}

fn downstream_message(message: Message) -> tungstenite::Message {
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

fn upstream_message(message: tungstenite::Message) -> Message {
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

async fn close(socket: &mut WebSocket, code: u16, reason: &'static str) {
    let _ = socket
        .send(Message::Close(Some(CloseFrame {
            code,
            reason: reason.into(),
        })))
        .await;
}

fn websocket_url(url: &str) -> Result<String, String> {
    let mut url = reqwest::Url::parse(url).map_err(|error| error.to_string())?;
    let scheme = match url.scheme() {
        "https" => "wss",
        "http" => "ws",
        _ => return Err("unsupported WebSocket scheme".into()),
    };
    url.set_scheme(scheme)
        .map_err(|()| "could not set WebSocket scheme".to_string())?;
    Ok(url.to_string())
}

fn unavailable(message: &str) -> Response {
    error(StatusCode::SERVICE_UNAVAILABLE, "api_error", message)
}

fn not_found() -> Response {
    error(StatusCode::NOT_FOUND, "not_found_error", "route not found")
}

fn error(status: StatusCode, error_type: &str, message: &str) -> Response {
    crate::api_error::PresentedError {
        status,
        error_type,
        message,
    }
    .render(crate::api_error::ApiDialect::OpenAi)
}

#[cfg(test)]
mod tests {
    use super::*;
    use http_body_util::BodyExt as _;
    use std::sync::atomic::{AtomicUsize, Ordering};
    use std::sync::{Arc, Mutex};

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

    #[tokio::test]
    async fn history_notes_authentication_precedes_body_handling() {
        let data = tempfile::tempdir().unwrap();
        let mut state = AppState::for_tests(data.path());
        state.max_proxy_request_bytes = 1;
        let request = Request::builder()
            .method(Method::POST)
            .uri("/api/services/codex/v1/alpha/notes/v2/read_file")
            .body(Body::from("private body larger than the limit"))
            .unwrap();
        let response = codex(State(state), request).await;
        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }

    #[tokio::test]
    async fn history_notes_relay_is_byte_transparent_private_and_account_bound() {
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
        let token =
            crate::model_routing::tests::bound_client_token(&state, ClientKind::Codex, None);
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
            serde_json::from_slice(&whoami.into_body().collect().await.unwrap().to_bytes())
                .unwrap();
        let account_handle = whoami["chatgpt_account_id"].as_str().unwrap();
        assert!(account_handle.starts_with("acct_"));
        assert_eq!(whoami["chatgpt_plan_type"], "unknown");
        assert_eq!(whoami["chatgpt_account_is_fedramp"], false);
        assert!(!whoami.to_string().contains("upstream-account"));

        let request_bytes = Bytes::from_static(
            br#"{ "path":"private-notes.md", "future":{"preserve":true}, "context":{"session_id":"private-session","current_agent_name":"/root/private-agent"} }"#,
        );
        let request = Request::builder()
            .method(Method::POST)
            .uri("/api/services/codex/v1/alpha/notes/v2/read_file?view=raw")
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
        let response = codex(State(state.clone()), request).await;
        assert_eq!(response.status(), StatusCode::OK);
        assert_eq!(response.headers()["x-request-id"], "req-public");
        assert_eq!(response.headers()["x-ratelimit-remaining-requests"], "19");
        assert_eq!(
            response.into_body().collect().await.unwrap().to_bytes(),
            response_bytes
        );

        let (uri, headers, body) = {
            let requests = captured.lock().unwrap();
            assert_eq!(requests.len(), 1);
            requests[0].clone()
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
        let invalid = codex(State(state), invalid).await;
        assert_eq!(invalid.status(), StatusCode::FORBIDDEN);
        assert_eq!(captured.lock().unwrap().len(), 1);

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
        server.abort();
    }

    #[tokio::test]
    async fn ambiguous_note_mutation_is_returned_once_and_never_replayed() {
        let calls = Arc::new(AtomicUsize::new(0));
        let upstream_calls = Arc::clone(&calls);
        let upstream = axum::Router::new().fallback(move || {
            let calls = Arc::clone(&upstream_calls);
            async move {
                calls.fetch_add(1, Ordering::Relaxed);
                (
                    StatusCode::SERVICE_UNAVAILABLE,
                    [
                        ("content-type", "application/json"),
                        ("x-request-id", "req-ambiguous"),
                    ],
                    r#"{ "error" : { "private" : "ambiguous" } }"#,
                )
            }
        });
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let origin = format!("http://{}", listener.local_addr().unwrap());
        let server = tokio::spawn(async move { axum::serve(listener, upstream).await.unwrap() });

        let data = tempfile::tempdir().unwrap();
        let codex_home = tempfile::tempdir().unwrap();
        std::fs::write(
            codex_home.path().join("auth.json"),
            r#"{"tokens":{"access_token":"upstream","account_id":"account"}}"#,
        )
        .unwrap();
        let reader = crate::subscription::SubscriptionReader::new(
            SubscriptionProvider::Codex,
            codex_home.path(),
        );
        let mut state = AppState::for_tests(data.path());
        state.upstream_provider = crate::config::UpstreamProvider::Codex;
        state.subscription_base_url = Some(origin);
        state.subscription_reader = Some(reader.clone());
        state.subscription_readers = vec![reader];
        let token =
            crate::model_routing::tests::bound_client_token(&state, ClientKind::Codex, None);
        let request = Request::builder()
            .method(Method::POST)
            .uri("/api/services/codex/v1/alpha/notes/v2/append_to_file")
            .header("authorization", format!("Bearer {token}"))
            .body(Body::from(r#"{"path":"private","text":"private"}"#))
            .unwrap();
        let response = codex(State(state), request).await;
        assert_eq!(response.status(), StatusCode::SERVICE_UNAVAILABLE);
        assert_eq!(response.headers()["x-request-id"], "req-ambiguous");
        assert_eq!(
            response.into_body().collect().await.unwrap().to_bytes(),
            r#"{ "error" : { "private" : "ambiguous" } }"#
        );
        assert_eq!(calls.load(Ordering::Relaxed), 1);
        server.abort();
    }
}
