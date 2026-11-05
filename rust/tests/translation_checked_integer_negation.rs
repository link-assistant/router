// Independent signed edge oracle SOURCE; gated CI only, never local Rust.
macro_rules! checked_negation {
    ($name:ident,$type:ty) => {
        #[test]
        fn $name() {
            assert_eq!(<$type>::checked_neg(0), Some(0));
            assert_eq!(<$type>::checked_neg(1), Some(-1));
            assert_eq!(<$type>::checked_neg(-1), Some(1));
            assert_eq!(<$type>::MAX.checked_neg(), Some(-<$type>::MAX));
            assert_eq!((<$type>::MIN + 1).checked_neg(), Some(<$type>::MAX));
            assert_eq!(<$type>::MIN.checked_neg(), None);
            let failure = std::panic::catch_unwind(|| {
                ::core::option::Option::expect(<$type>::MIN.checked_neg(), "attempt to negate with overflow")
            }).unwrap_err();
            let message = failure.downcast_ref::<String>().map(String::as_str)
                .or_else(|| failure.downcast_ref::<&str>().copied());
            assert_eq!(message, Some("attempt to negate with overflow"));
        }
    };
}
checked_negation!(checked_negation_i8, i8);
checked_negation!(checked_negation_i16, i16);
checked_negation!(checked_negation_i32, i32);
checked_negation!(checked_negation_i64, i64);
checked_negation!(checked_negation_i128, i128);
