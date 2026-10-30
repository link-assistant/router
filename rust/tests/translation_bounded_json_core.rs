//! Independent bounded canonical JSON library oracle. CI after all JS gates.
use link_assistant_router::translation_json_core::{json_checked_copy, json_checked_with_field, json_validate};
use serde_json::{json, Value};
fn nested(count: usize) -> Value {
    let mut value = Value::Null;
    for _ in 0..count { value = Value::Array(vec![value]); }
    value
}
#[test]
fn copy_preserves_canonical_values_and_independent_nested_buffers() {
    let original = json!({"Ω": ["😀", null]});
    json_validate(&original);
    let copied = json_checked_copy(&original);
    assert_eq!(copied, original);
    assert_ne!(copied["Ω"].as_array().unwrap().as_ptr(), original["Ω"].as_array().unwrap().as_ptr());
}
#[test]
fn exact_root_inclusive_node_and_depth_boundaries() {
    let at_limit = Value::Array(vec![Value::Null; 4095]);
    let too_many = Value::Array(vec![Value::Null; 4096]);
    json_validate(&at_limit);
    json_validate(&nested(32));
    assert!(std::panic::catch_unwind(|| json_validate(&too_many)).is_err());
    assert!(std::panic::catch_unwind(|| json_validate(&nested(33))).is_err());
    assert!(std::panic::catch_unwind(|| json_checked_copy(&too_many)).is_err());
}

#[test]
fn updates_validate_the_combined_result_and_preserve_both_inputs() {
    let base = json!({"old": null});
    let value = json!(["Ω😀"]);
    let result = json_checked_with_field(&base, "new", &value);
    assert_eq!(base, json!({"old": null}));
    assert_eq!(value, json!(["Ω😀"]));
    assert_eq!(result, json!({"old": null, "new": ["Ω😀"]}));
    let array = Value::Array(vec![Value::Null; 2047]);
    let large = json!({"left": array.clone()});
    assert!(std::panic::catch_unwind(|| json_checked_with_field(&large, "right", &array)).is_err());
}
