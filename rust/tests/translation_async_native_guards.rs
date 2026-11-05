// Independent original guard/return oracle SOURCE; gated CI only.
fn guarded(first: bool, second: bool) -> bool {
    if first { return true; }
    if second { return false; }
    true
}
fn less(left: u64, right: u64) -> bool {
    if left < right { return true; }
    false
}
#[test]
fn original_native_guard_returns_cover_each_complete_continuation_path() {
    for (a, b, wanted) in [(false, false, true), (false, true, false), (true, false, true), (true, true, true)] {
        assert_eq!(guarded(a, b), wanted);
    }
    for (a, b, wanted) in [(0, 0, false), (0, 1, true), (1, 0, false), (9007199254740992, 9007199254740993, true), (u64::MAX, u64::MAX, false)] {
        assert_eq!(less(a, b), wanted);
    }
}
