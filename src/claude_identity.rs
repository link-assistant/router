//! Claude Code identity system prompt required by Claude MAX OAuth inference.
//!
//! `api.anthropic.com` only serves `user:inference` OAuth credentials (the ones
//! a Claude MAX subscription issues to Claude Code) when the request's **first**
//! system block is Claude Code's own identity line. A request without it is
//! rejected with a misleading `429 rate_limit_error` whose message is literally
//! `"Error"` — verified live in `docs/case-studies/issue-45/evidence/`.
//!
//! Claude Code always sends that line, so pass-through traffic from Claude Code
//! works by accident. Every other documented client — Codex over
//! `/v1/responses`, an SDK, a `curl` smoke test — does not, which broke the
//! "Claude MAX subscription inside Codex" use case of issue #45.
//!
//! The router therefore prepends the line for OAuth-backed upstream requests.
//! The operation is idempotent: a body that already starts with it is left
//! untouched, so Claude Code's own requests are unchanged.

use axum::body::Bytes;
use serde_json::{Value, json};

/// The exact identity line Claude Code sends as its first system block.
pub const CLAUDE_CODE_SYSTEM_PROMPT: &str =
    "You are Claude Code, Anthropic's official CLI for Claude.";

/// Whether an upstream credential is a Claude subscription OAuth access token.
///
/// Plain API keys (`sk-ant-api…`) are not subject to the requirement, so their
/// bodies are forwarded untouched.
#[must_use]
pub fn is_oauth_credential(token: &str) -> bool {
    token.starts_with("sk-ant-oat")
}

/// Ensure an Anthropic Messages body starts with the Claude Code identity.
///
/// The body's own system prompt is preserved: it simply follows the identity
/// block, which is how Claude Code itself layers its instructions.
pub fn ensure_claude_code_system(body: &mut Value) {
    let Some(object) = body.as_object_mut() else {
        return;
    };
    let identity = json!({"type": "text", "text": CLAUDE_CODE_SYSTEM_PROMPT});

    match object.get("system") {
        // Already the identity, verbatim — nothing to do.
        Some(Value::String(text)) if text == CLAUDE_CODE_SYSTEM_PROMPT => {}
        Some(Value::String(text)) => {
            let existing = json!({"type": "text", "text": text});
            object.insert("system".into(), json!([identity, existing]));
        }
        Some(Value::Array(blocks)) => {
            if first_block_is_identity(blocks) {
                return;
            }
            let mut merged = vec![identity];
            merged.extend(blocks.iter().cloned());
            object.insert("system".into(), Value::Array(merged));
        }
        _ => {
            object.insert("system".into(), json!([identity]));
        }
    }
}

/// Whether the first system block already carries the identity line.
fn first_block_is_identity(blocks: &[Value]) -> bool {
    blocks
        .first()
        .and_then(|b| b.get("text"))
        .and_then(Value::as_str)
        .is_some_and(|text| text.starts_with(CLAUDE_CODE_SYSTEM_PROMPT))
}

/// Apply [`ensure_claude_code_system`] to a body that is forwarded as raw bytes.
///
/// `parsed` is the already-decoded view of `raw`. Bodies that are not JSON
/// objects (or that need no change) are returned unmodified, so a malformed
/// request still reaches the upstream and gets the upstream's own error.
#[must_use]
pub fn ensure_claude_code_system_bytes(parsed: &Value, raw: Bytes) -> Bytes {
    if !parsed.is_object() {
        return raw;
    }
    let mut patched = parsed.clone();
    ensure_claude_code_system(&mut patched);
    if patched == *parsed {
        return raw;
    }
    serde_json::to_vec(&patched).map_or(raw, Bytes::from)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn adds_the_identity_when_no_system_prompt_is_present() {
        let mut body = json!({"model": "claude-sonnet-4-5", "messages": []});
        ensure_claude_code_system(&mut body);
        assert_eq!(body["system"][0]["text"], CLAUDE_CODE_SYSTEM_PROMPT);
        assert_eq!(body["system"].as_array().unwrap().len(), 1);
    }

    #[test]
    fn keeps_the_caller_system_prompt_after_the_identity() {
        let mut body = json!({"system": "be terse", "messages": []});
        ensure_claude_code_system(&mut body);
        assert_eq!(body["system"][0]["text"], CLAUDE_CODE_SYSTEM_PROMPT);
        assert_eq!(body["system"][1]["text"], "be terse");
    }

    #[test]
    fn prepends_to_an_existing_block_array() {
        let mut body = json!({
            "system": [{"type": "text", "text": "a"}, {"type": "text", "text": "b"}],
            "messages": []
        });
        ensure_claude_code_system(&mut body);
        let blocks = body["system"].as_array().unwrap();
        assert_eq!(blocks.len(), 3);
        assert_eq!(blocks[0]["text"], CLAUDE_CODE_SYSTEM_PROMPT);
        assert_eq!(blocks[2]["text"], "b");
    }

    #[test]
    fn is_idempotent_for_claude_codes_own_requests() {
        let original = json!({
            "system": [
                {"type": "text", "text": CLAUDE_CODE_SYSTEM_PROMPT},
                {"type": "text", "text": "project instructions"}
            ],
            "messages": []
        });
        let mut body = original.clone();
        ensure_claude_code_system(&mut body);
        assert_eq!(body, original);
    }

    #[test]
    fn leaves_a_plain_string_identity_alone() {
        let original = json!({"system": CLAUDE_CODE_SYSTEM_PROMPT, "messages": []});
        let mut body = original.clone();
        ensure_claude_code_system(&mut body);
        assert_eq!(body, original);
    }

    #[test]
    fn only_oauth_credentials_are_patched() {
        assert!(is_oauth_credential("sk-ant-oat01-abc"));
        assert!(!is_oauth_credential("sk-ant-api03-abc"));
        assert!(!is_oauth_credential(""));
    }

    #[test]
    fn byte_bodies_are_returned_untouched_when_nothing_changes() {
        let raw = Bytes::from_static(b"not json");
        let same = ensure_claude_code_system_bytes(&Value::Null, raw.clone());
        assert_eq!(same, raw);

        let parsed = json!({"system": CLAUDE_CODE_SYSTEM_PROMPT});
        let raw = Bytes::from(serde_json::to_vec(&parsed).unwrap());
        assert_eq!(ensure_claude_code_system_bytes(&parsed, raw.clone()), raw);
    }

    #[test]
    fn byte_bodies_are_rewritten_when_the_identity_is_missing() {
        let parsed = json!({"messages": [], "system": "be terse"});
        let raw = Bytes::from(serde_json::to_vec(&parsed).unwrap());
        let patched = ensure_claude_code_system_bytes(&parsed, raw);
        let value: Value = serde_json::from_slice(&patched).unwrap();
        assert_eq!(value["system"][0]["text"], CLAUDE_CODE_SYSTEM_PROMPT);
        assert_eq!(value["system"][1]["text"], "be terse");
    }
}
