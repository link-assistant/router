//! `OpenAI` Responses-API (`POST /v1/responses`) request/response translation.
//!
//! The newer agentic Responses API is a superset of Chat Completions. The
//! `ChatGPT` backend used by Codex subscriptions speaks *only* this dialect, so
//! the router both accepts Responses requests (projecting them to Anthropic
//! Messages) and projects Chat Completions requests onto the Responses shape
//! when forwarding to Codex. Shared field-shaping helpers live in
//! [`crate::openai`].

use serde::{Deserialize, Serialize};
use serde_json::{Value, json};

use crate::openai::{
    extract_text, map_model, reconcile_subscription_parameters, translate_parts, translate_tools,
};

/// `OpenAI` `POST /v1/responses` request body. We accept the superset and
/// project to Anthropic Messages, so unknown keys are ignored.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OpenAIResponseRequest {
    pub model: String,
    /// Either a single string or a structured input list.
    pub input: Value,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub instructions: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub max_output_tokens: Option<u32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub temperature: Option<f32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub stream: Option<bool>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tools: Option<Value>,
}

/// Translate an `OpenAI` Responses-API request to Anthropic Messages.
#[must_use]
pub fn response_to_anthropic(req: &OpenAIResponseRequest) -> Value {
    let mut system_chunks: Vec<String> = req.instructions.iter().cloned().collect();
    let mut messages: Vec<Value> = Vec::new();
    match &req.input {
        Value::String(s) => {
            messages.push(json!({"role": "user", "content": s}));
        }
        Value::Array(items) => {
            for item in items {
                if let Some(role) = item.get("role").and_then(Value::as_str) {
                    let content = item.get("content").cloned().unwrap_or(Value::Null);
                    match role {
                        "system" | "developer" => {
                            if let Some(text) = extract_text(&content) {
                                system_chunks.push(text);
                            }
                        }
                        "user" | "assistant" => {
                            let anthropic_content = match content {
                                Value::String(text) => Value::String(text),
                                Value::Array(parts) => Value::Array(translate_parts(&parts)),
                                other => Value::String(extract_text(&other).unwrap_or_default()),
                            };
                            messages.push(json!({
                                "role": role,
                                "content": anthropic_content,
                            }));
                        }
                        _ => {}
                    }
                } else if let Some(text) = item.as_str() {
                    messages.push(json!({"role": "user", "content": text}));
                }
            }
        }
        _ => {}
    }

    let max_tokens = req.max_output_tokens.unwrap_or(4096);
    let mut body = json!({
        "model": map_model(&req.model),
        "max_tokens": max_tokens,
        "messages": messages,
    });
    if !system_chunks.is_empty() {
        body["system"] = Value::String(system_chunks.join("\n\n"));
    }
    if let Some(t) = req.temperature {
        body["temperature"] = json!(t);
    }
    if req.stream == Some(true) {
        body["stream"] = json!(true);
    }
    if let Some(tools) = &req.tools {
        body["tools"] = translate_tools(tools);
    }
    reconcile_subscription_parameters(crate::subscription::SubscriptionProvider::Claude, &mut body);
    body
}

/// Normalise a Responses-API `input` field to the typed list shape.
///
/// The documented Responses API accepts either a bare string or a list of
/// input items, but the `ChatGPT` backend accepts only the list form and
/// answers a string with `{"detail":"Input must be a list"}` (HTTP 400). Both
/// documented forms therefore have to be normalised here before forwarding:
/// a string becomes a single user turn, and bare strings inside the list get
/// the same treatment. Anything already typed is passed through untouched.
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

/// Translate an `OpenAI` Chat Completions request body to an `OpenAI`
/// Responses-API request body.
///
/// The `ChatGPT` backend used by Codex subscriptions speaks only the Responses
/// API, so Chat Completions requests are projected onto it: `system`/`developer`
/// turns become `instructions`, remaining turns become typed `input` items, and
/// the token/sampling knobs are renamed to their Responses equivalents. The
/// caller's `model` is preserved verbatim (Codex expects e.g. `gpt-5-codex`).
#[must_use]
pub fn chat_completion_to_responses(body: &Value) -> Value {
    let model = body
        .get("model")
        .and_then(Value::as_str)
        .unwrap_or("gpt-5-codex");

    let mut instructions: Vec<String> = Vec::new();
    let mut input: Vec<Value> = Vec::new();
    if let Some(messages) = body.get("messages").and_then(Value::as_array) {
        for msg in messages {
            let role = msg.get("role").and_then(Value::as_str).unwrap_or("user");
            let content = msg.get("content").cloned().unwrap_or(Value::Null);
            match role {
                "system" | "developer" => {
                    if let Some(text) = extract_text(&content) {
                        instructions.push(text);
                    }
                }
                _ => {
                    let text = extract_text(&content).unwrap_or_default();
                    // Responses input uses `input_text` for user-side content
                    // and `output_text` for prior assistant turns.
                    let part_type = if role == "assistant" {
                        "output_text"
                    } else {
                        "input_text"
                    };
                    input.push(json!({
                        "role": role,
                        "content": [{ "type": part_type, "text": text }],
                    }));
                }
            }
        }
    }

    let mut out = json!({
        "model": model,
        "input": input,
    });
    if !instructions.is_empty() {
        out["instructions"] = Value::String(instructions.join("\n\n"));
    }
    if let Some(max) = body
        .get("max_completion_tokens")
        .or_else(|| body.get("max_tokens"))
        .and_then(Value::as_u64)
    {
        out["max_output_tokens"] = json!(max);
    }
    if let Some(t) = body.get("temperature").and_then(Value::as_f64) {
        out["temperature"] = json!(t);
    }
    if let Some(t) = body.get("top_p").and_then(Value::as_f64) {
        out["top_p"] = json!(t);
    }
    if let Some(tools) = body.get("tools") {
        out["tools"] = tools.clone();
    }
    out
}

