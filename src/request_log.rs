//! Redacted, size-bounded HTTP exchange logging.

mod stream_outcome;

pub use stream_outcome::{
    STREAM_END_MARKER, StreamOutcome, body_is_inspectable, frame_terminates_stream,
    is_streaming_media_type, response_is_streamed, settle_stream, stream_warrants_a_warning,
};

use std::collections::{BTreeMap, HashMap};
use std::fs::{self, OpenOptions};
use std::io::Write as _;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::Instant;

use axum::body::Body;
use axum::extract::{Request, State};
use axum::http::{HeaderMap, HeaderValue};
use axum::middleware::Next;
use axum::response::Response;
use futures_util::StreamExt as _;
use serde_json::{Map, Value, json};
use sha2::{Digest as _, Sha256};

use crate::app_state::AppState;

/// Default maximum size of `requests.jsonl` (100 MiB).
pub const DEFAULT_MAX_BYTES: u64 = 100 * 1024 * 1024;
const MAX_BUFFERED_REQUEST_BYTES: usize = 10 * 1024 * 1024;
const REDACTED: &str = "[REDACTED]";
const UNAUTHENTICATED: &str = "unauthenticated";
const TOKEN_HASH_HEX_LENGTH: usize = 32;
const REDACTED_PREFIX_LENGTH: usize = 3;
const REDACTED_SUFFIX_LENGTH: usize = 3;
const MIN_PARTIAL_REDACTION_LENGTH: usize = 12;

#[derive(Clone, Debug)]
struct LogIdentity {
    hash: String,
    id: Option<String>,
    label: Option<String>,
}

impl LogIdentity {
    fn unauthenticated() -> Self {
        Self {
            hash: UNAUTHENTICATED.to_string(),
            id: None,
            label: None,
        }
    }
}

/// A JSONL request log which retains the newest complete records.
#[derive(Debug)]
pub struct RequestLog {
    root: PathBuf,
    max_bytes: u64,
    write_lock: Mutex<()>,
    routes: Mutex<HashMap<String, LogIdentity>>,
}

impl RequestLog {
    /// Build the default logger, with optional environment overrides.
    ///
    /// `REQUEST_LOG` selects the root directory and `REQUEST_LOG_MAX_BYTES`
    /// selects the per-token hard size limit. An empty path falls back to
    /// `<data-dir>/requests`.
    #[must_use]
    pub fn from_data_dir(data_dir: &Path) -> Self {
        let path = std::env::var_os("REQUEST_LOG")
            .filter(|value| !value.is_empty())
            .map_or_else(|| data_dir.join("requests"), PathBuf::from);
        let max_bytes = std::env::var("REQUEST_LOG_MAX_BYTES")
            .ok()
            .and_then(|value| value.parse().ok())
            .filter(|value| *value > 0)
            .unwrap_or(DEFAULT_MAX_BYTES);
        Self::new(path, max_bytes)
    }

    /// Build a logger at `path` with an exact byte limit.
    #[must_use]
    pub fn new(root: PathBuf, max_bytes: u64) -> Self {
        Self {
            root,
            max_bytes: max_bytes.max(1),
            write_lock: Mutex::new(()),
            routes: Mutex::new(HashMap::new()),
        }
    }

    /// Root directory containing one request log per token identity.
    #[must_use]
    pub fn path(&self) -> &Path {
        &self.root
    }

    /// Configured maximum file size.
    #[must_use]
    pub const fn max_bytes(&self) -> u64 {
        self.max_bytes
    }

    /// Append one structured event, removing credentials before serialization.
    pub fn record(&self, correlation_id: &str, phase: &str, fields: Value) {
        let identity = self.identity(correlation_id);
        let mut event = Map::new();
        event.insert(
            "time".into(),
            Value::String(chrono::Utc::now().to_rfc3339()),
        );
        event.insert(
            "correlation_id".into(),
            Value::String(correlation_id.to_string()),
        );
        event.insert("phase".into(), Value::String(phase.to_string()));
        event.insert("token_hash".into(), Value::String(identity.hash.clone()));
        event.insert(
            "token_id".into(),
            identity.id.clone().map_or(Value::Null, Value::String),
        );
        event.insert(
            "token_label".into(),
            identity.label.clone().map_or(Value::Null, Value::String),
        );
        if let Value::Object(fields) = redact_value(fields) {
            event.extend(fields);
        }
        let Ok(mut line) = serde_json::to_vec(&event) else {
            return;
        };
        line.push(b'\n');
        if line.len() as u64 > self.max_bytes {
            let omitted = line.len();
            line = serde_json::to_vec(&json!({
                "time": chrono::Utc::now().to_rfc3339(),
                "correlation_id": correlation_id,
                "phase": phase,
                "token_hash": identity.hash,
                "token_id": identity.id,
                "token_label": identity.label,
                "body": format!("[OMITTED: {omitted} byte record exceeds log limit]")
            }))
            .unwrap_or_default();
            line.push(b'\n');
        }
        self.append_bounded(&identity.hash, &line);
    }

