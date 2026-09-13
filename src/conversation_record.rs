//! Opt-in recording of client-to-Router conversations, and strict replay of one.
//!
//! # Why this exists
//!
//! Before this, the only end-to-end evidence that a whole client conversation
//! still behaved the same after a Router upgrade was an integration test
//! against a live model: it spent real subscription tokens, needed a credential,
//! and therefore could not run in CI. Everything cheaper was a unit test against
//! Router's own code, which is exactly the layer that kept passing while
//! presentation defaults, capability advertisement, model pinning and tool-loop
//! translation each regressed in a real multi-turn exchange (issue #566).
//!
//! # The two modes
//!
//! * **Record** (`CONVERSATION_RECORD=<path>`) appends every client exchange —
//!   request and response, streamed events in the order the client received
//!   them — to a links-notation file. It observes the response stream that is
//!   already flowing to the client and issues no request of its own, so a
//!   recorded run costs exactly what the same run costs unrecorded.
//! * **Replay** (`CONVERSATION_REPLAY=<path>`) answers from that file instead of
//!   a provider, and *only* if the incoming request matches the recorded request
//!   at that position. A request that does not match fails the replay naming the
//!   turn and the difference, which is what makes a recording a test of the
//!   whole ordered exchange rather than a fixture that answers anything.
//!
//! Neither is on unless its variable is set, and both announce themselves in the
//! run's output: a mode that silently rewrites what a deployment answers with
//! must not be inferable only from a file appearing on disk.
//!
//! # Where it sits
//!
//! Replay is layered *outside* every other middleware, so a replayed turn never
//! reaches routing, provider selection, credential loading or the upstream
//! client. That is what lets a machine with no subscription at all run a replay:
//! there is nothing left in the path that could want a credential.
//!
//! # Secrets
//!
//! Redaction happens on the way in, not on the way out, reusing the request
//! log's [`crate::request_log::redacted_headers`] and
//! [`crate::request_log::redacted_body`]. A recording is meant to be committed
//! next to the test that uses it, so the bytes that reach the file must already
//! be safe; redacting at read time would leave the credential on disk.

mod matching;
mod store;

use std::path::PathBuf;
use std::sync::{Arc, Mutex};

use axum::body::Body;
use axum::extract::{Request, State};
use axum::http::{HeaderMap, HeaderName, HeaderValue, StatusCode};
use axum::middleware::Next;
use axum::response::Response;
use futures_util::StreamExt as _;
use serde_json::{Value, json};

use crate::request_log::{redacted_body, redacted_headers};

pub use store::{LoadError, Provenance, Recording, Turn};

/// Environment variable that turns recording on and says where to write.
pub const RECORD_ENV: &str = "CONVERSATION_RECORD";
/// Environment variable that turns replay on and says what to replay.
pub const REPLAY_ENV: &str = "CONVERSATION_REPLAY";

/// Response header naming the turn a replayed answer came from.
///
/// A replay test that passes should still be able to prove *what* it exercised;
/// without this the only evidence is that some 200 came back.
pub const REPLAY_TURN_HEADER: &str = "x-router-replay-turn";

/// Headers a replayed response must not repeat from the recording.
///
/// The recorded body is re-framed by this server, so the recorded framing would
/// contradict the bytes actually sent — a stale `content-length` truncates the
/// answer and a recorded `transfer-encoding` collides with the one Axum writes.
const REFRAMED_HEADERS: &[&str] = &["content-length", "transfer-encoding", "connection", "date"];

/// Whether either mode is on, and with which file.
#[derive(Clone, Debug)]
pub enum Mode {
    /// Neither variable is set: the live path is untouched.
    Off,
    /// Append every client exchange to this file.
    Record(PathBuf),
    /// Answer from this file, failing on the first request that does not match.
    Replay(PathBuf),
}

impl Mode {
    /// Read the mode from the environment.
    ///
    /// Recording wins if both are set, because a run that both recorded and
    /// replayed would overwrite its own evidence with a copy of itself.
    #[must_use]
    pub fn from_env() -> Self {
        Self::from_values(
            std::env::var(RECORD_ENV).ok().as_deref(),
            std::env::var(REPLAY_ENV).ok().as_deref(),
        )
    }

    /// Resolve the mode from the two variables' values.
    #[must_use]
    pub fn from_values(record: Option<&str>, replay: Option<&str>) -> Self {
        let record = record.map(str::trim).filter(|value| !value.is_empty());
        let replay = replay.map(str::trim).filter(|value| !value.is_empty());
        match (record, replay) {
            (Some(path), _) => Self::Record(PathBuf::from(path)),
            (None, Some(path)) => Self::Replay(PathBuf::from(path)),
            (None, None) => Self::Off,
        }
    }

