//! Native original/adopted owned String oracle SOURCE. Gated CI only; UNRUN.
use link_assistant_router::translation_text_core as owned;

fn original(value: String, pattern: String, replacement: &str) -> String {
    value.replace(pattern.as_str(), replacement)
}

fn adopted(value: String, pattern: String, replacement: &str) -> String {
    owned::replace(&value, &pattern, replacement)
}

#[test]
fn owned_receivers_and_explicit_borrow_bridges_preserve_text_contracts() {
    for value in ["", "header", "HEADER π", "key=", "a😀b😀", " \t\n"] {
        let input = value.to_owned();
        assert_eq!(input.contains("header"), owned::contains(&input, "header"));
        assert_eq!(input.as_str().ends_with('='), owned::ends_with(&input, "="));
        assert_eq!(input.to_ascii_lowercase().starts_with("header"), owned::starts_with(&owned::to_ascii_lowercase(&input), "header"));
        let alias = input;
        assert_eq!(alias.as_str().trim().is_empty(), owned::is_empty(owned::trim(&alias)));
        for pattern in ["", "😀", "header"] {
            assert_eq!(original(value.to_owned(), pattern.to_owned(), "$&"), adopted(value.to_owned(), pattern.to_owned(), "$&"));
        }
    }
    assert_eq!(adopted("a😀b😀".to_owned(), "😀".to_owned(), "$&"), "a$&b$&");
    assert_eq!(adopted("ab".to_owned(), "".to_owned(), "!"), "!a!b!");
}
