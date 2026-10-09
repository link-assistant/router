use super::{
    ThinkingConfig, ThinkingMode, ThinkingProtocol, parse_level_suffix, parse_special_suffix,
};
use serde_json::Value;

/// Extract body controls in their existing protocol precedence order.
/// Missing controls return None; explicit off/auto remain distinct.
pub fn extract_config(
    body: &Value,
    protocol: ThinkingProtocol,
) -> Result<Option<ThinkingConfig>, String> {
    use ThinkingProtocol as P;
    validate_containers(body, protocol)?;
    let mode = match protocol {
        P::Anthropic => anthropic(body)?,
        P::Qwen => {
            if body
                .get("enable_thinking")
                .is_some_and(|value| value == false)
            {
                Some(ThinkingMode::Off)
            } else if let Some(mode) = budget(body.get("thinking_budget"))? {
                Some(mode)
            } else {
                level(
                    body.pointer("/reasoning/effort")
                        .or_else(|| body.get("reasoning_effort")),
                )?
                .or_else(|| {
                    (body.get("enable_thinking") == Some(&Value::Bool(true)))
                        .then_some(ThinkingMode::Auto)
                })
            }
        }
        P::OpenAIChat => {
            // Router has always given reasoning.effort precedence over the flat field.
            level(
                body.pointer("/reasoning/effort")
                    .or_else(|| body.get("reasoning_effort")),
            )?
        }
        P::OpenAIResponses | P::Codex | P::Xai => level(body.pointer("/reasoning/effort"))?,
        P::Gemini | P::Vertex | P::Antigravity => {
            let root = if protocol == P::Antigravity {
                body.get("request").unwrap_or(body)
            } else {
                body
            };
            let thinking = root
                .pointer("/generationConfig/thinkingConfig")
                .or_else(|| root.pointer("/generation_config/thinking_config"));
            match thinking {
                Some(thinking) => level(
                    thinking
                        .get("thinkingLevel")
                        .or_else(|| thinking.get("thinking_level")),
                )?
                .map_or_else(
                    || {
                        budget(
                            thinking
                                .get("thinkingBudget")
                                .or_else(|| thinking.get("thinking_budget")),
                        )
                    },
                    |level| Ok(Some(level)),
                )?,
                None => None,
            }
        }
        P::Interactions => level(body.pointer("/generation_config/thinking_level"))?.map_or_else(
            || budget(body.pointer("/generation_config/thinking_budget")),
            |level| Ok(Some(level)),
        )?,
        P::Kimi => match body.pointer("/thinking/type").and_then(Value::as_str) {
            Some("disabled") => Some(ThinkingMode::Off),
            Some("enabled") => {
                level(body.pointer("/thinking/effort"))?.or(Some(ThinkingMode::Auto))
            }
            _ => level(
                body.pointer("/thinking/effort")
                    .or_else(|| body.get("reasoning_effort")),
            )?,
        },
    };
    Ok(mode.map(|mode| ThinkingConfig { mode }))
}

fn validate_containers(body: &Value, protocol: ThinkingProtocol) -> Result<(), String> {
    use ThinkingProtocol as P;
    if !body.is_object() {
        return Err("thinking source must be a JSON object".into());
    }
    let fields: &[&str] = match protocol {
        P::Anthropic => &["/thinking", "/output_config"],
        P::OpenAIChat | P::OpenAIResponses | P::Codex | P::Qwen | P::Xai => &["/reasoning"],
        P::Gemini | P::Vertex => &[
            "/generationConfig",
            "/generationConfig/thinkingConfig",
            "/generation_config",
            "/generation_config/thinking_config",
        ],
        P::Antigravity => &[
            "/request",
            "/request/generationConfig",
            "/request/generationConfig/thinkingConfig",
        ],
        P::Interactions => &["/generation_config"],
        P::Kimi => &["/thinking"],
    };
    for field in fields {
        if body
            .pointer(field)
            .is_some_and(|value| !value.is_null() && !value.is_object())
        {
            return Err(format!("{field} must be an object"));
        }
    }
    if matches!(protocol, P::Anthropic | P::Kimi)
        && body
            .pointer("/thinking/type")
            .is_some_and(|value| !value.is_string())
    {
        return Err("thinking.type must be a string".into());
    }
    if protocol == P::Qwen
        && body
            .get("enable_thinking")
            .is_some_and(|value| !value.is_boolean())
    {
        return Err("enable_thinking must be a boolean".into());
    }
    Ok(())
}

pub(super) fn level(value: Option<&Value>) -> Result<Option<ThinkingMode>, String> {
    let Some(value) = value.filter(|value| !value.is_null()) else {
        return Ok(None);
    };
    let raw = value.as_str().ok_or("thinking effort must be a string")?;
    parse_special_suffix(raw)
        .or_else(|| parse_level_suffix(raw).map(ThinkingMode::Level))
        .map(Some)
        .ok_or_else(|| format!("unsupported thinking effort: {raw}"))
}

fn budget(value: Option<&Value>) -> Result<Option<ThinkingMode>, String> {
    let Some(value) = value.filter(|value| !value.is_null()) else {
        return Ok(None);
    };
    if value.as_i64() == Some(-1) {
        return Ok(Some(ThinkingMode::Auto));
    }
    let budget = value
        .as_u64()
        .and_then(|budget| u32::try_from(budget).ok())
        .ok_or("thinking budget must be -1 or a nonnegative u32 integer")?;
    Ok(Some(if budget == 0 {
        ThinkingMode::Off
    } else {
        ThinkingMode::Budget(budget)
    }))
}

fn anthropic(body: &Value) -> Result<Option<ThinkingMode>, String> {
    let kind = body.pointer("/thinking/type").and_then(Value::as_str);
    match kind {
        Some("disabled") => Ok(Some(ThinkingMode::Off)),
        Some("enabled") => {
            Ok(budget(body.pointer("/thinking/budget_tokens"))?.or(Some(ThinkingMode::Auto)))
        }
        Some("adaptive") => {
            Ok(level(body.pointer("/output_config/effort"))?.or(Some(ThinkingMode::Auto)))
        }
        Some(kind) => Err(format!("unsupported thinking type: {kind}")),
        None => level(body.pointer("/output_config/effort")),
    }
}
