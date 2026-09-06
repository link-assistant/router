//! Fail-closed Chat Completions history projection to Responses input.

use std::collections::HashSet;

use serde_json::{Value, json};

/// Translate a validated Chat request to a Responses request.
pub fn try_chat_completion_to_responses(body: &Value) -> Result<Value, String> {
    crate::bridge_controls::validate_openai_prompt_cache_breakpoints(body, true)?;
    let model = body.get("model").and_then(Value::as_str).unwrap_or("");
    let messages = body
        .get("messages")
        .and_then(Value::as_array)
        .ok_or("messages must be an array")?;
    let mut instructions = Vec::new();
    let mut input = Vec::new();
    let mut call_ids = HashSet::new();

    for (message_index, message) in messages.iter().enumerate() {
        let path = format!("messages[{message_index}]");
        let role = message
            .get("role")
            .and_then(Value::as_str)
            .ok_or_else(|| format!("{path}.role must be a string"))?;
        if message.get("audio").is_some_and(|value| !value.is_null()) {
            return Err(format!(
                "{path}.audio continuation cannot be represented by Responses"
            ));
        }
        if message
            .get("function_call")
            .is_some_and(|value| !value.is_null())
        {
            return Err(format!(
                "{path}.function_call is deprecated and cannot be represented without a stable call id"
            ));
        }
        match role {
            "system" | "developer" => {
                if contains_prompt_cache_breakpoint(message.get("content")) {
                    let content = message_content(message.get("content"), role, &path)?;
                    input.push(json!({"role":role, "content":content}));
                } else {
                    instructions.push(instruction_text(message.get("content"), &path)?);
                }
            }
            "user" => {
                let content = message_content(message.get("content"), role, &path)?;
                input.push(json!({"role":"user", "content":content}));
            }
            "assistant" => {
                let mut content = match message.get("content") {
                    None | Some(Value::Null) => Vec::new(),
                    Some(Value::String(text)) if text.is_empty() => Vec::new(),
                    value => message_content(value, role, &path)?,
                };
                if let Some(refusal) = message.get("refusal") {
                    match refusal {
                        Value::Null => {}
                        Value::String(refusal) => {
                            content.push(json!({"type":"refusal", "refusal":refusal}));
                        }
                        _ => return Err(format!("{path}.refusal must be a string or null")),
                    }
                }
                let calls = checked_tool_calls(message.get("tool_calls"), &path, &mut call_ids)?;
                if !content.is_empty() {
                    input.push(json!({"role":"assistant", "content":content}));
                } else if calls.is_empty() {
                    return Err(format!(
                        "{path} has no assistant content, refusal, or tool calls"
                    ));
                }
                input.extend(calls);
            }
            "tool" => {
                let call_id = nonempty_string(message, "tool_call_id")
                    .ok_or_else(|| format!("{path}.tool_call_id must be a non-empty string"))?;
                if !call_ids.contains(call_id) {
                    return Err(format!(
                        "{path}.tool_call_id does not match an earlier assistant tool call"
                    ));
                }
                input.push(json!({
                    "type":"function_call_output",
                    "call_id":call_id,
                    "output":tool_output(message.get("content"), &path)?,
                }));
            }
            "function" => {
                return Err(format!(
                    "{path}.role function is deprecated and cannot be represented without a stable call id"
                ));
            }
            _ => return Err(format!("{path}.role has unsupported value {role}")),
        }
    }

    let mut out = json!({"model":model, "input":input});
    out["reasoning"] = body
        .get("reasoning")
        .cloned()
        .or_else(|| {
            body.get("reasoning_effort")
                .cloned()
                .map(|effort| json!({"effort":effort}))
        })
        .unwrap_or_else(|| json!({"effort":crate::clients::DEFAULT_OPENAI_REASONING_EFFORT}));
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
    for field in [
        "temperature",
        "top_p",
        "safety_identifier",
        "user",
        "service_tier",
        "prompt_cache_key",
        "prompt_cache_options",
        "prompt_cache_retention",
        "moderation",
        "store",
        "metadata",
        "parallel_tool_calls",
        "stream_options",
    ] {
        if let Some(value) = body.get(field) {
            out[field] = value.clone();
        }
    }
    if let Some(tools) = body.get("tools") {
        out["tools"] = chat_tools_to_responses(tools);
    }
    if let Some(choice) = body.get("tool_choice") {
        out["tool_choice"] = chat_tool_choice_to_responses(choice);
    }
    if body.get("stream").and_then(Value::as_bool) == Some(true) {
        out["stream"] = Value::Bool(true);
    }
    if let Some(format) =
        crate::structured_output::chat_to_responses_format(body.get("response_format"))?
    {
        out["text"] = json!({"format": format});
    }
    Ok(out)
}

