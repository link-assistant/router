//! Independent composed core source oracle; gated CI-only and UNRUN.
use link_assistant_router::{translation_text_core as text,translation_primitive_option_core as option,translation_integer_core as integer};
#[test]
fn actual_core_calls_match_original_composed_expressions() {
    for value in [None,Some(String::new()),Some(String::from("  ")),Some(String::from(" é😀 ")),Some(String::from("\u{feff}"))] {
        assert_eq!(option::text_owned_unwrap_or_default(option::text_owned_filter_nonempty(value.clone(),true)),value.filter(|value|!value.trim().is_empty()).unwrap_or_default());
    }
    for value in ["é😀","other"," é😀 "] {
        let owned = text::to_owned(value);let cleaned = text::trim(&owned);
        assert_eq!(text::to_owned(cleaned),value.to_owned().trim().to_owned());
        assert_eq!(option::str_unwrap_or(text::strip_prefix(value,"é"),value),value.strip_prefix("é").unwrap_or(value).to_owned());
    }
    for (left,right) in [(None,None),(Some(0_u64),Some(u64::MAX)),(None,Some(u64::MAX))] {
        assert_eq!(option::u64_unwrap_or(option::u64_or(left,right),7),left.or(right).unwrap_or(7));
    }
    for (left,right) in [(0_u8,0_u8),(254,1),(255,1)] {
        assert_eq!(option::u8_unwrap_or(integer::u8_checked_add(integer::u8_saturating_add(left,right),1),7),left.saturating_add(right).checked_add(1).unwrap_or(7));
    }
}
