//! Independent JSON scalar defaults oracle SOURCE. Gated native CI only, UNRUN.
use link_assistant_router::{translation_core::Json, translation_json_fields_core as fields};

#[test]
fn original_and_selected_scalar_fallbacks_preserve_every_native_boundary() {
    let values = [Json::Null, serde_json::json!({}), serde_json::json!({"v":false}), serde_json::json!({"v":true}), serde_json::json!({"v":0}), serde_json::json!({"v":u64::MAX}), serde_json::json!({"v":i64::MIN}), serde_json::json!({"v":i64::MAX}), serde_json::json!({"v":"wrong"})];
    for value in values {
        for other in [false, true] {
            assert_eq!(fields::json_bool_field_or(&value, "v", other), value.get("v").and_then(Json::as_bool).unwrap_or(other));
        }
        for other in [0, 7, u64::MAX] {
            assert_eq!(fields::json_u64_field_or(&value, "v", other), value.get("v").and_then(Json::as_u64).unwrap_or(other));
        }
        for other in [i64::MIN, -7, 0, i64::MAX] {
            assert_eq!(fields::json_i64_field_or(&value, "v", other), value.get("v").and_then(Json::as_i64).unwrap_or(other));
        }
        assert_eq!(fields::json_bool_field_or(&value, "v", false), value.get("v").and_then(Json::as_bool).unwrap_or_default());
        assert_eq!(fields::json_u64_field_or(&value, "v", 0), value.get("v").and_then(Json::as_u64).unwrap_or_default());
        assert_eq!(fields::json_i64_field_or(&value, "v", 0), value.get("v").and_then(Json::as_i64).unwrap_or_default());
    }
    let value = serde_json::json!({"v":false});
    let mut calls = 0;
    let result = fields::json_bool_field_or(&value, "v", { calls += 1; true });
    assert!(!result);
    assert_eq!(calls, 1);
}
