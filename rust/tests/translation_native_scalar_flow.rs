// Native oracle SOURCE only. CI runs after every required JavaScript gate.
macro_rules! scalar_flow {
    ($case:ident,$type:ty) => {
        #[test]
        fn $case() {
            let left: $type = 85;
            let right: $type = 51;
            let mut value = left | right;
            value ^= right;
            if value < right { value |= left; } else { value &= right; }
            assert_eq!(value, 0);
            assert!(<$type>::MIN <= <$type>::MAX);
            assert_eq!(<$type>::MIN < <$type>::MAX, true);
            assert_eq!(<$type>::MAX >= <$type>::MAX, true);
            assert_eq!(<$type>::MIN == <$type>::MAX, false);
        }
    };
}
scalar_flow!(u8_scalar_flow, u8);
scalar_flow!(i8_scalar_flow, i8);
scalar_flow!(u16_scalar_flow, u16);
scalar_flow!(i16_scalar_flow, i16);
scalar_flow!(u32_scalar_flow, u32);
scalar_flow!(i32_scalar_flow, i32);
scalar_flow!(u64_scalar_flow, u64);
scalar_flow!(i64_scalar_flow, i64);
scalar_flow!(u128_scalar_flow, u128);
scalar_flow!(i128_scalar_flow, i128);
