//! Redacted, size-bounded HTTP exchange logging.

mod owner_only;
mod redaction;
mod stream_outcome;
mod total_limit;

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
use axum::http::HeaderMap;
#[cfg(test)]
use axum::http::HeaderValue;
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

/// One token's log, named for what it holds: links notation (issue #346).
const LOG_FILE: &str = "requests.lino";
/// What the same file was called when it held JSON Lines.
///
/// Releases through v0.121.0 wrote JSON here, and v0.122.0 wrote links
/// notation under this name. Either way an existing deployment has bytes in a
/// file with this name, and they are not abandoned: the file is renamed on the
/// next write to its token (issue #346).
const LEGACY_LOG_FILE: &str = "requests.jsonl";

/// Default maximum size of one token's log (100 MiB).
pub const DEFAULT_MAX_BYTES: u64 = 100 * 1024 * 1024;
/// Default maximum size of the whole request store across every token (4 GiB).
///
/// The per-token bound is deliberately per-token: it keeps a noisy caller from
/// evicting a quiet one's history. What it is not is a bound on the store, and
/// it was documented as "Maximum size of the request log", so deployments with
/// many token directories could exceed the intended total budget. Directory
/// count only ever grows, because every `with` run mints a token (issue #316),
/// so it is not self-limiting either (issue #331).
pub const DEFAULT_MAX_TOTAL_BYTES: u64 = 4 * 1024 * 1024 * 1024;
const MAX_BUFFERED_REQUEST_BYTES: usize = 10 * 1024 * 1024;
/// Small JSON requests are captured before policy evaluation so a local denial
/// retains diagnostic content. Larger or streaming bodies stay lazy to bound
/// unauthenticated memory pressure.
const MAX_EAGER_REQUEST_BYTES: usize = 64 * 1024;
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

