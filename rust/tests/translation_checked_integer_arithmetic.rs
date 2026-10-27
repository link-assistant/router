// Independent native oracle SOURCE. No local Rust tools; gated CI only.
macro_rules! checked_arithmetic {
    ($name:ident,$type:ty) => {
        #[test]
        fn $name() {
            assert_eq!(<$type>::checked_add(3, 4), Some(7));
            assert_eq!(<$type>::checked_sub(7, 3), Some(4));
            assert_eq!(<$type>::checked_mul(3, 4), Some(12));
            assert_eq!(<$type>::checked_div(7, 3), Some(2));
            assert_eq!(<$type>::checked_rem(7, 3), Some(1));
            assert_eq!(<$type>::MAX.checked_add(1), None);
            assert_eq!(<$type>::MIN.checked_sub(1), None);
            assert_eq!(<$type>::MAX.checked_mul(2), None);
            assert_eq!(<$type>::checked_div(1, 0), None);
            assert_eq!(<$type>::checked_rem(1, 0), None);
            let failure = std::panic::catch_unwind(|| {
                ::core::option::Option::expect(<$type>::MAX.checked_add(1), "attempt to add with overflow")
            }).unwrap_err();
            let message = failure.downcast_ref::<String>().map(String::as_str)
                .or_else(|| failure.downcast_ref::<&str>().copied());
            assert_eq!(message, Some("attempt to add with overflow"));
        }
    };
}
checked_arithmetic!(checked_arithmetic_u8, u8);
checked_arithmetic!(checked_arithmetic_i8, i8);
checked_arithmetic!(checked_arithmetic_u16, u16);
checked_arithmetic!(checked_arithmetic_i16, i16);
checked_arithmetic!(checked_arithmetic_u32, u32);
checked_arithmetic!(checked_arithmetic_i32, i32);
checked_arithmetic!(checked_arithmetic_u64, u64);
checked_arithmetic!(checked_arithmetic_i64, i64);
checked_arithmetic!(checked_arithmetic_u128, u128);
checked_arithmetic!(checked_arithmetic_i128, i128);
#[test]
fn signed_division_and_remainder_preserve_rounding_and_minimum_overflow() {
    assert_eq!(i128::checked_div(-7, 3), Some(-2));
    assert_eq!(i128::checked_rem(-7, 3), Some(-1));
    assert_eq!(i128::checked_div(7, -3), Some(-2));
    assert_eq!(i128::checked_rem(7, -3), Some(1));
    assert_eq!(i128::MIN.checked_div(-1), None);
    assert_eq!(i128::MIN.checked_rem(-1), None);
}
