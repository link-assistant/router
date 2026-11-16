// Native oracle SOURCE only. CI runs after every JavaScript gate is green.
macro_rules! unsigned_not {
    ($case:ident,$type:ty) => {
        #[test]
        fn $case() {
            const MAXIMUM: $type = !0;
            assert_eq!(MAXIMUM, <$type>::MAX);
            assert_eq!(!<$type>::MAX, 0);
            assert_eq!(!(85 as $type), <$type>::MAX - 85);
        }
    };
}
macro_rules! signed_not {
    ($case:ident,$type:ty) => {
        #[test]
        fn $case() {
            const NEGATIVE_ONE: $type = !0;
            assert_eq!(NEGATIVE_ONE, -1);
            assert_eq!(!<$type>::MIN, <$type>::MAX);
            assert_eq!(!<$type>::MAX, <$type>::MIN);
            assert_eq!(!(85 as $type), -86);
        }
    };
}
unsigned_not!(not_u8, u8);
signed_not!(not_i8, i8);
unsigned_not!(not_u16, u16);
signed_not!(not_i16, i16);
unsigned_not!(not_u32, u32);
signed_not!(not_i32, i32);
unsigned_not!(not_u64, u64);
signed_not!(not_i64, i64);
unsigned_not!(not_u128, u128);
signed_not!(not_i128, i128);
