// Independent original owning match source oracle. UNRUN; gated CI only.
fn selected(value: &str, first: bool, second: bool) -> String {
    match first {
        true => if second { value.into() } else { "second".into() },
        false => { "last".into() }
    }
}
#[test]
fn original_match_context_and_branch_order() {
    for value in ["", "é😀", "a\0b"] {
        assert_eq!(selected(value, true, true), value);
        assert_eq!(selected(value, true, false), "second");
        assert_eq!(selected(value, false, true), "last");
        assert_eq!(selected(value, false, false), "last");
        let owned: String = match true { true | false => value.into() };
        assert_eq!(owned, value);
    }
}
