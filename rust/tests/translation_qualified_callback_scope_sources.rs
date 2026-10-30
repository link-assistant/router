//! Independent closure scope/lazy order oracle SOURCE. CI-only, UNRUN.
use link_assistant_router::{translation_primitive_option_callbacks_core as callback,translation_integer_core as integer};
#[test]
fn callback_shadowing_keeps_outer_value_and_lazy_evaluation_separate() {
    use std::cell::Cell;
    for value in [None,Some(0_u64),Some(3),Some(u64::MAX)] {
        let calls=Cell::new(0);let outer=7_u64;
        let selected=callback::u64_unwrap_or_else(value,||{let outer=2_u64;calls.set(calls.get()+1);outer});
        assert_eq!(integer::u64_saturating_add(outer,selected),outer.saturating_add(value.unwrap_or(2)));
        assert_eq!(calls.get(),u32::from(value.is_none()));assert_eq!(outer,7);
        let mapped=callback::u64_to_u64_map(value,|outer|{let selected=outer;selected.saturating_add(9)});assert_eq!(mapped,value.map(|item|item.saturating_add(9)));assert_eq!(outer,7);
    }
}
#[test]
fn lazy_error_block_projection_matches_native_result_and_does_not_escape() {
    fn actual(value:Option<u64>)->Result<u64,String>{let selected=callback::u64_ok_or_else(value,||{"missing".to_owned()})?;Ok(integer::u64_saturating_add(selected,2))}
    for value in [None,Some(0_u64),Some(3),Some(u64::MAX)] {assert_eq!(actual(value),value.ok_or_else(||"missing".to_owned()).map(|item|item.saturating_add(2)));}
}
