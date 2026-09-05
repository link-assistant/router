//! Lossless, fail-closed request translation for Gemini bridge routes.

use std::collections::HashMap;

use serde_json::{Map, Value, json};

#[path = "gemini_bridge_request_helpers.rs"]
mod helpers;
use helpers::{
    alias_string, decode_base64, parse_object, reject_image_detail, reject_non_completed_status,
    reject_unknown_fields, required_nonempty_string, required_string, required_value_string,
    take_explicit_call, take_unambiguous_call, validate_http_url, validate_image_media,
};

#[must_use]
pub fn chat_to_gemini_request(body: &Value) -> Value {
    chat_to_gemini_request_checked(body)
        .unwrap_or_else(|message| json!({"error": {"message": message}}))
}

pub fn chat_to_gemini_request_checked(body: &Value) -> Result<Value, String> {
    reject_unknown_fields(
        body,
        &[
            "model",
            "messages",
            "max_completion_tokens",
            "max_tokens",
            "temperature",
            "top_p",
            "stop",
            "stream",
            "tools",
            "tool_choice",
        ],
        "request",
    )?;
    if body
        .get("max_completion_tokens")
        .is_some_and(|v| !v.is_null())
        && body.get("max_tokens").is_some_and(|v| !v.is_null())
    {
        return Err("max_completion_tokens and max_tokens cannot both be set".into());
    }
    let messages = body
        .get("messages")
        .and_then(Value::as_array)
        .ok_or_else(|| "messages must be an array".to_string())?;
    let mut contents = Vec::new();
    let mut system_parts = Vec::new();
    let mut calls = HashMap::<String, String>::new();

    for (index, message) in messages.iter().enumerate() {
        let path = format!("messages[{index}]");
        let role = required_string(message, "role", &path)?;
        let allowed = match role {
            "system" | "developer" | "user" => &["role", "content", "name"][..],
            "assistant" => &["role", "content", "name", "tool_calls"][..],
            "tool" => &["role", "content", "tool_call_id"][..],
            _ => &["role", "content"][..],
        };
        reject_unknown_fields(message, allowed, &path)?;
        if message
            .get("name")
            .and_then(Value::as_str)
            .is_some_and(|name| !name.is_empty())
        {
            return Err(format!("{path}.name cannot be represented by Gemini"));
        }
        match role {
            "system" | "developer" => {
                system_parts.extend(chat_content_parts(message.get("content"), role, &path)?);
            }
            "user" => contents.push(json!({
                "role": "user",
                "parts": chat_content_parts(message.get("content"), role, &path)?,
            })),
            "assistant" => {
                let mut parts = chat_content_parts(message.get("content"), role, &path)?;
                let tool_calls = match message.get("tool_calls") {
                    None | Some(Value::Null) => &[][..],
                    Some(Value::Array(calls)) => calls.as_slice(),
                    Some(_) => return Err(format!("{path}.tool_calls must be an array")),
                };
                for (call_index, call) in tool_calls.iter().enumerate() {
                    let call_path = format!("{path}.tool_calls[{call_index}]");
                    if call.get("type").and_then(Value::as_str) != Some("function") {
                        return Err(format!("{call_path} must have type function"));
                    }
                    let id = required_nonempty_string(call, "id", &call_path)?;
                    let function = call
                        .get("function")
                        .ok_or_else(|| format!("{call_path}.function is required"))?;
                    let name = required_nonempty_string(function, "name", &call_path)?;
                    let arguments = required_string(function, "arguments", &call_path)?;
                    let arguments = parse_object(arguments, &format!("{call_path}.arguments"))?;
                    if calls.insert(id.to_string(), name.to_string()).is_some() {
                        return Err(format!("{call_path}.id duplicates an earlier tool call"));
                    }
                    parts.push(json!({
                        "functionCall": {"id": id, "name": name, "args": arguments}
                    }));
                }
                contents.push(json!({"role": "model", "parts": parts}));
            }
            "tool" => {
                let id = required_nonempty_string(message, "tool_call_id", &path)?;
                let name = calls
                    .remove(id)
                    .ok_or_else(|| format!("{path}.tool_call_id has no preceding tool call"))?;
                let response = tool_response(message.get("content"), &path)?;
                contents.push(json!({
                    "role": "user",
                    "parts": [{"functionResponse": {
                        "id": id, "name": name, "response": response
                    }}]
                }));
            }
            _ => {
                return Err(format!(
                    "{path}.role {role} cannot be represented by Gemini"
                ));
            }
        }
    }

    let mut request = json!({"contents": contents});
    if !system_parts.is_empty() {
        request["systemInstruction"] = json!({"parts": system_parts});
    }
    let generation = generation_config(body)?;
    if !generation.is_empty() {
        request["generationConfig"] = Value::Object(generation);
    }
    if let Some(tools) = chat_tools_to_gemini(body.get("tools"))? {
        request["tools"] = tools;
    }
    if let Some(config) = chat_tool_choice_to_gemini(body.get("tool_choice"))? {
        request["toolConfig"] = config;
    }
    Ok(request)
}

