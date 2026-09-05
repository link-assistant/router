//! Private continuation state for Codex remote control.

use std::fmt;
use std::fs;
use std::path::{Path, PathBuf};

use axum::body::{Body, Bytes};
use axum::extract::Request;
use axum::http::{HeaderMap, HeaderValue, Method, StatusCode};
use axum::response::Response;
use futures_util::StreamExt as _;
use serde::{Deserialize, Serialize};
use sha2::{Digest as _, Sha256};

use crate::app_state::AppState;
use crate::subscription::SubscriptionProvider;

pub const CONTINUATION_PREFIX: &str = "la_rc_";
const FILE_NAME: &str = "codex-remote-control.lino";
const STORE_VERSION: u32 = 1;
const MAX_RECORDS: usize = 1_000;

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
pub struct EnrollmentIdentity {
    pub principal_id: String,
    pub account_name: String,
    pub server_id: String,
    pub environment_id: String,
    pub installation_id: String,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
pub struct EnrollmentRecord {
    pub identity: EnrollmentIdentity,
    pub upstream_token: String,
    pub upstream_base_url: String,
    pub expires_at: i64,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct BoundEnrollment {
    pub token_hash: String,
    pub record: EnrollmentRecord,
}

#[derive(Debug)]
pub enum StoreError {
    Io(std::io::Error),
    Decode(serde_json::Error),
    Crypto(String),
    Invalid,
    StaleRotation,
}

impl fmt::Display for StoreError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Io(error) => write!(formatter, "remote-control storage failed: {error}"),
            Self::Decode(error) => write!(formatter, "remote-control state is invalid: {error}"),
            Self::Crypto(error) => {
                write!(formatter, "remote-control state cannot be opened: {error}")
            }
            Self::Invalid => formatter.write_str("remote-control state is invalid"),
            Self::StaleRotation => {
                formatter.write_str("remote-control enrollment changed during refresh")
            }
        }
    }
}

impl std::error::Error for StoreError {}

impl From<std::io::Error> for StoreError {
    fn from(error: std::io::Error) -> Self {
        Self::Io(error)
    }
}

impl From<serde_json::Error> for StoreError {
    fn from(error: serde_json::Error) -> Self {
        Self::Decode(error)
    }
}

#[derive(Debug, Serialize, Deserialize)]
struct StoredEnrollment {
    token_hash: String,
    sealed_record: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct StoreFile {
    version: u32,
    records: Vec<StoredEnrollment>,
}

#[derive(Clone, Debug)]
pub struct CodexRemoteControlStore {
    path: PathBuf,
    lock_path: PathBuf,
    token_secret: String,
}

impl CodexRemoteControlStore {
    pub fn open(data_dir: &Path, token_secret: &str) -> Result<Self, StoreError> {
        fs::create_dir_all(data_dir)?;
        let path = data_dir.join(FILE_NAME);
        let store = Self {
            lock_path: path.with_extension("lock"),
            path,
            token_secret: token_secret.to_string(),
        };
        crate::durable_file::with_exclusive_lock(&store.lock_path, || {
            crate::durable_file::recover_transactional_write(&store.path)?;
            let _ = store.load()?;
            Ok::<_, StoreError>(())
        })?;
        Ok(store)
    }

    pub fn issue(&self, record: &EnrollmentRecord) -> Result<String, StoreError> {
        validate_record(record)?;
        crate::durable_file::with_exclusive_lock(&self.lock_path, || {
            crate::durable_file::recover_transactional_write(&self.path)?;
            let mut file = self.load()?;
            self.remove_slot(&mut file, &record.identity)?;
            let token = new_continuation();
            file.records.push(self.seal(&token, record)?);
            if file.records.len() > MAX_RECORDS {
                file.records.remove(0);
            }
            self.flush(&file)?;
            Ok(token)
        })
    }

    pub fn resolve(&self, token: &str, now: i64) -> Result<Option<EnrollmentRecord>, StoreError> {
        let Some(hash) = continuation_hash(token) else {
            return Ok(None);
        };
        crate::durable_file::with_exclusive_lock(&self.lock_path, || {
            crate::durable_file::recover_transactional_write(&self.path)?;
            let file = self.load()?;
            let Some(stored) = file
                .records
                .iter()
                .find(|stored| crate::token::constant_time_eq(&stored.token_hash, &hash))
            else {
                return Ok(None);
            };
            let record = self.unseal(stored)?;
            Ok((record.expires_at > now).then_some(record))
        })
    }

