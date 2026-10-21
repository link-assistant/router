//! Buffered Codex SSE terminal assembly.

use std::collections::BTreeMap;

pub(super) fn codex_sse_to_response_json(body: &[u8]) -> Option<Vec<u8>> {
    let text = std::str::from_utf8(body).ok()?;
    let mut terminal: Option<serde_json::Value> = None;
    let mut output = BTreeMap::<u64, serde_json::Value>::new();
    for line in text.lines() {
        let Some(payload) = line.strip_prefix("data:") else {
            continue;
        };
        let payload = payload.trim();
        if payload.is_empty() || payload == "[DONE]" {
            continue;
        }
        let Ok(event) = serde_json::from_str::<serde_json::Value>(payload) else {
            continue;
        };
        match event.get("type").and_then(serde_json::Value::as_str) {
            Some("response.output_item.added" | "response.output_item.done") => {
                if let Some(item) = event.get("item") {
                    let index = event
                        .get("output_index")
                        .and_then(serde_json::Value::as_u64)
                        .unwrap_or(output.len() as u64);
                    let mut item = item.clone();
                    if item
                        .get("content")
                        .and_then(serde_json::Value::as_array)
                        .is_none_or(Vec::is_empty)
                        && let Some(content) =
                            output.get(&index).and_then(|item| item.get("content"))
                    {
                        item["content"] = content.clone();
                    }
                    output.insert(index, item);
                }
            }
            Some("response.output_text.delta") => update_text(&mut output, &event, false),
            Some("response.output_text.done") => update_text(&mut output, &event, true),
            Some("response.refusal.delta") => update_refusal(&mut output, &event, false),
            Some("response.refusal.done") => update_refusal(&mut output, &event, true),
            Some("response.completed" | "response.incomplete") => {
                if let Some(response) = event.get("response") {
                    terminal = Some(response.clone());
                }
            }
            Some("response.failed") => {
                if let Some(response) = event.get("response") {
                    let mut response = response.clone();
                    response["error"] =
                        crate::responses::response_failed_error(&event)["error"].clone();
                    terminal = Some(response);
                }
            }
            _ => {}
        }
    }
    if let Some(response) = terminal.as_mut() {
        if response
            .get("output")
            .and_then(serde_json::Value::as_array)
            .is_none()
        {
            response["output"] = serde_json::json!([]);
        }
        if let Some(terminal_output) = response
            .get_mut("output")
            .and_then(serde_json::Value::as_array_mut)
        {
            for (index, item) in output {
                let Ok(index) = usize::try_from(index) else {
                    continue;
                };
                terminal_output.resize(index + 1, serde_json::Value::Null);
                let missing_content = item.get("content").is_some()
                    && terminal_output[index]
                        .get("content")
                        .and_then(serde_json::Value::as_array)
                        .is_none_or(Vec::is_empty);
                if terminal_output[index].is_null() || missing_content {
                    terminal_output[index] = item;
                }
            }
        }
    }
    terminal.and_then(|value| serde_json::to_vec(&value).ok())
}

fn update_text(
    output: &mut BTreeMap<u64, serde_json::Value>,
    event: &serde_json::Value,
    done: bool,
) {
    let output_index = event
        .get("output_index")
        .and_then(serde_json::Value::as_u64)
        .unwrap_or(0);
    let content_index = event
        .get("content_index")
        .and_then(serde_json::Value::as_u64)
        .and_then(|index| usize::try_from(index).ok())
        .unwrap_or(0);
    let item_id = event
        .get("item_id")
        .and_then(serde_json::Value::as_str)
        .unwrap_or("");
    let item = output.entry(output_index).or_insert_with(|| {
        serde_json::json!({
            "id": item_id, "type": "message", "status": "in_progress",
            "role": "assistant", "content": []
        })
    });
    let Some(content) = item
        .get_mut("content")
        .and_then(serde_json::Value::as_array_mut)
    else {
        return;
    };
    content.resize(content_index + 1, serde_json::Value::Null);
    if content[content_index].is_null() {
        content[content_index] =
            serde_json::json!({"type": "output_text", "text": "", "annotations": []});
    }
    let text = event
        .get(if done { "text" } else { "delta" })
        .and_then(serde_json::Value::as_str)
        .unwrap_or("");
    if done {
        content[content_index]["text"] = serde_json::Value::String(text.to_string());
        item["status"] = serde_json::Value::String("completed".to_string());
    } else if let Some(current) = content[content_index]["text"].as_str() {
        content[content_index]["text"] = serde_json::Value::String(format!("{current}{text}"));
    }
}

fn update_refusal(
    output: &mut BTreeMap<u64, serde_json::Value>,
    event: &serde_json::Value,
    done: bool,
) {
    let output_index = event
        .get("output_index")
        .and_then(serde_json::Value::as_u64)
        .unwrap_or(0);
    let content_index = event
        .get("content_index")
        .and_then(serde_json::Value::as_u64)
        .and_then(|index| usize::try_from(index).ok())
        .unwrap_or(0);
    let item = output.entry(output_index).or_insert_with(|| {
        serde_json::json!({
            "id": event.get("item_id").and_then(serde_json::Value::as_str).unwrap_or(""),
            "type": "message", "status": "in_progress", "role": "assistant", "content": []
        })
    });
    let Some(content) = item
        .get_mut("content")
        .and_then(serde_json::Value::as_array_mut)
    else {
        return;
    };
    content.resize(content_index + 1, serde_json::Value::Null);
    if content[content_index].is_null() {
        content[content_index] = serde_json::json!({"type": "refusal", "refusal": ""});
    }
    let refusal = event
        .get(if done { "refusal" } else { "delta" })
        .and_then(serde_json::Value::as_str)
        .unwrap_or("");
    if done {
        content[content_index]["refusal"] = serde_json::Value::String(refusal.to_string());
        item["status"] = serde_json::Value::String("completed".to_string());
    } else if let Some(current) = content[content_index]["refusal"].as_str() {
        content[content_index]["refusal"] =
            serde_json::Value::String(format!("{current}{refusal}"));
    }
}
