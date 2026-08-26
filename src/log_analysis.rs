//! Answer questions about the request log.
//!
//! The log is the router's only record of what actually happened, but it had to
//! be read with `grep`/`jq` one-liners invented on the spot. That produced
//! confident wrong answers in both directions (issue #234):
//!
//! - searching for `error|warn` found nothing and suggested the proxy was
//!   uninvolved, because a stream dying mid-flight is logged at `INFO`;
//! - counting streams without `message_stop` reported 100%, because the bodies
//!   are compressed and the terminator cannot appear as a substring — the check
//!   was structurally incapable of any other answer.
//!
//! An analyser that knows the log's own encoding and semantics cannot make
//! either mistake, and says so explicitly when a body is undecodable rather
//! than counting it as evidence.

use std::collections::BTreeMap;
use std::path::{Path, PathBuf};

use serde_json::{Value, json};

/// One exchange, assembled from the records sharing a correlation id.
#[derive(Debug, Default, Clone)]
// Each flag is an independent fact the log either states or does not: whether
// it streamed, whether that was established, whether a stream was asked for,
// whether the frames were readable. They are not phases of one state machine,
// and collapsing them into enums would hide that a log may answer some and
// stay silent on others.
#[allow(clippy::struct_excessive_bools)]
pub struct Exchange {
    pub correlation_id: String,
    pub status: Option<u64>,
    pub upstream_status: Option<u64>,
    pub uri: Option<String>,
    /// Whether the response was actually streamed, decided from evidence.
    ///
    /// Every response is relayed through the same byte-stream machinery, so the
    /// presence of body records says nothing about whether the exchange was a
    /// stream. Deciding by default counted 85% of healthy non-streamed traffic
    /// as streams with an unknown ending (issue #252).
    pub streamed: bool,
    /// Whether anything in the log actually settled the question either way.
    pub stream_evidence: bool,
    /// The response media type, when one was recorded.
    pub response_media_type: Option<String>,
    /// Whether the request asked for a stream, as a corroborating signal.
    pub stream_requested: bool,
    /// Whether a recorded body carried this dialect's terminating event.
    ///
    /// The relay writes a `stream_end` record only on the Anthropic path, so an
    /// `OpenAI` or Gemini stream reaches the log without one and used to be
    /// reported as ending in an unknown state — although the terminator was
    /// sitting in the body the log had already captured (issue #258).
    pub body_terminated: bool,
    /// Whether the recorded frames could be read at all.
    ///
    /// A compressed stream is relayed and logged as the encoded bytes it was,
    /// so scanning it for `message_stop` searches gzip and always fails.
    /// Counting that as a missing terminator reported 315 of 400 streams as
    /// failing on a healthy log (issue #255).
    pub inspectable: bool,
    /// From the terminal `stream_end` record, when one is present (issue #230).
    pub stream_outcome: Option<String>,
    pub stream_complete: Option<bool>,
    pub frames: u64,
    /// Bodies that could not be decoded, so nothing is inferred from them.
    pub undecodable_bodies: u64,
    pub records: u64,
    /// Whether the decoded frames carry an SSE `error` event.
    ///
    /// A turn that failed mid-stream returns 200 at the transport layer, so
    /// without reading the frames it is indistinguishable from one that
    /// succeeded (issue #328).
    pub stream_error: bool,
    /// The encoded response frames, in the order they were recorded.
    ///
    /// Only their concatenation is a valid compressed stream, so they are kept
    /// until the whole exchange has been read and decoded together (issue
    /// #328).
    encoded_frames: Vec<u8>,
    /// The `content-encoding` the response declared, if it declared one.
    content_encoding: Option<String>,
}

impl Exchange {
    /// Whether this exchange finished in a way the log can vouch for.
    ///
    /// Only a stream whose frames could be read can testify to a truncation.
    #[must_use]
    pub fn is_incomplete_stream(&self) -> bool {
        self.streamed && self.inspectable && self.stream_complete == Some(false)
    }

    /// A turn that failed inside a stream the transport called successful.
    #[must_use]
    pub const fn carried_an_error(&self) -> bool {
        self.stream_error
    }

    /// A stream whose frames were encoded, so the log cannot say how it ended.
    ///
    /// Reported as its own class rather than as a truncation: "not verifiable"
    /// is honest, "truncated" is not (issue #255).
    #[must_use]
    pub const fn is_unverifiable_stream(&self) -> bool {
        self.streamed && !self.inspectable
    }