    pub fn find(
        &self,
        principal_id: &str,
        account_name: &str,
        server_id: &str,
        installation_id: &str,
    ) -> Result<Option<BoundEnrollment>, StoreError> {
        crate::durable_file::with_exclusive_lock(&self.lock_path, || {
            crate::durable_file::recover_transactional_write(&self.path)?;
            let file = self.load()?;
            for stored in &file.records {
                let record = self.unseal(stored)?;
                let identity = &record.identity;
                if identity.principal_id == principal_id
                    && identity.account_name == account_name
                    && identity.server_id == server_id
                    && identity.installation_id == installation_id
                {
                    return Ok(Some(BoundEnrollment {
                        token_hash: stored.token_hash.clone(),
                        record,
                    }));
                }
            }
            Ok(None)
        })
    }

    pub fn rotate(
        &self,
        expected_token_hash: &str,
        record: &EnrollmentRecord,
    ) -> Result<String, StoreError> {
        validate_record(record)?;
        crate::durable_file::with_exclusive_lock(&self.lock_path, || {
            crate::durable_file::recover_transactional_write(&self.path)?;
            let mut file = self.load()?;
            let Some(index) = file.records.iter().position(|stored| {
                crate::token::constant_time_eq(&stored.token_hash, expected_token_hash)
            }) else {
                return Err(StoreError::StaleRotation);
            };
            if self.unseal(&file.records[index])?.identity != record.identity {
                return Err(StoreError::StaleRotation);
            }
            let token = new_continuation();
            file.records[index] = self.seal(&token, record)?;
            self.flush(&file)?;
            Ok(token)
        })
    }

    pub fn owns_environment(
        &self,
        principal_id: &str,
        account_name: &str,
        environment_id: &str,
    ) -> Result<bool, StoreError> {
        crate::durable_file::with_exclusive_lock(&self.lock_path, || {
            crate::durable_file::recover_transactional_write(&self.path)?;
            let file = self.load()?;
            for stored in &file.records {
                let identity = self.unseal(stored)?.identity;
                if identity.principal_id == principal_id
                    && identity.account_name == account_name
                    && identity.environment_id == environment_id
                {
                    return Ok(true);
                }
            }
            Ok(false)
        })
    }

    fn remove_slot(
        &self,
        file: &mut StoreFile,
        identity: &EnrollmentIdentity,
    ) -> Result<(), StoreError> {
        let mut kept = Vec::with_capacity(file.records.len());
        for stored in file.records.drain(..) {
            let current = self.unseal(&stored)?.identity;
            if current.principal_id != identity.principal_id
                || current.account_name != identity.account_name
                || current.installation_id != identity.installation_id
            {
                kept.push(stored);
            }
        }
        file.records = kept;
        Ok(())
    }

    fn seal(&self, token: &str, record: &EnrollmentRecord) -> Result<StoredEnrollment, StoreError> {
        let plaintext = serde_json::to_string(record)?;
        let sealed_record = crate::providers::seal_secret(&plaintext, &self.token_secret)
            .map_err(|error| StoreError::Crypto(error.to_string()))?;
        Ok(StoredEnrollment {
            token_hash: continuation_hash(token).ok_or(StoreError::Invalid)?,
            sealed_record,
        })
    }

    fn unseal(&self, stored: &StoredEnrollment) -> Result<EnrollmentRecord, StoreError> {
        let plaintext = crate::providers::open_secret(&stored.sealed_record, &self.token_secret)
            .map_err(|error| StoreError::Crypto(error.to_string()))?;
        let record = serde_json::from_str(&plaintext)?;
        validate_record(&record)?;
        Ok(record)
    }

    fn load(&self) -> Result<StoreFile, StoreError> {
        if !self.path.exists() {
            return Ok(StoreFile {
                version: STORE_VERSION,
                records: Vec::new(),
            });
        }
        let file: StoreFile = crate::lino_json::decode(&fs::read_to_string(&self.path)?)?;
        if file.version != STORE_VERSION {
            return Err(StoreError::Invalid);
        }
        Ok(file)
    }

