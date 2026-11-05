//! Independent original text constructor/core allocation oracle SOURCE. CI-only UNRUN.
#[test]
fn exact_borrowed_text_constructors_keep_empty_unicode_and_embedded_null_values(){
    assert_eq!(String::new(),link_assistant_router::translation_text_core::to_owned(""));
    for value in ["","é😀","a\0b"]{let original=String::from(value);let adopted=link_assistant_router::translation_text_core::to_owned(value);assert_eq!(original,adopted);assert_eq!(std::string::String::from(value),adopted);assert_eq!(::std::string::String::from(value),adopted);assert_eq!(String::from(value).contains("é"),link_assistant_router::translation_text_core::contains(&adopted,"é"));}
}
