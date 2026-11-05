// Independent lexical alias and byte-offset oracle SOURCE; gated CI only.
use link_assistant_router::translation_text_core as core;
#[test]
fn selected_results_and_borrowed_aliases_preserve_native_operations() {
    for (value, wanted) in [(" x ", true), (" é ", false), ("", false), ("😀x", true)] {
        let cleaned: &str = value.trim();
        let alias = cleaned;
        let original = alias.contains("x");
        let adopted_cleaned: &str = core::trim(value);
        let adopted_alias = adopted_cleaned;
        let adopted = core::contains(adopted_alias, "x");
        assert_eq!(original, wanted);
        assert_eq!(adopted, wanted);
    }
}
#[test]
fn optional_searches_return_utf8_byte_offsets_including_empty_patterns() {
    for (value, pattern, first, last) in [
        ("é😀x😀", "😀", Some(2_u64), Some(7_u64)),
        ("aéa", "a", Some(0), Some(3)),
        ("😀", "", Some(0), Some(4)),
        ("", "", Some(0), Some(0)),
        ("é", "x", None, None),
    ] {
        let alias = value;
        assert_eq!(alias.find(pattern).map(|index| index as u64), first);
        assert_eq!(value.rfind(pattern).map(|index| index as u64), last);
        assert_eq!(core::find(alias, pattern), first);
        assert_eq!(core::rfind(value, pattern), last);
    }
    let value = "é😀x😀";
    assert_eq!(value.rfind('😀').map(|offset| offset as u64), Some(7));
    assert_eq!(core::rfind(value, "😀"), Some(7));
}
