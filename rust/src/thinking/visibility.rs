//! Summary visibility does not change the requested amount of thinking.
use super::ThinkingProtocol;
use super::apply::{object_at, remove};
use serde_json::{Value, json};

pub(super) fn extract(body: &Value, from: ThinkingProtocol) -> Option<bool> {
    use ThinkingProtocol as P;
    match from {
        P::Gemini | P::Vertex => body
            .pointer("/generationConfig/thinkingConfig/includeThoughts")
            .or_else(|| body.pointer("/generationConfig/thinkingConfig/include_thoughts"))
            .or_else(|| body.pointer("/generation_config/thinking_config/include_thoughts"))
            .and_then(Value::as_bool),
        P::Antigravity => extract(body.get("request").unwrap_or(body), P::Gemini),
        P::Anthropic => body
            .pointer("/thinking/display")
            .and_then(Value::as_str)
            .map(|value| value != "omitted"),
        P::OpenAIChat | P::Qwen => body
            .pointer("/reasoning/summary")
            .and_then(Value::as_str)
            .map(|summary| summary != "none")
            .or_else(|| {
                body.get("reasoning_effort")
                    .and_then(Value::as_str)
                    .map(|effort| effort != "none")
            }),
        P::OpenAIResponses | P::Codex | P::Xai => body
            .pointer("/reasoning/summary")
            .or_else(|| body.pointer("/reasoning/generate_summary"))
            .and_then(Value::as_str)
            .map(|value| value != "none"),
        P::Interactions => body
            .pointer("/generation_config/thinking_summaries")
            .and_then(Value::as_str)
            .map(|value| value != "none"),
        P::Kimi => None,
    }
}

pub(super) fn apply(body: &mut Value, to: ThinkingProtocol, visibility: Option<bool>) {
    use ThinkingProtocol as P;
    let Some(visible) = visibility else { return };
    match to {
        P::Gemini | P::Vertex => {
            // An explicit disabled level configuration must not be recreated.
            let Some(thinking) = body.pointer_mut("/generationConfig/thinkingConfig") else {
                return;
            };
            remove(thinking, "include_thoughts");
            thinking["includeThoughts"] = json!(visible);
        }
        P::Antigravity => {
            if let Some(request) = body.get_mut("request") {
                apply(request, P::Gemini, visibility);
            }
        }
        P::Anthropic => {
            if body
                .pointer("/thinking/type")
                .and_then(Value::as_str)
                .is_some_and(|kind| kind != "disabled")
            {
                body["thinking"]["display"] = json!(if visible { "summarized" } else { "omitted" });
            }
        }
        P::OpenAIResponses | P::Codex | P::Xai => {
            if visible {
                let reasoning = object_at(body, "reasoning");
                if reasoning.get("summary").is_none() {
                    reasoning["summary"] = json!("auto");
                }
            } else if let Some(reasoning) = body.get_mut("reasoning") {
                remove(reasoning, "summary");
            }
        }
        P::Interactions => {
            object_at(body, "generation_config")["thinking_summaries"] =
                json!(if visible { "auto" } else { "none" });
        }
        P::OpenAIChat | P::Qwen | P::Kimi => {}
    }
}
