// Independent native oracle; local Rust execution is prohibited for issue #759.
use link_assistant_router::translation_core::{has_unicode_control, strip_unicode_whitespace};

#[test]
fn unicode_predicate_boundaries() {
    let whitespace = [9_u32,10,11,12,13,32,133,160,5760,8192,8193,8194,8195,8196,
        8197,8198,8199,8200,8201,8202,8232,8233,8239,8287,12288];
    for scalar in 0..=0x10ffff {
        let Some(ch) = char::from_u32(scalar) else { continue };
        let value = ch.to_string();
        assert_eq!(has_unicode_control(&value), ch.is_control(), "control {scalar:x}");
        assert_eq!(has_unicode_control(&value), scalar <= 31 || (127..=159).contains(&scalar));
        let expected = if whitespace.contains(&scalar) { String::new() } else { value.clone() };
        assert_eq!(strip_unicode_whitespace(&value), expected, "whitespace {scalar:x}");
    }
    assert_eq!(strip_unicode_whitespace(" \t猫😀e\u{301}\u{200d}\0\u{feff}\n"), "猫😀e\u{301}\u{200d}\0\u{feff}");
    assert!(!has_unicode_control("😀e\u{301}\u{200d}\u{feff}\u{2028}"));
    assert!(has_unicode_control("before\u{85}after"));
}
