//! Loopback transport accepted by Codex's remote-control origin policy.

use std::collections::HashSet;

use axum::body::{Body, Bytes};
use axum::extract::ws::{CloseFrame, Message, WebSocket, WebSocketUpgrade};
use axum::extract::{FromRequestParts as _, Request, State};
use axum::http::{HeaderMap, HeaderName, Method, StatusCode};
use axum::response::{IntoResponse as _, Response};
use futures_util::{SinkExt as _, StreamExt as _};
use tokio::sync::oneshot;
use tokio_tungstenite::tungstenite;
use tokio_tungstenite::tungstenite::client::IntoClientRequest as _;

const BACKEND_PATH: &str = "/api/services/codex/backend-api";
const MAX_HTTP_BODY_BYTES: usize = 8 * 1024 * 1024;
const MAX_WEBSOCKET_MESSAGE_BYTES: usize = 16 * 1024 * 1024;
const CONNECT_TIMEOUT: std::time::Duration = std::time::Duration::from_secs(15);

#[derive(Clone)]
struct BridgeState {
    upstream_origin: String,
    health_path: String,
    client: reqwest::Client,
}

pub struct EphemeralBridge {
    backend_base_url: String,
    #[cfg(test)]
    health_url: String,
    shutdown: Option<oneshot::Sender<()>>,
    task: tokio::task::JoinHandle<()>,
}

impl EphemeralBridge {
    pub fn backend_base_url(&self) -> &str {
        &self.backend_base_url
    }

    #[cfg(test)]
    pub fn health_url(&self) -> &str {
        &self.health_url
    }
}

impl Drop for EphemeralBridge {
    fn drop(&mut self) {
        if let Some(shutdown) = self.shutdown.take() {
            let _ = shutdown.send(());
        }
        self.task.abort();
    }
}

pub fn required(router_origin: &str) -> Result<bool, String> {
    let url = reqwest::Url::parse(router_origin)
        .map_err(|error| format!("invalid Router URL: {error}"))?;
    if !matches!(url.scheme(), "http" | "https") || url.host_str().is_none() {
        return Err("Router URL must be an HTTP or HTTPS origin".into());
    }
    let loopback = match url.host() {
        Some(url::Host::Domain(host)) => host.eq_ignore_ascii_case("localhost"),
        Some(url::Host::Ipv4(address)) => address.is_loopback(),
        Some(url::Host::Ipv6(address)) => address.is_loopback(),
        None => false,
    };
    Ok(!loopback)
}

pub async fn start_ephemeral(upstream_origin: &str) -> Result<EphemeralBridge, String> {
    let upstream_origin = canonical_origin(upstream_origin)?;
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
        .await
        .map_err(|error| format!("could not bind the Codex loopback bridge: {error}"))?;
    let address = listener
        .local_addr()
        .map_err(|error| format!("could not read the Codex loopback bridge address: {error}"))?;
    let nonce = uuid::Uuid::new_v4().simple().to_string();
    let health_path = format!("/__link_assistant_router/codex_bridge/{nonce}");
    #[cfg(test)]
    let health_url = format!("http://{address}{health_path}");
    let state = BridgeState {
        upstream_origin,
        health_path,
        client: reqwest::Client::new(),
    };
    let app = axum::Router::new()
        .fallback(bridge_request)
        .with_state(state);
    let (shutdown, receiver) = oneshot::channel();
    let task = tokio::spawn(async move {
        let _ = axum::serve(listener, app)
            .with_graceful_shutdown(async move {
                let _ = receiver.await;
            })
            .await;
    });
    let origin = format!("http://{address}");
    Ok(EphemeralBridge {
        backend_base_url: format!("{origin}{BACKEND_PATH}"),
        #[cfg(test)]
        health_url,
        shutdown: Some(shutdown),
        task,
    })
}

fn canonical_origin(value: &str) -> Result<String, String> {
    let mut url =
        reqwest::Url::parse(value).map_err(|error| format!("invalid Router URL: {error}"))?;
    if !matches!(url.scheme(), "http" | "https") || url.host_str().is_none() {
        return Err("Router URL must be an HTTP or HTTPS origin".into());
    }
    if url.query().is_some() || url.fragment().is_some() {
        return Err("Router URL must not contain a query or fragment".into());
    }
    let path = url.path().trim_end_matches('/').to_string();
    url.set_path(&path);
    Ok(url.to_string().trim_end_matches('/').to_string())
}

async fn bridge_request(State(state): State<BridgeState>, request: Request) -> Response {
    let method = request.method().clone();
    let uri = request.uri().clone();
    if method == Method::GET && uri.path() == state.health_path {
        return (StatusCode::OK, "ok").into_response();
    }
    if !uri.path().starts_with(&format!("{BACKEND_PATH}/")) {
        return StatusCode::NOT_FOUND.into_response();
    }
    let headers = request.headers().clone();
    let target = bridge_target(&state, &headers, &uri);
    if is_websocket(&headers) {
        return upgrade_websocket(request, target).await;
    }
    let Ok(body) = axum::body::to_bytes(request.into_body(), MAX_HTTP_BODY_BYTES).await else {
        return StatusCode::PAYLOAD_TOO_LARGE.into_response();
    };
    relay_http(&method, body, target).await
}

