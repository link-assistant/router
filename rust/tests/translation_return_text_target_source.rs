// Independent original return context oracle. UNRUN; gated Rust CI only.
fn selected(value: &str, first: bool, second: bool) -> String {
    if first { return if second { value.into() } else { "second".into() }; }
    return match second { true => "matched".into(), false => "last".into() };
}
#[test]
fn explicit_return_branches_keep_original_target_and_order() {
    for value in ["", "é😀", "a\0b"] {
        assert_eq!(selected(value, true, true), value);
        assert_eq!(selected(value, true, false), "second");
        assert_eq!(selected(value, false, true), "matched");
        assert_eq!(selected(value, false, false), "last");
    }
}
