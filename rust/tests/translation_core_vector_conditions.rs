//! Independent native branch oracle, CI only after all same-SHA JS gates.
use link_assistant_router::translation_core;
fn selected(flag: bool, seed: u8) -> Vec<u8> {
    if flag { translation_core::vec![seed; 3] } else { translation_core::vec![0u8] }
}
#[test]
fn branch_and_seed_values_remain_distinct() {
    assert_eq!(selected(true, 7), [7, 7, 7]);
    assert_eq!(selected(false, 7), [0]);
    assert_eq!(selected(true, 255), [255, 255, 255]);
}
#[test]
fn short_circuit_keeps_the_unselected_predicate_unexecuted() {
    let mut calls = 0;
    let branch = false && { calls += 1; true };
    assert!(!branch);
    assert_eq!(calls, 0);
    let branch = true || { calls += 1; false };
    assert!(branch);
    assert_eq!(calls, 0);
}
