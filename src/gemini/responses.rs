//! Buffered Responses projection and terminal-state mapping for Gemini.

use serde_json::{Value, json};

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(super) enum Finish {
    Completed,
    MaxOutputTokens,
    ContentFilter,
}

impl Finish {
    pub(super) fn from_gemini(reason: &str) -> Self {
        match reason {
            "STOP" => Self::Completed,
            "MAX_TOKENS" => Self::MaxOutputTokens,
            // Every other Gemini terminal reason means generation did not
            // complete normally. Responses has a stable content-filter
            // incomplete reason for safety, recitation and future blocks.
            _ => Self::ContentFilter,
        }
    }

    pub(super) const fn status(self) -> &'static str {
        match self {
            Self::Completed => "completed",
            Self::MaxOutputTokens | Self::ContentFilter => "incomplete",
        }
    }

    pub(super) const fn event(self) -> &'static str {
        match self {
            Self::Completed => "response.completed",
            Self::MaxOutputTokens | Self::ContentFilter => "response.incomplete",
        }
    }

    const fn incomplete_reason(self) -> Option<&'static str> {
        match self {
            Self::Completed => None,
            Self::MaxOutputTokens => Some("max_output_tokens"),
            Self::ContentFilter => Some("content_filter"),
        }
    }

    pub(super) fn apply(self, response: &mut Value) {
        response["status"] = Value::String(self.status().into());
        response["incomplete_details"] = self
            .incomplete_reason()
            .map_or(Value::Null, |reason| json!({"reason": reason}));
    }
}

pub(super) fn from_chat(chat: &Value, requested_model: &str, finish: Finish) -> Value {
    let choice = chat
        .get("choices")
        .and_then(Value::as_array)
        .and_then(|choices| choices.first());
    let message = choice.and_then(|choice| choice.get("message"));
    let response_id = chat
        .get("id")
        .and_then(Value::as_str)
        .unwrap_or("chatcmpl")
        .trim_start_matches("chatcmpl-");
    let mut output = Vec::new();
    if let Some(text) = message
        .and_then(|message| message.get("content"))
        .and_then(Value::as_str)
        .filter(|text| !text.is_empty())
    {
        output.push(json!({
            "id": format!("msg_{response_id}"),
            "type": "message",
            "status": finish.status(),
            "role": "assistant",
            "content": [{"type": "output_text", "text": text, "annotations": []}],
        }));
    }
    for call in message
        .and_then(|message| message.get("tool_calls"))
        .and_then(Value::as_array)
        .map_or(&[][..], Vec::as_slice)
    {
        let id = call.get("id").and_then(Value::as_str).unwrap_or_default();
        output.push(json!({
            "id": format!("fc_{id}"),
            "type": "function_call",
            "status": finish.status(),
            "call_id": id,
            "name": call.pointer("/function/name").and_then(Value::as_str).unwrap_or_default(),
            "arguments": call.pointer("/function/arguments").and_then(Value::as_str)
                .unwrap_or("{}"),
        }));
    }
    let usage = chat.get("usage").unwrap_or(&Value::Null);
    let input = usage
        .get("prompt_tokens")
        .and_then(Value::as_u64)
        .unwrap_or(0);
    let output_tokens = usage
        .get("completion_tokens")
        .and_then(Value::as_u64)
        .unwrap_or(0);
    let mut response = json!({
        "id": format!("resp_{response_id}"),
        "object": "response",
        "created_at": chat.get("created").and_then(Value::as_i64)
            .unwrap_or_else(|| chrono::Utc::now().timestamp()),
        "status": finish.status(),
        "model": if requested_model.is_empty() {
            chat.get("model").and_then(Value::as_str).unwrap_or_default()
        } else {
            requested_model
        },
        "output": output,
        "error": null,
        "incomplete_details": null,
        "usage": {
            "input_tokens": input,
            "output_tokens": output_tokens,
            "total_tokens": usage.get("total_tokens").and_then(Value::as_u64)
                .unwrap_or_else(|| input.saturating_add(output_tokens)),
        }
    });
    finish.apply(&mut response);
    response
}

#[cfg(test)]
mod tests {
    use super::*;

    fn chat(reason: &str) -> Value {
        json!({
            "id": "chatcmpl-fixed",
            "model": "upstream",
            "created": 1,
            "choices": [{
                "finish_reason": reason,
                "message": {"role": "assistant", "content": "partial"}
            }],
            "usage": {"prompt_tokens": 2, "completion_tokens": 3, "total_tokens": 5}
        })
    }

    #[test]
    fn terminal_reasons_have_valid_responses_states() {
        for (gemini, status, incomplete) in [
            ("STOP", "completed", Value::Null),
            (
                "MAX_TOKENS",
                "incomplete",
                json!({"reason": "max_output_tokens"}),
            ),
            ("SAFETY", "incomplete", json!({"reason": "content_filter"})),
            (
                "RECITATION",
                "incomplete",
                json!({"reason": "content_filter"}),
            ),
        ] {
            let response = from_chat(&chat("unused"), "requested", Finish::from_gemini(gemini));
            assert_eq!(response["status"], status, "{gemini}");
            assert_eq!(response["incomplete_details"], incomplete, "{gemini}");
            assert_eq!(response["output"][0]["status"], status, "{gemini}");
            assert_eq!(response["model"], "requested");
            assert_eq!(response["usage"]["total_tokens"], 5);
        }
    }
}
