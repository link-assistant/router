//! Independent native owned String capacity and bounds oracle SOURCE. CI-only UNRUN.
#[test]
fn consuming_append_and_clear_keep_existing_native_allocation_and_capacity(){
    let mut value=String::with_capacity(128);value.push_str("é😀");let pointer=value.as_ptr();let capacity=value.capacity();let value=link_assistant_router::translation_text_core::append_owned(value,"tail");assert_eq!(value,"é😀tail");assert_eq!(value.as_ptr(),pointer);assert_eq!(value.capacity(),capacity);let value=link_assistant_router::translation_text_core::clear_owned(value);assert_eq!(value,"");assert_eq!(value.as_ptr(),pointer);assert_eq!(value.capacity(),capacity);let value=link_assistant_router::translation_text_core::append_owned(value,"a\0b");assert_eq!(value,"a\0b");assert_eq!(value.as_ptr(),pointer);
}
#[test]
#[should_panic(expected="text output bound")]
fn consuming_append_preserves_the_existing_exact_utf8_output_bound(){let value="a".repeat(1_048_576);let _=link_assistant_router::translation_text_core::append_owned(value,"a");}
