// Independent native oracle SOURCE. CI runs after all eight JavaScript gates.
macro_rules! integer_methods {
    ($name:ident,$type:ty) => {
        #[test]
        fn $name() {
            assert_eq!(<$type>::MAX.saturating_add(1), <$type>::MAX);
            assert_eq!(<$type>::MIN.saturating_sub(1), <$type>::MIN);
            assert_eq!(<$type>::MAX.saturating_mul(2), <$type>::MAX);
            assert_eq!(<$type>::MAX.wrapping_add(1), <$type>::MIN);
            assert_eq!(<$type>::MIN.wrapping_sub(1), <$type>::MAX);
            assert_eq!(::core::cmp::Ord::min(<$type>::MAX, <$type>::MIN), <$type>::MIN);
            assert_eq!(::core::cmp::Ord::max(<$type>::MIN, <$type>::MAX), <$type>::MAX);
            assert_eq!(::core::cmp::Ord::clamp(5 as $type, 2, 4), 4);
            assert_eq!(::core::cmp::Ord::clamp(0 as $type, 2, 2), 2);
            assert!(std::panic::catch_unwind(|| ::core::cmp::Ord::clamp(0 as $type, 3, 1)).is_err());
        }
    };
}
integer_methods!(native_methods_u8, u8);
integer_methods!(native_methods_i8, i8);
integer_methods!(native_methods_u16, u16);
integer_methods!(native_methods_i16, i16);
integer_methods!(native_methods_u32, u32);
integer_methods!(native_methods_i32, i32);
integer_methods!(native_methods_u64, u64);
integer_methods!(native_methods_i64, i64);
integer_methods!(native_methods_u128, u128);
integer_methods!(native_methods_i128, i128);