/// Compatibility helper for callers that already validated their request.
#[must_use]
pub fn chat_completion_to_responses(body: &Value) -> Value {
    try_chat_completion_to_responses(body).unwrap_or_else(|error| {
        json!({
            "model":body.get("model").cloned().unwrap_or(Value::Null),
            "input":[],
            "translation_error":error,
        })
    })
}

fn instruction_text(content: Option<&Value>, path: &str) -> Result<String, String> {
    match content {
        Some(Value::String(text)) => Ok(text.clone()),
        Some(Value::Array(parts)) => {
            let mut text = Vec::new();
            for (index, part) in parts.iter().enumerate() {
                if part.get("type").and_then(Value::as_str) != Some("text") {
                    return Err(format!(
                        "{path}.content[{index}] must be a text part for role system or developer"
                    ));
                }
                text.push(
                    part.get("text")
                        .and_then(Value::as_str)
                        .ok_or_else(|| format!("{path}.content[{index}].text must be a string"))?,
                );
            }
            Ok(text.join(""))
        }
        _ => Err(format!("{path}.content must be text")),
    }
}

fn message_content(content: Option<&Value>, role: &str, path: &str) -> Result<Vec<Value>, String> {
    match content {
        Some(Value::String(text)) => Ok(vec![text_part(role, text)]),
        Some(Value::Array(parts)) => parts
            .iter()
            .enumerate()
            .map(|(index, part)| map_part(part, role, &format!("{path}.content[{index}]")))
            .collect(),
        _ => Err(format!("{path}.content must be a string or array")),
    }
}

fn map_part(part: &Value, role: &str, path: &str) -> Result<Value, String> {
    let kind = part
        .get("type")
        .and_then(Value::as_str)
        .ok_or_else(|| format!("{path}.type must be a string"))?;
    match kind {
        "text" => {
            let text = part
                .get("text")
                .and_then(Value::as_str)
                .ok_or_else(|| format!("{path}.text must be a string"))?;
            let mut mapped = part.clone();
            mapped["type"] = Value::String(if role == "assistant" {
                "output_text".into()
            } else {
                "input_text".into()
            });
            mapped["text"] = Value::String(text.to_string());
            Ok(mapped)
        }
        "image_url" if role == "user" => map_image(part, path),
        "file" if role == "user" => map_file(part, path),
        "input_audio" => Err(format!(
            "{path} input_audio cannot be represented by Responses"
        )),
        "refusal" if role == "assistant" => {
            let refusal = part
                .get("refusal")
                .and_then(Value::as_str)
                .ok_or_else(|| format!("{path}.refusal must be a string"))?;
            Ok(json!({"type":"refusal", "refusal":refusal}))
        }
        _ => Err(format!(
            "{path} type {kind} is not valid for Chat role {role} on a Responses bridge"
        )),
    }
}