    /// A streamed exchange with no terminal record at all: the router was
    /// restarted mid-turn, or the relay never settled.
    #[must_use]
    pub const fn is_unterminated(&self) -> bool {
        self.streamed && self.inspectable && self.stream_outcome.is_none() && !self.body_terminated
    }
}

/// What one log directory contains.
#[derive(Debug, Default)]
pub struct Summary {
    pub exchanges: usize,
    pub records: u64,
    pub bytes: u64,
    pub statuses: BTreeMap<u64, usize>,
    pub streamed: usize,
    /// Exchanges established as ordinary single-shot replies, reported so the
    /// totals are readable at a glance rather than inferred by subtraction.
    pub non_streamed: usize,
    pub incomplete_streams: usize,
    pub unterminated_streams: usize,
    /// Streams whose frames were encoded, so how they ended is not knowable
    /// from the log — reported apart from the ones that demonstrably failed.
    pub unverifiable_streams: usize,
    /// Records the analyser could not parse, stated rather than skipped.
    pub unparsable_records: u64,
    pub undecodable_bodies: u64,
}

impl Summary {
    #[must_use]
    pub fn to_json(&self) -> Value {
        json!({
            "exchanges": self.exchanges,
            "records": self.records,
            "bytes": self.bytes,
            "streamed": self.streamed,
            "non_streamed": self.non_streamed,
            "incomplete_streams": self.incomplete_streams,
            "unterminated_streams": self.unterminated_streams,
            "unverifiable_streams": self.unverifiable_streams,
            "unparsable_records": self.unparsable_records,
            "undecodable_bodies": self.undecodable_bodies,
            "statuses": self
                .statuses
                .iter()
                .map(|(status, count)| (status.to_string(), *count))
                .collect::<BTreeMap<_, _>>(),
        })
    }

    #[must_use]
    pub fn render(&self) -> String {
        use std::fmt::Write as _;
        let mut out = String::new();
        let _ = writeln!(
            out,
            "exchanges {}  records {}  bytes {}",
            self.exchanges, self.records, self.bytes
        );
        let _ = writeln!(
            out,
            "streamed {}  non-streamed {}  incomplete {}  no terminal record {}  \
             not verifiable {}",
            self.streamed,
            self.non_streamed,
            self.incomplete_streams,
            self.unterminated_streams,
            self.unverifiable_streams
        );
        if self.statuses.is_empty() {
            out.push_str("statuses: none recorded\n");
        } else {
            let statuses = self
                .statuses
                .iter()
                .map(|(status, count)| format!("{status}×{count}"))
                .collect::<Vec<_>>()
                .join("  ");
            let _ = writeln!(out, "statuses: {statuses}");
        }
        // Integrity is reported even when clean: silence about unreadable data
        // is what produced the original false positive.
        let _ = writeln!(
            out,
            "integrity: {} unparsable record(s), {} undecodable body(ies)",
            self.unparsable_records, self.undecodable_bodies
        );
        out
    }
}

/// A named anomaly, with the ids needed to inspect it.
#[derive(Debug, Clone)]
pub struct Anomaly {
    pub kind: &'static str,
    pub detail: String,
    pub correlation_ids: Vec<String>,
}

/// Read every `requests.jsonl` under `root`, optionally for one token.
///
/// Returns the exchanges plus counts of what could not be read, so a caller
/// never has to infer absence from silence.
pub fn read_exchanges(
    root: &Path,
    token: Option<&str>,
) -> std::io::Result<(Vec<Exchange>, u64, u64)> {
    let mut by_id: BTreeMap<String, Exchange> = BTreeMap::new();
    let mut unparsable = 0;
    let mut bytes = 0;
    for path in log_files(root, token)? {
        let contents = std::fs::read_to_string(&path)?;
        bytes += contents.len() as u64;
        for line in contents.lines().filter(|line| !line.trim().is_empty()) {
            // Either encoding: the 1.7 GB an earlier release wrote is JSON
            // Lines, and new records are links notation (issue #336).
            let Some(record) = crate::lino_json::decode_line(line) else {
                unparsable += 1;
                continue;
            };
            absorb(&mut by_id, &record);
        }
    }
    let exchanges = by_id
        .into_values()
        .map(|mut exchange| {
            // Decode before classifying: the terminator the classification
            // looks for is inside the bytes, and searching them encoded is
            // what made every compressed stream unverifiable (issue #328).
            settle_encoded_frames(&mut exchange);
            resolve_stream_classification(&mut exchange);
            exchange
        })
        .collect();
    Ok((exchanges, unparsable, bytes))
}

