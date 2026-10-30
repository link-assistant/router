// Independent shared-reference caller oracle SOURCE. CI only after all eight
// same-SHA JavaScript gates. No local Rust tool invocation is authorized.
use link_assistant_router::translation_primitive_vectors_core as core_vectors;
macro_rules! shared_input {
    ($name:ident, $ty:ty, $value:expr, $len:path, $get:path) => {
        #[test]
        fn $name() {
            for size in [0_usize, 1, 4096] {
                let values: Vec<$ty> = vec![$value; size];
                let input = &values;
                let _checked = ($len)(input);
                let alias = input;
                assert_eq!(($len)(alias), size as u64);
                assert_eq!(($get)(alias, 0), if size == 0 { None } else { Some($value) });
                assert_eq!(($get)(input, u64::MAX), None);
                assert_eq!(values.len(), size);
            }
            let oversized: Vec<$ty> = vec![$value; 4097];
            assert!(std::panic::catch_unwind(|| ($len)(&oversized)).is_err());
        }
    };
}
shared_input!(shared_bool, bool, true, core_vectors::vec_bool_len, core_vectors::vec_bool_get);
shared_input!(shared_u8, u8, u8::MAX, core_vectors::vec_u8_len, core_vectors::vec_u8_get);
shared_input!(shared_i8, i8, i8::MIN, core_vectors::vec_i8_len, core_vectors::vec_i8_get);
shared_input!(shared_u16, u16, u16::MAX, core_vectors::vec_u16_len, core_vectors::vec_u16_get);
shared_input!(shared_i16, i16, i16::MIN, core_vectors::vec_i16_len, core_vectors::vec_i16_get);
shared_input!(shared_u32, u32, u32::MAX, core_vectors::vec_u32_len, core_vectors::vec_u32_get);
shared_input!(shared_i32, i32, i32::MIN, core_vectors::vec_i32_len, core_vectors::vec_i32_get);
shared_input!(shared_u64, u64, u64::MAX, core_vectors::vec_u64_len, core_vectors::vec_u64_get);
shared_input!(shared_i64, i64, i64::MIN, core_vectors::vec_i64_len, core_vectors::vec_i64_get);
shared_input!(shared_u128, u128, u128::MAX, core_vectors::vec_u128_len, core_vectors::vec_u128_get);
shared_input!(shared_i128, i128, i128::MIN, core_vectors::vec_i128_len, core_vectors::vec_i128_get);
