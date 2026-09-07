//! Native Gemini ↔ `OpenAI` Chat Completions translation.
//!
//! The Gemini CLI speaks only `generateContent`/`streamGenerateContent`. Its
//! requests must therefore reach Codex, Claude and Qwen subscriptions through
//! the router's `OpenAI` Chat Completions path, which every other namespace
//! already shares. This module owns that translation in both directions so the
//! HTTP handler in [`crate::gemini`] stays a thin router.
//!
//! The translation is intentionally lossless for the parts Gemini CLI actually
//! uses: system instruction, multi-turn text, client function declarations,
//! function calls, function results, generation config and usage metadata.

use serde_json::{Value, json};

/// Gemini part-role for assistant turns.
const MODEL_ROLE: &str = "model";

#[path = "gemini_bridge_request.rs"]
mod request;
pub use request::{chat_to_gemini_request, gemini_request_to_chat};
pub(crate) use request::{
    chat_to_gemini_request_checked, gemini_request_to_chat_checked, responses_to_chat_checked,
};

/// Translate an `OpenAI` Chat Completion into a native Gemini
/// `GenerateContentResponse`.
#[must_use]
pub fn chat_to_gemini_response(chat: &Value, model: &str) -> Value {
    let choice = chat
        .get("choices")
        .and_then(Value::as_array)
        .and_then(|choices| choices.first());
    let message = choice.and_then(|choice| choice.get("message"));

    let mut parts: Vec<Value> = Vec::new();
    if let Some(text) = message
        .and_then(|message| message.get("content"))
        .and_then(Value::as_str)
        && !text.is_empty()
    {
        parts.push(json!({ "text": text }));
    }
    for call in message
        .and_then(|message| message.get("tool_calls"))
        .and_then(Value::as_array)
        .map_or(&[][..], Vec::as_slice)
    {
        let function = call.get("function");
        let name = function
            .and_then(|function| function.get("name"))
            .and_then(Value::as_str)
            .unwrap_or_default();
        let args = function
            .and_then(|function| function.get("arguments"))
            .and_then(Value::as_str)
            .and_then(|arguments| serde_json::from_str::<Value>(arguments).ok())
            .unwrap_or_else(|| json!({}));
        let mut call_part = json!({ "name": name, "args": args });
        if let Some(id) = call.get("id").and_then(Value::as_str) {
            call_part["id"] = json!(id);
        }
        parts.push(json!({ "functionCall": call_part }));
    }

    let finish_reason = choice
        .and_then(|choice| choice.get("finish_reason"))
        .and_then(Value::as_str)
        .map_or("STOP", map_finish_reason);

    let usage = chat.get("usage");
    let prompt_tokens = usage
        .and_then(|usage| usage.get("prompt_tokens"))
        .and_then(Value::as_u64)
        .unwrap_or(0);
    let completion_tokens = usage
        .and_then(|usage| usage.get("completion_tokens"))
        .and_then(Value::as_u64)
        .unwrap_or(0);

    json!({
        "candidates": [{
            "index": 0,
            "content": { "role": MODEL_ROLE, "parts": parts },
            "finishReason": finish_reason,
        }],
        "usageMetadata": {
            "promptTokenCount": prompt_tokens,
            "candidatesTokenCount": completion_tokens,
            "totalTokenCount": prompt_tokens + completion_tokens,
        },
        "modelVersion": model,
    })
}

fn map_finish_reason(openai: &str) -> &'static str {
    match openai {
        "length" => "MAX_TOKENS",
        "content_filter" => "SAFETY",
        _ => "STOP",
    }
}

