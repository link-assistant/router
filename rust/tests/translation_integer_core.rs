//! Independent integer boundary oracle SOURCE. CI follows complete JS success.
use link_assistant_router::translation_integer_core as integer;

#[test]
fn unsigned_arithmetic_boundaries() {
    assert_eq!(integer::u64_saturating_add(u64::MAX, 1), u64::MAX);
    assert_eq!(integer::u64_saturating_sub(0, 1), 0);
    assert_eq!(integer::u64_saturating_mul(u64::MAX, 2), u64::MAX);
    assert_eq!(integer::u64_wrapping_add(u64::MAX, 1), 0);
    assert_eq!(integer::u64_wrapping_sub(0, 1), u64::MAX);
    assert_eq!(integer::u64_wrapping_mul(u64::MAX, 2), u64::MAX - 1);
    assert_eq!(integer::u64_checked_add(u64::MAX, 1), None);
    assert_eq!(integer::u64_checked_sub(0, 1), None);
    assert_eq!(integer::u64_checked_mul(u64::MAX, 0), Some(0));
    assert_eq!(integer::u64_checked_div(1, 0), None);
    assert_eq!(integer::u64_checked_div(u64::MAX, 2), Some(9_223_372_036_854_775_807));
    assert_eq!(integer::u64_checked_rem(u64::MAX, 2), Some(1));
    assert_eq!(integer::u64_clamp(0, 1, u64::MAX), 1);
}

#[test]
fn signed_overflow_truncation_and_absolute_value() {
    assert_eq!(integer::i64_saturating_add(i64::MAX, 1), i64::MAX);
    assert_eq!(integer::i64_saturating_sub(i64::MIN, 1), i64::MIN);
    assert_eq!(integer::i64_saturating_mul(i64::MIN, -1), i64::MAX);
    assert_eq!(integer::i64_wrapping_add(i64::MAX, 1), i64::MIN);
    assert_eq!(integer::i64_wrapping_sub(i64::MIN, 1), i64::MAX);
    assert_eq!(integer::i64_wrapping_mul(i64::MIN, -1), i64::MIN);
    assert_eq!(integer::i64_checked_div(i64::MIN, -1), None);
    assert_eq!(integer::i64_checked_rem(i64::MIN, -1), None);
    assert_eq!(integer::i64_checked_div(-7, 3), Some(-2));
    assert_eq!(integer::i64_checked_rem(-7, 3), Some(-1));
    assert_eq!(integer::i64_checked_abs(i64::MIN), None);
    assert_eq!(integer::i64_saturating_abs(i64::MIN), i64::MAX);
    assert_eq!(integer::i64_clamp(i64::MIN, -2, 3), -2);
}
