//! Fail-closed request translation between `Anthropic` and `OpenAI` dialects.

use base64::Engine as _;
use serde_json::{Value, json};

#[path = "bridge_request_tools.rs"]
mod tools;
pub use tools::system_text;
use tools::{anthropic_effort, translate_tool_choice, translate_tools};

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum BridgeTarget {
    Responses,
    Chat,
    Gemini,
}

/// Translate an `Anthropic` Messages request to `OpenAI` Chat Completions.
#[must_use]
pub fn anthropic_to_chat_request(body: &Value, upstream_model: &str) -> Value {
    let mut messages = Vec::new();
    if let Some(system) = body.get("system").and_then(system_text) {
        messages.push(json!({"role": "system", "content": system}));
    }
    for message in body
        .get("messages")
        .and_then(Value::as_array)
        .map(Vec::as_slice)
        .unwrap_or_default()
    {
        let role = message
            .get("role")
            .and_then(Value::as_str)
            .unwrap_or("user");
        match message.get("content").unwrap_or(&Value::Null) {
            Value::String(text) => messages.push(json!({"role": role, "content": text})),
            Value::Array(blocks) => translate_chat_blocks(role, blocks, &mut messages),
            _ => {}
        }
    }

    let mut out = json!({
        "model": upstream_model,
        "messages": messages,
        "max_tokens": body
            .get("max_tokens")
            .and_then(Value::as_u64)
            .unwrap_or(crate::anthropic_bridge::DEFAULT_MAX_TOKENS),
    });
    for key in ["temperature", "top_p"] {
        if let Some(value) = body.get(key) {
            out[key] = value.clone();
        }
    }
    if body.get("stream").and_then(Value::as_bool) == Some(true) {
        out["stream"] = Value::Bool(true);
    }
    if let Some(stops) = body.get("stop_sequences") {
        out["stop"] = stops.clone();
    }
    if let Some(tools) = body.get("tools").and_then(Value::as_array) {
        let mapped = translate_tools(tools);
        if !mapped.is_empty() {
            out["tools"] = Value::Array(mapped);
        }
    }
    if let Some(choice) = body.get("tool_choice").and_then(translate_tool_choice) {
        out["tool_choice"] = choice;
    }
    if let Ok(Some(effort)) = anthropic_effort(body) {
        out["reasoning_effort"] = Value::String(effort.into());
    }
    if let Ok(Some(identifier)) = crate::safety_identifier::anthropic_user_id(body) {
        out["safety_identifier"] = Value::String(identifier.into());
    }
    out
}

/// Translate an `Anthropic` request directly to Responses input.
pub fn anthropic_to_responses_request(body: &Value, upstream_model: &str) -> Result<Value, String> {
    validate_anthropic_request(body, BridgeTarget::Responses)?;
    let mut skeleton = body.clone();
    skeleton["messages"] = Value::Array(Vec::new());
    let chat = anthropic_to_chat_request(&skeleton, upstream_model);
    let mut out = crate::responses::chat_completion_to_responses(&chat);
    out["input"] = Value::Array(anthropic_messages_to_responses(body)?);
    Ok(out)
}

