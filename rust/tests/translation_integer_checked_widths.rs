//! Independent checked width oracle SOURCE. Native execution is CI-only, UNRUN.
use link_assistant_router::translation_integer_core as core;

#[test]
fn checked_u8_boundaries() {
    let minimum = u8::MIN;
    let maximum = u8::MAX;
    assert_eq!(core::u8_checked_add(maximum, 1), None);
    assert_eq!(core::u8_checked_add(maximum - 1, 1), Some(maximum));
    assert_eq!(core::u8_checked_sub(minimum, 1), None);
    assert_eq!(core::u8_checked_mul(maximum, 2), None);
    assert_eq!(core::u8_checked_mul(maximum, 0), Some(0));
    assert_eq!(core::u8_checked_div(maximum, 0), None);
    assert_eq!(core::u8_checked_rem(1, 0), None);
    assert_eq!(core::u8_checked_div(maximum, 2), Some(maximum / 2));
    assert_eq!(core::u8_checked_rem(maximum, 2), Some(1));
}

#[test]
fn checked_i8_boundaries() {
    let minimum = i8::MIN;
    let maximum = i8::MAX;
    assert_eq!(core::i8_checked_add(maximum, 1), None);
    assert_eq!(core::i8_checked_add(maximum - 1, 1), Some(maximum));
    assert_eq!(core::i8_checked_sub(minimum, 1), None);
    assert_eq!(core::i8_checked_mul(maximum, 2), None);
    assert_eq!(core::i8_checked_mul(maximum, 0), Some(0));
    assert_eq!(core::i8_checked_div(maximum, 0), None);
    assert_eq!(core::i8_checked_rem(1, 0), None);
    assert_eq!(core::i8_checked_div(maximum, 2), Some(maximum / 2));
    assert_eq!(core::i8_checked_rem(maximum, 2), Some(1));
    assert_eq!(core::i8_checked_div(minimum, -1), None);
    assert_eq!(core::i8_checked_rem(minimum, -1), None);
    assert_eq!(core::i8_checked_mul(minimum, -1), None);
    assert_eq!(core::i8_checked_abs(minimum), None);
    assert_eq!(core::i8_checked_abs(-maximum), Some(maximum));
    assert_eq!(core::i8_checked_div(-7, 3), Some(-2));
    assert_eq!(core::i8_checked_rem(-7, 3), Some(-1));
}

#[test]
fn checked_u16_boundaries() {
    let minimum = u16::MIN;
    let maximum = u16::MAX;
    assert_eq!(core::u16_checked_add(maximum, 1), None);
    assert_eq!(core::u16_checked_add(maximum - 1, 1), Some(maximum));
    assert_eq!(core::u16_checked_sub(minimum, 1), None);
    assert_eq!(core::u16_checked_mul(maximum, 2), None);
    assert_eq!(core::u16_checked_mul(maximum, 0), Some(0));
    assert_eq!(core::u16_checked_div(maximum, 0), None);
    assert_eq!(core::u16_checked_rem(1, 0), None);
    assert_eq!(core::u16_checked_div(maximum, 2), Some(maximum / 2));
    assert_eq!(core::u16_checked_rem(maximum, 2), Some(1));
}

#[test]
fn checked_i16_boundaries() {
    let minimum = i16::MIN;
    let maximum = i16::MAX;
    assert_eq!(core::i16_checked_add(maximum, 1), None);
    assert_eq!(core::i16_checked_add(maximum - 1, 1), Some(maximum));
    assert_eq!(core::i16_checked_sub(minimum, 1), None);
    assert_eq!(core::i16_checked_mul(maximum, 2), None);
    assert_eq!(core::i16_checked_mul(maximum, 0), Some(0));
    assert_eq!(core::i16_checked_div(maximum, 0), None);
    assert_eq!(core::i16_checked_rem(1, 0), None);
    assert_eq!(core::i16_checked_div(maximum, 2), Some(maximum / 2));
    assert_eq!(core::i16_checked_rem(maximum, 2), Some(1));
    assert_eq!(core::i16_checked_div(minimum, -1), None);
    assert_eq!(core::i16_checked_rem(minimum, -1), None);
    assert_eq!(core::i16_checked_mul(minimum, -1), None);
    assert_eq!(core::i16_checked_abs(minimum), None);
    assert_eq!(core::i16_checked_abs(-maximum), Some(maximum));
    assert_eq!(core::i16_checked_div(-7, 3), Some(-2));
    assert_eq!(core::i16_checked_rem(-7, 3), Some(-1));
}