    fn flush(&self, file: &StoreFile) -> Result<(), StoreError> {
        let encoded = crate::lino_json::encode(file)?;
        crate::durable_file::transactional_write_owner_only(&self.path, encoded.as_bytes())?;
        Ok(())
    }
}

fn new_continuation() -> String {
    format!(
        "{CONTINUATION_PREFIX}{}{}",
        uuid::Uuid::new_v4().simple(),
        uuid::Uuid::new_v4().simple()
    )
}

fn continuation_hash(token: &str) -> Option<String> {
    token.strip_prefix(CONTINUATION_PREFIX)?;
    Some(hex::encode(Sha256::digest(token.as_bytes())))
}

fn validate_record(record: &EnrollmentRecord) -> Result<(), StoreError> {
    let identity = &record.identity;
    let values = [
        identity.principal_id.as_str(),
        identity.account_name.as_str(),
        identity.server_id.as_str(),
        identity.environment_id.as_str(),
        identity.installation_id.as_str(),
        record.upstream_token.as_str(),
        record.upstream_base_url.as_str(),
    ];
    if values
        .iter()
        .any(|value| value.is_empty() || value.len() > 8_192)
        || record.expires_at <= 0
    {
        return Err(StoreError::Invalid);
    }
    Ok(())
}

const ROOT: &str = "/api/services/codex/backend-api/wham/remote/control/";
const SERVER: &str = "/api/services/codex/backend-api/wham/remote/control/server";
const ENROLL: &str = "/api/services/codex/backend-api/wham/remote/control/server/enroll";
const REFRESH: &str = "/api/services/codex/backend-api/wham/remote/control/server/refresh";
const REFRESH_UPSTREAM: &str = "/wham/remote/control/server/refresh";
const PAIR: &str = "/api/services/codex/backend-api/wham/remote/control/server/pair";
const PAIR_STATUS: &str = "/api/services/codex/backend-api/wham/remote/control/server/pair/status";
const ENVIRONMENTS: &str = "/api/services/codex/backend-api/wham/remote/control/environments/";

#[derive(Debug, Eq, PartialEq)]
enum Operation {
    WebSocket,
    Enroll,
    Refresh,
    Pair,
    PairStatus,
    List { environment_id: String },
    Revoke { environment_id: String },
}

pub fn is_remote_control_path(path: &str) -> bool {
    path.starts_with(ROOT)
}

fn operation(method: &Method, path: &str) -> Option<Operation> {
    match (method, path) {
        (&Method::GET, SERVER) => Some(Operation::WebSocket),
        (&Method::POST, ENROLL) => Some(Operation::Enroll),
        (&Method::POST, REFRESH) => Some(Operation::Refresh),
        (&Method::POST, PAIR) => Some(Operation::Pair),
        (&Method::POST, PAIR_STATUS) => Some(Operation::PairStatus),
        _ => dynamic_operation(method, path),
    }
}

fn dynamic_operation(method: &Method, path: &str) -> Option<Operation> {
    let tail = path.strip_prefix(ENVIRONMENTS)?;
    let segments = tail.split('/').collect::<Vec<_>>();
    match (method, segments.as_slice()) {
        (&Method::GET, [environment, "clients"]) => Some(Operation::List {
            environment_id: decode_path_segment(environment)?,
        }),
        (&Method::DELETE, [environment, "clients", client])
            if decode_path_segment(client).is_some() =>
        {
            Some(Operation::Revoke {
                environment_id: decode_path_segment(environment)?,
            })
        }
        _ => None,
    }
}

pub async fn forward(state: AppState, request: Request) -> Response {
    let method = request.method().clone();
    let uri = request.uri().clone();
    let Some(operation) = operation(&method, uri.path()) else {
        return api_error(StatusCode::NOT_FOUND, "not_found_error", "route not found");
    };
    match operation {
        Operation::Pair | Operation::PairStatus | Operation::WebSocket => {
            continuation_request(state, request, operation).await
        }
        Operation::Enroll
        | Operation::Refresh
        | Operation::List { .. }
        | Operation::Revoke { .. } => primary_request(state, request, operation).await,
    }
}

async fn primary_request(state: AppState, request: Request, operation: Operation) -> Response {
    let method = request.method().clone();
    let uri = request.uri().clone();
    let headers = request.headers().clone();
    let Some(primary) = bearer(&headers) else {
        return authentication_error("Codex remote control requires Router authentication");
    };
    if !primary.starts_with(crate::token::CODEX_TOKEN_PREFIX) {
        return authentication_error(
            "Codex remote-control enrollment requires the paired Router-issued at- token",
        );
    }
    let claims = match crate::proxy::authenticate_client_error(&state, &headers) {
        Ok(claims) => claims,
        Err(error) => return error.render(crate::api_error::ApiDialect::OpenAi),
    };
    let Ok((client, principal)) = crate::client_policy::bound_client(&claims) else {
        return permission_error("Codex remote control requires a managed Codex client token");
    };
    if client != crate::clients::ClientKind::Codex {
        return permission_error("Codex remote control requires a managed Codex client token");
    }
    let principal = principal.to_string();
    let Ok(body) = axum::body::to_bytes(request.into_body(), state.max_proxy_request_bytes).await
    else {
        return api_error(
            StatusCode::PAYLOAD_TOO_LARGE,
            "invalid_request_error",
            "request body exceeds the remote-control proxy limit",
        );
    };
    let selected = match crate::native_service::selected_subscription(
        &state,
        &headers,
        &claims,
        SubscriptionProvider::Codex,
        Some(&body),
    )
    .await
    {
        Ok(selected) => selected,
        Err(response) => return response,
    };
    let root = codex_backend_root(&state, &selected);
    let target = primary_target(&state, &headers, &selected, &service_uri(&uri));

    match operation {
        Operation::Enroll => {
            enroll(state, claims, principal, selected.name, root, body, target).await
        }
        Operation::Refresh => refresh(state, principal, selected.name, root, body, target).await,
        Operation::List { environment_id } | Operation::Revoke { environment_id } => {
            match state
                .provider_store
                .codex_remote_control()
                .owns_environment(&principal, &selected.name, &environment_id)
            {
                Ok(true) => crate::native_service::relay_http(&state, &method, body, target).await,
                Ok(false) => permission_error(
                    "the remote-control environment is not owned by this Router principal",
                ),
                Err(_) => unavailable("remote-control ownership state is unavailable"),
            }
        }
        Operation::Pair | Operation::PairStatus | Operation::WebSocket => unreachable!(),
    }
}

fn service_uri(uri: &axum::http::Uri) -> String {
    let path = uri
        .path()
        .strip_prefix("/api/services/codex/backend-api")
        .unwrap_or_else(|| uri.path());
    uri_path_and_query(path, uri.query().unwrap_or_default())
}

fn uri_path_and_query(path: &str, query: &str) -> String {
    if query.is_empty() {
        path.to_string()
    } else {
        format!("{path}?{query}")
    }
}

fn codex_backend_root(
    state: &AppState,
    selected: &crate::accounts::SelectedSubscriptionAccount,
) -> String {
    let base = state
        .subscription_base_url
        .clone()
        .unwrap_or_else(|| selected.token.base_url(SubscriptionProvider::Codex));
    base.strip_suffix("/codex")
        .unwrap_or(&base)
        .trim_end_matches('/')
        .to_string()
}

fn primary_target(
    state: &AppState,
    incoming: &HeaderMap,
    selected: &crate::accounts::SelectedSubscriptionAccount,
    uri: &str,
) -> crate::native_service::Target {
    let root = codex_backend_root(state, selected);
    let mut headers = crate::proxy::native_request_headers(incoming, &selected.token.access_token);
    if let Some(account_id) = selected.token.account_id.as_deref()
        && let Ok(value) = HeaderValue::from_str(account_id)
    {
        headers.insert("chatgpt-account-id", value);
    }
    crate::native_service::Target {
        client: crate::upstream_client::subscription_client(
            &state.client,
            SubscriptionProvider::Codex,
            state.subscription_base_url.is_some(),
        )
        .clone(),
        url: format!("{root}{uri}"),
        headers,
    }
}

async fn enroll(
    state: AppState,
    claims: crate::token::TokenClaims,
    principal: String,
    account_name: String,
    upstream_root: String,
    body: Bytes,
    target: crate::native_service::Target,
) -> Response {
    let Some(installation_id) = json_string(&body, "installation_id") else {
        return invalid_request("remote-control enrollment requires installation_id");
    };
    let response = match send_buffered(&state, Method::POST, body, target).await {
        Ok(response) => response,
        Err(response) => return response,
    };
    if !response.status.is_success() {
        return response.into_response();
    }
    let (mut json, server_id, environment_id, upstream_token, expires_at) =
        match enrollment_response(&response.body) {
            Ok(parsed) => parsed,
            Err(response) => return response,
        };
    let record = EnrollmentRecord {
        identity: EnrollmentIdentity {
            principal_id: principal,
            account_name,
            server_id,
            environment_id,
            installation_id,
        },
        upstream_token,
        upstream_base_url: upstream_root,
        expires_at,
    };
    let Ok(continuation) = state.provider_store.codex_remote_control().issue(&record) else {
        return unavailable("remote-control continuation state could not be stored");
    };
    json["remote_control_token"] = serde_json::Value::String(continuation);
    crate::audit::record_control_plane_request(
        &state,
        &claims,
        "codex",
        "codex.remote_control.enroll",
    );
    response.with_json(&json)
}

async fn refresh(
    state: AppState,
    principal: String,
    account_name: String,
    upstream_root: String,
    body: Bytes,
    mut target: crate::native_service::Target,
) -> Response {
    let Some(server_id) = json_string(&body, "server_id") else {
        return invalid_request("remote-control refresh requires server_id");
    };
    let Some(installation_id) = json_string(&body, "installation_id") else {
        return invalid_request("remote-control refresh requires installation_id");
    };
    let current = match state.provider_store.codex_remote_control().find(
        &principal,
        &account_name,
        &server_id,
        &installation_id,
    ) {
        Ok(Some(current)) => current,
        Ok(None) => {
            return permission_error(
                "the remote-control enrollment is not owned by this Router principal",
            );
        }
        Err(_) => return unavailable("remote-control continuation state is unavailable"),
    };
    target.url = format!("{}{REFRESH_UPSTREAM}", current.record.upstream_base_url);
    let response = match send_buffered(&state, Method::POST, body, target).await {
        Ok(response) => response,
        Err(response) => return response,
    };
    if !response.status.is_success() {
        return response.into_response();
    }
    let (mut json, returned_server, returned_environment, upstream_token, expires_at) =
        match enrollment_response(&response.body) {
            Ok(parsed) => parsed,
            Err(response) => return response,
        };
    if returned_server != current.record.identity.server_id
        || returned_environment != current.record.identity.environment_id
        || upstream_root != current.record.upstream_base_url
    {
        return unavailable("remote-control refresh returned inconsistent enrollment identity");
    }
    let record = EnrollmentRecord {
        identity: current.record.identity,
        upstream_token,
        upstream_base_url: current.record.upstream_base_url,
        expires_at,
    };
    let continuation = match state
        .provider_store
        .codex_remote_control()
        .rotate(&current.token_hash, &record)
    {
        Ok(token) => token,
        Err(StoreError::StaleRotation) => {
            return unavailable("remote-control enrollment changed during refresh");
        }
        Err(_) => return unavailable("remote-control continuation state could not be stored"),
    };
    json["remote_control_token"] = serde_json::Value::String(continuation);
    response.with_json(&json)
}

async fn continuation_request(state: AppState, request: Request, operation: Operation) -> Response {
    let headers = request.headers().clone();
    let Some(token) = bearer(&headers).filter(|token| token.starts_with(CONTINUATION_PREFIX))
    else {
        return authentication_error("a valid Router remote-control continuation is required");
    };
    let record = match state
        .provider_store
        .codex_remote_control()
        .resolve(token, chrono::Utc::now().timestamp())
    {
        Ok(Some(record)) => record,
        Ok(None) => {
            return authentication_error("the remote-control continuation is invalid or expired");
        }
        Err(_) => return unavailable("remote-control continuation state is unavailable"),
    };
    if operation == Operation::WebSocket && !websocket_identity_matches(&headers, &record.identity)
    {
        return permission_error("the remote-control connection does not match this enrollment");
    }
    let uri = request.uri().clone();
    let target = continuation_target(&state, &headers, &record, &uri);
    if operation == Operation::WebSocket {
        if !is_websocket(&headers) {
            return invalid_request(
                "the remote-control server endpoint requires a WebSocket upgrade",
            );
        }
        return crate::native_service::upgrade_websocket(state, request, target).await;
    }
    let Ok(body) = axum::body::to_bytes(request.into_body(), state.max_proxy_request_bytes).await
    else {
        return api_error(
            StatusCode::PAYLOAD_TOO_LARGE,
            "invalid_request_error",
            "request body exceeds the remote-control proxy limit",
        );
    };
    if operation == Operation::Pair {
        let response = match send_buffered(&state, Method::POST, body, target).await {
            Ok(response) => response,
            Err(response) => return response,
        };
        if response.status.is_success() && !pair_identity_matches(&response.body, &record.identity)
        {
            return unavailable("remote-control pairing returned inconsistent enrollment identity");
        }
        return response.into_response();
    }
    crate::native_service::relay_http(&state, &Method::POST, body, target).await
}

fn continuation_target(
    state: &AppState,
    incoming: &HeaderMap,
    record: &EnrollmentRecord,
    uri: &axum::http::Uri,
) -> crate::native_service::Target {
    let path = uri
        .path()
        .strip_prefix("/api/services/codex/backend-api")
        .unwrap_or_else(|| uri.path());
    let path = uri_path_and_query(path, uri.query().unwrap_or_default());
    crate::native_service::Target {
        client: crate::upstream_client::subscription_client(
            &state.client,
            SubscriptionProvider::Codex,
            state.subscription_base_url.is_some(),
        )
        .clone(),
        url: format!("{}{path}", record.upstream_base_url),
        headers: crate::proxy::native_request_headers(incoming, &record.upstream_token),
    }
}

struct BufferedResponse {
    status: StatusCode,
    headers: HeaderMap,
    body: Bytes,
}

impl BufferedResponse {
    fn into_response(self) -> Response {
        let mut response = Response::new(Body::from(self.body));
        *response.status_mut() = self.status;
        *response.headers_mut() = self.headers;
        response
    }

