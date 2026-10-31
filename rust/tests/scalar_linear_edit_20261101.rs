// Independent edited-operation/conditional oracle SOURCE. UNRUN. Existing
// complete same-SHA JavaScript gate precedes Cargo; no new native ABI.
#[test]
fn edited_scalar_multiply_and_predicate_have_independent_expected_values() {
    let first: Vec<u64> = [0u64, 1, 2, 3].iter().copied()
        .map(|item| item.checked_mul(2).expect("multiply overflow")).collect();
    let second: Vec<u64> = first.iter().copied().filter(|item| *item >= 4).collect();
    assert_eq!(second, vec![4, 6]);
    let first: Vec<u64> = vec![2u64; 4096].iter().copied()
        .map(|item| item.checked_mul(2).expect("multiply overflow")).collect();
    let second: Vec<u64> = first.iter().copied().filter(|item| *item >= 4).collect();
    assert_eq!(second, vec![4u64; 4096]);
}

#[test]
fn edited_conditional_branch_and_predicate_have_independent_expected_values() {
    let first: Vec<u64> = [0u64, 1, 2].iter().copied()
        .map(|item| if item == 0 { 9 } else { item }).collect();
    let second: Vec<u64> = first.iter().copied().filter(|item| *item >= 1).collect();
    assert_eq!(second, vec![9, 1, 2]);
    assert_eq!(u64::MAX.checked_mul(2), None);
}
