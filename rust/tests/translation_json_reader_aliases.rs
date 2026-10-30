//! Independent immutable alias/lexical scope oracle SOURCE. CI only; UNRUN.
use link_assistant_router::translation_core::{self, Json};

fn shadow(value: &Json) -> Option<&str> {
    let value = value.get("v");
    value.and_then(Json::as_str)
}

fn alias(value: &Json) -> Option<&str> {
    let child = value.get("v");
    child.and_then(Json::as_str)
}

fn scopes<'a>(value: &'a Json, other: &'a Json, inner: bool) -> Option<&'a str> {
    let child = value.get("v");
    if inner {
        let child = other.get("v");
        child.and_then(Json::as_str)
    } else {
        child.and_then(Json::as_str)
    }
}

#[test]
fn immutable_aliases_shadow_after_their_rhs_and_restore_after_inner_scopes() {
    for value in [
        translation_core::json!(null),
        translation_core::json!({}),
        translation_core::json!({"v": null}),
        translation_core::json!({"v": ""}),
        translation_core::json!({"v": "猫😀\0\r\n"}),
    ] {
        let other = translation_core::json!({"v": "other"});
        assert_eq!(shadow(&value), alias(&value));
        assert_eq!(alias(&value), value.get("v").and_then(Json::as_str));
        assert_eq!(scopes(&value, &other, false), alias(&value));
        assert_eq!(scopes(&value, &other, true), Some("other"));
        if let Some(text) = alias(&value) {
            let original = value.get("v").and_then(Json::as_str).expect("present");
            assert_eq!(text.as_ptr(), original.as_ptr());
        }
    }
}

#[test]
fn scalar_key_and_contextual_index_aliases_keep_their_actual_types() {
    let value = translation_core::json!({"v": ["猫😀"]});
    let key: &str = "v";
    let child: Option<&Json> = value.get(key);
    let array = child.and_then(Json::as_array).expect("present array");
    let index: usize = 0;
    assert_eq!(array.get(index).and_then(Json::as_str), Some("猫😀"));
    assert_eq!(
        value
            .get("v")
            .and_then(Json::as_array)
            .and_then(|items| items.get(0_usize))
            .and_then(Json::as_str),
        Some("猫😀")
    );
}
