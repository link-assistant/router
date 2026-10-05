//! How a relayed stream ends when its upstream fails mid-flight (issue #668).
//!
//! Once a streaming response has started, its status line is already sent and
//! cannot report a failure. Aborting the body leaves the client to guess: some
//! SDKs surface a network error, while others treat the closed connection as
//! the end of the answer and keep a truncated turn as if it were complete.
//!
//! [`in_band_errors`] wraps a relayed body. When the upstream fails before its
//! terminal event, the client gets exactly one protocol-correct error event in
//! its own dialect and the body ends. Router never synthesizes the dialect's
//! success terminator (`message_stop`, `[DONE]`, `response.completed`). A
//! failure *after* the terminal event ends the body cleanly, because the turn
//! is already complete (counted as success, not as an error). A body that
//! ends cleanly without its terminal event is a cut turn as well, and ends
//! with the same kind of error event.
//!
//! The dialect is only known for bodies Router can inspect. A compressed or
//! non-SSE body is relayed byte for byte, so it keeps the transport abort: an
//! injected plaintext frame would corrupt it.

use std::pin::Pin;
use std::task::{Context, Poll};

use bytes::Bytes;
use futures_util::Stream;
use serde_json::json;

/// Message of the error event sent when the upstream body ends before its
/// terminal event.
pub const INCOMPLETE_STREAM_MESSAGE: &str = "upstream stream ended before completion";

/// Upper bound for the bytes kept while looking for a split terminator.
pub const MAX_SSE_CARRY_BYTES: usize = 64 * 1024;

/// The client-facing wire dialect of a streamed response.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum StreamDialect {
    /// Anthropic Messages (`event: error`).
    Anthropic,
    /// `OpenAI` Chat Completions (`data: {"error": …}` without `[DONE]`).
    OpenAiChat,
    /// `OpenAI` Responses (`event: error`, `type: error`).
    Responses,
    /// Gemini `streamGenerateContent` (`data: {"error": …}`).
    Gemini,
}

impl StreamDialect {
    /// The dialect a request path streams in, when the path names one.
    #[must_use]
    pub fn from_path(path: &str) -> Option<Self> {
        let path = path.split('?').next().unwrap_or(path);
        if path.ends_with("/messages") {
            Some(Self::Anthropic)
        } else if path.ends_with("/chat/completions") {
            Some(Self::OpenAiChat)
        } else if path.ends_with("/responses") {
            Some(Self::Responses)
        } else if path.contains(":streamGenerateContent") {
            Some(Self::Gemini)
        } else {
            None
        }
    }
}

/// Why a stream failed before its terminal event.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FailureKind {
    /// The upstream went silent past the idle timeout.
    Stalled,
    /// The upstream connection was reset or the body could not be read.
    Interrupted,
    /// The upstream body ended cleanly but without its terminal event.
    Truncated,
}

impl FailureKind {
    /// Classify a transport error from the upstream body.
    #[must_use]
    pub fn of(error: &(dyn std::error::Error + 'static)) -> Self {
        let mut source = Some(error);
        while let Some(error) = source {
            if let Some(error) = error.downcast_ref::<reqwest::Error>()
                && error.is_timeout()
            {
                return Self::Stalled;
            }
            if let Some(error) = error.downcast_ref::<std::io::Error>() {
                if error.kind() == std::io::ErrorKind::TimedOut {
                    return Self::Stalled;
                }
                // `io::Error::source` skips the error it wraps; look inside.
                if let Some(inner) = error.get_ref()
                    && Self::of(inner) == Self::Stalled
                {
                    return Self::Stalled;
                }
            }
            source = error.source();
        }
        Self::Interrupted
    }

    /// The failure named by an in-band error event Router itself emitted in
    /// the Chat or Responses dialect, so a bridge relaying that event can
    /// report it in its own dialect instead of as a generic error.
    #[must_use]
    pub fn of_in_band(event: &serde_json::Value) -> Option<Self> {
        let code = event
            .pointer("/error/code")
            .or_else(|| event.get("code"))
            .and_then(serde_json::Value::as_str)?;
        match code {
            "upstream_timeout" => Some(Self::Stalled),
            "upstream_interrupted" => Some(Self::Interrupted),
            "upstream_incomplete" => Some(Self::Truncated),
            _ => None,
        }
    }

    const fn message(self) -> &'static str {
        match self {
            Self::Stalled => "upstream stream stalled past the idle timeout before completion",
            Self::Interrupted => "upstream stream was interrupted before completion",
            Self::Truncated => INCOMPLETE_STREAM_MESSAGE,
        }
    }
}

