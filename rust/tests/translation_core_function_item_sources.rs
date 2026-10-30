//! Independent exact-path function item callback oracle SOURCE. CI-only, UNRUN.
use link_assistant_router::{translation_text_core as text,translation_integer_core as integer,translation_primitive_option_core as primitive,translation_primitive_option_callbacks_core as callback,translation_primitive_results_core as result,translation_owned_results_core as owned};
#[test]
fn exact_same_function_item_and_reified_closure_preserve_values_and_borrow_roots() {
    for value in [None,Some(""),Some("é😀")] {assert_eq!(callback::str_to_bool_map(value,text::is_empty),callback::str_to_bool_map(value,|argument|text::is_empty(argument)));assert_eq!(callback::str_to_text_owned_map(value,text::to_owned),callback::str_to_text_owned_map(value,|argument|text::to_owned(argument)));}
    for value in [None,Some(i64::MIN),Some(-3_i64),Some(i64::MAX)] {assert_eq!(callback::i64_to_i64_map(value,integer::i64_saturating_abs),callback::i64_to_i64_map(value,|argument|integer::i64_saturating_abs(argument)));}
    for value in [None,Some(0_u64),Some(3)] {assert_eq!(callback::u64_to_u64_and_then(value,primitive::u64_some),callback::u64_to_u64_and_then(value,|argument|primitive::u64_some(argument)));}
    for value in [None,Some("é😀".to_owned())] {assert_eq!(callback::text_owned_or_else(value.clone(),primitive::text_owned_none),callback::text_owned_or_else(value,||primitive::text_owned_none()));}
    let original=String::from("é😀");let selected=callback::str_to_str_map(Some(original.as_str()),text::trim).unwrap();assert_eq!(selected.as_ptr(),original.as_ptr());
}
#[test]
fn result_function_item_callbacks_keep_error_and_recovery_paths() {
    for value in [Ok(0_u64),Ok(3),Err("Ω😀".to_owned())] {assert_eq!(result::u64_to_u64_and_then(value.clone(),result::u64_ok),result::u64_to_u64_and_then(value,|argument|result::u64_ok(argument)));}
    for value in [Ok("value".to_owned()),Err("Ω😀".to_owned())] {assert_eq!(owned::text_or_else(value.clone(),owned::text_ok),owned::text_or_else(value,|argument|owned::text_ok(argument)));}
}
