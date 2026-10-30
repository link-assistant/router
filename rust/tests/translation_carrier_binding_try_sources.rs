//! Independent lexical binding Try oracle SOURCE. CI-only, UNRUN.
use link_assistant_router::translation_integer_core as integer;
#[test]
fn bare_binding_try_preserves_native_payload_absence_errors_and_limits() {
    fn local(value:Option<u64>)->Option<u64>{let selected=value?;Some(integer::u64_saturating_add(selected,2))}
    fn grouped(value:Option<u64>)->Option<u64>{Some(integer::u64_saturating_add((value)?,2))}
    fn result(value:Result<u64,String>)->Result<u64,String>{let selected=value?;Ok(integer::u64_saturating_add(selected,2))}
    for value in [None,Some(0_u64),Some(3),Some(u64::MAX)] {let expected=value.map(|item|item.saturating_add(2));assert_eq!(local(value),expected);assert_eq!(grouped(value),expected);}
    for value in [Ok(0_u64),Ok(3),Ok(u64::MAX),Err("Ω😀".to_owned())] {assert_eq!(result(value.clone()),value.map(|item|item.saturating_add(2)));}
}
#[test]
fn owned_and_borrowed_try_payloads_keep_native_storage_and_borrow_roots() {
    fn owning(value:Option<String>)->Option<String>{let selected=value?;Some(selected)}
    let value="Ω😀".repeat(16);let pointer=value.as_ptr();let selected=owning(Some(value)).unwrap();assert_eq!(selected.as_ptr(),pointer);assert_eq!(owning(None),None);
    fn borrowed(value:Option<&str>)->Option<&str>{let selected=value?;Some(selected)}
    let original=String::from("Ω😀");assert_eq!(borrowed(Some(original.as_str())).unwrap().as_ptr(),original.as_ptr());assert_eq!(borrowed(None),None);
}
#[test]
fn original_binding_try_short_circuits_later_argument_effects() {
    use std::cell::Cell;
    fn argument(value:Option<u64>,base:u64,calls:&Cell<u32>)->Option<u64>{Some(integer::u64_saturating_add(base,{let selected=value?;calls.set(calls.get()+1);selected+1}))}
    for (value,count) in [(None,0),(Some(0_u64),1),(Some(3),1)] {let calls=Cell::new(0);assert_eq!(argument(value,10,&calls),value.map(|item|10_u64.saturating_add(item+1)));assert_eq!(calls.get(),count);}
}
