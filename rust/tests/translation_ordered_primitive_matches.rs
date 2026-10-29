// Independent match-arm and guard order oracles. Gated CI only; ALL UNRUN.
fn add(left: u8, right: u8) -> u8 {
    ::core::option::Option::expect(left.checked_add(right), "attempt to add with overflow")
}
fn multiply(left: u8, right: u8) -> u8 {
    ::core::option::Option::expect(left.checked_mul(right), "attempt to multiply with overflow")
}
fn selected(left: u8, right: u8, text: &str) -> u8 {
    let value = match text {
        "add" => add(left, right),
        "mul" => multiply(left, right),
        _ => left,
    };
    add(value, right)
}
#[test]
fn selected_arm_and_later_continuation() {
    assert_eq!(selected(3, 2, "add"), 7);
    assert_eq!(selected(3, 2, "mul"), 8);
    assert_eq!(selected(200, 2, "other"), 202);
    assert!(std::panic::catch_unwind(|| selected(255, 2, "mul")).is_err());
}
#[test]
fn guard_evaluates_only_after_its_pattern_and_false_retries() {
    fn guarded(left: u8, right: u8, text: &str) -> u8 {
        let selected = match text {
            "add" if add(left, right) > 0 => multiply(left, right),
            _ => left,
        };
        add(selected, right)
    }
    assert_eq!(guarded(3, 2, "add"), 8);
    assert_eq!(guarded(0, 0, "add"), 0);
    assert_eq!(guarded(200, 2, "other"), 202);
    assert!(std::panic::catch_unwind(|| guarded(255, 1, "add")).is_err());
}
#[test]
fn ordered_overlapping_guarded_alternatives_retry_the_guard() {
    let count = std::cell::Cell::new(0u8);
    let result = match 2u8 {
        1..=3 | 2..=4 if { count.set(count.get() + 1); false } => 1u8,
        _ => 7u8,
    };
    assert_eq!(result, 7);
    assert_eq!(count.get(), 2);
}
