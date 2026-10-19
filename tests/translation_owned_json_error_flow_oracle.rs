//! Independent native edge oracle for linear String errors and transient borrowed Results.
//! Worker execution is prohibited; this source is intended for the Rust CI gate.
use link_assistant_router::translation_core::{self, Json};
use std::cell::RefCell;

fn project(value: &Json) -> Result<Option<Json>, String> {
    let Some(value) = value.get("outer") else {
        return Ok(None);
    };
    let object = value.as_object().ok_or_else(|| {
        translation_core::format!("{}", "object required")
    })?;
    let child = object.get("value").ok_or_else(|| {
        translation_core::format!("{}", "value required")
    })?;
    Ok(Some(translation_core::json_copy(child)))
}

#[test]
fn transient_ok_loans_and_owned_err_keep_none_null_and_unicode_distinct() {
    for (input, expected) in [
        (translation_core::json!({}), Ok(None)),
        (
            translation_core::json!({"outer": null}),
            Err(String::from("object required")),
        ),
        (
            translation_core::json!({"outer": {}}),
            Err(String::from("value required")),
        ),
        (
            translation_core::json!({"outer": {"value": null}}),
            Ok(Some(Json::Null)),
        ),
        (
            translation_core::json!({"outer": {"value": {"text": "猫😀"}}}),
            Ok(Some(translation_core::json!({"text": "猫😀"}))),
        ),
    ] {
        let before = input.clone();
        assert_eq!(project(&input), expected);
        assert_eq!(input, before);
    }
}

#[test]
fn error_callbacks_run_only_for_none_and_receivers_run_once() {
    let trace = RefCell::new(Vec::new());
    for present in [true, false] {
        trace.borrow_mut().clear();
        let receiver = || {
            trace.borrow_mut().push("receiver");
            if present { Some("猫😀") } else { None }
        };
        let result: Result<&str, String> = receiver().ok_or_else(|| {
            trace.borrow_mut().push("error");
            translation_core::format!("{}", "missing")
        });
        if present {
            assert_eq!(result, Ok("猫😀"));
            assert_eq!(*trace.borrow(), ["receiver"]);
        } else {
            assert_eq!(result, Err(String::from("missing")));
            assert_eq!(*trace.borrow(), ["receiver", "error"]);
        }
    }
}

fn inner(value: &Json) -> Result<&str, String> {
    value.get("text").and_then(Json::as_str).ok_or_else(|| {
        translation_core::format!("{}", "text required")
    })
}

fn outer(value: &Json) -> Result<Json, String> {
    let text = inner(value)?;
    Ok(translation_core::json!({"text": text}))
}

#[test]
fn readonly_helpers_forward_only_the_actual_success_borrow() {
    let value = translation_core::json!({"text": "e\u{301}猫😀"});
    assert_eq!(outer(&value), Ok(value.clone()));
    assert_eq!(outer(&Json::Null), Err(String::from("text required")));
}


#[test]
fn borrowed_text_tail_arms_return_from_the_enclosing_function() {
    fn nested(kind: &str, flag: bool) -> u8 {
        match kind {
            "猫" => {
                if flag {
                    return 7;
                }
                8
            }
            _ => 9,
        }
    }
    for (kind, flag, expected) in [
        ("猫", true, 7),
        ("猫", false, 8),
        ("Ω", true, 9),
        ("", false, 9),
    ] {
        assert_eq!(nested(kind, flag), expected);
    }
}
