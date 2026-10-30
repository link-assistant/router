//! Independent actual lazy-error/native oracle SOURCE. Gated CI-only, UNRUN.
use link_assistant_router::translation_primitive_option_callbacks_core as option;
#[test]
fn native_callbacks_run_zero_times_for_some_and_once_for_none() {
    for value in [None,Some(false),Some(true)] {
        let mut calls=0;let actual=option::bool_ok_or_else(value,||{calls+=1;"missing".to_owned()});assert_eq!(actual,value.ok_or_else(||"missing".to_owned()));assert_eq!(calls,usize::from(value.is_none()));
    }
    for value in [None,Some(0_u64),Some(u64::MAX)] {assert_eq!(option::u64_ok_or_else(value,||"missing".to_owned()),value.ok_or_else(||"missing".to_owned()));}
    for value in [None,Some(i64::MIN),Some(0),Some(i64::MAX)] {assert_eq!(option::i64_ok_or_else(value,||"missing".to_owned()),value.ok_or_else(||"missing".to_owned()));}
    for value in [None,Some(""),Some("Ω😀")] {let actual=option::str_ok_or_else(value,||"missing".to_owned());assert_eq!(actual,value.ok_or_else(||"missing".to_owned()));if let (Some(before),Ok(after))=(value,actual){assert_eq!(before.as_ptr(),after.as_ptr());}}
    let original="Ω😀".to_owned();let pointer=original.as_ptr();let result=option::text_owned_ok_or_else(Some(original),||panic!("must stay lazy")).expect("Some succeeds");assert_eq!(result,"Ω😀");assert_eq!(result.as_ptr(),pointer);
    assert_eq!(option::text_owned_ok_or_else(None,||"missing".to_owned()),Err("missing".to_owned()));
}
#[test]
fn actual_try_returns_the_same_error_and_success_payload() {
    fn original(value:Option<u64>)->Result<u64,String>{let selected=value.ok_or_else(||"missing".to_owned())?;Ok(selected)}
    fn adopted(value:Option<u64>)->Result<u64,String>{let selected=option::u64_ok_or_else(value,||"missing".to_owned())?;Ok(selected)}
    for value in [None,Some(0),Some(u64::MAX)] {assert_eq!(adopted(value),original(value));}
}
