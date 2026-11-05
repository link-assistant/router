//! Independent reverse primitive display ownership oracle SOURCE, CI-only UNRUN.
#[test]
fn display_borrows_owned_text_without_moving_the_original(){
    let value=String::from("é😀");let original=value.as_ptr();let first=link_assistant_router::translation_core::format!("{}",value);let second=link_assistant_router::translation_core::format!("{}",value);assert_eq!(first,value);assert_eq!(second,value);assert_eq!(value.as_ptr(),original);let returned=value;assert_eq!(returned,"é😀");
}
#[test]
fn canonical_source_formatting_keeps_native_primitive_boundaries_and_callback_selection(){
    assert_eq!(link_assistant_router::translation_core::format!("{}",u64::MAX),"18446744073709551615");assert_eq!(link_assistant_router::translation_core::format!("{}",i64::MIN),"-9223372036854775808");assert_eq!(link_assistant_router::translation_core::format!("{}",false),"false");
    for value in [None,Some(0_u64),Some(u64::MAX)]{assert_eq!(value.map(|item|link_assistant_router::translation_core::format!("{}",item)),value.map(|item|item.to_string()));}
}
