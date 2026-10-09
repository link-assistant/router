use super::{ThinkingConfig, ThinkingLevel, ThinkingMode, ThinkingProtocol, ThinkingSupport};
use serde_json::{Value, json};

pub(super) fn clear(body: &mut Value, protocol: ThinkingProtocol) {
    use ThinkingProtocol as P;
    match protocol {
        P::Anthropic | P::Kimi => {
            remove(body, "thinking");
            if let Some(config) = body.get_mut("output_config") {
                remove(config, "effort");
            }
        }
        P::OpenAIChat | P::Qwen => {
            remove(body, "reasoning_effort");
            remove(body, "enable_thinking");
            remove(body, "thinking_budget");
            if let Some(reasoning) = body.get_mut("reasoning") {
                remove(reasoning, "effort");
            }
        }
        P::OpenAIResponses | P::Codex | P::Xai => {
            if let Some(reasoning) = body.get_mut("reasoning") {
                remove(reasoning, "effort");
            }
        }
        P::Gemini | P::Vertex => {
            if let Some(generation) = body.get_mut("generationConfig") {
                remove(generation, "thinkingConfig");
            }
            if let Some(generation) = body.get_mut("generation_config") {
                remove(generation, "thinking_config");
            }
        }
        P::Antigravity => {
            if let Some(request) = body.get_mut("request") {
                clear(request, P::Gemini);
            }
        }
        P::Interactions => {
            if let Some(config) = body.get_mut("generation_config") {
                remove(config, "thinking_level");
                remove(config, "thinking_budget");
            }
        }
    }
}

pub(super) fn apply(
    body: &mut Value,
    config: ThinkingConfig,
    to: ThinkingProtocol,
    support: Option<&ThinkingSupport>,
    model: &str,
) {
    use ThinkingProtocol as P;
    match to {
        P::Anthropic => anthropic(body, config.mode, support, model),
        P::OpenAIChat => {
            if let Some(reasoning) = body.get_mut("reasoning") {
                remove(reasoning, "effort");
            }
            body["reasoning_effort"] = json!(effort(config.mode));
        }
        P::OpenAIResponses | P::Codex | P::Xai => {
            object_at(body, "reasoning")["effort"] = json!(effort(config.mode));
        }
        P::Qwen => {
            body["enable_thinking"] = json!(config.mode != ThinkingMode::Off);
            match config.mode {
                ThinkingMode::Budget(budget) => body["thinking_budget"] = json!(budget),
                ThinkingMode::Level(level) => body["thinking_budget"] = json!(level.budget()),
                _ => remove(body, "thinking_budget"),
            }
            remove(body, "reasoning_effort");
            if let Some(reasoning) = body.get_mut("reasoning") {
                remove(reasoning, "effort");
            }
        }
        P::Gemini | P::Vertex => gemini(body, config.mode, support),
        P::Antigravity => gemini(object_at(body, "request"), config.mode, support),
        P::Interactions => {
            let generation = object_at(body, "generation_config");
            generation["thinking_level"] = json!(effort(config.mode));
            remove(generation, "thinking_budget");
        }
        P::Kimi => {
            let thinking = object_at(body, "thinking");
            thinking["type"] = json!(if config.mode == ThinkingMode::Off {
                "disabled"
            } else {
                "enabled"
            });
            if config.mode == ThinkingMode::Off {
                remove(thinking, "effort");
            } else {
                thinking["effort"] = json!(if config.mode == ThinkingMode::Auto {
                    "medium"
                } else {
                    effort(config.mode)
                });
            }
            remove(body, "reasoning_effort");
        }
    }
}

pub(super) const fn effort(mode: ThinkingMode) -> &'static str {
    match mode {
        ThinkingMode::Off => "none",
        ThinkingMode::Auto => "auto",
        ThinkingMode::Level(level) => level.as_str(),
        ThinkingMode::Budget(budget) => ThinkingLevel::from_budget(budget).as_str(),
    }
}

