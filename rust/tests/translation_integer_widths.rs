// Independent all-width scalar oracle SOURCE. Gated Rust CI only, UNRUN.
use link_assistant_router::translation_integer_core as core;

#[test]
fn scalar_boundaries_u8() {
    let maximum = u8::MAX;
    let minimum = u8::MIN;
    assert_eq!(core::u8_saturating_add(maximum, 1), maximum);
    assert_eq!(core::u8_saturating_sub(minimum, 1), minimum);
    assert_eq!(core::u8_saturating_mul(maximum, 2), maximum.saturating_mul(2));
    assert_eq!(core::u8_wrapping_add(maximum, 1), minimum);
    assert_eq!(core::u8_wrapping_sub(minimum, 1), maximum);
    assert_eq!(core::u8_wrapping_mul(maximum, 2), maximum.wrapping_mul(2));
    assert_eq!(core::u8_min(minimum, maximum), minimum);
    assert_eq!(core::u8_max(minimum, maximum), maximum);
    assert_eq!(core::u8_clamp(minimum, 0, maximum), 0);
    assert!(std::panic::catch_unwind(|| core::u8_clamp(0, 1, 0)).is_err());
}

#[test]
fn scalar_boundaries_i8() {
    let maximum = i8::MAX;
    let minimum = i8::MIN;
    assert_eq!(core::i8_saturating_add(maximum, 1), maximum);
    assert_eq!(core::i8_saturating_sub(minimum, 1), minimum);
    assert_eq!(core::i8_saturating_mul(maximum, 2), maximum.saturating_mul(2));
    assert_eq!(core::i8_wrapping_add(maximum, 1), minimum);
    assert_eq!(core::i8_wrapping_sub(minimum, 1), maximum);
    assert_eq!(core::i8_wrapping_mul(maximum, 2), maximum.wrapping_mul(2));
    assert_eq!(core::i8_min(minimum, maximum), minimum);
    assert_eq!(core::i8_max(minimum, maximum), maximum);
    assert_eq!(core::i8_clamp(minimum, 0, maximum), 0);
    assert!(std::panic::catch_unwind(|| core::i8_clamp(0, 1, 0)).is_err());
    assert_eq!(core::i8_saturating_abs(minimum), maximum);
}

#[test]
fn scalar_boundaries_u16() {
    let maximum = u16::MAX;
    let minimum = u16::MIN;
    assert_eq!(core::u16_saturating_add(maximum, 1), maximum);
    assert_eq!(core::u16_saturating_sub(minimum, 1), minimum);
    assert_eq!(core::u16_saturating_mul(maximum, 2), maximum.saturating_mul(2));
    assert_eq!(core::u16_wrapping_add(maximum, 1), minimum);
    assert_eq!(core::u16_wrapping_sub(minimum, 1), maximum);
    assert_eq!(core::u16_wrapping_mul(maximum, 2), maximum.wrapping_mul(2));
    assert_eq!(core::u16_min(minimum, maximum), minimum);
    assert_eq!(core::u16_max(minimum, maximum), maximum);
    assert_eq!(core::u16_clamp(minimum, 0, maximum), 0);
    assert!(std::panic::catch_unwind(|| core::u16_clamp(0, 1, 0)).is_err());
}

#[test]
fn scalar_boundaries_i16() {
    let maximum = i16::MAX;
    let minimum = i16::MIN;
    assert_eq!(core::i16_saturating_add(maximum, 1), maximum);
    assert_eq!(core::i16_saturating_sub(minimum, 1), minimum);
    assert_eq!(core::i16_saturating_mul(maximum, 2), maximum.saturating_mul(2));
    assert_eq!(core::i16_wrapping_add(maximum, 1), minimum);
    assert_eq!(core::i16_wrapping_sub(minimum, 1), maximum);
    assert_eq!(core::i16_wrapping_mul(maximum, 2), maximum.wrapping_mul(2));
    assert_eq!(core::i16_min(minimum, maximum), minimum);
    assert_eq!(core::i16_max(minimum, maximum), maximum);
    assert_eq!(core::i16_clamp(minimum, 0, maximum), 0);
    assert!(std::panic::catch_unwind(|| core::i16_clamp(0, 1, 0)).is_err());
    assert_eq!(core::i16_saturating_abs(minimum), maximum);
}

#[test]
fn scalar_boundaries_u32() {
    let maximum = u32::MAX;
    let minimum = u32::MIN;
    assert_eq!(core::u32_saturating_add(maximum, 1), maximum);
    assert_eq!(core::u32_saturating_sub(minimum, 1), minimum);
    assert_eq!(core::u32_saturating_mul(maximum, 2), maximum.saturating_mul(2));
    assert_eq!(core::u32_wrapping_add(maximum, 1), minimum);
    assert_eq!(core::u32_wrapping_sub(minimum, 1), maximum);
    assert_eq!(core::u32_wrapping_mul(maximum, 2), maximum.wrapping_mul(2));
    assert_eq!(core::u32_min(minimum, maximum), minimum);
    assert_eq!(core::u32_max(minimum, maximum), maximum);
    assert_eq!(core::u32_clamp(minimum, 0, maximum), 0);
    assert!(std::panic::catch_unwind(|| core::u32_clamp(0, 1, 0)).is_err());
}