fn log_files(root: &Path, token: Option<&str>) -> std::io::Result<Vec<PathBuf>> {
    let mut files = Vec::new();
    if !root.is_dir() {
        return Ok(files);
    }
    for entry in std::fs::read_dir(root)? {
        let entry = entry?;
        if !entry.path().is_dir() {
            continue;
        }
        let name = entry.file_name().to_string_lossy().into_owned();
        if token.is_some_and(|token| !name.starts_with(token)) {
            continue;
        }
        let file = entry.path().join("requests.jsonl");
        if file.is_file() {
            files.push(file);
        }
    }
    files.sort();
    Ok(files)
}

fn absorb(by_id: &mut BTreeMap<String, Exchange>, record: &Value) {
    let Some(id) = record
        .get("correlation_id")
        .and_then(Value::as_str)
        .map(str::to_string)
    else {
        return;
    };
    let phase = record.get("phase").and_then(Value::as_str).unwrap_or("");
    let exchange = by_id.entry(id.clone()).or_insert_with(|| Exchange {
        correlation_id: id,
        // Readable until the log says otherwise, so a log written before the
        // encoding was recorded keeps exactly the meaning it had.
        inspectable: true,
        ..Exchange::default()
    });
    exchange.records += 1;
    match phase {
        "client_request" => {
            if let Some(uri) = record.get("uri").and_then(Value::as_str) {
                exchange.uri = Some(uri.to_string());
            }
            // A body stored as base64 is compressed or binary; it is recorded
            // as undecodable rather than searched for terminators (issue #231).
            if record
                .get("body")
                .is_some_and(|body| body.get("base64").is_some())
            {
                exchange.undecodable_bodies += 1;
            }
            if request_asks_for_a_stream(record) {
                exchange.stream_requested = true;
            }
        }
        "client_response" => {
            exchange.status = record.get("status").and_then(Value::as_u64);
            note_response_encoding(exchange, record);
            note_response_content_type(exchange, record);
        }
        "upstream_response" => {
            exchange.upstream_status = record.get("status").and_then(Value::as_u64);
            note_response_encoding(exchange, record);
            note_response_content_type(exchange, record);
        }
        "upstream_response_body" | "client_response_body" => {
            if phase == "upstream_response_body" {
                exchange.frames += 1;
            }
            if let Some(encoded) = record
                .get("body")
                .and_then(|body| body.get("base64"))
                .and_then(Value::as_str)
            {
                if phase == "upstream_response_body" {
                    exchange.undecodable_bodies += 1;
                    // Kept rather than counted and discarded: the bytes are
                    // ordinary gzip or brotli, and only their concatenation
                    // decodes (issue #328).
                    if let Ok(bytes) =
                        base64::Engine::decode(&base64::engine::general_purpose::STANDARD, encoded)
                    {
                        exchange.encoded_frames.extend_from_slice(&bytes);
                    }
                }
            } else if let Some(body) = record.get("body")
                && body_carries_a_terminator(body)
            {
                exchange.body_terminated = true;
            }
        }
        "stream_end" => {
            // Not evidence of streaming on its own: the relay emits this record
            // for every response, streamed or not, so believing it is what made
            // a single-shot JSON reply look like a stream that never ended
            // (issue #252). A recorded media type outranks it.
            if !exchange.stream_evidence {
                exchange.streamed = true;
            }
            exchange.stream_outcome = record
                .get("outcome")
                .and_then(Value::as_str)
                .map(str::to_string);
            exchange.stream_complete = record.get("complete").and_then(Value::as_bool);
            // The relay knows whether it could read the frames, so a record
            // that says so is believed over anything inferred from headers.
            if let Some(inspectable) = record.get("inspectable").and_then(Value::as_bool) {
                exchange.inspectable = inspectable;
            }
            if let Some(frames) = record.get("frames").and_then(Value::as_u64) {
                exchange.frames = frames;
            }
        }
        _ => {}
    }
}