fn gemini(body: &mut Value, mode: ThinkingMode, support: Option<&ThinkingSupport>) {
    use ThinkingMode as M;
    if let Some(mut legacy) = body
        .get_mut("generation_config")
        .and_then(|generation| generation.as_object_mut())
        .and_then(|generation| generation.remove("thinking_config"))
    {
        if let Some(config) = legacy.as_object_mut() {
            for (old, new) in [
                ("thinking_level", "thinkingLevel"),
                ("thinking_budget", "thinkingBudget"),
                ("include_thoughts", "includeThoughts"),
            ] {
                if let Some(value) = config.remove(old) {
                    config.entry(new).or_insert(value);
                }
            }
        }
        if body.pointer("/generationConfig/thinkingConfig").is_none() {
            object_at(body, "generationConfig")["thinkingConfig"] = legacy;
        }
    }
    let generation = object_at(body, "generationConfig");
    if mode == M::Off && support.is_some_and(|support| !support.levels.is_empty()) {
        remove(generation, "thinkingConfig");
        return;
    }
    let thinking = object_at(generation, "thinkingConfig");
    let native_level = support.is_none()
        && (thinking.get("thinkingLevel").is_some() || thinking.get("thinking_level").is_some());
    for field in [
        "thinkingLevel",
        "thinking_level",
        "thinkingBudget",
        "thinking_budget",
    ] {
        remove(thinking, field);
    }
    match mode {
        M::Level(level)
            if native_level || support.is_some_and(|support| !support.levels.is_empty()) =>
        {
            thinking["thinkingLevel"] = json!(level.as_str());
        }
        M::Level(level) => thinking["thinkingBudget"] = json!(level.budget()),
        M::Budget(budget) => thinking["thinkingBudget"] = json!(budget),
        M::Off => thinking["thinkingBudget"] = json!(0),
        M::Auto => thinking["thinkingBudget"] = json!(-1),
    }
}

fn anthropic(body: &mut Value, mode: ThinkingMode, support: Option<&ThinkingSupport>, model: &str) {
    use ThinkingMode as M;
    let adaptive = support
        .and_then(|support| support.adaptive)
        .unwrap_or_else(|| {
            support.is_some_and(|support| !support.levels.is_empty())
                || crate::capabilities::claude_uses_adaptive_thinking(Some(model))
        });
    if let Some(output) = body.get_mut("output_config") {
        remove(output, "effort");
    }
    let thinking = object_at(body, "thinking");
    remove(thinking, "budget_tokens");
    match mode {
        M::Off => {
            thinking["type"] = json!("disabled");
            remove(thinking, "display");
        }
        M::Level(level) if adaptive => {
            thinking["type"] = json!("adaptive");
            let effort = match level {
                ThinkingLevel::Minimal | ThinkingLevel::Low => "low",
                ThinkingLevel::Medium => "medium",
                ThinkingLevel::High => "high",
                ThinkingLevel::XHigh | ThinkingLevel::Max => "max",
            };
            object_at(body, "output_config")["effort"] = json!(effort);
        }
        M::Auto if adaptive => thinking["type"] = json!("adaptive"),
        M::Auto => thinking["type"] = json!("enabled"),
        M::Budget(budget) => {
            thinking["type"] = json!("enabled");
            thinking["budget_tokens"] = json!(budget);
        }
        M::Level(level) => {
            thinking["type"] = json!("enabled");
            thinking["budget_tokens"] = json!(level.budget().max(1024));
        }
    }
    if mode != M::Off {
        if let Some(max) = body.get("max_tokens").and_then(Value::as_u64)
            && let Some(budget) = body
                .pointer("/thinking/budget_tokens")
                .and_then(Value::as_u64)
            && budget >= max
        {
            if max <= 1024 {
                body["thinking"] = json!({"type":"disabled"});
                tracing::debug!(
                    model,
                    max_tokens = max,
                    "thinking dropped: explicit output limit cannot fit Anthropic minimum"
                );
            } else {
                body["thinking"]["budget_tokens"] = json!(budget.min(max - 1));
            }
        }
        remove(body, "temperature");
        remove(body, "top_p");
    }
}

pub(super) fn remove(body: &mut Value, field: &str) {
    if let Some(object) = body.as_object_mut() {
        object.remove(field);
    }
}

pub(super) fn object_at<'a>(body: &'a mut Value, field: &str) -> &'a mut Value {
    if !body.get(field).is_some_and(Value::is_object) {
        body[field] = json!({});
    }
    &mut body[field]
}
