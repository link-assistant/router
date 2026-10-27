//! Independent callback text-body oracle SOURCE. Gated CI only; UNRUN.
use link_assistant_router::{translation_primitive_option_callbacks_core as callback,translation_primitive_option_core as option,translation_text_core as text};
#[test]
fn substituted_callback_text_chains_match_original_standard_expressions() {
    for value in [None,Some(String::new()),Some(String::from(" é😀 ")),Some(String::from("\u{85}\u{3000}"))] {
        assert_eq!(callback::text_owned_to_text_owned_map(value.clone(),|item|text::to_owned(text::trim(&item))),value.clone().map(|item|item.trim().to_owned()));
        assert_eq!(callback::text_owned_to_bool_map(value.clone(),|item|text::is_empty(&item)),value.clone().map(|item|item.is_empty()));
        assert_eq!(callback::text_owned_to_u64_map(value.clone(),|item|text::len_utf8(text::trim(&item))),value.clone().map(|item|item.trim().len() as u64));
        assert_eq!(callback::text_owned_to_bool_map(value.clone(),|item|text::contains(&item,"é")),value.clone().map(|item|item.contains('é')));
        assert_eq!(callback::text_owned_to_text_owned_and_then(value.clone(),|item|{let cleaned=text::to_owned(text::trim(&item));Some(cleaned)}),value.clone().and_then(|item|{let cleaned=item.trim().to_owned();Some(cleaned)}));
        assert_eq!(option::text_owned_unwrap_or_default(callback::text_owned_to_text_owned_map(value.clone(),|item|text::to_owned(text::trim(&item)))),value.clone().map(|item|item.trim().to_owned()).unwrap_or_default());
        let label=" é😀 ";
        assert_eq!(callback::text_owned_unwrap_or_else(value.clone(),||text::to_owned(text::trim(label))),value.clone().unwrap_or_else(||label.trim().to_owned()));
        assert_eq!(callback::text_owned_or_else(value.clone(),||Some(text::to_owned(text::trim(label)))),value.or_else(||Some(label.trim().to_owned())));
    }
}