/// Render the one error event a client receives for a failed stream.
#[must_use]
pub fn error_frame(dialect: StreamDialect, kind: FailureKind) -> Bytes {
    let message = kind.message();
    let frame = match dialect {
        StreamDialect::Anthropic => {
            let kind = match kind {
                FailureKind::Stalled => "timeout_error",
                FailureKind::Interrupted | FailureKind::Truncated => "api_error",
            };
            let payload = json!({"type": "error", "error": {"type": kind, "message": message}});
            format!("event: error\ndata: {payload}\n\n")
        }
        StreamDialect::OpenAiChat => {
            let code = match kind {
                FailureKind::Stalled => "upstream_timeout",
                FailureKind::Interrupted => "upstream_interrupted",
                FailureKind::Truncated => "upstream_incomplete",
            };
            let payload =
                json!({"error": {"message": message, "type": "server_error", "code": code}});
            format!("data: {payload}\n\n")
        }
        StreamDialect::Responses => {
            let code = match kind {
                FailureKind::Stalled => "upstream_timeout",
                FailureKind::Interrupted => "upstream_interrupted",
                FailureKind::Truncated => "upstream_incomplete",
            };
            let payload = json!({"type": "error", "code": code, "message": message, "param": null});
            format!("event: error\ndata: {payload}\n\n")
        }
        StreamDialect::Gemini => {
            let (code, status) = match kind {
                FailureKind::Stalled => (504, "DEADLINE_EXCEEDED"),
                FailureKind::Interrupted | FailureKind::Truncated => (503, "UNAVAILABLE"),
            };
            let payload = json!({"error": {"code": code, "message": message, "status": status}});
            format!("data: {payload}\n\n")
        }
    };
    Bytes::from(frame)
}

/// Whether one complete SSE block ends the turn in any dialect.
///
/// Parsed per event rather than by substring, so an answer that merely
/// *mentions* `[DONE]` or `message_stop` is not mistaken for its end. An
/// upstream's own in-band error also ends the turn: the client already has
/// its failure, and a second one would only confuse it.
#[must_use]
pub fn block_is_terminal(block: &str) -> bool {
    let mut event = None;
    let mut data = String::new();
    for line in block.lines() {
        let line = line.trim_end_matches('\r');
        if let Some(name) = line.strip_prefix("event:") {
            event = Some(name.trim().to_string());
        } else if let Some(value) = line.strip_prefix("data:") {
            if !data.is_empty() {
                data.push('\n');
            }
            data.push_str(value.strip_prefix(' ').unwrap_or(value));
        }
    }
    if matches!(event.as_deref(), Some("message_stop" | "error")) || data.trim() == "[DONE]" {
        return true;
    }
    let Ok(value) = serde_json::from_str::<serde_json::Value>(&data) else {
        return false;
    };
    let kind = value.get("type").and_then(serde_json::Value::as_str);
    if matches!(
        kind,
        Some(
            "message_stop"
                | "error"
                | "response.completed"
                | "response.incomplete"
                | "response.failed"
        )
    ) || value.get("error").is_some_and(|error| !error.is_null())
    {
        return true;
    }
    let finished = |list: &str, field: &str| {
        value
            .get(list)
            .and_then(serde_json::Value::as_array)
            .is_some_and(|items| {
                items.iter().any(|item| {
                    item.get(field)
                        .and_then(serde_json::Value::as_str)
                        .is_some_and(|reason| !reason.is_empty())
                })
            })
    };
    // Chat Completions and Gemini end the content with a finish reason; any
    // usage chunk after it carries no more of the answer.
    finished("choices", "finish_reason") || finished("candidates", "finishReason")
}

/// Chunk-safe detector for a dialect's terminal event.
///
/// A terminator split across two network chunks (`data: [DO` + `NE]`) is
/// still seen, and the carried bytes stay bounded.
#[derive(Debug, Default)]
pub struct TerminalEventDetector {
    carry: Vec<u8>,
    seen: bool,
}

