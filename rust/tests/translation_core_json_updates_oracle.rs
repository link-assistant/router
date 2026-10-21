//! Independent native oracle for the owned JSON copy/update projection.
//! UNRUN locally; same-SHA JavaScript CI must pass before Rust executes.
use link_assistant_router::translation_core::{self, Json, Maybe, Str};

#[test]
fn copy_and_update_do_not_modify_the_original_or_the_inserted_value() {
    let original = translation_core::json!({"nested": [true, {"text": "猫😀"}], "key": false});
    let copied = translation_core::json_copy(&original);
    let inserted = translation_core::json!([1, "Ω"]);
    let updated = translation_core::json_with_field(copied, "key", inserted.clone());
    assert_eq!(original["key"], false);
    assert_eq!(updated["key"], inserted);
    assert_eq!(original["nested"], updated["nested"]);
    let mut copied = translation_core::json_copy(&original);
    copied["nested"][1]["text"] = translation_core::json!("changed");
    assert_eq!(original["nested"][1]["text"], "猫😀");
    assert_eq!(updated["nested"][1]["text"], "猫😀");
}

#[test]
fn null_is_promoted_replacements_are_unique_and_keys_keep_utf8_order() {
    let mut value = Json::Null;
    for key in ["𐀀", "\u{e000}", "a", "__proto__", "猫"] {
        value = translation_core::json_with_field(value, key, Json::Bool(true));
    }
    value = translation_core::json_with_field(value, "a", Json::Bool(false));
    assert_eq!(value["a"], false);
    let keys = value.as_object().unwrap().keys().map(String::as_str).collect::<Vec<_>>();
    assert_eq!(keys, ["__proto__", "a", "猫", "\u{e000}", "𐀀"]);
}

#[test]
fn non_object_non_null_bases_keep_the_indexing_panic_boundary() {
    for base in [translation_core::json!([]), translation_core::json!(1), Json::Bool(true)] {
        let outcome = std::panic::catch_unwind(|| {
            translation_core::json_with_field(base, "key", Json::Null)
        });
        assert!(outcome.is_err());
    }
}

#[test]
fn direct_operation_arguments_run_once_in_left_to_right_order() {
    use std::cell::RefCell;
    let tape = RefCell::new(Vec::new());
    let base = || { tape.borrow_mut().push("base"); Json::Null };
    let key = || { tape.borrow_mut().push("key"); "key" };
    let value = || { tape.borrow_mut().push("value"); Json::Bool(true) };
    let result = translation_core::json_with_field(base(), key(), value());
    assert_eq!(*tape.borrow(), ["base", "key", "value"]);
    assert_eq!(result, translation_core::json!({"key": true}));
}

fn original_optional(value: Maybe<&Str>) -> Maybe<Json> {
    let mut document = translation_core::json!({});
    document["key"] = translation_core::json!([value?]);
    Some(document)
}

fn adopted_optional(value: Maybe<&Str>) -> Maybe<Json> {
    let mut document = translation_core::json!({});
    {
        let computed = translation_core::json!([value?]);
        document = translation_core::json_with_field(document, "key", computed);
    }
    Some(document)
}

#[test]
fn assignment_adoption_keeps_enclosing_option_propagation_and_unicode() {
    for value in [None, Some(""), Some("e\u{301}猫😀")] {
        assert_eq!(original_optional(value), adopted_optional(value));
    }
    assert_eq!(adopted_optional(None), None);
}

#[test]
fn rhs_panics_before_an_invalid_assignee_is_evaluated() {
    use std::cell::Cell;
    fn fail(called: &Cell<bool>) -> Json {
        called.set(true);
        panic!("RHS-first")
    }
    fn original(called: &Cell<bool>) -> Json {
        let mut document = Json::Bool(false);
        document["key"] = fail(called);
        document
    }
    fn adopted(called: &Cell<bool>) -> Json {
        let mut document = Json::Bool(false);
        {
            let computed = fail(called);
            document = translation_core::json_with_field(document, "key", computed);
        }
        document
    }
    for operation in [original as fn(&Cell<bool>) -> Json, adopted as fn(&Cell<bool>) -> Json] {
        let called = Cell::new(false);
        let failure = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| operation(&called)));
        let error = failure.unwrap_err();
        assert!(called.get());
        assert_eq!(error.downcast_ref::<&str>(), Some(&"RHS-first"));
    }
}

#[test]
fn multiple_updates_preserve_conditional_fields_and_the_final_owned_return() {
    for include in [false, true] {
        let original = {
            let mut value = translation_core::json!({"before": true});
            value["first"] = translation_core::json!([false]);
            if include { value["second"] = translation_core::json!({"tail": "猫😀"}); }
            value
        };
        let adopted = {
            let mut value = translation_core::json!({"before": true});
            { let rhs = translation_core::json!([false]); value = translation_core::json_with_field(value, "first", rhs); }
            if include {
                let rhs = translation_core::json!({"tail": "猫😀"});
                value = translation_core::json_with_field(value, "second", rhs);
            }
            value
        };
        assert_eq!(original, adopted);
    }
}


fn original_shared_child(value: &Json) -> Json {
    if let Some(child) = value.get("strict") {
        child.clone()
    } else {
        Json::Null
    }
}

fn adopted_shared_child(value: &Json) -> Json {
    if let Some(child) = value.get("strict") {
        translation_core::json_copy(child)
    } else {
        Json::Null
    }
}

#[test]
fn shared_clone_adoption_pairs_keep_absent_null_unicode_and_independent_storage() {
    for original in [
        Json::Null,
        translation_core::json!({}),
        translation_core::json!({"strict": null}),
        translation_core::json!({"strict": true}),
        translation_core::json!({"strict": {"nested": ["猫😀", false]}}),
    ] {
        let snapshot = original.clone();
        assert_eq!(original_shared_child(&original), adopted_shared_child(&original));
        assert_eq!(original.clone(), translation_core::json_copy(&original));
        assert_eq!(original, snapshot);
    }
    let original = translation_core::json!({"strict": {"nested": ["猫😀"]}});
    let mut copied = adopted_shared_child(&original);
    copied["nested"][0] = translation_core::json!("changed");
    assert_eq!(original["strict"]["nested"][0], "猫😀");
}
