//! Codex transport tests for temporary client launches.
//!
//! Split from `with_command_tests.rs` to stay inside the repository's
//! per-file line limit.

use super::*;

/// Issue #578: z.ai's Responses adapter is HTTP/SSE-only. Codex must not try
/// its WebSocket transport merely because the same authorized catalog also
/// contains an OpenAI-owned model.
#[test]
fn codex_selected_zai_model_disables_websocket_transport() {
    let models = [
        RouterModel {
            id: "gpt-live".to_string(),
            owned_by: crate::clients::OPENAI_MODEL_OWNER.to_string(),
            default_reasoning_level: Some("high".to_string()),
            supported_reasoning_levels: Some(vec![crate::clients::RouterReasoningLevel {
                effort: "high".to_string(),
                description: "Deep reasoning".to_string(),
            }]),
            ..RouterModel::default()
        },
        RouterModel {
            id: "glm-4.5".to_string(),
            owned_by: crate::clients::ZAI_MODEL_OWNER.to_string(),
            default_reasoning_level: Some("max".to_string()),
            supported_reasoning_levels: Some(vec![crate::clients::RouterReasoningLevel {
                effort: "max".to_string(),
                description: "Deep reasoning".to_string(),
            }]),
            ..RouterModel::default()
        },
    ];
    let prepared = TemporaryClient::prepare(&Preparation {
        client: ClientKind::Codex,
        base_url: "http://router.test",
        token: "task-token",
        model_override: Some("glm-4.5"),
        models: &models,
        isolated_config: false,
        extend_user_configuration: false,
        one_shot: true,
        user_model_selection: None,
        profile_root: None,
        codex_reasoning_effort: None,
        codex_backend_base_url: None,
        ca_cert: None,
    })
    .expect("prepare selected z.ai model");
    let provider = prepared
        .command
        .get_args()
        .map(|argument| argument.to_string_lossy())
        .find(|argument| argument.starts_with("model_providers."))
        .expect("process-local model provider");
    assert!(
        provider.contains("supports_websockets = false"),
        "{provider}"
    );

    let isolated = TemporaryClient::prepare(&Preparation {
        client: ClientKind::Codex,
        base_url: "http://router.test",
        token: "task-token",
        model_override: Some("glm-4.5"),
        models: &models,
        isolated_config: true,
        extend_user_configuration: false,
        one_shot: true,
        user_model_selection: None,
        profile_root: None,
        codex_reasoning_effort: None,
        codex_backend_base_url: None,
        ca_cert: None,
    })
    .expect("prepare isolated selected z.ai model");
    let config = std::fs::read_to_string(isolated.directory.path().join(".codex/config.toml"))
        .expect("read isolated Codex configuration");
    assert!(config.contains("supports_websockets = false"), "{config}");
}
