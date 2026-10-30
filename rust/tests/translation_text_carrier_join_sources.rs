//! Independent native text/carrier/Try oracle SOURCE. CI-only, UNRUN.
use link_assistant_router::{translation_text_core as text,translation_primitive_option_core as option,translation_primitive_option_callbacks_core as callback};
#[test]
fn owning_and_borrowed_try_text_payloads_match_native_operations_and_errors() {
    fn local(value:Option<String>)->Option<String>{let selected=value?;Some(text::to_owned(text::trim(&selected)))}
    fn result(value:Result<String,String>)->Result<String,String>{let selected=value?;Ok(text::to_owned(text::trim(&selected)))}
    fn borrowed(value:Option<&str>)->Option<String>{let selected=value?;Some(text::to_owned(text::trim(selected)))}
    for value in [None,Some(" é😀 ".to_owned()),Some(String::new()),Some(" \0 ".to_owned())] {let expected=value.clone().map(|item|item.trim().to_owned());assert_eq!(local(value.clone()),expected);assert_eq!(borrowed(value.as_deref()),expected);}
    for value in [Ok(" é😀 ".to_owned()),Ok(String::new()),Err("Ω😀".to_owned())] {assert_eq!(result(value.clone()),value.map(|item|item.trim().to_owned()));}
}
#[test]
fn qualified_option_result_and_callback_payloads_keep_string_ownership_and_laziness() {
    fn converted(value:Option<String>)->Result<String,String>{Ok(text::to_owned(text::trim(&option::text_owned_ok_or_text(value,"missing")?)))}
    for value in [None,Some(" é😀 ".to_owned()),Some(String::new())] {assert_eq!(converted(value.clone()),value.ok_or("missing").map(|item|item.trim().to_owned()).map_err(str::to_owned));}
    use std::cell::Cell;
    for value in [None,Some(" é😀 ".to_owned())] {let calls=Cell::new(0);let expected=value.clone().unwrap_or_else(||" fallback ".to_owned()).trim().to_owned();let chosen=callback::text_owned_unwrap_or_else(value,||{calls.set(calls.get()+1);text::to_owned(" fallback ")});let actual=text::to_owned(text::trim(&chosen));assert_eq!(actual,expected);assert_eq!(calls.get(),if expected=="fallback"{1}else{0});}
}
