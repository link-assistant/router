//! Redacted, size-bounded HTTP exchange logging.

mod owner_only;
mod redaction;
mod stream_outcome;

pub use stream_outcome::{
    STREAM_END_MARKER, StreamOutcome, body_is_inspectable, frame_terminates_stream,
    is_streaming_media_type, response_is_streamed, settle_stream, stream_warrants_a_warning,
    text_terminates_stream,
};

use std::collections::{BTreeMap, HashMap};
use std::fs;
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
use owner_only::{append_owner_only, ensure_owner_only_dir, write_owner_only};
pub use redaction::BINARY_BODY_KEY;
#[cfg(test)]
use redaction::partially_redact;
use redaction::{redact_value, redacted_uri};
pub use redaction::{redacted_body, redacted_headers};

/// Default maximum size of one token's `requests.jsonl` (100 MiB).
pub const DEFAULT_MAX_BYTES: u64 = 100 * 1024 * 1024;
/// Default maximum size of the whole request store across every token (4 GiB).
///
/// The per-token bound is deliberately per-token: it keeps a noisy caller from
/// evicting a quiet one's history. What it is not is a bound on the store, and
/// it was documented as "Maximum size of the request log" — so a deployment
/// that set 500 MB and had issued 84 tokens had a 42 GB ceiling, and no
/// setting to cap the total. Directory count only ever grows, because every
/// `with` run mints a token (issue #316), so it is not self-limiting either
/// (issue #331).
pub const DEFAULT_MAX_TOTAL_BYTES: u64 = 4 * 1024 * 1024 * 1024;
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

