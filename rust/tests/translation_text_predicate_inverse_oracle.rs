// Independent standard text oracle source. Execute only in gated CI.
#[test]
fn text_predicate_boundaries_unicode_and_empty_patterns() {
    let cases = [
        ("", "", true, true, true),
        ("abc", "a", true, false, true),
        ("abc", "c", false, true, true),
        ("abc", "b", false, false, true),
        ("abc", "missing", false, false, false),
        ("😀Ω", "😀", true, false, true),
        ("😀Ω", "Ω", false, true, true),
        ("e\u{301}", "é", false, false, false),
    ];
    for (value, pattern, prefix, suffix, contains) in cases {
        assert_eq!(value.starts_with(pattern), prefix);
        assert_eq!(value.ends_with(pattern), suffix);
        assert_eq!(value.contains(pattern), contains);
    }
}
