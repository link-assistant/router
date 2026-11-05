//! Independent wrapping multiplication boundary oracle sources. CI-only, unrun.
macro_rules! unsigned_wrapping {
    ($name:ident, $kind:ty) => {
        #[test]
        fn $name() {
            let maximum = <$kind>::MAX;
            assert_eq!(maximum.wrapping_mul(maximum), 1);
            assert_eq!(maximum.wrapping_mul(2), maximum - 1);
            assert_eq!(maximum.wrapping_mul(0), 0);
            assert_eq!((13 as $kind).wrapping_mul(7), 91);
        }
    };
}

macro_rules! signed_wrapping {
    ($name:ident, $kind:ty) => {
        #[test]
        fn $name() {
            let maximum = <$kind>::MAX;
            let minimum = <$kind>::MIN;
            assert_eq!(maximum.wrapping_mul(maximum), 1);
            assert_eq!(maximum.wrapping_mul(2), -2);
            assert_eq!(minimum.wrapping_mul(-1), minimum);
            assert_eq!(minimum.wrapping_mul(minimum), 0);
            assert_eq!((-13 as $kind).wrapping_mul(7), -91);
        }
    };
}

unsigned_wrapping!(u8_wrapping_products, u8);
unsigned_wrapping!(u16_wrapping_products, u16);
unsigned_wrapping!(u32_wrapping_products, u32);
unsigned_wrapping!(u64_wrapping_products, u64);
unsigned_wrapping!(u128_wrapping_products, u128);
signed_wrapping!(i8_wrapping_products, i8);
signed_wrapping!(i16_wrapping_products, i16);
signed_wrapping!(i32_wrapping_products, i32);
signed_wrapping!(i64_wrapping_products, i64);
signed_wrapping!(i128_wrapping_products, i128);