pub fn responses_to_chat_checked(body: &Value) -> Result<Value, String> {
    reject_unknown_fields(
        body,
        &[
            "model",
            "input",
            "instructions",
            "max_output_tokens",
            "temperature",
            "top_p",
            "stream",
            "tools",
            "tool_choice",
            "previous_response_id",
            "conversation",
        ],
        "request",
    )?;
    for field in ["previous_response_id", "conversation"] {
        if body.get(field).is_some_and(|value| !value.is_null()) {
            return Err(format!("{field} cannot be resolved by a Gemini bridge"));
        }
    }
    let mut messages = Vec::new();
    if let Some(instructions) = body.get("instructions") {
        messages.push(json!({
            "role": "system",
            "content": required_value_string(instructions, "instructions")?,
        }));
    }
    match body.get("input") {
        Some(Value::String(text)) => messages.push(json!({"role": "user", "content": text})),
        Some(Value::Array(items)) => {
            for (index, item) in items.iter().enumerate() {
                let path = format!("input[{index}]");
                if let Some(text) = item.as_str() {
                    messages.push(json!({"role": "user", "content": text}));
                    continue;
                }
                if let Some(role) = item.get("role").and_then(Value::as_str) {
                    reject_unknown_fields(item, &["type", "role", "content"], &path)?;
                    if item.get("type").is_some_and(|kind| kind != "message") {
                        return Err(format!("{path}.type must be message"));
                    }
                    messages.push(json!({
                        "role": role,
                        "content": responses_content_to_chat(
                            item.get("content"), role, &path
                        )?,
                    }));
                    continue;
                }
                match item.get("type").and_then(Value::as_str) {
                    Some("function_call") => {
                        reject_unknown_fields(
                            item,
                            &["type", "id", "call_id", "name", "arguments", "status"],
                            &path,
                        )?;
                        reject_non_completed_status(item.get("status"), &path)?;
                        let id = item
                            .get("call_id")
                            .or_else(|| item.get("id"))
                            .and_then(Value::as_str)
                            .filter(|value| !value.is_empty())
                            .ok_or_else(|| format!("{path}.call_id is required"))?;
                        let name = required_nonempty_string(item, "name", &path)?;
                        let arguments = required_string(item, "arguments", &path)?;
                        parse_object(arguments, &format!("{path}.arguments"))?;
                        messages.push(json!({
                            "role": "assistant",
                            "content": null,
                            "tool_calls": [{
                                "id": id,
                                "type": "function",
                                "function": {"name": name, "arguments": arguments}
                            }]
                        }));
                    }
                    Some("function_call_output") => {
                        reject_unknown_fields(item, &["type", "call_id", "output"], &path)?;
                        messages.push(json!({
                            "role": "tool",
                            "tool_call_id": required_nonempty_string(item, "call_id", &path)?,
                            "content": responses_tool_output(item.get("output"), &path)?,
                        }));
                    }
                    Some(kind) => {
                        return Err(format!(
                            "{path} item type {kind} cannot be represented by Gemini"
                        ));
                    }
                    None => return Err(format!("{path} is missing a string type or role")),
                }
            }
        }
        _ => return Err("input must be a string or array".into()),
    }
    let mut chat = json!({"messages": messages});
    for (responses_key, chat_key) in [
        ("model", "model"),
        ("max_output_tokens", "max_tokens"),
        ("temperature", "temperature"),
        ("top_p", "top_p"),
        ("stream", "stream"),
    ] {
        if let Some(value) = body.get(responses_key) {
            chat[chat_key] = value.clone();
        }
    }
    if let Some(tools) = responses_tools_to_chat(body.get("tools"))? {
        chat["tools"] = tools;
    }
    if let Some(choice) = responses_tool_choice_to_chat(body.get("tool_choice"))? {
        chat["tool_choice"] = choice;
    }
    Ok(chat)
}

