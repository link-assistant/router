// Independent owned primitive Vec helper edge oracles. CI ONLY; ALL UNRUN.
fn helper(left: u8, right: u8) -> Vec<u8> {
    vec![left.checked_add(right).expect("attempt to add with overflow"), right]
}
fn middle(left: u8, right: u8) -> Vec<u8> { helper(left, right) }
#[test]
fn returned_helper_container_moves_without_copying() {
    let first = middle(3, 2);
    let moved = first;
    assert_eq!(moved, vec![5, 2]);
}
#[test]
fn unselected_helper_does_not_overflow() {
    let flag = std::hint::black_box(false);
    let result = if flag {helper(255, 1)} else {vec![255, 1]};
    assert_eq!(result, vec![255, 1]);
}
#[test]
fn unused_helper_result_still_panics() {
    assert!(std::panic::catch_unwind(|| {
        let _discarded = helper(255, 1);
        vec![0_u8]
    }).is_err());
}
#[test]
fn distinct_calls_return_distinct_owned_containers() {
    let mut first = helper(3, 2);
    let second = helper(3, 2);
    first[0] = 99;
    assert_eq!(second, vec![5, 2]);
}