/// Note what a response's `content-type` says about whether it was streamed.
///
/// The response media type is the reliable marker: `text/event-stream` is a
/// stream by definition, and any other concrete type — `application/json` for
/// a single-shot reply — is not. Both the upstream and client response records
/// carry it, and they agree in the ordinary case; either one is enough.
///
/// `Content-Encoding: gzip` is deliberately not consulted here. A compressed
/// body arrives in several transfer chunks, and mistaking those for SSE frames
/// is what produced a truncated-stream verdict — and a WARN — for every
/// successful compressed reply (issue #252).
fn note_response_content_type(exchange: &mut Exchange, record: &Value) {
    let Some(content_type) = record
        .get("headers")
        .and_then(|headers| headers.get("content-type"))
        .and_then(Value::as_str)
    else {
        return;
    };
    let media_type = content_type
        .split(';')
        .next()
        .unwrap_or_default()
        .trim()
        .to_ascii_lowercase();
    if media_type.is_empty() {
        return;
    }
    exchange.response_media_type = Some(media_type.clone());
    // Evidence either way is conclusive, so it overrides the request's
    // `stream: true` hint: what the response actually was beats what was asked
    // for, and a request may ask for a stream that the upstream answers whole.
    exchange.streamed = media_type == "text/event-stream";
    exchange.stream_evidence = true;
}

/// Whether decoded SSE carries an error event.
///
/// The transport says 200 and the stream carries the failure, so the status
/// line cannot answer whether the turn succeeded — only the frames can.
fn carries_a_stream_error(decoded: &str) -> bool {
    decoded.lines().any(|line| {
        let line = line.trim();
        line.eq_ignore_ascii_case("event: error")
            || line
                .strip_prefix("data:")
                .and_then(|data| serde_json::from_str::<Value>(data.trim()).ok())
                .and_then(|value| {
                    value
                        .get("type")
                        .and_then(Value::as_str)
                        .map(|kind| kind == "error")
                })
                .unwrap_or(false)
    })
}

/// Decode the response frames of one exchange as the single stream they are.
///
/// An operator reading a single exchange got base64 for every body — on one
/// deployment, 11,208 of them, with no plain-text body in the file at all — so
/// grepping the log for an error message, a model name or a prompt found
/// nothing, not because the data was absent but because none of it was
/// readable as stored (issue #328).
///
/// The frames must be joined first: only the first carries the codec's header,
/// so decoding them one at a time reads the opening frame and leaves the rest
/// as base64 — which is most of the stream.
fn decode_response_stream(
    records: &[Value],
    encoding: Option<crate::log_decode::Encoding>,
) -> Option<String> {
    let encoding = encoding?;
    if encoding.is_identity() {
        return None;
    }
    let mut joined = Vec::new();
    for record in records {
        if let Some(encoded) = stored_bytes(record)
            && let Ok(bytes) =
                base64::Engine::decode(&base64::engine::general_purpose::STANDARD, encoded)
        {
            joined.extend_from_slice(&bytes);
        }
    }
    crate::log_decode::decode(&joined, encoding)
}

/// The base64 a record stores in place of a body, if it stores one.
fn stored_bytes(record: &Value) -> Option<&str> {
    record
        .get("body")
        .and_then(|body| body.get(crate::request_log::BINARY_BODY_KEY))
        .and_then(Value::as_str)
}

/// Render the decoded stream against the first frame that carried it.
///
/// The decoded text belongs to the exchange rather than to any one frame, so
/// it is shown once, where a reader looks for it, and the remaining frames say
/// where it went instead of repeating an unreadable blob.
fn render_decoded_body(
    record: &mut Value,
    index: usize,
    first_body: usize,
    decoded: Option<&String>,
) {
    let Some(decoded) = decoded else {
        return;
    };
    if stored_bytes(record).is_none() {
        return;
    }
    let rendered = if index == first_body {
        Value::String(decoded.clone())
    } else {
        Value::String(String::from(
            "[decoded with the first frame: only the whole stream decodes]",
        ))
    };
    if let Some(body) = record.get_mut("body") {
        *body = rendered;
    }
}

/// Record the response's declared content encoding.
///
/// Kept separate from the media type because a record may carry one without
/// the other, and the encoding is what decides whether the frames can be read.
fn note_response_encoding(exchange: &mut Exchange, record: &Value) {
    if let Some(encoding) = record
        .get("headers")
        .and_then(|headers| headers.get("content-encoding"))
        .and_then(Value::as_str)
    {
        exchange.content_encoding = Some(encoding.to_string());
    }
}