struct BridgeTarget {
    client: reqwest::Client,
    url: String,
    headers: HeaderMap,
}

fn bridge_target(state: &BridgeState, incoming: &HeaderMap, uri: &axum::http::Uri) -> BridgeTarget {
    let mut url = format!("{}{}", state.upstream_origin, uri.path());
    if let Some(query) = uri.query() {
        url.push('?');
        url.push_str(query);
    }
    BridgeTarget {
        client: state.client.clone(),
        url,
        headers: request_headers(incoming),
    }
}

async fn relay_http(method: &Method, body: Bytes, target: BridgeTarget) -> Response {
    let upstream = target
        .client
        .request(
            reqwest::Method::from_bytes(method.as_str().as_bytes()).expect("valid HTTP method"),
            target.url,
        )
        .headers(target.headers)
        .body(body)
        .send()
        .await;
    let Ok(upstream) = upstream else {
        return StatusCode::BAD_GATEWAY.into_response();
    };
    let status = StatusCode::from_u16(upstream.status().as_u16())
        .unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
    let headers = crate::proxy::relay_response_headers(upstream.headers());
    let stream = upstream.bytes_stream();
    let mut response = Response::new(Body::from_stream(stream));
    *response.status_mut() = status;
    *response.headers_mut() = headers;
    response
}

fn request_headers(incoming: &HeaderMap) -> HeaderMap {
    let connection_headers: HashSet<HeaderName> = incoming
        .get_all("connection")
        .iter()
        .filter_map(|value| value.to_str().ok())
        .flat_map(|value| value.split(','))
        .filter_map(|name| HeaderName::from_bytes(name.trim().as_bytes()).ok())
        .collect();
    let mut headers = HeaderMap::new();
    for (name, value) in incoming {
        if !transport_header(name.as_str()) && !connection_headers.contains(name) {
            headers.append(name.clone(), value.clone());
        }
    }
    headers
}

fn transport_header(name: &str) -> bool {
    matches!(
        name,
        "host"
            | "connection"
            | "proxy-connection"
            | "keep-alive"
            | "transfer-encoding"
            | "upgrade"
            | "te"
            | "trailer"
            | "content-length"
            | "accept-encoding"
            | "forwarded"
            | "x-forwarded-for"
            | "x-forwarded-host"
            | "x-forwarded-proto"
            | "x-real-ip"
            | "sec-websocket-key"
            | "sec-websocket-version"
            | "sec-websocket-extensions"
            | "sec-websocket-accept"
    )
}

fn is_websocket(headers: &HeaderMap) -> bool {
    headers
        .get("upgrade")
        .and_then(|value| value.to_str().ok())
        .is_some_and(|value| value.eq_ignore_ascii_case("websocket"))
}

async fn upgrade_websocket(request: Request, target: BridgeTarget) -> Response {
    let (mut parts, _) = request.into_parts();
    let upgrade = match WebSocketUpgrade::from_request_parts(&mut parts, &()).await {
        Ok(upgrade) => upgrade,
        Err(rejection) => return rejection.into_response(),
    };
    upgrade
        .max_message_size(MAX_WEBSOCKET_MESSAGE_BYTES)
        .max_frame_size(MAX_WEBSOCKET_MESSAGE_BYTES)
        .on_upgrade(move |downstream| websocket_session(downstream, target))
}

async fn websocket_session(mut downstream: WebSocket, target: BridgeTarget) {
    let Ok(mut request) = websocket_url(&target.url)
        .and_then(|url| url.into_client_request().map_err(|error| error.to_string()))
    else {
        close(&mut downstream, 1011, "invalid Router WebSocket URL").await;
        return;
    };
    for (name, value) in target.headers {
        if let Some(name) = name {
            request.headers_mut().append(name, value);
        }
    }
    let config = tungstenite::protocol::WebSocketConfig::default()
        .max_message_size(Some(MAX_WEBSOCKET_MESSAGE_BYTES))
        .max_frame_size(Some(MAX_WEBSOCKET_MESSAGE_BYTES))
        .max_write_buffer_size(MAX_WEBSOCKET_MESSAGE_BYTES.saturating_mul(2));
    let connected = tokio::time::timeout(
        CONNECT_TIMEOUT,
        tokio_tungstenite::connect_async_with_config(request, Some(config), false),
    )
    .await;
    let Ok(Ok((mut upstream, _))) = connected else {
        close(&mut downstream, 1011, "Router WebSocket connection failed").await;
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
                    close(&mut downstream, 1011, "Router WebSocket disconnected").await;
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
            reason: "unexpected raw Router frame".into(),
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
