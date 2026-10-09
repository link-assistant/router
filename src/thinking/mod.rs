//! Canonical thinking controls shared by request translators and provider appliers.
//!
//! The suffix grammar and conversion tables follow `CLIProxyAPI` v8.0.20
//! (MIT, Copyright (c) 2025 router-for-me), commit
//! 0f96f568e4dbf6f84ad7399a74b78344c5eac7e6. Model capability claims come
//! only from exact, scoped model-truth evidence, never from model families.

pub(crate) mod anthropic;
mod apply;
mod catalog;
pub(crate) use catalog::apply_for_account;
mod extract;
mod parser;
mod support;
mod visibility;

pub use extract::extract_config;
pub use parser::{
    SuffixResult, parse_level_suffix, parse_numeric_suffix, parse_special_suffix, parse_suffix,
};
use serde_json::Value;
pub use support::ThinkingSupport;

/// A discrete reasoning effort, ordered from least to most expensive.
#[derive(
    Clone, Copy, Debug, Eq, Ord, PartialEq, PartialOrd, serde::Deserialize, serde::Serialize,
)]
#[serde(rename_all = "lowercase")]
pub enum ThinkingLevel {
    Minimal,
    Low,
    Medium,
    High,
    XHigh,
    Max,
}

impl ThinkingLevel {
    /// Provider wire spelling for this effort.
    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Minimal => "minimal",
            Self::Low => "low",
            Self::Medium => "medium",
            Self::High => "high",
            Self::XHigh => "xhigh",
            Self::Max => "max",
        }
    }

    /// Shared semantic conversion, bounded by target evidence when available.
    #[must_use]
    pub const fn budget(self) -> u32 {
        match self {
            Self::Minimal => 512,
            Self::Low => 1024,
            Self::Medium => 8192,
            Self::High => 24576,
            Self::XHigh => 32768,
            Self::Max => 128_000,
        }
    }

    /// Convert a positive budget to the shared effort thresholds.
    #[must_use]
    pub const fn from_budget(budget: u32) -> Self {
        match budget {
            0..=512 => Self::Minimal,
            513..=1024 => Self::Low,
            1025..=8192 => Self::Medium,
            8193..=24576 => Self::High,
            _ => Self::XHigh,
        }
    }
}

/// The requested thinking mode, independent of provider wire format.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ThinkingMode {
    Off,
    Auto,
    Budget(u32),
    Level(ThinkingLevel),
}

/// A provider-independent thinking request. Summary visibility is separate.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct ThinkingConfig {
    pub mode: ThinkingMode,
}

/// Wire format for extracting and applying reasoning controls.
/// Additional formats support the upstream conformance corpus; they do not
/// register providers or inference routes.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ThinkingProtocol {
    Anthropic,
    OpenAIChat,
    OpenAIResponses,
    Gemini,
    Vertex,
    Codex,
    Qwen,
    Interactions,
    Antigravity,
    Kimi,
    Xai,
}

impl ThinkingProtocol {
    /// Parse a provider or protocol name used by the canonical pipeline.
    #[must_use]
    pub fn from_name(name: &str) -> Option<Self> {
        match name {
            "claude" | "anthropic" => Some(Self::Anthropic),
            "openai" | "openai-chat" => Some(Self::OpenAIChat),
            "openai-response" | "openai-responses" => Some(Self::OpenAIResponses),
            "gemini" => Some(Self::Gemini),
            "vertex" => Some(Self::Vertex),
            "codex" => Some(Self::Codex),
            "qwen" => Some(Self::Qwen),
            "interactions" => Some(Self::Interactions),
            "antigravity" => Some(Self::Antigravity),
            "kimi" => Some(Self::Kimi),
            "xai" => Some(Self::Xai),
            _ => None,
        }
    }

    pub(super) const fn family(self) -> u8 {
        match self {
            Self::Anthropic => 0,
            Self::OpenAIChat | Self::OpenAIResponses | Self::Codex => 1,
            Self::Gemini | Self::Vertex | Self::Antigravity => 2,
            Self::Qwen => 3,
            Self::Interactions => 4,
            Self::Kimi => 5,
            Self::Xai => 6,
        }
    }
}

