//! Independent native oracles for the checked character-scalar rule.
//! CI-only after the complete JavaScript gate for the same source revision.
//! No local Rust build, test or rustfmt is part of this source draft.

fn trim_url_punctuation(url: &str) -> &str {
    url.trim_end_matches(['.', ',', ')', ']', '>', '"', '\'', ';', ':'])
}

#[test]
fn characters_include_astral_nul_and_noncharacters_without_normalization() {
    let cases = [
        'a', 'Ω', '😀', '\0', '\n', '\u{d7ff}', '\u{e000}', '\u{ffff}', '\u{10ffff}',
    ];
    assert_eq!(cases[2].len_utf16(), 2);
    assert_eq!(cases[2].len_utf8(), 4);
    assert_eq!(cases[3] as u32, 0);
    assert_ne!('é', 'e');
    for value in cases {
        let mut storage = [0; 4];
        assert_eq!(value.encode_utf8(&mut storage).chars().count(), 1);
    }
}

#[test]
fn a_character_set_is_membership_not_an_ordered_substring() {
    assert_eq!("abbaXYZabba".trim_end_matches(['a', 'b']), "abbaXYZ");
    assert_eq!("abab".trim_end_matches(['a', 'b']), "");
    assert_eq!("aba".trim_end_matches("ab"), "aba");
    assert_eq!("Ω😀middle😀Ω".trim_matches(['😀', 'Ω']), "middle");
    assert_eq!(
        "\u{10000}\u{e000}middle\u{e000}\u{10000}".trim_matches(['\u{10000}', '\u{e000}']),
        "middle"
    );
    assert_eq!("éxxe\u{301}".trim_start_matches(['é', 'x']), "e\u{301}");
}

#[test]
fn empty_and_repeated_set_members_keep_scalar_boundaries() {
    assert_eq!("😀Ω".trim_end_matches([]), "😀Ω");
    assert_eq!("".trim_matches(['😀', '😀']), "");
    assert_eq!("😀Ω😀😀".trim_end_matches(['😀', '😀']), "😀Ω");
    assert_eq!("e\u{301}ee".trim_end_matches('e'), "e\u{301}");
}

#[test]
fn actual_url_punctuation_cases_preserve_the_original_prefix() {
    for (input, expected) in [
        ("", ""),
        ("https://example.com/path),]", "https://example.com/path"),
        ("\"https://example.com\"", "\"https://example.com"),
        ("abc:;", "abc"),
        (".,)]>\"';:", ""),
        ("😀Ω.;", "😀Ω"),
        ("a\0.", "a\0"),
        ("url!?", "url!?"),
    ] {
        assert_eq!(trim_url_punctuation(input), expected);
    }
}

#[test]
fn receiver_then_each_scalar_expression_runs_once_left_to_right() {
    use std::cell::RefCell;

    let calls = RefCell::new(Vec::new());
    let receiver = || {
        calls.borrow_mut().push("receiver");
        "textabba"
    };
    let character = |label, value| {
        calls.borrow_mut().push(label);
        value
    };
    let value = receiver().trim_end_matches([
        character("first", 'a'),
        character("last", 'b'),
        character("first", 'a'),
    ]);
    assert_eq!(value, "text");
    assert_eq!(*calls.borrow(), ["receiver", "first", "last", "first"]);
}

#[test]
fn a_trimmed_slice_keeps_the_receiver_storage() {
    let original = String::from("😀body.;");
    let trimmed = trim_url_punctuation(&original);
    assert_eq!(trimmed, "😀body");
    assert_eq!(trimmed.as_ptr(), original.as_ptr());
    assert_eq!(original, "😀body.;");
}
