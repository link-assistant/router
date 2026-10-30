//! Independent integer chain and evaluation order oracle SOURCE. CI-only, UNRUN.
use link_assistant_router::translation_integer_core as integer;
#[test]
fn complete_integer_chains_match_native_boundaries_and_carrier_transitions() {
    for value in [0_u64,1,3,u64::MAX-1,u64::MAX] {assert_eq!(integer::u64_clamp(integer::u64_wrapping_mul(integer::u64_saturating_add(value,2),3),4,100),value.saturating_add(2).wrapping_mul(3).clamp(4,100));for divisor in [0_u64,1,2,u64::MAX] {assert_eq!(integer::u64_checked_div(integer::u64_saturating_add(value,2),divisor),value.saturating_add(2).checked_div(divisor));}}
    for value in [i64::MIN,-3,0,3,i64::MAX] {assert_eq!(integer::i64_min(integer::i64_saturating_abs(integer::i64_wrapping_add(value,2)),10),value.wrapping_add(2).saturating_abs().min(10));}
}
#[test]
fn complete_chain_evaluates_the_receiver_once_and_each_argument_in_native_order() {
    use std::cell::RefCell;
    for value in [0_u64,3,u64::MAX] {let actual_log=RefCell::new(Vec::new());let receiver=||{actual_log.borrow_mut().push("receiver");value};let argument=|name:&'static str,result:u64|{actual_log.borrow_mut().push(name);result};let actual=integer::u64_wrapping_mul(integer::u64_saturating_add(receiver(),argument("add",2)),argument("multiply",3));let expected_log=RefCell::new(Vec::new());let receiver=||{expected_log.borrow_mut().push("receiver");value};let argument=|name:&'static str,result:u64|{expected_log.borrow_mut().push(name);result};let expected=receiver().saturating_add(argument("add",2)).wrapping_mul(argument("multiply",3));assert_eq!(actual,expected);assert_eq!(*actual_log.borrow(),vec!["receiver","add","multiply"]);assert_eq!(*actual_log.borrow(),*expected_log.borrow());}
}
