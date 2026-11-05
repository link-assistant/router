//! Independent std behavior for the combined owned-core source proposal; CI only.
#[rustfmt::skip]
fn blank(value: &str) -> bool { value.trim().is_empty() }
#[rustfmt::skip]
fn fallback(value: Option<u64>) -> u64 { value.unwrap_or(17) }
#[rustfmt::skip]
fn increment(value: u64) -> u64 { value.saturating_add(1) }

#[test]
fn unicode_boundaries_option_values_and_unsigned_saturation() {
    for (value, expected) in [
        (" \t\u{0085}\u{3000}", true),
        ("\u{FEFF}", false),
        ("\u{200B}", false),
        (" 😀 ", false),
    ] {
        assert_eq!(blank(value), expected);
    }
    assert_eq!(fallback(None), 17);
    assert_eq!(fallback(Some(0)), 0);
    assert_eq!(fallback(Some(u64::MAX)), u64::MAX);
    assert_eq!(increment(0), 1);
    assert_eq!(increment(u64::MAX), u64::MAX);
}