/// Translate an Anthropic JSON response to an `OpenAI` Responses-API response.
#[must_use]
pub fn anthropic_to_response(anthropic: &Value, resolved_model: &str) -> Value {
    let id = anthropic
        .get("id")
        .and_then(Value::as_str)
        .map_or_else(|| format!("resp-{}", uuid::Uuid::new_v4()), String::from);
    let mut text = String::new();
    if let Some(blocks) = anthropic.get("content").and_then(Value::as_array) {
        for block in blocks {
            if block.get("type").and_then(Value::as_str) == Some("text") {
                if let Some(t) = block.get("text").and_then(Value::as_str) {
                    text.push_str(t);
                }
            }
        }
    }
    let served_model = anthropic
        .get("model")
        .and_then(Value::as_str)
        .unwrap_or(resolved_model);
    json!({
        "id": id,
        "object": "response",
        "created_at": chrono::Utc::now().timestamp(),
        "model": served_model,
        "status": "completed",
        "output": [
            {
                "type": "message",
                "role": "assistant",
                "content": [
                    { "type": "output_text", "text": text }
                ]
            }
        ],
        "usage": anthropic.get("usage").cloned().unwrap_or(Value::Null),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn responses_api_translation() {
        let req = OpenAIResponseRequest {
            model: "gpt-4o".into(),
            input: Value::String("write a haiku".into()),
            instructions: Some("be poetic".into()),
            max_output_tokens: Some(128),
            temperature: Some(0.9),
            stream: None,
            tools: None,
        };
        let body = response_to_anthropic(&req);
        assert_eq!(body["model"], "claude-sonnet-4-5-20250929");
        assert_eq!(body["system"], "be poetic");
        assert_eq!(body["max_tokens"], 128);
        assert_eq!(body["messages"][0]["content"], "write a haiku");

        let resp = json!({
            "id": "msg_1",
            "model": "claude-sonnet-4-5-20250929",
            "content": [{"type":"text","text":"line1"}]
        });
        let out = anthropic_to_response(&resp, "gpt-4o");
        assert_eq!(out["object"], "response");
        assert_eq!(out["model"], "claude-sonnet-4-5-20250929");
        assert_eq!(out["output"][0]["content"][0]["text"], "line1");
    }

    #[test]
    fn responses_structured_input_translates_to_anthropic() {
        let req = OpenAIResponseRequest {
            model: "gpt-5".into(),
            input: json!([
                {
                    "role": "developer",
                    "content": [{"type": "input_text", "text": "be terse"}]
                },
                {
                    "role": "system",
                    "content": [{"type": "input_text", "text": "answer plainly"}]
                },
                {
                    "role": "user",
                    "content": [
                        {"type": "input_text", "text": "describe this"},
                        {"type": "input_image", "image_url": "https://example.com/image.png"}
                    ]
                },
                {
                    "role": "assistant",
                    "content": [{"type": "output_text", "text": "a prior answer"}]
                }
            ]),
            instructions: Some("follow policy".into()),
            max_output_tokens: None,
            temperature: None,
            stream: None,
            tools: None,
        };

        let body = response_to_anthropic(&req);

        assert_eq!(
            body["system"],
            "follow policy\n\nbe terse\n\nanswer plainly"
        );
        assert_eq!(body["messages"].as_array().map(Vec::len), Some(2));
        assert_eq!(body["messages"][0]["role"], "user");
        assert_eq!(
            body["messages"][0]["content"],
            json!([
                {"type": "text", "text": "describe this"},
                {
                    "type": "image",
                    "source": {"type": "url", "url": "https://example.com/image.png"}
                }
            ])
        );
        assert_eq!(body["messages"][1]["role"], "assistant");
        assert_eq!(
            body["messages"][1]["content"],
            json!([{"type": "text", "text": "a prior answer"}])
        );
    }

    #[test]
    fn chat_completion_projects_to_responses_input() {
        let body = json!({
            "model": "gpt-5-codex",
            "messages": [
                {"role": "system", "content": "be terse"},
                {"role": "user", "content": "hello"},
                {"role": "assistant", "content": "hi"}
            ],
            "max_tokens": 256,
        });
        let out = chat_completion_to_responses(&body);
        assert_eq!(out["model"], "gpt-5-codex");
        assert_eq!(out["instructions"], "be terse");
        assert_eq!(out["max_output_tokens"], 256);
        assert_eq!(out["input"][0]["role"], "user");
        assert_eq!(out["input"][0]["content"][0]["type"], "input_text");
        assert_eq!(out["input"][1]["content"][0]["type"], "output_text");
    }

    #[test]
    fn normalizes_string_input_and_preserves_typed_input() {
        let typed = json!([{
            "type": "message",
            "role": "user",
            "content": [{"type": "input_text", "text": "скажи ок"}],
        }]);
        assert_eq!(
            normalize_input_items(&Value::String("скажи ок".into())),
            typed
        );
        assert_eq!(normalize_input_items(&typed), typed);
    }

    #[test]
    fn drops_temperature_for_claude_5_models() {
        let req = OpenAIResponseRequest {
            model: "claude-opus-5".into(),
            input: Value::String("hello".into()),
            instructions: None,
            max_output_tokens: None,
            temperature: Some(0.7),
            stream: None,
            tools: None,
        };
        let body = response_to_anthropic(&req);
        assert!(body.get("temperature").is_none());
    }
}
