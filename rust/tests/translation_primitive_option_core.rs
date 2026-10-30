//! Independent Option boundary oracle SOURCE; execute only in JS-gated Rust CI.
use link_assistant_router::translation_primitive_option_core as option;

#[test]
fn false_and_absence_have_different_meanings() {
    assert_eq!(option::bool_some(false), Some(false));
    assert_eq!(option::bool_none(), None);
    assert!(option::bool_is_some(Some(false)));
    assert!(!option::bool_is_none(Some(false)));
    assert!(!option::bool_unwrap_or(Some(false), true));
    assert!(option::bool_unwrap_or(None, true));
    assert!(!option::bool_unwrap(Some(false)));
    assert!(!option::bool_expect(Some(false), "failure"));
    assert_eq!(option::bool_and(Some(false), Some(true)), Some(true));
    assert_eq!(option::bool_and(None, Some(true)), None);
    assert_eq!(option::bool_or(Some(false), Some(true)), Some(false));
    assert_eq!(option::bool_or(None, Some(true)), Some(true));
}

#[test]
fn unsigned_and_signed_boundaries_are_not_truthiness() {
    assert_eq!(option::u64_some(u64::MAX), Some(u64::MAX));
    assert_eq!(option::u64_none(), None);
    assert_eq!(option::u64_unwrap_or(Some(0), u64::MAX), 0);
    assert_eq!(option::u64_unwrap_or(None, u64::MAX), u64::MAX);
    assert_eq!(option::u64_unwrap(Some(u64::MAX)), u64::MAX);
    assert_eq!(option::u64_expect(Some(0), "failure"), 0);
    assert!(option::u64_is_some(Some(0)));
    assert!(option::u64_is_none(None));
    assert_eq!(option::u64_and(Some(0), Some(u64::MAX)), Some(u64::MAX));
    assert_eq!(option::u64_or(Some(0), Some(u64::MAX)), Some(0));
    assert_eq!(option::i64_some(i64::MIN), Some(i64::MIN));
    assert_eq!(option::i64_none(), None);
    assert_eq!(option::i64_unwrap_or(None, i64::MIN), i64::MIN);
    assert_eq!(option::i64_unwrap(Some(i64::MIN)), i64::MIN);
    assert_eq!(option::i64_expect(Some(i64::MAX), "failure"), i64::MAX);
    assert!(option::i64_is_some(Some(i64::MIN)));
    assert!(option::i64_is_none(None));
    assert_eq!(option::i64_and(Some(i64::MIN), Some(i64::MAX)), Some(i64::MAX));
    assert_eq!(option::i64_or(Some(i64::MIN), Some(i64::MAX)), Some(i64::MIN));
}

#[test]
fn empty_and_unicode_text_results_are_owned_at_the_unwrap_boundary() {
    let source = String::from("é😀終");
    let selected = option::str_some(source.as_str()).unwrap();
    assert_eq!(selected, "é😀終");
    assert_eq!(selected.as_ptr(), source.as_ptr());
    assert_eq!(option::str_none(), None);
    assert!(option::str_is_some(Some("")));
    assert!(option::str_is_none(None));
    assert_eq!(option::str_unwrap_or(Some(""), "fallback😀"), "");
    assert_eq!(option::str_unwrap_or(None, "fallback😀"), "fallback😀");
    let owned = option::str_unwrap(Some(selected));
    drop(source);
    assert_eq!(owned, "é😀終");
    assert_eq!(option::str_expect(Some(""), "failure"), "");
}

#[test]
#[should_panic(expected = "called `Option::unwrap()` on a `None` value")]
fn none_unwrap_retains_a_panic_boundary() {
    let _ = option::u64_unwrap(None);
}

#[test]
#[should_panic(expected = "specific failure")]
fn none_expect_retains_the_actual_message() {
    let _ = option::str_expect(None, "specific failure");
}

#[test]
#[should_panic(expected = "primitive Option text input bound")]
fn too_large_text_is_outside_the_shared_interface() {
    let source = "é".repeat(524_289);
    let _ = option::str_some(source.as_str());
}
