// Independent unqualified immutable literal alias oracles. CI ONLY; UNRUN.
#[test]
fn each_actual_vector_domain_resolves_immutable_literal_aliases() {
    { fn values(value: u8, flag: bool) -> Vec<u8> { let zero = 0; let alias = zero; vec![alias, if flag { alias } else { value }] } assert_eq!(values(u8::MAX, false), vec![0, u8::MAX]); assert_eq!(values(u8::MAX, true), vec![0, 0]); }
    { fn values(value: i8, flag: bool) -> Vec<i8> { let zero = 0; let alias = zero; vec![alias, if flag { alias } else { value }] } assert_eq!(values(i8::MAX, false), vec![0, i8::MAX]); assert_eq!(values(i8::MAX, true), vec![0, 0]); }
    { fn values(value: u16, flag: bool) -> Vec<u16> { let zero = 0; let alias = zero; vec![alias, if flag { alias } else { value }] } assert_eq!(values(u16::MAX, false), vec![0, u16::MAX]); assert_eq!(values(u16::MAX, true), vec![0, 0]); }
    { fn values(value: i16, flag: bool) -> Vec<i16> { let zero = 0; let alias = zero; vec![alias, if flag { alias } else { value }] } assert_eq!(values(i16::MAX, false), vec![0, i16::MAX]); assert_eq!(values(i16::MAX, true), vec![0, 0]); }
    { fn values(value: u32, flag: bool) -> Vec<u32> { let zero = 0; let alias = zero; vec![alias, if flag { alias } else { value }] } assert_eq!(values(u32::MAX, false), vec![0, u32::MAX]); assert_eq!(values(u32::MAX, true), vec![0, 0]); }
    { fn values(value: i32, flag: bool) -> Vec<i32> { let zero = 0; let alias = zero; vec![alias, if flag { alias } else { value }] } assert_eq!(values(i32::MAX, false), vec![0, i32::MAX]); assert_eq!(values(i32::MAX, true), vec![0, 0]); }
    { fn values(value: u64, flag: bool) -> Vec<u64> { let zero = 0; let alias = zero; vec![alias, if flag { alias } else { value }] } assert_eq!(values(u64::MAX, false), vec![0, u64::MAX]); assert_eq!(values(u64::MAX, true), vec![0, 0]); }
    { fn values(value: i64, flag: bool) -> Vec<i64> { let zero = 0; let alias = zero; vec![alias, if flag { alias } else { value }] } assert_eq!(values(i64::MAX, false), vec![0, i64::MAX]); assert_eq!(values(i64::MAX, true), vec![0, 0]); }
    { fn values(value: u128, flag: bool) -> Vec<u128> { let zero = 0; let alias = zero; vec![alias, if flag { alias } else { value }] } assert_eq!(values(u128::MAX, false), vec![0, u128::MAX]); assert_eq!(values(u128::MAX, true), vec![0, 0]); }
    { fn values(value: i128, flag: bool) -> Vec<i128> { let zero = 0; let alias = zero; vec![alias, if flag { alias } else { value }] } assert_eq!(values(i128::MAX, false), vec![0, i128::MAX]); assert_eq!(values(i128::MAX, true), vec![0, 0]); }
}
#[test]
fn checked_results_are_evaluated_even_when_the_result_is_unused() {
    fn values(left: u8, right: u8) -> Vec<u8> {
        let _zero = left.checked_sub(right).expect("attempt to subtract with overflow");
        vec![left]
    }
    assert_eq!(values(3, 2), vec![3]);
    assert!(std::panic::catch_unwind(|| values(0, 1)).is_err());
}
