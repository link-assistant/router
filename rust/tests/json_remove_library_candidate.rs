// CI-only bounded library ABI oracle; the default facade is unchanged.
#[path = "../src/translation_core/json_edit_candidate.rs"]
mod json_edit_candidate;
use json_edit_candidate::{JsonEdit, JsonEditSlot};
use serde_json::{Value, json};

fn original_remove(root: &mut Value, key: &str) {
    if let Some(object) = root.as_object_mut() {
        object.remove(key);
    }
}

// Explicit loan ABI, matching the emitted unit-returning JS leaf.
fn library_remove(loan: &mut JsonEdit<'_>, key: &str) {
    let _ = loan.remove_if_object(key);
}

#[test]
fn bounded_values_and_unicode_keys_match_the_original_closed_body() {
    let values = [
        json!(null),
        json!(true),
        json!(7),
        json!("text"),
        json!([null, {"a": 1}]),
        json!({}),
        json!({"": 1, "__proto__": 2, "é": [3], "😀": {"nested": true}}),
    ];
    for value in values {
        for key in ["missing", "", "__proto__", "é", "😀"] {
            let mut expected = value.clone();
            original_remove(&mut expected, key);
            let mut slot = JsonEditSlot::new(value.clone());
            slot.with_edit::<()>(|loan| library_remove(loan, key));
            assert_eq!(slot.snapshot(), expected);
        }
    }
}

#[test]
fn original_rust_accepts_values_outside_the_js_bounded_abi() {
    // This intentionally does NOT assert whole-domain Rust/JS equivalence.
    let value = Value::Array(vec![Value::Null; 4096]);
    let mut slot = JsonEditSlot::new(value.clone());
    slot.with_edit(|loan| library_remove(loan, "unused"));
    assert_eq!(slot.snapshot(), value);
}

#[test]
fn child_library_borrow_restores_parent_with_completed_removals() {
    let mut slot = JsonEditSlot::new(json!({"a": 1, "b": 2}));
    slot.with_edit(|parent| {
        parent.with_reborrow(|child| library_remove(child, "a"));
        library_remove(parent, "b");
    });
    assert_eq!(slot.snapshot(), json!({}));
}
