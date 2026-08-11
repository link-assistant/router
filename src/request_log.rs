//! Redacted, size-bounded HTTP exchange logging.

use std::collections::BTreeMap;
use std::fs::{self, OpenOptions};
use std::io::Write as _;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::Instant;

use axum::body::Body;
use axum::extract::{Request, State};
use axum::http::{HeaderMap, HeaderValue};
use axum::middleware::Next;
use axum::response::Response;
use futures_util::StreamExt as _;
use serde_json::{Map, Value, json};

use crate::app_state::AppState;

/// Default maximum size of `requests.jsonl` (100 MiB).
pub const DEFAULT_MAX_BYTES: u64 = 100 * 1024 * 1024;
const MAX_BUFFERED_REQUEST_BYTES: usize = 10 * 1024 * 1024;
const REDACTED: &str = "[REDACTED]";

/// A JSONL request log which retains the newest complete records.
#[derive(Debug)]
pub struct RequestLog {
    path: PathBuf,
    max_bytes: u64,
    write_lock: Mutex<()>,
}

impl RequestLog {
    /// Build the default logger, with optional environment overrides.
    ///
    /// `REQUEST_LOG` selects the path and `REQUEST_LOG_MAX_BYTES` selects the
    /// hard size limit. An empty path falls back to `<data-dir>/requests.jsonl`.
    #[must_use]
    pub fn from_data_dir(data_dir: &Path) -> Self {
        let path = std::env::var_os("REQUEST_LOG")
            .filter(|value| !value.is_empty())
            .map_or_else(|| data_dir.join("requests.jsonl"), PathBuf::from);
        let max_bytes = std::env::var("REQUEST_LOG_MAX_BYTES")
            .ok()
            .and_then(|value| value.parse().ok())
            .filter(|value| *value > 0)
            .unwrap_or(DEFAULT_MAX_BYTES);
        Self::new(path, max_bytes)
    }

    /// Build a logger at `path` with an exact byte limit.
    #[must_use]
    pub fn new(path: PathBuf, max_bytes: u64) -> Self {
        Self {
            path,
            max_bytes: max_bytes.max(1),
            write_lock: Mutex::new(()),
        }
    }

    /// Destination of this request log.
    #[must_use]
    pub fn path(&self) -> &Path {
        &self.path
    }

    /// Configured maximum file size.
    #[must_use]
    pub const fn max_bytes(&self) -> u64 {
        self.max_bytes
    }