    fn with_json(self, json: &serde_json::Value) -> Response {
        let mut response = Response::new(Body::from(json.to_string()));
        *response.status_mut() = self.status;
        *response.headers_mut() = self.headers;
        response
    }
}

async fn send_buffered(
    state: &AppState,
    method: Method,
    body: Bytes,
    target: crate::native_service::Target,
) -> Result<BufferedResponse, Response> {
    let upstream = target
        .client
        .request(
            reqwest::Method::from_bytes(method.as_str().as_bytes()).expect("valid HTTP method"),
            target.url,
        )
        .headers(target.headers)
        .body(body.clone())
        .send()
        .await
        .map_err(|_| unavailable("remote-control upstream request failed"))?;
    let status = StatusCode::from_u16(upstream.status().as_u16())
        .unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
    let headers = crate::proxy::relay_response_headers(upstream.headers());
    let mut stream = upstream.bytes_stream();
    let mut response_body = Vec::new();
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|_| unavailable("remote-control upstream response failed"))?;
        if response_body.len().saturating_add(chunk.len()) > state.max_proxy_request_bytes {
            return Err(unavailable(
                "remote-control upstream response exceeds the proxy limit",
            ));
        }
        response_body.extend_from_slice(&chunk);
    }
    state
        .metrics
        .record_bytes(body.len() as u64, response_body.len() as u64);
    Ok(BufferedResponse {
        status,
        headers,
        body: Bytes::from(response_body),
    })
}