fn map_image(part: &Value, path: &str) -> Result<Value, String> {
    let image = part
        .get("image_url")
        .and_then(Value::as_object)
        .ok_or_else(|| format!("{path}.image_url must be an object"))?;
    let url = image
        .get("url")
        .and_then(Value::as_str)
        .filter(|url| !url.is_empty())
        .ok_or_else(|| format!("{path}.image_url.url must be a non-empty string"))?;
    let mut mapped = json!({"type":"input_image", "image_url":url});
    if let Some(detail) = image.get("detail") {
        if !detail.is_string() {
            return Err(format!("{path}.image_url.detail must be a string"));
        }
        mapped["detail"] = detail.clone();
    }
    copy_prompt_cache_breakpoint(part, &mut mapped);
    Ok(mapped)
}

fn map_file(part: &Value, path: &str) -> Result<Value, String> {
    let file = part
        .get("file")
        .and_then(Value::as_object)
        .ok_or_else(|| format!("{path}.file must be an object"))?;
    let mut mapped = json!({"type":"input_file"});
    for field in ["file_data", "file_id", "filename"] {
        if let Some(value) = file.get(field) {
            if !value.is_string() {
                return Err(format!("{path}.file.{field} must be a string"));
            }
            mapped[field] = value.clone();
        }
    }
    if mapped.get("file_data").is_none() && mapped.get("file_id").is_none() {
        return Err(format!(
            "{path}.file requires a non-empty file_data or file_id"
        ));
    }
    if ["file_data", "file_id"]
        .into_iter()
        .filter_map(|field| mapped.get(field))
        .any(|value| value.as_str().is_none_or(str::is_empty))
    {
        return Err(format!(
            "{path}.file requires a non-empty file_data or file_id"
        ));
    }
    copy_prompt_cache_breakpoint(part, &mut mapped);
    Ok(mapped)
}

fn checked_tool_calls(
    calls: Option<&Value>,
    path: &str,
    seen: &mut HashSet<String>,
) -> Result<Vec<Value>, String> {
    let Some(calls) = calls else {
        return Ok(Vec::new());
    };
    if calls.is_null() {
        return Ok(Vec::new());
    }
    let calls = calls
        .as_array()
        .ok_or_else(|| format!("{path}.tool_calls must be an array"))?;
    calls
        .iter()
        .enumerate()
        .map(|(index, call)| {
            let call_path = format!("{path}.tool_calls[{index}]");
            if call.get("type").and_then(Value::as_str) != Some("function") {
                return Err(format!("{call_path}.type must be function"));
            }
            let call_id = nonempty_string(call, "id")
                .ok_or_else(|| format!("{call_path}.id must be a non-empty string"))?;
            if !seen.insert(call_id.to_string()) {
                return Err(format!("{call_path}.id duplicates an earlier call id"));
            }
            let function = call
                .get("function")
                .and_then(Value::as_object)
                .ok_or_else(|| format!("{call_path}.function must be an object"))?;
            let name = function
                .get("name")
                .and_then(Value::as_str)
                .filter(|name| !name.is_empty())
                .ok_or_else(|| format!("{call_path}.function.name must be a non-empty string"))?;
            let arguments = function
                .get("arguments")
                .and_then(Value::as_str)
                .ok_or_else(|| format!("{call_path}.function.arguments must be a string"))?;
            serde_json::from_str::<Value>(arguments)
                .map_err(|_| format!("{call_path}.function.arguments must contain valid JSON"))?;
            Ok(json!({
                "type":"function_call",
                "call_id":call_id,
                "name":name,
                "arguments":arguments,
            }))
        })
        .collect()
}

fn tool_output(content: Option<&Value>, path: &str) -> Result<Value, String> {
    match content {
        Some(Value::String(output)) => Ok(Value::String(output.clone())),
        Some(Value::Array(parts)) => parts
            .iter()
            .enumerate()
            .map(|(index, part)| {
                if part.get("type").and_then(Value::as_str) != Some("text") {
                    return Err(format!("{path}.content[{index}] must be a text part"));
                }
                let text = part
                    .get("text")
                    .and_then(Value::as_str)
                    .ok_or_else(|| format!("{path}.content[{index}].text must be a string"))?;
                let mut mapped = part.clone();
                mapped["type"] = Value::String("input_text".into());
                mapped["text"] = Value::String(text.into());
                Ok(mapped)
            })
            .collect::<Result<Vec<_>, _>>()
            .map(Value::Array),
        _ => Err(format!("{path}.content must be a string or text array")),
    }
}

