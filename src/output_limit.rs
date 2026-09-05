//! Local emulation of `max_output_tokens` for backends that reject the field.
//!
//! The `ChatGPT` Codex backend answers HTTP 400 for any explicit output cap, so
//! the router strips the field before forwarding (see
//! [`crate::subscription_proxy`]). Stripping alone would silently return more
//! output than the caller authorised, and refusing the request breaks every
//! ordinary `OpenAI`-compatible client (`OpenCode`, Grok CLI,
//! `@link-assistant/agent`), which always sends one. This module therefore
//! enforces the cap inside the router: visible output text is truncated at the
//! caller's budget and the exchange is terminated with the protocol's
//! length/incomplete signal.
//!
//! The budget is an estimate. The router has no upstream tokenizer, so it uses
//! the same ~4 characters per token heuristic as
//! [`crate::anthropic_bridge::count_tokens_estimate`], and hidden reasoning
//! tokens are not observable at all. The cap is therefore a best-effort output
//! bound, not an exact accounting of billed tokens.

use serde_json::{Value, json};

/// Characters per token used by the router's local estimator.
const CHARS_PER_TOKEN: u64 = 4;

/// Incremental budget over visible output text.
#[derive(Clone, Debug, Default)]
pub struct OutputTokenLimiter {
    /// Remaining characters, or `None` when the caller sent no cap.
    remaining: Option<u64>,
    stopped: bool,
}

impl OutputTokenLimiter {
    /// Create a limiter for an optional caller-supplied output-token cap.
    #[must_use]
    pub const fn new(limit: Option<u64>) -> Self {
        Self {
            remaining: match limit {
                Some(limit) => Some(limit.saturating_mul(CHARS_PER_TOKEN)),
                None => None,
            },
            stopped: false,
        }
    }

    /// Whether a cap is being enforced at all.
    #[must_use]
    pub const fn enabled(&self) -> bool {
        self.remaining.is_some()
    }

    /// Whether the budget has already been exhausted.
    #[must_use]
    pub const fn stopped(&self) -> bool {
        self.stopped
    }

    /// Return the leading part of `text` that fits in the budget, and whether
    /// this chunk exhausted it.
    pub fn push(&mut self, text: &str) -> (String, bool) {
        if self.stopped {
            return (String::new(), false);
        }
        let Some(remaining) = self.remaining else {
            return (text.to_string(), false);
        };
        let remaining = usize::try_from(remaining).unwrap_or(usize::MAX);
        if text.len() <= remaining {
            self.remaining = Some((remaining - text.len()) as u64);
            return (text.to_string(), false);
        }
        let mut cut = remaining;
        while cut > 0 && !text.is_char_boundary(cut) {
            cut -= 1;
        }
        self.remaining = Some(0);
        self.stopped = true;
        (text[..cut].to_string(), true)
    }
}

/// Truncate `text` to an output-token budget, returning `None` when it fits.
#[must_use]
pub fn truncate(text: &str, limit: u64) -> Option<String> {
    let mut limiter = OutputTokenLimiter::new(Some(limit));
    let (visible, truncated) = limiter.push(text);
    truncated.then_some(visible)
}

/// Record the concrete upstream model without replacing the requested one.
///
/// Returns the concrete model id when the upstream named a different one.
pub fn preserve_model_identity(payload: &mut Value, requested_model: &str) -> Option<String> {
    if requested_model.is_empty() {
        return None;
    }
    let object = payload.as_object_mut()?;
    let served = object
        .get("model")
        .and_then(Value::as_str)
        .map(str::to_string);
    object.insert(
        "model".to_string(),
        Value::String(requested_model.to_string()),
    );
    let served = served?;
    if served == requested_model {
        return None;
    }
    Some(served)
}

/// Enforce an output cap on a buffered Responses payload.
pub fn enforce_response_limit(response: &mut Value, limit: u64) {
    let mut limiter = OutputTokenLimiter::new(Some(limit));
    let mut truncated = false;
    if let Some(items) = response.get_mut("output").and_then(Value::as_array_mut) {
        for item in items.iter_mut() {
            let Some(parts) = item.get_mut("content").and_then(Value::as_array_mut) else {
                continue;
            };
            for part in parts.iter_mut() {
                let Some(text) = part.get("text").and_then(Value::as_str) else {
                    continue;
                };
                let (visible, hit) = limiter.push(text);
                if hit || visible.len() != text.len() {
                    part["text"] = Value::String(visible);
                }
                truncated |= hit;
            }
        }
    }
    if truncated {
        response["status"] = Value::String("incomplete".into());
        response["incomplete_details"] = json!({"reason": "max_output_tokens"});
    }
}

/// Enforce an output cap on a buffered Chat Completions payload.
pub fn enforce_chat_limit(response: &mut Value, limit: u64) {
    let Some(choice) = response
        .get_mut("choices")
        .and_then(Value::as_array_mut)
        .and_then(|choices| choices.first_mut())
    else {
        return;
    };
    let Some(text) = choice
        .pointer("/message/content")
        .and_then(Value::as_str)
        .map(str::to_string)
    else {
        return;
    };
    if let Some(visible) = truncate(&text, limit) {
        choice["message"]["content"] = Value::String(visible);
        choice["finish_reason"] = Value::String("length".into());
    }
}

