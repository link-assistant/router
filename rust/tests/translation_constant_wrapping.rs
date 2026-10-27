// Independent native oracle SOURCE; CI only after all eight JavaScript gates.
macro_rules! wrapping_constants {
    ($name:ident,$type:ty) => {
        #[test]
        fn $name() {
            const ADD: $type = <$type>::MAX.wrapping_add(1);
            const SUB: $type = <$type>::MIN.wrapping_sub(1);
            const ZERO: $type = <$type>::MAX.wrapping_sub(<$type>::MAX);
            const fn combine(a: $type, b: $type) -> $type { a.wrapping_add(b) }
            const VIA: $type = combine(<$type>::MAX, 1);
            assert_eq!(ADD, <$type>::MIN);
            assert_eq!(SUB, <$type>::MAX);
            assert_eq!(ZERO, 0);
            assert_eq!(VIA, <$type>::MIN);
        }
    };
}
wrapping_constants!(constant_wrap_u8, u8);
wrapping_constants!(constant_wrap_i8, i8);
wrapping_constants!(constant_wrap_u16, u16);
wrapping_constants!(constant_wrap_i16, i16);
wrapping_constants!(constant_wrap_u32, u32);
wrapping_constants!(constant_wrap_i32, i32);
wrapping_constants!(constant_wrap_u64, u64);
wrapping_constants!(constant_wrap_i64, i64);
wrapping_constants!(constant_wrap_u128, u128);
wrapping_constants!(constant_wrap_i128, i128);