    /// Whether this mode answers from a recording.
    #[must_use]
    pub const fn is_replay(&self) -> bool {
        matches!(self, Self::Replay(_))
    }

    /// The line announcing this mode in the run's output, if it is on.
    ///
    /// Issue #566 requires the mode to be visible rather than silent: a
    /// deployment answering from a file instead of a provider is a fact an
    /// operator reading the log must be told, not one they have to deduce.
    #[must_use]
    pub fn announcement(&self) -> Option<String> {
        match self {
            Self::Off => None,
            Self::Record(path) => Some(format!(
                "Conversation recording enabled: appending client exchanges as links notation to {}",
                path.display()
            )),
            Self::Replay(path) => Some(format!(
                "Conversation replay enabled: answering from {} with no upstream call; \
                 a request that does not match the recording fails the turn",
                path.display()
            )),
        }
    }
}

/// Live state of one recording or replay, shared by every request.
#[derive(Debug)]
pub struct Session {
    /// Where the recording lives.
    path: PathBuf,
    /// Turns to serve, empty while recording.
    turns: Vec<Turn>,
    /// Position in the conversation, shared across concurrent requests.
    ///
    /// A conversation is sequential by nature, but nothing stops a client from
    /// having two requests in flight; a single counter keeps the file's order
    /// authoritative instead of letting arrival order decide it.
    position: Mutex<usize>,
    /// Whether the header line has been written yet, while recording.
    header_written: Mutex<bool>,
    /// What produced the recording being written, or the one being replayed.
    provenance: Provenance,
    /// Whether this session replays rather than records.
    replaying: bool,
}

impl Session {
    /// Open a recording session, writing nothing until the first exchange.
    #[must_use]
    pub const fn recording(path: PathBuf, provenance: Provenance) -> Self {
        Self {
            path,
            turns: Vec::new(),
            position: Mutex::new(0),
            header_written: Mutex::new(false),
            provenance,
            replaying: false,
        }
    }

    /// Load a recording for replay.
    ///
    /// # Errors
    /// Propagates [`LoadError`] when the file is unreadable or has no header.
    pub fn replaying(path: PathBuf) -> Result<Self, LoadError> {
        let recording = store::load(&path)?;
        Ok(Self {
            path,
            turns: recording.turns,
            position: Mutex::new(0),
            header_written: Mutex::new(true),
            provenance: recording.provenance,
            replaying: true,
        })
    }

    /// Build the session a [`Mode`] calls for.
    ///
    /// # Errors
    /// Propagates a replay load failure; recording cannot fail here because the
    /// file is created on the first exchange.
    pub fn from_mode(mode: &Mode, provider: &str) -> Result<Option<Self>, LoadError> {
        match mode {
            Mode::Off => Ok(None),
            Mode::Record(path) => Ok(Some(Self::recording(
                path.clone(),
                Provenance {
                    router_version: crate::VERSION.to_string(),
                    provider: provider.to_string(),
                },
            ))),
            Mode::Replay(path) => Self::replaying(path.clone()).map(Some),
        }
    }

    /// What produced this recording.
    #[must_use]
    pub const fn provenance(&self) -> &Provenance {
        &self.provenance
    }

    /// How many turns a replay has to serve.
    #[must_use]
    pub const fn turn_count(&self) -> usize {
        self.turns.len()
    }

    /// Take the next position to serve or write, one-based.
    fn take_position(&self) -> usize {
        let mut position = self.position.lock().unwrap_or_else(|error| {
            // A poisoned counter would otherwise abort the process; the
            // recording is evidence, not a critical path.
            self.position.clear_poison();
            error.into_inner()
        });
        *position += 1;
        *position
    }

    /// Append one exchange to the recording file.
    fn write_turn(&self, turn: &Turn) {
        let mut written = self.header_written.lock().unwrap_or_else(|error| {
            self.header_written.clear_poison();
            error.into_inner()
        });
        if !*written {
            if let Err(error) =
                store::append_line(&self.path, &store::header_line(&self.provenance))
            {
                tracing::warn!("conversation recording header could not be written: {error}");
                return;
            }
            *written = true;
        }
        drop(written);
        if let Err(error) = store::append_line(&self.path, &store::turn_line(turn)) {
            tracing::warn!("conversation recording turn could not be written: {error}");
        }
    }
}

