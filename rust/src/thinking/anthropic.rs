//! Anthropic wire constraints and historical output-limit reconciliation.
use serde_json::{Value, json};

const CLAUDE_DEFAULT_MAX_TOKENS: u64 = 8_192;
const CLAUDE_MIN_THINKING_BUDGET: u64 = 1_024;
const CLAUDE_OUTPUT_HEADROOM: u64 = 8_192;
const CLAUDE_OUTPUT_FLOOR: u64 = 4_096;
const CLAUDE_FIXED_TOKEN_CEILING: u64 = 32_000;
const CLAUDE_ADAPTIVE_TOKEN_CEILING: u64 = 40_192;

/// Convert native Anthropic modes, retaining the bridge's historical max spelling.
pub fn translated_effort(body: &Value) -> Result<Option<&'static str>, String> {
    Ok(
        super::extract_config(body, super::ThinkingProtocol::Anthropic)?.map(|config| {
            if config.mode == super::ThinkingMode::Level(super::ThinkingLevel::Max) {
                "xhigh"
            } else {
                super::apply::effort(config.mode)
            }
        }),
    )
}

fn reasoning_budget(effort: &str) -> u64 {
    match effort {
        "minimal" => 1_024,
        "low" => 4_096,
        "medium" => 8_192,
        "xhigh" => 24_576,
        "max" => 32_000,
        _ => 16_384,
    }
}

fn adaptive_effort(effort: &str) -> &'static str {
    match effort {
        "minimal" | "low" => "low",
        "medium" => "medium",
        "xhigh" | "max" => "max",
        _ => "high",
    }
}

pub fn reconcile_claude_thinking(
    body: &mut Value,
    adaptive_thinking: bool,
    output_limit_was_explicit: bool,
) {
    // A suffix is a default; historical body effort conversion and output
    // headroom continue to win when the client supplied an effort explicitly.
    let model = body
        .get("model")
        .and_then(Value::as_str)
        .unwrap_or_default()
        .to_string();
    if super::base_model(&model) != model {
        if body.pointer("/reasoning/effort").is_none() && body.get("thinking").is_none() {
            let source = body.clone();
            if !output_limit_was_explicit
                && let Some(super::ThinkingConfig {
                    mode: super::ThinkingMode::Budget(budget),
                }) = super::parse_suffix(&model).config()
            {
                body["max_tokens"] =
                    json!(u64::from(budget).saturating_add(CLAUDE_OUTPUT_HEADROOM));
            }
            let _ = super::apply_thinking(
                body,
                &source,
                &model,
                super::ThinkingProtocol::OpenAIResponses,
                super::ThinkingProtocol::Anthropic,
                None,
            );
        }
        body["model"] = json!(super::base_model(&model));
    }
    let requested_effort = body
        .pointer("/reasoning/effort")
        .and_then(Value::as_str)
        .map(str::to_string);
    if let Some(object) = body.as_object_mut() {
        object.remove("reasoning");
    }
    let thinking_present = body.get("thinking").is_some();
    if !thinking_present
        && requested_effort
            .as_deref()
            .is_some_and(|effort| effort != "none")
    {
        let effort = requested_effort.as_deref().unwrap_or("high");
        let requested_budget = reasoning_budget(effort);
        if adaptive_thinking {
            body["thinking"] = json!({"type": "adaptive"});
            if !body.get("output_config").is_some_and(Value::is_object) {
                body["output_config"] = json!({});
            }
            body["output_config"]["effort"] = json!(adaptive_effort(effort));
            if !output_limit_was_explicit {
                body["max_tokens"] = json!(
                    CLAUDE_DEFAULT_MAX_TOKENS
                        .max(requested_budget.saturating_add(CLAUDE_OUTPUT_HEADROOM))
                        .min(CLAUDE_ADAPTIVE_TOKEN_CEILING)
                );
            }
        } else {
            let mut max_tokens = body
                .get("max_tokens")
                .and_then(Value::as_u64)
                .unwrap_or(CLAUDE_DEFAULT_MAX_TOKENS);
            if !output_limit_was_explicit {
                max_tokens = max_tokens
                    .max(requested_budget.saturating_add(CLAUDE_OUTPUT_HEADROOM))
                    .min(CLAUDE_FIXED_TOKEN_CEILING);
                body["max_tokens"] = json!(max_tokens);
            }
            let available = max_tokens
                .saturating_sub(CLAUDE_OUTPUT_FLOOR)
                .max(CLAUDE_MIN_THINKING_BUDGET);
            body["thinking"] = json!({
                "type": "enabled",
                "budget_tokens": requested_budget.min(available),
            });
        }
    }
    let max_tokens = body
        .get("max_tokens")
        .and_then(Value::as_u64)
        .unwrap_or(CLAUDE_DEFAULT_MAX_TOKENS);
    let thinking_enabled = body
        .get("thinking")
        .and_then(|thinking| thinking.get("type"))
        .and_then(Value::as_str)
        .is_some_and(|kind| matches!(kind, "enabled" | "adaptive"));
    if thinking_enabled {
        if let Some(budget) = body
            .pointer("/thinking/budget_tokens")
            .and_then(Value::as_u64)
            && budget.saturating_add(CLAUDE_OUTPUT_FLOOR) > max_tokens
            && max_tokens > CLAUDE_MIN_THINKING_BUDGET
        {
            body["thinking"]["budget_tokens"] = json!(
                max_tokens
                    .saturating_sub(CLAUDE_OUTPUT_FLOOR)
                    .max(CLAUDE_MIN_THINKING_BUDGET)
            );
        }
        if let Some(object) = body.as_object_mut() {
            object.remove("temperature");
            object.remove("top_p");
        }
    }
}

/// Reapply a numeric suffix after an intermediary effort-only protocol so
/// token budgets are not lost to an effort threshold during translation.
pub fn apply_translated_suffix(
    body: &mut Value,
    source: &Value,
    from: super::ThinkingProtocol,
    to: super::ThinkingProtocol,
) -> Result<(), String> {
    let model = source
        .get("model")
        .and_then(Value::as_str)
        .unwrap_or_default();
    if super::base_model(model) == model || super::extract_config(source, from)?.is_some() {
        return Ok(());
    }
    let target_model = body.get("model").cloned();
    if to == super::ThinkingProtocol::Anthropic
        && !["max_tokens", "max_completion_tokens", "max_output_tokens"]
            .iter()
            .any(|key| source.get(*key).is_some_and(|value| !value.is_null()))
        && let Some(super::ThinkingConfig {
            mode: super::ThinkingMode::Budget(budget),
        }) = super::parse_suffix(model).config()
    {
        body["max_tokens"] = json!(u64::from(budget).saturating_add(CLAUDE_OUTPUT_HEADROOM));
    }
    super::apply_thinking(body, source, model, from, to, None)?;
    if let Some(model) = target_model {
        body["model"] = model;
    }
    Ok(())
}
