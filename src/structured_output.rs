//! Structured-output validation shared by OpenAI-to-Anthropic bridges.

use serde_json::{Value, json};

pub fn chat_format(value: Option<&Value>) -> Result<Option<Value>, String> {
    let Some(value) = value else {
        return Ok(None);
    };
    let kind = required_type(value, "response_format")?;
    match kind {
        "text" => Ok(None),
        "json_object" => Ok(Some(generic_object_format())),
        "json_schema" => {
            let definition = value
                .get("json_schema")
                .and_then(Value::as_object)
                .ok_or_else(|| "response_format.json_schema must be an object".to_string())?;
            validate_name_and_strict(
                definition.get("name"),
                definition.get("strict"),
                "response_format.json_schema",
            )?;
            schema_format(
                definition.get("schema"),
                "response_format.json_schema.schema",
            )
            .map(Some)
        }
        other => Err(format!("unsupported response_format type: {other}")),
    }
}

pub fn responses_format(text: Option<&Value>) -> Result<Option<Value>, String> {
    let Some(text) = text else {
        return Ok(None);
    };
    let object = text
        .as_object()
        .ok_or_else(|| "text must be an object".to_string())?;
    let Some(format) = object.get("format").filter(|value| !value.is_null()) else {
        return Ok(None);
    };
    let kind = required_type(format, "text.format")?;
    match kind {
        "text" => Ok(None),
        "json_object" => Ok(Some(generic_object_format())),
        "json_schema" => {
            validate_name_and_strict(format.get("name"), format.get("strict"), "text.format")?;
            schema_format(format.get("schema"), "text.format.schema").map(Some)
        }
        other => Err(format!("unsupported text.format type: {other}")),
    }
}

pub fn install_format(body: &mut Value, format: Option<Value>) {
    if let Some(format) = format {
        if !body.get("output_config").is_some_and(Value::is_object) {
            body["output_config"] = json!({});
        }
        body["output_config"]["format"] = format;
    }
}

pub fn install_parallel_tool_policy(
    body: &mut Value,
    parallel_tool_calls: Option<bool>,
    has_tools: bool,
) {
    if parallel_tool_calls != Some(false) || !has_tools {
        return;
    }
    if !body.get("tool_choice").is_some_and(Value::is_object) {
        body["tool_choice"] = json!({"type": "auto"});
    }
    body["tool_choice"]["disable_parallel_tool_use"] = Value::Bool(true);
}

pub fn unsupported_chat_output_contract(
    request: &crate::openai::OpenAIChatCompletionRequest,
) -> Option<String> {
    if request.n.is_some_and(|count| count != 1) {
        return Some("n must be 1 when routing Chat Completions to Anthropic".into());
    }
    if let Some(modalities) = request.modalities.as_ref() {
        let text_only = modalities.as_array().is_some_and(|modalities| {
            modalities.len() == 1 && modalities[0].as_str() == Some("text")
        });
        if !text_only {
            return Some(
                "non-text modalities cannot be represented by the selected Anthropic provider"
                    .into(),
            );
        }
    }
    if request.audio.as_ref().is_some_and(|audio| !audio.is_null()) {
        return Some(
            "audio output cannot be represented by the selected Anthropic provider".into(),
        );
    }
    if request.logprobs == Some(true) || request.top_logprobs.is_some_and(|count| count > 0) {
        return Some(
            "log probabilities cannot be represented by the selected Anthropic provider".into(),
        );
    }
    None
}

/// Reject Chat generation controls that Anthropic cannot honour.
///
/// Native OpenAI-compatible routes forward their original JSON body before
/// this validation is reached. Zero penalties and an empty bias map are the
/// only semantically neutral representations on a translated route.
pub fn unsupported_chat_generation_control(
    request: &crate::openai::OpenAIChatCompletionRequest,
) -> Option<String> {
    for (name, value) in [
        ("frequency_penalty", request.frequency_penalty),
        ("presence_penalty", request.presence_penalty),
    ] {
        if let Some(value) = value {
            if !(-2.0..=2.0).contains(&value) {
                return Some(format!("{name} must be between -2 and 2"));
            }
            if value != 0.0 {
                return Some(format!(
                    "{name} cannot be represented by the selected Anthropic provider"
                ));
            }
        }
    }
    if request
        .logit_bias
        .as_ref()
        .is_some_and(|biases| !biases.is_empty())
    {
        return Some("logit_bias cannot be represented by the selected Anthropic provider".into());
    }
    request
        .seed
        .map(|_| "seed cannot be represented by the selected Anthropic provider".to_string())
}

fn required_type<'a>(value: &'a Value, path: &str) -> Result<&'a str, String> {
    value
        .as_object()
        .and_then(|object| object.get("type"))
        .and_then(Value::as_str)
        .filter(|kind| !kind.is_empty())
        .ok_or_else(|| format!("{path}.type must be a non-empty string"))
}

fn validate_name_and_strict(
    name: Option<&Value>,
    strict: Option<&Value>,
    path: &str,
) -> Result<(), String> {
    if name.and_then(Value::as_str).is_none_or(str::is_empty) {
        return Err(format!("{path}.name must be a non-empty string"));
    }
    if strict.is_some_and(|value| !value.is_boolean()) {
        return Err(format!("{path}.strict must be a boolean"));
    }
    Ok(())
}

fn schema_format(schema: Option<&Value>, path: &str) -> Result<Value, String> {
    let schema = schema
        .filter(|schema| schema.is_object())
        .ok_or_else(|| format!("{path} must be an object"))?;
    Ok(json!({"type": "json_schema", "schema": schema}))
}

fn generic_object_format() -> Value {
    json!({
        "type": "json_schema",
        "schema": {"type": "object", "additionalProperties": true}
    })
}
