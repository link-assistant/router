//! Independent original callback scope/locals oracle SOURCE. CI-only, UNRUN.
use link_assistant_router::{translation_primitive_option_callbacks_core as option,translation_primitive_results_core as result,translation_owned_results_core as owned};
#[test]
fn repeated_callback_parameters_and_local_names_keep_separate_scopes() {
    for value in [None,Some(0_u64),Some(3)] {let pending=option::u64_to_u64_map(value,|value|{let mapped=value+1;mapped});let actual=option::u64_to_u64_map(pending,|value|{let mapped=value+2;mapped});assert_eq!(actual,value.map(|value|{let mapped=value+1;mapped}).map(|value|{let mapped=value+2;mapped}));}
    for value in [Ok(0_u64),Ok(3),Err("Ω😀".to_owned())] {let expected=value.clone().map(|value|{let mapped=value+1;mapped}).map(|value|{let mapped=value+2;mapped});let pending=result::u64_to_u64_map(value,|value|{let mapped=value+1;mapped});assert_eq!(result::u64_to_u64_map(pending,|value|{let mapped=value+2;mapped}),expected);}
    for value in [Ok(" Ω😀 ".to_owned()),Ok(String::new()),Err("denied".to_owned())] {let expected=value.clone();let pending=owned::text_to_text_map(value,|value|{let mapped=value;mapped});assert_eq!(owned::text_to_text_map(pending,|value|{let mapped=value;mapped}),expected);}
}
#[test]
fn unselected_native_callback_scope_cannot_change_the_outer_binding() {
    for pending in [None,Some(3_u64),Some(u64::MAX)] {let value=7_u64;let ignored=pending.map(|value|value.saturating_add(9));assert_eq!(value.saturating_add(2),9);assert_eq!(ignored,pending.map(|item|item.saturating_add(9)));assert_eq!(value,7);}
}