/// Decide what the recorded frames say, decoding them when they are encoded.
///
/// `stream_not_verifiable` was a refusal to decompress, not a limit: the
/// stored bytes are ordinary gzip or brotli and decode to readable SSE, yet
/// 1163 of ~1600 exchanges were declared unknowable, every streamed one among
/// them. Only an encoding the router genuinely cannot decode is unverifiable
/// now (issue #328).
fn settle_encoded_frames(exchange: &mut Exchange) {
    let encoding = exchange
        .content_encoding
        .as_deref()
        .map_or(Some(crate::log_decode::Encoding::Identity), |declared| {
            crate::log_decode::Encoding::parse(declared)
        });
    let Some(encoding) = encoding else {
        // An encoding with no decoder: "not knowable from the log" is then the
        // honest answer rather than an unattempted one.
        exchange.inspectable = false;
        return;
    };
    if encoding.is_identity() || exchange.encoded_frames.is_empty() {
        return;
    }
    let Some(decoded) = crate::log_decode::decode(&exchange.encoded_frames, encoding) else {
        // The bytes did not match what the header claimed. Nothing was read,
        // so nothing is asserted about how the stream ended.
        exchange.inspectable = false;
        return;
    };
    exchange.inspectable = true;
    exchange.undecodable_bodies = 0;
    // An `error` event inside a 200 was invisible for the same reason the
    // terminator was: it sits in a body nothing decoded. A failed turn was
    // therefore indistinguishable from a successful one (issue #328).
    if carries_a_stream_error(&decoded) {
        exchange.stream_error = true;
    }
    if crate::request_log::text_terminates_stream(&decoded) {
        exchange.body_terminated = true;
        // The relay stamped `complete: false` because it declined to look, not
        // because the stream was cut. A boolean meaning "unchecked" under the
        // name "incomplete" is what produced the false negatives issue #234
        // was filed about; the bytes now say otherwise, so they win.
        if exchange.stream_complete == Some(false) {
            exchange.stream_complete = Some(true);
            exchange.stream_outcome = Some(String::from("completed"));
        }
    }
}

/// Whether a recorded body carries a dialect's terminating event.
///
/// A body is stored as a JSON string when it decoded as UTF-8 and as a JSON
/// document when it parsed as one; both are searched as text, since the marker
/// is a substring either way. A base64 body is compressed or binary and is
/// handled by `inspectable` instead (issue #255).
fn body_carries_a_terminator(body: &Value) -> bool {
    match body {
        Value::String(text) => crate::request_log::text_terminates_stream(text),
        Value::Null => false,
        // A parsed document: search its rendered form, so a terminator that
        // arrived as structured JSON is found too.
        other => crate::request_log::text_terminates_stream(&other.to_string()),
    }
}

/// Whether a request body asks for a streamed reply.
///
/// The Anthropic and `OpenAI` chat dialects both spell this `"stream": true`.
/// This corroborates rather than decides: it is used only when no response
/// media type was recorded, since a request can ask for a stream and receive a
/// single-shot answer.
fn request_asks_for_a_stream(record: &Value) -> bool {
    record
        .get("body")
        .and_then(|body| body.get("json"))
        .and_then(|body| body.get("stream"))
        .and_then(Value::as_bool)
        .unwrap_or(false)
}

/// Settle the streamed question for exchanges the response never answered.
///
/// Called once the whole exchange is assembled, since the request record is
/// read before the response that outranks it.
const fn resolve_stream_classification(exchange: &mut Exchange) {
    if !exchange.stream_evidence && exchange.stream_requested {
        exchange.streamed = true;
    }
}

/// Summarise a set of exchanges.
#[must_use]
pub fn summarise(exchanges: &[Exchange], unparsable: u64, bytes: u64) -> Summary {
    let mut summary = Summary {
        exchanges: exchanges.len(),
        bytes,
        unparsable_records: unparsable,
        ..Summary::default()
    };
    for exchange in exchanges {
        summary.records += exchange.records;
        summary.undecodable_bodies += exchange.undecodable_bodies;
        if let Some(status) = exchange.status.or(exchange.upstream_status) {
            *summary.statuses.entry(status).or_default() += 1;
        }
        if exchange.streamed {
            summary.streamed += 1;
            if exchange.is_incomplete_stream() {
                summary.incomplete_streams += 1;
            }
            if exchange.is_unterminated() {
                summary.unterminated_streams += 1;
            }
            if exchange.is_unverifiable_stream() {
                summary.unverifiable_streams += 1;
            }
        } else {
            summary.non_streamed += 1;
        }
    }
    summary
}

