//! Independent native canonical constructor oracle. CI after all eight JS gates.
use link_assistant_router::translation_json_core::{
    json_build_array, json_build_bool, json_build_i64, json_build_null,
    json_build_object, json_build_string, json_build_u64, json_checked_with_field,
};
use serde_json::{json, Value};
#[test]
fn canonical_scalar_boundaries_preserve_exact_rust_values() {
    assert_eq!(json_build_null(), Value::Null);
    assert_eq!(json_build_bool(false), json!(false));
    assert_eq!(json_build_string("Ω😀"), json!("Ω😀"));
    assert_eq!(json_build_u64(u64::MAX), json!(u64::MAX));
    assert_eq!(json_build_i64(i64::MIN), json!(i64::MIN));
    assert_eq!(json_build_i64(i64::MAX), json!(i64::MAX));
}
#[test]
fn the_added_array_root_participates_in_node_and_depth_budgets() {
    let bounded = json_build_array(vec![Value::Null; 4095]);
    assert_eq!(bounded.as_array().unwrap().len(), 4095);
    assert!(std::panic::catch_unwind(|| json_build_array(vec![Value::Null; 4096])).is_err());
    let mut value = Value::Null;
    for _ in 0..32 { value = Value::Array(vec![value]); }
    assert!(std::panic::catch_unwind(|| json_build_array(vec![value])).is_err());
}
#[test]
fn empty_object_and_ordered_field_updates_match_canonical_native_objects() {
    let empty = json_build_object();
    assert_eq!(empty, json!({}));
    let updated = json_checked_with_field(&empty, "Ω😀", &json_build_string("text"));
    assert_eq!(empty, json!({}));
    assert_eq!(updated, json!({"Ω😀":"text"}));
}