/// Validate every Anthropic history block for a translated target.
pub fn validate_anthropic_request(body: &Value, target: BridgeTarget) -> Result<(), String> {
    anthropic_effort(body)?;
    crate::safety_identifier::anthropic_user_id(body)?;
    crate::bridge_controls::reject_anthropic_provider_controls(body)?;
    if let Some(system) = body.get("system") {
        match system {
            Value::String(_) => {}
            Value::Array(blocks) => {
                for (index, block) in blocks.iter().enumerate() {
                    if block.get("type").and_then(Value::as_str) != Some("text")
                        || block.get("text").and_then(Value::as_str).is_none()
                    {
                        return Err(format!(
                            "system[{index}] cannot be represented by the selected provider"
                        ));
                    }
                }
            }
            _ => return Err("system must be a string or an array of text blocks".into()),
        }
    }
    let Some(messages) = body.get("messages").and_then(Value::as_array) else {
        return Err("messages must be an array".into());
    };
    for (message_index, message) in messages.iter().enumerate() {
        let Some(role) = message.get("role").and_then(Value::as_str) else {
            return Err(format!(
                "messages[{message_index}] is missing a string role"
            ));
        };
        if !matches!(role, "user" | "assistant") {
            return Err(format!(
                "messages[{message_index}] has unsupported role {role}"
            ));
        }
        match message.get("content") {
            Some(Value::String(_)) => {}
            Some(Value::Array(blocks)) => {
                let mut saw_follow_up = false;
                for (block_index, block) in blocks.iter().enumerate() {
                    let path = format!("messages[{message_index}].content[{block_index}]");
                    let kind = block
                        .get("type")
                        .and_then(Value::as_str)
                        .ok_or_else(|| format!("{path} is missing a string type"))?;
                    if kind == "tool_result" && saw_follow_up {
                        return Err(format!(
                            "{path} must precede follow-up text, image, or document content"
                        ));
                    }
                    if kind != "tool_result" {
                        saw_follow_up = true;
                    }
                    validate_anthropic_block(block, role, target, &path)?;
                }
            }
            _ => {
                return Err(format!(
                    "messages[{message_index}].content must be a string or array"
                ));
            }
        }
    }
    Ok(())
}

/// Return why a Responses history cannot cross into `Anthropic`.
#[must_use]
pub fn untranslatable_response_history(input: &Value) -> Option<String> {
    let items = match input {
        Value::String(_) => return None,
        Value::Array(items) => items,
        _ => return Some("input must be a string or array".into()),
    };
    for (index, item) in items.iter().enumerate() {
        if item.is_string() {
            continue;
        }
        let path = format!("input[{index}]");
        if let Some(role) = item.get("role").and_then(Value::as_str) {
            if !matches!(role, "system" | "developer" | "user" | "assistant") {
                return Some(format!("{path} has unsupported role {role}"));
            }
            let content = item.get("content").unwrap_or(&Value::Null);
            if let Err(reason) = responses_message_content_to_anthropic(content, role, &path) {
                return Some(reason);
            }
            continue;
        }
        match item.get("type").and_then(Value::as_str) {
            Some("function_call") => {
                if item
                    .get("call_id")
                    .or_else(|| item.get("id"))
                    .and_then(Value::as_str)
                    .is_none_or(str::is_empty)
                {
                    return Some(format!("{path} function_call is missing call_id"));
                }
                if nonempty(item, "name").is_none() {
                    return Some(format!("{path} function_call is missing name"));
                }
                let Some(arguments) = item.get("arguments").and_then(Value::as_str) else {
                    return Some(format!("{path} function_call is missing string arguments"));
                };
                if serde_json::from_str::<Value>(arguments)
                    .ok()
                    .is_none_or(|arguments| !arguments.is_object())
                {
                    return Some(format!(
                        "{path} function_call arguments must encode a JSON object"
                    ));
                }
            }
            Some("function_call_output") => {
                if nonempty(item, "call_id").is_none() {
                    return Some(format!("{path} function_call_output is missing call_id"));
                }
                if let Err(reason) =
                    responses_output_to_anthropic(item.get("output"), &format!("{path}.output"))
                {
                    return Some(reason);
                }
            }
            Some("reasoning") => {
                return Some(format!(
                    "{path} reasoning history is provider-specific; start a provider-compatible continuation"
                ));
            }
            Some("custom_tool_call" | "custom_tool_call_output") => {
                return Some(format!(
                    "{path} custom tool history is provider-specific; start a provider-compatible continuation"
                ));
            }
            Some(kind) => {
                return Some(format!(
                    "{path} item type {kind} cannot be represented by Anthropic"
                ));
            }
            None => return Some(format!("{path} is missing a string type or role")),
        }
    }
    None
}

