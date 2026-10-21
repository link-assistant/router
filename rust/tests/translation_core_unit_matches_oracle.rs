//! Independent native unit-enum matches oracle. CI only after the JavaScript gate.
use link_assistant_router::translation_core;

#[derive(Clone, Copy)]
enum Mode {
    First,
    Second,
    Third,
}

const fn selected(mode: Mode) -> bool {
    translation_core::matches_unit!(mode, Mode::First | Mode::Third)
}

const FIRST: bool = selected(Mode::First);
const SECOND: bool = selected(Mode::Second);

#[test]
fn unit_variants_const_and_single_subject_evaluation() {
    assert!(FIRST);
    assert!(!SECOND);
    assert!(selected(Mode::Third));
    let mut calls = 0;
    assert!(translation_core::matches_unit!(
        {
            calls += 1;
            Mode::Third
        },
        Mode::First | Mode::Third
    ));
    assert_eq!(calls, 1);
}