/// A request log which retains the newest complete records.
///
/// One record per line in links notation, appended and compacted on a newline
/// boundary. Records an earlier release wrote as JSON are still read
/// (issues #336, #346).
#[derive(Debug)]
pub struct RequestLog {
    root: PathBuf,
    max_bytes: u64,
    /// Bound across every token directory, or `None` when uncapped.
    max_total_bytes: Option<u64>,
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
        let max_total_bytes = std::env::var("REQUEST_LOG_MAX_TOTAL_BYTES")
            .ok()
            .and_then(|value| value.parse().ok())
            .unwrap_or(DEFAULT_MAX_TOTAL_BYTES);
        Self::new(path, max_bytes).with_total_limit(max_total_bytes)
    }

    /// Bound the whole store, not just each token within it.
    ///
    /// `0` disables the total cap, for an operator who has budgeted the
    /// partition themselves.
    #[must_use]
    pub fn with_total_limit(mut self, max_total_bytes: u64) -> Self {
        self.max_total_bytes = (max_total_bytes > 0).then_some(max_total_bytes);
        self
    }

    /// Build a logger at `path` with an exact byte limit.
    #[must_use]
    pub fn new(root: PathBuf, max_bytes: u64) -> Self {
        Self {
            root,
            max_bytes: max_bytes.max(1),
            max_total_bytes: None,
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
        // Links notation, one readable record per line, so the store is in
        // the format the rest of router state uses without the log ceasing to
        // be greppable (issues #235, #336). The reader accepts either, so the
        // existing file keeps reading and migrates as records are appended.
        let Ok(rendered) = crate::lino_json::encode_line(&Value::Object(event)) else {
            return;
        };
        let mut line = rendered.into_bytes();
        line.push(b'\n');
        if line.len() as u64 > self.max_bytes {
            let omitted = line.len();
            line = crate::lino_json::encode_line(&json!({
                "time": chrono::Utc::now().to_rfc3339(),
                "correlation_id": correlation_id,
                "phase": phase,
                "token_hash": identity.hash,
                "token_id": identity.id,
                "token_label": identity.label,
                "body": format!("[OMITTED: {omitted} byte record exceeds log limit]")
            }))
            .unwrap_or_default()
            .into_bytes();
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
            let discarded = fs::metadata(&path).map_or(0, |metadata| metadata.len());
            // The bound wins: a marker that does not fit is not written, since
            // exceeding the limit to explain the limit helps nobody.
            let marker = discard_marker(discarded, None);
            let marker = if marker.len() as u64 <= self.max_bytes && discarded > 0 {
                marker
            } else {
                Vec::new()
            };
            if let Err(error) = write_owner_only(&path, &marker) {
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
        self.enforce_total_limit(token_hash);
    }

    /// Keep the whole store inside its total bound.
    ///
    /// The per-token bound stays exactly as it was — a noisy token still
    /// cannot evict a quiet one's records — so this evicts whole directories
    /// rather than trimming within them, oldest-written first, and never the
    /// one being written. That makes the unit of loss a token nobody has used
    /// recently instead of the beginning of an active session (issue #331).
    fn enforce_total_limit(&self, active: &str) {
        let Some(max_total) = self.max_total_bytes else {
            return;
        };
        // The store cannot have crossed the bound while every directory in it
        // is under its own share of it, so the common case skips the scan
        // rather than walking every token directory on every record written.
        if let Ok(count) = fs::read_dir(&self.root).map(Iterator::count)
            && let Ok(metadata) = fs::metadata(self.log_path(active))
            && metadata.len() < max_total / (count.max(1) as u64)
        {
            return;
        }
        let Ok(entries) = fs::read_dir(&self.root) else {
            return;
        };
        let mut directories: Vec<(std::time::SystemTime, u64, PathBuf, String)> = entries
            .flatten()
            .filter(|entry| entry.path().is_dir())
            .filter_map(|entry| {
                let name = entry.file_name().to_string_lossy().into_owned();
                let metadata = fs::metadata(entry.path().join("requests.jsonl")).ok()?;
                Some((
                    metadata.modified().ok()?,
                    metadata.len(),
                    entry.path(),
                    name,
                ))
            })
            .collect();
        let mut total: u64 = directories.iter().map(|(_, size, _, _)| *size).sum();
        if total <= max_total {
            return;
        }
        directories.sort_by_key(|(modified, _, _, _)| *modified);
        for (_, size, path, name) in directories {
            if total <= max_total {
                break;
            }
            // Never the directory just written: evicting it would lose the
            // record that prompted the eviction, and a caller with traffic
            // would see its own history vanish mid-session.
            if name == active {
                continue;
            }
            if let Err(error) = fs::remove_dir_all(&path) {
                tracing::warn!("request log eviction failed ({}): {error}", path.display());
                continue;
            }
            total = total.saturating_sub(size);
            // Dropping data under a bound is defensible; dropping it invisibly
            // is what turns a bounded log into an unreliable one (issue #322).
            tracing::info!(
                token_hash = %name,
                bytes = size,
                "request log evicted a token directory to stay within the total limit"
            );
        }
    }

    fn retain_newest_before(&self, path: &Path, incoming_len: usize) {
        let Ok(existing) = fs::read(path) else {
            return;
        };
        // The marker is part of the file, so it comes out of the same budget.
        // Sized before the split, because it names the very number the split
        // produces; a marker for the largest plausible discard is the same
        // length to within a few digits, and reserving that keeps the bound a
        // bound (issue #322).
        let reserved = discard_marker(existing.len() as u64, Some(existing.len())).len();
        let budget = usize::try_from(self.max_bytes)
            .unwrap_or(usize::MAX)
            .saturating_sub(incoming_len);
        // A limit too small to hold the marker keeps the plain tail: the bound
        // is the hard constraint, and exceeding it to explain it helps nobody.
        let marked = reserved < budget;
        let capacity = if marked {
            budget.saturating_sub(reserved)
        } else {
            budget
        };
        let start_floor = existing.len().saturating_sub(capacity);
        let start = existing[start_floor..]
            .iter()
            .position(|byte| *byte == b'\n')
            .map_or(existing.len(), |offset| start_floor + offset + 1);
        // A marker, not a gap. The discarded records are gone either way, but a
        // reader holding the result could not tell a compacted log from a
        // complete one — and this log is the audit artefact, read hours later,
        // about the beginning of a session, which is exactly the end that goes
        // first (issue #322). The `[OMITTED: …]` convention is already used in
        // this module for an oversized record; this is the same honesty on the
        // compaction path.
        let retained = existing.len() - start;
        let mut rewritten = if marked && start > 0 {
            discard_marker(start as u64, Some(retained))
        } else {
            Vec::new()
        };
        rewritten.extend_from_slice(&existing[start..]);
        if let Err(error) = write_owner_only(path, &rewritten) {
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
    /// The model named in the body, shared with the middleware.
    ///
    /// This middleware runs outside the router, so the body it forwards is the
    /// only place it can learn the model; the handler that parses the body is
    /// downstream of it. Filled once the body has been seen in full, which is
    /// before the response exists and therefore before the line is written
    /// (issue #320).
    model: Arc<Mutex<Option<String>>>,
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

    /// The `model` a JSON body names, if it names one.
    ///
    /// A body that is absent, oversized, not JSON, or carries no `model` has
    /// no model to report, and the log says `-` rather than guessing.
    fn extract_model(&self) -> Option<String> {
        if self.omitted || self.body.is_empty() {
            return None;
        }
        serde_json::from_slice::<Value>(&self.body)
            .ok()?
            .get("model")?
            .as_str()
            .filter(|model| !model.is_empty())
            .map(str::to_string)
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
    // Kept before `identity` is moved. The label is operator-supplied, already
    // stored in the clear in the request store, and is what turns an anonymous
    // 404 into an attributable one — the log had it in hand and put none of it
    // on the line (issue #320). The token value itself never appears.
    let token_label = identity.label.clone().unwrap_or_else(|| "-".to_string());
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
    let requested_model = Arc::new(Mutex::new(None));
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
        model: Arc::clone(&requested_model),
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
                    if let Ok(mut model) = capture.model.lock() {
                        *model = capture.extract_model();
                    }
                    capture.record();
                    None
                }
            }
        },
    );
    let method = parts.method.clone();
    let started = Instant::now();
    let mut response = next
        .run(Request::from_parts(parts, Body::from_stream(stream)))
        .await;
    // Written after the handler has run, because that is when the body has
    // streamed through the capture above and the model is known. Emitting it
    // on arrival is what left the field unfillable: the middleware sits
    // outside the router and sees the body only as it passes (issue #320).
    // The pair still reads in order, since the response line follows below.
    let requested_model = requested_model.lock().ok().and_then(|model| model.clone());
    let logged_model = requested_model.as_deref().unwrap_or("-");
    tracing::info!(
        request_id = %correlation_id,
        method = %method,
        uri = %logged_uri,
        model = %logged_model,
        token_label = %token_label,
        "request"
    );
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
    // The model this request concerned. `/v1/messages?beta=true` is the same
    // URI for every Claude model, so without this the log cannot answer the
    // first question anyone asks of it (issue #320).
    //
    // The model the caller asked for is what identifies the request, and it is
    // the only one that exists when the request is refused before an upstream
    // is ever reached. The served-model header is the fallback for the case it
    // was built for -- the upstream substituting a different model -- but it
    // exists only in that case, so relying on it alone left `model=-` on every
    // ordinary line, success and failure alike.
    let served_model = requested_model
        .clone()
        .or_else(|| {
            response
                .headers()
                .get(crate::output_limit::UPSTREAM_MODEL_HEADER)
                .and_then(|value| value.to_str().ok())
                .map(str::to_string)
        })
        .unwrap_or_else(|| "-".to_string());
    // A rate limit is one of the few conditions an operator must act on
    // quickly, and it was logged as three digits.
    let retry_after = response
        .headers()
        .get("retry-after")
        .and_then(|value| value.to_str().ok())
        .unwrap_or("-");
    tracing::info!(
        request_id = %correlation_id,
        status = response.status().as_u16(),
        latency_ms = started.elapsed().as_millis(),
        model = %served_model,
        token_label = %token_label,
        retry_after = %retry_after,
        "response"
    );

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

/// One record saying that older records were discarded to stay inside
/// `REQUEST_LOG_MAX_BYTES`.
///
/// Dropping data under a bound is defensible; dropping it invisibly is what
/// turns a bounded log into an unreliable one. This log is the only place the
/// request and response bodies exist, and an auditor reading it asks about the
/// beginning of a session — the end compaction removes first (issue #322).
fn discard_marker(discarded_bytes: u64, retained_bytes: Option<usize>) -> Vec<u8> {
    let mut line = crate::lino_json::encode_line(&json!({
        "time": chrono::Utc::now().to_rfc3339(),
        "phase": "log_compaction",
        "body": retained_bytes.map_or_else(
            || format!(
                "[OMITTED: {discarded_bytes} bytes of older records discarded; the incoming \
                 record alone exceeds the request log limit]"
            ),
            |retained| format!(
                "[OMITTED: {discarded_bytes} bytes of older records discarded to stay within \
                 the request log limit; {retained} bytes retained]"
            ),
        ),
    }))
    .unwrap_or_default()
    .into_bytes();
    line.push(b'\n');
    line
}
