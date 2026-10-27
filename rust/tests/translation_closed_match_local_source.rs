// Independent original local-bearing match source oracle. UNRUN; gated CI only.
fn selected(value: &str, flag: bool) -> String {
    let saved = value;
    match flag { true | false => saved.into() }
}
fn numeric(value: u64, flag: bool) -> u64 {
    let saved = value;
    match flag { true | false => saved.wrapping_add(1) }
}
#[test]
fn original_nonbinding_or_patterns_keep_local_aliases_and_wrapping_edges() {
    for value in ["", "é😀", "a\0b"] {
        for flag in [false, true] { assert_eq!(selected(value, flag), value); }
    }
    for flag in [false, true] {
        assert_eq!(numeric(0, flag), 1);
        assert_eq!(numeric(u64::MAX, flag), 0);
    }
}
