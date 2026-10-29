// Independent primitive literal-choice oracles. CI ONLY; ALL UNRUN.
#[test]
fn typed_values_anchor_both_literal_choice_orders() {
    { fn select(value: u8, flag: bool) -> u8 { if flag { 0 } else { value } } assert_eq!(select(u8::MAX, false), u8::MAX); assert_eq!(select(u8::MAX, true), 0); }
    { fn select(value: i8, flag: bool) -> i8 { if flag { 0 } else { value } } assert_eq!(select(i8::MAX, false), i8::MAX); assert_eq!(select(i8::MAX, true), 0); }
    { fn select(value: u16, flag: bool) -> u16 { if flag { 0 } else { value } } assert_eq!(select(u16::MAX, false), u16::MAX); assert_eq!(select(u16::MAX, true), 0); }
    { fn select(value: i16, flag: bool) -> i16 { if flag { 0 } else { value } } assert_eq!(select(i16::MAX, false), i16::MAX); assert_eq!(select(i16::MAX, true), 0); }
    { fn select(value: u32, flag: bool) -> u32 { if flag { 0 } else { value } } assert_eq!(select(u32::MAX, false), u32::MAX); assert_eq!(select(u32::MAX, true), 0); }
    { fn select(value: i32, flag: bool) -> i32 { if flag { 0 } else { value } } assert_eq!(select(i32::MAX, false), i32::MAX); assert_eq!(select(i32::MAX, true), 0); }
    { fn select(value: u64, flag: bool) -> u64 { if flag { 0 } else { value } } assert_eq!(select(u64::MAX, false), u64::MAX); assert_eq!(select(u64::MAX, true), 0); }
    { fn select(value: i64, flag: bool) -> i64 { if flag { 0 } else { value } } assert_eq!(select(i64::MAX, false), i64::MAX); assert_eq!(select(i64::MAX, true), 0); }
    { fn select(value: u128, flag: bool) -> u128 { if flag { 0 } else { value } } assert_eq!(select(u128::MAX, false), u128::MAX); assert_eq!(select(u128::MAX, true), 0); }
    { fn select(value: i128, flag: bool) -> i128 { if flag { 0 } else { value } } assert_eq!(select(i128::MAX, false), i128::MAX); assert_eq!(select(i128::MAX, true), 0); }
}
#[test]
fn array_context_keeps_signed_literals_and_eager_conditions() {
    fn values(value: i8, flag: bool) -> Vec<i8> { vec![if flag { -1 } else { 0 }, value] }
    assert_eq!(values(3, true), vec![-1, 3]);
    assert_eq!(values(3, false), vec![0, 3]);
    fn checked(left: u8, right: u8) -> Vec<u8> {
        vec![if left.checked_add(right).expect("attempt to add with overflow") == 0 { 0 } else { left }]
    }
    assert_eq!(checked(3, 2), vec![3]);
    assert!(std::panic::catch_unwind(|| checked(255, 1)).is_err());
}
