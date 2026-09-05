//! Claude Code request identity used for OAuth inference and account probes.

use axum::body::Bytes;
use serde_json::{Value, json};

/// The exact identity line Claude Code sends as its first system block.
pub const CLAUDE_CODE_SYSTEM_PROMPT: &str =
    "You are Claude Code, Anthropic's official CLI for Claude.";

/// Claude Code version installed by the real-client release gate.
pub const DEFAULT_CLIENT_VERSION: &str = "2.1.261";

/// The supported Claude Code version, with an operator override for staged
/// client upgrades.
#[must_use]
pub fn client_version() -> String {
    std::env::var("CLAUDE_CLIENT_VERSION").unwrap_or_else(|_| DEFAULT_CLIENT_VERSION.to_string())
}

/// User-Agent emitted by Claude Code's OAuth account endpoints.
#[must_use]
pub fn oauth_user_agent() -> String {
    format!("claude-cli/{} (external, cli)", client_version())
}

/// Whether an upstream credential is a Claude subscription OAuth access token.
#[must_use]
pub fn is_oauth_credential(token: &str) -> bool {
    token.starts_with("sk-ant-oat")
}

/// Ensure an Anthropic Messages body starts with the Claude Code identity.
pub fn ensure_claude_code_system(body: &mut Value) {
    let Some(object) = body.as_object_mut() else {
        return;
    };
    let identity = json!({"type": "text", "text": CLAUDE_CODE_SYSTEM_PROMPT});

    match object.get("system") {
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

fn first_block_is_identity(blocks: &[Value]) -> bool {
    blocks
        .first()
        .and_then(|block| block.get("text"))
        .and_then(Value::as_str)
        .is_some_and(|text| text.starts_with(CLAUDE_CODE_SYSTEM_PROMPT))
}

/// Apply [`ensure_claude_code_system`] to a body forwarded as raw bytes.
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
    fn oauth_identity_tracks_the_supported_client() {
        assert_eq!(
            oauth_user_agent(),
            format!("claude-cli/{DEFAULT_CLIENT_VERSION} (external, cli)")
        );
    }

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
