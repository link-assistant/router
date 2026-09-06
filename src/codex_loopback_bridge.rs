//! Loopback transport accepted by Codex's remote-control origin policy.

use std::collections::HashSet;
use std::path::{Path, PathBuf};
use std::process::Stdio;
use std::time::Duration;

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
const STATE_VERSION: u8 = 1;
const HEALTH_HEADER: &str = "x-link-assistant-router-codex-bridge";
const DAEMON_MARKER_ENV: &str = "LINK_ASSISTANT_ROUTER_INTERNAL_CODEX_BRIDGE";
const DAEMON_UPSTREAM_ENV: &str = "LINK_ASSISTANT_ROUTER_INTERNAL_CODEX_BRIDGE_UPSTREAM";
const DAEMON_STATE_ENV: &str = "LINK_ASSISTANT_ROUTER_INTERNAL_CODEX_BRIDGE_STATE";
const DAEMON_NONCE_ENV: &str = "LINK_ASSISTANT_ROUTER_INTERNAL_CODEX_BRIDGE_NONCE";
const DAEMON_LISTEN_ENV: &str = "LINK_ASSISTANT_ROUTER_INTERNAL_CODEX_BRIDGE_LISTEN";
const START_TIMEOUT: Duration = Duration::from_secs(5);
const STOP_TIMEOUT: Duration = Duration::from_secs(3);
const POLL_INTERVAL: Duration = Duration::from_millis(25);

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

#[derive(Clone, Debug, Eq, PartialEq, serde::Deserialize, serde::Serialize)]
struct PersistentState {
    version: u8,
    pid: u32,
    upstream_origin: String,
    loopback_origin: String,
    nonce: String,
}

pub struct PersistentBridge {
    backend_base_url: String,
    state_path: PathBuf,
    state: PersistentState,
    started: bool,
    _lock: crate::durable_file::FileLockGuard,
}

impl PersistentBridge {
    #[must_use]
    pub fn backend_base_url(&self) -> &str {
        &self.backend_base_url
    }

    pub fn commit(mut self) {
        self.started = false;
    }

    pub async fn rollback(mut self) -> Result<(), String> {
        if self.started {
            stop_state(&self.state_path, &self.state).await?;
            self.started = false;
        }
        Ok(())
    }
}

impl Drop for PersistentBridge {
    fn drop(&mut self) {
        if self.started {
            let _ = signal_terminate(self.state.pid);
        }
    }
}

pub struct DaemonRequest {
    upstream_origin: String,
    state_path: PathBuf,
    nonce: String,
    listen: std::net::SocketAddr,
}

impl EphemeralBridge {
    #[must_use]
    pub fn backend_base_url(&self) -> &str {
        &self.backend_base_url
    }

