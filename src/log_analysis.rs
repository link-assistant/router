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
pub struct Exchange {
    pub correlation_id: String,
    pub status: Option<u64>,
    pub upstream_status: Option<u64>,
    pub uri: Option<String>,
    pub streamed: bool,
    /// From the terminal `stream_end` record, when one is present (issue #230).
    pub stream_outcome: Option<String>,
    pub stream_complete: Option<bool>,
    pub frames: u64,
    /// Bodies that could not be decoded, so nothing is inferred from them.
    pub undecodable_bodies: u64,
    pub records: u64,
}

impl Exchange {
    /// Whether this exchange finished in a way the log can vouch for.
    #[must_use]
    pub fn is_incomplete_stream(&self) -> bool {
        self.streamed && self.stream_complete == Some(false)
    }

    /// A streamed exchange with no terminal record at all: the router was
    /// restarted mid-turn, or the relay never settled.
    #[must_use]
    pub const fn is_unterminated(&self) -> bool {
        self.streamed && self.stream_outcome.is_none()
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
    pub incomplete_streams: usize,
    pub unterminated_streams: usize,
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
            "incomplete_streams": self.incomplete_streams,
            "unterminated_streams": self.unterminated_streams,
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
            "streamed {}  incomplete {}  no terminal record {}",
            self.streamed, self.incomplete_streams, self.unterminated_streams
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
            let Ok(record) = serde_json::from_str::<Value>(line) else {
                unparsable += 1;
                continue;
            };
            absorb(&mut by_id, &record);
        }
    }
    Ok((by_id.into_values().collect(), unparsable, bytes))
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
        }
        "client_response" => {
            exchange.status = record.get("status").and_then(Value::as_u64);
        }
        "upstream_response" => {
            exchange.upstream_status = record.get("status").and_then(Value::as_u64);
        }
        "upstream_response_body" => {
            exchange.streamed = true;
            exchange.frames += 1;
            if record
                .get("body")
                .is_some_and(|body| body.get("base64").is_some())
            {
                exchange.undecodable_bodies += 1;
            }
        }
        "stream_end" => {
            exchange.streamed = true;
            exchange.stream_outcome = record
                .get("outcome")
                .and_then(Value::as_str)
                .map(str::to_string);
            exchange.stream_complete = record.get("complete").and_then(Value::as_bool);
            if let Some(frames) = record.get("frames").and_then(Value::as_u64) {
                exchange.frames = frames;
            }
        }
        _ => {}
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
        for line in std::fs::read_to_string(&path)?.lines() {
            let Ok(record) = serde_json::from_str::<Value>(line) else {
                continue;
            };
            if record.get("correlation_id").and_then(Value::as_str) != Some(correlation_id) {
                continue;
            }
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