/// Reject server-side Responses continuation handles on a stateless bridge.
#[must_use]
pub fn untranslatable_responses_state(body: &Value) -> Option<String> {
    let previous = body
        .get("previous_response_id")
        .is_some_and(|value| !value.is_null());
    let conversation = body
        .get("conversation")
        .is_some_and(|value| !value.is_null());
    match (previous, conversation) {
        (true, true) => Some(
            "previous_response_id and conversation are mutually exclusive and cannot be resolved by an Anthropic bridge; send self-contained input"
                .into(),
        ),
        (true, false) => Some(
            "previous_response_id cannot be resolved by an Anthropic bridge; send self-contained input"
                .into(),
        ),
        (false, true) => Some(
            "conversation cannot be resolved by an Anthropic bridge; send self-contained input"
                .into(),
        ),
        (false, false) => None,
    }
}

pub fn responses_message_content_to_anthropic(
    content: &Value,
    role: &str,
    path: &str,
) -> Result<Value, String> {
    match content {
        Value::String(text) => Ok(Value::String(text.clone())),
        Value::Array(parts) => parts
            .iter()
            .enumerate()
            .map(|(index, part)| {
                let part_path = format!("{path}.content[{index}]");
                match part.get("type").and_then(Value::as_str) {
                    Some("text" | "input_text" | "output_text") => {
                        let mut block = json!({
                            "type": "text",
                            "text": require_string(part, "text", &part_path)?,
                        });
                        if part.get("prompt_cache_breakpoint").is_some() {
                            block["cache_control"] = json!({"type": "ephemeral"});
                        }
                        Ok(block)
                    }
                    Some("input_image") if role == "user" => {
                        responses_image_to_anthropic(part, &part_path)
                    }
                    Some("input_file") if role == "user" => {
                        responses_file_to_anthropic(part, &part_path)
                    }
                    Some(kind) => Err(format!(
                        "{part_path} type {kind} cannot be represented for role {role}"
                    )),
                    None => Err(format!("{part_path} is missing a string type")),
                }
            })
            .collect::<Result<Vec<_>, _>>()
            .map(Value::Array),
        _ => Err(format!("{path}.content must be a string or array")),
    }
}

fn validate_anthropic_block(
    block: &Value,
    role: &str,
    target: BridgeTarget,
    path: &str,
) -> Result<(), String> {
    match block
        .get("type")
        .and_then(Value::as_str)
        .unwrap_or_default()
    {
        "text" => {
            require_string(block, "text", path)?;
        }
        "image" => {
            if role != "user" {
                return Err(format!("{path} image is only representable in a user turn"));
            }
            match target {
                BridgeTarget::Responses => {
                    image_to_responses(block, path)?;
                }
                BridgeTarget::Chat => {
                    image_to_chat(block, path)?;
                }
                BridgeTarget::Gemini => {
                    return Err(format!(
                        "{path} image cannot be represented by the selected provider"
                    ));
                }
            }
        }
        "document" => {
            if role != "user" {
                return Err(format!(
                    "{path} document is only representable in a user turn"
                ));
            }
            match target {
                BridgeTarget::Responses => {
                    document_to_responses(block, path)?;
                }
                BridgeTarget::Chat => {
                    document_to_chat(block, path)?;
                }
                BridgeTarget::Gemini => {
                    return Err(format!(
                        "{path} document cannot be represented by the selected provider"
                    ));
                }
            }
        }
        "tool_use" => {
            if role != "assistant" {
                return Err(format!("{path} tool_use must have the assistant role"));
            }
            require_nonempty_string(block, "id", path)?;
            require_nonempty_string(block, "name", path)?;
            if !block.get("input").is_some_and(Value::is_object) {
                return Err(format!("{path}.input must be an object"));
            }
        }
        "tool_result" => {
            if role != "user" {
                return Err(format!("{path} tool_result must have the user role"));
            }
            require_nonempty_string(block, "tool_use_id", path)?;
            if block.get("is_error").and_then(Value::as_bool) == Some(true) {
                return Err(format!(
                    "{path}.is_error=true cannot be represented by the selected provider"
                ));
            }
            match target {
                BridgeTarget::Responses => {
                    anthropic_tool_result_to_responses(block.get("content"), path)?;
                }
                BridgeTarget::Chat | BridgeTarget::Gemini => {
                    tool_result_to_chat(block.get("content"), path)?;
                }
            }
        }
        "server_tool_use" => {
            if role != "assistant" {
                return Err(format!(
                    "{path} server_tool_use must have the assistant role"
                ));
            }
            if target != BridgeTarget::Responses {
                return Err(format!(
                    "{path} server-tool history cannot be represented by the selected provider"
                ));
            }
            require_nonempty_string(block, "id", path)?;
            let name = require_nonempty_string(block, "name", path)?;
            if !matches!(name, "web_search" | "web_fetch") {
                return Err(format!("{path} has unsupported server tool name {name}"));
            }
            if !block.get("input").is_some_and(Value::is_object) {
                return Err(format!("{path}.input must be an object"));
            }
        }
        "web_search_tool_result" | "web_fetch_tool_result" => {
            if role != "assistant" {
                return Err(format!(
                    "{path} server-tool result must have the assistant role"
                ));
            }
            if target != BridgeTarget::Responses {
                return Err(format!(
                    "{path} server-tool result cannot be represented by the selected provider"
                ));
            }
            require_nonempty_string(block, "tool_use_id", path)?;
            if block.get("content").is_none_or(Value::is_null) {
                return Err(format!("{path}.content is required"));
            }
        }
        "thinking" | "redacted_thinking" => {
            return Err(format!(
                "{path} contains Anthropic thinking history that the selected provider cannot continue"
            ));
        }
        kind => {
            return Err(format!(
                "{path} block type {kind} cannot be represented by the selected provider"
            ));
        }
    }
    Ok(())
}

