//! Execution-control validation for stateless Responses-to-Anthropic bridges.

use serde_json::Value;

const CHAT_FIELDS: &[&str] = &[
    "model",
    "messages",
    "max_tokens",
    "max_completion_tokens",
    "temperature",
    "top_p",
    "frequency_penalty",
    "presence_penalty",
    "logit_bias",
    "seed",
    "stream",
    "stream_options",
    "stop",
    "tools",
    "tool_choice",
    "reasoning_effort",
    "reasoning",
    "response_format",
    "parallel_tool_calls",
    "n",
    "modalities",
    "audio",
    "logprobs",
    "top_logprobs",
    "safety_identifier",
    "service_tier",
    "prompt_cache_key",
    "prompt_cache_options",
    "prompt_cache_retention",
    "moderation",
    "user",
];

const RESPONSE_FIELDS: &[&str] = &[
    "model",
    "input",
    "instructions",
    "max_output_tokens",
    "temperature",
    "top_p",
    "stream",
    "tools",
    "tool_choice",
    "reasoning",
    "text",
    "parallel_tool_calls",
    "background",
    "max_tool_calls",
    "truncation",
    "store",
    "stream_options",
    "safety_identifier",
    "previous_response_id",
    "conversation",
    "service_tier",
    "prompt_cache_key",
    "prompt_cache_options",
    "prompt_cache_retention",
    "moderation",
    "metadata",
    "include",
];

#[must_use]
pub fn unknown_chat_field(body: &Value) -> Option<String> {
    unknown_field(body, CHAT_FIELDS)
}

#[must_use]
pub fn unknown_responses_field(body: &Value) -> Option<String> {
    unknown_field(body, RESPONSE_FIELDS)
}

fn unknown_field(body: &Value, known: &[&str]) -> Option<String> {
    let object = body.as_object()?;
    object
        .keys()
        .find(|field| !known.contains(&field.as_str()))
        .map(|field| format!("unsupported translated request field: {field}"))
}

pub fn reject_anthropic_provider_controls(body: &Value) -> Result<(), String> {
    const FIELDS: &[&str] = &[
        "model",
        "max_tokens",
        "messages",
        "system",
        "metadata",
        "stop_sequences",
        "stream",
        "temperature",
        "top_p",
        "top_k",
        "tools",
        "tool_choice",
        "thinking",
        "output_config",
        "service_tier",
        "speed",
        "inference_geo",
        "context_management",
        "container",
        "mcp_servers",
        "betas",
    ];
    if let Some(reason) = unknown_field(body, FIELDS) {
        return Err(reason);
    }
    reject_nonempty_object(body, "context_management")?;
    reject_nonempty_object(body, "container")?;
    match body.get("mcp_servers") {
        None | Some(Value::Null) => {}
        Some(Value::Array(value)) if value.is_empty() => {}
        Some(_) => return Err("mcp_servers cannot be represented by the selected provider".into()),
    }
    for field in ["service_tier", "speed", "inference_geo"] {
        if body.get(field).is_some_and(|value| !value.is_null()) {
            return Err(format!(
                "{field} cannot be represented by the selected provider"
            ));
        }
    }
    Ok(())
}

fn reject_nonempty_object(body: &Value, field: &str) -> Result<(), String> {
    match body.get(field) {
        None | Some(Value::Null) => Ok(()),
        Some(Value::Object(value)) if value.is_empty() => Ok(()),
        Some(_) => Err(format!(
            "{field} cannot be represented by the selected provider"
        )),
    }
}

#[must_use]
pub fn untranslatable_chat_participant_name(body: &Value) -> Option<String> {
    for (index, message) in body
        .get("messages")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .enumerate()
    {
        if !matches!(
            message.get("role").and_then(Value::as_str),
            Some("system" | "developer" | "user")
        ) {
            continue;
        }
        match message.get("name") {
            None | Some(Value::Null) => {}
            Some(Value::String(name)) if name.is_empty() => {}
            Some(Value::String(_)) => {
                return Some(format!(
                    "messages[{index}].message.name cannot be represented by the selected provider"
                ));
            }
            Some(_) => {
                return Some(format!("messages[{index}].message.name must be a string"));
            }
        }
    }
    None
}

/// Return why an `OpenAI` service tier cannot cross a non-OpenAI bridge.
#[must_use]
pub fn untranslatable_openai_service_tier(value: Option<&Value>) -> Option<String> {
    match value {
        None | Some(Value::Null) => None,
        Some(Value::String(tier)) if matches!(tier.as_str(), "auto" | "default") => None,
        Some(Value::String(_)) => {
            Some("the requested service_tier cannot be represented by the selected provider".into())
        }
        Some(_) => Some("service_tier must be a string".into()),
    }
}