    fn identity(&self, correlation_id: &str) -> LogIdentity {
        self.routes
            .lock()
            .ok()
            .and_then(|routes| routes.get(correlation_id).cloned())
            .unwrap_or_else(LogIdentity::unauthenticated)
    }

    fn route_request(&self, correlation_id: &str, identity: LogIdentity) {
        if let Ok(mut routes) = self.routes.lock() {
            routes.insert(correlation_id.to_string(), identity);
        }
    }

    fn finish_request(&self, correlation_id: &str) {
        if let Ok(mut routes) = self.routes.lock() {
            routes.remove(correlation_id);
        }
    }

    fn log_path(&self, token_hash: &str) -> PathBuf {
        self.root.join(token_hash).join("requests.jsonl")
    }

    fn append_bounded(&self, token_hash: &str, line: &[u8]) {
        let Ok(_guard) = self.write_lock.lock() else {
            return;
        };
        let path = self.log_path(token_hash);
        if let Err(error) = ensure_owner_only_dir(&self.root)
            .and_then(|()| ensure_owner_only_dir(path.parent().unwrap_or(&self.root)))
        {
            tracing::warn!("request log directory creation failed: {error}");
            return;
        }
        if line.len() as u64 > self.max_bytes {
            if let Err(error) = write_owner_only(&path, &[]) {
                tracing::warn!(
                    "request log truncation failed ({}): {error}",
                    path.display()
                );
            }
            return;
        }
        let existing_len = fs::metadata(&path).map_or(0, |metadata| metadata.len());
        if existing_len.saturating_add(line.len() as u64) > self.max_bytes {
            self.retain_newest_before(&path, line.len());
        }
        let result = append_owner_only(&path, line);
        if let Err(error) = result {
            tracing::warn!("request log write failed ({}): {error}", path.display());
        }
    }

    fn retain_newest_before(&self, path: &Path, incoming_len: usize) {
        let Ok(existing) = fs::read(path) else {
            return;
        };
        let capacity = usize::try_from(self.max_bytes)
            .unwrap_or(usize::MAX)
            .saturating_sub(incoming_len);
        let start_floor = existing.len().saturating_sub(capacity);
        let start = existing[start_floor..]
            .iter()
            .position(|byte| *byte == b'\n')
            .map_or(existing.len(), |offset| start_floor + offset + 1);
        if let Err(error) = write_owner_only(path, &existing[start..]) {
            tracing::warn!(
                "request log compaction failed ({}): {error}",
                path.display()
            );
        }
    }

    /// Send a prepared upstream request while recording the exact request and
    /// the response metadata under the client request's correlation id.
    pub async fn send_upstream(
        &self,
        correlation_id: &str,
        client: &reqwest::Client,
        builder: reqwest::RequestBuilder,
    ) -> reqwest::Result<reqwest::Response> {
        let request = builder.build()?;
        self.record(
            correlation_id,
            "upstream_request",
            json!({
                "method": request.method().as_str(),
                "uri": request.url().as_str(),
                "headers": redacted_headers(request.headers()),
                "body": request.body().and_then(reqwest::Body::as_bytes).map(redacted_body),
            }),
        );
        let started = Instant::now();
        let result = client.execute(request).await;
        match &result {
            Ok(response) => self.record(
                correlation_id,
                "upstream_response",
                json!({
                    "status": response.status().as_u16(),
                    "headers": redacted_headers(response.headers()),
                    "latency_ms": started.elapsed().as_millis(),
                }),
            ),
            Err(error) => self.record(
                correlation_id,
                "upstream_error",
                json!({
                    "error": error.to_string(),
                    "latency_ms": started.elapsed().as_millis(),
                }),
            ),
        }
        result
    }

