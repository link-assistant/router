//! Independent Option predicate/equality oracle SOURCE. CI-only, UNRUN.
use link_assistant_router::{translation_primitive_option_core as primitive,translation_primitive_option_callbacks_core as callback};
#[test]
fn existing_boolean_map_and_fallback_match_both_native_option_predicates() {
    for value in [None,Some(false),Some(true)] {assert_eq!(primitive::bool_unwrap_or(callback::bool_to_bool_map(value,|flag|flag),false),value.is_some_and(|flag|flag));assert_eq!(primitive::bool_unwrap_or(callback::bool_to_bool_map(value,|flag|flag),true),value.is_none_or(|flag|flag));}
    for value in [None,Some(0_u64),Some(1),Some(u64::MAX)] {assert_eq!(primitive::bool_unwrap_or(callback::u64_to_bool_map(value,|number|number>0),false),value.is_some_and(|number|number>0));assert_eq!(primitive::bool_unwrap_or(callback::u64_to_bool_map(value,|number|number>0),true),value.is_none_or(|number|number>0));}
    for value in [None,Some(i64::MIN),Some(0),Some(i64::MAX)] {assert_eq!(primitive::bool_unwrap_or(callback::i64_to_bool_map(value,|number|number<0),false),value.is_some_and(|number|number<0));assert_eq!(primitive::bool_unwrap_or(callback::i64_to_bool_map(value,|number|number<0),true),value.is_none_or(|number|number<0));}
    for value in [None,Some("identity"),Some(""),Some("é😀"),Some("e\u{301}")] {assert_eq!(primitive::bool_unwrap_or(callback::str_to_bool_map(value,|text|text!="identity"),false),value.is_some_and(|text|text!="identity"));assert_eq!(primitive::bool_unwrap_or(callback::str_to_bool_map(value,|text|text!="identity"),true),value.is_none_or(|text|text!="identity"));}
    for value in [None,Some(" ".to_owned()),Some(" é😀 ".to_owned())] {assert_eq!(primitive::bool_unwrap_or(callback::text_owned_to_bool_map(value.clone(),|text|!text.trim().is_empty()),false),value.clone().is_some_and(|text|!text.trim().is_empty()));assert_eq!(primitive::bool_unwrap_or(callback::text_owned_to_bool_map(value.clone(),|text|!text.trim().is_empty()),true),value.is_none_or(|text|!text.trim().is_empty()));}
}
#[test]
fn predicate_callbacks_run_only_for_actual_some_including_false_and_zero() {
    use std::cell::Cell;
    for value in [None,Some(false),Some(true)] {for fallback in [false,true] {let calls=Cell::new(0);let actual=primitive::bool_unwrap_or(callback::bool_to_bool_map(value,|flag|{calls.set(calls.get()+1);flag}),fallback);assert_eq!(actual,value.unwrap_or(fallback));assert_eq!(calls.get(),u32::from(value.is_some()));}}
    assert_ne!("é","e\u{301}");
}