    #[cfg(test)]
    #[must_use]
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

/// Recognize only the complete environment passed to an owned bridge child.
pub fn daemon_request_from_env() -> Result<Option<DaemonRequest>, String> {
    if std::env::var_os(DAEMON_MARKER_ENV).is_none() {
        return Ok(None);
    }
    let upstream_origin = required_daemon_env(DAEMON_UPSTREAM_ENV)?;
    let state_path = PathBuf::from(required_daemon_env(DAEMON_STATE_ENV)?);
    if !state_path.is_absolute() {
        return Err("Codex bridge state path must be absolute".into());
    }
    let nonce = required_daemon_env(DAEMON_NONCE_ENV)?;
    validate_nonce(&nonce)?;
    let listen = required_daemon_env(DAEMON_LISTEN_ENV)?
        .parse::<std::net::SocketAddr>()
        .map_err(|_| "Codex bridge listen address is invalid")?;
    if listen.ip() != std::net::IpAddr::V4(std::net::Ipv4Addr::LOCALHOST) {
        return Err("Codex bridge must listen on 127.0.0.1".into());
    }
    Ok(Some(DaemonRequest {
        upstream_origin,
        state_path,
        nonce,
        listen,
    }))
}

fn required_daemon_env(name: &str) -> Result<String, String> {
    std::env::var(name)
        .ok()
        .filter(|value| !value.is_empty())
        .ok_or_else(|| "incomplete Codex bridge startup request".to_string())
}

fn validate_nonce(nonce: &str) -> Result<(), String> {
    if nonce.len() == 32 && nonce.bytes().all(|byte| byte.is_ascii_hexdigit()) {
        Ok(())
    } else {
        Err("Codex bridge ownership nonce is invalid".into())
    }
}

/// Serve one persistent child process created by [`ensure_persistent`].
pub async fn run_persistent_daemon(request: DaemonRequest) -> Result<(), String> {
    let upstream_origin = canonical_origin(&request.upstream_origin)?;
    let listener = tokio::net::TcpListener::bind(request.listen)
        .await
        .map_err(|error| format!("could not bind the persistent Codex bridge: {error}"))?;
    let address = listener
        .local_addr()
        .map_err(|error| format!("could not read the persistent Codex bridge address: {error}"))?;
    let loopback_origin = format!("http://{address}");
    let health_path = health_path(&request.nonce);
    let state = PersistentState {
        version: STATE_VERSION,
        pid: std::process::id(),
        upstream_origin: upstream_origin.clone(),
        loopback_origin,
        nonce: request.nonce,
    };
    write_state(&request.state_path, &state)?;
    let app = axum::Router::new()
        .fallback(bridge_request)
        .with_state(BridgeState {
            upstream_origin,
            health_path,
            client: reqwest::Client::new(),
        });
    let result = axum::serve(listener, app)
        .with_graceful_shutdown(daemon_shutdown())
        .await
        .map_err(|error| format!("persistent Codex bridge failed: {error}"));
    remove_matching_state(&request.state_path, &state)?;
    result
}

async fn daemon_shutdown() {
    #[cfg(unix)]
    {
        let terminate = tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate());
        if let Ok(mut terminate) = terminate {
            tokio::select! {
                _ = tokio::signal::ctrl_c() => {}
                _ = terminate.recv() => {}
            }
            return;
        }
    }
    let _ = tokio::signal::ctrl_c().await;
}

/// Start or reuse the owner-marked bridge for persistent Codex configuration.
pub async fn ensure_persistent(
    state_path: &Path,
    upstream_origin: &str,
) -> Result<PersistentBridge, String> {
    let upstream_origin = canonical_origin(upstream_origin)?;
    let lock = crate::durable_file::lock_exclusive_async(
        &append_suffix(state_path, ".lock"),
        START_TIMEOUT,
    )
    .await
    .map_err(|error| format!("could not lock Codex bridge state: {error}"))?;
    let previous = read_state(state_path).ok().flatten();
    if let Some(state) = previous.as_ref()
        && valid_state(state)
        && state.upstream_origin == upstream_origin
        && healthy(state).await
    {
        return Ok(persistent_handle(state_path, state.clone(), false, lock));
    }
    let preferred = previous
        .as_ref()
        .filter(|state| valid_state(state) && state.upstream_origin == upstream_origin)
        .and_then(|state| listen_address(&state.loopback_origin));
    if let Some(state) = previous.as_ref()
        && valid_state(state)
        && healthy(state).await
    {
        stop_state(state_path, state).await?;
    } else {
        remove_matching_or_invalid_state(state_path, previous.as_ref())?;
    }
    let state = match spawn_daemon(state_path, &upstream_origin, preferred).await {
        Ok(state) => state,
        Err(first) if preferred.is_some() => spawn_daemon(state_path, &upstream_origin, None)
            .await
            .map_err(|second| format!("{first}; retry on a new loopback port failed: {second}"))?,
        Err(error) => return Err(error),
    };
    Ok(persistent_handle(state_path, state, true, lock))
}

