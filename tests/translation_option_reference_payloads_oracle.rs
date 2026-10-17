//! Native witnesses for shared-reference Option bodies, independent of the JS
//! checker implementation. UNRUN locally; Rust is gated by same-SHA JS CI.
use serde_json::{Value, json};
use std::cell::Cell;

struct Owner {
    text: String,
}

fn observed<'a>(value: &'a Owner, calls: &Cell<usize>) -> &'a Owner {
    calls.set(calls.get() + 1);
    value
}

#[test]
fn references_copy_without_copying_or_dropping_the_owned_string_record() {
    let first = Owner {
        text: "猫😀".into(),
    };
    let fallback = Owner {
        text: "fallback".into(),
    };
    let calls = Cell::new(0);
    for input in [None, Some(&first)] {
        let eager = input.unwrap_or(observed(&fallback, &calls));
        assert_eq!(calls.replace(0), 1);
        assert!(std::ptr::eq(
            eager,
            if input.is_some() { &first } else { &fallback }
        ));
        let lazy = input.unwrap_or_else(|| observed(&fallback, &calls));
        assert_eq!(calls.replace(0), usize::from(input.is_none()));
        assert!(std::ptr::eq(lazy, eager));
    }
    assert_eq!(first.text, "猫😀");
    assert_eq!(fallback.text, "fallback");
}

#[test]
fn nested_option_result_and_named_reference_identity_remain_distinct() {
    fn nested(value: Option<Option<&Owner>>) -> Result<Option<&Owner>, bool> {
        value.ok_or_else(|| false)
    }
    fn contextual(value: Option<&Owner>) -> Result<Option<&Owner>, bool> {
        value.map(Some).ok_or_else(|| false)
    }
    let owner = Owner {
        text: "Ω".into(),
    };
    assert!(matches!(nested(None), Err(false)));
    assert!(matches!(nested(Some(None)), Ok(None)));
    assert!(std::ptr::eq(
        nested(Some(Some(&owner))).unwrap().unwrap(),
        &owner
    ));
    assert!(std::ptr::eq(
        contextual(Some(&owner)).unwrap().unwrap(),
        &owner
    ));
    assert!(matches!(contextual(None), Err(false)));
}

#[test]
fn json_field_reference_borrows_its_value_and_not_the_short_lived_key() {
    fn field<'a>(value: &'a Value, key: &str) -> Option<&'a Value> {
        value.get(key)
    }
    let value = json!({"key": {"nested": [true, "猫😀"]}});
    let found = {
        let key = String::from("key");
        field(&value, &key).ok_or_else(|| false).unwrap()
    };
    assert!(std::ptr::eq(found, &value["key"]));
    assert!(value.as_object().ok_or(false).is_ok());
    for missing in [Value::Null, json!([]), json!({}), json!(true)] {
        assert!(matches!(field(&missing, "key").ok_or(false), Err(false)));
    }
}

#[test]
fn original_str_function_item_keeps_empty_unicode_and_none_behavior() {
    for value in ["", "Ω😀", "\0", "\u{200b}"] {
        assert_eq!(Some(value).is_none_or(str::is_empty), value.is_empty());
        assert_eq!(Some(value).is_some_and(str::is_empty), value.is_empty());
    }
    assert!(None::<&str>.is_none_or(str::is_empty));
    assert!(!None::<&str>.is_some_and(str::is_empty));
}
