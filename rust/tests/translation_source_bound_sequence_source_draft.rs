//! Independent standard-library behavior for source-adoption rules; CI only.
#[rustfmt::skip]
fn formatted(value: u8) -> String { format!("value={value}") }
#[rustfmt::skip]
fn accepted(value: &str) -> bool { matches!(value, "a" | "😀") }
#[rustfmt::skip]
fn values() -> Vec<u8> { vec![0_u8, 255_u8] }

#[test]
fn source_tool_attributes_preserve_format_match_and_vector_results() {
    for (value, expected) in [
        (0_u8, "value=0"),
        (1, "value=1"),
        (127, "value=127"),
        (128, "value=128"),
        (255, "value=255"),
    ] {
        assert_eq!(formatted(value), expected);
    }
    for (value, expected) in [
        ("", false),
        ("a", true),
        ("😀", true),
        ("a😀", false),
        ("\0", false),
        ("A", false),
    ] {
        assert_eq!(accepted(value), expected);
    }
    assert_eq!(values(), [0_u8, 255_u8]);
}