fn persistent_handle(
    state_path: &Path,
    state: PersistentState,
    started: bool,
    lock: crate::durable_file::FileLockGuard,
) -> PersistentBridge {
    PersistentBridge {
        backend_base_url: format!("{}{BACKEND_PATH}", state.loopback_origin),
        state_path: state_path.to_path_buf(),
        state,
        started,
        _lock: lock,
    }
}

/// Stop only the bridge proved by the private state nonce.
pub async fn stop_persistent(state_path: &Path) -> Result<(), String> {
    let lock = crate::durable_file::lock_exclusive_async(
        &append_suffix(state_path, ".lock"),
        STOP_TIMEOUT,
    )
    .await
    .map_err(|error| format!("could not lock Codex bridge state: {error}"))?;
    if let Some(state) = read_state(state_path)? {
        if valid_state(&state) && healthy(&state).await {
            stop_state(state_path, &state).await?;
        } else {
            remove_matching_or_invalid_state(state_path, Some(&state))?;
        }
    }
    drop(lock);
    Ok(())
}

async fn spawn_daemon(
    state_path: &Path,
    upstream_origin: &str,
    preferred: Option<std::net::SocketAddr>,
) -> Result<PersistentState, String> {
    remove_file_if_present(state_path)?;
    let nonce = uuid::Uuid::new_v4().simple().to_string();
    let executable = std::env::current_exe()
        .map_err(|error| format!("could not locate the Router executable: {error}"))?;
    let mut command = std::process::Command::new(executable);
    command
        .env_clear()
        .env(DAEMON_MARKER_ENV, "1")
        .env(DAEMON_UPSTREAM_ENV, upstream_origin)
        .env(DAEMON_STATE_ENV, state_path)
        .env(DAEMON_NONCE_ENV, &nonce)
        .env(
            DAEMON_LISTEN_ENV,
            preferred
                .unwrap_or_else(|| "127.0.0.1:0".parse().expect("literal address"))
                .to_string(),
        )
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null());
    #[cfg(unix)]
    {
        use std::os::unix::process::CommandExt as _;
        command.process_group(0);
    }
    let mut child = command
        .spawn()
        .map_err(|error| format!("could not start the Codex bridge: {error}"))?;
    let deadline = tokio::time::Instant::now() + START_TIMEOUT;
    loop {
        if let Some(state) = read_state(state_path)?
            && state.nonce == nonce
            && state.pid == child.id()
            && valid_state(&state)
            && healthy(&state).await
        {
            return Ok(state);
        }
        if child
            .try_wait()
            .map_err(|error| format!("could not inspect the Codex bridge: {error}"))?
            .is_some()
        {
            remove_file_if_present(state_path)?;
            return Err("Codex bridge exited before becoming ready".into());
        }
        if tokio::time::Instant::now() >= deadline {
            let _ = child.kill();
            let _ = child.wait();
            remove_file_if_present(state_path)?;
            return Err("Codex bridge did not become ready in time".into());
        }
        tokio::time::sleep(POLL_INTERVAL).await;
    }
}

async fn stop_state(state_path: &Path, state: &PersistentState) -> Result<(), String> {
    signal_terminate(state.pid)?;
    let deadline = tokio::time::Instant::now() + STOP_TIMEOUT;
    while healthy(state).await {
        if tokio::time::Instant::now() >= deadline {
            return Err("owned Codex bridge did not stop in time".into());
        }
        tokio::time::sleep(POLL_INTERVAL).await;
    }
    remove_matching_state(state_path, state)
}

#[cfg(unix)]
fn signal_terminate(pid: u32) -> Result<(), String> {
    let status = std::process::Command::new("/bin/kill")
        .args(["-TERM", &pid.to_string()])
        .status()
        .map_err(|error| format!("could not stop the owned Codex bridge: {error}"))?;
    if status.success() {
        Ok(())
    } else {
        Err("could not stop the owned Codex bridge".into())
    }
}

