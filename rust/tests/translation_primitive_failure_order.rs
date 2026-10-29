// Independent ordered failure oracles. Gated CI only; ALL UNRUN.
fn add(left: u8, right: u8) -> u8 {
    ::core::option::Option::expect(u8::checked_add(left, right), "attempt to add with overflow")
}
fn multiply(left: u8, right: u8) -> u8 {
    ::core::option::Option::expect(u8::checked_mul(left, right), "attempt to multiply with overflow")
}
fn subtract(left: u8, right: u8) -> u8 {
    ::core::option::Option::expect(u8::checked_sub(left, right), "attempt to subtract with overflow")
}
fn message(failure: Box<dyn std::any::Any + Send>) -> String {
    if let Some(value) = failure.downcast_ref::<&str>() {
        return value.to_string();
    }
    if let Some(value) = failure.downcast_ref::<String>() {
        return value.clone();
    }
    panic!("expected a source panic message");
}
#[test]
fn nested_left_to_right_and_outer_failure() {
    assert_eq!(add(multiply(3, 2), subtract(3, 2)), 7);
    assert_eq!(message(std::panic::catch_unwind(|| add(multiply(255, 2), subtract(255, 2))).unwrap_err()), "attempt to multiply with overflow");
    assert_eq!(message(std::panic::catch_unwind(|| add(multiply(0, 1), subtract(0, 1))).unwrap_err()), "attempt to subtract with overflow");
    assert_eq!(message(std::panic::catch_unwind(|| add(multiply(100, 2), subtract(100, 1))).unwrap_err()), "attempt to add with overflow");
}
#[test]
fn unused_result_and_source_helper_still_panic() {
    fn helper(left: u8, right: u8) -> u8 { add(left, right) }
    let failure = std::panic::catch_unwind(|| {
        let _unused = helper(255, 1);
        255u8
    });
    assert_eq!(message(failure.unwrap_err()), "attempt to add with overflow");
}
#[test]
fn unselected_statement_branch_is_not_evaluated() {
    fn guarded(left: u8, right: u8, flag: bool) -> u8 {
        if flag {
            let _unused = add(left, right);
            left
        } else {
            left
        }
    }
    assert_eq!(guarded(255, 1, false), 255);
    assert_eq!(message(std::panic::catch_unwind(|| guarded(255, 1, true)).unwrap_err()), "attempt to add with overflow");
}
