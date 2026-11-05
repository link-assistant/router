// Independent scalar-return/native local vector oracles. CI ONLY; UNRUN.
fn status(value: u8, other: u16, flag: bool) -> bool {
    let _first = vec![value];
    let local = if flag { vec![other] } else { vec![] };
    let _moved = local;
    flag
}
#[test]
fn scalar_return_does_not_erase_local_owned_vector_domains() {
    assert!(status(3, u16::MAX, true));
    assert!(!status(3, u16::MAX, false));
}
#[test]
fn eager_unused_vector_helper_failure_precedes_scalar_return() {
    fn helper(value: u8) -> Vec<u8> {
        vec![value.checked_add(1).expect("attempt to add with overflow")]
    }
    fn status(value: u8) -> bool { let _owned = helper(value); true }
    assert!(status(3));
    assert!(std::panic::catch_unwind(|| status(255)).is_err());
}
