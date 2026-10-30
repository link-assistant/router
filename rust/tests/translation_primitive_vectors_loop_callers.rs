// Independent native caller oracle SOURCE. Run only in CI after all eight
// same-SHA JavaScript gates; never compile locally during bulk drafting.
use link_assistant_router::translation_primitive_vectors_core as core_vectors;
macro_rules! accumulation {
    ($name:ident, $ty:ty, $value:expr, $new:path, $push:path, $len:path) => {
        #[test]
        fn $name() {
            for limit in [0_u64, 1, 3] {
                let mut values: Vec<$ty> = ($new)();
                for _index in 0_u64..limit {
                    values = ($push)(values, $value);
                }
                assert_eq!(values, vec![$value; limit as usize]);
                assert_eq!(($len)(&values), limit);
                let mut remaining = limit;
                let mut other: Vec<$ty> = ($new)();
                while remaining > 0 {
                    other = ($push)(other, $value);
                    remaining -= 1;
                }
                assert_eq!(other, values);
            }
        }
    };
}
accumulation!(loop_bool, bool, true, core_vectors::vec_bool_new, core_vectors::vec_bool_push, core_vectors::vec_bool_len);
accumulation!(loop_u8, u8, u8::MAX, core_vectors::vec_u8_new, core_vectors::vec_u8_push, core_vectors::vec_u8_len);
accumulation!(loop_i8, i8, i8::MIN, core_vectors::vec_i8_new, core_vectors::vec_i8_push, core_vectors::vec_i8_len);
accumulation!(loop_u16, u16, u16::MAX, core_vectors::vec_u16_new, core_vectors::vec_u16_push, core_vectors::vec_u16_len);
accumulation!(loop_i16, i16, i16::MIN, core_vectors::vec_i16_new, core_vectors::vec_i16_push, core_vectors::vec_i16_len);
accumulation!(loop_u32, u32, u32::MAX, core_vectors::vec_u32_new, core_vectors::vec_u32_push, core_vectors::vec_u32_len);
accumulation!(loop_i32, i32, i32::MIN, core_vectors::vec_i32_new, core_vectors::vec_i32_push, core_vectors::vec_i32_len);
accumulation!(loop_u64, u64, u64::MAX, core_vectors::vec_u64_new, core_vectors::vec_u64_push, core_vectors::vec_u64_len);
accumulation!(loop_i64, i64, i64::MIN, core_vectors::vec_i64_new, core_vectors::vec_i64_push, core_vectors::vec_i64_len);
accumulation!(loop_u128, u128, u128::MAX, core_vectors::vec_u128_new, core_vectors::vec_u128_push, core_vectors::vec_u128_len);
accumulation!(loop_i128, i128, i128::MIN, core_vectors::vec_i128_new, core_vectors::vec_i128_push, core_vectors::vec_i128_len);
