//! Independent native Try/ordering oracle SOURCE. CI-only, UNRUN.
use link_assistant_router::{translation_integer_core as integer,translation_primitive_option_core as option};
#[test]
fn option_checked_and_eager_result_projections_match_native_expressions() {
    fn local(value:u64)->Option<u64>{let selected=integer::u64_checked_add(value,1)?;Some(integer::u64_saturating_add(selected,2))}
    fn original(value:u64)->Option<u64>{let selected=value.checked_add(1)?;Some(selected.saturating_add(2))}
    fn eager(value:Option<u64>)->Result<u64,String>{let selected=option::u64_ok_or(value,"missing".to_owned())?;Ok(integer::u64_saturating_add(selected,2))}
    for value in [0_u64,3,u64::MAX-1,u64::MAX] {assert_eq!(local(value),original(value));}
    for value in [None,Some(0_u64),Some(3),Some(u64::MAX)] {assert_eq!(eager(value),value.ok_or("missing".to_owned()).map(|item|item.saturating_add(2)));}
    fn signed(value:i64)->Option<i64>{let selected=integer::i64_checked_abs(value)?;Some(integer::i64_saturating_add(selected,2))}
    for value in [i64::MIN,-3,0,i64::MAX] {assert_eq!(signed(value),value.checked_abs().map(|item|item.saturating_add(2)));}
}
#[test]
fn original_try_short_circuits_later_arguments_and_preserves_error_payload() {
    use std::cell::Cell;
    fn run(value:Option<u64>,calls:&Cell<u32>)->Option<u64>{Some(integer::u64_saturating_add(integer::u64_checked_add(value?,1)?,{calls.set(calls.get()+1);2}))}
    for (value,count) in [(None,0),(Some(u64::MAX),0),(Some(3),1)] {let calls=Cell::new(0);let actual=run(value,&calls);assert_eq!(calls.get(),count);assert_eq!(actual,value.and_then(|item|item.checked_add(1)).map(|item|item.saturating_add(2)));}
}
