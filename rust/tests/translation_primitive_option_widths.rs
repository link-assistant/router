//! Independent Option width and combined source oracle. CI-only execution, UNRUN.
use link_assistant_router::{translation_integer_core as integer, translation_primitive_option_core as option};

#[test]
fn option_u8_boundaries() {
    let minimum = u8::MIN;
    let maximum = u8::MAX;
    for value in [minimum, 0, maximum] {
        let actual = option::u8_some(value);
        assert_eq!(actual, Some(value));
        assert!(option::u8_is_some(actual));
        assert!(!option::u8_is_none(actual));
        assert_eq!(option::u8_unwrap(actual), value);
        assert_eq!(option::u8_expect(actual, "é😀"), value);
        assert_eq!(option::u8_unwrap_or(actual, maximum), value);
        assert_eq!(option::u8_and(actual, Some(maximum)), Some(maximum));
        assert_eq!(option::u8_or(actual, Some(maximum)), actual);
        assert_eq!(option::u8_and(actual, None), None);
    }
    assert_eq!(option::u8_none(), None);
    assert!(option::u8_is_none(None));
    assert_eq!(option::u8_unwrap_or(None, maximum), maximum);
    assert_eq!(option::u8_or(None, Some(minimum)), Some(minimum));
    assert!(std::panic::catch_unwind(|| option::u8_unwrap(None)).is_err());
    assert!(std::panic::catch_unwind(|| option::u8_expect(None, "é😀")).is_err());
    for (value, other) in [(minimum, 0), (maximum, 1), (0, 1)] {
        let expected = value.checked_add(other).unwrap_or(7);
        let selected = option::u8_unwrap_or(integer::u8_checked_add(value, other), 7);
        assert_eq!(selected, expected);
    }
}

#[test]
fn option_i8_boundaries() {
    let minimum = i8::MIN;
    let maximum = i8::MAX;
    for value in [minimum, 0, maximum] {
        let actual = option::i8_some(value);
        assert_eq!(actual, Some(value));
        assert!(option::i8_is_some(actual));
        assert!(!option::i8_is_none(actual));
        assert_eq!(option::i8_unwrap(actual), value);
        assert_eq!(option::i8_expect(actual, "é😀"), value);
        assert_eq!(option::i8_unwrap_or(actual, maximum), value);
        assert_eq!(option::i8_and(actual, Some(maximum)), Some(maximum));
        assert_eq!(option::i8_or(actual, Some(maximum)), actual);
        assert_eq!(option::i8_and(actual, None), None);
    }
    assert_eq!(option::i8_none(), None);
    assert!(option::i8_is_none(None));
    assert_eq!(option::i8_unwrap_or(None, maximum), maximum);
    assert_eq!(option::i8_or(None, Some(minimum)), Some(minimum));
    assert!(std::panic::catch_unwind(|| option::i8_unwrap(None)).is_err());
    assert!(std::panic::catch_unwind(|| option::i8_expect(None, "é😀")).is_err());
    for (value, other) in [(minimum, 0), (maximum, 1), (0, 1)] {
        let expected = value.checked_add(other).unwrap_or(7);
        let selected = option::i8_unwrap_or(integer::i8_checked_add(value, other), 7);
        assert_eq!(selected, expected);
    }
}

#[test]
fn option_u16_boundaries() {
    let minimum = u16::MIN;
    let maximum = u16::MAX;
    for value in [minimum, 0, maximum] {
        let actual = option::u16_some(value);
        assert_eq!(actual, Some(value));
        assert!(option::u16_is_some(actual));
        assert!(!option::u16_is_none(actual));
        assert_eq!(option::u16_unwrap(actual), value);
        assert_eq!(option::u16_expect(actual, "é😀"), value);
        assert_eq!(option::u16_unwrap_or(actual, maximum), value);
        assert_eq!(option::u16_and(actual, Some(maximum)), Some(maximum));
        assert_eq!(option::u16_or(actual, Some(maximum)), actual);
        assert_eq!(option::u16_and(actual, None), None);
    }
    assert_eq!(option::u16_none(), None);
    assert!(option::u16_is_none(None));
    assert_eq!(option::u16_unwrap_or(None, maximum), maximum);
    assert_eq!(option::u16_or(None, Some(minimum)), Some(minimum));
    assert!(std::panic::catch_unwind(|| option::u16_unwrap(None)).is_err());
    assert!(std::panic::catch_unwind(|| option::u16_expect(None, "é😀")).is_err());
    for (value, other) in [(minimum, 0), (maximum, 1), (0, 1)] {
        let expected = value.checked_add(other).unwrap_or(7);
        let selected = option::u16_unwrap_or(integer::u16_checked_add(value, other), 7);
        assert_eq!(selected, expected);
    }
}

