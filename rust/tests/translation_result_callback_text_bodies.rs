//! Independent Result callback text oracle SOURCE. Gated CI only, UNRUN.
use link_assistant_router::{translation_owned_results_core as owned,translation_primitive_results_core as primitive,translation_text_core as text};
#[test]
fn owning_success_error_and_recovery_callbacks_match_standard_expressions() {
    let values: [Result<String,String>;3]=[Ok(String::from(" é😀 ")),Ok(String::new()),Err(String::from(" error😀 "))];
    for value in values {
        assert_eq!(owned::text_to_text_map(value.clone(),|value|text::to_owned(text::trim(&value))),value.clone().map(|value|value.trim().to_owned()));
        assert_eq!(owned::text_to_text_and_then(value.clone(),|value|{let cleaned=text::to_owned(text::trim(&value));Ok(cleaned)}),value.clone().and_then(|value|{let cleaned=value.trim().to_owned();Ok(cleaned)}));
        assert_eq!(owned::text_map_err(value.clone(),|error|text::to_owned(text::trim(&error))),value.clone().map_err(|error|error.trim().to_owned()));
        assert_eq!(owned::text_unwrap_or_else(value.clone(),|error|text::to_owned(text::trim(&error))),value.clone().unwrap_or_else(|error|error.trim().to_owned()));
        assert_eq!(owned::text_or_else(value.clone(),|error|Err(text::to_owned(text::trim(&error)))),value.or_else(|error|Err(error.trim().to_owned())));
    }
}
#[test]
fn primitive_error_callbacks_and_explicit_constructors_preserve_domains() {
    let values: [Result<u64,String>;3]=[Ok(0),Ok(u64::MAX),Err(String::from(" é😀 "))];
    for value in values {
        assert_eq!(primitive::u64_map_err(value.clone(),|error|text::to_owned(text::trim(&error))),value.clone().map_err(|error|error.trim().to_owned()));
        assert_eq!(primitive::u64_unwrap_or_else(value.clone(),|error|text::len_utf8(text::trim(&error))),value.clone().unwrap_or_else(|error|error.trim().len() as u64));
        assert_eq!(primitive::u64_or_else(value.clone(),|error|Err(text::to_owned(text::trim(&error)))),value.or_else(|error|Err(error.trim().to_owned())));
    }
}
