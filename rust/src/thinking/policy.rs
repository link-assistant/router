//! Preserve unconstrained target controls across the account policy retry loop.
use super::ThinkingProtocol;
use serde_json::{Map, Value};

/// Only configuration fields are saved; replay history remains owned by dispatch.
#[derive(Clone)]
pub struct RetryControls {
    fields: Map<String, Value>,
    protocol: ThinkingProtocol,
    origin: ThinkingProtocol,
    from_suffix: bool,
}

const fn keys(protocol: ThinkingProtocol) -> &'static [&'static str] {
    match protocol {
        ThinkingProtocol::Anthropic | ThinkingProtocol::Kimi => &["thinking", "output_config"],
        ThinkingProtocol::OpenAIChat | ThinkingProtocol::Qwen => &[
            "reasoning_effort",
            "reasoning",
            "enable_thinking",
            "thinking_budget",
        ],
        ThinkingProtocol::OpenAIResponses | ThinkingProtocol::Codex | ThinkingProtocol::Xai => {
            &["reasoning"]
        }
        ThinkingProtocol::Gemini | ThinkingProtocol::Vertex | ThinkingProtocol::Antigravity => {
            &["generationConfig", "generation_config"]
        }
        ThinkingProtocol::Interactions => &["thinking_level", "thinking_budget"],
    }
}

/// Capture before the first account can clamp or drop controls, even if its
/// catalog is unknown. Later attempts must not replace this original intent.
pub(super) fn remember(
    body: &Value,
    protocol: ThinkingProtocol,
    origin: ThinkingProtocol,
    from_suffix: bool,
) {
    if let Some(scope) = crate::account_policy_scope::current() {
        scope
            .thinking
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner)
            .get_or_insert_with(|| RetryControls {
                fields: keys(protocol)
                    .iter()
                    .filter_map(|key| body.get(*key).map(|value| ((*key).into(), value.clone())))
                    .collect(),
                protocol,
                origin,
                from_suffix,
            });
    }
}

/// Restore target controls after account-bound history is stripped, then use
/// the newly selected account's exact capability evidence before sending.
pub fn revalidate(
    scope: &crate::account_policy_scope::PolicyRequest,
    selected: &crate::accounts::SelectedSubscriptionAccount,
    body: &mut Value,
    model: &str,
) -> Result<(), String> {
    let controls = scope
        .thinking
        .lock()
        .unwrap_or_else(std::sync::PoisonError::into_inner)
        .clone();
    let Some(controls) = controls else {
        return Ok(());
    };
    let body = if matches!(
        controls.protocol,
        ThinkingProtocol::Gemini | ThinkingProtocol::Vertex
    ) && body.get("request").is_some_and(Value::is_object)
    {
        body.get_mut("request").expect("Code Assist request object")
    } else {
        body
    };
    if let Some(object) = body.as_object_mut() {
        for key in keys(controls.protocol) {
            match controls.fields.get(*key) {
                Some(value) => {
                    object.insert((*key).into(), value.clone());
                }
                None => {
                    object.remove(*key);
                }
            }
        }
    }
    let provider = scope
        .state
        .account_router
        .as_ref()
        .expect("policy pool")
        .provider();
    let base = if provider == crate::subscription::SubscriptionProvider::Claude {
        scope.state.upstream_base_url.clone()
    } else {
        scope
            .state
            .subscription_base_url
            .clone()
            .unwrap_or_else(|| selected.token.base_url(provider))
    };
    super::apply_for_account(
        &scope.state,
        body,
        model,
        provider,
        &selected.name,
        &base,
        controls.protocol,
        controls.origin,
        controls.from_suffix,
    )?;
    Ok(())
}