#[test]
fn option_i16_boundaries() {
    let minimum = i16::MIN;
    let maximum = i16::MAX;
    for value in [minimum, 0, maximum] {
        let actual = option::i16_some(value);
        assert_eq!(actual, Some(value));
        assert!(option::i16_is_some(actual));
        assert!(!option::i16_is_none(actual));
        assert_eq!(option::i16_unwrap(actual), value);
        assert_eq!(option::i16_expect(actual, "é😀"), value);
        assert_eq!(option::i16_unwrap_or(actual, maximum), value);
        assert_eq!(option::i16_and(actual, Some(maximum)), Some(maximum));
        assert_eq!(option::i16_or(actual, Some(maximum)), actual);
        assert_eq!(option::i16_and(actual, None), None);
    }
    assert_eq!(option::i16_none(), None);
    assert!(option::i16_is_none(None));
    assert_eq!(option::i16_unwrap_or(None, maximum), maximum);
    assert_eq!(option::i16_or(None, Some(minimum)), Some(minimum));
    assert!(std::panic::catch_unwind(|| option::i16_unwrap(None)).is_err());
    assert!(std::panic::catch_unwind(|| option::i16_expect(None, "é😀")).is_err());
    for (value, other) in [(minimum, 0), (maximum, 1), (0, 1)] {
        let expected = value.checked_add(other).unwrap_or(7);
        let selected = option::i16_unwrap_or(integer::i16_checked_add(value, other), 7);
        assert_eq!(selected, expected);
    }
}

#[test]
fn option_u32_boundaries() {
    let minimum = u32::MIN;
    let maximum = u32::MAX;
    for value in [minimum, 0, maximum] {
        let actual = option::u32_some(value);
        assert_eq!(actual, Some(value));
        assert!(option::u32_is_some(actual));
        assert!(!option::u32_is_none(actual));
        assert_eq!(option::u32_unwrap(actual), value);
        assert_eq!(option::u32_expect(actual, "é😀"), value);
        assert_eq!(option::u32_unwrap_or(actual, maximum), value);
        assert_eq!(option::u32_and(actual, Some(maximum)), Some(maximum));
        assert_eq!(option::u32_or(actual, Some(maximum)), actual);
        assert_eq!(option::u32_and(actual, None), None);
    }
    assert_eq!(option::u32_none(), None);
    assert!(option::u32_is_none(None));
    assert_eq!(option::u32_unwrap_or(None, maximum), maximum);
    assert_eq!(option::u32_or(None, Some(minimum)), Some(minimum));
    assert!(std::panic::catch_unwind(|| option::u32_unwrap(None)).is_err());
    assert!(std::panic::catch_unwind(|| option::u32_expect(None, "é😀")).is_err());
    for (value, other) in [(minimum, 0), (maximum, 1), (0, 1)] {
        let expected = value.checked_add(other).unwrap_or(7);
        let selected = option::u32_unwrap_or(integer::u32_checked_add(value, other), 7);
        assert_eq!(selected, expected);
    }
}

