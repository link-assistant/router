//! Independent original-body edge cases paired with contextual-integer-parse.test.mjs.
//! Source only for this repair: Rust execution belongs to CI after the JS gate.
use link_assistant_router::thinking::parse_numeric_suffix;

#[test]
fn numeric_suffix_preserves_u32_boundaries_and_signed_zero() {
    for (input, expected) in [
        ("", None),
        ("-", None),
        ("+", None),
        ("--", None),
        ("0", Some(0)),
        ("000", Some(0)),
        ("+0", Some(0)),
        ("+00042", Some(42)),
        ("42", Some(42)),
        ("4294967295", Some(u32::MAX)),
        ("4294967296", None),
        ("+4294967295", Some(u32::MAX)),
        ("+4294967296", None),
        ("999999999999999999999999", None),
        ("-0", Some(0)),
        ("-000000", Some(0)),
        ("-0001", None),
        ("-1", None),
        ("-+0", None),
        ("--0", None),
    ] {
        assert_eq!(parse_numeric_suffix(input), expected, "{input:?}");
    }
}

#[test]
fn numeric_suffix_does_not_trim_normalize_or_accept_nondecimal_syntax() {
    for input in [
        " 1", "1 ", "1\n", "1_000", "0xff", "1.0", "١", "１２", "😀", "\0", "−0", "-０",
        "-0.0", "-١", "- 0", "-0 ", "-\t0",
    ] {
        assert_eq!(parse_numeric_suffix(input), None, "{input:?}");
    }
}
