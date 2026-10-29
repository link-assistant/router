// Independent oracle for scalar callers of implicit unit helpers.
// CI only after every same-SHA JavaScript gate. ALL UNRUN locally.
fn check(value: u8) {
    let _checked = value.checked_add(1).expect("attempt to add with overflow");
}
fn relay(value: u8) { check(value); }
fn scalar(value: u8, flag: bool) -> bool {
    check(value);
    flag
}
#[test]
fn implicit_unit_and_scalar_callers_preserve_order() {
    assert_eq!(check(3), ());
    assert_eq!(relay(3), ());
    assert!(!scalar(3, false));
    assert!(scalar(3, true));
    let result = std::panic::catch_unwind(|| scalar(255, false));
    assert!(result.is_err());
}