#[test]
fn scalar_boundaries_i32() {
    let maximum = i32::MAX;
    let minimum = i32::MIN;
    assert_eq!(core::i32_saturating_add(maximum, 1), maximum);
    assert_eq!(core::i32_saturating_sub(minimum, 1), minimum);
    assert_eq!(core::i32_saturating_mul(maximum, 2), maximum.saturating_mul(2));
    assert_eq!(core::i32_wrapping_add(maximum, 1), minimum);
    assert_eq!(core::i32_wrapping_sub(minimum, 1), maximum);
    assert_eq!(core::i32_wrapping_mul(maximum, 2), maximum.wrapping_mul(2));
    assert_eq!(core::i32_min(minimum, maximum), minimum);
    assert_eq!(core::i32_max(minimum, maximum), maximum);
    assert_eq!(core::i32_clamp(minimum, 0, maximum), 0);
    assert!(std::panic::catch_unwind(|| core::i32_clamp(0, 1, 0)).is_err());
    assert_eq!(core::i32_saturating_abs(minimum), maximum);
}

#[test]
fn scalar_boundaries_u64() {
    let maximum = u64::MAX;
    let minimum = u64::MIN;
    assert_eq!(core::u64_saturating_add(maximum, 1), maximum);
    assert_eq!(core::u64_saturating_sub(minimum, 1), minimum);
    assert_eq!(core::u64_saturating_mul(maximum, 2), maximum.saturating_mul(2));
    assert_eq!(core::u64_wrapping_add(maximum, 1), minimum);
    assert_eq!(core::u64_wrapping_sub(minimum, 1), maximum);
    assert_eq!(core::u64_wrapping_mul(maximum, 2), maximum.wrapping_mul(2));
    assert_eq!(core::u64_min(minimum, maximum), minimum);
    assert_eq!(core::u64_max(minimum, maximum), maximum);
    assert_eq!(core::u64_clamp(minimum, 0, maximum), 0);
    assert!(std::panic::catch_unwind(|| core::u64_clamp(0, 1, 0)).is_err());
}

#[test]
fn scalar_boundaries_i64() {
    let maximum = i64::MAX;
    let minimum = i64::MIN;
    assert_eq!(core::i64_saturating_add(maximum, 1), maximum);
    assert_eq!(core::i64_saturating_sub(minimum, 1), minimum);
    assert_eq!(core::i64_saturating_mul(maximum, 2), maximum.saturating_mul(2));
    assert_eq!(core::i64_wrapping_add(maximum, 1), minimum);
    assert_eq!(core::i64_wrapping_sub(minimum, 1), maximum);
    assert_eq!(core::i64_wrapping_mul(maximum, 2), maximum.wrapping_mul(2));
    assert_eq!(core::i64_min(minimum, maximum), minimum);
    assert_eq!(core::i64_max(minimum, maximum), maximum);
    assert_eq!(core::i64_clamp(minimum, 0, maximum), 0);
    assert!(std::panic::catch_unwind(|| core::i64_clamp(0, 1, 0)).is_err());
    assert_eq!(core::i64_saturating_abs(minimum), maximum);
}

#[test]
fn scalar_boundaries_u128() {
    let maximum = u128::MAX;
    let minimum = u128::MIN;
    assert_eq!(core::u128_saturating_add(maximum, 1), maximum);
    assert_eq!(core::u128_saturating_sub(minimum, 1), minimum);
    assert_eq!(core::u128_saturating_mul(maximum, 2), maximum.saturating_mul(2));
    assert_eq!(core::u128_wrapping_add(maximum, 1), minimum);
    assert_eq!(core::u128_wrapping_sub(minimum, 1), maximum);
    assert_eq!(core::u128_wrapping_mul(maximum, 2), maximum.wrapping_mul(2));
    assert_eq!(core::u128_min(minimum, maximum), minimum);
    assert_eq!(core::u128_max(minimum, maximum), maximum);
    assert_eq!(core::u128_clamp(minimum, 0, maximum), 0);
    assert!(std::panic::catch_unwind(|| core::u128_clamp(0, 1, 0)).is_err());
}

#[test]
fn scalar_boundaries_i128() {
    let maximum = i128::MAX;
    let minimum = i128::MIN;
    assert_eq!(core::i128_saturating_add(maximum, 1), maximum);
    assert_eq!(core::i128_saturating_sub(minimum, 1), minimum);
    assert_eq!(core::i128_saturating_mul(maximum, 2), maximum.saturating_mul(2));
    assert_eq!(core::i128_wrapping_add(maximum, 1), minimum);
    assert_eq!(core::i128_wrapping_sub(minimum, 1), maximum);
    assert_eq!(core::i128_wrapping_mul(maximum, 2), maximum.wrapping_mul(2));
    assert_eq!(core::i128_min(minimum, maximum), minimum);
    assert_eq!(core::i128_max(minimum, maximum), maximum);
    assert_eq!(core::i128_clamp(minimum, 0, maximum), 0);
    assert!(std::panic::catch_unwind(|| core::i128_clamp(0, 1, 0)).is_err());
    assert_eq!(core::i128_saturating_abs(minimum), maximum);
}