/// Translate an `OpenAI`-shaped error body into Gemini's error envelope.
#[must_use]
pub fn openai_error_to_gemini(status: u16, body: &Value) -> Value {
    let message = body
        .pointer("/error/message")
        .and_then(Value::as_str)
        .unwrap_or("upstream request failed");
    let status_text = match status {
        400 => "INVALID_ARGUMENT",
        401 | 403 => "PERMISSION_DENIED",
        404 => "NOT_FOUND",
        429 => "RESOURCE_EXHAUSTED",
        503 => "UNAVAILABLE",
        _ => "INTERNAL",
    };
    json!({
        "error": {
            "code": status,
            "message": message,
            "status": status_text,
        }
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn translates_system_instruction_and_multi_turn_text() {
        let request = json!({
            "systemInstruction": {"parts": [{"text": "be terse"}]},
            "contents": [
                {"role": "user", "parts": [{"text": "hi"}]},
                {"role": "model", "parts": [{"text": "hello"}]},
                {"role": "user", "parts": [{"text": "more"}]}
            ],
            "generationConfig": {"maxOutputTokens": 64, "temperature": 0.25}
        });
        let chat = gemini_request_to_chat("gpt-5.4-mini", &request);
        assert_eq!(chat["model"], "gpt-5.4-mini");
        let messages = chat["messages"].as_array().unwrap();
        assert_eq!(messages.len(), 4);
        assert_eq!(messages[0]["role"], "system");
        assert_eq!(messages[0]["content"], "be terse");
        assert_eq!(messages[2]["role"], "assistant");
        assert_eq!(chat["max_tokens"], 64);
        assert_eq!(chat["temperature"], 0.25);
    }

    #[test]
    fn translates_function_declarations_and_tool_mode() {
        let request = json!({
            "contents": [{"role": "user", "parts": [{"text": "weather?"}]}],
            "tools": [{"functionDeclarations": [{
                "name": "get_weather",
                "description": "look up weather",
                "parameters": {"type": "object", "properties": {"city": {"type": "string"}}}
            }]}],
            "toolConfig": {"functionCallingConfig": {"mode": "ANY"}}
        });
        let chat = gemini_request_to_chat("claude-opus-4-7", &request);
        let tools = chat["tools"].as_array().unwrap();
        assert_eq!(tools[0]["function"]["name"], "get_weather");
        assert_eq!(tools[0]["function"]["parameters"]["type"], "object");
        assert_eq!(tools.len(), 1);
        assert_eq!(chat["tool_choice"], "required");
    }

    #[test]
    fn pairs_function_responses_with_the_call_they_answer() {
        let request = json!({
            "contents": [
                {"role": "user", "parts": [{"text": "weather?"}]},
                {"role": "model", "parts": [
                    {"functionCall": {"name": "get_weather", "args": {"city": "Lisbon"}}}
                ]},
                {"role": "user", "parts": [
                    {"functionResponse": {"name": "get_weather", "response": {"c": 21}}}
                ]}
            ]
        });
        let chat = gemini_request_to_chat("gpt-5.4-mini", &request);
        let messages = chat["messages"].as_array().unwrap();
        let call_id = messages[1]["tool_calls"][0]["id"].as_str().unwrap();
        assert_eq!(
            messages[1]["tool_calls"][0]["function"]["arguments"],
            "{\"city\":\"Lisbon\"}"
        );
        assert_eq!(messages[2]["role"], "tool");
        assert_eq!(messages[2]["tool_call_id"], call_id);
    }

    #[test]
    fn honours_a_client_supplied_function_call_id() {
        let request = json!({
            "contents": [
                {"role": "model", "parts": [
                    {"functionCall": {"id": "toolu_42", "name": "ls", "args": {}}}
                ]},
                {"role": "user", "parts": [
                    {"functionResponse": {"name": "ls", "response": {"files": []}}}
                ]}
            ]
        });
        let chat = gemini_request_to_chat("gpt-5.4-mini", &request);
        let messages = chat["messages"].as_array().unwrap();
        assert_eq!(messages[0]["tool_calls"][0]["id"], "toolu_42");
        assert_eq!(messages[1]["tool_call_id"], "toolu_42");
    }

    #[test]
    fn translates_chat_completion_text_and_usage() {
        let chat = json!({
            "choices": [{
                "index": 0,
                "message": {"role": "assistant", "content": "answer"},
                "finish_reason": "length"
            }],
            "usage": {"prompt_tokens": 3, "completion_tokens": 5}
        });
        let gemini = chat_to_gemini_response(&chat, "gpt-5.4-mini");
        assert_eq!(
            gemini["candidates"][0]["content"]["parts"][0]["text"],
            "answer"
        );
        assert_eq!(gemini["candidates"][0]["content"]["role"], "model");
        assert_eq!(gemini["candidates"][0]["finishReason"], "MAX_TOKENS");
        assert_eq!(gemini["usageMetadata"]["totalTokenCount"], 8);
        assert_eq!(gemini["modelVersion"], "gpt-5.4-mini");
    }

    #[test]
    fn translates_chat_tool_calls_into_function_call_parts() {
        let chat = json!({
            "choices": [{
                "message": {
                    "role": "assistant",
                    "content": "",
                    "tool_calls": [{
                        "id": "call_1",
                        "type": "function",
                        "function": {"name": "get_weather", "arguments": "{\"city\":\"Lisbon\"}"}
                    }]
                },
                "finish_reason": "tool_calls"
            }]
        });
        let gemini = chat_to_gemini_response(&chat, "claude-opus-4-7");
        let part = &gemini["candidates"][0]["content"]["parts"][0]["functionCall"];
        assert_eq!(part["name"], "get_weather");
        assert_eq!(part["args"]["city"], "Lisbon");
        assert_eq!(part["id"], "call_1");
        assert_eq!(gemini["candidates"][0]["finishReason"], "STOP");
    }

    #[test]
    fn maps_openai_errors_onto_the_gemini_envelope() {
        let error = openai_error_to_gemini(
            429,
            &json!({"error": {"message": "slow down", "type": "rate_limit_error"}}),
        );
        assert_eq!(error["error"]["code"], 429);
        assert_eq!(error["error"]["message"], "slow down");
        assert_eq!(error["error"]["status"], "RESOURCE_EXHAUSTED");
    }
}
