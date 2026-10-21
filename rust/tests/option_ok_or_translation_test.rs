//! Independent source oracles for the eager standard-body substitution.
//! Not executed locally during issue #759; CI runs Rust after the JS gate.

use std::cell::RefCell;

use link_assistant_router::activitypub::validate_activity;
use serde_json::json;

#[test]
fn activity_validation_preserves_exact_required_field_errors() {
    for (activity, expected) in [
        (json!({}), Err("activity id is required")),
        (json!({"id": ""}), Err("activity id is required")),
        (json!({"id": "1"}), Err("activity type is required")),
        (
            json!({"id": "1", "type": false}),
            Err("activity type is required"),
        ),
        (
            json!({"id": "1", "type": "Create"}),
            Err("activity must include actor or attributedTo"),
        ),
        (
            json!({"id": "1", "type": "Create", "actor": false}),
            Err("activity must include actor or attributedTo"),
        ),
        (json!({"id": "1", "type": "Create", "actor": ""}), Ok(())),
        (
            json!({"id": "Ω😀\u{0}", "type": "Create", "attributedTo": "actor"}),
            Ok(()),
        ),
    ] {
        assert_eq!(validate_activity(&activity), expected);
    }
}

#[test]
fn ok_or_evaluates_receiver_then_error_once_even_for_some() {
    for value in [Some(0_u64), Some(u64::MAX), None] {
        let calls = RefCell::new(Vec::new());
        let receive = || {
            calls.borrow_mut().push("receiver");
            value
        };
        let failure = || {
            calls.borrow_mut().push("error");
            "missing Ω😀"
        };
        let actual = receive().ok_or(failure());
        #[allow(
            clippy::manual_ok_or,
            reason = "independent match oracle for the eager method"
        )]
        let expected = match value {
            Some(number) => Ok(number),
            None => Err("missing Ω😀"),
        };
        assert_eq!(actual, expected);
        assert_eq!(*calls.borrow(), ["receiver", "error"]);
    }
}

#[test]
fn ok_or_does_not_defer_or_replace_the_eager_panic_payload() {
    fn failure() -> bool {
        std::panic::panic_any(205_usize)
    }
    for value in [Some(1_u8), None] {
        let caught = std::panic::catch_unwind(|| value.ok_or(failure()));
        assert_eq!(caught.unwrap_err().downcast_ref::<usize>(), Some(&205));
    }
}
