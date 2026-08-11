//! Provider-aware interactive subscription authorization.
//!
//! Claude uses its vendor CLI's copy/paste flow. Codex defaults to device-code
//! authorization, with its PKCE loopback callback server available as fallback.

use std::collections::HashMap;
use std::io::Write as _;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;

use axum::Router;
use axum::extract::{Query, State};
use axum::http::StatusCode;
use axum::routing::get;
use base64::Engine as _;
use serde::Deserialize;
use sha2::{Digest, Sha256};
use tokio::sync::{mpsc, oneshot};

/// Public OAuth client id embedded by the Codex CLI.
pub const CODEX_CLIENT_ID: &str = "app_EMoamEEZ73f0CkXaXp7hrann";
/// Default `OpenAI` OAuth issuer.
pub const CODEX_ISSUER: &str = "https://auth.openai.com";
/// Callback path registered for the Codex public client.
pub const CODEX_CALLBACK_PATH: &str = "/auth/callback";
/// Product-specific callback URI used by Codex device authorization.
pub const CODEX_DEVICE_CALLBACK_PATH: &str = "/deviceauth/callback";

/// Settings shared by Codex device and loopback authorization.
#[derive(Clone, Debug)]
pub struct CodexAuthConfig {
    /// OAuth issuer; overridable so tests can use a local token endpoint.
    pub issuer: String,
    /// Public OAuth client id.
    pub client_id: String,
    /// Preferred callback port. Zero asks the OS for a free port.
    pub port: u16,
    /// Directory in which `auth.json` is written.
    pub codex_home: PathBuf,
    /// Maximum time to wait for the browser callback.
    pub timeout: Duration,
    /// Interface on which the callback listener is reachable.
    pub bind_host: String,
}

impl CodexAuthConfig {
    /// Production configuration for a resolved Codex home.
    #[must_use]
    pub fn production(codex_home: PathBuf, port: u16, timeout: Duration) -> Self {
        Self {
            issuer: CODEX_ISSUER.to_string(),
            client_id: CODEX_CLIENT_ID.to_string(),
            port,
            codex_home,
            timeout,
            bind_host: "127.0.0.1".to_string(),
        }
    }
}

#[derive(Deserialize)]
#[serde(untagged)]
enum PollInterval {
    Number(u64),
    String(String),
}

impl PollInterval {
    fn seconds(self) -> Result<u64, String> {
        match self {
            Self::Number(value) => Ok(value),
            Self::String(value) => value
                .trim()
                .parse()
                .map_err(|error| format!("invalid Codex device polling interval: {error}")),
        }
    }
}

#[derive(Deserialize)]
struct DeviceCodeResponse {
    device_auth_id: String,
    #[serde(alias = "usercode")]
    user_code: String,
    interval: PollInterval,
}

#[derive(Deserialize)]
struct DeviceAuthorizationResponse {
    authorization_code: String,
    code_challenge: String,
    code_verifier: String,
}

#[derive(Default, Deserialize)]
struct DeviceErrorResponse {
    #[serde(default)]
    error: String,
    #[serde(default)]
    error_description: String,
}

enum DevicePoll {
    Pending,
    SlowDown,
    Complete(DeviceAuthorizationResponse),
}

/// A Codex device-code authorization that never opens a local listener.
pub struct CodexDeviceLogin {
    config: CodexAuthConfig,
    verification_url: String,
    user_code: String,
    device_auth_id: String,
    interval: Duration,
}

impl CodexDeviceLogin {
    /// Request a one-time code from Codex without binding a callback port.
    pub async fn begin(config: CodexAuthConfig) -> Result<Self, String> {
        let endpoint = format!(
            "{}/api/accounts/deviceauth/usercode",
            config.issuer.trim_end_matches('/')
        );
        let response = reqwest::Client::new()
            .post(endpoint)
            .json(&serde_json::json!({ "client_id": config.client_id }))
            .send()
            .await
            .map_err(|error| format!("Codex device-code request failed: {error}"))?;
        let status = response.status();
        if !status.is_success() {
            let detail = response.text().await.unwrap_or_default();
            let hint = if status == StatusCode::NOT_FOUND {
                "device authorization is not enabled; use --flow loopback"
            } else {
                "device authorization could not be started"
            };
            return Err(format!(
                "Codex device-code endpoint returned {status}: {hint}{}",
                response_detail(&detail)
            ));
        }
        let device: DeviceCodeResponse = response
            .json()
            .await
            .map_err(|error| format!("invalid Codex device-code response: {error}"))?;
        if device.device_auth_id.trim().is_empty() || device.user_code.trim().is_empty() {
            return Err("invalid Codex device-code response: missing id or user code".to_string());
        }
        let interval = Duration::from_secs(device.interval.seconds()?);
        Ok(Self {
            verification_url: format!("{}/codex/device", config.issuer.trim_end_matches('/')),
            config,
            user_code: device.user_code,
            device_auth_id: device.device_auth_id,
            interval,
        })
    }