/// Extract source intent, validate exact model evidence and apply target controls.
///
/// `body` is the translated target; `source` is the original request. Existing
/// body controls take precedence over a suffix so adding suffix support does
/// not change an explicit client setting. No control means no injected default.
/// Unknown capabilities preserve caller intent using protocol conversions;
/// only verified unsupported capability causes a logged drop.
///
/// # Errors
/// Invalid controls or unsupported same-protocol levels/budgets return an error
/// without modifying `body`.
pub fn apply_thinking(
    body: &mut Value,
    source: &Value,
    model: &str,
    from: ThinkingProtocol,
    to: ThinkingProtocol,
    truth: Option<&crate::model_contract::ModelTruthDescriptor>,
) -> Result<Option<ThinkingConfig>, String> {
    if !body.is_object() {
        return Err("thinking target must be a JSON object".into());
    }
    let suffix = parse_suffix(model);
    let base = base_model(model);
    let body_config = if to == ThinkingProtocol::Kimi
        && from == ThinkingProtocol::OpenAIChat
        && source.get("thinking").is_some()
    {
        extract_config(source, ThinkingProtocol::Kimi)?
    } else {
        extract_config(source, from)?
    };
    let config = body_config.or_else(|| (base != model).then(|| suffix.config()).flatten());
    let mut visibility = visibility::extract(source, from);
    let Some(mut config) = config else {
        visibility::apply(body, to, visibility);
        return Ok(None);
    };
    let support = truth.and_then(|truth| support::from_truth(truth, base, to));
    if support
        .as_ref()
        .is_some_and(|support| support.supported == Some(false))
    {
        tracing::debug!(
            model = base,
            ?to,
            "thinking dropped: exact model evidence declares unsupported"
        );
        apply::clear(body, to);
        if body.get("model").is_some() {
            body["model"] = Value::String(base.to_string());
        }
        return Ok(None);
    }
    if to == ThinkingProtocol::Kimi
        && from == ThinkingProtocol::OpenAIChat
        && source.pointer("/thinking/type").and_then(Value::as_str) == Some("enabled")
        && source.pointer("/thinking/effort").is_none()
        && source.get("reasoning_effort").is_none()
    {
        if body.get("model").is_some() {
            body["model"] = Value::String(base.to_string());
        }
        return Ok(None);
    }
    if support.is_some() && visibility.is_none() && from == ThinkingProtocol::OpenAIResponses {
        visibility = source
            .pointer("/reasoning/effort")
            .and_then(Value::as_str)
            .map(|effort| effort != "none");
    }
    if from == ThinkingProtocol::Anthropic
        && matches!(
            to,
            ThinkingProtocol::Gemini | ThinkingProtocol::Vertex | ThinkingProtocol::Antigravity
        )
        && config.mode == ThinkingMode::Auto
        && source.pointer("/thinking/type").and_then(Value::as_str) == Some("adaptive")
    {
        config.mode = ThinkingMode::Level(ThinkingLevel::High);
    }
    if let Some(support) = support.as_ref() {
        config = support::validate(config, support, from, to, body_config.is_none())?;
    }
    let mut updated = body.clone();
    apply::apply(&mut updated, config, to, support.as_ref(), base);
    if updated.get("model").is_some() {
        updated["model"] = Value::String(base.to_string());
    }
    visibility::apply(&mut updated, to, visibility);
    *body = updated;
    Ok(Some(config))
}

/// Strip an interpreted thinking suffix from a selector for routing and policy.
/// Malformed, unrecognized and overflowing suffixes remain exact literal IDs.
#[must_use]
pub fn base_model(model: &str) -> &str {
    let suffix = parse_suffix(model);
    if suffix.config().is_some() && !suffix.model_name.is_empty() {
        suffix.model_name
    } else {
        model
    }
}

/// Whether a recognized suffix supplies the control rather than an explicit body field.
pub(crate) fn suffix_applies(source: &Value, model: &str, protocol: ThinkingProtocol) -> bool {
    base_model(model) != model
        && extract_config(source, protocol).is_ok_and(|config| config.is_none())
}

#[derive(Clone)]
pub(crate) struct SuffixIntent;

/// Apply an additive suffix at ingress, leaving requests without one untouched.
///
/// Explicit body controls retain precedence. The returned boolean indicates
/// whether bytes must be serialized again on a native relay.
pub fn normalize_request(body: &mut Value, protocol: ThinkingProtocol) -> Result<bool, String> {
    let Some(model) = body
        .get("model")
        .and_then(Value::as_str)
        .map(str::to_string)
    else {
        return Ok(false);
    };
    if base_model(&model) == model {
        return Ok(false);
    }
    let source = body.clone();
    let body_protocol = if protocol == ThinkingProtocol::OpenAIChat
        && (source.get("enable_thinking").is_some() || source.get("thinking_budget").is_some())
    {
        ThinkingProtocol::Qwen
    } else {
        protocol
    };
    if extract_config(&source, body_protocol)?.is_none() {
        apply_thinking(body, &source, &model, protocol, protocol, None)?;
    }
    body["model"] = Value::String(base_model(&model).to_string());
    Ok(true)
}

/// Normalize a URL-owned native model selector without adding a body model.
/// Requests with no suffix preserve their body exactly.
pub fn normalize_native_request(
    model: &str,
    body: &mut Value,
    protocol: ThinkingProtocol,
) -> Result<String, String> {
    let base = base_model(model);
    if base == model {
        return Ok(model.to_string());
    }
    let source = body.clone();
    if extract_config(&source, protocol)?.is_none() {
        apply_thinking(body, &source, model, protocol, protocol, None)?;
    }
    Ok(base.to_string())
}

/// Surface-specific rendering for suffix validation at HTTP ingress.
pub(crate) fn normalize_ingress(
    body: &mut Value,
    surface: crate::metrics::Surface,
) -> Result<(), axum::response::Response> {
    let protocol = match surface {
        crate::metrics::Surface::Anthropic => ThinkingProtocol::Anthropic,
        crate::metrics::Surface::OpenAIChat => ThinkingProtocol::OpenAIChat,
        crate::metrics::Surface::OpenAIResponses => ThinkingProtocol::OpenAIResponses,
    };
    normalize_request(body, protocol)
        .map(|_| ())
        .map_err(|reason| {
            crate::api_error::error_response_for_surface(
                surface,
                axum::http::StatusCode::BAD_REQUEST,
                "invalid_request_error",
                &reason,
            )
        })
}
