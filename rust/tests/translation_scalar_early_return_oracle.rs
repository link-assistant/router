//! Independent native early-return expectations; UNRUN, CI-only after JS gates.
use std::panic::catch_unwind;
fn selected(condition: bool, left: u8, right: u8) -> u8 {
    if condition {
        return left;
    }
    let _unused = left / right;
    7
}
fn caller(condition: bool, left: u8, right: u8) -> u8 {
    selected(condition, left, right).wrapping_add(1)
}
#[test]
fn early_return_skips_helper_tail_and_resumes_caller() {
    assert_eq!(caller(true, 5, 0), 6);
    assert!(catch_unwind(|| caller(false, 5, 0)).is_err());
    assert_eq!(caller(false, 5, 1), 8);
}
#[test]
fn branch_locals_do_not_replace_a_later_outer_binding() {
    for condition in [false, true] {
        if condition {
            let _temporary = 12_u8;
        } else {
            let _other = 3_u8;
        }
        let temporary = 12_u8 / 3;
        assert_eq!(temporary, 4);
    }
}
fn else_if(condition: bool, left: u8, right: u8) -> u8 {
    if condition {
        return left;
    } else if left < right {
        return right;
    }
    7
}
#[test]
fn nested_early_branches_keep_scalar_results() {
    for condition in [false, true] {
        for left in [0, 255] {
            for right in [0, 255] {
                let expected = if condition { left } else if left < right { right } else { 7 };
                assert_eq!(else_if(condition, left, right), expected);
            }
        }
    }
}