/// Name the anomalies in a set of exchanges.
#[must_use]
pub fn anomalies(exchanges: &[Exchange]) -> Vec<Anomaly> {
    let mut found = Vec::new();
    let collect = |predicate: &dyn Fn(&Exchange) -> bool| {
        exchanges
            .iter()
            .filter(|exchange| predicate(exchange))
            .map(|exchange| exchange.correlation_id.clone())
            .collect::<Vec<_>>()
    };

    let cut = collect(&Exchange::is_incomplete_stream);
    if !cut.is_empty() {
        found.push(Anomaly {
            kind: "stream_ended_without_terminator",
            detail: "a streamed turn stopped before its dialect terminator; the client saw a \
                     truncated answer while the status line said 200"
                .to_string(),
            correlation_ids: cut,
        });
    }

    let unterminated = collect(&Exchange::is_unterminated);
    if !unterminated.is_empty() {
        found.push(Anomaly {
            kind: "no_terminal_record",
            detail: "a streamed exchange has no terminal record, so how it ended is unknown"
                .to_string(),
            correlation_ids: unterminated,
        });
    }

    // Reported so the figure is visible, but worded as the absence of evidence
    // it is: calling a healthy compressed stream truncated is what made the
    // signal unusable (issue #255).
    let errored = collect(&Exchange::carried_an_error);
    if !errored.is_empty() {
        found.push(Anomaly {
            kind: "stream_carried_an_error",
            detail: "a streamed turn carried an error event while the status line said 200, \
                     so the transport reported success for a turn that failed"
                .to_string(),
            correlation_ids: errored,
        });
    }
    let unverifiable = collect(&Exchange::is_unverifiable_stream);
    if !unverifiable.is_empty() {
        found.push(Anomaly {
            kind: "stream_not_verifiable",
            detail: "a streamed exchange was relayed under an encoding this router cannot \
                     decode, so its frames cannot be inspected for a terminator; how it \
                     ended is not knowable from the log"
                .to_string(),
            correlation_ids: unverifiable,
        });
    }

    let refused = collect(&|exchange| matches!(exchange.status, Some(401 | 403)));
    if refused.len() > 1 {
        found.push(Anomaly {
            kind: "repeated_authentication_failure",
            detail: format!(
                "{} exchanges were refused with 401/403, which is misconfiguration rather \
                 than load",
                refused.len()
            ),
            correlation_ids: refused,
        });
    }

    let throttled = collect(&|exchange| exchange.status == Some(429));
    if !throttled.is_empty() {
        found.push(Anomaly {
            kind: "rate_limited",
            detail: format!("{} exchanges were rate limited", throttled.len()),
            correlation_ids: throttled,
        });
    }

    let undecodable = collect(&|exchange| exchange.undecodable_bodies > 0);
    if !undecodable.is_empty() {
        found.push(Anomaly {
            kind: "undecodable_bodies",
            detail: "bodies are compressed or binary, so their contents cannot be inspected \
                     from the log; recorded so absence of evidence is not read as evidence"
                .to_string(),
            correlation_ids: undecodable,
        });
    }

    found
}

/// Render one exchange's records in order.
pub fn show(root: &Path, token: Option<&str>, correlation_id: &str) -> std::io::Result<String> {
    let mut out = String::new();
    for path in log_files(root, token)? {
        // The encoding is declared on the response record, which may arrive
        // after the bodies it describes, so the whole exchange is read before
        // anything is rendered.
        let contents = std::fs::read_to_string(&path)?;
        let records = contents
            .lines()
            .filter_map(crate::lino_json::decode_line)
            .filter(|record| {
                record.get("correlation_id").and_then(Value::as_str) == Some(correlation_id)
            })
            .collect::<Vec<_>>();
        let encoding = records
            .iter()
            .find_map(|record| {
                record
                    .get("headers")
                    .and_then(|headers| headers.get("content-encoding"))
                    .and_then(Value::as_str)
            })
            .map_or(Some(crate::log_decode::Encoding::Identity), |declared| {
                crate::log_decode::Encoding::parse(declared)
            });
        let decoded = decode_response_stream(&records, encoding);
        // The decoded text belongs to the whole stream, so it is rendered
        // against the first frame that carried any of it.
        let first_body = records
            .iter()
            .position(|record| stored_bytes(record).is_some())
            .unwrap_or_default();
        for (index, mut record) in records.into_iter().enumerate() {
            render_decoded_body(&mut record, index, first_body, decoded.as_ref());
            out.push_str(&serde_json::to_string_pretty(&record).unwrap_or_default());
            out.push('\n');
        }
    }
    if out.is_empty() {
        use std::fmt::Write as _;
        let _ = writeln!(out, "no records for correlation id {correlation_id}");
    }
    Ok(out)
}

#[cfg(test)]
#[path = "log_analysis_tests.rs"]
mod tests;

#[cfg(test)]
#[path = "log_analysis_decode_tests.rs"]
mod decode_tests;
