// Independent new-vector definition edge oracles. CI ONLY; ALL UNRUN.
fn scalar(left: u8, right: u8) -> u8 {
    left.checked_add(right).expect("attempt to add with overflow")
}
fn helper(left: u8, right: u8) -> Vec<u8> { vec![scalar(left, right), right] }
fn values(left: u8, right: u8) -> Vec<u8> {
    let first = helper(left, right);
    let moved = first;
    std::hint::black_box(moved)
}
#[test]
fn mixed_scalar_vector_helpers_move_their_owned_result() {
    assert_eq!(values(3, 2), vec![5, 2]);
    assert!(std::panic::catch_unwind(|| values(255, 1)).is_err());
}
#[test]
fn empty_boolean_vector_has_a_precise_domain_and_new_ownership() {
    let mut first: Vec<bool> = vec![];
    let second: Vec<bool> = vec![];
    first.push(true);
    assert_eq!(first, vec![true]);
    assert!(second.is_empty());
}
#[test]
fn repeated_returned_allocations_do_not_alias() {
    let mut first = values(3, 2);
    let second = values(3, 2);
    first[0] = 99;
    assert_eq!(second, vec![5, 2]);
}