#[must_use]
pub fn gemini_request_to_chat(model: &str, request: &Value) -> Value {
    gemini_request_to_chat_checked(model, request)
        .unwrap_or_else(|message| json!({"error": {"message": message}}))
}

pub fn gemini_request_to_chat_checked(model: &str, request: &Value) -> Result<Value, String> {
    reject_unknown_fields(
        request,
        &[
            "contents",
            "systemInstruction",
            "system_instruction",
            "generationConfig",
            "tools",
            "toolConfig",
        ],
        "request",
    )?;
    let mut messages = Vec::new();
    if let Some(instruction) = request
        .get("systemInstruction")
        .or_else(|| request.get("system_instruction"))
    {
        let parts = gemini_parts(instruction, "systemInstruction", "system", &mut Vec::new())?;
        messages.push(json!({"role": "system", "content": chat_content(parts.parts)}));
    }
    let contents = request
        .get("contents")
        .and_then(Value::as_array)
        .ok_or_else(|| "contents must be an array".to_string())?;
    let mut pending = Vec::<(String, String)>::new();
    for (index, content) in contents.iter().enumerate() {
        let path = format!("contents[{index}]");
        let role = content
            .get("role")
            .and_then(Value::as_str)
            .unwrap_or("user");
        let chat_role = match role {
            "user" => "user",
            "model" => "assistant",
            _ => {
                return Err(format!(
                    "{path}.role {role} cannot be represented by OpenAI"
                ));
            }
        };
        let translated = gemini_parts(content, &path, chat_role, &mut pending)?;
        for result in translated.tool_results {
            messages.push(result);
        }
        if !translated.parts.is_empty() || !translated.tool_calls.is_empty() {
            let mut message = json!({
                "role": chat_role,
                "content": chat_content(translated.parts),
            });
            if !translated.tool_calls.is_empty() {
                message["tool_calls"] = Value::Array(translated.tool_calls);
            }
            messages.push(message);
        }
    }
    let mut chat = json!({"model": model, "messages": messages});
    if let Some(config) = request.get("generationConfig") {
        reject_unknown_fields(
            config,
            &[
                "maxOutputTokens",
                "temperature",
                "topP",
                "stopSequences",
                "topK",
                "thinkingConfig",
            ],
            "generationConfig",
        )?;
        validate_gemini_cli_defaults(config)?;
        for (gemini_key, chat_key) in [
            ("maxOutputTokens", "max_tokens"),
            ("temperature", "temperature"),
            ("topP", "top_p"),
            ("stopSequences", "stop"),
        ] {
            if let Some(value) = config.get(gemini_key) {
                chat[chat_key] = value.clone();
            }
        }
    }
    if let Some(tools) = gemini_tools_to_chat(request.get("tools"))? {
        chat["tools"] = tools;
    }
    if let Some(choice) = gemini_tool_choice_to_chat(request.get("toolConfig"))? {
        chat["tool_choice"] = choice;
    }
    Ok(chat)
}

#[derive(Default)]
struct TranslatedParts {
    parts: Vec<Value>,
    tool_calls: Vec<Value>,
    tool_results: Vec<Value>,
}

