// Independent finite helper and ownership oracles. CI ONLY; ALL UNRUN.
mod target {
    pub fn existing(value: bool) -> Vec<bool> { vec![!value] }
    pub fn added(value: bool) -> Vec<bool> { existing(value) }
}
#[test]
fn complete_existing_vector_helper_keeps_result_and_fresh_ownership() {
    for value in [true, false] {
        assert_eq!(target::existing(value), vec![!value]);
        assert_eq!(target::added(value), vec![!value]);
    }
    let mut first = target::added(true);
    let second = target::added(true);
    first[0] = true;
    assert_eq!(second, vec![false]);
}
#[test]
fn independently_added_module_has_its_own_exact_vector_domain() {
    fn values(value: u128) -> Vec<u128> { vec![0, value, u128::MAX] }
    assert_eq!(values(3), vec![0, 3, u128::MAX]);
}
