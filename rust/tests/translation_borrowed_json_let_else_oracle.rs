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
        assert!(std::ptr::eq(
            text(&body).unwrap(),
            body["metadata"]["user_id"].as_str().unwrap()
        ));
    }
    for body in [
        serde_json::json!(null),
        serde_json::json!({"metadata": 7}),
        serde_json::json!({"metadata": {}}),
        serde_json::json!({"metadata": {"user_id": false}}),
    ] {
        assert_eq!(text(&body), None);
    }
}

#[test]
fn subject_runs_once_and_else_runs_only_on_none() {
    let reads = Cell::new(0);
    let failures = Cell::new(0);
    let choose = |body: &Json| {
        let Some(value) = ({
            reads.set(reads.get() + 1);
            body.get("x")
        }) else {
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

fn nested(body: &Json) -> Result<Maybe<&Str>, String> {
    let Some(value) = body.get("x") else {
        return Ok(None);
    };
    let Some(value) = value.as_str() else {
        return Err("not text".into());
    };
    Ok(Some(value))
}

fn carried(value: Maybe<&Str>, empty: bool) -> Result<Maybe<&Str>, String> {
    if empty {
        return Ok(None);
    }
    Ok(value)
}

fn deeper(value: Maybe<Maybe<&Str>>, empty: bool) -> Result<Maybe<Maybe<&Str>>, String> {
    if empty {
        return Ok(Some(None));
    }
    Ok(value)
}

#[test]
fn nested_empty_error_and_inhabited_constructors_keep_their_actual_values() {
    assert_eq!(nested(&serde_json::json!({})), Ok(None));
    assert_eq!(nested(&serde_json::json!({"x": 7})), Err("not text".into()));
    for value in ["", "Ω😀", "e\u{301}"] {
        let body = serde_json::json!({"x": value});
        assert_eq!(nested(&body), Ok(Some(value)));
        assert!(std::ptr::eq(
            nested(&body).unwrap().unwrap(),
            body["x"].as_str().unwrap()
        ));
    }
    for value in [None, Some("Ω😀")] {
        assert_eq!(carried(value, true), Ok(None));
        assert_eq!(carried(value, false), Ok(value));
    }
    for value in [None, Some(None), Some(Some("Ω😀"))] {
        assert_eq!(deeper(value, true), Ok(Some(None)));
        assert_eq!(deeper(value, false), Ok(value));
    }
    fn absent() -> Result<Maybe<&'static Str>, String> {
        Ok(None)
    }
    fn failed() -> Result<Maybe<&'static Str>, String> {
        Err("missing".into())
    }
    assert_eq!(absent(), Ok(None));
    assert_eq!(failed(), Err("missing".into()));
}

#[test]
fn nested_subjects_run_once_and_empty_error_branches_are_lazy() {
    fn traced<'a>(
        body: &'a Json,
        reads: &Cell<usize>,
        empty: &Cell<usize>,
        errors: &Cell<usize>,
    ) -> Result<Maybe<&'a Str>, String> {
        let Some(value) = ({
            reads.set(reads.get() + 1);
            body.get("x")
        }) else {
            empty.set(empty.get() + 1);
            return Ok(None);
        };
        let Some(value) = ({
            reads.set(reads.get() + 1);
            value.as_str()
        }) else {
            errors.set(errors.get() + 1);
            return Err("not text".into());
        };
        Ok(Some(value))
    }
    let reads = Cell::new(0);
    let empty = Cell::new(0);
    let errors = Cell::new(0);
    assert_eq!(traced(&serde_json::json!({}), &reads, &empty, &errors), Ok(None));
    assert_eq!((reads.get(), empty.get(), errors.get()), (1, 1, 0));
    assert_eq!(
        traced(&serde_json::json!({"x": false}), &reads, &empty, &errors),
        Err("not text".into())
    );
    assert_eq!((reads.get(), empty.get(), errors.get()), (3, 1, 1));
    let body = serde_json::json!({"x": "Ω😀"});
    assert_eq!(traced(&body, &reads, &empty, &errors), Ok(Some("Ω😀")));
    assert_eq!((reads.get(), empty.get(), errors.get()), (5, 1, 1));
}