    /// Record bytes received from the upstream (one event per stream chunk).
    pub fn record_upstream_body(&self, correlation_id: &str, body: &[u8]) {
        self.record(
            correlation_id,
            "upstream_response_body",
            json!({"body": redacted_body(body)}),
        );
    }

    /// Record how a streamed exchange *ended*.
    ///
    /// The status line is written when the response headers arrive, so for a
    /// streaming turn `status=200` says nothing about whether the turn
    /// completed. A stream cut mid-flight was therefore logged as a clean
    /// success while the client reported a truncated answer — a false negative
    /// in the router's own observability (issue #230).
    pub fn record_stream_end(&self, correlation_id: &str, outcome: &StreamOutcome) {
        self.record(
            correlation_id,
            "stream_end",
            json!({
                "outcome": outcome.label(),
                "streamed": outcome.streamed,
                "inspectable": outcome.inspectable,
                "complete": outcome.is_complete(),
                "frames": outcome.frames,
                "bytes": outcome.bytes,
                "duration_ms": outcome.duration_ms,
                "detail": outcome.detail,
            }),
        );
    }
}

fn ensure_owner_only_dir(path: &Path) -> std::io::Result<()> {
    fs::create_dir_all(path)?;
    set_dir_owner_only(path)
}

#[cfg(unix)]
fn set_dir_owner_only(path: &Path) -> std::io::Result<()> {
    use std::os::unix::fs::PermissionsExt as _;

    fs::set_permissions(path, fs::Permissions::from_mode(0o700))
}

#[cfg(not(unix))]
fn set_dir_owner_only(_path: &Path) -> std::io::Result<()> {
    Ok(())
}

fn append_owner_only(path: &Path, contents: &[u8]) -> std::io::Result<()> {
    let mut options = OpenOptions::new();
    options.create(true).append(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt as _;
        options.mode(0o600);
    }
    let mut file = options.open(path)?;
    set_owner_only(&file)?;
    file.write_all(contents)
}

fn write_owner_only(path: &Path, contents: &[u8]) -> std::io::Result<()> {
    let mut options = OpenOptions::new();
    options.create(true).write(true).truncate(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt as _;
        options.mode(0o600);
    }
    let mut file = options.open(path)?;
    set_owner_only(&file)?;
    file.write_all(contents)
}

#[cfg(unix)]
fn set_owner_only(file: &fs::File) -> std::io::Result<()> {
    use std::os::unix::fs::PermissionsExt as _;

    file.set_permissions(fs::Permissions::from_mode(0o600))
}

#[cfg(not(unix))]
fn set_owner_only(_file: &fs::File) -> std::io::Result<()> {
    Ok(())
}

/// Correlation id injected by [`log_http_exchange`]. Direct handler tests that
/// bypass middleware receive a fresh id instead of sharing an ambiguous value.
#[must_use]
pub fn correlation_id(headers: &HeaderMap) -> String {
    headers
        .get("x-request-id")
        .and_then(|value| value.to_str().ok())
        .filter(|value| !value.is_empty())
        .map_or_else(|| uuid::Uuid::new_v4().to_string(), str::to_string)
}

/// Stable, non-reversible directory key for one router token.
#[must_use]
pub fn token_log_key(token: &str) -> String {
    let digest = hex::encode(Sha256::digest(token.as_bytes()));
    digest[..TOKEN_HASH_HEX_LENGTH].to_string()
}

fn partially_redact(value: &str) -> String {
    let length = value.chars().count();
    if length < MIN_PARTIAL_REDACTION_LENGTH {
        return REDACTED.to_string();
    }
    let prefix = value
        .chars()
        .take(REDACTED_PREFIX_LENGTH)
        .collect::<String>();
    let suffix = value
        .chars()
        .skip(length - REDACTED_SUFFIX_LENGTH)
        .collect::<String>();
    let mask = "*".repeat(length - REDACTED_PREFIX_LENGTH - REDACTED_SUFFIX_LENGTH);
    format!("{prefix}{mask}{suffix}")
}

fn redact_secret(value: &str) -> String {
    let trimmed = value.trim();
    if trimmed
        .get(..7)
        .is_some_and(|prefix| prefix.eq_ignore_ascii_case("bearer "))
    {
        return format!("{}{}", &trimmed[..7], partially_redact(&trimmed[7..]));
    }
    partially_redact(trimmed)
}