/// Rewrite a relayed Codex Responses SSE stream.
///
/// The native `/v1/responses` surface is otherwise a byte-for-byte relay, which
/// would both leak the upstream's concrete model in place of the requested id
/// and ignore the caller's output cap. This rewriter keeps the relay shape but
/// restores the requested model identity and stops the stream once the cap is
/// exhausted.
pub struct ResponsesStreamRewriter {
    requested_model: String,
    limiter: OutputTokenLimiter,
    buffer: String,
    finished: bool,
    last_response: Option<Value>,
    upstream_model: Option<String>,
}

impl ResponsesStreamRewriter {
    /// Create a rewriter for one Codex-backed Responses request.
    #[must_use]
    pub fn new(requested_model: &str, limit: Option<u64>) -> Self {
        Self {
            requested_model: requested_model.to_string(),
            limiter: OutputTokenLimiter::new(limit),
            buffer: String::new(),
            finished: false,
            last_response: None,
            upstream_model: None,
        }
    }

    /// Whether the rewriter has to inspect the stream at all.
    #[must_use]
    pub const fn active(&self) -> bool {
        !self.requested_model.is_empty() || self.limiter.enabled()
    }

    /// The concrete upstream model seen so far, if it differs from the request.
    #[must_use]
    pub fn upstream_model(&self) -> Option<&str> {
        self.upstream_model.as_deref()
    }

    /// Push raw upstream bytes and return the rewritten SSE text.
    pub fn push(&mut self, chunk: &[u8]) -> String {
        if self.finished {
            return String::new();
        }
        self.buffer.push_str(&String::from_utf8_lossy(chunk));
        let mut out = String::new();
        while let Some((index, separator_len)) = find_separator(&self.buffer) {
            let block = self.buffer[..index].to_string();
            self.buffer.drain(..index + separator_len);
            out.push_str(&self.rewrite_block(&block));
            if self.finished {
                self.buffer.clear();
                break;
            }
        }
        out
    }

    fn rewrite_block(&mut self, block: &str) -> String {
        let Some(payload) = data_payload(block) else {
            return format!("{block}\n\n");
        };
        if payload == "[DONE]" {
            self.finished = true;
            return format!("{block}\n\n");
        }
        let Ok(mut event) = serde_json::from_str::<Value>(&payload) else {
            return format!("{block}\n\n");
        };
        if let Some(served) = preserve_model_identity(&mut event, &self.requested_model) {
            self.upstream_model = Some(served);
        }
        if let Some(response) = event.get_mut("response")
            && let Some(served) = preserve_model_identity(response, &self.requested_model)
        {
            self.upstream_model = Some(served);
        }
        if let Some(message) = event.get_mut("message")
            && let Some(served) = preserve_model_identity(message, &self.requested_model)
        {
            self.upstream_model = Some(served);
        }
        if event.get("type").and_then(Value::as_str) == Some("response.created")
            && let Some(response) = event.get("response")
        {
            self.last_response = Some(response.clone());
        }
        if event.get("type").and_then(Value::as_str) != Some("response.output_text.delta")
            || !self.limiter.enabled()
        {
            return render_block(block, &event);
        }
        let delta = event
            .get("delta")
            .and_then(Value::as_str)
            .unwrap_or_default()
            .to_string();
        let (visible, hit) = self.limiter.push(&delta);
        event["delta"] = Value::String(visible.clone());
        let mut out = String::new();
        if !visible.is_empty() {
            out.push_str(&render_block(block, &event));
        }
        if hit {
            self.finished = true;
            out.push_str(&self.incomplete_block());
            out.push_str("data: [DONE]\n\n");
        }
        out
    }

    fn incomplete_block(&self) -> String {
        let mut response = self.last_response.clone().unwrap_or_else(
            || json!({"id": "", "object": "response", "model": self.requested_model}),
        );
        response["status"] = Value::String("incomplete".into());
        response["incomplete_details"] = json!({"reason": "max_output_tokens"});
        let event = json!({"type": "response.incomplete", "response": response});
        format!("event: response.incomplete\ndata: {event}\n\n")
    }
}

fn find_separator(buffer: &str) -> Option<(usize, usize)> {
    buffer
        .find("\r\n\r\n")
        .map(|index| (index, 4))
        .or_else(|| buffer.find("\n\n").map(|index| (index, 2)))
}

fn data_payload(block: &str) -> Option<String> {
    let payload = block
        .lines()
        .filter_map(|line| {
            line.trim_end_matches('\r')
                .strip_prefix("data:")
                .map(str::trim_start)
        })
        .collect::<Vec<_>>()
        .join("\n");
    (!payload.is_empty()).then_some(payload)
}

/// Re-emit an SSE block with its `data:` payload replaced, keeping `event:`
/// and comment lines in their original order.
fn render_block(block: &str, event: &Value) -> String {
    use std::fmt::Write as _;
    let mut rendered = String::new();
    for line in block.lines() {
        let line = line.trim_end_matches('\r');
        if line.starts_with("data:") {
            continue;
        }
        rendered.push_str(line);
        rendered.push('\n');
    }
    let _ = write!(rendered, "data: {event}\n\n");
    rendered
}

#[cfg(test)]
#[path = "output_limit_tests.rs"]
mod tests;