fn enrollment_response(
    body: &[u8],
) -> Result<(serde_json::Value, String, String, String, i64), Response> {
    let json: serde_json::Value = serde_json::from_slice(body)
        .map_err(|_| unavailable("remote-control enrollment response is malformed"))?;
    let string = |name| {
        json.get(name)
            .and_then(serde_json::Value::as_str)
            .filter(|value| !value.is_empty())
            .map(str::to_string)
            .ok_or_else(|| unavailable("remote-control enrollment response is malformed"))
    };
    let server_id = string("server_id")?;
    let environment_id = string("environment_id")?;
    let upstream_token = string("remote_control_token")?;
    let expires = string("expires_at")?;
    let expires_at = chrono::DateTime::parse_from_rfc3339(&expires)
        .map_err(|_| unavailable("remote-control enrollment response has an invalid expiry"))?
        .timestamp();
    if expires_at <= chrono::Utc::now().timestamp() {
        return Err(unavailable(
            "remote-control enrollment response is already expired",
        ));
    }
    Ok((json, server_id, environment_id, upstream_token, expires_at))
}

fn json_string(body: &[u8], name: &str) -> Option<String> {
    serde_json::from_slice::<serde_json::Value>(body)
        .ok()?
        .get(name)?
        .as_str()
        .filter(|value| !value.is_empty())
        .map(str::to_string)
}

