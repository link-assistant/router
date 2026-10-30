//! Independent native model projection oracle. SOURCE ONLY; UNRUN. CI after all JS gates.
use link_assistant_router::translation_core;
#[path = "../src/codex_catalog.rs"]
mod actual_native_catalog;
use actual_native_catalog::{ModelDescription, model_info};
#[test]
fn absent_reasoning_is_unknown_and_native_client_fields_are_retained() {
    let description = ModelDescription { id: "opaque-model", display_name: "opaque-model", owner: "z.ai", default_reasoning_level: None, supported_reasoning_levels: serde_json::json!([]) };
    let actual = model_info(&description, 3);
    assert_eq!(actual["slug"], "opaque-model");
    assert_eq!(actual["default_reasoning_level"], serde_json::Value::Null);
    assert_eq!(actual["supported_reasoning_levels"], serde_json::json!([]));
    assert_eq!(actual["priority"], 3);
    assert_eq!(actual["shell_type"], "unified_exec");
    assert_eq!(actual["truncation_policy"], serde_json::json!({"mode":"tokens", "limit":10000}));
    assert_eq!(actual["base_instructions"], "");
    assert_eq!(actual["experimental_supported_tools"], serde_json::json!([]));
}
