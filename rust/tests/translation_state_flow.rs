//! Independent oracle source. CI only after all same-SHA JavaScript stages.
use link_assistant_router::translation_core::{json_copy, json_map, Json};
use link_assistant_router::translation_collections_core::{json_any, json_filter};
use link_assistant_router::translation_state_core::{json_append, json_from_values, json_merge, json_without_field};

#[test]
fn owned_reassignment_preserves_old_snapshot_and_conditional_update() {
    let original: Json = serde_json::json!({"keep":"λ😀","drop":false});
    let mut next = json_copy(&original);
    let snapshot = json_copy(&next);
    if true { next = json_without_field(next, "drop"); }
    next = json_merge(next, &serde_json::json!({"new":null}));
    assert_eq!(next, serde_json::json!({"keep":"λ😀","new":null}));
    assert_eq!(snapshot, original);
}

fn early(base: &Json, value: &Json, enabled: bool) -> Json {
    let mut next = json_copy(base);
    if enabled {
        next = json_append(next, json_copy(value));
        return next;
    }
    json_append(next, Json::Null)
}

#[test]
fn early_return_selects_only_its_actual_update() {
    let original = Json::Array(Vec::new());
    assert_eq!(early(&original, &Json::Bool(false), true), serde_json::json!([false]));
    assert_eq!(early(&original, &Json::Bool(false), false), serde_json::json!([null]));
    assert_eq!(original, Json::Array(Vec::new()));
}

#[test]
fn nested_callbacks_keep_shadowed_binding_and_capture_identity() {
    let values = vec![Json::Null, Json::Bool(false), Json::String(String::new())];
    let selected = json_filter(&values, |_value| json_any(&values, |value| !value.is_null()));
    assert_eq!(selected, values);
    let repeated = json_map(&values, |_value| {
        let inner = json_map(&values, |value| json_copy(value));
        json_from_values(inner)
    });
    assert_eq!(repeated, vec![serde_json::json!([null,false,""]); 3]);
    assert!(json_filter(&[Json::Null], |_value| json_any(&[Json::Null], |value| !value.is_null())).is_empty());
}