/// The recorded shape of one client request.
///
/// Redacted here, at record time, so the value that reaches the file and the
/// value replay compares against are the same thing: a matcher that compared
/// unredacted requests against redacted recordings would fail every replay on
/// the credential alone.
///
/// The URI is redacted by [`crate::request_log::safe_http_uri`], which strips a
/// credential passed as a query parameter — `?key=…` is how Gemini authenticates
/// — and reduces a byte-transparent native vendor route to its static template.
/// Both sides of a replay comparison go through it, so the reduction costs the
/// match nothing while keeping the recording committable.
fn recorded_request(
    method: &axum::http::Method,
    uri: &axum::http::Uri,
    headers: &HeaderMap,
    body: &[u8],
    declared_body: bool,
) -> Value {
    json!({
        "method": method.as_str(),
        "uri": crate::request_log::safe_http_uri(method, uri),
        "headers": redacted_headers(headers),
        // A bodiless GET records `null` rather than `""`, so the absence of a
        // body is not confused with an empty one on replay.
        "body": if declared_body || !body.is_empty() { redacted_body(body) } else { Value::Null },
    })
}

/// Whether the client's headers claim a body accompanied the request.
fn declares_a_body(headers: &HeaderMap) -> bool {
    headers
        .get("content-length")
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.parse::<u64>().ok())
        .is_some_and(|length| length > 0)
        || headers
            .get("transfer-encoding")
            .and_then(|value| value.to_str().ok())
            .is_some_and(|value| value.to_ascii_lowercase().contains("chunked"))
}

/// Largest client request body a recording will hold, per exchange (10 MiB).
///
/// The same bound the request log applies, for the same reason: a recording
/// must not let one caller make the router buffer without limit.
const MAX_RECORDED_BODY: usize = 10 * 1024 * 1024;

/// Wrap `app` in record-or-replay, or return it untouched when no mode is on.
///
/// The layer is *absent* rather than inert when both variables are unset: issue
/// #566 requires the live path to behave exactly as it did before this existed,
/// and a middleware that runs and decides to do nothing still buffers the
/// request body it needs in order to compare one.
///
/// Outermost, deliberately. A replayed turn must not reach routing, provider
/// selection, credential loading or the upstream client — that is what lets a
/// machine holding no subscription at all serve a replay.
pub fn layer(app: axum::Router, session: Option<Arc<Session>>) -> axum::Router {
    match session {
        None => app,
        Some(session) => app.layer(axum::middleware::from_fn_with_state(
            session,
            record_or_replay,
        )),
    }
}

/// Middleware that records or replays the client exchange.
pub async fn record_or_replay(
    State(session): State<Arc<Session>>,
    request: Request,
    next: Next,
) -> Response {
    let (parts, body) = request.into_parts();
    let declared_body = declares_a_body(&parts.headers);
    let Ok(bytes) = axum::body::to_bytes(body, MAX_RECORDED_BODY).await else {
        return crate::api_error::error_response(
            StatusCode::PAYLOAD_TOO_LARGE,
            "invalid_request_error",
            "request body exceeds the bounded conversation recording limit",
        );
    };
    let recorded = recorded_request(
        &parts.method,
        &parts.uri,
        &parts.headers,
        &bytes,
        declared_body,
    );
    let position = session.take_position();
    if session.replaying {
        return replay_turn(&session, position, &recorded);
    }
    let request = Request::from_parts(parts, Body::from(bytes));
    record_turn(session, position, recorded, next.run(request).await)
}

/// Serve turn `position` from the recording, or fail naming the divergence.
fn replay_turn(session: &Arc<Session>, position: usize, incoming: &Value) -> Response {
    let Some(turn) = session.turns.get(position - 1) else {
        return replay_failure(&format!(
            "replay exhausted: the recording {} holds {} turn(s) and the client asked for turn {}",
            session.path.display(),
            session.turns.len(),
            position
        ));
    };
    if let Some(difference) = matching::describe_difference(&turn.request, incoming) {
        return replay_failure(&format!(
            "replay mismatch at turn {position} of {} (recorded by Router {} against provider {}): \
             {difference}",
            session.path.display(),
            session.provenance.router_version,
            session.provenance.provider
        ));
    }
    served_response(turn, position)
}

/// Rebuild the client-visible response of one recorded turn.
fn served_response(turn: &Turn, position: usize) -> Response {
    let status = StatusCode::from_u16(turn.status).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
    let mut response = Response::builder().status(status);
    for (name, value) in &turn.headers {
        if REFRAMED_HEADERS.contains(&name.to_ascii_lowercase().as_str()) {
            continue;
        }
        if let (Ok(name), Ok(value)) = (
            HeaderName::try_from(name.as_str()),
            HeaderValue::from_str(value),
        ) {
            response = response.header(name, value);
        }
    }
    if let Ok(value) = HeaderValue::from_str(&position.to_string()) {
        response = response.header(REPLAY_TURN_HEADER, value);
    }
    // Concatenated, not re-chunked: the recording preserves event order, and an
    // SSE client reassembles frames from the byte stream regardless of where the
    // transport split them. Emitting each recorded event as its own frame would
    // assert a chunk boundary the original may not have had.
    let body = turn.events.concat();
    response
        .body(Body::from(body))
        .unwrap_or_else(|_| replay_failure(&format!("turn {position} could not be rebuilt")))
}