    /// URL at which the operator enters [`Self::user_code`].
    #[must_use]
    pub fn verification_url(&self) -> &str {
        &self.verification_url
    }

    /// Compatibility alias for callers that expose every login as a URL.
    #[must_use]
    pub fn authorization_url(&self) -> &str {
        self.verification_url()
    }

    /// One-time code the operator enters at [`Self::verification_url`].
    #[must_use]
    pub fn user_code(&self) -> &str {
        &self.user_code
    }

    /// Poll until the browser authorizes this device, then persist `auth.json`.
    pub async fn complete(self) -> Result<PathBuf, String> {
        let timeout = self.config.timeout;
        tokio::time::timeout(timeout, self.poll_and_store())
            .await
            .unwrap_or_else(|_| {
                Err(format!(
                    "Codex device authorization expired after {} seconds",
                    timeout.as_secs()
                ))
            })
    }

    async fn poll_and_store(mut self) -> Result<PathBuf, String> {
        loop {
            match self.poll_once().await? {
                DevicePoll::Pending => tokio::time::sleep(self.interval).await,
                DevicePoll::SlowDown => {
                    self.interval += Duration::from_secs(5);
                    tokio::time::sleep(self.interval).await;
                }
                DevicePoll::Complete(code) => {
                    let expected_challenge = base64::engine::general_purpose::URL_SAFE_NO_PAD
                        .encode(Sha256::digest(code.code_verifier.as_bytes()));
                    if code.code_challenge != expected_challenge {
                        return Err(
                            "Codex device authorization returned inconsistent PKCE values"
                                .to_string(),
                        );
                    }
                    let redirect_uri = format!(
                        "{}{}",
                        self.config.issuer.trim_end_matches('/'),
                        CODEX_DEVICE_CALLBACK_PATH
                    );
                    return exchange_and_store(
                        &self.config,
                        &redirect_uri,
                        &code.code_verifier,
                        &code.authorization_code,
                    )
                    .await;
                }
            }
        }
    }

    async fn poll_once(&self) -> Result<DevicePoll, String> {
        let response = reqwest::Client::new()
            .post(format!(
                "{}/api/accounts/deviceauth/token",
                self.config.issuer.trim_end_matches('/')
            ))
            .json(&serde_json::json!({
                "device_auth_id": self.device_auth_id,
                "user_code": self.user_code,
            }))
            .send()
            .await
            .map_err(|error| format!("Codex device authorization poll failed: {error}"))?;
        let status = response.status();
        if status.is_success() {
            return response
                .json()
                .await
                .map(DevicePoll::Complete)
                .map_err(|error| format!("invalid Codex device authorization response: {error}"));
        }
        let body = response.text().await.unwrap_or_default();
        classify_device_error(status, &body)
    }
}

fn classify_device_error(status: StatusCode, body: &str) -> Result<DevicePoll, String> {
    let provider_error = serde_json::from_str::<DeviceErrorResponse>(body).unwrap_or_default();
    let error = provider_error.error.to_ascii_lowercase();
    if status == StatusCode::TOO_MANY_REQUESTS || error == "slow_down" {
        return Ok(DevicePoll::SlowDown);
    }
    if matches!(error.as_str(), "expired_token" | "access_denied") {
        let detail = if provider_error.error_description.is_empty() {
            error
        } else {
            provider_error.error_description
        };
        return Err(format!("Codex device authorization failed: {detail}"));
    }
    if matches!(status, StatusCode::FORBIDDEN | StatusCode::NOT_FOUND)
        || error == "authorization_pending"
    {
        return Ok(DevicePoll::Pending);
    }
    Err(format!(
        "Codex device authorization endpoint returned {status}{}",
        response_detail(body)
    ))
}

