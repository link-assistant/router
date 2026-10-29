// Independent checked Option expect oracles; gated CI only. ALL UNRUN.
macro_rules! unsigned {
    ($name:ident, $ty:ty) => {
        #[test]
        fn $name() {
            assert_eq!(::core::option::Option::expect(<$ty>::checked_add(2, 3), "attempt to add with overflow"), 5);
            assert_eq!(::core::option::Option::expect(<$ty>::checked_sub(5, 3), "attempt to subtract with overflow"), 2);
            assert_eq!(::std::option::Option::expect(<$ty>::checked_mul(2, 3), "attempt to multiply with overflow"), 6);
            assert!(std::panic::catch_unwind(|| ::core::option::Option::expect(<$ty>::checked_add(<$ty>::MAX, 1), "attempt to add with overflow")).is_err());
            assert!(std::panic::catch_unwind(|| ::core::option::Option::expect(<$ty>::checked_sub(0, 1), "attempt to subtract with overflow")).is_err());
            assert!(std::panic::catch_unwind(|| ::core::option::Option::expect(<$ty>::checked_mul(<$ty>::MAX, 2), "attempt to multiply with overflow")).is_err());
        }
    };
}
macro_rules! signed {
    ($name:ident, $ty:ty) => {
        #[test]
        fn $name() {
            assert_eq!(::core::option::Option::expect(<$ty>::checked_add(2, -3), "attempt to add with overflow"), -1);
            assert_eq!(::std::option::Option::expect(<$ty>::checked_sub(-2, 3), "attempt to subtract with overflow"), -5);
            assert_eq!(::core::option::Option::expect(<$ty>::checked_mul(-2, 3), "attempt to multiply with overflow"), -6);
            assert!(std::panic::catch_unwind(|| ::core::option::Option::expect(<$ty>::checked_sub(<$ty>::MIN, 1), "attempt to subtract with overflow")).is_err());
            assert!(std::panic::catch_unwind(|| ::core::option::Option::expect(<$ty>::checked_mul(<$ty>::MIN, -1), "attempt to multiply with overflow")).is_err());
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
