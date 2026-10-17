//! Independent native shared-reader/owned-output behavior. UNRUN locally;
//! Rust CI remains gated by all required JavaScript stages at the same SHA.
use link_assistant_router::translation_core::{self as core, Json, Maybe, Str};

fn build(input: &Json, flag: bool) -> Json {
    let mut output = core::json!({"start": true});
    if let Some(child) = input.get("child") {
        output = core::json_with_field(output, "child", core::json_copy(child));
    }
    if flag {
        output = core::json_with_field(output, "flag", core::json!(true));
    }
    output
}

#[test]
fn input_loan_does_not_borrow_the_separate_output() {
    let input = core::json!({"child": {"text": "猫😀", "nested": [true]}});
    let before = core::json_copy(&input);
    for flag in [false, true] {
        let mut expected = core::json!({"start": true, "child": input["child"]});
        if flag {
            expected["flag"] = core::json!(true);
        }
        assert_eq!(build(&input, flag), expected);
        assert_eq!(input, before);
    }
}

fn optional(input: Maybe<&Json>) -> Maybe<Json> {
    let Some(input) = input else { return None };
    let Some(value) = input.get("data") else { return None };
    let mut output = core::json!({});
    output = core::json_with_field(output, "data", core::json_copy(value));
    Some(output)
}

#[test]
fn option_reference_patterns_preserve_none_and_copy_the_present_payload() {
    assert_eq!(optional(None), None);
    assert_eq!(optional(Some(&core::json!({}))), None);
    let input = core::json!({"data": [false, "Ω😀"]});
    assert_eq!(optional(Some(&input)), Some(core::json!({"data": [false, "Ω😀"]})));
    assert_eq!(input, core::json!({"data": [false, "Ω😀"]}));
}

#[test]
fn object_and_string_views_keep_their_actual_receiver() {
    let input = core::json!({"data": {"text": "猫"}});
    let object = input.as_object().unwrap();
    let value = object.get("data").unwrap();
    assert!(std::ptr::eq(value, &input["data"]));
    let text = core::json!("猫😀");
    let view = text.as_str().unwrap();
    assert_eq!(
        core::json!({"text": view, "source": core::json_copy(&text)}),
        core::json!({"text": "猫😀", "source": "猫😀"})
    );
}

fn branched(left: &Json, right: &Json, flag: bool) -> Maybe<Json> {
    let selected = if flag { left.get("pick") } else { right.get("pick") };
    let Some(selected) = selected else { return None };
    Some(core::json_copy(selected))
}

#[test]
fn branch_results_copy_the_selected_input_without_moving_either() {
    let left = core::json!({"pick": {"side": "left"}});
    let right = core::json!({"pick": {"side": "right"}});
    assert_eq!(branched(&left, &right, true), Some(core::json!({"side": "left"})));
    assert_eq!(branched(&left, &right, false), Some(core::json!({"side": "right"})));
    assert_eq!(branched(&left, &core::json!({}), false), None);
}

#[test]
fn a_shadow_does_not_change_the_loan_of_the_original_input() {
    let input = core::json!({"child": [true]});
    let child = input.get("child").unwrap();
    let input = core::json!({});
    let input = core::json_with_field(input, "copy", core::json_copy(child));
    assert_eq!(input, core::json!({"copy": [true]}));
}

fn returned<'a, 'b>(input: &'a Json, key: &'b Str) -> Maybe<&'a Json> {
    let _copy = core::json_copy(input);
    input.get(key)
}

#[test]
fn a_returned_reference_still_belongs_to_the_declared_input_lifetime() {
    let input = core::json!({"keep": {"x": true}});
    assert!(std::ptr::eq(returned(&input, "keep").unwrap(), &input["keep"]));
    assert_eq!(returned(&core::json!({}), "keep"), None);
}
