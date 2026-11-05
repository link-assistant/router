// Independent native source oracle. Run only in gated CI; unrun during drafting.
#[test]
fn primitive_numeric_boundaries_and_exact_large_values() {
    assert_eq!(u8::MAX.saturating_add(1), u8::MAX);
    assert_eq!(0_u8.saturating_sub(1), 0);
    assert_eq!(16_u8.saturating_mul(16), u8::MAX);
    assert_eq!(u8::MAX.wrapping_add(1), 0);
    assert_eq!(0_u8.wrapping_sub(1), u8::MAX);
    assert_eq!(i8::MAX.wrapping_add(1), i8::MIN);
    assert_eq!(i8::MIN.wrapping_sub(1), i8::MAX);
    assert_eq!(i8::MIN.saturating_mul(-1), i8::MAX);
    assert_eq!(i128::MIN.saturating_mul(-1), i128::MAX);
    assert_eq!(u128::MAX.wrapping_add(1), 0);
    assert_eq!(u128::MAX.saturating_mul(2), u128::MAX);
    assert_eq!(std::hint::black_box(9_007_199_254_740_993_u64).min(9_007_199_254_740_992), 9_007_199_254_740_992);
    assert_eq!(std::hint::black_box(-2_i64).max(-1), -1);
    assert_eq!(3_u8.clamp(1, 2), 2);
    assert_eq!(0_u8.clamp(2, 2), 2);
}

#[test]
#[should_panic]
fn inverted_primitive_clamp_bounds_panic() {
    let bounds = std::hint::black_box((2_u8, 1_u8));
    let _ = 0_u8.clamp(bounds.0, bounds.1);
}