fn gemini_parts(
    content: &Value,
    path: &str,
    role: &str,
    pending: &mut Vec<(String, String)>,
) -> Result<TranslatedParts, String> {
    reject_unknown_fields(content, &["role", "parts"], path)?;
    let parts = content
        .get("parts")
        .and_then(Value::as_array)
        .ok_or_else(|| format!("{path}.parts must be an array"))?;
    let mut translated = TranslatedParts::default();
    let mut saw_non_result = false;
    for (index, part) in parts.iter().enumerate() {
        let part_path = format!("{path}.parts[{index}]");
        if let Some(text) = part.get("text") {
            reject_unknown_fields(part, &["text"], &part_path)?;
            saw_non_result = true;
            translated.parts.push(json!({
                "type": "text",
                "text": required_value_string(text, &format!("{part_path}.text"))?,
            }));
        } else if let Some(inline) = part.get("inlineData").or_else(|| part.get("inline_data")) {
            let key = if part.get("inlineData").is_some() {
                "inlineData"
            } else {
                "inline_data"
            };
            reject_unknown_fields(part, &[key], &part_path)?;
            saw_non_result = true;
            if role != "user" {
                return Err(format!(
                    "{part_path} image is only supported in a user turn"
                ));
            }
            translated
                .parts
                .push(inline_image_to_chat(inline, &part_path)?);
        } else if let Some(file) = part.get("fileData").or_else(|| part.get("file_data")) {
            let key = if part.get("fileData").is_some() {
                "fileData"
            } else {
                "file_data"
            };
            reject_unknown_fields(part, &[key], &part_path)?;
            saw_non_result = true;
            if role != "user" {
                return Err(format!(
                    "{part_path} image is only supported in a user turn"
                ));
            }
            translated.parts.push(file_image_to_chat(file, &part_path)?);
        } else if let Some(call) = part.get("functionCall") {
            reject_unknown_fields(part, &["functionCall"], &part_path)?;
            reject_unknown_fields(
                call,
                &["id", "name", "args"],
                &format!("{part_path}.functionCall"),
            )?;
            saw_non_result = true;
            if role != "assistant" {
                return Err(format!("{part_path}.functionCall requires the model role"));
            }
            let name = required_nonempty_string(call, "name", &part_path)?;
            let args = call.get("args").cloned().unwrap_or_else(|| json!({}));
            if !args.is_object() {
                return Err(format!("{part_path}.functionCall.args must be an object"));
            }
            let id = call
                .get("id")
                .and_then(Value::as_str)
                .filter(|value| !value.is_empty())
                .map_or_else(|| format!("call_{}", uuid::Uuid::new_v4()), str::to_string);
            pending.push((name.to_string(), id.clone()));
            translated.tool_calls.push(json!({
                "id": id,
                "type": "function",
                "function": {"name": name, "arguments": args.to_string()}
            }));
        } else if let Some(response) = part.get("functionResponse") {
            reject_unknown_fields(part, &["functionResponse"], &part_path)?;
            reject_unknown_fields(
                response,
                &["id", "name", "response"],
                &format!("{part_path}.functionResponse"),
            )?;
            if role != "user" {
                return Err(format!(
                    "{part_path}.functionResponse requires the user role"
                ));
            }
            if saw_non_result {
                return Err(format!(
                    "{part_path}.functionResponse must precede follow-up content"
                ));
            }
            let name = required_nonempty_string(response, "name", &part_path)?;
            let id = match response
                .get("id")
                .and_then(Value::as_str)
                .filter(|value| !value.is_empty())
            {
                Some(id) => take_explicit_call(pending, id, name, &part_path)?,
                None => take_unambiguous_call(pending, name, &part_path)?,
            };
            let value = response
                .get("response")
                .ok_or_else(|| format!("{part_path}.functionResponse.response is required"))?;
            translated.tool_results.push(json!({
                "role": "tool", "tool_call_id": id, "content": value.to_string()
            }));
        } else {
            return Err(format!("{part_path} has an unsupported Gemini part type"));
        }
    }
    Ok(translated)
}

fn chat_content_parts(
    content: Option<&Value>,
    role: &str,
    path: &str,
) -> Result<Vec<Value>, String> {
    match content {
        None | Some(Value::Null) if role == "assistant" => Ok(Vec::new()),
        Some(Value::String(text)) => Ok(vec![json!({"text": text})]),
        Some(Value::Array(parts)) => parts
            .iter()
            .enumerate()
            .map(|(index, part)| {
                chat_part_to_gemini(part, role, &format!("{path}.content[{index}]"))
            })
            .collect(),
        _ => Err(format!("{path}.content must be a string or array")),
    }
}