/// Mask credentials while retaining header names for diagnostics.
#[must_use]
pub fn redacted_headers(headers: &HeaderMap) -> BTreeMap<String, String> {
    headers
        .iter()
        .map(|(name, value)| {
            let name = name.as_str().to_string();
            let value = if is_secret_name(&name) {
                value
                    .to_str()
                    .map_or_else(|_| REDACTED.to_string(), redact_secret)
            } else {
                value.to_str().map_or_else(
                    |_| "[NON-UTF8]".to_string(),
                    |value| {
                        if is_secret_value(value) {
                            redact_secret(value)
                        } else {
                            value.to_string()
                        }
                    },
                )
            };
            (name, value)
        })
        .collect()
}

/// How a body that is not valid UTF-8 is represented in the log.
///
/// `String::from_utf8_lossy` replaces every invalid byte with U+FFFD, which for
/// a compressed body destroys it: the record is then neither readable nor
/// decodable after the fact (issue #231). Such a body is base64-encoded instead,
/// under a marker that says what the reader is looking at.
const BINARY_BODY_KEY: &str = "base64";

/// Encode a body for the log without losing it.
///
/// A body is stored as JSON when it parses as JSON, as text when it is valid
/// UTF-8, and otherwise as base64 — which is what a `gzip`, `br` or `zstd`
/// response looks like here, because the router does not decompress upstream
/// bodies and a single frame of a compressed *stream* cannot be decoded on its
/// own anyway.
#[must_use]
pub fn redacted_body(body: &[u8]) -> Value {
    if let Ok(value) = serde_json::from_slice::<Value>(body) {
        return redact_value(value);
    }
    std::str::from_utf8(body).map_or_else(
        |_| {
            json!({
                BINARY_BODY_KEY: base64::Engine::encode(
                    &base64::engine::general_purpose::STANDARD,
                    body,
                ),
                "bytes": body.len(),
            })
        },
        |text| Value::String(text.to_string()),
    )
}

fn redact_value(mut value: Value) -> Value {
    match &mut value {
        Value::Object(object) => {
            for (key, child) in object {
                if is_secret_name(key) {
                    *child = child.as_str().map_or_else(
                        || Value::String(REDACTED.to_string()),
                        |secret| Value::String(redact_secret(secret)),
                    );
                } else if key.eq_ignore_ascii_case("uri")
                    && let Value::String(uri) = child
                {
                    *uri = redacted_uri(uri);
                } else {
                    *child = redact_value(child.take());
                }
            }
        }
        Value::Array(array) => {
            for child in array {
                *child = redact_value(child.take());
            }
        }
        Value::String(text) if is_secret_value(text) => {
            *text = redact_secret(text);
        }
        _ => {}
    }
    value
}

fn is_secret_name(name: &str) -> bool {
    let normalized = normalize_name(name);
    matches!(
        normalized.as_str(),
        "authorization"
            | "proxy_authorization"
            | "x_api_key"
            | "api_key"
            | "key"
            | "cookie"
            | "set_cookie"
            | "access_token"
            | "refresh_token"
            | "oauth_token"
            | "auth_token"
            | "security_token"
            | "x_auth_token"
            | "x_goog_api_key"
            | "x_amz_security_token"
            | "token"
            | "password"
            | "secret"
            | "client_secret"
            | "private_key"
    ) || normalized.ends_with("_password")
        || normalized.ends_with("_secret")
        || normalized.ends_with("_token")
        || normalized.ends_with("_api_key")
}

fn normalize_name(name: &str) -> String {
    let mut normalized = String::with_capacity(name.len());
    let mut previous_was_lowercase_or_digit = false;
    for character in name.chars() {
        if character.is_ascii_uppercase() {
            if previous_was_lowercase_or_digit && !normalized.ends_with('_') {
                normalized.push('_');
            }
            normalized.push(character.to_ascii_lowercase());
            previous_was_lowercase_or_digit = false;
        } else if character.is_ascii_alphanumeric() {
            normalized.push(character.to_ascii_lowercase());
            previous_was_lowercase_or_digit =
                character.is_ascii_lowercase() || character.is_ascii_digit();
        } else {
            if !normalized.ends_with('_') {
                normalized.push('_');
            }
            previous_was_lowercase_or_digit = false;
        }
    }
    normalized.trim_matches('_').to_string()
}

