use super::{ThinkingConfig, ThinkingLevel, ThinkingMode, ThinkingProtocol, parse_level_suffix};
use crate::model_contract::ModelTruthDescriptor;
use serde_json::Value;

/// Optional exact-model capability facts. None means unknown, never unsupported.
#[derive(Clone, Debug, Default, serde::Deserialize, serde::Serialize)]
#[serde(deny_unknown_fields)]
pub struct ThinkingSupport {
    pub supported: Option<bool>,
    pub min_budget_tokens: Option<u32>,
    pub max_budget_tokens: Option<u32>,
    #[serde(default)]
    pub levels: Vec<ThinkingLevel>,
    pub zero_allowed: Option<bool>,
    pub dynamic_allowed: Option<bool>,
    pub adaptive: Option<bool>,
}

impl ThinkingSupport {
    pub(crate) const fn has_facts(&self) -> bool {
        self.supported.is_some()
            || self.min_budget_tokens.is_some()
            || self.max_budget_tokens.is_some()
            || !self.levels.is_empty()
            || self.zero_allowed.is_some()
            || self.dynamic_allowed.is_some()
            || self.adaptive.is_some()
    }
}

pub(super) fn from_truth(
    truth: &ModelTruthDescriptor,
    model: &str,
    protocol: ThinkingProtocol,
) -> Option<ThinkingSupport> {
    if truth.upstream_request_model.as_deref() != Some(model)
        || !truth
            .route
            .protocols
            .iter()
            .any(|name| matches_protocol(name, protocol))
    {
        return None;
    }
    if trusted_field(truth, model, "thinking") {
        let support: ThinkingSupport =
            serde_json::from_value(truth.capabilities.get("thinking")?.clone()).ok()?;
        if !support.has_facts()
            || matches!((support.min_budget_tokens, support.max_budget_tokens), (Some(min), Some(max)) if min > max)
        {
            return None;
        }
        return Some(support);
    }
    if !trusted_field(truth, model, "supported_reasoning_levels") {
        return None;
    }
    let levels = truth
        .capabilities
        .get("supported_reasoning_levels")?
        .as_array()?;
    let levels = levels
        .iter()
        .filter_map(|level| {
            parse_level_suffix(
                level
                    .as_str()
                    .or_else(|| level.get("effort").and_then(Value::as_str))?,
            )
        })
        .collect::<Vec<_>>();
    (!levels.is_empty()).then_some(ThinkingSupport {
        levels,
        ..ThinkingSupport::default()
    })
}

fn matches_protocol(name: &str, protocol: ThinkingProtocol) -> bool {
    use crate::client_policy::ClientProtocol as C;
    use ThinkingProtocol as P;
    // Discovery serializes ClientProtocol directly. Preserve those exact wire
    // spellings as well as the established public protocol names below.
    let native = serde_json::from_value::<C>(Value::String(name.to_string())).ok();
    let native_matches = matches!(
        (native, protocol),
        (Some(C::AnthropicMessages), P::Anthropic)
            | (Some(C::OpenAIChat), P::OpenAIChat | P::Qwen)
            | (Some(C::OpenAIResponses), P::OpenAIResponses | P::Codex)
            | (Some(C::GeminiNative), P::Gemini | P::Vertex)
    );
    ThinkingProtocol::from_name(name) == Some(protocol)
        || native_matches
        || match protocol {
            P::Anthropic => name == "anthropic_messages",
            P::OpenAIChat | P::Qwen => name == "openai_chat",
            P::OpenAIResponses => name == "openai_responses",
            P::Codex => matches!(
                name,
                "openai_responses" | "openai-response" | "openai-responses"
            ),
            P::Gemini | P::Vertex => name == "gemini_native",
            _ => false,
        }
}

fn trusted_field(truth: &ModelTruthDescriptor, model: &str, field: &str) -> bool {
    let Some(evidence) = truth
        .capability_provenance
        .get("fields")
        .and_then(|fields| fields.get(field))
    else {
        return false;
    };
    let scope = &evidence["scope"];
    truth
        .route
        .provider
        .as_ref()
        .is_some_and(|value| !value.is_empty())
        && truth
            .route
            .account
            .as_ref()
            .is_some_and(|value| !value.is_empty())
        && truth
            .route
            .endpoint
            .as_ref()
            .is_some_and(|value| !value.is_empty())
        && !truth.route.protocols.is_empty()
        && evidence
            .get("source_kind")
            .and_then(Value::as_str)
            .is_some_and(|source| {
                matches!(
                    source,
                    "authenticated_live_catalog"
                        | "authenticated_live_model_catalog"
                        | "reviewed_provider_documentation"
                )
            })
        && evidence.get("conflict") == Some(&Value::Bool(false))
        && evidence.get("unknown") == Some(&Value::Bool(false))
        && scope.get("model").and_then(Value::as_str) == Some(model)
        && scope.get("provider").and_then(Value::as_str) == truth.route.provider.as_deref()
        && scope.get("account").and_then(Value::as_str) == truth.route.account.as_deref()
        && scope.get("endpoint").and_then(Value::as_str) == truth.route.endpoint.as_deref()
        && scope.get("protocols") == Some(&serde_json::json!(truth.route.protocols))
}

