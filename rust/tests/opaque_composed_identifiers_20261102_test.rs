//! Independent mixed local/callee-edit expectations; native execution is CI only.
fn oldhelper(value: u64) -> Option<u64> { value.checked_sub(1) }
fn newhelper(value: u64) -> Option<u64> { value.checked_add(1) }
#[allow(clippy::let_and_return)]
fn before(input: u64) -> Option<u64> { let local = oldhelper(input); local }
#[allow(clippy::let_and_return)]
fn after(input: u64) -> Option<u64> { let renamed = newhelper(input); renamed }

#[test]
fn changed_helper_has_new_independent_boundary_outcomes() {
    assert_eq!(before(0), None);
    assert_eq!(after(0), Some(1));
    assert_eq!(before(u64::MAX), Some(u64::MAX - 1));
    assert_eq!(after(u64::MAX), None);
}

#[test]
fn consistent_local_rename_does_not_repeat_argument_evaluation() {
    let mut calls = Vec::new();
    let mut argument = || { calls.push("argument"); 2u64 };
    assert_eq!(after(argument()), Some(3));
    assert_eq!(calls, vec!["argument"]);
}
