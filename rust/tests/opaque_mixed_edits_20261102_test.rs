//! Independent mixed helper/local/literal behavior. Gated native CI only.
fn oldhelper(value: u64) -> Option<u64> { value.checked_sub(1) }
fn newhelper(value: u64) -> Option<u64> { value.checked_add(1) }
#[allow(clippy::let_and_return)]
fn before(input: u64) -> (Option<u64>, bool) {
    let local = oldhelper(input);
    (local, true)
}
fn after(input: u64) -> (Option<u64>, bool) {
    let renamed = newhelper(input);
    (renamed, false)
}

#[test]
fn mixed_changes_have_independent_boundary_expectations() {
    assert_eq!(before(0), (None, true));
    assert_eq!(after(0), (Some(1), false));
    assert_eq!(before(u64::MAX), (Some(u64::MAX - 1), true));
    assert_eq!(after(u64::MAX), (None, false));
}

#[test]
fn local_rename_and_literal_change_do_not_repeat_arguments() {
    let mut calls = Vec::new();
    let mut argument = || { calls.push("argument"); 2u64 };
    assert_eq!(after(argument()), (Some(3), false));
    assert_eq!(calls, vec!["argument"]);
}