fn is_secret_value(value: &str) -> bool {
    let value = value.trim();
    value
        .get(..7)
        .is_some_and(|prefix| prefix.eq_ignore_ascii_case("bearer "))
        || [
            "sk-ant-",
            crate::token::TOKEN_PREFIX,
            crate::admin::ADMIN_TOKEN_PREFIX,
        ]
        .iter()
        .any(|prefix| value.contains(prefix))
        || is_jwt(
            value
                .strip_prefix(crate::token::TOKEN_PREFIX)
                .unwrap_or(value),
        )
}

fn is_jwt(value: &str) -> bool {
    let mut segments = value.split('.');
    let Some(header) = segments.next() else {
        return false;
    };
    let Some(payload) = segments.next() else {
        return false;
    };
    let Some(signature) = segments.next() else {
        return false;
    };
    segments.next().is_none()
        && header.starts_with("eyJ")
        && [header, payload, signature].iter().all(|segment| {
            segment.len() >= 8
                && segment.chars().all(|character| {
                    character.is_ascii_alphanumeric() || matches!(character, '-' | '_')
                })
        })
}

fn redacted_uri(uri: &str) -> String {
    let Some((path, query)) = uri.split_once('?') else {
        return uri.to_string();
    };
    let query = query
        .split('&')
        .map(|parameter| {
            let (name, value) = parameter.split_once('=').unwrap_or((parameter, ""));
            let decoded_name = percent_decode(name);
            let decoded_value = percent_decode(value);
            if is_secret_name(&decoded_name) || is_secret_value(&decoded_value) {
                format!("{name}={}", redact_secret(&decoded_value))
            } else {
                parameter.to_string()
            }
        })
        .collect::<Vec<_>>()
        .join("&");
    format!("{path}?{query}")
}

fn percent_decode(value: &str) -> String {
    let bytes = value.as_bytes();
    let mut decoded = Vec::with_capacity(bytes.len());
    let mut index = 0;
    while index < bytes.len() {
        match bytes[index] {
            b'%' if index + 2 < bytes.len() => {
                if let (Some(high), Some(low)) =
                    (hex_digit(bytes[index + 1]), hex_digit(bytes[index + 2]))
                {
                    decoded.push(high * 16 + low);
                    index += 3;
                    continue;
                }
                decoded.push(bytes[index]);
            }
            b'+' => decoded.push(b' '),
            byte => decoded.push(byte),
        }
        index += 1;
    }
    String::from_utf8_lossy(&decoded).into_owned()
}

const fn hex_digit(byte: u8) -> Option<u8> {
    match byte {
        b'0'..=b'9' => Some(byte - b'0'),
        b'a'..=b'f' => Some(byte - b'a' + 10),
        b'A'..=b'F' => Some(byte - b'A' + 10),
        _ => None,
    }
}

struct ClientRequestCapture {
    logger: Arc<RequestLog>,
    correlation_id: String,
    method: String,
    uri: String,
    version: String,
    headers: BTreeMap<String, String>,
    body: Vec<u8>,
    omitted: bool,
    recorded: bool,
}

impl ClientRequestCapture {
    /// Whether the client's own headers claim a body accompanied the request.
    ///
    /// This is what makes a bodiless `GET` distinguishable from a request whose
    /// body was never read: the former declares nothing, the latter declares a
    /// length (or a chunked encoding) that the record must not contradict.
    fn declared_a_body(&self) -> bool {
        let declared_length = self
            .headers
            .get("content-length")
            .and_then(|value| value.parse::<u64>().ok())
            .is_some_and(|length| length > 0);
        let chunked = self
            .headers
            .get("transfer-encoding")
            .is_some_and(|value| value.to_ascii_lowercase().contains("chunked"));
        declared_length || chunked
    }

    fn push(&mut self, bytes: &[u8]) {
        if self.omitted {
            return;
        }
        if self.body.len().saturating_add(bytes.len()) > MAX_BUFFERED_REQUEST_BYTES {
            self.body.clear();
            self.omitted = true;
        } else {
            self.body.extend_from_slice(bytes);
        }
    }

