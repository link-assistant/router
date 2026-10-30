//! Independent callback oracle SOURCE. Execute only after JS passes in Rust CI.
use link_assistant_router::translation_primitive_option_callbacks_core as callback;
use std::cell::Cell;

#[test]
fn mapping_retains_false_zero_and_negative_extrema() {
    assert_eq!(callback::u64_to_bool_map(Some(0), |_| false), Some(false));
    assert_eq!(callback::bool_to_u64_map(Some(false), |_| 0), Some(0));
    assert_eq!(callback::str_to_i64_map(Some(""), |_| i64::MIN), Some(i64::MIN));
    assert_eq!(callback::i64_to_str_map(Some(i64::MIN), |_| ""), Some(""));
}

#[test]
fn absence_and_flat_mapping_keep_their_real_evaluation_counts() {
    let calls = Cell::new(0_u64);
    let absent = callback::u64_to_bool_map(None, |_| {
        calls.set(calls.get() + 1);
        true
    });
    assert_eq!(absent, None);
    assert_eq!(calls.get(), 0);
    let present = callback::u64_to_bool_and_then(Some(0), |value| {
        calls.set(calls.get() + 1);
        assert_eq!(value, 0);
        Some(false)
    });
    assert_eq!(present, Some(false));
    assert_eq!(calls.get(), 1);
    assert_eq!(callback::bool_to_u64_and_then(Some(false), |_| None), None);
}

#[test]
fn a_captured_output_has_its_own_lifetime() {
    let input = String::from("input😀");
    let output = String::from("outputé");
    let selected = callback::str_to_str_map(Some(input.as_str()), |_| output.as_str());
    drop(input);
    assert_eq!(selected, Some("outputé"));
    assert_eq!(callback::str_to_str_and_then(None, |_| Some(output.as_str())), None);
}

#[test]
fn lazy_fallback_does_not_replace_zero_false_or_empty_some_values() {
    let calls = Cell::new(0_u64);
    assert_eq!(callback::u64_unwrap_or_else(Some(0), || {
        calls.set(calls.get() + 1);
        u64::MAX
    }), 0);
    assert_eq!(calls.get(), 0);
    assert_eq!(callback::u64_unwrap_or_else(None, || {
        calls.set(calls.get() + 1);
        u64::MAX
    }), u64::MAX);
    assert_eq!(calls.get(), 1);
    assert!(!callback::bool_unwrap_or_else(Some(false), || true));
    assert_eq!(callback::str_unwrap_or_else(Some(""), || "fallback"), "");
    assert_eq!(callback::str_unwrap_or_else(None, || "fallback😀"), "fallback😀");
}

#[test]
#[should_panic(expected = "text input bound")]
fn callback_text_output_keeps_the_shared_byte_bound() {
    let output = "é".repeat(524_289);
    let _ = callback::bool_to_str_map(Some(false), |_| output.as_str());
}
