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
//! the bridge request-shape estimator, and hidden reasoning
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
/// must retain the upstream's concrete model while enforcing the caller's
/// output cap. This rewriter keeps the relay shape and stops the stream once
/// the cap is exhausted.
pub struct ResponsesStreamRewriter {
    requested_model: String,
    limiter: OutputTokenLimiter,
    buffer: Vec<u8>,
    finished: bool,
    last_response: Option<Value>,
    upstream_model: Option<String>,
    strict_identity: bool,
    allow_substitution: bool,
    selector_kind: crate::model_contract::ModelSelectorKind,
}

impl ResponsesStreamRewriter {
    /// Create a rewriter for one Codex-backed Responses request.
    #[must_use]
    pub fn new(requested_model: &str, limit: Option<u64>) -> Self {
        Self {
            requested_model: requested_model.to_string(),
            limiter: OutputTokenLimiter::new(limit),
            buffer: Vec::new(),
            finished: false,
            last_response: None,
            upstream_model: None,
            strict_identity: false,
            allow_substitution: false,
            selector_kind: crate::model_contract::ModelSelectorKind::Unknown,
        }
    }

    /// Inspect a translated stream under the credential's served-model policy.
    #[must_use]
    pub const fn with_model_policy(
        mut self,
        policy: &crate::model_contract::ModelAccessPolicy,
    ) -> Self {
        // This method marks a translated boundary. Translation must never
        // invent identity, including for intentionally unpinned credentials.
        self.strict_identity = true;
        self.allow_substitution = policy.allow_substitution;
        self
    }

    /// Attach exact selector semantics obtained from authenticated catalog or
    /// explicit operator configuration.
    #[must_use]
    pub const fn with_selector_kind(
        mut self,
        selector_kind: crate::model_contract::ModelSelectorKind,
    ) -> Self {
        self.selector_kind = selector_kind;
        self
    }

    /// Whether the rewriter has to inspect the stream at all.
    #[must_use]
    pub const fn active(&self) -> bool {
        !self.requested_model.is_empty() || self.limiter.enabled() || self.strict_identity
    }

    /// The first concrete upstream model seen so far.
    #[must_use]
    pub fn upstream_model(&self) -> Option<&str> {
        self.upstream_model.as_deref()
    }

    /// Push raw upstream bytes and return the rewritten SSE text.
    pub fn push(&mut self, chunk: &[u8]) -> String {
        if self.finished {
            return String::new();
        }
        let mut out = String::new();
        for block in crate::sse::push_blocks(&mut self.buffer, chunk) {
            out.push_str(&self.rewrite_block(&block));
            if self.finished {
                self.buffer.clear();
                break;
            }
        }
        out
    }

    /// Finish a translated stream after transport EOF.
    ///
    /// Providers normally terminate with `[DONE]`, but a clean HTTP EOF can
    /// otherwise bypass the missing-identity check. Never let that transport
    /// detail turn an unverifiable translated response into apparent success.
    pub fn finish(&mut self) -> String {
        if self.finished {
            return String::new();
        }
        let mut output = if self.buffer.is_empty() {
            String::new()
        } else {
            let trailing = String::from_utf8_lossy(&self.buffer).into_owned();
            self.buffer.clear();
            self.rewrite_block(&trailing)
        };
        if self.finished {
            return output;
        }
        self.finished = true;
        if self.strict_identity && self.upstream_model.is_none() {
            output.push_str(&Self::identity_error_block(
                &crate::model_contract::validate_served_model_for_selector(
                    &self.requested_model,
                    None,
                    self.allow_substitution,
                    self.selector_kind,
                )
                .expect_err("missing identity must fail"),
            ));
        }
        output
    }

