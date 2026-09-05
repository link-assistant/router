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

struct Target {
    client: reqwest::Client,
    url: String,
    headers: HeaderMap,
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
    let target = match target(&state, &headers, &claims, service, &uri).await {
        Ok(target) => target,
        Err(response) => return response,
    };
    if method == Method::GET && is_websocket(&headers) {
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
    let selected =
        match selected_subscription(state, headers, claims, SubscriptionProvider::Codex).await {
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
        "chatgpt_plan_type": serde_json::Value::Null,
        "chatgpt_account_is_fedramp": serde_json::Value::Null,
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
) -> Result<Target, Response> {
    let selected = selected_subscription(state, incoming, claims, provider).await?;
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

async fn selected_subscription(
    state: &AppState,
    headers: &HeaderMap,
    claims: &crate::token::TokenClaims,
    provider: SubscriptionProvider,
) -> Result<crate::accounts::SelectedSubscriptionAccount, Response> {
    let (client, _) = crate::client_policy::bound_client(claims)
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
    let context = crate::proxy::request_routing_context(headers, &serde_json::json!({}), pinned);
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

async fn relay_http(state: &AppState, method: &Method, body: Bytes, target: Target) -> Response {
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
    let stream = upstream.bytes_stream();
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

async fn upgrade_websocket(state: AppState, request: Request, target: Target) -> Response {
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
