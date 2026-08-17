//! Pre-dispatch spend reservations for per-token `max_tokens` budgets.
//!
//! A spend cap cannot be enforced from recorded usage alone. Usage is only known
//! once a response completes, so checking `used_tokens < max_tokens` at admission
//! lets a single large answer push the persisted total arbitrarily far past the
//! cap — the router observed `39273/30000` after one tool loop (issue #195).
//!
//! The router therefore reserves budget *before* dispatching. Every protocol
//! declares, or is given, a maximum output size; that figure plus an estimate of
//! the prompt is reserved against the cap at admission and released when the real
//! usage arrives. Because the reservation happens inside the same locked
//! read-modify-write that increments the request counters, concurrent requests
//! cannot collectively overshoot either.
//!
//! # Enforcement contract
//!
//! * A request is admitted only when `used + reserved + estimate <= max_tokens`.
//! * A request whose declared output budget cannot fit is rejected up front with
//!   `token_budget_exceeded` rather than being truncated mid-answer.
//! * Actual usage is always recorded in full, even when it exceeds the estimate,
//!   so the persisted total never understates real spend.
//! * The bound is therefore exact against *declared* budgets. Providers that
//!   report more tokens than the caller's declared maximum (hidden reasoning
//!   tokens, for example) can still land above the cap by that provider-side
//!   excess; the overshoot is bounded by one request's unreported surplus rather
//!   than being unbounded, and both figures are visible to administrators.

use serde_json::Value;

/// Characters per token used by the router's local estimator.
///
/// Matches [`crate::output_limit`] and
/// [`crate::anthropic_bridge::count_tokens_estimate`] so one request is not
/// measured two different ways.
const CHARS_PER_TOKEN: u64 = 4;

/// Output budget assumed when a request declares none.
///
/// Protocol adapters already default to this figure when shaping upstream
/// requests, so reserving it keeps the reservation aligned with what the
/// upstream is actually allowed to return.
pub const DEFAULT_MAX_OUTPUT_TOKENS: u64 = 4096;

/// The spend a request could report, used to reserve budget before dispatch.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub struct RequestBudget {
    /// Estimated prompt tokens.
    pub input: u64,
    /// Declared (or defaulted) maximum output tokens.
    pub output: u64,
}

impl RequestBudget {
    /// Total tokens to reserve for this request.
    #[must_use]
    pub const fn total(self) -> u64 {
        self.input.saturating_add(self.output)
    }
}

/// Estimate the spend a request body could report.
///
/// Reads whichever output-cap field the request's protocol uses:
/// `max_output_tokens` (Responses), `max_completion_tokens`/`max_tokens` (Chat
/// Completions and Anthropic Messages), and
/// `generationConfig.maxOutputTokens` (Gemini). When none is present the
/// protocol default applies, matching what the adapters forward upstream.
#[must_use]
pub fn estimate(body: &Value) -> RequestBudget {
    RequestBudget {
        input: estimate_input_tokens(body),
        output: declared_output_tokens(body).unwrap_or(DEFAULT_MAX_OUTPUT_TOKENS),
    }
}

/// The caller's declared output cap, in whichever field its protocol uses.
#[must_use]
pub fn declared_output_tokens(body: &Value) -> Option<u64> {
    for field in ["max_output_tokens", "max_completion_tokens", "max_tokens"] {
        if let Some(value) = body.get(field).and_then(Value::as_u64) {
            return Some(value);
        }
    }
    body.get("generationConfig")
        .and_then(|config| config.get("maxOutputTokens"))
        .and_then(Value::as_u64)
}

/// Estimate prompt tokens from the request's text payload.
///
/// The router has no upstream tokenizer, so it measures the serialized textual
/// content with the same ~4-characters-per-token heuristic used elsewhere. This
/// only has to be good enough to keep a reservation in the right order of
/// magnitude; the real figure replaces it at settlement.
#[must_use]
pub fn estimate_input_tokens(body: &Value) -> u64 {
    let mut characters = 0u64;
    for field in ["messages", "input", "contents", "system", "prompt", "tools"] {
        if let Some(value) = body.get(field) {
            characters = characters.saturating_add(text_length(value));
        }
    }
    characters.div_ceil(CHARS_PER_TOKEN)
}

/// Total length of every string in a JSON value.
fn text_length(value: &Value) -> u64 {
    match value {
        Value::String(text) => text.len() as u64,
        Value::Array(items) => items
            .iter()
            .map(text_length)
            .fold(0u64, u64::saturating_add),
        Value::Object(fields) => fields
            .values()
            .map(text_length)
            .fold(0u64, u64::saturating_add),
        _ => 0,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn reads_the_responses_output_cap() {
        let body = json!({"max_output_tokens": 1500});
        assert_eq!(declared_output_tokens(&body), Some(1500));
        assert_eq!(estimate(&body).output, 1500);
    }

    #[test]
    fn reads_the_chat_completions_output_caps() {
        assert_eq!(
            declared_output_tokens(&json!({"max_completion_tokens": 700})),
            Some(700)
        );
        assert_eq!(
            declared_output_tokens(&json!({"max_tokens": 800})),
            Some(800)
        );
    }

    #[test]
    fn reads_the_gemini_output_cap() {
        let body = json!({"generationConfig": {"maxOutputTokens": 256}});
        assert_eq!(declared_output_tokens(&body), Some(256));
    }

    #[test]
    fn falls_back_to_the_protocol_default_when_no_cap_is_declared() {
        let body = json!({"messages": []});
        assert_eq!(declared_output_tokens(&body), None);
        assert_eq!(estimate(&body).output, DEFAULT_MAX_OUTPUT_TOKENS);
    }

    #[test]
    fn estimates_prompt_tokens_from_message_text() {
        // 40 characters of content over the 4-characters-per-token heuristic.
        let body = json!({"messages": [{"role": "user", "content": "a".repeat(40)}]});
        // "user" (4) + 40 characters = 44 characters => 11 tokens.
        assert_eq!(estimate_input_tokens(&body), 11);
    }

    #[test]
    fn counts_gemini_contents_and_anthropic_system_prompts() {
        let gemini = json!({"contents": [{"parts": [{"text": "b".repeat(8)}]}]});
        assert!(estimate_input_tokens(&gemini) > 0);
        let anthropic = json!({"system": "c".repeat(16), "messages": []});
        assert!(estimate_input_tokens(&anthropic) >= 4);
    }

    #[test]
    fn total_combines_input_and_output() {
        let budget = RequestBudget {
            input: 10,
            output: 20,
        };
        assert_eq!(budget.total(), 30);
    }

    #[test]
    fn saturates_rather_than_overflowing_on_absurd_declared_budgets() {
        let budget = RequestBudget {
            input: u64::MAX,
            output: u64::MAX,
        };
        assert_eq!(budget.total(), u64::MAX);
    }

    #[test]
    fn ignores_non_textual_payload_fields() {
        assert_eq!(estimate_input_tokens(&json!({"temperature": 0.7})), 0);
    }
}
