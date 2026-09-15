//! Codex model-catalog projection shared by process-local and HTTP discovery.

use serde_json::{Value, json};

/// Inputs retained from one authorized live catalog row.
pub(crate) struct ModelDescription<'a> {
    pub id: &'a str,
    pub display_name: &'a str,
    pub owner: &'a str,
    pub default_reasoning_level: Option<Value>,
    pub supported_reasoning_levels: Value,
}

/// Produce the `ModelInfo` shape accepted by current Codex clients.
///
/// The deprecated `base_instructions` field remains because Codex's own
/// serializer includes it for older clients. Empty instructions ask the client
/// to use its built-in fallback without inventing model-specific behavior.
pub(crate) fn model_info(model: ModelDescription<'_>, priority: usize) -> Value {
    json!({
        "slug": model.id,
        "display_name": model.display_name,
        "description": format!("{} via Link.Assistant.Router", model.owner),
        "default_reasoning_level": model.default_reasoning_level,
        "supported_reasoning_levels": model.supported_reasoning_levels,
        "shell_type": "unified_exec",
        "visibility": "list",
        "supported_in_api": true,
        "priority": i32::try_from(priority).unwrap_or(i32::MAX),
        "availability_nux": null,
        "upgrade": null,
        "support_verbosity": false,
        "default_verbosity": null,
        "apply_patch_tool_type": "freeform",
        "truncation_policy": {"mode": "tokens", "limit": 10_000},
        "experimental_supported_tools": [],
        "base_instructions": ""
    })
}
