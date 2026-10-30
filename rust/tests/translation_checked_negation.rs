// Independent checked-negation oracles; gated CI only, ALL UNRUN.
macro_rules! signed {
    ($name:ident, $ty:ty) => {
        #[test]
        fn $name() {
            assert_eq!(<$ty>::checked_neg(0), Some(0));
            assert_eq!(<$ty>::checked_neg(-1), Some(1));
            assert_eq!(<$ty>::checked_neg(<$ty>::MIN), None);
            assert_eq!(::core::option::Option::expect(<$ty>::checked_neg(-1), "attempt to negate with overflow"), 1);
            assert!(std::panic::catch_unwind(|| ::core::option::Option::expect(<$ty>::checked_neg(<$ty>::MIN), "attempt to negate with overflow")).is_err());
            fn guarded(value: $ty, flag: bool) -> $ty {
                if flag {
                    ::core::option::Option::expect(<$ty>::checked_neg(value), "attempt to negate with overflow")
                } else {
                    value
                }
            }
            assert_eq!(guarded(<$ty>::MIN, false), <$ty>::MIN);
            assert!(std::panic::catch_unwind(|| guarded(<$ty>::MIN, true)).is_err());
        }
    };
}
macro_rules! unsigned {
    ($name:ident, $ty:ty) => {
        #[test]
        fn $name() {
            assert_eq!(<$ty>::checked_neg(0), Some(0));
            assert_eq!(<$ty>::checked_neg(1), None);
            assert_eq!(<$ty>::checked_neg(<$ty>::MAX), None);
        }
    };
}
signed!(signed8, i8);
signed!(signed16, i16);
signed!(signed32, i32);
signed!(signed64, i64);
signed!(signed128, i128);
unsigned!(unsigned8, u8);
unsigned!(unsigned16, u16);
unsigned!(unsigned32, u32);
unsigned!(unsigned64, u64);
unsigned!(unsigned128, u128);
