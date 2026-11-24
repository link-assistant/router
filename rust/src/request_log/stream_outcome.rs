//! How a relayed stream finished, and what the log can say about it.
//!
//! Split from `request_log.rs` to keep that file within the repository's
//! 1000-line limit.

use super::RequestLog;

/// How a streamed relay finished, for the terminal log record.
#[derive(Debug, Clone)]
pub struct StreamOutcome {
    /// Whether the response was actually streamed.
    ///
    /// Every response is relayed through the same byte-stream machinery, so a
    /// single-shot JSON reply — gzip-compressed, arriving in a few transfer
    /// chunks — used to be settled as a stream that ended without its
    /// terminator, warning once per successful request (issue #252). A reply
    /// that is not a stream has no terminator to miss.
    pub streamed: bool,
    /// Whether the dialect's own terminator was seen.
    pub terminated: bool,
    /// Whether the frames could be read at all.
    ///
    /// The router relays a compressed body byte for byte — it never decodes
    /// one — so scanning those bytes for `message_stop` searches gzip and can
    /// only ever fail. Reporting that as a missing terminator declared every
    /// healthy compressed stream truncated, once per request (issue #255).
    /// "Not verifiable" is the honest answer, and it is a different answer
    /// from "cut short".
    pub inspectable: bool,
    /// Set when the upstream or the transport failed mid-stream.
    pub detail: Option<String>,
    pub frames: u64,
    pub bytes: u64,
    pub duration_ms: u128,
}

impl StreamOutcome {
    #[must_use]
    pub const fn is_complete(&self) -> bool {
        // A non-streamed reply is complete when nothing failed: there is no
        // dialect terminator to look for in a single JSON document.
        if !self.streamed {
            return self.detail.is_none();
        }
        // An unreadable stream is not known to be complete, and equally not
        // known to be cut. `is_complete` answers "can the log vouch for this",
        // so an unverifiable stream answers no — but `label` distinguishes it
        // from a stream that demonstrably stopped early, and the warning and
        // the anomaly classes follow `label`, not this.
        if !self.inspectable {
            return false;
        }
        self.terminated && self.detail.is_none()
    }

    /// Whether this outcome is evidence that the client saw a truncated answer.
    ///
    /// Only a stream whose frames could actually be read can testify to that.
    /// This is what the operator-facing warning keys on: a signal that fires on
    /// the healthy common case cannot be used to find the unhealthy rare one
    /// (issues #234, #255).
    #[must_use]
    pub const fn is_demonstrably_cut(&self) -> bool {
        if self.detail.is_some() {
            return true;
        }
        self.streamed && self.inspectable && !self.terminated
    }

    /// A short, greppable name for the outcome.
    #[must_use]
    pub const fn label(&self) -> &'static str {
        if self.detail.is_some() {
            "upstream_error"
        } else if !self.streamed {
            "completed_not_streamed"
        } else if self.terminated {
            "completed"
        } else if self.inspectable {
            "ended_without_terminator"
        } else {
            "encoded_not_verifiable"
        }
    }
}

/// Sentinel that ends the relayed stream after its outcome has been recorded.
///
/// The terminal record is emitted by a final stream item, which is then filtered
/// out so the client sees only the real body.
pub const STREAM_END_MARKER: &str = "stream-end marker";

/// Record how a relayed stream finished, warning when it was cut short.
///
/// Silence is what made the defect invisible: an operator reading the log saw
/// only `status=200` while the user's answer was truncated (issue #230).
pub fn settle_stream(
    log: &RequestLog,
    correlation_id: &str,
    outcome: &std::sync::Mutex<StreamOutcome>,
    duration_ms: u128,
    logger: &log_lazy::LogLazy,
) {
    let outcome = {
        let mut outcome = outcome.lock().expect("stream outcome lock");
        outcome.duration_ms = duration_ms;
        outcome.clone()
    };
    if stream_warrants_a_warning(&outcome) {
        logger.warn(|| {
            format!(
                "stream {correlation_id} ended without its terminator after {} frames in {}ms{}",
                outcome.frames,
                outcome.duration_ms,
                outcome
                    .detail
                    .as_ref()
                    .map_or_else(String::new, |detail| format!(": {detail}"))
            )
        });
    }
    log.record_stream_end(correlation_id, &outcome);
}

