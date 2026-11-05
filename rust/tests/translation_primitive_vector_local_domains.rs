// Independent local element domains and evaluation oracles. CI ONLY; UNRUN.
fn values(value: u8, other: u16) -> Vec<u8> {
    let _first = vec![other.checked_add(1).expect("attempt to add with overflow")];
    vec![value]
}
#[test]
fn unused_different_width_vector_keeps_its_eager_failure() {
    assert_eq!(values(3, 2), vec![3]);
    assert!(std::panic::catch_unwind(|| values(3, u16::MAX)).is_err());
}
#[test]
fn local_branch_and_move_keep_their_own_element_domain() {
    fn local(value: u8, other: u128, flag: bool) -> Vec<u8> {
        let first = if flag { vec![other] } else { vec![] };
        let _moved = first;
        vec![value]
    }
    assert_eq!(local(3, u128::MAX, true), vec![3]);
    assert_eq!(local(3, u128::MAX, false), vec![3]);
}