fn response_detail(body: &str) -> String {
    let detail = body.trim();
    if detail.is_empty() {
        String::new()
    } else {
        let safe_end = detail
            .char_indices()
            .nth(500)
            .map_or(detail.len(), |(index, _)| index);
        format!(": {}", &detail[..safe_end])
    }
}

#[derive(Debug)]
struct CallbackState {
    expected_state: String,
    outcome_tx: mpsc::Sender<Result<String, String>>,
    handled: AtomicBool,
}

/// A bound Codex callback listener waiting for the browser round trip.
pub struct CodexLogin {
    config: CodexAuthConfig,
    redirect_uri: String,
    authorization_url: String,
    code_verifier: String,
    outcome_rx: mpsc::Receiver<Result<String, String>>,
    shutdown_tx: Option<oneshot::Sender<()>>,
    server: tokio::task::JoinHandle<()>,
}

impl CodexLogin {
    /// Bind the callback port before constructing and exposing the URL.
    pub async fn bind(config: CodexAuthConfig) -> Result<Self, String> {
        let listener = tokio::net::TcpListener::bind((config.bind_host.as_str(), config.port))
            .await
            .map_err(|error| format!("could not bind Codex callback listener: {error}"))?;
        let port = listener
            .local_addr()
            .map_err(|error| format!("could not inspect callback listener: {error}"))?
            .port();
        let redirect_uri = format!("http://localhost:{port}{CODEX_CALLBACK_PATH}");
        let state = random_urlsafe();
        let code_verifier = format!("{}{}", random_urlsafe(), random_urlsafe());
        let challenge = base64::engine::general_purpose::URL_SAFE_NO_PAD
            .encode(Sha256::digest(code_verifier.as_bytes()));
        let authorization_url = authorize_url(
            &config.issuer,
            &config.client_id,
            &redirect_uri,
            &state,
            &challenge,
        );

        let (outcome_tx, outcome_rx) = mpsc::channel(1);
        let callback_state = Arc::new(CallbackState {
            expected_state: state,
            outcome_tx,
            handled: AtomicBool::new(false),
        });
        let app = Router::new()
            .route(CODEX_CALLBACK_PATH, get(callback))
            .with_state(callback_state);
        let (shutdown_tx, shutdown_rx) = oneshot::channel();
        let server = tokio::spawn(async move {
            let _ = axum::serve(listener, app)
                .with_graceful_shutdown(async {
                    let _ = shutdown_rx.await;
                })
                .await;
        });

        Ok(Self {
            config,
            redirect_uri,
            authorization_url,
            code_verifier,
            outcome_rx,
            shutdown_tx: Some(shutdown_tx),
            server,
        })
    }

    /// URL the operator must open after the listener has been bound.
    #[must_use]
    pub fn authorization_url(&self) -> &str {
        &self.authorization_url
    }

    /// Actual loopback port, including when port zero selected a free one.
    #[must_use]
    pub fn port(&self) -> u16 {
        self.redirect_uri
            .split(':')
            .nth(2)
            .and_then(|tail| tail.split('/').next())
            .and_then(|value| value.parse().ok())
            .expect("redirect URI was built from a u16 port")
    }

    /// Wait for a valid callback, exchange its code, persist the credential,
    /// and stop the callback server on every exit path.
    pub async fn complete(mut self) -> Result<PathBuf, String> {
        let callback = tokio::time::timeout(self.config.timeout, self.outcome_rx.recv()).await;
        // The listener's only job is receiving one valid callback. Release the
        // port before doing a potentially slow token exchange.
        self.stop().await;
        match callback {
            Ok(Some(Ok(code))) => {
                exchange_and_store(&self.config, &self.redirect_uri, &self.code_verifier, &code)
                    .await
            }
            Ok(Some(Err(error))) => Err(error),
            Ok(None) => Err("Codex callback listener stopped before authorization".to_string()),
            Err(_) => Err("timed out waiting for the Codex callback".to_string()),
        }
    }

    async fn stop(&mut self) {
        if let Some(shutdown) = self.shutdown_tx.take() {
            let _ = shutdown.send(());
        }
        let _ = (&mut self.server).await;
    }
}

impl Drop for CodexLogin {
    fn drop(&mut self) {
        if let Some(shutdown) = self.shutdown_tx.take() {
            let _ = shutdown.send(());
        }
        self.server.abort();
    }
}

