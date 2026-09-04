use super::{CodexResponsesMode, SubscriptionProvider};

/// Extract the concatenated text from a Responses `input` message item.
fn input_item_text(item: &serde_json::Value) -> Option<String> {
    match item.get("content") {
        Some(serde_json::Value::String(s)) => Some(s.clone()),
        Some(serde_json::Value::Array(parts)) => {
            let text: String = parts
                .iter()
                .filter_map(|p| p.get("text").and_then(serde_json::Value::as_str))
                .collect::<Vec<_>>()
                .join("");
            (!text.is_empty()).then_some(text)
        }
        _ => None,
    }
}

/// Apply provider capability rules, then any provider-specific body shaping.
pub(super) fn normalize_subscription_request(
    provider: SubscriptionProvider,
    body: &mut serde_json::Value,
    responses_mode: CodexResponsesMode,
) {
    crate::openai::reconcile_subscription_parameters(provider, body);
    if provider == SubscriptionProvider::Codex {
        normalize_codex_responses_body(body, responses_mode);
    }
}

/// Shape a Responses-API request body for the `ChatGPT` Codex backend.
///
/// The Codex backend is stricter than the generic `OpenAI` Responses API: it
/// always streams and rejects `max_output_tokens`. Standard Responses requests
/// also reject system/developer input messages and require non-empty top-level
/// `instructions`, so those turns are hoisted and a default is used when
/// nothing remains. Responses Lite deliberately keeps its protocol envelope:
/// Codex places `additional_tools` in a developer input item and keeps
/// `instructions` empty.
pub(super) fn normalize_codex_responses_body(
    body: &mut serde_json::Value,
    mode: CodexResponsesMode,
) {
    let Some(obj) = body.as_object_mut() else {
        return;
    };
    obj.entry("reasoning").or_insert_with(
        || serde_json::json!({"effort": crate::clients::DEFAULT_OPENAI_REASONING_EFFORT}),
    );
    // Codex always streams from the ChatGPT backend.
    obj.insert("stream".to_string(), serde_json::Value::Bool(true));
    // ChatGPT subscription inference does not permit stored responses.
    obj.insert("store".to_string(), serde_json::Value::Bool(false));
    // `max_output_tokens` is not accepted by the Codex backend.
    obj.remove("max_output_tokens");
    if mode == CodexResponsesMode::Lite {
        return;
    }
    // The backend rejects a bare-string `input` ("Input must be a list"), so
    // normalise both documented forms to the typed list shape.
    if let Some(input) = obj.get("input") {
        let normalized = crate::responses::normalize_input_items(input);
        obj.insert("input".to_string(), normalized);
    }

    // Hoist system/developer turns out of `input` (Codex forbids them there).
    let mut hoisted: Vec<String> = Vec::new();
    if let Some(serde_json::Value::Array(items)) = obj.get_mut("input") {
        items.retain(
            |item| match item.get("role").and_then(serde_json::Value::as_str) {
                Some("system" | "developer") => {
                    if let Some(text) = input_item_text(item) {
                        hoisted.push(text);
                    }
                    false
                }
                _ => true,
            },
        );
    }

    // Merge existing instructions + hoisted system turns; fall back to a default.
    let mut parts: Vec<String> = Vec::new();
    if let Some(existing) = obj.get("instructions").and_then(serde_json::Value::as_str)
        && !existing.trim().is_empty()
    {
        parts.push(existing.to_string());
    }
    parts.extend(hoisted);
    let instructions = if parts.is_empty() {
        "You are a helpful assistant.".to_string()
    } else {
        parts.join("\n\n")
    };
    obj.insert(
        "instructions".to_string(),
        serde_json::Value::String(instructions),
    );
}
