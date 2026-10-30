// Independent native literal/copy caller oracle SOURCE. CI only after all
// eight same-SHA JavaScript gates. No local Rust compilation is authorized.
use link_assistant_router::translation_primitive_vectors_core as vectors;
macro_rules! literal_copy {
    ($name:ident, $ty:ty, $minimum:expr, $maximum:expr, $copy:path) => {
        #[test]
        fn $name() {
            let events = std::cell::RefCell::new(Vec::new());
            let value = |tag: u8, value: $ty| { events.borrow_mut().push(tag); value };
            let result = ($copy)(&[value(1, $minimum), value(2, $maximum)]);
            assert_eq!(*events.borrow(), vec![1_u8, 2_u8]);
            assert_eq!(result, vec![$minimum, $maximum]);
            let empty: &[$ty] = &[];
            assert!(($copy)(empty).is_empty());
        }
    };
}
literal_copy!(literal_bool, bool, false, true, vectors::vec_bool_from_slice);
literal_copy!(literal_u8, u8, u8::MIN, u8::MAX, vectors::vec_u8_from_slice);
literal_copy!(literal_i8, i8, i8::MIN, i8::MAX, vectors::vec_i8_from_slice);
literal_copy!(literal_u16, u16, u16::MIN, u16::MAX, vectors::vec_u16_from_slice);
literal_copy!(literal_i16, i16, i16::MIN, i16::MAX, vectors::vec_i16_from_slice);
literal_copy!(literal_u32, u32, u32::MIN, u32::MAX, vectors::vec_u32_from_slice);
literal_copy!(literal_i32, i32, i32::MIN, i32::MAX, vectors::vec_i32_from_slice);
literal_copy!(literal_u64, u64, u64::MIN, u64::MAX, vectors::vec_u64_from_slice);
literal_copy!(literal_i64, i64, i64::MIN, i64::MAX, vectors::vec_i64_from_slice);
literal_copy!(literal_u128, u128, u128::MIN, u128::MAX, vectors::vec_u128_from_slice);
literal_copy!(literal_i128, i128, i128::MIN, i128::MAX, vectors::vec_i128_from_slice);