fn chat_part_to_gemini(part: &Value, role: &str, path: &str) -> Result<Value, String> {
    match part.get("type").and_then(Value::as_str) {
        Some("text" | "input_text" | "output_text") => {
            reject_unknown_fields(part, &["type", "text"], path)?;
            Ok(json!({"text": required_string(part, "text", path)?}))
        }
        Some("image_url" | "input_image") if role == "user" => {
            let url = if part.get("type").and_then(Value::as_str) == Some("image_url") {
                reject_unknown_fields(part, &["type", "image_url"], path)?;
                let image = part
                    .get("image_url")
                    .ok_or_else(|| format!("{path}.image_url is required"))?;
                reject_unknown_fields(image, &["url", "detail"], &format!("{path}.image_url"))?;
                reject_image_detail(image.get("detail"), path)?;
                required_string(image, "url", &format!("{path}.image_url"))?
            } else {
                reject_unknown_fields(part, &["type", "image_url", "file_id", "detail"], path)?;
                reject_image_detail(part.get("detail"), path)?;
                if part.get("file_id").is_some_and(|value| !value.is_null()) {
                    return Err(format!("{path}.file_id is provider-specific"));
                }
                required_string(part, "image_url", path)?
            };
            image_url_to_gemini(url, path)
        }
        Some(kind) => Err(format!(
            "{path} content type {kind} cannot be represented by Gemini"
        )),
        None => Err(format!("{path} is missing a string type")),
    }
}

fn image_url_to_gemini(url: &str, path: &str) -> Result<Value, String> {
    if url.starts_with("data:") {
        let (media, data) = parse_image_data_url(url, path)?;
        Ok(json!({"inlineData": {"mimeType": media, "data": data}}))
    } else {
        validate_http_url(url, path)?;
        Ok(json!({"fileData": {"fileUri": url}}))
    }
}

fn inline_image_to_chat(inline: &Value, path: &str) -> Result<Value, String> {
    reject_unknown_fields(inline, &["mimeType", "mime_type", "data"], path)?;
    let media = alias_string(inline, "mimeType", "mime_type", path)?;
    validate_image_media(media, path)?;
    let data = required_nonempty_string(inline, "data", path)?;
    decode_base64(data).map_err(|_| format!("{path}.data must be valid base64"))?;
    Ok(json!({
        "type": "image_url",
        "image_url": {"url": format!("data:{media};base64,{data}")}
    }))
}

fn file_image_to_chat(file: &Value, path: &str) -> Result<Value, String> {
    reject_unknown_fields(
        file,
        &["mimeType", "mime_type", "fileUri", "file_uri"],
        path,
    )?;
    if let Some(media) = file
        .get("mimeType")
        .or_else(|| file.get("mime_type"))
        .and_then(Value::as_str)
    {
        validate_image_media(media, path)?;
    }
    let uri = alias_string(file, "fileUri", "file_uri", path)?;
    validate_http_url(uri, path)?;
    Ok(json!({"type": "image_url", "image_url": {"url": uri}}))
}

fn chat_content(parts: Vec<Value>) -> Value {
    if parts.len() == 1 && parts[0].get("type").and_then(Value::as_str) == Some("text") {
        return parts[0]["text"].clone();
    }
    Value::Array(parts)
}

fn generation_config(body: &Value) -> Result<Map<String, Value>, String> {
    let mut config = Map::new();
    for (chat_key, gemini_key) in [
        ("max_completion_tokens", "maxOutputTokens"),
        ("temperature", "temperature"),
        ("top_p", "topP"),
    ] {
        if let Some(value) = body.get(chat_key) {
            config.insert(gemini_key.into(), value.clone());
        }
    }
    if !config.contains_key("maxOutputTokens")
        && let Some(value) = body.get("max_tokens")
    {
        config.insert("maxOutputTokens".into(), value.clone());
    }
    if let Some(stop) = body.get("stop") {
        config.insert(
            "stopSequences".into(),
            match stop {
                Value::String(_) => Value::Array(vec![stop.clone()]),
                Value::Array(_) => stop.clone(),
                _ => return Err("stop must be a string or array".into()),
            },
        );
    }
    Ok(config)
}