/// Map one Responses `function_call_output.output` to Anthropic content.
pub fn responses_output_to_anthropic(output: Option<&Value>, path: &str) -> Result<Value, String> {
    match output {
        Some(Value::String(text)) => Ok(Value::String(text.clone())),
        Some(Value::Array(parts)) => parts
            .iter()
            .enumerate()
            .map(|(index, part)| {
                responses_output_part_to_anthropic(part, &format!("{path}[{index}]"))
            })
            .collect::<Result<Vec<_>, _>>()
            .map(Value::Array),
        Some(_) => Err(format!("{path} must be a string or array")),
        None => Err(format!("{path} is required")),
    }
}

fn responses_output_part_to_anthropic(part: &Value, path: &str) -> Result<Value, String> {
    match part.get("type").and_then(Value::as_str) {
        Some("input_text") => Ok(json!({
            "type": "text",
            "text": require_string(part, "text", path)?,
        })),
        Some("input_image") => responses_image_to_anthropic(part, path),
        Some("input_file") => responses_file_to_anthropic(part, path),
        Some(kind) => Err(format!("{path} has unsupported output type {kind}")),
        None => Err(format!("{path} is missing a string type")),
    }
}

fn responses_image_to_anthropic(part: &Value, path: &str) -> Result<Value, String> {
    validate_default_detail(part, path)?;
    let image_url = nonempty(part, "image_url");
    let file_id = nonempty(part, "file_id");
    if usize::from(image_url.is_some()) + usize::from(file_id.is_some()) != 1 {
        return Err(format!(
            "{path} must contain exactly one non-empty image_url or file_id"
        ));
    }
    if file_id.is_some() {
        return Err(format!(
            "{path}.file_id belongs to the OpenAI provider and cannot be used by Anthropic"
        ));
    }
    let source = {
        let url = image_url.expect("one source was checked");
        if url.starts_with("data:") {
            let (media_type, data) = parse_data_url(url, path)?;
            if !matches!(
                media_type,
                "image/jpeg" | "image/png" | "image/gif" | "image/webp"
            ) {
                return Err(format!(
                    "{path} has unsupported image media type {media_type}"
                ));
            }
            json!({"type": "base64", "media_type": media_type, "data": data})
        } else {
            let parsed = url::Url::parse(url)
                .map_err(|_| format!("{path}.image_url must be an absolute URL"))?;
            if !matches!(parsed.scheme(), "http" | "https") {
                return Err(format!("{path}.image_url must use HTTP or HTTPS"));
            }
            json!({"type": "url", "url": url})
        }
    };
    Ok(json!({"type": "image", "source": source}))
}