async fn callback(
    State(state): State<Arc<CallbackState>>,
    Query(query): Query<HashMap<String, String>>,
) -> (StatusCode, &'static str) {
    if query.get("state") != Some(&state.expected_state) {
        return (
            StatusCode::BAD_REQUEST,
            "OAuth state did not match; authorization is still waiting",
        );
    }
    if state
        .handled
        .compare_exchange(false, true, Ordering::AcqRel, Ordering::Acquire)
        .is_err()
    {
        return (
            StatusCode::CONFLICT,
            "Authorization callback was already handled",
        );
    }
    let outcome = query.get("error").map_or_else(
        || {
            query
                .get("code")
                .filter(|value| !value.is_empty())
                .cloned()
                .ok_or_else(|| "Codex callback contained no authorization code".to_string())
        },
        |error| Err(format!("Codex authorization failed: {error}")),
    );
    let success = outcome.is_ok();
    if state.outcome_tx.try_send(outcome).is_ok() {
        if success {
            (
                StatusCode::OK,
                "Authorization received. You can close this window.",
            )
        } else {
            (
                StatusCode::BAD_REQUEST,
                "Authorization failed. You can close this window.",
            )
        }
    } else {
        state.handled.store(false, Ordering::Release);
        (
            StatusCode::SERVICE_UNAVAILABLE,
            "Authorization callback could not be queued",
        )
    }
}

fn random_urlsafe() -> String {
    uuid::Uuid::new_v4().simple().to_string()
}

fn authorize_url(
    issuer: &str,
    client_id: &str,
    redirect_uri: &str,
    state: &str,
    challenge: &str,
) -> String {
    let pairs = [
        ("response_type", "code"),
        ("client_id", client_id),
        ("redirect_uri", redirect_uri),
        (
            "scope",
            "openid profile email offline_access api.connectors.read api.connectors.invoke",
        ),
        ("code_challenge", challenge),
        ("code_challenge_method", "S256"),
        ("id_token_add_organizations", "true"),
        ("codex_cli_simplified_flow", "true"),
        ("state", state),
        ("originator", "link_assistant_router"),
    ];
    format!(
        "{}/oauth/authorize?{}",
        issuer.trim_end_matches('/'),
        form_encode(&pairs)
    )
}

#[allow(clippy::struct_field_names)]
#[derive(Deserialize)]
struct TokenResponse {
    id_token: String,
    access_token: String,
    refresh_token: String,
}

async fn exchange_and_store(
    config: &CodexAuthConfig,
    redirect_uri: &str,
    verifier: &str,
    code: &str,
) -> Result<PathBuf, String> {
    let body = form_encode(&[
        ("grant_type", "authorization_code"),
        ("code", code),
        ("redirect_uri", redirect_uri),
        ("client_id", &config.client_id),
        ("code_verifier", verifier),
    ]);
    let response = reqwest::Client::new()
        .post(format!(
            "{}/oauth/token",
            config.issuer.trim_end_matches('/')
        ))
        .header("content-type", "application/x-www-form-urlencoded")
        .body(body)
        .send()
        .await
        .map_err(|error| format!("Codex token exchange failed: {error}"))?;
    let status = response.status();
    if !status.is_success() {
        let detail = response.text().await.unwrap_or_default();
        return Err(format!("Codex token endpoint returned {status}: {detail}"));
    }
    let tokens: TokenResponse = response
        .json()
        .await
        .map_err(|error| format!("invalid Codex token response: {error}"))?;
    persist_codex_auth(&config.codex_home, &tokens)
}

fn persist_codex_auth(home: &Path, tokens: &TokenResponse) -> Result<PathBuf, String> {
    std::fs::create_dir_all(home)
        .map_err(|error| format!("could not create {}: {error}", home.display()))?;
    let path = home.join("auth.json");
    let value = serde_json::json!({
        "auth_mode": "chatgpt",
        "tokens": {
            "id_token": tokens.id_token,
            "access_token": tokens.access_token,
            "refresh_token": tokens.refresh_token,
        },
        "last_refresh": chrono::Utc::now().to_rfc3339(),
    });
    let temporary = home.join(format!(".auth.json.{}.tmp", uuid::Uuid::new_v4()));
    let mut file = std::fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&temporary)
        .map_err(|error| format!("could not create {}: {error}", temporary.display()))?;
    file.write_all(&serde_json::to_vec_pretty(&value).map_err(|e| e.to_string())?)
        .and_then(|()| file.sync_all())
        .map_err(|error| format!("could not write {}: {error}", temporary.display()))?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt as _;
        std::fs::set_permissions(&temporary, std::fs::Permissions::from_mode(0o600))
            .map_err(|error| format!("could not secure {}: {error}", temporary.display()))?;
    }
    std::fs::rename(&temporary, &path)
        .map_err(|error| format!("could not install {}: {error}", path.display()))?;
    Ok(path)
}