#[derive(Clone, Debug)]
struct LogRoute {
    identity: LogIdentity,
    upstream_seen: bool,
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
    total_limit_state: Mutex<Option<total_limit::State>>,
    routes: Mutex<HashMap<String, LogRoute>>,
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
            total_limit_state: Mutex::new(None),
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
        if matches!(
            phase,
            "upstream_request"
                | "upstream_response"
                | "upstream_error"
                | "upstream_response_body"
                | "stream_end"
        ) && let Ok(mut routes) = self.routes.lock()
            && let Some(route) = routes.get_mut(correlation_id)
        {
            route.upstream_seen = true;
        }
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
            .and_then(|routes| {
                routes
                    .get(correlation_id)
                    .map(|route| route.identity.clone())
            })
            .unwrap_or_else(LogIdentity::unauthenticated)
    }

    fn upstream_seen(&self, correlation_id: &str) -> bool {
        self.routes
            .lock()
            .ok()
            .and_then(|routes| routes.get(correlation_id).map(|route| route.upstream_seen))
            .unwrap_or(false)
    }

    fn route_request(&self, correlation_id: &str, identity: LogIdentity) {
        if let Ok(mut routes) = self.routes.lock() {
            routes.insert(
                correlation_id.to_string(),
                LogRoute {
                    identity,
                    upstream_seen: false,
                },
            );
        }
    }

    fn finish_request(&self, correlation_id: &str) {
        if let Ok(mut routes) = self.routes.lock() {
            routes.remove(correlation_id);
        }
    }

    fn log_path(&self, token_hash: &str) -> PathBuf {
        self.root.join(token_hash).join(LOG_FILE)
    }

    /// Give a log written under the old name the name that describes it.
    ///
    /// The file holds links notation, so `requests.jsonl` said the wrong
    /// thing. Renaming rather than reading both names forever means every
    /// later reader, size check and eviction sees exactly one name; the
    /// records inside are untouched and still read either encoding, so the
    /// rename costs nothing and loses nothing (issue #346).
    ///
    /// Called with the write lock held, before the directory is read for its
    /// size, so no reader can observe the file under neither name.
    fn adopt_legacy_name(path: &Path) {
        // `is_file`, not `exists`: something that is not a file sitting on the
        // name -- a directory an operator made, a half-finished upgrade -- is
        // not a log this can append to, and treating it as one would silently
        // strand the records still under the old name.
        if path.is_file() {
            return;
        }
        // Always `Some`: the path is a token directory joined with a file
        // name, so `with_file_name` is defined for it.
        let legacy = path.with_file_name(LEGACY_LOG_FILE);
        if !legacy.is_file() {
            return;
        }
        if let Err(error) = fs::rename(&legacy, path) {
            // Not fatal: the append below creates the new file, and the old
            // one keeps whatever it held for an operator to collect.
            tracing::warn!("could not rename the request log: {error}");
        }
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
        // Before anything measures or truncates this token's log, so every
        // size decision below sees the whole file rather than treating a
        // renamed one as empty (issue #346).
        Self::adopt_legacy_name(&path);
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
        if let Some(max_total) = self.max_total_bytes {
            total_limit::enforce(&self.root, max_total, token_hash, &self.total_limit_state);
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

#[derive(Clone)]
struct RequestCorrelationId(String);

tokio::task_local! {
    static ACTIVE_CORRELATION_ID: String;
}

/// Correlation id carried by [`log_http_exchange`] in request extensions and
/// the request task. Direct handler tests that bypass middleware receive a
/// fresh id instead of sharing an ambiguous value.
///
/// A caller's `x-request-id` remains ordinary end-to-end protocol data and is
/// never repurposed as Router's internal log identity.
#[must_use]
pub fn correlation_id(_headers: &HeaderMap) -> String {
    ACTIVE_CORRELATION_ID
        .try_with(Clone::clone)
        .unwrap_or_else(|_| uuid::Uuid::new_v4().to_string())
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

    fn complete(&mut self) {
        if let Ok(mut model) = self.model.lock() {
            *model = self.extract_model();
        }
        self.record();
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

fn eagerly_capture_json(headers: &HeaderMap) -> bool {
    let json = headers
        .get("content-type")
        .and_then(|value| value.to_str().ok())
        .is_some_and(|value| value.to_ascii_lowercase().starts_with("application/json"));
    let bounded_length = headers
        .get("content-length")
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.parse::<usize>().ok())
        .is_some_and(|length| length > 0 && length <= MAX_EAGER_REQUEST_BYTES);
    json && bounded_length
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
    parts
        .extensions
        .insert(RequestCorrelationId(correlation_id.clone()));
    let (request_body, early_response) = if eagerly_capture_json(&parts.headers) {
        if let Ok(bytes) = axum::body::to_bytes(body, MAX_EAGER_REQUEST_BYTES).await {
            let mut capture = capture;
            capture.push(&bytes);
            capture.complete();
            (Body::from(bytes), None)
        } else {
            let mut capture = capture;
            capture.omitted = true;
            capture.record();
            (
                Body::empty(),
                Some(crate::proxy::error_response(
                    axum::http::StatusCode::PAYLOAD_TOO_LARGE,
                    "invalid_request_error",
                    "request body exceeds the bounded logging limit declared by Content-Length",
                )),
            )
        }
    } else {
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
                        capture.complete();
                        None
                    }
                }
            },
        );
        (Body::from_stream(stream), None)
    };
    let method = parts.method.clone();
    let started = Instant::now();
    let routed_correlation_id = parts
        .extensions
        .get::<RequestCorrelationId>()
        .map_or_else(|| correlation_id.clone(), |value| value.0.clone());
    let response = ACTIVE_CORRELATION_ID
        .scope(routed_correlation_id, async move {
            match early_response {
                Some(response) => response,
                None => next.run(Request::from_parts(parts, request_body)).await,
            }
        })
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
    let capture_response_body = logger.upstream_seen(&response_id) || parts.status.is_success();
    let stream = body.into_data_stream().map(move |chunk| {
        let _keep_route_until_response_body_finishes = &route_guard;
        if capture_response_body && let Ok(bytes) = &chunk {
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