/// How a failed replay reaches the client.
///
/// A distinct status, not a plausible answer: a replay is a test, and the one
/// outcome worse than failing is passing with an invented response. The message
/// is the whole diagnosis, so it goes in the body *and* the router's log.
fn replay_failure(message: &str) -> Response {
    tracing::error!("{message}");
    crate::api_error::error_response(
        StatusCode::BAD_GATEWAY,
        "conversation_replay_mismatch",
        message,
    )
}

/// Wrap the live response so the exchange lands in the recording.
///
/// The chunks are observed as they already flow to the client; nothing is
/// buffered to completion and no second request is made, which is what keeps a
/// recorded run's upstream traffic identical to an unrecorded one's.
fn record_turn(
    session: Arc<Session>,
    position: usize,
    request: Value,
    response: Response,
) -> Response {
    let (parts, body) = response.into_parts();
    let status = parts.status.as_u16();
    let headers = redacted_headers(&parts.headers)
        .into_iter()
        .collect::<Vec<_>>();
    // An absent content type is *not* treated as a stream here, which is where
    // this parts company with `request_log::is_streaming_media_type`: that
    // function answers about an upstream response known to be an inference turn,
    // while this layer sees every route on the listener.
    let streamed = parts
        .headers
        .get("content-type")
        .and_then(|value| value.to_str().ok())
        .is_some_and(|value| crate::request_log::is_streaming_media_type(Some(value)));
    let bytes = Arc::new(Mutex::new(Vec::new()));
    let collected = Arc::clone(&bytes);
    let finish = TurnRecorder {
        session,
        turn: Some(Turn {
            index: position,
            request,
            status,
            headers,
            events: Vec::new(),
        }),
        bytes,
        streamed,
    };
    let stream = body.into_data_stream().map(move |chunk| {
        // Holding the recorder inside the stream closure is what makes the turn
        // land when the stream ends *or* when the client disconnects mid-answer:
        // dropping the stream drops the recorder, which writes what it has.
        let _write_the_turn_when_the_stream_ends = &finish;
        if let Ok(bytes) = &chunk
            && let Ok(mut collected) = collected.lock()
        {
            collected.extend_from_slice(bytes);
        }
        chunk
    });
    Response::from_parts(parts, Body::from_stream(stream))
}

/// Split a recorded response body into the events the client saw.
///
/// The transport's chunk boundaries are *not* the event boundaries — a chunk may
/// end mid-frame and may even split a multi-byte scalar, which is why
/// `sse::push_blocks` exists — so the body is accumulated and cut on SSE frame
/// separators. That keeps the order the issue asks the recording to prove while
/// leaving each event a complete, readable, diffable line in the file (#566).
fn split_events(body: &[u8], streamed: bool) -> Vec<String> {
    if !streamed {
        return if body.is_empty() {
            Vec::new()
        } else {
            vec![String::from_utf8_lossy(body).into_owned()]
        };
    }
    let mut buffer = Vec::new();
    let mut events = crate::sse::push_blocks(&mut buffer, body)
        .into_iter()
        // The separator is dropped by the splitter and re-added here, so
        // concatenating the recorded events reproduces the original bytes.
        .map(|block| format!("{block}\n\n"))
        .collect::<Vec<_>>();
    if !buffer.is_empty() {
        // A stream cut mid-frame: the tail is kept as its own event rather than
        // discarded, so a recording of a truncated answer still replays as one.
        events.push(String::from_utf8_lossy(&buffer).into_owned());
    }
    events
}

/// Writes one turn once the response body has finished streaming.
struct TurnRecorder {
    session: Arc<Session>,
    turn: Option<Turn>,
    bytes: Arc<Mutex<Vec<u8>>>,
    streamed: bool,
}

impl Drop for TurnRecorder {
    fn drop(&mut self) {
        let Some(mut turn) = self.turn.take() else {
            return;
        };
        if let Ok(bytes) = self.bytes.lock() {
            turn.events = split_events(&bytes, self.streamed);
        }
        self.session.write_turn(&turn);
    }
}

#[cfg(test)]
#[path = "conversation_record_tests.rs"]
mod tests;