fn pair_identity_matches(body: &[u8], identity: &EnrollmentIdentity) -> bool {
    let Ok(json) = serde_json::from_slice::<serde_json::Value>(body) else {
        return false;
    };
    json.get("server_id").and_then(serde_json::Value::as_str) == Some(identity.server_id.as_str())
        && json
            .get("environment_id")
            .and_then(serde_json::Value::as_str)
            == Some(identity.environment_id.as_str())
}

fn websocket_identity_matches(headers: &HeaderMap, identity: &EnrollmentIdentity) -> bool {
    header(headers, "x-codex-server-id") == Some(identity.server_id.as_str())
        && header(headers, "x-codex-installation-id") == Some(identity.installation_id.as_str())
}

fn header<'a>(headers: &'a HeaderMap, name: &str) -> Option<&'a str> {
    let mut values = headers.get_all(name).iter();
    let value = values.next()?.to_str().ok()?;
    values.next().is_none().then_some(value)
}

fn bearer(headers: &HeaderMap) -> Option<&str> {
    let value = header(headers, "authorization")?;
    let (scheme, token) = value.split_once(' ')?;
    (scheme.eq_ignore_ascii_case("bearer") && !token.is_empty()).then_some(token)
}

fn is_websocket(headers: &HeaderMap) -> bool {
    header(headers, "upgrade").is_some_and(|value| value.eq_ignore_ascii_case("websocket"))
}