#[test]
fn option_i32_boundaries() {
    let minimum = i32::MIN;
    let maximum = i32::MAX;
    for value in [minimum, 0, maximum] {
        let actual = option::i32_some(value);
        assert_eq!(actual, Some(value));
        assert!(option::i32_is_some(actual));
        assert!(!option::i32_is_none(actual));
        assert_eq!(option::i32_unwrap(actual), value);
        assert_eq!(option::i32_expect(actual, "é😀"), value);
        assert_eq!(option::i32_unwrap_or(actual, maximum), value);
        assert_eq!(option::i32_and(actual, Some(maximum)), Some(maximum));
        assert_eq!(option::i32_or(actual, Some(maximum)), actual);
        assert_eq!(option::i32_and(actual, None), None);
    }
    assert_eq!(option::i32_none(), None);
    assert!(option::i32_is_none(None));
    assert_eq!(option::i32_unwrap_or(None, maximum), maximum);
    assert_eq!(option::i32_or(None, Some(minimum)), Some(minimum));
    assert!(std::panic::catch_unwind(|| option::i32_unwrap(None)).is_err());
    assert!(std::panic::catch_unwind(|| option::i32_expect(None, "é😀")).is_err());
    for (value, other) in [(minimum, 0), (maximum, 1), (0, 1)] {
        let expected = value.checked_add(other).unwrap_or(7);
        let selected = option::i32_unwrap_or(integer::i32_checked_add(value, other), 7);
        assert_eq!(selected, expected);
    }
}

#[test]
fn option_u128_boundaries() {
    let minimum = u128::MIN;
    let maximum = u128::MAX;
    for value in [minimum, 0, maximum] {
        let actual = option::u128_some(value);
        assert_eq!(actual, Some(value));
        assert!(option::u128_is_some(actual));
        assert!(!option::u128_is_none(actual));
        assert_eq!(option::u128_unwrap(actual), value);
        assert_eq!(option::u128_expect(actual, "é😀"), value);
        assert_eq!(option::u128_unwrap_or(actual, maximum), value);
        assert_eq!(option::u128_and(actual, Some(maximum)), Some(maximum));
        assert_eq!(option::u128_or(actual, Some(maximum)), actual);
        assert_eq!(option::u128_and(actual, None), None);
    }
    assert_eq!(option::u128_none(), None);
    assert!(option::u128_is_none(None));
    assert_eq!(option::u128_unwrap_or(None, maximum), maximum);
    assert_eq!(option::u128_or(None, Some(minimum)), Some(minimum));
    assert!(std::panic::catch_unwind(|| option::u128_unwrap(None)).is_err());
    assert!(std::panic::catch_unwind(|| option::u128_expect(None, "é😀")).is_err());
    for (value, other) in [(minimum, 0), (maximum, 1), (0, 1)] {
        let expected = value.checked_add(other).unwrap_or(7);
        let selected = option::u128_unwrap_or(integer::u128_checked_add(value, other), 7);
        assert_eq!(selected, expected);
    }
}

#[test]
fn option_i128_boundaries() {
    let minimum = i128::MIN;
    let maximum = i128::MAX;
    for value in [minimum, 0, maximum] {
        let actual = option::i128_some(value);
        assert_eq!(actual, Some(value));
        assert!(option::i128_is_some(actual));
        assert!(!option::i128_is_none(actual));
        assert_eq!(option::i128_unwrap(actual), value);
        assert_eq!(option::i128_expect(actual, "é😀"), value);
        assert_eq!(option::i128_unwrap_or(actual, maximum), value);
        assert_eq!(option::i128_and(actual, Some(maximum)), Some(maximum));
        assert_eq!(option::i128_or(actual, Some(maximum)), actual);
        assert_eq!(option::i128_and(actual, None), None);
    }
    assert_eq!(option::i128_none(), None);
    assert!(option::i128_is_none(None));
    assert_eq!(option::i128_unwrap_or(None, maximum), maximum);
    assert_eq!(option::i128_or(None, Some(minimum)), Some(minimum));
    assert!(std::panic::catch_unwind(|| option::i128_unwrap(None)).is_err());
    assert!(std::panic::catch_unwind(|| option::i128_expect(None, "é😀")).is_err());
    for (value, other) in [(minimum, 0), (maximum, 1), (0, 1)] {
        let expected = value.checked_add(other).unwrap_or(7);
        let selected = option::i128_unwrap_or(integer::i128_checked_add(value, other), 7);
        assert_eq!(selected, expected);
    }
}
