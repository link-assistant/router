// Independent scalar/unit caller and vector helper ordering. CI ONLY; UNRUN.
fn helper(value: u8) -> Vec<u8> { vec![value.checked_add(1).expect("attempt to add with overflow")] }
fn values(value: u8, flag: bool) -> bool {
    let owned = helper(value);
    let _moved = owned;
    flag
}
#[test]
fn scalar_caller_cannot_drop_an_unused_owned_helper_failure() {
    assert!(values(3, true));
    assert!(!values(3, false));
    assert!(std::panic::catch_unwind(|| values(255, false)).is_err());
}
#[test]
fn scalar_and_unit_results_keep_independent_empty_local_domains() {
    fn scalar(flag: bool) -> bool {
        let empty: Vec<u8> = vec![];
        let literal: Vec<u8> = vec![0];
        let selected = if flag { empty } else { literal };
        let _moved = selected;
        flag
    }
    fn unit(value: bool) { let _owned = vec![value]; }
    assert!(scalar(true));
    assert!(!scalar(false));
    unit(true);
}
