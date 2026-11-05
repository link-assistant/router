//! Independent native control flow expectations, gated CI only.
fn early(flag: bool) -> bool { if flag { return false; } true }
fn choices(first: bool, second: bool) -> bool {
    if first { true } else if second { false } else { true }
}
fn neither(first: bool, second: bool) -> bool {
    if first { return false; } else if second { return false; }
    true
}
fn repeated(flag: bool) -> bool { while flag { return false; } true }
#[test]
fn every_condition_exit_and_iteration_count_keeps_its_original_target() {
    for flag in [false, true] { assert_eq!(early(flag), !flag); assert_eq!(repeated(flag), !flag); }
    for first in [false, true] { for second in [false, true] {
        assert_eq!(choices(first, second), first || !second);
        assert_eq!(neither(first, second), !first && !second);
    } }
}
