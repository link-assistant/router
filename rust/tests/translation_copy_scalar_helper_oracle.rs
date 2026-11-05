// Independent native Copy scalar edge cases. CI only after all JavaScript gates.
fn identity<T: ::core::marker::Copy>(value: T) -> T { value }
fn selected<T: ::core::marker::Copy>(yes: bool, left: T, right: T) -> T {
    if yes { left } else { right }
}
macro_rules! scalar_case {
    ($name:ident, $domain:ty) => {
        #[test]
        fn $name() {
            let lo = <$domain>::MIN;
            let hi = <$domain>::MAX;
            assert_eq!(identity(lo), lo);
            assert_eq!(identity(hi), hi);
            assert_eq!(selected(true, lo, hi), lo);
            assert_eq!(selected(false, lo, hi), hi);
            assert!(lo < hi);
            assert!(lo != hi);
            assert!(lo <= lo && hi >= hi);
        }
    };
}
scalar_case!(copy_u8_bounds, ::core::primitive::u8);
scalar_case!(copy_i8_bounds, ::core::primitive::i8);
scalar_case!(copy_u16_bounds, ::core::primitive::u16);
scalar_case!(copy_i16_bounds, ::core::primitive::i16);
scalar_case!(copy_u32_bounds, ::core::primitive::u32);
scalar_case!(copy_i32_bounds, ::core::primitive::i32);
scalar_case!(copy_u64_bounds, ::core::primitive::u64);
scalar_case!(copy_i64_bounds, ::core::primitive::i64);
scalar_case!(copy_u128_bounds, ::core::primitive::u128);
scalar_case!(copy_i128_bounds, ::core::primitive::i128);

#[test]
fn copied_boolean_arms() {
    for value in [false, true] {
        assert_eq!(identity(value), value);
        assert_eq!(selected(true, value, !value), value);
        assert_eq!(selected(false, value, !value), !value);
    }
}
