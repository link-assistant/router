//! The recording file: links notation on disk, turns in memory.
//!
//! One record per line, written with [`crate::lino_json::encode_line`] and read
//! with [`crate::lino_json::decode_line`] — the same shape and the same codec
//! the per-token request log already uses, because a recording is appended to
//! while a conversation is still running and must survive a router that exits
//! mid-turn (issue #566). A partially written last line is dropped on read
//! rather than making the whole recording unloadable.
//!
//! Split from `conversation_record.rs` to keep both files inside the
//! repository's 1000-line limit.

use std::io::Write as _;
use std::path::{Path, PathBuf};

use serde_json::{Value, json};

/// First line of every recording: what produced it.
///
/// Issue #566 asks a recording to state its router version and its provider so
/// that a replay which no longer matches can be told apart from a recording
/// made against a different contract. Without it the only diagnosis available
/// for a failing replay is "something changed", which is the failure mode the
/// strict matching exists to avoid.
pub const HEADER_PHASE: &str = "recording";
/// Phase marking one complete client exchange.
pub const TURN_PHASE: &str = "turn";

/// What produced a recording.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Provenance {
    /// Router version that recorded the conversation.
    pub router_version: String,
    /// Upstream provider that answered it.
    pub provider: String,
}

/// One complete client-to-Router exchange.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Turn {
    /// One-based position in the conversation, as named in a mismatch report.
    pub index: usize,
    /// The redacted client request, matched against on replay.
    pub request: Value,
    /// The response status the client saw.
    pub status: u16,
    /// Response headers, redacted, replayed verbatim apart from framing.
    pub headers: Vec<(String, String)>,
    /// Response body chunks in the order the client received them.
    ///
    /// A streamed answer is a sequence of SSE events and their order is part of
    /// what the recording proves; collapsing them into one blob would let a
    /// reordering regression replay clean (issue #566).
    pub events: Vec<String>,
}

/// A recording loaded from disk, ready to replay.
#[derive(Clone, Debug)]
pub struct Recording {
    /// What produced it.
    pub provenance: Provenance,
    /// Its turns, in order.
    pub turns: Vec<Turn>,
}

/// Why a recording could not be loaded.
#[derive(Debug)]
pub enum LoadError {
    /// The file could not be read.
    Unreadable(std::io::Error),
    /// The file holds no `recording` header line.
    MissingHeader,
}

impl std::fmt::Display for LoadError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Unreadable(error) => write!(formatter, "recording could not be read: {error}"),
            Self::MissingHeader => formatter
                .write_str("recording has no header line stating the router version and provider"),
        }
    }
}

impl std::error::Error for LoadError {}

/// Encode the header line for a new recording.
#[must_use]
pub fn header_line(provenance: &Provenance) -> String {
    encode(&json!({
        "phase": HEADER_PHASE,
        "router_version": provenance.router_version,
        "provider": provenance.provider,
    }))
}

/// Encode one turn as a single line of links notation.
#[must_use]
pub fn turn_line(turn: &Turn) -> String {
    encode(&json!({
        "phase": TURN_PHASE,
        "turn": turn.index,
        "request": turn.request,
        "response": {
            "status": turn.status,
            "headers": turn
                .headers
                .iter()
                .map(|(name, value)| json!([name, value]))
                .collect::<Vec<_>>(),
            "events": turn.events,
        },
    }))
}

/// Encode one record, falling back to nothing a reader would misread.
///
/// `encode_line` fails only when a value cannot become JSON, which cannot
/// happen for the `json!` literals above; an empty line is skipped on read, so
/// even that impossible case cannot corrupt the file.
fn encode(value: &Value) -> String {
    crate::lino_json::encode_line(value).unwrap_or_default()
}

/// Append one already-encoded line to the recording file.
///
/// # Errors
/// Propagates any failure to create the parent directory or append the line.
pub fn append_line(path: &Path, line: &str) -> std::io::Result<()> {
    if let Some(parent) = path
        .parent()
        .filter(|parent| !parent.as_os_str().is_empty())
    {
        std::fs::create_dir_all(parent)?;
    }
    let mut file = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(path)?;
    file.write_all(line.as_bytes())?;
    file.write_all(b"\n")
}

/// Read a recording back from disk.
///
/// # Errors
/// Returns [`LoadError`] when the file cannot be read or carries no header.
pub fn load(path: &PathBuf) -> Result<Recording, LoadError> {
    let text = std::fs::read_to_string(path).map_err(LoadError::Unreadable)?;
    let mut provenance = None;
    let mut turns = Vec::new();
    for line in text.lines() {
        // A line this reader cannot decode is a torn tail from a router that
        // exited mid-write, not a reason to discard the turns before it.
        let Some(record) = crate::lino_json::decode_line(line) else {
            continue;
        };
        match record.get("phase").and_then(Value::as_str) {
            Some(HEADER_PHASE) => provenance = Some(read_provenance(&record)),
            Some(TURN_PHASE) => {
                if let Some(turn) = read_turn(&record, turns.len() + 1) {
                    turns.push(turn);
                }
            }
            _ => {}
        }
    }
    provenance
        .map(|provenance| Recording { provenance, turns })
        .ok_or(LoadError::MissingHeader)
}

fn read_provenance(record: &Value) -> Provenance {
    Provenance {
        router_version: string_field(record, "router_version"),
        provider: string_field(record, "provider"),
    }
}

fn string_field(record: &Value, name: &str) -> String {
    record
        .get(name)
        .and_then(Value::as_str)
        .unwrap_or("unknown")
        .to_string()
}

/// Read one turn, renumbering it by position.
///
/// The recorded `turn` field is informational: replay counts positions itself,
/// so a hand-edited recording with a wrong number still replays in file order
/// rather than silently skipping or repeating an exchange.
fn read_turn(record: &Value, position: usize) -> Option<Turn> {
    let request = record.get("request")?.clone();
    let response = record.get("response")?;
    let status = u16::try_from(response.get("status")?.as_u64()?).ok()?;
    let headers = response
        .get("headers")
        .and_then(Value::as_array)
        .map(|pairs| {
            pairs
                .iter()
                .filter_map(|pair| {
                    let pair = pair.as_array()?;
                    Some((
                        pair.first()?.as_str()?.to_string(),
                        pair.get(1)?.as_str()?.to_string(),
                    ))
                })
                .collect()
        })
        .unwrap_or_default();
    let events = response
        .get("events")
        .and_then(Value::as_array)
        .map(|events| {
            events
                .iter()
                .filter_map(|event| event.as_str().map(str::to_string))
                .collect()
        })
        .unwrap_or_default();
    Some(Turn {
        index: position,
        request,
        status,
        headers,
        events,
    })
}