fn validate_gemini_cli_defaults(config: &Value) -> Result<(), String> {
    if config.get("topK").is_some_and(|value| value != 64) {
        return Err("generationConfig.topK has no exact cross-provider representation".into());
    }
    if let Some(thinking) = config.get("thinkingConfig") {
        reject_unknown_fields(
            thinking,
            &["includeThoughts"],
            "generationConfig.thinkingConfig",
        )?;
        if thinking.get("includeThoughts") != Some(&Value::Bool(true)) {
            return Err(
                "generationConfig.thinkingConfig has no exact cross-provider representation".into(),
            );
        }
    }
    Ok(())
}

fn chat_tools_to_gemini(tools: Option<&Value>) -> Result<Option<Value>, String> {
    let Some(tools) = tools else { return Ok(None) };
    let tools = tools
        .as_array()
        .ok_or_else(|| "tools must be an array".to_string())?;
    let mut declarations = Vec::new();
    for (index, tool) in tools.iter().enumerate() {
        let path = format!("tools[{index}]");
        reject_unknown_fields(tool, &["type", "function"], &path)?;
        if tool.get("type").and_then(Value::as_str) != Some("function") {
            return Err(format!("{path} must have type function"));
        }
        let function = tool
            .get("function")
            .ok_or_else(|| format!("{path}.function is required"))?;
        reject_unknown_fields(
            function,
            &["name", "description", "parameters", "strict"],
            &format!("{path}.function"),
        )?;
        if function
            .get("strict")
            .is_some_and(|value| !value.is_null() && value.as_bool() != Some(false))
        {
            return Err(format!(
                "{path}.function.strict cannot be represented by Gemini"
            ));
        }
        declarations.push(function_declaration(function, &path)?);
    }
    Ok((!declarations.is_empty()).then(|| json!([{"functionDeclarations": declarations}])))
}

fn responses_tools_to_chat(tools: Option<&Value>) -> Result<Option<Value>, String> {
    let Some(tools) = tools else { return Ok(None) };
    let tools = tools
        .as_array()
        .ok_or_else(|| "tools must be an array".to_string())?;
    let mut translated = Vec::new();
    for (index, tool) in tools.iter().enumerate() {
        let path = format!("tools[{index}]");
        reject_unknown_fields(
            tool,
            &["type", "name", "description", "parameters", "strict"],
            &path,
        )?;
        if tool.get("type").and_then(Value::as_str) != Some("function") {
            return Err(format!("{path} must have type function"));
        }
        let mut function = Map::new();
        for key in ["name", "description", "parameters", "strict"] {
            if let Some(value) = tool.get(key) {
                function.insert(key.into(), value.clone());
            }
        }
        translated.push(json!({"type": "function", "function": function}));
    }
    Ok(Some(Value::Array(translated)))
}

fn gemini_tools_to_chat(tools: Option<&Value>) -> Result<Option<Value>, String> {
    let Some(tools) = tools else { return Ok(None) };
    let entries = tools
        .as_array()
        .ok_or_else(|| "tools must be an array".to_string())?;
    let mut translated = Vec::new();
    for (index, entry) in entries.iter().enumerate() {
        let path = format!("tools[{index}]");
        let declaration_key = if entry.get("functionDeclarations").is_some() {
            "functionDeclarations"
        } else {
            "function_declarations"
        };
        reject_unknown_fields(entry, &[declaration_key], &path)?;
        let declarations = entry
            .get("functionDeclarations")
            .or_else(|| entry.get("function_declarations"))
            .and_then(Value::as_array)
            .ok_or_else(|| format!("{path} has an unsupported Gemini tool type"))?;
        for (declaration_index, declaration) in declarations.iter().enumerate() {
            reject_unknown_fields(
                declaration,
                &["name", "description", "parameters", "parametersJsonSchema"],
                &format!("{path}.{declaration_key}[{declaration_index}]"),
            )?;
            let mut function = Map::new();
            for (source, target) in [
                ("name", "name"),
                ("description", "description"),
                ("parameters", "parameters"),
                ("parametersJsonSchema", "parameters"),
            ] {
                if let Some(value) = declaration.get(source) {
                    function.insert(target.into(), value.clone());
                }
            }
            translated.push(json!({"type": "function", "function": function}));
        }
    }
    Ok(Some(Value::Array(translated)))
}

