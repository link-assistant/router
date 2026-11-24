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
