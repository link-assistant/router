//! Central capability declarations for request reconciliation and bridges.

use crate::config::UpstreamProvider;
use crate::subscription::SubscriptionProvider;
use serde_json::Value;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Capability {
    Native,
    Emulated,
    Unsupported,
    /// Unknown providers are passed through; lack of knowledge never means
    /// that a field is silently stripped.
    Unknown,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct ProviderCapabilities {
    pub temperature: Capability,
    pub stop_sequences: Capability,
    pub output_token_limit: Capability,
    pub reasoning: Capability,
    pub web_search: Capability,
    pub web_fetch: Capability,
}

#[must_use]
pub fn subscription(provider: SubscriptionProvider, model: Option<&str>) -> ProviderCapabilities {
    match provider {
        SubscriptionProvider::Claude => ProviderCapabilities {
            temperature: if claude_generation(model).is_some_and(|generation| generation >= 5) {
                Capability::Unsupported
            } else {
                Capability::Native
            },
            stop_sequences: Capability::Native,
            output_token_limit: Capability::Native,
            reasoning: Capability::Native,
            web_search: Capability::Native,
            web_fetch: Capability::Native,
        },
        SubscriptionProvider::Codex => ProviderCapabilities {
            temperature: Capability::Unsupported,
            stop_sequences: Capability::Emulated,
            output_token_limit: Capability::Emulated,
            reasoning: Capability::Native,
            web_search: Capability::Native,
            web_fetch: Capability::Unsupported,
        },
        SubscriptionProvider::Qwen | SubscriptionProvider::Gemini => ProviderCapabilities {
            temperature: Capability::Native,
            stop_sequences: Capability::Native,
            output_token_limit: Capability::Native,
            reasoning: Capability::Native,
            web_search: Capability::Unsupported,
            web_fetch: Capability::Unsupported,
        },
    }
}

#[must_use]
pub fn upstream(provider: UpstreamProvider) -> ProviderCapabilities {
    provider.subscription_provider().map_or(
        ProviderCapabilities {
            temperature: Capability::Unknown,
            stop_sequences: Capability::Unknown,
            output_token_limit: Capability::Unknown,
            reasoning: Capability::Unknown,
            web_search: Capability::Unknown,
            web_fetch: Capability::Unknown,
        },
        |provider| subscription(provider, None),
    )
}

#[must_use]
pub fn claude_generation(model: Option<&str>) -> Option<u32> {
    let model = model?;
    let model = model.strip_prefix("claude-").unwrap_or(model);
    let mut parts = model.split('-');
    let family = parts.next()?;
    let generation = parts.next()?.parse::<u32>().ok()?;
    matches!(family, "haiku" | "sonnet" | "opus" | "fable").then_some(generation)
}

/// Whether the selected Claude model uses the current adaptive-thinking wire
/// format instead of a caller-provided fixed token budget.
#[must_use]
pub fn claude_uses_adaptive_thinking(model: Option<&str>) -> bool {
    let Some(model) = model.map(|model| model.strip_prefix("claude-").unwrap_or(model)) else {
        return false;
    };
    let mut parts = model.split('-');
    let Some(family) = parts.next() else {
        return false;
    };
    let Some(major) = parts.next().and_then(|part| part.parse::<u32>().ok()) else {
        return false;
    };
    let minor = parts
        .next()
        .and_then(|part| part.parse::<u32>().ok())
        .unwrap_or(0);
    matches!(family, "sonnet" | "fable") && major >= 5
        || family == "opus" && (major > 4 || major == 4 && minor >= 7)
}

/// Return a requested server-side tool the target subscription cannot
/// execute. Client function tools are outside this capability check.
#[must_use]
pub fn unsupported_server_tool_type(
    provider: SubscriptionProvider,
    tools: Option<&Value>,
) -> Option<String> {
    let capabilities = subscription(provider, None);
    tools?.as_array()?.iter().find_map(|tool| {
        let kind = tool.get("type").and_then(Value::as_str)?;
        let support = if kind == "web_search" || kind.starts_with("web_search_") {
            capabilities.web_search
        } else if kind == "web_fetch" || kind.starts_with("web_fetch_") {
            capabilities.web_fetch
        } else {
            return None;
        };
        (support == Capability::Unsupported).then(|| kind.to_string())
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn unknown_providers_are_never_assumed_unsupported() {
        let capabilities = upstream(UpstreamProvider::OpenAICompatible);
        assert_eq!(capabilities.temperature, Capability::Unknown);
        assert_eq!(capabilities.web_search, Capability::Unknown);
    }

    #[test]
    fn matrix_distinguishes_server_tools_and_local_emulation() {
        let codex = subscription(SubscriptionProvider::Codex, Some("gpt-5.6-sol"));
        assert_eq!(codex.web_search, Capability::Native);
        assert_eq!(codex.web_fetch, Capability::Unsupported);
        assert_eq!(codex.stop_sequences, Capability::Emulated);
        assert_eq!(codex.output_token_limit, Capability::Emulated);
        assert_eq!(
            unsupported_server_tool_type(
                SubscriptionProvider::Codex,
                Some(&serde_json::json!([{"type":"web_fetch"}]))
            )
            .as_deref(),
            Some("web_fetch")
        );
        let claude = subscription(SubscriptionProvider::Claude, Some("claude-opus-5"));
        assert_eq!(claude.temperature, Capability::Unsupported);
        assert_eq!(claude.output_token_limit, Capability::Native);
        assert!(claude_uses_adaptive_thinking(Some("claude-opus-5")));
        assert!(claude_uses_adaptive_thinking(Some("opus-4-7")));
        assert!(!claude_uses_adaptive_thinking(Some("claude-sonnet-4-5")));
        assert_eq!(claude.web_fetch, Capability::Native);
    }
}
