// Independent finite vector type inference oracles. CI ONLY; ALL UNRUN.
#[test]
fn empty_branch_and_local_domains_follow_the_actual_typed_operand() {
    { let value: u8 = 3; let empty = vec![]; let selected = if false { empty } else { vec![0, value] }; assert_eq!(selected, vec![0, 3]); }
    { let value: i8 = 3; let empty = vec![]; let selected = if false { empty } else { vec![0, value] }; assert_eq!(selected, vec![0, 3]); }
    { let value: u16 = 3; let empty = vec![]; let selected = if false { empty } else { vec![0, value] }; assert_eq!(selected, vec![0, 3]); }
    { let value: i16 = 3; let empty = vec![]; let selected = if false { empty } else { vec![0, value] }; assert_eq!(selected, vec![0, 3]); }
    { let value: u32 = 3; let empty = vec![]; let selected = if false { empty } else { vec![0, value] }; assert_eq!(selected, vec![0, 3]); }
    { let value: i32 = 3; let empty = vec![]; let selected = if false { empty } else { vec![0, value] }; assert_eq!(selected, vec![0, 3]); }
    { let value: u64 = 3; let empty = vec![]; let selected = if false { empty } else { vec![0, value] }; assert_eq!(selected, vec![0, 3]); }
    { let value: i64 = 3; let empty = vec![]; let selected = if false { empty } else { vec![0, value] }; assert_eq!(selected, vec![0, 3]); }
    { let value: u128 = 3; let empty = vec![]; let selected = if false { empty } else { vec![0, value] }; assert_eq!(selected, vec![0, 3]); }
    { let value: i128 = 3; let empty = vec![]; let selected = if false { empty } else { vec![0, value] }; assert_eq!(selected, vec![0, 3]); }
}
#[test]
fn signed_extreme_and_empty_alternatives_preserve_the_domain() {
    let value: i128 = -3;
    let empty = vec![];
    let selected = if false { empty } else { vec![i128::MIN, value] };
    assert_eq!(selected, vec![i128::MIN, -3]);
}
#[test]
fn boolean_literals_supply_an_unambiguous_domain() {
    let selected = if true { vec![] } else { vec![true, false] };
    assert!(selected.is_empty());
}