fn responses_file_to_anthropic(part: &Value, path: &str) -> Result<Value, String> {
    validate_default_detail(part, path)?;
    let file_data = nonempty(part, "file_data");
    let file_id = nonempty(part, "file_id");
    let file_url = nonempty(part, "file_url");
    if [file_data, file_id, file_url].iter().flatten().count() != 1 {
        return Err(format!(
            "{path} must contain exactly one non-empty file_data, file_id, or file_url"
        ));
    }
    if file_id.is_some() {
        return Err(format!(
            "{path}.file_id belongs to the OpenAI provider and cannot be used by Anthropic"
        ));
    }
    let source = if let Some(file_url) = file_url {
        let parsed = url::Url::parse(file_url)
            .map_err(|_| format!("{path}.file_url must be an absolute URL"))?;
        if !parsed.path().to_ascii_lowercase().ends_with(".pdf") {
            return Err(format!(
                "{path}.file_url is not a PDF URL supported by Anthropic"
            ));
        }
        json!({"type": "url", "url": file_url})
    } else {
        let data_url = file_data.expect("one source was checked");
        let (media_type, data) = parse_data_url(data_url, path)?;
        match media_type {
            "application/pdf" => {
                json!({"type": "base64", "media_type": media_type, "data": data})
            }
            "text/plain" => {
                let bytes = base64::engine::general_purpose::STANDARD
                    .decode(data)
                    .map_err(|error| format!("{path}.file_data is invalid base64: {error}"))?;
                let text = String::from_utf8(bytes)
                    .map_err(|_| format!("{path}.file_data is not UTF-8 plain text"))?;
                json!({"type": "text", "media_type": media_type, "data": text})
            }
            _ => {
                return Err(format!(
                    "{path} has unsupported file media type {media_type}"
                ));
            }
        }
    };
    let mut document = json!({"type": "document", "source": source});
    if let Some(filename) = nonempty(part, "filename") {
        document["title"] = Value::String(filename.to_string());
    }
    Ok(document)
}

fn anthropic_tool_result_to_responses(
    content: Option<&Value>,
    path: &str,
) -> Result<Value, String> {
    match content {
        None => Ok(Value::String(String::new())),
        Some(Value::String(text)) => Ok(Value::String(text.clone())),
        Some(Value::Array(blocks)) => blocks
            .iter()
            .enumerate()
            .map(|(index, block)| {
                let part_path = format!("{path}.content[{index}]");
                match block.get("type").and_then(Value::as_str) {
                    Some("text") => Ok(json!({
                        "type": "input_text",
                        "text": require_string(block, "text", &part_path)?,
                    })),
                    Some("image") => image_to_responses(block, &part_path),
                    Some("document") => document_to_responses(block, &part_path),
                    Some(kind) => Err(format!(
                        "{part_path} block type {kind} cannot be represented in Responses output"
                    )),
                    None => Err(format!("{part_path} is missing a string type")),
                }
            })
            .collect::<Result<Vec<_>, _>>()
            .map(Value::Array),
        Some(_) => Err(format!("{path}.content must be a string or array")),
    }
}

fn image_to_responses(block: &Value, path: &str) -> Result<Value, String> {
    reject_present(block, &["transformations"], path)?;
    let source = block
        .get("source")
        .ok_or_else(|| format!("{path}.source is required"))?;
    match source.get("type").and_then(Value::as_str) {
        Some("url") => Ok(json!({
            "type": "input_image",
            "image_url": require_nonempty_string(source, "url", &format!("{path}.source"))?,
        })),
        Some("base64") => {
            let media = require_nonempty_string(source, "media_type", &format!("{path}.source"))?;
            if !matches!(
                media,
                "image/jpeg" | "image/png" | "image/gif" | "image/webp"
            ) {
                return Err(format!(
                    "{path}.source has unsupported image media type {media}"
                ));
            }
            let data = require_nonempty_string(source, "data", &format!("{path}.source"))?;
            Ok(json!({
                "type": "input_image",
                "image_url": format!("data:{media};base64,{data}"),
            }))
        }
        Some("file") => Ok(json!({
            "type": "input_image",
            "file_id": require_nonempty_string(source, "file_id", &format!("{path}.source"))?,
        })),
        Some(kind) => Err(format!("{path}.source type {kind} is unsupported")),
        None => Err(format!("{path}.source is missing a string type")),
    }
}

