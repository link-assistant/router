//! Independent native expected boundaries for the total-helper rule draft.
//! UNRUN. Execute only in CI after all same-SHA JavaScript gates pass.
macro_rules! unsigned_boundaries {
    ($name:ident, $ty:ty) => {
        #[test]
        fn $name() {
            let top = <$ty>::MAX;
            assert_eq!(top.wrapping_add(1), 0);
            assert_eq!((0 as $ty).wrapping_sub(1), top);
            assert_eq!(top.saturating_add(1), top);
            assert_eq!((0 as $ty).saturating_sub(1), 0);
            assert_eq!(top.saturating_mul(2), top);
            assert_eq!(top.min(0), 0);
            assert_eq!(top.max(0), top);
            assert_eq!(!top, 0);
            assert_eq!((top ^ top) | 1, 1);
        }
    };
}
macro_rules! signed_boundaries {
    ($name:ident, $ty:ty) => {
        #[test]
        fn $name() {
            let low = <$ty>::MIN;
            let high = <$ty>::MAX;
            assert_eq!(high.wrapping_add(1), low);
            assert_eq!(low.wrapping_sub(1), high);
            assert_eq!(high.saturating_add(1), high);
            assert_eq!(low.saturating_sub(1), low);
            assert_eq!(low.saturating_mul(-1), high);
            assert_eq!(low.min(high), low);
            assert_eq!(low.max(high), high);
            assert_eq!(!low, high);
            assert_eq!(low & high, 0);
        }
    };
}
unsigned_boundaries!(u8_total, u8);
unsigned_boundaries!(u16_total, u16);
unsigned_boundaries!(u32_total, u32);
unsigned_boundaries!(u64_total, u64);
unsigned_boundaries!(u128_total, u128);
signed_boundaries!(i8_total, i8);
signed_boundaries!(i16_total, i16);
signed_boundaries!(i32_total, i32);
signed_boundaries!(i64_total, i64);
signed_boundaries!(i128_total, i128);
#[test]
fn casts_and_boolean_eager_bitwise() {
    assert_eq!((-1_i8) as u128, u128::MAX);
    assert_eq!(u128::MAX as i8, -1);
    assert_eq!((256_u16) as u8, 0);
    assert_eq!((-128_i8) as i128, -128);
    for left in [false, true] {
        for right in [false, true] {
            assert_eq!(left ^ right, left != right);
            assert_eq!(left & right, left && right);
            assert_eq!(left | right, left || right);
        }
    }
}
