//! Independent core/callback operand oracle SOURCE. CI-only, UNRUN.
use link_assistant_router::{translation_primitive_option_core as option,translation_primitive_option_callbacks_core as callback,translation_primitive_results_core as result,translation_integer_core as integer,translation_text_core as text};
#[test]
fn nested_callback_operands_preserve_native_absence_limits_and_errors() {
    for value in [None,Some(0_u64),Some(3),Some(u64::MAX)] {let mapped=callback::u64_to_u64_map(value,|number|integer::u64_saturating_add(number,1));let scalar=integer::u64_saturating_add(option::u64_unwrap_or(mapped,0),2);assert_eq!(scalar,value.map(|item|item.saturating_add(1)).unwrap_or(0).saturating_add(2));let converted=option::u64_ok_or(callback::u64_to_u64_map(value,|number|integer::u64_saturating_add(number,1)),text::to_owned("missing"));let actual=result::u64_to_u64_map(converted,|number|integer::u64_saturating_add(number,2));assert_eq!(actual,value.map(|item|item.saturating_add(1)).ok_or("missing".to_owned()).map(|item|item.saturating_add(2)));}
    for value in [None,Some(false),Some(true)] {let mapped=callback::bool_to_u64_map(value,|flag|if flag{1}else{0});assert_eq!(integer::u64_saturating_add(option::u64_unwrap_or(mapped,0),2),value.map(u64::from).unwrap_or(0).saturating_add(2));}
}
#[test]
fn borrowed_owning_callback_operands_keep_lazy_selection_and_string_value() {
    use std::cell::Cell;
    for value in [None,Some(" é😀 ".to_owned())] {let expected=value.clone().unwrap_or_else(||" fallback ".to_owned()).trim().to_owned();let calls=Cell::new(0);let actual=text::to_owned(text::trim(&text::to_owned(&callback::text_owned_unwrap_or_else(value,||{calls.set(calls.get()+1);text::to_owned(" fallback ")}))));assert_eq!(actual,expected);assert_eq!(calls.get(),if expected=="fallback"{1}else{0});}
}
