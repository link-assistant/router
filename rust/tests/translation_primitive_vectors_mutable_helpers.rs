//! Independent native helper-created mutable Vec behavior. CI only, after JS gates.
use link_assistant_router::translation_primitive_vectors_core as vectors;

macro_rules! helper_case {
    ($name:ident, $domain:ty, $minimum:expr, $maximum:expr,
     $from:ident, $push:ident, $truncate:ident, $length:ident, $get:ident) => {
        #[test]
        fn $name() {
            fn seed(value: $domain) -> Vec<$domain> {
                vectors::$from(&[value])
            }
            fn bounded(input: Vec<$domain>) -> Vec<$domain> {
                vectors::$truncate(input, u64::MAX)
            }
            fn unchanged(value: $domain) -> Vec<$domain> {
                seed(value)
            }
            fn accumulate(value: $domain, limit: u64) -> Vec<$domain> {
                let mut values = bounded(seed(value));
                for _index in 0..limit {
                    values = vectors::$push(values, value);
                }
                values
            }
            let minimum: $domain = $minimum;
            let maximum: $domain = $maximum;
            assert_eq!(unchanged(minimum), vec![minimum]);
            let mut values = bounded(seed(minimum));
            values = vectors::$push(values, maximum);
            assert_eq!(values, vec![minimum, maximum]);
            assert_eq!(vectors::$length(&values), 2);
            assert_eq!(vectors::$get(&values, 0), Some(minimum));
            assert_eq!(vectors::$get(&values, 1), Some(maximum));
            assert_eq!(vectors::$get(&values, 2), None);
            for limit in [0_u64, 1, 3] {
                assert_eq!(accumulate(maximum, limit), vec![maximum; 1 + limit as usize]);
            }
        }
    };
}

helper_case!(
    boolean_helpers,
    bool,
    false,
    true,
    vec_bool_from_slice,
    vec_bool_push,
    vec_bool_truncate,
    vec_bool_len,
    vec_bool_get,
);
helper_case!(
    unsigned_8_helpers,
    u8,
    0,
    255,
    vec_u8_from_slice,
    vec_u8_push,
    vec_u8_truncate,
    vec_u8_len,
    vec_u8_get,
);
helper_case!(
    signed_8_helpers,
    i8,
    -128,
    127,
    vec_i8_from_slice,
    vec_i8_push,
    vec_i8_truncate,
    vec_i8_len,
    vec_i8_get,
);
helper_case!(
    unsigned_16_helpers,
    u16,
    0,
    65535,
    vec_u16_from_slice,
    vec_u16_push,
    vec_u16_truncate,
    vec_u16_len,
    vec_u16_get,
);
helper_case!(
    signed_16_helpers,
    i16,
    -32768,
    32767,
    vec_i16_from_slice,
    vec_i16_push,
    vec_i16_truncate,
    vec_i16_len,
    vec_i16_get,
);
helper_case!(
    unsigned_32_helpers,
    u32,
    0,
    4294967295,
    vec_u32_from_slice,
    vec_u32_push,
    vec_u32_truncate,
    vec_u32_len,
    vec_u32_get,
);
helper_case!(
    signed_32_helpers,
    i32,
    -2147483648,
    2147483647,
    vec_i32_from_slice,
    vec_i32_push,
    vec_i32_truncate,
    vec_i32_len,
    vec_i32_get,
);
helper_case!(
    unsigned_64_helpers,
    u64,
    0,
    18446744073709551615,
    vec_u64_from_slice,
    vec_u64_push,
    vec_u64_truncate,
    vec_u64_len,
    vec_u64_get,
);
helper_case!(
    signed_64_helpers,
    i64,
    -9223372036854775808,
    9223372036854775807,
    vec_i64_from_slice,
    vec_i64_push,
    vec_i64_truncate,
    vec_i64_len,
    vec_i64_get,
);
helper_case!(
    unsigned_128_helpers,
    u128,
    0,
    340282366920938463463374607431768211455,
    vec_u128_from_slice,
    vec_u128_push,
    vec_u128_truncate,
    vec_u128_len,
    vec_u128_get,
);
helper_case!(
    signed_128_helpers,
    i128,
    -170141183460469231731687303715884105728,
    170141183460469231731687303715884105727,
    vec_i128_from_slice,
    vec_i128_push,
    vec_i128_truncate,
    vec_i128_len,
    vec_i128_get,
);
