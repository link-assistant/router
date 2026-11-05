//! Independent borrowed reader-chain oracle SOURCE. CI only; UNRUN.
use link_assistant_router::translation_core::{self, Json};

fn original_object<'a>(value: &'a Json, key: &str) -> Option<&'a str> {
    value
        .get("child")
        .and_then(Json::as_object)?
        .get(key)
        .and_then(Json::as_str)
}

fn expanded_object<'a>(value: &'a Json, key: &str) -> Option<&'a str> {
    let object = {
        let input = value.get("child");
        if let Some(payload) = input {
            Json::as_object(payload)
        } else {
            None
        }
    }?;
    let input = object.get(key);
    if let Some(payload) = input {
        Json::as_str(payload)
    } else {
        None
    }
}

fn original_array(value: &Json, index: usize) -> Option<&str> {
    value
        .get("child")
        .and_then(Json::as_array)?
        .get(index)
        .and_then(Json::as_str)
}

fn expanded_array(value: &Json, index: usize) -> Option<&str> {
    let array = {
        let input = value.get("child");
        if let Some(payload) = input {
            Json::as_array(payload)
        } else {
            None
        }
    }?;
    let input = array.get(index);
    if let Some(payload) = input {
        Json::as_str(payload)
    } else {
        None
    }
}

#[test]
fn both_borrowed_domains_preserve_absence_kinds_and_unicode() {
    for value in [
        translation_core::json!(null),
        translation_core::json!({}),
        translation_core::json!({"child": null}),
        translation_core::json!({"child": false}),
        translation_core::json!({"child": {"猫": "Ω😀\0"}}),
        translation_core::json!({"child": ["猫😀", "", null]}),
    ] {
        for key in ["猫", "missing", ""] {
            assert_eq!(original_object(&value, key), expanded_object(&value, key));
        }
        for index in [0, 1, 2, usize::MAX] {
            assert_eq!(original_array(&value, index), expanded_array(&value, index));
        }
    }
}

#[test]
fn scalar_and_collection_results_keep_the_original_borrowed_storage() {
    let value = translation_core::json!({"child": ["猫😀"]});
    let original = original_array(&value, 0).expect("present text");
    let expanded = expanded_array(&value, 0).expect("present text");
    assert_eq!(original.as_ptr(), expanded.as_ptr());
    let number = translation_core::json!(1.5);
    assert_eq!(Some(&number).and_then(Json::as_f64), Some(1.5));
    assert_eq!(
        Some(&number).and_then(Json::as_number),
        Json::as_number(&number)
    );
    assert_eq!(Some(&number).and_then(Json::as_array), None);
    assert_eq!(Some(&number).and_then(Json::as_object), None);
}
