use serde_json::{Value, json};

pub fn system_text(system: &Value) -> Option<String> {
    match system {
        Value::String(text) if !text.is_empty() => Some(text.clone()),
        Value::Array(blocks) => {
            let text = blocks
                .iter()
                .filter_map(|block| block.get("text").and_then(Value::as_str))
                .collect::<Vec<_>>()
                .join("\n\n");
            (!text.is_empty()).then_some(text)
        }
        _ => None,
    }
}

pub(super) fn translate_tools(tools: &[Value]) -> Vec<Value> {
    tools
        .iter()
        .map(|tool| {
            if tool
                .get("type")
                .and_then(Value::as_str)
                .is_some_and(|kind| kind.starts_with("web_search_"))
            {
                return json!({"type": "web_search"});
            }
            if tool
                .get("type")
                .and_then(Value::as_str)
                .is_some_and(|kind| kind.starts_with("web_fetch_"))
            {
                return json!({"type": "web_fetch"});
            }
            let mut mapped = json!({
                "type": "function",
                "function": {
                    "name": tool.get("name").and_then(Value::as_str).unwrap_or_default(),
                    "description": tool.get("description").cloned()
                        .unwrap_or(Value::String(String::new())),
                    "parameters": tool.get("input_schema").cloned()
                        .unwrap_or_else(|| json!({"type": "object", "properties": {}})),
                }
            });
            if let Some(strict) = tool.get("strict") {
                mapped["function"]["strict"] = strict.clone();
            }
            mapped
        })
        .collect()
}

pub(super) fn translate_tool_choice(choice: &Value) -> Option<Value> {
    match choice.get("type").and_then(Value::as_str)? {
        "auto" => Some(json!("auto")),
        "any" => Some(json!("required")),
        "none" => Some(json!("none")),
        "tool" => Some(json!({
            "type": "function",
            "function": {"name": choice.get("name").and_then(Value::as_str)?},
        })),
        _ => None,
    }
}

pub(super) fn anthropic_effort(body: &Value) -> Result<Option<&'static str>, String> {
    let effort = match body.get("output_config") {
        None | Some(Value::Null) => None,
        Some(config) => {
            let config = config
                .as_object()
                .ok_or_else(|| "output_config must be an object".to_string())?;
            match config.get("effort") {
                None | Some(Value::Null) => None,
                Some(effort) => {
                    let effort = effort
                        .as_str()
                        .ok_or_else(|| "output_config.effort must be a string".to_string())?;
                    Some(match effort {
                        "low" => "low",
                        "medium" => "medium",
                        "high" => "high",
                        "max" => "xhigh",
                        _ => return Err(format!("unsupported output_config.effort: {effort}")),
                    })
                }
            }
        }
    };
    if let Some(thinking) = body.get("thinking").filter(|value| !value.is_null()) {
        if effort.is_none() {
            return Err(
                "thinking without output_config.effort has no lossless Responses representation"
                    .into(),
            );
        }
        if thinking.get("type").and_then(Value::as_str) != Some("adaptive") {
            return Err("only adaptive thinking can accompany translated effort".into());
        }
    }
    Ok(effort)
}
