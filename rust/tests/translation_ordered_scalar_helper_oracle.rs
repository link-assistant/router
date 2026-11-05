//! Independent native evaluation-order expectations for ordered helper drafts.
//! UNRUN; Rust execution is CI-only after all same-SHA JavaScript gates pass.
use std::cell::{Cell, RefCell};
use std::panic::{catch_unwind, AssertUnwindSafe};
fn ignore_with_division(left: u8, right: u8) -> u8 {
    let _unused = left / right;
    7
}
fn ignore_arguments(_left: u8, _right: u8) -> u8 {
    7
}
fn use_twice(value: u8) -> u8 {
    value.wrapping_add(value)
}
#[test]
fn unused_initializer_keeps_native_failure() {
    assert!(catch_unwind(|| ignore_with_division(1, 0)).is_err());
    assert_eq!(ignore_with_division(1, 1), 7);
}
#[test]
fn unused_arguments_still_evaluate_left_to_right() {
    let events = RefCell::new(Vec::new());
    let outcome = catch_unwind(AssertUnwindSafe(|| {
        ignore_arguments(
            {
                events.borrow_mut().push("first");
                ignore_with_division(1, 0)
            },
            {
                events.borrow_mut().push("second");
                255_u8.checked_add(1).expect("native checked overflow")
            },
        )
    }));
    assert!(outcome.is_err());
    assert_eq!(&*events.borrow(), &["first"]);
}
#[test]
fn parameter_reuse_does_not_repeat_argument() {
    let evaluations = Cell::new(0);
    let result = use_twice({
        evaluations.set(evaluations.get() + 1);
        12_u8 / 3
    });
    assert_eq!(result, 8);
    assert_eq!(evaluations.get(), 1);
}
#[test]
fn short_circuit_and_choices_keep_failures_lazy() {
    let condition = std::hint::black_box(false);
    assert!(!(condition && ignore_with_division(1, 0) == 7));
    assert!(!condition || ignore_with_division(1, 0) == 7);
    let chosen = if condition {
        ignore_with_division(1, 0)
    } else {
        2
    };
    assert_eq!(chosen, 2);
}
