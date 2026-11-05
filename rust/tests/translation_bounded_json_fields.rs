//! Independent bulk canonical JSON object oracle. CI after eight JS gates.
use link_assistant_router::translation_json_core::{json_build_array, json_build_fields, json_build_string};
use serde_json::{json, Value};
#[test]
fn bulk_object_preserves_values_and_canonical_key_order() {
    let keys = json!(["z", "Ω😀", "a"]);
    let result = json_build_fields(&keys, vec![Value::Null, json!(["text"]), json!(true)]);
    assert_eq!(keys, json!(["z", "Ω😀", "a"]));
    assert_eq!(result, json!({"z": null, "Ω😀": ["text"], "a": true}));
}
#[test]
fn complete_root_budget_accepts_4095_fields() {
    let keys = json_build_array((0..4095).map(|index| json_build_string(&format!("key{index:04}"))).collect());
    let result = json_build_fields(&keys, vec![Value::Null; 4095]);
    assert_eq!(result.as_object().unwrap().len(), 4095);
}
#[test]
fn key_layout_duplicates_and_arity_are_independent_refusals() {
    for keys in [Value::Null, json!([null]), json!([])] {
        assert!(std::panic::catch_unwind(|| json_build_fields(&keys, vec![Value::Null])).is_err());
    }
    assert!(std::panic::catch_unwind(|| json_build_fields(&json!(["same", "same"]), vec![Value::Null, Value::Null])).is_err());
}
