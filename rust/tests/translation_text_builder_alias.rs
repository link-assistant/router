//! Independent lexical borrowed builder suffix alias oracle SOURCE. CI-only UNRUN.
#[test]
fn immutable_text_aliases_preserve_original_values_and_scoped_views(){
    for value in ["","é😀","a\0b"," é😀 "]{let first=value;let second=first;let mut original=String::from(first);original.push_str(second);let adopted=link_assistant_router::translation_text_core::append_owned(String::from(first),second);assert_eq!(original,adopted);let suffix=link_assistant_router::translation_text_core::trim(value);let adopted=link_assistant_router::translation_text_core::append_owned(String::new(),suffix);assert_eq!(adopted,value.trim());}
}
