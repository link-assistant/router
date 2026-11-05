//! Independent native nested carrier body oracle SOURCE. CI-only, UNRUN.
use link_assistant_router::{translation_primitive_option_callbacks_core as option,translation_primitive_option_core as primitive,translation_primitive_results_core as result,translation_owned_results_core as owned,translation_integer_core as integer,translation_text_core as text};
#[test]
fn nested_option_and_result_callbacks_preserve_absence_limits_and_errors() {
    for value in [None,Some(0_u64),Some(3),Some(u64::MAX)] {for inner in [None,Some(4_u64)] {let actual=option::u64_to_u64_and_then(value,|outer|option::u64_to_u64_map(inner,|number|integer::u64_saturating_add(number,outer)));assert_eq!(actual,value.and_then(|outer|inner.map(|number|number.saturating_add(outer))));}}
    for value in [Ok(3_u64),Err("Ω😀".to_owned())] {for inner in [None,Some(4_u64)] {let expected=value.clone().and_then(|outer|inner.map(|number|number.saturating_add(outer)).ok_or("missing".to_owned()));let actual=result::u64_to_u64_and_then(value.clone(),|outer|primitive::u64_ok_or(option::u64_to_u64_map(inner,|number|integer::u64_saturating_add(number,outer)),text::to_owned("missing")));assert_eq!(actual,expected);}}
    for value in [Ok("unused".to_owned()),Err("Ω😀".to_owned())] {for pending in [None,Some(" é😀 ")] {let expected=value.clone().and_then(|_original|pending.map(|item|item.trim().to_owned()).ok_or("missing".to_owned()));let actual=owned::text_to_text_and_then(value.clone(),|_original|primitive::text_owned_ok_or(option::str_to_text_owned_map(pending,|item|text::to_owned(text::trim(item))),text::to_owned("missing")));assert_eq!(actual,expected);}}
}
#[test]
fn three_nested_copy_payloads_and_lazy_result_recovery_match_native_order() {
    use std::cell::Cell;
    for value in [None,Some(1_u64)] {for middle in [None,Some(2_u64)] {for inner in [None,Some(3_u64)] {let calls=Cell::new(0);let actual=option::u64_to_u64_and_then(value,|outer|option::u64_to_u64_and_then(middle,|part|option::u64_to_u64_map(inner,|number|{calls.set(calls.get()+1);integer::u64_saturating_add(integer::u64_saturating_add(number,outer),part)})));assert_eq!(actual,value.and_then(|outer|middle.and_then(|part|inner.map(|number|number.saturating_add(outer).saturating_add(part)))));assert_eq!(calls.get(),u32::from(value.is_some()&&middle.is_some()&&inner.is_some()));}}}
    for value in [None,Some(3_u64)] {assert_eq!(option::u64_unwrap_or_else(value,||result::u64_unwrap_or(result::u64_to_u64_map(result::u64_ok(7),|number|integer::u64_saturating_add(number,2)),0)),value.unwrap_or_else(||Ok::<u64,String>(7).map(|number|number.saturating_add(2)).unwrap_or(0)));}
}