    fn record(&mut self) {
        if self.recorded {
            return;
        }
        let body = if self.omitted {
            Value::String(format!(
                "[OMITTED: request body exceeds {MAX_BUFFERED_REQUEST_BYTES} byte logging limit]"
            ))
        } else if self.body.is_empty() && self.declared_a_body() {
            // The capture fills only as a handler reads the stream. A request
            // refused before that — an authentication failure is the common
            // case — drops the stream unread, so an empty buffer here does not
            // mean an empty body. Recording `""` would assert something the
            // headers in the same record contradict (issue #210).
            //
            // The body is deliberately *not* buffered to recover it: that would
            // let an unauthenticated caller make the router hold
            // `MAX_BUFFERED_REQUEST_BYTES` per request. A truthful marker fixes
            // the misleading record without taking on that cost.
            Value::String(
                "[NOT READ: request was rejected before the body was consumed]".to_string(),
            )
        } else {
            redacted_body(&self.body)
        };
        self.logger.record(
            &self.correlation_id,
            "client_request",
            json!({
                "method": self.method,
                "uri": self.uri,
                "version": self.version,
                "headers": self.headers,
                "body": body,
            }),
        );
        self.recorded = true;
    }
}

impl Drop for ClientRequestCapture {
    fn drop(&mut self) {
        self.record();
    }
}

struct RequestRouteGuard {
    logger: Arc<RequestLog>,
    correlation_id: String,
}

impl Drop for RequestRouteGuard {
    fn drop(&mut self) {
        self.logger.finish_request(&self.correlation_id);
    }
}

/// Middleware that records every client-side HTTP exchange by default.
pub async fn log_http_exchange(
    State(state): State<AppState>,
    request: Request,
    next: Next,
) -> Response {
    let correlation_id = uuid::Uuid::new_v4().to_string();
    let (mut parts, body) = request.into_parts();
    let identity = crate::proxy::extract_client_token(&parts.headers)
        .and_then(|token| {
            state
                .token_manager
                .validate_token(token)
                .ok()
                .map(|claims| LogIdentity {
                    hash: token_log_key(token),
                    id: Some(claims.sub),
                    label: Some(claims.label),
                })
        })
        .unwrap_or_else(LogIdentity::unauthenticated);
    state.request_log.route_request(&correlation_id, identity);
    let route_guard = RequestRouteGuard {
        logger: Arc::clone(&state.request_log),
        correlation_id: correlation_id.clone(),
    };
    parts.headers.insert(
        "x-request-id",
        HeaderValue::from_str(&correlation_id).expect("UUID is a valid header value"),
    );
    let logged_uri = redacted_uri(&parts.uri.to_string());
    let capture = ClientRequestCapture {
        logger: Arc::clone(&state.request_log),
        correlation_id: correlation_id.clone(),
        method: parts.method.as_str().to_string(),
        uri: logged_uri.clone(),
        version: format!("{:?}", parts.version),
        headers: redacted_headers(&parts.headers),
        body: Vec::new(),
        omitted: false,
        recorded: false,
    };
    let stream = futures_util::stream::unfold(
        (body.into_data_stream(), capture),
        |(mut stream, mut capture)| async move {
            match stream.next().await {
                Some(Ok(bytes)) => {
                    capture.push(&bytes);
                    Some((Ok::<_, axum::Error>(bytes), (stream, capture)))
                }
                Some(Err(error)) => {
                    capture.omitted = true;
                    Some((Err(error), (stream, capture)))
                }
                None => {
                    capture.record();
                    None
                }
            }
        },
    );
    tracing::info!(request_id = %correlation_id, method = %parts.method, uri = %logged_uri, "request");

    let started = Instant::now();
    let mut response = next
        .run(Request::from_parts(parts, Body::from_stream(stream)))
        .await;
    response.headers_mut().insert(
        "x-request-id",
        HeaderValue::from_str(&correlation_id).expect("UUID is a valid header value"),
    );
    state.request_log.record(
        &correlation_id,
        "client_response",
        json!({
            "status": response.status().as_u16(),
            "headers": redacted_headers(response.headers()),
            "latency_ms": started.elapsed().as_millis(),
        }),
    );
    tracing::info!(request_id = %correlation_id, status = response.status().as_u16(), latency_ms = started.elapsed().as_millis(), "response");

    let (parts, body) = response.into_parts();
    let logger = std::sync::Arc::clone(&state.request_log);
    let response_id = correlation_id;
    let stream = body.into_data_stream().map(move |chunk| {
        let _keep_route_until_response_body_finishes = &route_guard;
        if let Ok(bytes) = &chunk {
            logger.record(
                &response_id,
                "client_response_body",
                json!({"body": redacted_body(bytes)}),
            );
        }
        chunk
    });
    Response::from_parts(parts, Body::from_stream(stream))
}

#[cfg(test)]
#[path = "request_log_tests.rs"]
mod tests;

#[cfg(test)]
#[path = "request_log_isolation_tests.rs"]
mod isolation_tests;