#[cfg(windows)]
fn signal_terminate(pid: u32) -> Result<(), String> {
    let status = std::process::Command::new("taskkill")
        .args(["/PID", &pid.to_string(), "/T"])
        .status()
        .map_err(|error| format!("could not stop the owned Codex bridge: {error}"))?;
    if status.success() {
        Ok(())
    } else {
        Err("could not stop the owned Codex bridge".into())
    }
}

async fn healthy(state: &PersistentState) -> bool {
    let response = reqwest::Client::builder()
        .timeout(Duration::from_millis(300))
        .build()
        .ok();
    let Some(response) = response else {
        return false;
    };
    response
        .get(format!(
            "{}{}",
            state.loopback_origin,
            health_path(&state.nonce)
        ))
        .send()
        .await
        .ok()
        .filter(|response| response.status().is_success())
        .and_then(|response| response.headers().get(HEALTH_HEADER).cloned())
        .is_some_and(|value| value.as_bytes() == state.nonce.as_bytes())
}

fn health_path(nonce: &str) -> String {
    format!("/__link_assistant_router/codex_bridge/{nonce}")
}

fn valid_state(state: &PersistentState) -> bool {
    state.version == STATE_VERSION
        && state.pid != 0
        && validate_nonce(&state.nonce).is_ok()
        && canonical_origin(&state.upstream_origin).as_deref() == Ok(&state.upstream_origin)
        && listen_address(&state.loopback_origin).is_some()
}

fn listen_address(origin: &str) -> Option<std::net::SocketAddr> {
    let url = reqwest::Url::parse(origin).ok()?;
    if url.scheme() != "http" || url.path() != "/" || url.query().is_some() {
        return None;
    }
    let address = std::net::SocketAddr::new(url.host()?.to_string().parse().ok()?, url.port()?);
    (address.ip() == std::net::IpAddr::V4(std::net::Ipv4Addr::LOCALHOST)).then_some(address)
}

fn read_state(path: &Path) -> Result<Option<PersistentState>, String> {
    let contents = match std::fs::read(path) {
        Ok(contents) => contents,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(None),
        Err(error) => return Err(format!("could not read Codex bridge state: {error}")),
    };
    serde_json::from_slice(&contents)
        .map(Some)
        .map_err(|_| "Codex bridge state is invalid".to_string())
}

fn write_state(path: &Path, state: &PersistentState) -> Result<(), String> {
    let contents = serde_json::to_vec(state)
        .map_err(|error| format!("could not encode Codex bridge state: {error}"))?;
    crate::durable_file::atomic_write_owner_only(path, &contents)
        .map_err(|error| format!("could not write Codex bridge state: {error}"))
}

fn remove_matching_state(path: &Path, expected: &PersistentState) -> Result<(), String> {
    match read_state(path) {
        Ok(Some(current)) if &current == expected => remove_file_if_present(path),
        Ok(_) | Err(_) => Ok(()),
    }
}

fn remove_matching_or_invalid_state(
    path: &Path,
    expected: Option<&PersistentState>,
) -> Result<(), String> {
    match read_state(path) {
        Ok(Some(current)) if expected.is_none_or(|expected| expected == &current) => {
            remove_file_if_present(path)
        }
        Ok(None | Some(_)) => Ok(()),
        Err(_) => remove_file_if_present(path),
    }
}

fn remove_file_if_present(path: &Path) -> Result<(), String> {
    match std::fs::remove_file(path) {
        Ok(()) => Ok(()),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(error) => Err(format!("could not remove Codex bridge state: {error}")),
    }
}

fn append_suffix(path: &Path, suffix: &str) -> PathBuf {
    let mut value = path.as_os_str().to_os_string();
    value.push(suffix);
    PathBuf::from(value)
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
        let nonce = state
            .health_path
            .rsplit('/')
            .next()
            .expect("health path has a nonce");
        return (StatusCode::OK, [(HEALTH_HEADER, nonce)], "ok").into_response();
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
