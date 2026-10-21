//! Independent native oracle for the owned borrowed-text compatibility contract.
//! Run in CI after the complete JavaScript gate for the same source revision.
//! These native tests do not claim that named lifetime syntax is translated.

use link_assistant_router::translation_core::Str;

fn identity(value: &Str) -> &Str {
    value
}

fn cleaned(value: &Str) -> &Str {
    value.trim()
}

fn choice(value: &Str, pick: bool) -> &Str {
    if pick { value } else { "fallback" }
}

fn fixed() -> &'static Str {
    "fixed"
}

fn named<'a>(value: &'a Str) -> &'a Str {
    value
}

#[test]
fn borrowed_alias_keeps_original_storage_and_empty_input() {
    let original = String::from("Ω猫😀");
    let view: &Str = original.as_str();
    assert_eq!(identity(view), "Ω猫😀");
    assert_eq!(identity(view).as_ptr(), original.as_ptr());
    assert!(identity("").is_empty());
}

#[test]
fn byte_length_is_not_unicode_scalar_or_utf16_length() {
    for (value, bytes) in [("", 0), ("ASCII", 5), ("é😀", 6), ("猫", 3), ("a\0b", 3)] {
        let view: &Str = value;
        assert_eq!(view.len(), bytes);
    }
    let view: &Str = "é😀";
    assert_eq!(view.chars().count(), 2);
}

#[test]
fn trim_returns_a_borrowed_subslice() {
    let original = String::from(" \tΩ😀\r\n");
    let result = cleaned(original.as_str());
    assert_eq!(result, "Ω😀");
    assert_eq!(result.as_ptr(), original[2..].as_ptr());
    assert_eq!(original, " \tΩ😀\r\n");
}

#[test]
fn literal_and_conditional_results_keep_their_values() {
    assert_eq!(fixed(), "fixed");
    assert_eq!(choice("input", true), "input");
    assert_eq!(choice("input", false), "fallback");
}

#[test]
fn alias_works_across_an_ordinary_function_boundary() {
    fn forwarded(value: &Str) -> &Str {
        identity(value)
    }
    let original = String::from("call");
    assert_eq!(forwarded(&original), "call");
    assert_eq!(forwarded(&original).as_ptr(), original.as_ptr());
}

#[test]
fn named_lifetime_transparency_is_native_only_in_this_initial_domain() {
    let original = String::from("native binder");
    assert_eq!(named(&original), original.as_str());
    assert_eq!(named(&original).as_ptr(), original.as_ptr());
}
