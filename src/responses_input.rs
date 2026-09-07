//! Responses input normalization and bridge validation.

use serde_json::{Value, json};

/// Normalize a Responses input field to the typed list shape Codex requires.
#[must_use]
pub fn normalize_input_items(input: &Value) -> Value {
    fn user_turn(text: &str) -> Value {
        json!({
            "type": "message",
            "role": "user",
            "content": [{"type": "input_text", "text": text}],
        })
    }
    match input {
        Value::String(text) => json!([user_turn(text)]),
        Value::Array(items) => Value::Array(
            items
                .iter()
                .map(|item| item.as_str().map_or_else(|| item.clone(), user_turn))
                .collect(),
        ),
        other => other.clone(),
    }
}

/// Return why prior Responses history cannot be converted to Anthropic.
#[must_use]
pub fn untranslatable_tool_history(input: &Value) -> Option<String> {
    crate::bridge_request::untranslatable_response_history(input)
}
