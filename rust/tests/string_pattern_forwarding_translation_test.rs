//! Independent public-API oracle for the checked String Pattern forwarding rule.
//! Source only locally: CI runs Rust after the complete JavaScript gate.
use link_assistant_router::generated_js_first::policy::{
    credential_prefix_matches, is_qualified_model,
};

#[test]
fn model_qualification_observes_literal_ascii_slashes() {
    for value in ["/", "/model", "provider/model", "a//b", "Ω/😀", "\0/\0"] {
        assert!(is_qualified_model(value), "{value:?}");
    }
    for value in ["", "plain", "／", "Ω😀"] {
        assert!(!is_qualified_model(value), "{value:?}");
    }
}

#[test]
fn credential_prefix_keeps_empty_unicode_and_nul_semantics() {
    for (value, prefix) in [
        ("", ""),
        ("abc", ""),
        ("abc", "ab"),
        ("Ω😀tail", "Ω😀"),
        ("\0abc", "\0"),
    ] {
        assert!(
            credential_prefix_matches(value, prefix),
            "{value:?}/{prefix:?}"
        );
    }
    for (value, prefix) in [
        ("", "a"),
        ("abc", "bc"),
        ("e\u{301}", "é"),
        ("😀Ω", "Ω"),
    ] {
        assert!(
            !credential_prefix_matches(value, prefix),
            "{value:?}/{prefix:?}"
        );
    }
}

#[test]
fn generic_owned_string_pattern_calls_match_the_independent_contract() {
    let value = String::from("😀\0tail");
    let contained = String::from("\0");
    let prefix = String::from("😀");
    assert!(value.contains(&contained));
    assert!(value.starts_with(&prefix));
    assert!(!value.starts_with(&contained));
    assert!(value.contains(&String::new()));
    assert!(value.starts_with(&String::new()));
}
