//! Independent captured borrowed carrier source oracle. CI-only, UNRUN.
use link_assistant_router::{translation_primitive_option_callbacks_core as option,translation_primitive_results_core as result,translation_owned_results_core as owned,translation_primitive_option_core as primitive,translation_text_core as text,translation_integer_core as integer};
#[test]
fn borrowed_option_captures_compose_try_text_and_integer_without_moving_the_root() {
    for pending in [None,Some(" é😀 "),Some("")] {for value in [None,Some(false),Some(true)] {let actual=option::bool_to_u64_and_then(value,|_flag|{let chosen=pending?;Some(integer::u64_saturating_add(text::len_utf8(text::trim(chosen)),2)))});let expected=value.and_then(|_flag|{let chosen=pending?;Some((chosen.trim().len() as u64).saturating_add(2))});assert_eq!(actual,expected);}}
}
#[test]
fn borrowed_carrier_captures_preserve_result_error_and_success_paths() {
    for pending in [None,Some(" é😀 "),Some("")] {
        for value in [Ok(0_u64),Ok(3),Err("Ω😀".to_owned())] {let expected=value.clone().and_then(|number|{let chosen=pending.ok_or("missing")?;Ok((chosen.trim().len() as u64).saturating_add(number))});let actual=result::u64_to_u64_and_then(value,|number|{let chosen=primitive::str_ok_or_text(pending,"missing")?;Ok(integer::u64_saturating_add(text::len_utf8(text::trim(chosen)),number))});assert_eq!(actual,expected);}
        for value in [Ok("unused".to_owned()),Err("Ω😀".to_owned())] {let expected=value.clone().and_then(|_original|{let chosen=pending.ok_or("missing")?;Ok((chosen.trim().len() as u64).saturating_add(2))});let actual=owned::text_to_u64_and_then(value,|_original|{let chosen=primitive::str_ok_or_text(pending,"missing")?;Ok(integer::u64_saturating_add(text::len_utf8(text::trim(chosen)),2))});assert_eq!(actual,expected);}
    }
}
