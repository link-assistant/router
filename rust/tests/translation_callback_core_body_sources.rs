//! Independent native callback text/integer composition oracle SOURCE. CI-only, UNRUN.
use link_assistant_router::{translation_primitive_option_callbacks_core as option,translation_primitive_results_core as result,translation_owned_results_core as owned,translation_integer_core as integer,translation_text_core as text};
#[test]
fn numeric_callback_operations_match_native_limits_absence_and_errors() {
    for value in [None,Some(0_u64),Some(3),Some(u64::MAX)] {assert_eq!(option::u64_to_u64_map(value,|item|integer::u64_saturating_add(item,2)),value.map(|item|item.saturating_add(2)));assert_eq!(option::u64_to_u64_and_then(value,|item|integer::u64_checked_add(item,2)),value.and_then(|item|item.checked_add(2)));}
    for value in [None,Some(i64::MIN),Some(-3_i64),Some(i64::MAX)] {assert_eq!(option::i64_to_i64_map(value,|item|integer::i64_wrapping_add(item,2)),value.map(|item|item.wrapping_add(2)));}
    for value in [Ok(0_u64),Ok(3),Ok(u64::MAX),Err("Ω😀".to_owned())] {let expected=value.clone().map(|item|item.saturating_add(2));assert_eq!(result::u64_to_u64_map(value,|item|integer::u64_saturating_add(item,2)),expected);}
}
#[test]
fn text_counts_feed_integer_callbacks_with_unchanged_native_ownership_and_error_paths() {
    for value in [None,Some(" é😀 ".to_owned()),Some(String::new())] {let expected=value.clone().map(|item|(item.trim().len() as u64).saturating_add(2));let actual=option::text_owned_to_u64_map(value,|item|integer::u64_saturating_add(text::len_utf8(text::trim(&item)),2));assert_eq!(actual,expected);}
    for value in [Ok(" é😀 ".to_owned()),Ok(String::new()),Err("denied".to_owned())] {let expected=value.clone().map(|item|(item.trim().len() as u64).saturating_add(2));let actual=owned::text_to_u64_map(value,|item|{let count=text::len_utf8(text::trim(&item));integer::u64_saturating_add(count,2)});assert_eq!(actual,expected);}
}
#[test]
fn lazy_recovery_and_conditional_numeric_branches_keep_native_evaluation_order() {
    use std::cell::Cell;
    for value in [None,Some(3_u64)] {let calls=Cell::new(0);let actual=option::u64_unwrap_or_else(value,||{calls.set(calls.get()+1);integer::u64_saturating_add(7,2)});assert_eq!(actual,value.unwrap_or_else(||7_u64.saturating_add(2)));assert_eq!(calls.get(),u32::from(value.is_none()));}
    for prefer in [false,true] {for value in [None,Some(0_u64),Some(3),Some(u64::MAX)] {assert_eq!(option::u64_to_u64_map(value,|item|if prefer{integer::u64_saturating_add(item,2)}else{integer::u64_saturating_sub(item,2)}),value.map(|item|if prefer{item.saturating_add(2)}else{item.saturating_sub(2)}));}}
}
