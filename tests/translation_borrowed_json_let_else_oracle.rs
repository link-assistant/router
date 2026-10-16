//! Shared JSON let-else behavior oracle. CI only; unrun locally for issue #759.
use link_assistant_router::translation_core::{Json, Maybe, Str};
use std::cell::Cell;

fn selected(body: &Json) -> Maybe<&Json> {
    let Some(value) = body.get("x") else {
        return None;
    };
    Some(value)
}

fn text(body: &Json) -> Maybe<&Str> {
    let Some(metadata) = body.get("metadata") else {
        return None;
    };
    let Some(metadata) = metadata.as_object() else {
        return None;
    };
    let Some(identifier) = metadata.get("user_id") else {
        return None;
    };
    let Some(identifier) = identifier.as_str() else {
        return None;
    };
    Some(identifier)
}

#[test]
fn projections_borrow_the_original_value_and_preserve_text() {
    let body = serde_json::json!({"x": {"nested": "Ω😀"}});
    assert!(std::ptr::eq(selected(&body).unwrap(), &body["x"]));
    assert!(selected(&serde_json::json!({})).is_none());
    for value in ["", "Ω😀", "e\u{301}"] {
        let body = serde_json::json!({"metadata": {"user_id": value}});
        assert_eq!(text(&body), Some(value));
        assert!(std::ptr::eq(text(&body).unwrap(), body["metadata"]["user_id"].as_str().unwrap()));
    }
    for body in [serde_json::json!(null), serde_json::json!({"metadata": 7}),
        serde_json::json!({"metadata": {}}), serde_json::json!({"metadata": {"user_id": false}})] {
        assert_eq!(text(&body), None);
    }
}

#[test]
fn subject_runs_once_and_else_runs_only_on_none() {
    let reads = Cell::new(0);
    let failures = Cell::new(0);
    let choose = |body: &Json| {
        let Some(value) = ({ reads.set(reads.get() + 1); body.get("x") }) else {
            failures.set(failures.get() + 1);
            return false;
        };
        value.is_null()
    };
    assert!(choose(&serde_json::json!({"x": null})));
    assert!(!choose(&serde_json::json!({})));
    assert!(!choose(&serde_json::json!({"x": true})));
    assert_eq!(reads.get(), 3);
    assert_eq!(failures.get(), 1);
}
