//! Independent native literal concat oracle SOURCE; gated CI only, UNRUN.
#![doc = concat!("Inner ", "literal documentation.")]

#[doc = concat!("A ", "doc.")]
fn documented(value: bool) -> bool {
    value
}

#[doc = concat!()]
fn empty_documentation(value: bool) -> bool {
    value
}

#[test]
fn literal_success_empty_and_trailing_comma_keep_exact_native_values() {
    assert_eq!(concat!("A ", "doc."), "A doc.");
    assert_eq!(concat!(), "");
    assert_eq!(concat!("trailing",), "trailing");
    assert_eq!(concat!("punctuation: ", "'[]!~"), "punctuation: '[]!~");
    for value in [false, true] {
        assert_eq!(documented(value), value);
        assert_eq!(empty_documentation(value), value);
    }
}
