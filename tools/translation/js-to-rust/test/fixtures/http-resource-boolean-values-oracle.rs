// Independent Boolean selection oracle SOURCE. Gated CI only; never run locally.
use std::cell::Cell;

fn selected_and(flag: bool, calls: &Cell<u32>) -> bool {
    flag && { calls.set(calls.get() + 1); true }
}

fn selected_or(flag: bool, calls: &Cell<u32>) -> bool {
    flag || { calls.set(calls.get() + 1); false }
}

#[test]
fn boolean_values_skip_exactly_the_unselected_operand() {
    let calls = Cell::new(0);
    assert!(!selected_and(false, &calls));
    assert_eq!(calls.get(), 0);
    assert!(selected_and(true, &calls));
    assert_eq!(calls.get(), 1);
    assert!(selected_or(true, &calls));
    assert_eq!(calls.get(), 1);
    assert!(!selected_or(false, &calls));
    assert_eq!(calls.get(), 2);
}