fn document_to_responses(block: &Value, path: &str) -> Result<Value, String> {
    reject_present(block, &["context", "citations"], path)?;
    let source = block
        .get("source")
        .ok_or_else(|| format!("{path}.source is required"))?;
    let mut file = match source.get("type").and_then(Value::as_str) {
        Some("base64") => {
            let media = require_nonempty_string(source, "media_type", &format!("{path}.source"))?;
            if media != "application/pdf" {
                return Err(format!(
                    "{path}.source has unsupported document media type {media}"
                ));
            }
            let data = require_nonempty_string(source, "data", &format!("{path}.source"))?;
            json!({"type": "input_file", "file_data": format!("data:{media};base64,{data}")})
        }
        Some("url") => {
            let url = require_nonempty_string(source, "url", &format!("{path}.source"))?;
            let parsed = url::Url::parse(url)
                .map_err(|_| format!("{path}.source.url must be an absolute URL"))?;
            if !matches!(parsed.scheme(), "http" | "https")
                || !parsed.path().to_ascii_lowercase().ends_with(".pdf")
            {
                return Err(format!("{path}.source.url must be an HTTP(S) PDF URL"));
            }
            json!({"type": "input_file", "file_url": url})
        }
        Some("text") => {
            let media = require_nonempty_string(source, "media_type", &format!("{path}.source"))?;
            if media != "text/plain" {
                return Err(format!(
                    "{path}.source has unsupported document media type {media}"
                ));
            }
            let data = require_string(source, "data", &format!("{path}.source"))?;
            let encoded = base64::engine::general_purpose::STANDARD.encode(data.as_bytes());
            json!({"type": "input_file", "file_data": format!("data:text/plain;base64,{encoded}")})
        }
        Some("file") => json!({
            "type": "input_file",
            "file_id": require_nonempty_string(source, "file_id", &format!("{path}.source"))?,
        }),
        Some("content") => {
            return Err(format!(
                "{path}.source type content has no lossless Responses input_file representation"
            ));
        }
        Some(kind) => return Err(format!("{path}.source type {kind} is unsupported")),
        None => return Err(format!("{path}.source is missing a string type")),
    };
    if let Some(title) = nonempty(block, "title") {
        file["filename"] = Value::String(title.to_string());
    }
    Ok(file)
}

fn image_to_chat(block: &Value, path: &str) -> Result<Value, String> {
    let image = image_to_responses(block, path)?;
    let Some(url) = image.get("image_url") else {
        return Err(format!(
            "{path} file-backed image cannot be represented in Chat Completions"
        ));
    };
    Ok(json!({"type": "image_url", "image_url": {"url": url}}))
}

fn document_to_chat(block: &Value, path: &str) -> Result<Value, String> {
    let file = document_to_responses(block, path)?;
    if file.get("file_url").is_some() {
        return Err(format!(
            "{path} URL document cannot be represented in Chat Completions"
        ));
    }
    let mut nested = serde_json::Map::new();
    for key in ["file_data", "file_id", "filename"] {
        if let Some(value) = file.get(key) {
            nested.insert(key.to_string(), value.clone());
        }
    }
    Ok(json!({"type": "file", "file": nested}))
}

fn tool_result_to_chat(content: Option<&Value>, path: &str) -> Result<Value, String> {
    match content {
        None => Ok(Value::String(String::new())),
        Some(Value::String(text)) => Ok(Value::String(text.clone())),
        Some(Value::Array(blocks)) => blocks
            .iter()
            .enumerate()
            .map(|(index, block)| {
                let part_path = format!("{path}.content[{index}]");
                if block.get("type").and_then(Value::as_str) != Some("text") {
                    return Err(format!(
                        "{part_path} cannot be represented in a Chat tool message"
                    ));
                }
                Ok(json!({
                    "type": "text",
                    "text": require_string(block, "text", &part_path)?,
                }))
            })
            .collect::<Result<Vec<_>, _>>()
            .map(Value::Array),
        Some(_) => Err(format!("{path}.content must be a string or array")),
    }
}