impl TerminalEventDetector {
    /// Feed one chunk; returns whether a terminal event has been seen so far.
    pub fn push(&mut self, chunk: &[u8]) -> bool {
        for block in crate::sse::push_blocks(&mut self.carry, chunk) {
            self.seen |= block_is_terminal(&block);
        }
        if self.carry.len() > MAX_SSE_CARRY_BYTES {
            // An event this large is content, never a bare terminator.
            let discard = self.carry.len() - MAX_SSE_CARRY_BYTES;
            self.carry.drain(..discard);
        }
        self.seen
    }

    /// Whether a terminal event has been seen, including a final one whose
    /// blank line never arrived.
    #[must_use]
    pub fn seen(&self) -> bool {
        self.seen || block_is_terminal(&String::from_utf8_lossy(&self.carry))
    }

    /// Whether the relayed bytes stop inside an event, so anything appended
    /// must first close it with a blank line.
    #[must_use]
    pub const fn mid_frame(&self) -> bool {
        !self.carry.is_empty()
    }

    #[cfg(test)]
    pub(crate) const fn carried(&self) -> usize {
        self.carry.len()
    }
}

/// Wrap a relayed body so a mid-stream upstream failure ends it with one
/// in-band error event (see the module docs).
///
/// `dialect` is `None` for a body Router cannot rewrite; it then keeps the
/// transport abort.
pub fn in_band_errors<S, E>(stream: S, dialect: Option<StreamDialect>) -> InBandErrors<S>
where
    S: Stream<Item = Result<Bytes, E>>,
{
    InBandErrors {
        inner: Box::pin(stream),
        dialect,
        detector: TerminalEventDetector::default(),
        done: false,
    }
}

/// Stream returned by [`in_band_errors`].
pub struct InBandErrors<S> {
    inner: Pin<Box<S>>,
    dialect: Option<StreamDialect>,
    detector: TerminalEventDetector,
    done: bool,
}

impl<S> InBandErrors<S> {
    /// The error event, preceded by a blank line when the upstream stopped
    /// mid-event, so the client never parses the two as one corrupt event.
    fn terminal_error(&self, dialect: StreamDialect, kind: FailureKind) -> Bytes {
        let frame = error_frame(dialect, kind);
        if !self.detector.mid_frame() {
            return frame;
        }
        let mut closed = Vec::with_capacity(frame.len() + 2);
        closed.extend_from_slice(b"\n\n");
        closed.extend_from_slice(&frame);
        Bytes::from(closed)
    }
}

impl<S, E> Stream for InBandErrors<S>
where
    S: Stream<Item = Result<Bytes, E>>,
    E: Into<Box<dyn std::error::Error + Send + Sync>>,
{
    type Item = Result<Bytes, std::io::Error>;

    fn poll_next(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Option<Self::Item>> {
        let this = self.get_mut();
        if this.done {
            return Poll::Ready(None);
        }
        match this.inner.as_mut().poll_next(cx) {
            Poll::Ready(Some(Ok(bytes))) => {
                if this.dialect.is_some() {
                    this.detector.push(&bytes);
                }
                Poll::Ready(Some(Ok(bytes)))
            }
            Poll::Ready(Some(Err(error))) => {
                this.done = true;
                let error: Box<dyn std::error::Error + Send + Sync> = error.into();
                let Some(dialect) = this.dialect else {
                    return Poll::Ready(Some(Err(std::io::Error::other(error))));
                };
                if this.detector.seen() {
                    // The turn already completed; a late reset is not a failure.
                    tracing::debug!(%error, "upstream closed after the terminal event");
                    return Poll::Ready(None);
                }
                let kind = FailureKind::of(error.as_ref());
                tracing::warn!(%error, ?kind, ?dialect, "upstream stream failed before completion");
                Poll::Ready(Some(Ok(this.terminal_error(dialect, kind))))
            }
            Poll::Ready(None) => {
                this.done = true;
                match this.dialect {
                    Some(dialect) if !this.detector.seen() => {
                        tracing::warn!(?dialect, "upstream stream ended before its terminal event");
                        Poll::Ready(Some(Ok(
                            this.terminal_error(dialect, FailureKind::Truncated)
                        )))
                    }
                    _ => Poll::Ready(None),
                }
            }
            Poll::Pending => Poll::Pending,
        }
    }
}

#[cfg(test)]
#[path = "stream_termination_tests.rs"]
mod tests;
