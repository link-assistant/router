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
    pub top_p: Capability,
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
            top_p: Capability::Native,
            stop_sequences: Capability::Native,
            output_token_limit: Capability::Native,
            reasoning: Capability::Native,
            web_search: Capability::Native,
            web_fetch: Capability::Native,
        },
        SubscriptionProvider::Codex => ProviderCapabilities {
            temperature: Capability::Unsupported,
            top_p: Capability::Unsupported,
            stop_sequences: Capability::Emulated,
            output_token_limit: Capability::Emulated,
            reasoning: Capability::Native,
            web_search: Capability::Native,
            web_fetch: Capability::Unsupported,
        },
        SubscriptionProvider::Qwen | SubscriptionProvider::Gemini => ProviderCapabilities {
            temperature: Capability::Native,
            top_p: Capability::Native,
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
            top_p: Capability::Unknown,
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
    model.split('-').find_map(|part| part.parse::<u32>().ok())
}

/// Whether the selected Claude model uses the current adaptive-thinking wire
/// format instead of a caller-provided fixed token budget.
#[must_use]
pub fn claude_uses_adaptive_thinking(model: Option<&str>) -> bool {
    let Some(model) = model.map(|model| model.strip_prefix("claude-").unwrap_or(model)) else {
        return false;
    };
    let mut version = model.split('-').filter_map(|part| part.parse::<u32>().ok());
    let Some(major) = version.next() else {
        return false;
    };
    let minor = version.next().unwrap_or(0);
    major > 4 || major == 4 && minor >= 7
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

/// Whether a request forces a tool call it can never satisfy.
///
/// `tool_choice: any`/`required` demands a *function* call, but server-side
/// tools such as `web_search` are executed by the backend and never surface as
/// one. A request carrying only server tools therefore leaves the upstream with
/// no way to comply, which is how the reported request stalled instead of
/// answering.
#[must_use]
pub fn unsatisfiable_forced_tool_choice(tools: Option<&Value>, forced: bool) -> Option<String> {
    if !forced {
        return None;
    }
    let tools = tools?.as_array()?;
    if tools.is_empty() {
        return None;
    }
    let has_function = tools.iter().any(|tool| {
        let kind = tool.get("type").and_then(Value::as_str).unwrap_or("custom");
        !(kind.starts_with("web_search") || kind.starts_with("web_fetch"))
    });
    (!has_function).then(|| {
        "tool_choice requires a tool call, but the request offers only server-side tools that the \
         provider executes itself; use tool_choice auto or add a client tool"
            .to_string()
    })
}

/// Return why a server-tool request cannot be honoured as written.
///
/// Accepts either dialect's spelling of a forced tool call: Anthropic's
/// `{"type": "any"}` and `OpenAI`'s `"required"`.
#[must_use]
pub fn unhonourable_server_tool_request(
    tools: Option<&Value>,
    tool_choice: Option<&Value>,
) -> Option<String> {
    let forced = match tool_choice {
        Some(Value::String(mode)) => mode == "required",
        Some(choice) => choice.get("type").and_then(Value::as_str) == Some("any"),
        None => false,
    };
    unsatisfiable_forced_tool_choice(tools, forced)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn unknown_providers_are_never_assumed_unsupported() {
        let capabilities = upstream(UpstreamProvider::OpenAICompatible);
        assert_eq!(capabilities.temperature, Capability::Unknown);
        assert_eq!(capabilities.top_p, Capability::Unknown);
        assert_eq!(capabilities.web_search, Capability::Unknown);
    }

    #[test]
    fn matrix_distinguishes_server_tools_and_local_emulation() {
        let codex = subscription(SubscriptionProvider::Codex, Some("gpt-5.6-sol"));
        assert_eq!(codex.top_p, Capability::Unsupported);
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
        assert_eq!(claude.top_p, Capability::Native);
        assert_eq!(claude.temperature, Capability::Unsupported);
        assert_eq!(claude.output_token_limit, Capability::Native);
        assert!(claude_uses_adaptive_thinking(Some("claude-opus-5")));
        assert!(claude_uses_adaptive_thinking(Some("opus-4-7")));
        assert!(!claude_uses_adaptive_thinking(Some("claude-sonnet-4-5")));
        assert_eq!(claude.web_fetch, Capability::Native);
    }

    #[test]
    fn both_dialects_spell_a_forced_tool_call() {
        let server_only = serde_json::json!([
            {"type": "web_search_20250305", "name": "web_search", "max_uses": 1}
        ]);
        assert!(
            unhonourable_server_tool_request(
                Some(&server_only),
                Some(&serde_json::json!({"type": "any"}))
            )
            .is_some()
        );
        assert!(
            unhonourable_server_tool_request(
                Some(&server_only),
                Some(&serde_json::json!("required"))
            )
            .is_some()
        );
        assert!(
            unhonourable_server_tool_request(Some(&server_only), Some(&serde_json::json!("auto")))
                .is_none()
        );
        assert!(unhonourable_server_tool_request(Some(&server_only), None).is_none());
    }

    #[test]
    fn forcing_a_tool_call_with_only_server_tools_is_refused() {
        let server_only =
            serde_json::json!([{"type": "web_search_20250305", "name": "web_search"}]);
        assert!(unsatisfiable_forced_tool_choice(Some(&server_only), true).is_some());
        assert!(unsatisfiable_forced_tool_choice(Some(&server_only), false).is_none());
        let with_client_tool = serde_json::json!([
            {"type": "web_search"},
            {"name": "lookup", "input_schema": {"type": "object"}}
        ]);
        assert!(unsatisfiable_forced_tool_choice(Some(&with_client_tool), true).is_none());
        assert!(unsatisfiable_forced_tool_choice(None, true).is_none());
    }
}
