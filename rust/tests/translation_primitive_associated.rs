// Independent native qualified-call oracles. CI only after all JavaScript gates.
// Source draft; never run locally.
macro_rules! unsigned {
    ($name:ident, $ty:ty) => {
        #[test]
        fn $name() {
            let max = <$ty>::MAX;
            assert_eq!(<$ty>::wrapping_mul(max, max), 1);
            assert_eq!(<$ty>::wrapping_add(max, 1), 0);
            assert_eq!(<$ty>::saturating_add(max, 1), max);
            assert_eq!(<$ty>::checked_add(max, 1), None);
            assert_eq!(::core::cmp::Ord::min(max, 0 as $ty), 0);
            assert_eq!(::std::cmp::Ord::max(max, 0 as $ty), max);
            assert_eq!(::core::cmp::Ord::clamp(max, 2 as $ty, 4 as $ty), 4);
        }
    };
}
macro_rules! signed {
    ($name:ident, $ty:ty) => {
        #[test]
        fn $name() {
            let min = <$ty>::MIN;
            let max = <$ty>::MAX;
            assert_eq!(<$ty>::wrapping_mul(min, -1), min);
            assert_eq!(<$ty>::saturating_mul(min, -1), max);
            assert_eq!(<$ty>::checked_mul(min, -1), None);
            assert_eq!(::core::cmp::Ord::min(min, max), min);
            assert_eq!(::std::cmp::Ord::max(min, max), max);
        }
    };
}
unsigned!(unsigned8, u8);
unsigned!(unsigned16, u16);
unsigned!(unsigned32, u32);
unsigned!(unsigned64, u64);
unsigned!(unsigned128, u128);
signed!(signed8, i8);
signed!(signed16, i16);
signed!(signed32, i32);
signed!(signed64, i64);
signed!(signed128, i128);
#[test]
fn explicit_qualified_primitive_and_clamp_failure() {
    assert_eq!(::core::primitive::u8::wrapping_mul(255, 255), 1);
    assert_eq!(::std::primitive::i8::wrapping_mul(-128, -1), -128);
    assert!(std::panic::catch_unwind(|| ::core::cmp::Ord::clamp(1u8, 3, 2)).is_err());
}
