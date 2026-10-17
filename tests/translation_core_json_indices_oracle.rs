//! Native oracle for fixed owned JSON borrowed projections.
//! UNRUN locally; execute only after the matching complete JS/TS CI gate.
use link_assistant_router::translation_core::{self, Json};

#[test]
fn value_keys_keep_identity_unicode_and_missing_null() {
    let value = translation_core::json!({"猫😀": {"nested": [true]}, "\0": false});
    let original = value.clone();
    assert!(std::ptr::eq(
        translation_core::json_index_str(&value, "猫😀"),
        &value["猫😀"],
    ));
    assert_eq!(
        translation_core::json_index_str(&value, "missing"),
        &Json::Null,
    );
    assert_eq!(
        translation_core::json_index_str(&value, "\0"),
        &Json::Bool(false),
    );
    assert_eq!(value, original);
    for scalar in [
        Json::Null,
        Json::Bool(false),
        translation_core::json!(4),
        translation_core::json!("text"),
    ] {
        assert_eq!(translation_core::json_index_str(&scalar, "key"), &Json::Null);
    }
}

#[test]
fn array_positions_preserve_existing_elements_and_usize_bounds() {
    let value = translation_core::json!([false, {"text": "Ω"}, null]);
    assert!(std::ptr::eq(
        translation_core::json_index_usize(&value, 1),
        &value[1],
    ));
    assert_eq!(translation_core::json_index_usize(&value, 3), &Json::Null);
    assert_eq!(
        translation_core::json_index_usize(&value, usize::MAX),
        &Json::Null,
    );
    assert_eq!(
        translation_core::json_index_usize(&Json::Bool(true), 0),
        &Json::Null,
    );
}

#[test]
fn map_missing_keys_panic_without_insertion() {
    let value = translation_core::json!({"key": null, "nested": {"v": true}});
    let original = value.clone();
    let map = value.as_object().unwrap();
    assert!(std::ptr::eq(
        translation_core::json_map_index(map, "nested"),
        &map["nested"],
    ));
    assert_eq!(translation_core::json_map_index(map, "key"), &Json::Null);
    let missing = std::panic::catch_unwind(|| translation_core::json_map_index(map, "absent"));
    assert!(missing.is_err());
    assert_eq!(translation_core::json_index_str(&value, "absent"), &Json::Null);
    assert_eq!(value, original);
}

#[test]
fn a_local_key_does_not_constrain_the_receiver_loan() {
    let value = translation_core::json!({"key": ["猫", "😀"]});
    let borrowed = {
        let key = String::from("key");
        translation_core::json_index_str(&value, &key)
    };
    assert!(std::ptr::eq(borrowed, &value["key"]));
    let map = value.as_object().unwrap();
    let from_map = {
        let key = String::from("key");
        translation_core::json_map_index(map, &key)
    };
    assert!(std::ptr::eq(from_map, borrowed));
}

#[test]
fn arguments_are_once_left_to_right_and_panic_stops_later_work() {
    use std::cell::RefCell;
    let trace = RefCell::new(Vec::new());
    let value = translation_core::json!({"key": true});
    let selected = translation_core::json_index_str(
        {
            trace.borrow_mut().push("value");
            &value
        },
        {
            trace.borrow_mut().push("key");
            "key"
        },
    );
    assert_eq!(selected, &Json::Bool(true));
    assert_eq!(&*trace.borrow(), &["value", "key"]);
    trace.borrow_mut().clear();
    let map = value.as_object().unwrap();
    let missing = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        let _ = translation_core::json_map_index(
            {
                trace.borrow_mut().push("map");
                map
            },
            {
                trace.borrow_mut().push("key");
                "absent"
            },
        );
        trace.borrow_mut().push("later");
    }));
    assert!(missing.is_err());
    assert_eq!(&*trace.borrow(), &["map", "key"]);
}