fn decode_path_segment(segment: &str) -> Option<String> {
    if segment.is_empty() {
        return None;
    }
    let bytes = segment.as_bytes();
    let mut decoded = Vec::with_capacity(bytes.len());
    let mut index = 0;
    while index < bytes.len() {
        if bytes[index] == b'%' {
            let high = hex_digit(*bytes.get(index + 1)?)?;
            let low = hex_digit(*bytes.get(index + 2)?)?;
            decoded.push((high << 4) | low);
            index += 3;
        } else {
            decoded.push(bytes[index]);
            index += 1;
        }
    }
    String::from_utf8(decoded)
        .ok()
        .filter(|value| !value.chars().any(char::is_control))
}

const fn hex_digit(byte: u8) -> Option<u8> {
    match byte {
        b'0'..=b'9' => Some(byte - b'0'),
        b'a'..=b'f' => Some(byte - b'a' + 10),
        b'A'..=b'F' => Some(byte - b'A' + 10),
        _ => None,
    }
}

fn invalid_request(message: &str) -> Response {
    api_error(StatusCode::BAD_REQUEST, "invalid_request_error", message)
}

fn authentication_error(message: &str) -> Response {
    api_error(StatusCode::UNAUTHORIZED, "authentication_error", message)
}

fn permission_error(message: &str) -> Response {
    api_error(StatusCode::FORBIDDEN, "permission_error", message)
}

fn unavailable(message: &str) -> Response {
    api_error(StatusCode::SERVICE_UNAVAILABLE, "api_error", message)
}

fn api_error(status: StatusCode, error_type: &str, message: &str) -> Response {
    crate::api_error::PresentedError {
        status,
        error_type,
        message,
    }
    .render(crate::api_error::ApiDialect::OpenAi)
}
