//! Provider-specific headers for subscription upstreams.

use super::{
    CODEX_RESPONSES_LITE_HEADER, CodexResponsesMode, SubscriptionProvider, SubscriptionToken,
};

pub(super) fn subscription_headers(
    provider: SubscriptionProvider,
    token: &SubscriptionToken,
    responses_mode: CodexResponsesMode,
) -> Vec<(&'static str, String)> {
    let mut out = Vec::new();
    if provider == SubscriptionProvider::Codex {
        let identity = crate::codex_identity::headers(token.account_id.as_deref());
        for name in ["user-agent", "originator", "chatgpt-account-id"] {
            if let Some(value) = identity.get(name).and_then(|value| value.to_str().ok()) {
                out.push((name, value.to_string()));
            }
        }
        out.push(("openai-beta", "responses=experimental".to_string()));
        if responses_mode == CodexResponsesMode::Lite {
            out.push((CODEX_RESPONSES_LITE_HEADER, "true".to_string()));
        }
        // Recent Codex models are gated by the CLI version header.
        out.push(("version", crate::codex_identity::client_version()));
    }
    out
}
