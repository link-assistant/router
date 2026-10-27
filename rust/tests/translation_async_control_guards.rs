// Independent terminal guard/conditional oracle SOURCE; gated CI only.
fn guards(first: bool, second: bool) -> bool {
    if first { return true; }
    if second { return false; }
    true
}
fn chained(first: bool, second: bool) -> bool {
    if first { true } else if second { false } else { true }
}
#[test]
fn all_terminal_guard_and_else_if_paths_keep_the_same_explicit_returns() {
    for (first, second, expected) in [(false, false, true), (false, true, false), (true, false, true), (true, true, true)] {
        assert_eq!(guards(first, second), expected);
        assert_eq!(chained(first, second), expected);
    }
}
#[test]
fn guarded_unsigned_branch_boundaries_keep_exact_u64_order() {
    fn choose(amount: u64) -> u8 {
        if amount == 0 { return 0; }
        if amount > 86_400_000 { return 2; }
        1
    }
    assert_eq!(choose(0), 0);
    assert_eq!(choose(1), 1);
    assert_eq!(choose(86_400_000), 1);
    assert_eq!(choose(86_400_001), 2);
    assert_eq!(choose(u64::MAX), 2);
}
