//! Independent actual eager/converting Option error oracle SOURCE. CI-only, UNRUN.
use link_assistant_router::translation_primitive_option_core as option;
#[test]
fn values_errors_and_ordinary_try_conversion_keep_the_native_contract() {
    for value in [None,Some(false),Some(true)] {assert_eq!(option::bool_ok_or(value,"missing".to_owned()),value.ok_or("missing".to_owned()));assert_eq!(option::bool_ok_or_text(value,"missing"),value.ok_or_else(||"missing".to_owned()));}
    for value in [None,Some(0_u64),Some(u64::MAX)] {assert_eq!(option::u64_ok_or(value,"missing".to_owned()),value.ok_or("missing".to_owned()));assert_eq!(option::u64_ok_or_text(value,"missing"),value.ok_or_else(||"missing".to_owned()));}
    for value in [None,Some(i64::MIN),Some(i64::MAX)] {assert_eq!(option::i64_ok_or(value,"missing".to_owned()),value.ok_or("missing".to_owned()));assert_eq!(option::i64_ok_or_text(value,"missing"),value.ok_or_else(||"missing".to_owned()));}
    for value in [None,Some(""),Some("Ω😀")] {assert_eq!(option::str_ok_or(value,"missing".to_owned()),value.ok_or("missing".to_owned()));let actual=option::str_ok_or_text(value,"missing");assert_eq!(actual,value.ok_or_else(||"missing".to_owned()));if let (Some(before),Ok(after))=(value,actual){assert_eq!(before.as_ptr(),after.as_ptr());}}
    for value in [None,Some(String::new()),Some("Ω😀".to_owned())] {assert_eq!(option::text_owned_ok_or(value.clone(),"missing".to_owned()),value.clone().ok_or("missing".to_owned()));assert_eq!(option::text_owned_ok_or_text(value.clone(),"missing"),value.ok_or_else(||"missing".to_owned()));}
    fn original(value:Option<u64>,error:&str)->Result<u64,String>{Ok(value.ok_or(error)?)}
    fn adopted(value:Option<u64>,error:&str)->Result<u64,String>{Ok(option::u64_ok_or_text(value,error)?)}
    for value in [None,Some(0),Some(u64::MAX)] {assert_eq!(adopted(value,"Ω😀"),original(value,"Ω😀"));}
}
#[test]
fn eager_argument_evaluation_precedes_result_selection() {
    let events=std::cell::RefCell::new(Vec::new());let receiver=||{events.borrow_mut().push("receiver");Some(0_u64)};let error=||{events.borrow_mut().push("error");"missing".to_owned()};assert_eq!(option::u64_ok_or(receiver(),error()),Ok(0));assert_eq!(*events.borrow(),vec!["receiver","error"]);
    let original="Ω😀".to_owned();let pointer=original.as_ptr();let value=option::text_owned_ok_or_text(Some(original),"missing").expect("Some succeeds");assert_eq!(value.as_ptr(),pointer);
}