pub(super) fn validate(
    config: ThinkingConfig,
    support: &ThinkingSupport,
    from: ThinkingProtocol,
    to: ThinkingProtocol,
    from_suffix: bool,
) -> Result<ThinkingConfig, String> {
    use ThinkingMode as M;
    let has_budget = support.min_budget_tokens.is_some() || support.max_budget_tokens.is_some();
    let has_levels = !support.levels.is_empty();
    let mut mode = config.mode;
    let derived = matches!(mode, M::Budget(_));
    if !has_levels
        && has_budget
        && let M::Level(level) = mode
    {
        mode = M::Budget(level.budget());
    }
    if has_levels
        && (!has_budget || (to == ThinkingProtocol::Anthropic && from != to))
        && let M::Budget(budget) = mode
    {
        mode = M::Level(ThinkingLevel::from_budget(budget));
    }
    if let M::Level(mut level) = mode {
        if to == ThinkingProtocol::Anthropic && from != ThinkingProtocol::Anthropic {
            level = match level {
                ThinkingLevel::Minimal => ThinkingLevel::Low,
                ThinkingLevel::XHigh | ThinkingLevel::Max => {
                    if support.levels.contains(&ThinkingLevel::Max) {
                        ThinkingLevel::Max
                    } else {
                        ThinkingLevel::High
                    }
                }
                _ => level,
            };
        }
        if has_levels && !support.levels.contains(&level) {
            if from.family() == to.family() && !derived {
                return Err(format!(
                    "thinking level {} is not supported by the exact model",
                    level.as_str()
                ));
            }
            level = nearest(level, &support.levels);
        }
        mode = M::Level(level);
    }
    if mode == M::Auto
        && support.dynamic_allowed == Some(false)
        && (has_budget || has_levels)
        && !(to == ThinkingProtocol::Anthropic && has_levels)
    {
        mode = if has_levels && !has_budget {
            M::Level(nearest(ThinkingLevel::Medium, &support.levels))
        } else {
            let min = support.min_budget_tokens.unwrap_or(0);
            let max = support.max_budget_tokens.unwrap_or(min);
            M::Budget(min + max.saturating_sub(min) / 2)
        };
    }
    if mode == M::Auto && to == ThinkingProtocol::Anthropic && has_levels && from != to {
        mode = M::Level(nearest(ThinkingLevel::High, &support.levels));
    }
    if mode == M::Off
        && support.zero_allowed == Some(false)
        && (has_budget || has_levels)
        && !(to == ThinkingProtocol::Anthropic && has_levels)
    {
        mode = if has_levels {
            M::Level(*support.levels.iter().min().unwrap_or(&ThinkingLevel::Low))
        } else {
            M::Budget(support.min_budget_tokens.unwrap_or(0))
        };
    }
    if let M::Budget(budget) = mode {
        let min = support.min_budget_tokens.unwrap_or(0);
        let max = support.max_budget_tokens.unwrap_or(u32::MAX);
        if min > max {
            return Err("conflicting thinking budget evidence".into());
        }
        let clamped = budget.clamp(min, max);
        if budget != clamped
            && !from_suffix
            && from.family() == to.family()
            && matches!(config.mode, M::Budget(_))
        {
            return Err(format!(
                "thinking budget {budget} is outside [{min}, {max}]"
            ));
        }
        mode = M::Budget(clamped);
    }
    if mode != config.mode {
        tracing::debug!(?from, ?to, original = ?config.mode, effective = ?mode,
            "thinking converted or clamped to exact model evidence");
    }
    Ok(ThinkingConfig { mode })
}

pub(super) fn nearest(level: ThinkingLevel, supported: &[ThinkingLevel]) -> ThinkingLevel {
    supported
        .iter()
        .min_by_key(|supported| ((**supported as u8).abs_diff(level as u8), **supported))
        .copied()
        .unwrap_or(level)
}