fn anthropic_messages_to_responses(body: &Value) -> Result<Vec<Value>, String> {
    let mut input = Vec::new();
    for (message_index, message) in body["messages"]
        .as_array()
        .expect("validated messages array")
        .iter()
        .enumerate()
    {
        let role = message["role"].as_str().expect("validated role");
        match &message["content"] {
            Value::String(text) => {
                input.push(responses_message(role, &[text_part(role, text)]));
            }
            Value::Array(blocks) => {
                let mut parts = Vec::new();
                for (block_index, block) in blocks.iter().enumerate() {
                    let path = format!("messages[{message_index}].content[{block_index}]");
                    match block["type"].as_str().expect("validated block type") {
                        "text" => parts.push(text_part(
                            role,
                            block["text"].as_str().expect("validated text"),
                        )),
                        "image" => parts.push(image_to_responses(block, &path)?),
                        "document" => parts.push(document_to_responses(block, &path)?),
                        "tool_use" => {
                            flush_parts(&mut input, role, &mut parts);
                            input.push(json!({
                                "type": "function_call",
                                "call_id": block["id"].as_str().expect("validated id"),
                                "name": block["name"].as_str().expect("validated name"),
                                "arguments": serde_json::to_string(&block["input"])
                                    .expect("JSON value serializes"),
                            }));
                        }
                        "tool_result" => {
                            flush_parts(&mut input, role, &mut parts);
                            input.push(json!({
                                "type": "function_call_output",
                                "call_id": block["tool_use_id"]
                                    .as_str()
                                    .expect("validated tool_use_id"),
                                "output": anthropic_tool_result_to_responses(
                                    block.get("content"),
                                    &path,
                                )?,
                            }));
                        }
                        "server_tool_use" => {
                            flush_parts(&mut input, role, &mut parts);
                            let name = block["name"].as_str().expect("validated name");
                            input.push(json!({
                                "type": if name == "web_search" {
                                    "web_search_call"
                                } else {
                                    "web_fetch_call"
                                },
                                "id": block["id"].as_str().expect("validated id"),
                                "status": "completed",
                                "action": block["input"].clone(),
                            }));
                        }
                        result_kind @ ("web_search_tool_result" | "web_fetch_tool_result") => {
                            let call_kind = if result_kind == "web_search_tool_result" {
                                "web_search_call"
                            } else {
                                "web_fetch_call"
                            };
                            let tool_use_id = block["tool_use_id"]
                                .as_str()
                                .expect("validated tool_use_id");
                            let Some(call) = input.iter_mut().rev().find(|item| {
                                item.get("type").and_then(Value::as_str) == Some(call_kind)
                                    && item.get("id").and_then(Value::as_str) == Some(tool_use_id)
                            }) else {
                                return Err(format!(
                                    "{path} has no preceding matching server_tool_use"
                                ));
                            };
                            call["status"] = Value::String("completed".into());
                            call["result"] = block["content"].clone();
                        }
                        _ => unreachable!("validated unsupported block"),
                    }
                }
                flush_parts(&mut input, role, &mut parts);
                if blocks.is_empty() {
                    input.push(responses_message(role, &[]));
                }
            }
            _ => unreachable!("validated message content"),
        }
    }
    Ok(input)
}

fn text_part(role: &str, text: &str) -> Value {
    let kind = if role == "assistant" {
        "output_text"
    } else {
        "input_text"
    };
    json!({"type": kind, "text": text})
}

fn responses_message(role: &str, content: &[Value]) -> Value {
    json!({"role": role, "content": content})
}

fn flush_parts(input: &mut Vec<Value>, role: &str, parts: &mut Vec<Value>) {
    if !parts.is_empty() {
        input.push(responses_message(role, parts));
        parts.clear();
    }
}