fn function_declaration(function: &Value, path: &str) -> Result<Value, String> {
    let mut declaration = Map::new();
    declaration.insert(
        "name".into(),
        Value::String(required_nonempty_string(function, "name", path)?.into()),
    );
    for key in ["description", "parameters"] {
        if let Some(value) = function.get(key) {
            declaration.insert(key.into(), value.clone());
        }
    }
    Ok(Value::Object(declaration))
}

fn chat_tool_choice_to_gemini(choice: Option<&Value>) -> Result<Option<Value>, String> {
    let Some(choice) = choice else {
        return Ok(None);
    };
    let (mode, allowed) = match choice {
        Value::String(value) => match value.as_str() {
            "auto" => ("AUTO", None),
            "none" => ("NONE", None),
            "required" => ("ANY", None),
            _ => return Err(format!("unsupported tool_choice policy: {value}")),
        },
        Value::Object(object) if object.get("type").and_then(Value::as_str) == Some("function") => {
            reject_unknown_fields(choice, &["type", "function"], "tool_choice")?;
            let function = object
                .get("function")
                .ok_or_else(|| "tool_choice.function is required".to_string())?;
            reject_unknown_fields(function, &["name"], "tool_choice.function")?;
            let name = object
                .get("function")
                .and_then(|value| value.get("name"))
                .and_then(Value::as_str)
                .filter(|value| !value.is_empty())
                .ok_or_else(|| "tool_choice.function.name is required".to_string())?;
            ("ANY", Some(json!([name])))
        }
        _ => return Err("tool_choice cannot be represented by Gemini".into()),
    };
    let mut config = json!({"functionCallingConfig": {"mode": mode}});
    if let Some(allowed) = allowed {
        config["functionCallingConfig"]["allowedFunctionNames"] = allowed;
    }
    Ok(Some(config))
}

fn responses_tool_choice_to_chat(choice: Option<&Value>) -> Result<Option<Value>, String> {
    let Some(choice) = choice else {
        return Ok(None);
    };
    if choice.is_string() {
        return Ok(Some(choice.clone()));
    }
    if choice.get("type").and_then(Value::as_str) == Some("function") {
        reject_unknown_fields(choice, &["type", "name"], "tool_choice")?;
        return Ok(Some(json!({
            "type": "function",
            "function": {"name": required_nonempty_string(choice, "name", "tool_choice")?}
        })));
    }
    Err("tool_choice cannot be represented by Gemini".into())
}

fn gemini_tool_choice_to_chat(config: Option<&Value>) -> Result<Option<Value>, String> {
    let Some(config) = config else {
        return Ok(None);
    };
    reject_unknown_fields(
        config,
        &["functionCallingConfig", "function_calling_config"],
        "toolConfig",
    )?;
    let calling = config
        .get("functionCallingConfig")
        .or_else(|| config.get("function_calling_config"))
        .ok_or_else(|| "toolConfig.functionCallingConfig is required".to_string())?;
    reject_unknown_fields(
        calling,
        &["mode", "allowedFunctionNames", "allowed_function_names"],
        "toolConfig.functionCallingConfig",
    )?;
    let mode = required_nonempty_string(calling, "mode", "toolConfig")?.to_ascii_uppercase();
    let allowed = calling
        .get("allowedFunctionNames")
        .or_else(|| calling.get("allowed_function_names"));
    match (mode.as_str(), allowed) {
        ("AUTO", None) => Ok(Some(json!("auto"))),
        ("NONE", None) => Ok(Some(json!("none"))),
        ("ANY", None) => Ok(Some(json!("required"))),
        ("ANY", Some(Value::Array(names))) if names.len() == 1 => Ok(Some(json!({
            "type": "function",
            "function": {"name": names[0].as_str().ok_or_else(|| {
                "toolConfig.allowedFunctionNames must contain strings".to_string()
            })?}
        }))),
        _ => Err("toolConfig function-calling policy cannot be represented exactly".into()),
    }
}

