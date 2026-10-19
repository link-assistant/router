//! Original production callers stay unchanged. These independent source
//! regressions are Cargo integration tests, intended for CI execution only.

use link_assistant_router::telegram::is_private;
use serde_json::{Value, json};

#[test]
fn private_chat_requires_the_exact_original_string() {
    assert!(is_private(&json!({"chat": {"type": "private"}})));
    for kind in [
        "",
        "group",
        "supergroup",
        "Private",
        " private",
        "private ",
        "private\0",
        "prívate",
        "Ω😀",
    ] {
        assert!(!is_private(&json!({"chat": {"type": kind}})), "{kind:?}");
    }
}

#[test]
fn missing_and_non_string_chat_types_never_become_private() {
    for message in [
        Value::Null,
        json!([]),
        json!({}),
        json!({"chat": null}),
        json!({"chat": []}),
        json!({"chat": {}}),
        json!({"chat": {"type": null}}),
        json!({"chat": {"type": false}}),
        json!({"chat": {"type": 1}}),
        json!({"chat": {"type": 1.5}}),
        json!({"chat": {"type": []}}),
        json!({"chat": {"type": {}}}),
    ] {
        assert!(!is_private(&message), "{message}");
    }
    assert!(is_private(&json!({
        "chat": {"type": "private", "unrelated": "Ω😀\0"},
        "unrelated": [null, false, "private"]
    })));
}

#[test]
fn borrowed_option_equality_distinguishes_all_four_variant_pairs() {
    let values = [None, Some(""), Some("private"), Some("Ω😀"), Some("a\0b")];
    for left in values {
        for right in values {
            let expected = match (left, right) {
                (Some(a), Some(b)) => a.as_bytes() == b.as_bytes(),
                (None, None) => true,
                (Some(_), None) | (None, Some(_)) => false,
            };
            assert_eq!(left == right, expected, "{left:?} / {right:?}");
        }
    }
}