fn translate_chat_blocks(role: &str, blocks: &[Value], messages: &mut Vec<Value>) {
    let mut text = String::new();
    let mut parts = Vec::new();
    let mut tool_calls = Vec::new();
    let mut tool_results = Vec::new();
    for (index, block) in blocks.iter().enumerate() {
        let path = format!("content[{index}]");
        match block
            .get("type")
            .and_then(Value::as_str)
            .unwrap_or_default()
        {
            "text" => {
                let value = block
                    .get("text")
                    .and_then(Value::as_str)
                    .unwrap_or_default();
                text.push_str(value);
                parts.push(json!({"type": "text", "text": value}));
            }
            "image" => {
                if let Ok(part) = image_to_chat(block, &path) {
                    parts.push(part);
                }
            }
            "document" => {
                if let Ok(part) = document_to_chat(block, &path) {
                    parts.push(part);
                }
            }
            "tool_use" => tool_calls.push(json!({
                "id": block.get("id").and_then(Value::as_str).unwrap_or_default(),
                "type": "function",
                "function": {
                    "name": block.get("name").and_then(Value::as_str).unwrap_or_default(),
                    "arguments": serde_json::to_string(
                        block.get("input").unwrap_or(&Value::Null)
                    ).unwrap_or_else(|_| "{}".into()),
                }
            })),
            "tool_result" => tool_results.push(json!({
                "role": "tool",
                "tool_call_id": block
                    .get("tool_use_id")
                    .and_then(Value::as_str)
                    .unwrap_or_default(),
                "content": tool_result_to_chat(block.get("content"), &path)
                    .unwrap_or(Value::Null),
            })),
            _ => {}
        }
    }

    // Anthropic requires tool results to lead the user turn.  OpenAI models
    // them as distinct messages, so emit every parallel result before the
    // follow-up user content while retaining their original order.
    messages.extend(tool_results);
    let complex_content = parts.iter().any(|part| part["type"] != "text");
    if !text.is_empty() || !tool_calls.is_empty() || complex_content || blocks.is_empty() {
        let content = if complex_content {
            Value::Array(parts)
        } else {
            Value::String(text)
        };
        let mut message = json!({"role": role, "content": content});
        if !tool_calls.is_empty() {
            message["tool_calls"] = Value::Array(tool_calls);
        }
        messages.push(message);
    }
}

fn validate_default_detail(part: &Value, path: &str) -> Result<(), String> {
    if part
        .get("detail")
        .filter(|value| !value.is_null())
        .and_then(Value::as_str)
        .is_some_and(|detail| detail != "auto")
    {
        return Err(format!(
            "{path}.detail cannot be represented by the selected Anthropic provider"
        ));
    }
    Ok(())
}

fn parse_data_url<'a>(url: &'a str, path: &str) -> Result<(&'a str, &'a str), String> {
    let Some(encoded) = url.strip_prefix("data:") else {
        return Err(format!("{path} must use a base64 data URL"));
    };
    let Some((media_type, data)) = encoded.split_once(";base64,") else {
        return Err(format!("{path} must use a base64 data URL"));
    };
    if media_type.is_empty() || data.is_empty() {
        return Err(format!("{path} contains an empty data URL"));
    }
    Ok((media_type, data))
}

fn reject_present(block: &Value, keys: &[&str], path: &str) -> Result<(), String> {
    if let Some(key) = keys
        .iter()
        .find(|key| block.get(**key).is_some_and(|value| !value.is_null()))
    {
        return Err(format!(
            "{path}.{key} cannot be represented by the selected provider"
        ));
    }
    Ok(())
}

fn nonempty<'a>(value: &'a Value, key: &str) -> Option<&'a str> {
    value
        .get(key)
        .and_then(Value::as_str)
        .filter(|text| !text.is_empty())
}

fn require_string<'a>(value: &'a Value, key: &str, path: &str) -> Result<&'a str, String> {
    value
        .get(key)
        .and_then(Value::as_str)
        .ok_or_else(|| format!("{path}.{key} must be a string"))
}

fn require_nonempty_string<'a>(value: &'a Value, key: &str, path: &str) -> Result<&'a str, String> {
    nonempty(value, key).ok_or_else(|| format!("{path}.{key} must be a non-empty string"))
}