fn responses_content_to_chat(
    content: Option<&Value>,
    role: &str,
    path: &str,
) -> Result<Value, String> {
    match content {
        Some(Value::String(text)) => Ok(Value::String(text.clone())),
        Some(Value::Array(parts)) => parts
            .iter()
            .enumerate()
            .map(|(index, part)| {
                let path = format!("{path}.content[{index}]");
                match part.get("type").and_then(Value::as_str) {
                    Some("input_text" | "output_text" | "text") => {
                        reject_unknown_fields(part, &["type", "text"], &path)?;
                        Ok(json!({
                            "type": "text", "text": required_string(part, "text", &path)?
                        }))
                    }
                    Some("input_image") if role == "user" => {
                        reject_unknown_fields(
                            part,
                            &["type", "image_url", "file_id", "detail"],
                            &path,
                        )?;
                        if part.get("file_id").is_some_and(|value| !value.is_null()) {
                            return Err(format!("{path}.file_id is provider-specific"));
                        }
                        reject_image_detail(part.get("detail"), &path)?;
                        Ok(json!({
                            "type": "image_url",
                            "image_url": {"url": required_nonempty_string(
                                part, "image_url", &path
                            )?}
                        }))
                    }
                    Some(kind) => Err(format!(
                        "{path} content type {kind} cannot be represented by Gemini"
                    )),
                    None => Err(format!("{path} is missing a string type")),
                }
            })
            .collect::<Result<Vec<_>, _>>()
            .map(Value::Array),
        _ => Err(format!("{path}.content must be a string or array")),
    }
}

fn responses_tool_output(output: Option<&Value>, path: &str) -> Result<Value, String> {
    match output {
        Some(Value::String(text)) => Ok(Value::String(text.clone())),
        Some(Value::Array(parts)) => {
            let mut text = String::new();
            for (index, part) in parts.iter().enumerate() {
                reject_unknown_fields(part, &["type", "text"], &format!("{path}.output[{index}]"))?;
                if part.get("type").and_then(Value::as_str) != Some("input_text") {
                    return Err(format!(
                        "{path}.output[{index}] cannot be represented in a Gemini function response"
                    ));
                }
                text.push_str(required_string(part, "text", path)?);
            }
            Ok(Value::String(text))
        }
        _ => Err(format!(
            "{path}.output must be a string or input_text array"
        )),
    }
}

fn tool_response(content: Option<&Value>, path: &str) -> Result<Value, String> {
    let text = match content {
        Some(Value::String(text)) => text.clone(),
        Some(Value::Array(parts)) => {
            let mut text = String::new();
            for (index, part) in parts.iter().enumerate() {
                reject_unknown_fields(
                    part,
                    &["type", "text"],
                    &format!("{path}.content[{index}]"),
                )?;
                if part.get("type").and_then(Value::as_str) != Some("text") {
                    return Err(format!("{path}.content[{index}] is not a text tool result"));
                }
                text.push_str(required_string(part, "text", path)?);
            }
            text
        }
        _ => return Err(format!("{path}.content must be text")),
    };
    Ok(serde_json::from_str(&text)
        .ok()
        .filter(Value::is_object)
        .unwrap_or_else(|| json!({"output": text})))
}

fn parse_image_data_url<'a>(url: &'a str, path: &str) -> Result<(&'a str, &'a str), String> {
    let encoded = url
        .strip_prefix("data:")
        .ok_or_else(|| format!("{path} must be a data URL"))?;
    let (media, data) = encoded
        .split_once(";base64,")
        .ok_or_else(|| format!("{path} must be a base64 data URL"))?;
    validate_image_media(media, path)?;
    if data.is_empty() || decode_base64(data).is_err() {
        return Err(format!("{path} contains invalid base64 image data"));
    }
    Ok((media, data))
}

#[cfg(test)]
#[path = "gemini_bridge_request_tests.rs"]
mod tests;
