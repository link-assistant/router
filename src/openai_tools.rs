use serde_json::{Value, json};

use super::ChatMessage;

pub fn extract_text(content: &Value) -> Option<String> {
    match content {
        Value::String(s) => Some(s.clone()),
        Value::Array(parts) => {
            let mut buf = String::new();
            for p in parts {
                if let Some(t) = p.get("text").and_then(Value::as_str) {
                    buf.push_str(t);
                } else if let Some(s) = p.as_str() {
                    buf.push_str(s);
                }
            }
            if buf.is_empty() { None } else { Some(buf) }
        }
        _ => None,
    }
}

pub fn translate_parts(parts: &[Value]) -> Vec<Value> {
    parts
        .iter()
        .filter_map(|p| {
            let kind = p.get("type").and_then(Value::as_str).unwrap_or("text");
            match kind {
                "text" | "input_text" | "output_text" => {
                    let text = p.get("text").and_then(Value::as_str).unwrap_or("");
                    Some(json!({"type": "text", "text": text}))
                }
                "image_url" => {
                    let url = p
                        .get("image_url")
                        .and_then(|v| v.get("url"))
                        .and_then(Value::as_str)
                        .unwrap_or("");
                    Some(json!({
                        "type": "image",
                        "source": {"type": "url", "url": url}
                    }))
                }
                "input_image" => {
                    let url = p.get("image_url").and_then(Value::as_str).unwrap_or("");
                    Some(json!({
                        "type": "image",
                        "source": {"type": "url", "url": url}
                    }))
                }
                _ => None,
            }
        })
        .collect()
}

/// Whether a tool entry can be represented in the Anthropic dialect.
///
/// Anthropic understands function tools and the two server-side tools. Codex
/// CLI additionally sends `namespace`, `custom` and `tool_search` as part of its
/// ordinary tool set, and those have no Anthropic equivalent.
fn is_translatable(tool: &Value) -> bool {
    let kind = tool
        .get("type")
        .and_then(Value::as_str)
        .unwrap_or("function");
    match kind {
        "function" => tool
            .get("function")
            .unwrap_or(tool)
            .get("name")
            .and_then(Value::as_str)
            .is_some_and(|name| !name.is_empty()),
        "web_search" | "web_fetch" => true,
        _ => false,
    }
}

/// A human-readable name for a tool entry, for reporting what was dropped.
fn tool_label(tool: &Value) -> String {
    let kind = tool
        .get("type")
        .and_then(Value::as_str)
        .unwrap_or("function");
    tool.get("function")
        .unwrap_or(tool)
        .get("name")
        .and_then(Value::as_str)
        .filter(|name| !name.is_empty())
        .map_or_else(|| kind.to_string(), |name| format!("{kind} ({name})"))
}

/// Tool entries that cannot cross into the Anthropic dialect, in order.
///
/// Dropping these is preferable to refusing the request. A model is never
/// obliged to call a tool, so a request carrying the nine usable tools of a
/// Codex turn is far more useful than a `400` naming the one that did not fit
/// (issue #215). The caller is told what was dropped rather than left to infer
/// it from an agent that quietly never uses sub-agents.
#[must_use]
pub fn untranslatable_anthropic_tools(tools: &Value) -> Vec<String> {
    tools.as_array().map_or_else(Vec::new, |tools| {
        tools
            .iter()
            .filter(|tool| !is_translatable(tool))
            .map(tool_label)
            .collect()
    })
}

