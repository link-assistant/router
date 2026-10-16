//! Native-only shared scalar-count oracle. UNRUN locally during issue #759.
use link_assistant_router::translation_core;
use translation_core::{Maybe, Str, unicode_scalar_count};

// The actual application module is private in lib.rs. Include that complete
// module, while its crate::translation_core route uses the published library.
#[path = "../src/safety_identifier.rs"]
mod safety_identifier;

#[test]
fn scalar_counts_are_not_bytes_utf16_units_or_graphemes() {
    for (value, expected) in [
        ("", 0),
        ("ASCII", 5),
        ("é", 1),
        ("猫😀", 2),
        ("e\u{301}", 2),
        ("👩\u{200d}💻", 3),
        ("\0\r\n", 3),
        ("\u{10ffff}", 1),
    ] {
        assert_eq!(unicode_scalar_count(value), expected);
    }
}

#[test]
fn safety_limits_count_sixty_four_astral_scalars() {
    let accepted = "😀".repeat(64);
    let refused = "😀".repeat(65);
    assert_eq!(unicode_scalar_count(&accepted), 64);
    assert_eq!(unicode_scalar_count(&refused), 65);
    assert!(safety_identifier::validate_openai(Some(&accepted)).is_ok());
    assert!(safety_identifier::validate_openai(Some(&refused)).is_err());
    assert!(safety_identifier::validate_openai_user(Some(&accepted)).is_ok());
    assert!(safety_identifier::validate_openai_user(Some(&refused)).is_err());
}

#[test]
fn borrowed_argument_evaluates_once_and_absent_option_stays_lazy() {
    let calls = std::cell::Cell::new(0);
    let argument = || {
        calls.set(calls.get() + 1);
        "Ω😀"
    };
    assert_eq!(unicode_scalar_count(argument()), 2);
    assert_eq!(calls.get(), 1);
    let absent: Maybe<&Str> = None;
    assert!(!absent.is_some_and(|value| {
        calls.set(calls.get() + 1);
        unicode_scalar_count(value) > 1
    }));
    assert_eq!(calls.get(), 1);
}

#[test]
fn existing_json_validation_keeps_wrong_types_and_missing_identifiers_distinct() {
    let missing = serde_json::json!({});
    let unicode = serde_json::json!({"metadata": {"user_id": "Ω😀"}});
    let wrong = serde_json::json!({"metadata": 7});
    assert_eq!(safety_identifier::anthropic_user_id(&missing).unwrap(), None);
    assert_eq!(safety_identifier::anthropic_user_id(&unicode).unwrap(), Some("Ω😀"));
    assert!(safety_identifier::anthropic_user_id(&wrong).is_err());
    assert!(safety_identifier::validate_openai_value(Some(&serde_json::Value::Null)).is_ok());
    assert!(safety_identifier::validate_openai_value(Some(&serde_json::json!(7))).is_err());
}
