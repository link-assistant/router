//! CI-only native oracle for the explicit owned ASCII predicate boundary.
use link_assistant_router::translation_core::ascii_chars_in;

#[test]
fn ascii_alphabet_and_unicode_boundaries() {
    for (value, alphabet, expected) in [
        ("", "", true), ("", "é猫😀", true), ("a", "", false),
        ("aAa0-_", "aA0-_", true), ("é", "é", false), ("猫😀", "猫😀", false),
        ("A", "aé猫😀", false), ("a", "aé猫😀", true),
        ("\0\r\n", "\0\r\n", true), ("e\u{301}", "e\u{301}", false),
        ("\u{7f}", "\u{7f}", true), ("/", ".-_", false),
    ] {
        assert_eq!(ascii_chars_in(value, alphabet), expected);
    }
    for byte in 0u8..=127 {
        assert_eq!(ascii_chars_in(&char::from(byte).to_string(), "0123456789ABCDEFabcdef"), byte.is_ascii_hexdigit());
    }
}

#[test]
fn arguments_evaluate_once_in_written_order() {
    let order = std::cell::RefCell::new(Vec::new());
    assert!(ascii_chars_in(
        { order.borrow_mut().push("value"); "abc" },
        { order.borrow_mut().push("alphabet"); "abc" },
    ));
    assert_eq!(*order.borrow(), ["value", "alphabet"]);
}