    /// Append one structured event, removing credentials before serialization.
    pub fn record(&self, correlation_id: &str, phase: &str, fields: Value) {
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
                "body": format!("[OMITTED: {omitted} byte record exceeds log limit]")
            }))
            .unwrap_or_default();
            line.push(b'\n');
        }
        self.append_bounded(&line);
    }

    fn append_bounded(&self, line: &[u8]) {
        let Ok(_guard) = self.write_lock.lock() else {
            return;
        };
        if let Some(parent) = self.path.parent()
            && let Err(error) = fs::create_dir_all(parent)
        {
            tracing::warn!("request log directory creation failed: {error}");
            return;
        }
        if line.len() as u64 > self.max_bytes {
            if let Err(error) = fs::write(&self.path, []) {
                tracing::warn!(
                    "request log truncation failed ({}): {error}",
                    self.path.display()
                );
            }
            return;
        }
        let existing_len = fs::metadata(&self.path).map_or(0, |metadata| metadata.len());
        if existing_len.saturating_add(line.len() as u64) > self.max_bytes {
            self.retain_newest_before(line.len());
        }
        let result = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&self.path)
            .and_then(|mut file| file.write_all(line));
        if let Err(error) = result {
            tracing::warn!(
                "request log write failed ({}): {error}",
                self.path.display()
            );
        }
    }

    fn retain_newest_before(&self, incoming_len: usize) {
        let Ok(existing) = fs::read(&self.path) else {
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
        if let Err(error) = fs::write(&self.path, &existing[start..]) {
            tracing::warn!(
                "request log compaction failed ({}): {error}",
                self.path.display()
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

/// Mask credentials while retaining header names for diagnostics.
#[must_use]
pub fn redacted_headers(headers: &HeaderMap) -> BTreeMap<String, String> {
    headers
        .iter()
        .map(|(name, value)| {
            let name = name.as_str().to_string();
            let value = if is_secret_name(&name) {
                REDACTED.to_string()
            } else {
                value
                    .to_str()
                    .map_or_else(|_| "[NON-UTF8]".to_string(), str::to_string)
            };
            (name, value)
        })
        .collect()
}

/// Represent a body as JSON when possible, redacting credential-shaped keys.
#[must_use]
pub fn redacted_body(body: &[u8]) -> Value {
    serde_json::from_slice(body).map_or_else(
        |_| Value::String(String::from_utf8_lossy(body).into_owned()),
        redact_value,
    )
}

fn redact_value(mut value: Value) -> Value {
    match &mut value {
        Value::Object(object) => {
            for (key, child) in object {
                if is_secret_name(key) {
                    *child = Value::String(REDACTED.to_string());
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
        _ => {}
    }
    value
}

fn is_secret_name(name: &str) -> bool {
    matches!(
        name.to_ascii_lowercase().replace('-', "_").as_str(),
        "authorization"
            | "proxy_authorization"
            | "x_api_key"
            | "api_key"
            | "cookie"
            | "set_cookie"
            | "access_token"
            | "refresh_token"
            | "oauth_token"
    )
}

/// Middleware that records every client-side HTTP exchange by default.
pub async fn log_http_exchange(
    State(state): State<AppState>,
    request: Request,
    next: Next,
) -> Response {
    let correlation_id = uuid::Uuid::new_v4().to_string();
    let (mut parts, body) = request.into_parts();
    parts.headers.insert(
        "x-request-id",
        HeaderValue::from_str(&correlation_id).expect("UUID is a valid header value"),
    );
    let body = match axum::body::to_bytes(body, MAX_BUFFERED_REQUEST_BYTES).await {
        Ok(body) => body,
        Err(error) => {
            state.request_log.record(
                &correlation_id,
                "client_request_error",
                json!({"error": error.to_string()}),
            );
            return (
                axum::http::StatusCode::PAYLOAD_TOO_LARGE,
                "request body exceeds 10 MiB logging limit",
            )
                .into_response();
        }
    };
    state.request_log.record(
        &correlation_id,
        "client_request",
        json!({
            "method": parts.method.as_str(),
            "uri": parts.uri.to_string(),
            "version": format!("{:?}", parts.version),
            "headers": redacted_headers(&parts.headers),
            "body": redacted_body(&body),
        }),
    );
    tracing::info!(request_id = %correlation_id, method = %parts.method, uri = %parts.uri, "request");

    let started = Instant::now();
    let mut response = next.run(Request::from_parts(parts, Body::from(body))).await;
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

use axum::response::IntoResponse as _;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn credentials_are_redacted_from_headers_and_json_bodies() {
        let mut headers = HeaderMap::new();
        headers.insert("authorization", HeaderValue::from_static("Bearer secret"));
        headers.insert("x-api-key", HeaderValue::from_static("secret-key"));
        headers.insert("x-visible", HeaderValue::from_static("marker"));
        let redacted = redacted_headers(&headers);
        assert_eq!(redacted["authorization"], REDACTED);
        assert_eq!(redacted["x-api-key"], REDACTED);
        assert_eq!(redacted["x-visible"], "marker");

        let body = redacted_body(br#"{"access_token":"secret","nested":{"api_key":"key"}}"#);
        let rendered = body.to_string();
        assert!(!rendered.contains("secret"));
        assert!(!rendered.contains("\"key\""));
        assert!(rendered.contains(REDACTED));
    }

    #[test]
    fn log_never_exceeds_limit_and_keeps_newest_complete_record() {
        let dir = tempfile::tempdir().expect("temporary directory");
        let path = dir.path().join("requests.jsonl");
        let log = RequestLog::new(path.clone(), 600);
        for sequence in 0..30 {
            log.record("request", "test", json!({"sequence": sequence}));
        }
        let bytes = fs::read(&path).expect("request log");
        assert!(bytes.len() <= 600);
        let text = String::from_utf8(bytes).expect("UTF-8 JSONL");
        assert!(
            text.lines()
                .all(|line| serde_json::from_str::<Value>(line).is_ok())
        );
        assert!(text.contains("\"sequence\":29"));
        assert!(!text.contains("\"sequence\":0,"));

        let tiny_path = dir.path().join("tiny.jsonl");
        let tiny = RequestLog::new(tiny_path.clone(), 32);
        tiny.record("request", "oversized", json!({"body": "far too large"}));
        assert!(fs::metadata(tiny_path).expect("tiny log").len() <= 32);
    }

    #[tokio::test]
    async fn transformed_upstream_exchange_is_logged_with_same_id() {
        use tokio::io::{AsyncReadExt as _, AsyncWriteExt as _};

        let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
            .await
            .expect("mock upstream");
        let address = listener.local_addr().expect("mock address");
        let server = tokio::spawn(async move {
            let (mut stream, _) = listener.accept().await.expect("accept request");
            let mut request = vec![0; 4096];
            let _ = stream.read(&mut request).await.expect("read request");
            stream
                .write_all(
                    b"HTTP/1.1 200 OK\r\ncontent-type: application/json\r\ncontent-length: 27\r\n\r\n{\"reply\":\"upstream-marker\"}",
                )
                .await
                .expect("write response");
        });

        let dir = tempfile::tempdir().expect("temporary directory");
        let path = dir.path().join("requests.jsonl");
        let log = RequestLog::new(path.clone(), 1024 * 1024);
        let client = reqwest::Client::new();
        let request = client
            .post(format!("http://{address}/translated"))
            .header("authorization", "Bearer upstream-secret")
            .header("x-transformed", "translated-header")
            .body(r#"{"translated":"body-marker","access_token":"body-secret"}"#);
        let response = log
            .send_upstream("same-correlation-id", &client, request)
            .await
            .expect("upstream response");
        let body = response.bytes().await.expect("response body");
        log.record_upstream_body("same-correlation-id", &body);
        server.await.expect("mock server task");

        let rendered = fs::read_to_string(path).expect("request log");
        assert!(rendered.contains("same-correlation-id"));
        assert!(rendered.contains("upstream_request"));
        assert!(rendered.contains("translated-header"));
        assert!(rendered.contains("body-marker"));
        assert!(rendered.contains("upstream_response_body"));
        assert!(rendered.contains("upstream-marker"));
        assert!(!rendered.contains("upstream-secret"));
        assert!(!rendered.contains("body-secret"));
    }
}
