//! Buffered Anthropic Messages to `OpenAI` Responses translation.

use serde_json::{Value, json};

#[must_use]
pub fn anthropic_to_response(anthropic: &Value, resolved_model: &str) -> Value {
    let id = anthropic
        .get("id")
        .and_then(Value::as_str)
        .map_or_else(|| format!("resp-{}", uuid::Uuid::new_v4()), String::from);
    let (text, annotations) =
        crate::bridge_response::anthropic_text_and_annotations(anthropic.get("content"));
    let stop = crate::bridge_response::stop_semantics(
        anthropic.get("stop_reason").and_then(Value::as_str),
    );
    let mut output = Vec::new();
    if let Some(blocks) = anthropic.get("content").and_then(Value::as_array) {
        for block in blocks {
            match block.get("type").and_then(Value::as_str) {
                Some("tool_use") => output.push(json!({
                    "type": "function_call",
                    "call_id": block.get("id").and_then(Value::as_str).unwrap_or_default(),
                    "name": block.get("name").and_then(Value::as_str).unwrap_or_default(),
                    "arguments": serde_json::to_string(
                        block.get("input").unwrap_or(&Value::Null)
                    ).unwrap_or_else(|_| "{}".into()),
                    "status": "completed",
                })),
                Some("server_tool_use") => {
                    let call_type = match block.get("name").and_then(Value::as_str) {
                        Some("web_fetch") => "web_fetch_call",
                        _ => "web_search_call",
                    };
                    output.push(json!({
                        "type": call_type,
                        "id": block.get("id").and_then(Value::as_str).unwrap_or_default(),
                        "status": "in_progress",
                        "action": block.get("input").cloned().unwrap_or_else(|| json!({})),
                    }));
                }
                Some(result_type @ ("web_search_tool_result" | "web_fetch_tool_result")) => {
                    let call_type = if result_type == "web_fetch_tool_result" {
                        "web_fetch_call"
                    } else {
                        "web_search_call"
                    };
                    if let Some(item) = output.iter_mut().rev().find(|item| {
                        item.get("type").and_then(Value::as_str) == Some(call_type)
                            && item.get("id") == block.get("tool_use_id")
                    }) {
                        item["status"] = Value::String("completed".into());
                        item["result"] = block.get("content").cloned().unwrap_or(Value::Null);
                    }
                }
                _ => {}
            }
        }
    }
    if !text.is_empty() || output.is_empty() {
        let part = if stop.refusal {
            json!({"type": "refusal", "refusal": text})
        } else {
            json!({"type": "output_text", "text": text, "annotations": annotations})
        };
        output.push(json!({
            "type": "message",
            "role": "assistant",
            "status": stop.response_status,
            "content": [part]
        }));
    }
    let served_model = anthropic
        .get("model")
        .and_then(Value::as_str)
        .unwrap_or(resolved_model);
    let usage = crate::bridge_response::AnthropicUsage::from_value(anthropic.get("usage"));
    let mut response = json!({
        "id": id,
        "object": "response",
        "created_at": chrono::Utc::now().timestamp(),
        "model": served_model,
        "status": stop.response_status,
        "output": output,
        "usage": usage.responses(),
    });
    if let Some(tier) = usage.openai_service_tier() {
        response["service_tier"] = Value::String(tier.into());
    }
    if let Some(reason) = stop.incomplete_reason {
        response["incomplete_details"] = json!({"reason": reason});
    }
    response
}