#[must_use]
pub fn untranslatable_moderation(value: Option<&Value>) -> Option<String> {
    value
        .filter(|value| !value.is_null())
        .map(|_| "moderation cannot be represented by the selected provider".into())
}

pub fn validate_openai_prompt_cache(body: &Value, anthropic_target: bool) -> Result<(), String> {
    for field in ["prompt_cache_key", "prompt_cache_retention"] {
        if body.get(field).is_some_and(|value| !value.is_null()) {
            return Err(format!(
                "{field} cannot be represented by the selected provider"
            ));
        }
    }
    if let Some(options) = body
        .get("prompt_cache_options")
        .filter(|value| !value.is_null())
    {
        if !anthropic_target {
            return Err(
                "prompt_cache_options cannot be represented by the selected provider".into(),
            );
        }
        let object = options
            .as_object()
            .ok_or_else(|| "prompt_cache_options must be an object".to_string())?;
        if !object.is_empty()
            && (object.len() != 1 || object.get("mode").and_then(Value::as_str) != Some("explicit"))
        {
            return Err(
                "only prompt_cache_options mode=explicit without TTL can be represented by Anthropic"
                    .into(),
            );
        }
    }
    let mut breakpoints = Vec::new();
    collect_named_values(body, "prompt_cache_breakpoint", &mut breakpoints);
    if breakpoints.len() > 4 {
        return Err("Anthropic supports at most four prompt cache breakpoints".into());
    }
    for breakpoint in breakpoints {
        if !anthropic_target {
            return Err(
                "prompt_cache_breakpoint cannot be represented by the selected provider".into(),
            );
        }
        let Some(object) = breakpoint.as_object() else {
            return Err("prompt_cache_breakpoint must be an object".into());
        };
        if object.len() != 1 || object.get("type").and_then(Value::as_str) != Some("default") {
            return Err("only prompt_cache_breakpoint type=default is supported".into());
        }
    }
    Ok(())
}

fn collect_named_values<'a>(value: &'a Value, name: &str, found: &mut Vec<&'a Value>) {
    match value {
        Value::Object(object) => {
            for (key, child) in object {
                if key == name {
                    found.push(child);
                } else {
                    collect_named_values(child, name, found);
                }
            }
        }
        Value::Array(array) => {
            for child in array {
                collect_named_values(child, name, found);
            }
        }
        _ => {}
    }
}

pub fn validate_responses(request: &crate::responses::OpenAIResponseRequest) -> Result<(), String> {
    crate::safety_identifier::validate_openai(request.safety_identifier.as_deref())?;
    if request
        .top_p
        .is_some_and(|top_p| !(0.0..=1.0).contains(&top_p))
    {
        return Err("top_p must be between 0 and 1".into());
    }
    if request.temperature.is_some() && request.top_p.is_some() {
        return Err("temperature and top_p cannot both be represented by Anthropic".into());
    }
    if request.background == Some(true) {
        return Err(
            "background responses cannot be created through an Anthropic bridge; use a synchronous request"
                .into(),
        );
    }
    if request.store == Some(true) {
        return Err(
            "stored responses cannot be created through an Anthropic bridge; use store=false"
                .into(),
        );
    }
    if request
        .truncation
        .as_ref()
        .filter(|value| !value.is_null())
        .is_some_and(|value| value.as_str() != Some("disabled"))
    {
        return Err("only truncation=disabled can be represented by an Anthropic bridge".into());
    }
    if request
        .stream_options
        .as_ref()
        .filter(|value| !value.is_null())
        .is_some_and(|value| value.as_object().is_none_or(|options| !options.is_empty()))
    {
        return Err("non-empty stream_options cannot be represented by an Anthropic bridge".into());
    }
    if let Some(limit) = request.max_tool_calls {
        if limit == 0 {
            return Err("max_tool_calls must be greater than zero".into());
        }
        let server_tools = request
            .tools
            .as_ref()
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
            .filter(|tool| {
                matches!(
                    tool.get("type").and_then(Value::as_str),
                    Some("web_search" | "web_fetch")
                )
            })
            .count();
        if server_tools > 1 {
            return Err(
                "max_tool_calls cannot be enforced losslessly across multiple server tools".into(),
            );
        }
    }
    Ok(())
}

pub fn install_max_tool_calls(body: &mut Value, limit: Option<u32>) {
    let Some(limit) = limit else {
        return;
    };
    let Some(tools) = body.get_mut("tools").and_then(Value::as_array_mut) else {
        return;
    };
    let mut server_tools = tools.iter_mut().filter(|tool| {
        tool.get("type")
            .and_then(Value::as_str)
            .is_some_and(|kind| kind.starts_with("web_search_") || kind.starts_with("web_fetch_"))
    });
    if let Some(tool) = server_tools.next()
        && server_tools.next().is_none()
    {
        tool["max_uses"] = Value::from(limit);
    }
}
