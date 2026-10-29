//! Independent paired-core oracle. All native execution is gated CI only.
#[path = "../src/translation_primitive_sequences_core.rs"]
mod sequences;

macro_rules! sequence_case {
    ($test:ident, $integer:ty, $minimum:expr, $maximum:expr, $len:ident, $empty:ident, $get:ident) => {
        #[test]
        fn $test() {
            let mut values: [$integer; 2] = [$minimum, $maximum];
            assert_eq!(sequences::$len(&[]), 0);
            assert!(sequences::$empty(&[]));
            assert_eq!(sequences::$len(&values), 2);
            assert!(!sequences::$empty(&values));
            assert_eq!(sequences::$get(&values, 0), Some($minimum));
            assert_eq!(sequences::$get(&values, 1), Some($maximum));
            assert_eq!(sequences::$get(&values, 2), None);
            assert_eq!(sequences::$get(&values, u64::MAX), None);
            let copied = sequences::$get(&values, 0);
            values[0] = $maximum;
            assert_eq!(copied, Some($minimum));
            assert_eq!(sequences::$get(&values, 0), Some($maximum));
        }
    };
}

sequence_case!(booleans, bool, false, true,
    slice_bool_len, slice_bool_is_empty, slice_bool_get);
sequence_case!(unsigned_8, u8, 0u8, 255u8,
    slice_u8_len, slice_u8_is_empty, slice_u8_get);
sequence_case!(signed_8, i8, -128i8, 127i8,
    slice_i8_len, slice_i8_is_empty, slice_i8_get);
sequence_case!(unsigned_16, u16, 0u16, 65535u16,
    slice_u16_len, slice_u16_is_empty, slice_u16_get);
sequence_case!(signed_16, i16, -32768i16, 32767i16,
    slice_i16_len, slice_i16_is_empty, slice_i16_get);
sequence_case!(unsigned_32, u32, 0u32, 4294967295u32,
    slice_u32_len, slice_u32_is_empty, slice_u32_get);
sequence_case!(signed_32, i32, -2147483648i32, 2147483647i32,
    slice_i32_len, slice_i32_is_empty, slice_i32_get);
sequence_case!(unsigned_64, u64, 0u64, 18446744073709551615u64,
    slice_u64_len, slice_u64_is_empty, slice_u64_get);
sequence_case!(signed_64, i64, -9223372036854775808i64, 9223372036854775807i64,
    slice_i64_len, slice_i64_is_empty, slice_i64_get);
sequence_case!(unsigned_128, u128, 0u128, 340282366920938463463374607431768211455u128,
    slice_u128_len, slice_u128_is_empty, slice_u128_get);
sequence_case!(signed_128, i128,
    -170141183460469231731687303715884105728i128,
    170141183460469231731687303715884105727i128,
    slice_i128_len, slice_i128_is_empty, slice_i128_get);

#[test]
fn long_boolean_slices_have_no_artificial_4096_limit() {
    let values = vec![false; 5001];
    assert_eq!(sequences::slice_bool_len(&values), 5001);
    assert_eq!(sequences::slice_bool_get(&values, 5000), Some(false));
}
