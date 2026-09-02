//! Contract tests for the policy-gated z.ai GLM Coding Plan provider (#390).

use crate::client_policy::ClientProtocol;
use crate::clients::ClientKind;
use crate::zai_coding_plan::{
    ANTHROPIC_BASE_PATH, CHAT_BASE_PATH, RESPONSES_BASE_PATH, ZaiCodingPlanPolicy,
    registry_for_client,
};

#[test]
fn provider_is_disabled_until_intermediary_risk_is_acknowledged() {
    let disabled = ZaiCodingPlanPolicy::new("subscriber-a", false, &[])
        .expect("a disabled policy remains valid");
    assert!(disabled.authorize(ClientKind::ClaudeCode, "subscriber-a").is_err());

    let enabled = ZaiCodingPlanPolicy::new("subscriber-a", true, &[])
        .expect("an acknowledged policy is valid");
    assert!(enabled.authorize(ClientKind::ClaudeCode, "subscriber-a").is_ok());
    assert!(enabled.authorize(ClientKind::Codex, "subscriber-a").is_ok());
    assert!(enabled.authorize(ClientKind::Opencode, "subscriber-a").is_ok());
}

#[test]
fn unsupported_client_acknowledgement_is_exact_and_revocable() {
    let denied = ZaiCodingPlanPolicy::new("subscriber-a", true, &[]).unwrap();
    assert!(denied.authorize(ClientKind::GeminiCli, "subscriber-a").is_err());

    let gemini = ZaiCodingPlanPolicy::new("subscriber-a", true, &["gemini".into()]).unwrap();
    assert!(gemini.authorize(ClientKind::GeminiCli, "subscriber-a").is_ok());
    assert!(gemini.authorize(ClientKind::GrokCli, "subscriber-a").is_err());
    assert!(gemini.authorize(ClientKind::QwenCode, "subscriber-a").is_err());
    assert!(gemini.authorize(ClientKind::Agent, "subscriber-a").is_err());
    assert!(gemini.authorize(ClientKind::Cursor, "subscriber-a").is_err());
}

#[test]
fn coding_plan_is_single_subscriber_only() {
    let policy = ZaiCodingPlanPolicy::new("subscriber-a", true, &[]).unwrap();
    let error = policy
        .authorize(ClientKind::Codex, "subscriber-b")
        .expect_err("another principal must fail closed");
    assert!(error.contains("subscriber"));
}

#[test]
fn registries_are_explicit_client_specific_and_canonical() {
    let claude = registry_for_client(ClientKind::ClaudeCode, &["glm-5", "glm-4.7"]).unwrap();
    assert!(claude.iter().all(|entry| {
        (entry.exposed_id.starts_with("claude") || entry.exposed_id.starts_with("anthropic"))
            && entry.owner == "z.ai"
            && entry.protocol == ClientProtocol::AnthropicMessages
            && entry.canonical_id.starts_with("glm-")
    }));
    assert!(claude.iter().all(|entry| entry.display_name.is_some()));

    let codex = registry_for_client(ClientKind::Codex, &["glm-5"]).unwrap();
    assert_eq!(codex[0].exposed_id, "z.ai/glm-5");
    assert_eq!(codex[0].canonical_id, "glm-5");
    assert_eq!(codex[0].protocol, ClientProtocol::OpenAIResponses);

    let opencode = registry_for_client(ClientKind::Opencode, &["glm-5"]).unwrap();
    assert_eq!(opencode[0].protocol, ClientProtocol::OpenAIChat);

    assert!(registry_for_client(ClientKind::Codex, &["glm-future-unreviewed"]).is_err());
}

#[test]
fn aliases_are_exact_and_never_prefix_stripped() {
    let registry = registry_for_client(ClientKind::ClaudeCode, &["glm-5"]).unwrap();
    assert_eq!(
        registry.iter().find(|entry| entry.exposed_id == "claude-zai-glm-5").unwrap().canonical_id,
        "glm-5"
    );
    assert!(registry.iter().all(|entry| entry.exposed_id != "claude-glm-unknown"));
}

#[test]
fn protocol_endpoints_are_fixed_to_coding_plan_roots() {
    assert_eq!(ANTHROPIC_BASE_PATH, "/api/anthropic");
    assert_eq!(CHAT_BASE_PATH, "/api/coding/paas/v4");
    assert_eq!(RESPONSES_BASE_PATH, "/api/v1");
}
