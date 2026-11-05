//! Independent loop oracle SOURCE. Execute only in same-SHA JS-gated CI.
use link_assistant_router::translation_core::Json;
use link_assistant_router::translation_state_core::{json_append, json_values_copy};

fn accumulated(values: &[Json], initial: Json) -> Json {
    let mut result = initial;
    let snapshot = json_values_copy(values);
    for value in &snapshot {
        result = json_append(result, value.clone());
    }
    result
}

#[test]
fn empty_and_ordered_updates_keep_fallback_and_iteration_order() {
    assert_eq!(accumulated(&[], serde_json::json!([])), serde_json::json!([]));
    let values = [Json::Null, Json::Bool(false), Json::String("λ😀".to_owned())];
    assert_eq!(accumulated(&values, serde_json::json!([])), serde_json::json!([null, false, "λ😀"]));
}

#[test]
fn reassigning_the_original_vector_does_not_change_its_iteration_snapshot() {
    let mut active = vec![Json::Null, Json::Bool(false)];
    let snapshot = json_values_copy(&active);
    let mut observed = Vec::new();
    for value in &snapshot {
        active = Vec::new();
        observed.push(value.clone());
    }
    assert!(active.is_empty());
    assert_eq!(observed, vec![Json::Null, Json::Bool(false)]);
}