pub fn translate_tools(tools: &Value) -> Value {
    match tools {
        Value::Array(arr) => {
            let mapped: Vec<Value> = arr
                .iter()
                // An untranslatable entry is dropped rather than passed through
                // verbatim: forwarding a shape Anthropic does not define would
                // trade a router `400` for a vendor one (issue #215).
                .filter(|t| is_translatable(t))
                .map(|t| {
                    let kind = t.get("type").and_then(Value::as_str).unwrap_or("function");
                    match kind {
                        "web_search" => {
                            let mut tool = json!({
                                "type": "web_search_20250305",
                                "name": "web_search",
                            });
                            for key in [
                                "max_uses",
                                "allowed_domains",
                                "blocked_domains",
                                "user_location",
                            ] {
                                if let Some(value) = t.get(key) {
                                    tool[key] = value.clone();
                                }
                            }
                            return tool;
                        }
                        "web_fetch" => {
                            let mut tool = json!({
                                "type": "web_fetch_20250910",
                                "name": "web_fetch",
                            });
                            if let Some(max_uses) = t.get("max_uses") {
                                tool["max_uses"] = max_uses.clone();
                            }
                            return tool;
                        }
                        "function" => {}
                        _ => return t.clone(),
                    }
                    // Chat Completions nests a function definition while the
                    // Responses API keeps the same fields flat.
                    let func = t.get("function").unwrap_or(t);
                    let name = func
                        .get("name")
                        .and_then(Value::as_str)
                        .unwrap_or_default()
                        .to_string();
                    let description = func
                        .get("description")
                        .cloned()
                        .unwrap_or(Value::String(String::new()));
                    let parameters = func.get("parameters").cloned().unwrap_or_else(|| json!({}));
                    json!({
                        "name": name,
                        "description": description,
                        "input_schema": parameters,
                    })
                })
                .collect();
            Value::Array(mapped)
        }
        other => other.clone(),
    }
}

/// Validate prior Chat tool turns before translating them to Anthropic. Empty
/// identifiers or malformed JSON arguments cannot be repaired without losing
/// the caller's tool protocol state.
#[must_use]
pub fn untranslatable_chat_tool_history(messages: &[ChatMessage]) -> Option<String> {
    for message in messages {
        if message.role == "tool" && message.tool_call_id.as_deref().is_none_or(str::is_empty) {
            return Some("role=tool message is missing tool_call_id".into());
        }
        let Some(tool_calls) = message.tool_calls.as_ref() else {
            continue;
        };
        let Some(tool_calls) = tool_calls.as_array() else {
            return Some("assistant tool_calls must be an array".into());
        };
        for call in tool_calls {
            if call
                .get("id")
                .and_then(Value::as_str)
                .is_none_or(str::is_empty)
            {
                return Some("assistant tool call is missing id".into());
            }
            let Some(function) = call.get("function") else {
                return Some("assistant tool call is missing function".into());
            };
            if function
                .get("name")
                .and_then(Value::as_str)
                .is_none_or(str::is_empty)
            {
                return Some("assistant tool call is missing function.name".into());
            }
            let Some(arguments) = function.get("arguments").and_then(Value::as_str) else {
                return Some("assistant tool call is missing string function.arguments".into());
            };
            if serde_json::from_str::<Value>(arguments).is_err() {
                return Some("assistant tool call function.arguments is not valid JSON".into());
            }
        }
    }
    None
}

pub fn translate_tool_choice(choice: &Value) -> Value {
    match choice {
        Value::String(s) => match s.as_str() {
            "required" => json!({"type": "any"}),
            "none" => json!({"type": "none"}),
            // "auto" plus any unrecognised string default to auto.
            _ => json!({"type": "auto"}),
        },
        Value::Object(map) => {
            if let Some(func) = map.get("function").and_then(Value::as_object)
                && let Some(name) = func.get("name").and_then(Value::as_str)
            {
                return json!({"type": "tool", "name": name});
            }
            if map.get("type").and_then(Value::as_str) == Some("function")
                && let Some(name) = map.get("name").and_then(Value::as_str)
            {
                return json!({"type": "tool", "name": name});
            }
            json!({"type": "auto"})
        }
        _ => json!({"type": "auto"}),
    }
}

/// Return a semantic error for a tool-choice shape that would otherwise be
/// silently weakened to `auto` during Anthropic translation.
#[must_use]
pub fn untranslatable_anthropic_tool_choice(choice: &Value) -> Option<String> {
    match choice {
        Value::String(mode) if matches!(mode.as_str(), "auto" | "required" | "none") => None,
        Value::Object(map) => {
            let nested_name = map
                .get("function")
                .and_then(Value::as_object)
                .and_then(|function| function.get("name"))
                .and_then(Value::as_str);
            let flat_name = (map.get("type").and_then(Value::as_str) == Some("function"))
                .then(|| map.get("name").and_then(Value::as_str))
                .flatten();
            (nested_name.is_none() && flat_name.is_none())
                .then(|| "tool_choice must select auto, required, none, or a named function".into())
        }
        _ => Some("tool_choice must select auto, required, none, or a named function".into()),
    }
}