#[test]
fn checked_u32_boundaries() {
    let minimum = u32::MIN;
    let maximum = u32::MAX;
    assert_eq!(core::u32_checked_add(maximum, 1), None);
    assert_eq!(core::u32_checked_add(maximum - 1, 1), Some(maximum));
    assert_eq!(core::u32_checked_sub(minimum, 1), None);
    assert_eq!(core::u32_checked_mul(maximum, 2), None);
    assert_eq!(core::u32_checked_mul(maximum, 0), Some(0));
    assert_eq!(core::u32_checked_div(maximum, 0), None);
    assert_eq!(core::u32_checked_rem(1, 0), None);
    assert_eq!(core::u32_checked_div(maximum, 2), Some(maximum / 2));
    assert_eq!(core::u32_checked_rem(maximum, 2), Some(1));
}

#[test]
fn checked_i32_boundaries() {
    let minimum = i32::MIN;
    let maximum = i32::MAX;
    assert_eq!(core::i32_checked_add(maximum, 1), None);
    assert_eq!(core::i32_checked_add(maximum - 1, 1), Some(maximum));
    assert_eq!(core::i32_checked_sub(minimum, 1), None);
    assert_eq!(core::i32_checked_mul(maximum, 2), None);
    assert_eq!(core::i32_checked_mul(maximum, 0), Some(0));
    assert_eq!(core::i32_checked_div(maximum, 0), None);
    assert_eq!(core::i32_checked_rem(1, 0), None);
    assert_eq!(core::i32_checked_div(maximum, 2), Some(maximum / 2));
    assert_eq!(core::i32_checked_rem(maximum, 2), Some(1));
    assert_eq!(core::i32_checked_div(minimum, -1), None);
    assert_eq!(core::i32_checked_rem(minimum, -1), None);
    assert_eq!(core::i32_checked_mul(minimum, -1), None);
    assert_eq!(core::i32_checked_abs(minimum), None);
    assert_eq!(core::i32_checked_abs(-maximum), Some(maximum));
    assert_eq!(core::i32_checked_div(-7, 3), Some(-2));
    assert_eq!(core::i32_checked_rem(-7, 3), Some(-1));
}

#[test]
fn checked_u128_boundaries() {
    let minimum = u128::MIN;
    let maximum = u128::MAX;
    assert_eq!(core::u128_checked_add(maximum, 1), None);
    assert_eq!(core::u128_checked_add(maximum - 1, 1), Some(maximum));
    assert_eq!(core::u128_checked_sub(minimum, 1), None);
    assert_eq!(core::u128_checked_mul(maximum, 2), None);
    assert_eq!(core::u128_checked_mul(maximum, 0), Some(0));
    assert_eq!(core::u128_checked_div(maximum, 0), None);
    assert_eq!(core::u128_checked_rem(1, 0), None);
    assert_eq!(core::u128_checked_div(maximum, 2), Some(maximum / 2));
    assert_eq!(core::u128_checked_rem(maximum, 2), Some(1));
}

#[test]
fn checked_i128_boundaries() {
    let minimum = i128::MIN;
    let maximum = i128::MAX;
    assert_eq!(core::i128_checked_add(maximum, 1), None);
    assert_eq!(core::i128_checked_add(maximum - 1, 1), Some(maximum));
    assert_eq!(core::i128_checked_sub(minimum, 1), None);
    assert_eq!(core::i128_checked_mul(maximum, 2), None);
    assert_eq!(core::i128_checked_mul(maximum, 0), Some(0));
    assert_eq!(core::i128_checked_div(maximum, 0), None);
    assert_eq!(core::i128_checked_rem(1, 0), None);
    assert_eq!(core::i128_checked_div(maximum, 2), Some(maximum / 2));
    assert_eq!(core::i128_checked_rem(maximum, 2), Some(1));
    assert_eq!(core::i128_checked_div(minimum, -1), None);
    assert_eq!(core::i128_checked_rem(minimum, -1), None);
    assert_eq!(core::i128_checked_mul(minimum, -1), None);
    assert_eq!(core::i128_checked_abs(minimum), None);
    assert_eq!(core::i128_checked_abs(-maximum), Some(maximum));
    assert_eq!(core::i128_checked_div(-7, 3), Some(-2));
    assert_eq!(core::i128_checked_rem(-7, 3), Some(-1));
}
