//! Independent REAL original policy nominal owners, not detached declarations.
//! Source only; new native and receiving cases remain UNRUN.
use link_assistant_router::client_policy::SubscriptionOverride;
use link_assistant_router::clients::ClientKind;
use link_assistant_router::subscription::SubscriptionProvider;

fn copied_overrides(input: &[SubscriptionOverride]) -> Vec<SubscriptionOverride> {
    input.iter().copied().collect()
}
fn override_clients(input: &[SubscriptionOverride]) -> Vec<ClientKind> {
    input.iter().copied().map(|row| row.client).collect()
}
fn override_providers(input: &[SubscriptionOverride]) -> Vec<SubscriptionProvider> {
    input.iter().copied().map(|row| row.provider).collect()
}
fn bounded_overrides(input: &[SubscriptionOverride]) -> Vec<SubscriptionOverride> {
    assert!(input.len() <= 4096, "explicit target receiving envelope");
    copied_overrides(input)
}
#[test]
fn actual_original_policy_owners_preserve_every_client_provider_pair_and_detached_carriers() {
    use ClientKind::{Agent, ClaudeCode, Codex, Cursor, GeminiCli, GrokCli, Opencode, QwenCode};
    use SubscriptionProvider::{Claude, Codex as CodexProvider, Gemini, Qwen};
    let clients = [Codex, ClaudeCode, Cursor, GeminiCli, GrokCli, Opencode, QwenCode, Agent];
    let providers = [Claude, CodexProvider, Gemini, Qwen];
    let input: Vec<_> = clients.iter().flat_map(|client| providers.iter().map(move |provider| SubscriptionOverride { client: *client, provider: *provider })).collect();
    assert_eq!(input.len(), 32);
    let result = bounded_overrides(&input);
    assert_eq!(result, input);
    assert_ne!(result.as_ptr(), input.as_ptr());
    assert_eq!(override_clients(&input), clients.iter().flat_map(|client| [*client; 4]).collect::<Vec<_>>());
    assert_eq!(override_providers(&input), clients.iter().flat_map(|_| providers).collect::<Vec<_>>());
    assert!(copied_overrides(&[]).is_empty());
    assert!(override_clients(&[]).is_empty());
    assert!(override_providers(&[]).is_empty());
    let full = vec![input[0]; 4096];
    assert_eq!(bounded_overrides(&full), full);
    assert_eq!(override_clients(&full), vec![Codex; 4096]);
    assert_eq!(override_providers(&full), vec![Claude; 4096]);
    assert!(std::panic::catch_unwind(|| bounded_overrides(&vec![input[0]; 4097])).is_err());
    // The original raw native signature remains unbounded outside this facade.
    assert_eq!(copied_overrides(&vec![input[0]; 4097]).len(), 4097);
}
