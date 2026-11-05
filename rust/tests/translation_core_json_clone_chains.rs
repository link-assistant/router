//! Independent native oracle SOURCE. CI only after all JavaScript gates; UNRUN.
use link_assistant_router::translation_core::{self, Json};

fn original(value: Option<&Json>) -> Option<Json> {
    value.cloned()
}

fn canonical(value: Option<&Json>) -> Option<Json> {
    let input = value;
    if let ::core::option::Option::Some(payload) = input {
        ::core::option::Option::Some(::core::clone::Clone::clone(payload))
    } else {
        ::core::option::Option::None
    }
}

fn owned(value: Option<&Json>) -> Option<Json> {
    let input = value;
    if let translation_core::Maybe::Some(payload) = input {
        translation_core::Maybe::Some(translation_core::json_copy(payload))
    } else {
        translation_core::Maybe::None
    }
}

#[test]
fn missing_null_empty_and_nested_values_keep_optional_copy_semantics() {
    assert_eq!(original(None), canonical(None));
    assert_eq!(original(None), owned(None));
    for value in [
        translation_core::json!(null),
        translation_core::json!(""),
        translation_core::json!([]),
        translation_core::json!({}),
        translation_core::json!({"猫😀": [false, null, {"text": "Ω\0\r\n"}]}),
    ] {
        assert_eq!(original(Some(&value)), canonical(Some(&value)));
        assert_eq!(original(Some(&value)), owned(Some(&value)));
        let wrapper = translation_core::json!({"child": value});
        assert_eq!(wrapper.get("child").cloned(), owned(wrapper.get("child")));
        assert_eq!(wrapper.get("absent").cloned(), owned(wrapper.get("absent")));
    }
}

#[test]
fn copy_owns_nested_storage_and_evaluates_the_receiver_once() {
    let mut source = translation_core::json!({"child": {"list": ["猫😀"]}});
    let mut visits = 0;
    let copied = {
        let input = {
            visits += 1;
            source.get("child")
        };
        if let Some(payload) = input {
            Some(translation_core::json_copy(payload))
        } else {
            None
        }
    };
    assert_eq!(visits, 1);
    source["child"]["list"][0] = translation_core::json!("changed");
    assert_eq!(copied, Some(translation_core::json!({"list": ["猫😀"]})));
}

fn original_chain(value: &Json) -> Option<Json> {
    Some(value.get("child")?.get("leaf")?.clone())
}

fn owned_chain(value: &Json) -> Option<Json> {
    Some(translation_core::json_copy(value.get("child")?.get("leaf")?))
}

#[test]
fn nested_try_chain_short_circuits_before_the_owned_copy() {
    for value in [
        translation_core::json!(null),
        translation_core::json!({}),
        translation_core::json!({"child": null}),
        translation_core::json!({"child": {"leaf": null}}),
        translation_core::json!({"child": {"leaf": ["Ω", false]}}),
    ] {
        assert_eq!(original_chain(&value), owned_chain(&value));
    }
}
