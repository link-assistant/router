//! Independent slice value/Copy oracle. CI only after all JavaScript gates.
//! These cases do not execute or qualify the JavaScript source translator.

macro_rules! primitive_slice_case {
    ($name:ident, $integer:ty, $minimum:expr, $maximum:expr) => {
        #[test]
        fn $name() {
            fn has_value(values: &[$integer]) -> bool {
                for value in values.iter().copied() {
                    if value != 0 {
                        return true;
                    }
                }
                false
            }
            assert!(!has_value(&[]));
            assert!(!has_value(&[0]));
            assert!(has_value(&[$maximum]));
            assert!(has_value(&[$minimum, $maximum]));
            let long = vec![0; 5001];
            assert!(!has_value(&long));
            let mut early = long;
            early[0] = 1;
            assert!(has_value(&early));
        }
    };
}

primitive_slice_case!(unsigned_8, u8, 0u8, 255u8);
primitive_slice_case!(signed_8, i8, -128i8, 127i8);
primitive_slice_case!(unsigned_16, u16, 0u16, 65535u16);
primitive_slice_case!(signed_16, i16, -32768i16, 32767i16);
primitive_slice_case!(unsigned_32, u32, 0u32, 4294967295u32);
primitive_slice_case!(signed_32, i32, -2147483648i32, 2147483647i32);
primitive_slice_case!(unsigned_64, u64, 0u64, 18446744073709551615u64);
primitive_slice_case!(signed_64, i64, -9223372036854775808i64, 9223372036854775807i64);
primitive_slice_case!(unsigned_128, u128, 0u128, 340282366920938463463374607431768211455u128);
primitive_slice_case!(signed_128, i128, -170141183460469231731687303715884105728i128, 170141183460469231731687303715884105727i128);