fn form_encode(pairs: &[(&str, &str)]) -> String {
    pairs
        .iter()
        .map(|(key, value)| format!("{}={}", percent_encode(key), percent_encode(value)))
        .collect::<Vec<_>>()
        .join("&")
}

fn percent_encode(value: &str) -> String {
    let mut out = String::with_capacity(value.len());
    for byte in value.bytes() {
        if byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_' | b'.' | b'~') {
            out.push(char::from(byte));
        } else {
            use std::fmt::Write as _;
            let _ = write!(out, "%{byte:02X}");
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::Json;
    use axum::body::Bytes;
    use axum::response::{IntoResponse as _, Response};
    use axum::routing::post;
    use std::sync::atomic::AtomicUsize;
    use tokio::io::{AsyncReadExt as _, AsyncWriteExt as _};

    #[derive(Default)]
    struct DeviceStubState {
        polls: AtomicUsize,
    }

    async fn issue_device_code(Json(body): Json<serde_json::Value>) -> Json<serde_json::Value> {
        assert_eq!(body["client_id"], CODEX_CLIENT_ID);
        Json(serde_json::json!({
            "device_auth_id": "device-1",
            "user_code": "ABCD-EFGH",
            "interval": "0",
        }))
    }

    async fn poll_device_code(
        State(state): State<Arc<DeviceStubState>>,
        Json(body): Json<serde_json::Value>,
    ) -> Response {
        assert_eq!(body["device_auth_id"], "device-1");
        assert_eq!(body["user_code"], "ABCD-EFGH");
        if state.polls.fetch_add(1, Ordering::SeqCst) == 0 {
            return (
                StatusCode::FORBIDDEN,
                Json(serde_json::json!({"error": "authorization_pending"})),
            )
                .into_response();
        }
        let verifier = "device-verifier";
        let challenge = base64::engine::general_purpose::URL_SAFE_NO_PAD
            .encode(Sha256::digest(verifier.as_bytes()));
        Json(serde_json::json!({
            "authorization_code": "device-authorization-code",
            "code_challenge": challenge,
            "code_verifier": verifier,
        }))
        .into_response()
    }

    async fn exchange_device_code(body: Bytes) -> Json<serde_json::Value> {
        let body = String::from_utf8(body.to_vec()).unwrap();
        assert!(body.contains("code=device-authorization-code"));
        assert!(body.contains("code_verifier=device-verifier"));
        assert!(body.contains("redirect_uri=http%3A%2F%2F"));
        assert!(body.contains("%2Fdeviceauth%2Fcallback"));
        Json(serde_json::json!({
            "id_token": "header.payload.sig",
            "access_token": "device-access",
            "refresh_token": "device-refresh",
        }))
    }

    async fn device_stub() -> (String, Arc<DeviceStubState>, tokio::task::JoinHandle<()>) {
        let state = Arc::new(DeviceStubState::default());
        let app = Router::new()
            .route("/api/accounts/deviceauth/usercode", post(issue_device_code))
            .route("/api/accounts/deviceauth/token", post(poll_device_code))
            .route("/oauth/token", post(exchange_device_code))
            .with_state(Arc::clone(&state));
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let issuer = format!("http://{}", listener.local_addr().unwrap());
        let server = tokio::spawn(async move {
            axum::serve(listener, app).await.unwrap();
        });
        (issuer, state, server)
    }

    #[tokio::test]
    async fn device_login_starts_without_binding_the_loopback_port() {
        let issuer_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let issuer = format!("http://{}", issuer_listener.local_addr().unwrap());
        let user_code_request = tokio::spawn(async move {
            let (mut socket, _) = issuer_listener.accept().await.unwrap();
            let mut bytes = vec![0_u8; 2048];
            let read = socket.read(&mut bytes).await.unwrap();
            let request = String::from_utf8_lossy(&bytes[..read]);
            assert!(request.starts_with("POST /api/accounts/deviceauth/usercode "));
            assert!(request.contains(CODEX_CLIENT_ID));
            let body = r#"{"device_auth_id":"device-1","user_code":"ABCD-EFGH","interval":"5"}"#;
            socket
                .write_all(
                    format!(
                        "HTTP/1.1 200 OK\r\ncontent-type: application/json\r\ncontent-length: {}\r\nconnection: close\r\n\r\n{body}",
                        body.len()
                    )
                    .as_bytes(),
                )
                .await
                .unwrap();
        });
        let occupied = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let occupied_port = occupied.local_addr().unwrap().port();
        let home = tempfile::tempdir().unwrap();

        let login = CodexDeviceLogin::begin(CodexAuthConfig {
            issuer,
            client_id: CODEX_CLIENT_ID.to_string(),
            port: occupied_port,
            codex_home: home.path().to_path_buf(),
            timeout: Duration::from_secs(3),
            bind_host: "127.0.0.1".to_string(),
        })
        .await
        .expect("device auth must not bind the loopback port");

        assert_eq!(login.verification_url(), login.authorization_url());
        assert!(login.verification_url().ends_with("/codex/device"));
        assert_eq!(login.user_code(), "ABCD-EFGH");
        assert_eq!(occupied.local_addr().unwrap().port(), occupied_port);
        user_code_request.await.unwrap();
    }

    #[tokio::test]
    async fn device_login_polls_pending_then_exchanges_and_persists_tokens() {
        let (issuer, state, server) = device_stub().await;
        let home = tempfile::tempdir().unwrap();
        let login = CodexDeviceLogin::begin(CodexAuthConfig {
            issuer,
            client_id: CODEX_CLIENT_ID.to_string(),
            port: 1455,
            codex_home: home.path().to_path_buf(),
            timeout: Duration::from_secs(3),
            bind_host: "127.0.0.1".to_string(),
        })
        .await
        .unwrap();

        let path = login.complete().await.unwrap();
        let saved: serde_json::Value =
            serde_json::from_slice(&std::fs::read(path).unwrap()).unwrap();
        assert_eq!(saved["auth_mode"], "chatgpt");
        assert_eq!(saved["tokens"]["access_token"], "device-access");
        assert_eq!(state.polls.load(Ordering::SeqCst), 2);
        server.abort();
    }

    #[test]
    fn device_polling_handles_pending_slow_down_and_expiry() {
        assert!(matches!(
            classify_device_error(StatusCode::FORBIDDEN, ""),
            Ok(DevicePoll::Pending)
        ));
        assert!(matches!(
            classify_device_error(StatusCode::BAD_REQUEST, r#"{"error":"slow_down"}"#),
            Ok(DevicePoll::SlowDown)
        ));
        let expired = classify_device_error(
            StatusCode::FORBIDDEN,
            r#"{"error":"expired_token","error_description":"code expired"}"#,
        )
        .err()
        .unwrap();
        assert!(expired.contains("code expired"));
    }

    async fn token_stub() -> (String, tokio::task::JoinHandle<String>) {
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let issuer = format!("http://{}", listener.local_addr().unwrap());
        let task = tokio::spawn(async move {
            let (mut socket, _) = listener.accept().await.unwrap();
            let mut bytes = Vec::new();
            let mut buf = [0_u8; 2048];
            loop {
                let read = socket.read(&mut buf).await.unwrap();
                bytes.extend_from_slice(&buf[..read]);
                if read == 0 || String::from_utf8_lossy(&bytes).contains("code_verifier=") {
                    break;
                }
            }
            let body = r#"{"id_token":"header.payload.sig","access_token":"access","refresh_token":"refresh"}"#;
            socket.write_all(format!("HTTP/1.1 200 OK\r\ncontent-type: application/json\r\ncontent-length: {}\r\nconnection: close\r\n\r\n{body}", body.len()).as_bytes()).await.unwrap();
            String::from_utf8(bytes).unwrap()
        });
        (issuer, task)
    }

    #[tokio::test]
    async fn mismatched_state_is_rejected_and_listener_closes_after_valid_callback() {
        let (issuer, token_request) = token_stub().await;
        let home = tempfile::tempdir().unwrap();
        let login = CodexLogin::bind(CodexAuthConfig {
            issuer,
            client_id: CODEX_CLIENT_ID.to_string(),
            port: 0,
            codex_home: home.path().to_path_buf(),
            timeout: Duration::from_secs(3),
            bind_host: "127.0.0.1".to_string(),
        })
        .await
        .unwrap();
        let port = login.port();
        let auth_url = login.authorization_url().to_string();
        let state = auth_url
            .split("state=")
            .nth(1)
            .unwrap()
            .split('&')
            .next()
            .unwrap();
        let client = reqwest::Client::new();
        let wrong = client
            .get(format!(
                "http://127.0.0.1:{port}{CODEX_CALLBACK_PATH}?code=bad&state=wrong"
            ))
            .send()
            .await
            .unwrap();
        assert_eq!(wrong.status(), StatusCode::BAD_REQUEST);

        let completion = tokio::spawn(login.complete());
        let good = client
            .get(format!(
                "http://127.0.0.1:{port}{CODEX_CALLBACK_PATH}?code=good-code&state={state}"
            ))
            .send()
            .await
            .unwrap();
        assert_eq!(good.status(), StatusCode::OK);
        let path = completion.await.unwrap().unwrap();
        let saved: serde_json::Value =
            serde_json::from_slice(&std::fs::read(path).unwrap()).unwrap();
        assert_eq!(saved["tokens"]["access_token"], "access");
        let request = token_request.await.unwrap();
        assert!(request.contains("code=good-code"));
        assert!(request.contains("code_verifier="));
        assert!(
            tokio::net::TcpListener::bind(("127.0.0.1", port))
                .await
                .is_ok()
        );
    }

    #[tokio::test]
    async fn callback_listener_closes_on_timeout() {
        let home = tempfile::tempdir().unwrap();
        let login = CodexLogin::bind(CodexAuthConfig {
            issuer: "http://127.0.0.1:1".to_string(),
            client_id: CODEX_CLIENT_ID.to_string(),
            port: 0,
            codex_home: home.path().to_path_buf(),
            timeout: Duration::from_millis(10),
            bind_host: "127.0.0.1".to_string(),
        })
        .await
        .unwrap();
        let port = login.port();
        assert!(login.complete().await.unwrap_err().contains("timed out"));
        assert!(
            tokio::net::TcpListener::bind(("127.0.0.1", port))
                .await
                .is_ok()
        );
    }

    #[tokio::test]
    async fn dropping_loopback_login_closes_listener() {
        let home = tempfile::tempdir().unwrap();
        let login = CodexLogin::bind(CodexAuthConfig {
            issuer: "http://127.0.0.1:1".to_string(),
            client_id: CODEX_CLIENT_ID.to_string(),
            port: 0,
            codex_home: home.path().to_path_buf(),
            timeout: Duration::from_secs(3),
            bind_host: "127.0.0.1".to_string(),
        })
        .await
        .unwrap();
        let port = login.port();

        drop(login);
        tokio::task::yield_now().await;

        assert!(
            tokio::net::TcpListener::bind(("127.0.0.1", port))
                .await
                .is_ok()
        );
    }

    #[tokio::test]
    async fn provider_error_closes_listener_immediately() {
        let home = tempfile::tempdir().unwrap();
        let login = CodexLogin::bind(CodexAuthConfig {
            issuer: "http://127.0.0.1:1".to_string(),
            client_id: CODEX_CLIENT_ID.to_string(),
            port: 0,
            codex_home: home.path().to_path_buf(),
            timeout: Duration::from_secs(3),
            bind_host: "127.0.0.1".to_string(),
        })
        .await
        .unwrap();
        let port = login.port();
        let state = login
            .authorization_url()
            .split("state=")
            .nth(1)
            .unwrap()
            .split('&')
            .next()
            .unwrap()
            .to_string();
        let completion = tokio::spawn(login.complete());
        let response = reqwest::get(format!(
            "http://127.0.0.1:{port}{CODEX_CALLBACK_PATH}?error=access_denied&state={state}"
        ))
        .await
        .unwrap();
        assert_eq!(response.status(), StatusCode::BAD_REQUEST);
        assert!(
            completion
                .await
                .unwrap()
                .unwrap_err()
                .contains("access_denied")
        );
        assert!(
            tokio::net::TcpListener::bind(("127.0.0.1", port))
                .await
                .is_ok()
        );
    }
}
