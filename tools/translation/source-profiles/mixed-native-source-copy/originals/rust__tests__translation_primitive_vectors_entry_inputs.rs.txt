// Independent native entry guard oracle SOURCE. CI only after all eight
// same-SHA JavaScript stages. Never compile locally during bulk drafting.
#[path = "../src/translation_primitive_vectors_core.rs"]
mod core_vectors;
macro_rules! guarded_input {
    ($name:ident, $ty:ty, $value:expr, $truncate:path) => {
        #[test]
        fn $name() {
            for size in [0_usize, 1, 4096] {
                let input: Vec<$ty> = vec![$value; size];
                let values = ($truncate)(input, u64::MAX);
                assert_eq!(values, vec![$value; size]);
            }
            let oversized: Vec<$ty> = vec![$value; 4097];
            assert!(std::panic::catch_unwind(|| ($truncate)(oversized, u64::MAX)).is_err());
        }
    };
}
guarded_input!(entry_bool, bool, true, core_vectors::vec_bool_truncate);
guarded_input!(entry_u8, u8, u8::MAX, core_vectors::vec_u8_truncate);
guarded_input!(entry_i8, i8, i8::MIN, core_vectors::vec_i8_truncate);
guarded_input!(entry_u16, u16, u16::MAX, core_vectors::vec_u16_truncate);
guarded_input!(entry_i16, i16, i16::MIN, core_vectors::vec_i16_truncate);
guarded_input!(entry_u32, u32, u32::MAX, core_vectors::vec_u32_truncate);
guarded_input!(entry_i32, i32, i32::MIN, core_vectors::vec_i32_truncate);
guarded_input!(entry_u64, u64, u64::MAX, core_vectors::vec_u64_truncate);
guarded_input!(entry_i64, i64, i64::MIN, core_vectors::vec_i64_truncate);
guarded_input!(entry_u128, u128, u128::MAX, core_vectors::vec_u128_truncate);
guarded_input!(entry_i128, i128, i128::MIN, core_vectors::vec_i128_truncate);
