// CI-only oracle source; no local Rust execution. The candidate facade is unused.
#[path = "../src/translation_core/json_edit_candidate.rs"]
mod json_edit_candidate;
use json_edit_candidate::JsonEditSlot;
use serde_json::json;
use std::panic::{AssertUnwindSafe, catch_unwind};

#[test]
fn no_op_remove_owned_return_and_unicode_keys() {
    for value in [json!(null), json!(true), json!([1]), json!("text"), json!(2)] {
        let mut slot = JsonEditSlot::new(value.clone());
        assert_eq!(slot.with_edit(|loan| loan.remove_if_object("x")), None);
        assert_eq!(slot.snapshot(), value);
    }
    let mut slot = JsonEditSlot::new(json!({"": 1, "__proto__": 2, "é": [3]}));
    assert_eq!(slot.with_edit(|loan| loan.remove_if_object("missing")), None);
    assert_eq!(slot.with_edit(|loan| loan.remove_if_object("é")), Some(json!([3])));
    assert_eq!(slot.snapshot(), json!({"": 1, "__proto__": 2}));
}

#[test]
fn return_err_and_unwind_preserve_completed_edits() {
    let mut slot = JsonEditSlot::new(json!({"a": 1, "b": 2, "c": 3}));
    let result: Result<(), &str> = slot.with_edit(|loan| {
        loan.remove_if_object("a");
        Err("after first edit")
    });
    assert_eq!(result, Err("after first edit"));
    assert_eq!(slot.snapshot(), json!({"b": 2, "c": 3}));
    assert!(catch_unwind(AssertUnwindSafe(|| slot.with_edit::<()>(|loan| {
        loan.remove_if_object("b");
        panic!("after second edit");
    }))).is_err());
    assert_eq!(slot.snapshot(), json!({"c": 3}));
}

#[test]
fn nested_reborrow_releases_parent_and_child_at_lexical_exit() {
    let mut slot = JsonEditSlot::new(json!({"a": 1, "b": 2}));
    slot.with_edit(|parent| {
        parent.with_reborrow(|child| assert_eq!(child.remove_if_object("a"), Some(json!(1))));
        assert_eq!(parent.remove_if_object("b"), Some(json!(2)));
    });
    assert_eq!(slot.snapshot(), json!({}));
}
