//! Independent native oracle source. Gated CI only; never run Rust locally.
use link_assistant_router::translation_core::Json;
use link_assistant_router::translation_state_core::*;

#[test]
fn array_updates_preserve_order_and_owned_input_independence() {
    let original = Json::Array(vec![Json::Bool(false)]);
    let value = Json::String("λ😀".into());
    assert_eq!(json_with_index(original.clone(), 0, value.clone()), Json::Array(vec![value.clone()]));
    assert_eq!(json_append(original.clone(), value.clone()), Json::Array(vec![Json::Bool(false), value.clone()]));
    assert_eq!(json_extend(original.clone(), &[value.clone(), Json::Null]), Json::Array(vec![Json::Bool(false), value.clone(), Json::Null]));
    assert_eq!(json_extend_owned(original.clone(), vec![value.clone()]), Json::Array(vec![Json::Bool(false), value]));
    assert_eq!(original, Json::Array(vec![Json::Bool(false)]));
}

#[test]
fn vector_bridges_retain_empty_and_owned_values() {
    let values = vec![Json::Null, Json::String("λ😀".into()), Json::Bool(false)];
    let mut copied = json_values_copy(&values);
    copied[1] = Json::String("changed".into());
    assert_eq!(values[1], Json::String("λ😀".into()));
    assert_eq!(json_into_values(json_from_values(values.clone())), values);
    assert_eq!(json_from_values(Vec::new()), Json::Array(Vec::new()));
}

#[test]
fn object_updates_keep_null_collision_and_native_key_semantics() {
    let original: Json = serde_json::json!({"old":false,"😀":"supplementary","\u{e000}":"bmp"});
    let patch: Json = serde_json::json!({"old":"changed","new":null});
    assert_eq!(json_without_field(Json::Null, "missing"), Json::Null);
    assert_eq!(json_without_field(original.clone(), "old"), serde_json::json!({"😀":"supplementary","\u{e000}":"bmp"}));
    assert_eq!(json_merge(original.clone(), &patch), serde_json::json!({"old":"changed","new":null,"😀":"supplementary","\u{e000}":"bmp"}));
    assert_eq!(json_merge(Json::Null, &serde_json::json!({})), serde_json::json!({}));
    assert_eq!(json_object_keys(&original), serde_json::json!(["old","\u{e000}","😀"]));
    assert!(json_object_has(&original, "old"));
    for value in [Json::Null, Json::Bool(false), Json::Array(Vec::new())] { assert!(!json_object_has(&value, "old")); }
    assert_eq!(json_array_len(&Json::Array(vec![Json::Null, Json::Bool(false)])), 2);
}

#[test]
fn malformed_native_kind_and_index_cases_panic() {
    assert!(std::panic::catch_unwind(|| json_with_index(Json::Array(vec![Json::Null]), 1, Json::Null)).is_err());
    assert!(std::panic::catch_unwind(|| json_with_index(Json::Array(vec![Json::Null]), u64::MAX, Json::Null)).is_err());
    assert!(std::panic::catch_unwind(|| json_append(Json::Null, Json::Null)).is_err());
    assert!(std::panic::catch_unwind(|| json_without_field(Json::Array(Vec::new()), "x")).is_err());
    assert!(std::panic::catch_unwind(|| json_merge(serde_json::json!({}), &Json::Null)).is_err());
    assert!(std::panic::catch_unwind(|| json_object_keys(&Json::Null)).is_err());
    assert!(std::panic::catch_unwind(|| json_into_values(Json::Null)).is_err());
}
