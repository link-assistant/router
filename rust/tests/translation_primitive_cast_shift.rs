// Independent native oracle SOURCE. CI only after all same-SHA JavaScript gates.
#[test]
#[allow(clippy::unnecessary_cast)]
fn primitive_cast_boundaries_retain_signed_and_wrapping_native_values() {
    assert_eq!(65535_u16 as i8, -1_i8);
    assert_eq!(-129_i16 as i8, 127_i8);
    assert_eq!(-1_i8 as u128, u128::MAX);
    assert_eq!(128_u8 as i8, -128_i8);
    assert_eq!(i128::MIN as u8, 0_u8);
    assert_eq!(u128::MAX as i128, -1_i128);
    macro_rules! all_targets {
        ($ty:ty) => {{
            let value: $ty = 85;
            assert_eq!(value as u8, 85_u8); assert_eq!(value as i8, 85_i8);
            assert_eq!(value as u16, 85_u16); assert_eq!(value as i16, 85_i16);
            assert_eq!(value as u32, 85_u32); assert_eq!(value as i32, 85_i32);
            assert_eq!(value as u64, 85_u64); assert_eq!(value as i64, 85_i64);
            assert_eq!(value as u128, 85_u128); assert_eq!(value as i128, 85_i128);
        }};
    }
    all_targets!(u8); all_targets!(i8); all_targets!(u16); all_targets!(i16);
    all_targets!(u32); all_targets!(i32); all_targets!(u64); all_targets!(i64);
    all_targets!(u128); all_targets!(i128);
}

#[test]
fn native_shift_bits_sign_and_checked_count_boundaries_are_explicit() {
    assert_eq!(255_u8 << 1_u8, 254_u8);
    assert_eq!(-128_i8 >> 1_i8, -64_i8);
    assert_eq!(-1_i128 >> 127_u128, -1_i128);
    assert_eq!(1_u128 << 127_i8, 170141183460469231731687303715884105728_u128);
    assert_eq!(1_u8.checked_shl(8), None);
    assert_eq!(1_u128.checked_shl(128), None);
    assert_eq!((-1_i8) as u128, u128::MAX);
    assert!(std::panic::catch_unwind(|| {
        let count = -1_i8;
        assert!((count as u128) < 8_u128, "Rust integer shift count overflow");
    }).is_err());
}