fn contains_prompt_cache_breakpoint(value: Option<&Value>) -> bool {
    match value {
        Some(Value::Object(object)) => object.iter().any(|(key, child)| {
            key == "prompt_cache_breakpoint" || contains_prompt_cache_breakpoint(Some(child))
        }),
        Some(Value::Array(values)) => values
            .iter()
            .any(|value| contains_prompt_cache_breakpoint(Some(value))),
        _ => false,
    }
}

fn copy_prompt_cache_breakpoint(source: &Value, target: &mut Value) {
    if let Some(breakpoint) = source.get("prompt_cache_breakpoint") {
        target["prompt_cache_breakpoint"] = breakpoint.clone();
    }
}

fn text_part(role: &str, text: &str) -> Value {
    json!({
        "type":if role == "assistant" { "output_text" } else { "input_text" },
        "text":text,
    })
}

fn nonempty_string<'a>(value: &'a Value, field: &str) -> Option<&'a str> {
    value
        .get(field)
        .and_then(Value::as_str)
        .filter(|text| !text.is_empty())
}

fn chat_tools_to_responses(tools: &Value) -> Value {
    let Value::Array(tools) = tools else {
        return tools.clone();
    };
    Value::Array(
        tools
            .iter()
            .map(|tool| {
                if tool.get("type").and_then(Value::as_str) != Some("function") {
                    return tool.clone();
                }
                let Some(function) = tool.get("function") else {
                    return tool.clone();
                };
                let mut mapped = json!({
                    "type":"function",
                    "name":function.get("name").cloned().unwrap_or(Value::Null),
                    "description":function.get("description").cloned().unwrap_or(Value::String(String::new())),
                    "parameters":function.get("parameters").cloned().unwrap_or_else(|| json!({})),
                });
                if let Some(strict) = function.get("strict") {
                    mapped["strict"] = strict.clone();
                }
                mapped
            })
            .collect(),
    )
}