    fn rewrite_block(&mut self, block: &str) -> String {
        let Some(payload) = data_payload(block) else {
            return format!("{block}\n\n");
        };
        if payload == "[DONE]" {
            if self.strict_identity && self.upstream_model.is_none() {
                self.finished = true;
                return Self::identity_error_block(
                    &crate::model_contract::validate_served_model_for_selector(
                        &self.requested_model,
                        None,
                        self.allow_substitution,
                        self.selector_kind,
                    )
                    .expect_err("missing identity must fail"),
                );
            }
            self.finished = true;
            return format!("{block}\n\n");
        }
        let Ok(mut event) = serde_json::from_str::<Value>(&payload) else {
            return format!("{block}\n\n");
        };
        let original = event.clone();
        if let Some(served) = crate::model_contract::served_model_from(&event) {
            if let Some(first) = self.upstream_model.as_deref()
                && first != served
            {
                self.finished = true;
                return Self::identity_error_block(&crate::model_contract::ServedModelError {
                    code: "served_model_changed".to_string(),
                    requested_model: self.requested_model.clone(),
                    served_model: Some(served.to_string()),
                });
            }
            if self.strict_identity
                && let Err(error) = crate::model_contract::validate_served_model_for_selector(
                    &self.requested_model,
                    Some(served),
                    self.allow_substitution,
                    self.selector_kind,
                )
            {
                self.finished = true;
                return Self::identity_error_block(&error);
            }
            self.upstream_model = Some(served.to_string());
        } else if self.strict_identity && self.upstream_model.is_none() {
            if event_contains_assistant_content(&event) {
                self.finished = true;
                return Self::identity_error_block(
                    &crate::model_contract::validate_served_model_for_selector(
                        &self.requested_model,
                        None,
                        self.allow_substitution,
                        self.selector_kind,
                    )
                    .expect_err("missing identity must fail"),
                );
            }
            // A translated client must not receive a lifecycle object that
            // makes its translator emit the requested selector as though it
            // were served identity. Identity-free preamble is dispensable and
            // is withheld until an identity-bearing object arrives.
            let upstream_error = event
                .get("type")
                .and_then(Value::as_str)
                .is_some_and(|kind| matches!(kind, "error" | "response.failed"))
                || event.get("error").is_some()
                || event.pointer("/response/error").is_some();
            if !upstream_error {
                return String::new();
            }
            self.finished = true;
        }
        if event.get("type").and_then(Value::as_str) == Some("response.created")
            && let Some(response) = event.get("response")
        {
            self.last_response = Some(response.clone());
        }
        if event.get("type").and_then(Value::as_str) != Some("response.output_text.delta")
            || !self.limiter.enabled()
        {
            if event == original {
                return format!("{block}\n\n");
            }
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
        let mut response = self
            .last_response
            .clone()
            .unwrap_or_else(|| json!({"id": "", "object": "response", "model": ""}));
        response["status"] = Value::String("incomplete".into());
        response["incomplete_details"] = json!({"reason": "max_output_tokens"});
        let event = json!({"type": "response.incomplete", "response": response});
        format!("event: response.incomplete\ndata: {event}\n\n")
    }

    fn identity_error_block(error: &crate::model_contract::ServedModelError) -> String {
        let event = json!({
            "type": "error",
            "error": {
                "type": error.code,
                "message": error.to_string(),
                "requested_model": error.requested_model,
                "served_model": error.served_model,
            }
        });
        format!("event: error\ndata: {event}\n\ndata: [DONE]\n\n")
    }
}

fn event_contains_assistant_content(event: &Value) -> bool {
    event
        .get("type")
        .and_then(Value::as_str)
        .is_some_and(|kind| {
            kind.contains("output_text.delta")
                || kind.contains("content_block_delta")
                || kind.contains("function_call_arguments.delta")
        })
        || event
            .get("choices")
            .and_then(Value::as_array)
            .is_some_and(|choices| !choices.is_empty())
        || event
            .get("candidates")
            .or_else(|| event.pointer("/response/candidates"))
            .and_then(Value::as_array)
            .is_some_and(|candidates| !candidates.is_empty())
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