/// Whether a settled stream deserves an operator-facing warning.
///
/// Only a stream that can be *shown* to have stopped early. A compressed body
/// is relayed undecoded, so its frames say nothing either way, and warning
/// about them filled a healthy deployment's log with one warning per
/// successful request — leaving a genuine truncation indistinguishable from
/// routine traffic, the exact outcome the diagnostics exist to prevent
/// (issues #234, #255).
#[must_use]
pub const fn stream_warrants_a_warning(outcome: &StreamOutcome) -> bool {
    outcome.is_demonstrably_cut()
}

/// Whether a relayed body arrives in a form the router can read.
///
/// The router forwards a compressed body verbatim rather than decoding it, so
/// an encoded stream's frames are gzip (or br, or zstd) on the way through.
/// Scanning those for a dialect terminator can only fail, which is why the
/// scan's result is not evidence about them either way (issue #255).
///
/// `identity` is the explicit "no encoding" value, so it is readable.
#[must_use]
pub fn body_is_inspectable(headers: &reqwest::header::HeaderMap) -> bool {
    headers
        .get(reqwest::header::CONTENT_ENCODING)
        .and_then(|value| value.to_str().ok())
        .is_none_or(|encoding| {
            encoding
                .split(',')
                .all(|part| part.trim().is_empty() || part.trim().eq_ignore_ascii_case("identity"))
        })
}

/// Whether a relayed response is a stream, from its own headers.
#[must_use]
pub fn response_is_streamed(headers: &reqwest::header::HeaderMap) -> bool {
    is_streaming_media_type(
        headers
            .get(reqwest::header::CONTENT_TYPE)
            .and_then(|value| value.to_str().ok()),
    )
}

/// Whether a response `content-type` denotes a streamed body.
///
/// `text/event-stream` is a stream by definition; anything else — most often
/// `application/json` — is a single document, however many transfer chunks it
/// arrives in. An absent or unreadable header is treated as streaming, so the
/// truncation detection from issue #230 keeps its reach when the upstream
/// declares nothing.
#[must_use]
pub fn is_streaming_media_type(content_type: Option<&str>) -> bool {
    content_type.is_none_or(|value| {
        value
            .split(';')
            .next()
            .unwrap_or_default()
            .trim()
            .eq_ignore_ascii_case("text/event-stream")
    })
}

/// Whether `frame` carries the terminating event of a streaming dialect.
///
/// Anthropic ends a turn with `message_stop`; the `OpenAI` surfaces end with
/// `[DONE]`, the Responses shape with `response.completed`, and Gemini with a
/// final chunk carrying `finishReason`. A stream that stops without one of
/// these was cut mid-flight (issue #230).
#[must_use]
pub fn frame_terminates_stream(frame: &[u8]) -> bool {
    let Ok(text) = std::str::from_utf8(frame) else {
        // A compressed frame cannot be inspected; absence of a terminator is
        // then unknowable rather than false, and the caller says so.
        return false;
    };
    text_terminates_stream(text)
}

/// Whether decoded stream text carries a dialect's terminating event.
///
/// Split from [`frame_terminates_stream`] so the log analyser can settle a
/// stream from the body it already recorded, rather than reporting the ending
/// as unknown whenever the relay wrote no terminal record (issue #258). One
/// list, so the two cannot drift into disagreeing about what "finished" means.
#[must_use]
pub fn text_terminates_stream(text: &str) -> bool {
    text.contains("message_stop")
        || text.contains("[DONE]")
        || text.contains("response.completed")
        // Gemini names no terminating event; the last chunk of a finished turn
        // carries `finishReason` instead.
        || text.contains("finishReason")
}