fn chat_tool_choice_to_responses(choice: &Value) -> Value {
    let Some(function) = choice.get("function") else {
        return choice.clone();
    };
    json!({
        "type":"function",
        "name":function.get("name").cloned().unwrap_or(Value::Null),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn multimodal_refusal_and_tool_history_are_projected_losslessly() {
        let converted = try_chat_completion_to_responses(&json!({
            "model":"gpt-5",
            "messages":[
                {"role":"user","content":[
                    {"type":"text","text":"inspect"},
                    {"type":"image_url","image_url":{"url":"data:image/png;base64,AAA","detail":"high"}},
                    {"type":"file","file":{"file_id":"file_1","filename":"fixture.txt"}}
                ]},
                {"role":"assistant","content":[
                    {"type":"text","text":"checking"},
                    {"type":"refusal","refusal":"cannot inspect"}
                ],"tool_calls":[{
                    "id":"call_1","type":"function",
                    "function":{"name":"inspect","arguments":"{\"id\":1}"}
                }]},
                {"role":"tool","tool_call_id":"call_1","content":"done"}
            ]
        }))
        .unwrap();
        assert_eq!(
            converted["input"],
            json!([
                {"role":"user","content":[
                    {"type":"input_text","text":"inspect"},
                    {"type":"input_image","image_url":"data:image/png;base64,AAA","detail":"high"},
                    {"type":"input_file","file_id":"file_1","filename":"fixture.txt"}
                ]},
                {"role":"assistant","content":[
                    {"type":"output_text","text":"checking"},
                    {"type":"refusal","refusal":"cannot inspect"}
                ]},
                {"type":"function_call","call_id":"call_1","name":"inspect","arguments":"{\"id\":1}"},
                {"type":"function_call_output","call_id":"call_1","output":"done"}
            ])
        );
    }

    #[test]
    fn current_prompt_cache_breakpoints_preserve_parts_and_order() {
        let breakpoint = json!({"mode":"explicit"});
        let converted = try_chat_completion_to_responses(&json!({
            "model":"gpt-5",
            "messages":[
                {"role":"system","content":[{
                    "type":"text","text":"policy",
                    "prompt_cache_breakpoint":breakpoint
                }]},
                {"role":"developer","content":[{
                    "type":"text","text":"application",
                    "prompt_cache_breakpoint":breakpoint
                }]},
                {"role":"user","content":[
                    {"type":"image_url","image_url":{"url":"https://example.com/image.png"},
                     "prompt_cache_breakpoint":breakpoint},
                    {"type":"file","file":{"file_data":"data:application/pdf;base64,AAA","filename":"fixture.pdf"},
                     "prompt_cache_breakpoint":breakpoint}
                ]},
                {"role":"assistant","content":null,"tool_calls":[{
                    "id":"call_1","type":"function",
                    "function":{"name":"inspect","arguments":"{}"}
                }]},
                {"role":"tool","tool_call_id":"call_1","content":[{
                    "type":"text","text":"done"
                }]}
            ]
        }))
        .unwrap();

        assert_eq!(converted["input"][0]["role"], "system");
        assert_eq!(converted["input"][1]["role"], "developer");
        for pointer in [
            "/input/0/content/0/prompt_cache_breakpoint",
            "/input/1/content/0/prompt_cache_breakpoint",
            "/input/2/content/0/prompt_cache_breakpoint",
            "/input/2/content/1/prompt_cache_breakpoint",
        ] {
            assert_eq!(converted.pointer(pointer), Some(&breakpoint), "{pointer}");
        }
        assert!(converted["input"][4]["output"].is_array());

        let tool_output = try_chat_completion_to_responses(&json!({
            "model":"gpt-5",
            "messages":[
                {"role":"assistant","content":null,"tool_calls":[{
                    "id":"call_1","type":"function",
                    "function":{"name":"inspect","arguments":"{}"}
                }]},
                {"role":"tool","tool_call_id":"call_1","content":[{
                    "type":"text","text":"done",
                    "prompt_cache_breakpoint":breakpoint
                }]}
            ]
        }))
        .unwrap();
        assert_eq!(
            tool_output.pointer("/input/1/output/0/prompt_cache_breakpoint"),
            Some(&breakpoint)
        );
    }

    #[test]
    fn unrepresentable_or_malformed_history_is_rejected() {
        for message in [
            json!({"role":"user","content":[{"type":"input_audio","input_audio":{"data":"AAA","format":"wav"}}]}),
            json!({"role":"user","content":[{"type":"image_url","image_url":{}}]}),
            json!({"role":"user","content":[{"type":"file","file":{"filename":"only.txt"}}]}),
            json!({"role":"assistant","content":"prior","audio":{"id":"audio_1"}}),
            json!({"role":"assistant","content":null,"function_call":{"name":"legacy","arguments":"{}"}}),
            json!({"role":"function","name":"legacy","content":"result"}),
            json!({"role":"user","content":[{"type":"unknown","value":"x"}]}),
            json!({"role":"assistant","content":null,"tool_calls":[
                {"id":"call_1","type":"function","function":{"name":"one","arguments":"{}"}},
                {"id":"call_1","type":"function","function":{"name":"two","arguments":"{}"}}
            ]}),
        ] {
            let body = json!({"model":"gpt-5","messages":[message]});
            assert!(try_chat_completion_to_responses(&body).is_err(), "{body}");
        }
    }
}
