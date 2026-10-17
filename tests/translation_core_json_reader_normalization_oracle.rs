//! Native behavior oracle for source substitutions; Rust runs in CI only.
//! These equations do not translate Option or serde_json library internals.

// Keep the explicit branch under test rather than replacing it by a combinator.
#![allow(clippy::option_if_let_else)]

use link_assistant_router::translation_core::{Json, Maybe, Outcome, Str};
use serde_json::json;
use std::cell::RefCell;

fn explicit_text(value: Maybe<&Json>) -> Maybe<&Str> {
    let subject = value;
    if let Maybe::Some(payload) = subject {
        Json::as_str(payload)
    } else {
        Maybe::None
    }
}

#[test]
fn none_some_null_and_unicode_keep_distinct_results() {
    assert_eq!(explicit_text(None), None);
    for (value, expected) in [
        (json!(null), None),
        (json!(false), None),
        (json!(""), Some("")),
        (json!("猫😀e\u{301}\0"), Some("猫😀e\u{301}\0")),
    ] {
        assert_eq!(Some(&value).and_then(Json::as_str), expected);
        assert_eq!(explicit_text(Some(&value)), expected);
    }
}

#[test]
fn boolean_and_null_scalars_preserve_payloads() {
    for value in [json!(null), json!(false), json!(true), json!(0), json!([])] {
        let subject = Some(&value);
        let explicit_bool = if let Some(payload) = subject {
            Json::as_bool(payload)
        } else {
            None
        };
        let explicit_null = if let Some(payload) = subject {
            Json::as_null(payload)
        } else {
            None
        };
        assert_eq!(explicit_bool, Some(&value).and_then(Json::as_bool));
        assert_eq!(explicit_null, Some(&value).and_then(Json::as_null));
        assert_eq!(explicit_bool, value.as_bool());
        assert_eq!(explicit_null, if value.is_null() { Some(()) } else { None });
    }
}

#[test]
fn unsigned_and_signed_scalar_domains_remain_distinct() {
    let cases = [
        (json!(0), Some(0_u64), Some(0_i64)),
        (json!(-1), None, Some(-1)),
        (json!(u64::MAX), Some(u64::MAX), None),
        (json!(i64::MIN), None, Some(i64::MIN)),
        (json!(1.5), None, None),
    ];
    for (value, unsigned, signed) in cases {
        let subject = Some(&value);
        let explicit_unsigned = if let Some(payload) = subject {
            Json::as_u64(payload)
        } else {
            None
        };
        let explicit_signed = if let Some(payload) = subject {
            Json::as_i64(payload)
        } else {
            None
        };
        assert_eq!(explicit_unsigned, unsigned);
        assert_eq!(explicit_signed, signed);
        assert_eq!(explicit_unsigned, subject.and_then(Json::as_u64));
        assert_eq!(explicit_signed, subject.and_then(Json::as_i64));
    }
}

#[test]
fn receiver_evaluates_once_and_only_inside_selected_branch() {
    let root = json!({"v": "猫😀"});
    let events = RefCell::new(Vec::new());
    for run in [false, true] {
        events.borrow_mut().clear();
        let output = if run {
            let subject = {
                events.borrow_mut().push("receiver");
                root.get("v")
            };
            if let Some(payload) = subject {
                Json::as_str(payload)
            } else {
                None
            }
        } else {
            None
        };
        assert_eq!(output, if run { Some("猫😀") } else { None });
        assert_eq!(*events.borrow(), if run { vec!["receiver"] } else { vec![] });
    }
}

#[test]
fn eager_receiver_fallback_order_is_unchanged_for_some() {
    let root = json!({"nested": {"v": "Ω"}});
    let fallback = json!({"v": "fallback"});
    let events = RefCell::new(Vec::new());
    let subject = {
        events.borrow_mut().push("receiver");
        root.get("nested")
    }
    .unwrap_or({
        events.borrow_mut().push("fallback");
        &fallback
    })
    .get("v");
    let result = if let Some(payload) = subject {
        Json::as_str(payload)
    } else {
        None
    };
    assert_eq!(result, Some("Ω"));
    assert_eq!(*events.borrow(), vec!["receiver", "fallback"]);
    assert_eq!(fallback, json!({"v": "fallback"}));
}

#[test]
fn filter_and_question_keep_the_existing_loan_root_live() {
    fn selected(value: &Json) -> Maybe<&Str> {
        let subject = value.get("v");
        let text = if let Some(payload) = subject {
            Json::as_str(payload)
        } else {
            None
        }?;
        Some(text).filter(|text| !text.is_empty())
    }
    for (value, expected) in [
        (json!({}), None),
        (json!({"v": ""}), None),
        (json!({"v": "猫😀"}), Some("猫😀")),
    ] {
        assert_eq!(selected(&value), expected);
        assert_eq!(
            selected(&value),
            value.get("v").and_then(Json::as_str).filter(|text| !text.is_empty())
        );
    }
}

#[test]
fn independent_citation_branches_preserve_borrowed_outputs() {
    fn original(value: &Json) -> Maybe<&Str> {
        match value.get("type").and_then(Json::as_str) {
            Some("web") => value.get("url").and_then(Json::as_str),
            Some("search") => value.get("source").and_then(Json::as_str).filter(|text| {
                text.starts_with("https://") || text.starts_with("http://")
            }),
            _ => None,
        }
    }
    for (value, expected) in [
        (json!({"type": "web", "url": "猫😀"}), Some("猫😀")),
        (json!({"type": "search", "source": "https://a"}), Some("https://a")),
        (json!({"type": "search", "source": "file:///a"}), None),
        (json!({}), None),
    ] {
        let kind = explicit_text(value.get("type"));
        let actual = match kind {
            Some("web") => explicit_text(value.get("url")),
            Some("search") => explicit_text(value.get("source")).filter(|text| {
                text.starts_with("https://") || text.starts_with("http://")
            }),
            _ => None,
        };
        assert_eq!(actual, expected);
        assert_eq!(actual, original(&value));
    }
}

#[test]
fn normalization_does_not_move_or_mutate_either_shared_root() {
    let root = json!({});
    let fallback = json!({"name": "猫😀"});
    let before_root = root.clone();
    let before_fallback = fallback.clone();
    let original = root.get("function").unwrap_or(&fallback).get("name").and_then(Json::as_str);
    let subject = root.get("function").unwrap_or(&fallback).get("name");
    let explicit = if let Some(payload) = subject {
        Json::as_str(payload)
    } else {
        None
    };
    assert_eq!(original, Some("猫😀"));
    assert_eq!(explicit, original);
    assert_eq!(root, before_root);
    assert_eq!(fallback, before_fallback);
}

#[test]
fn static_and_borrowed_filter_calls_keep_their_own_origins_in_both_orders() {
    fn frozen(
        value: Maybe<&'static Str>,
        events: &RefCell<Vec<&'static str>>,
    ) -> Maybe<&'static Str> {
        events.borrow_mut().push("static receiver");
        value.filter(|text| {
            events.borrow_mut().push("static predicate");
            !text.is_empty()
        })
    }

    fn borrowed<'a>(
        value: Maybe<&'a Str>,
        events: &RefCell<Vec<&'static str>>,
    ) -> Maybe<&'a Str> {
        events.borrow_mut().push("borrowed receiver");
        value.filter(|text| {
            events.borrow_mut().push("borrowed predicate");
            !text.is_empty()
        })
    }

    let root = json!({"value": "猫😀e\u{301}\0"});
    let before = root.clone();
    let text = root.get("value").and_then(Json::as_str);
    let events = RefCell::new(Vec::new());
    for static_first in [true, false] {
        events.borrow_mut().clear();
        let (static_value, borrowed_value) = if static_first {
            (frozen(Some("Ω"), &events), borrowed(text, &events))
        } else {
            let borrowed_value = borrowed(text, &events);
            (frozen(Some("Ω"), &events), borrowed_value)
        };
        let static_text: &'static Str = static_value.expect("static literal remains static");
        assert_eq!(static_text, "Ω");
        assert_eq!(borrowed_value, Some("猫😀e\u{301}\0"));
        assert_eq!(
            *events.borrow(),
            if static_first {
                vec![
                    "static receiver",
                    "static predicate",
                    "borrowed receiver",
                    "borrowed predicate",
                ]
            } else {
                vec![
                    "borrowed receiver",
                    "borrowed predicate",
                    "static receiver",
                    "static predicate",
                ]
            }
        );
    }
    events.borrow_mut().clear();
    assert_eq!(frozen(None, &events), None);
    assert_eq!(borrowed(None, &events), None);
    assert_eq!(*events.borrow(), vec!["static receiver", "borrowed receiver"]);
    events.borrow_mut().clear();
    assert_eq!(borrowed(Some(""), &events), None);
    assert_eq!(*events.borrow(), vec!["borrowed receiver", "borrowed predicate"]);
    assert_eq!(root, before);
}

#[test]
fn nested_optional_success_and_error_payloads_keep_each_written_lifetime() {
    fn borrowed(value: &Str, success: bool) -> Outcome<Maybe<&Str>, Maybe<&Str>> {
        if success {
            Ok(Some(value))
        } else {
            Err(Some(value))
        }
    }

    fn frozen(
        value: &'static Str,
        success: bool,
    ) -> Outcome<Maybe<&'static Str>, Maybe<&'static Str>> {
        if success {
            Ok(Some(value))
        } else {
            Err(Some(value))
        }
    }

    let owned = String::from("猫😀");
    for static_first in [true, false] {
        for success in [false, true] {
            let (static_result, borrowed_result) = if static_first {
                (frozen("Ω", success), borrowed(&owned, success))
            } else {
                let borrowed_result = borrowed(&owned, success);
                (frozen("Ω", success), borrowed_result)
            };
            assert_eq!(
                static_result,
                if success { Ok(Some("Ω")) } else { Err(Some("Ω")) }
            );
            assert_eq!(
                borrowed_result,
                if success { Ok(Some("猫😀")) } else { Err(Some("猫😀")) }
            );
            let static_text: &'static Str = match static_result {
                Ok(Some(text)) | Err(Some(text)) => text,
                Ok(None) | Err(None) => panic!("the present payload must remain present"),
            };
            assert_eq!(static_text, "Ω");
        }
    }
    let nested: Maybe<Maybe<&Str>> = Some(Some(&owned));
    assert_eq!(nested, Some(Some("猫😀")));
    let empty: Maybe<Maybe<&Str>> = Some(None);
    assert_eq!(empty, Some(None));
    assert_eq!(owned, "猫😀");
}

#[test]
fn nominal_static_fields_and_lazy_static_fallback_keep_their_native_contract() {
    struct StaticFields {
        text: &'static Str,
        optional: Maybe<&'static Str>,
        result: Outcome<&'static Str, u8>,
    }

    fn fields(text: &'static Str) -> StaticFields {
        StaticFields {
            text,
            optional: Some(text),
            result: Ok(text),
        }
    }

    let fields = fields("猫😀");
    let text: &'static Str = fields.text;
    let optional: Maybe<&'static Str> = fields.optional;
    let result: Outcome<&'static Str, u8> = fields.result;
    assert_eq!(text, "猫😀");
    assert_eq!(optional, Some("猫😀"));
    assert_eq!(result, Ok("猫😀"));
    let events = RefCell::new(Vec::new());
    for input in [Some("Ω"), None] {
        events.borrow_mut().clear();
        let value: &'static Str = {
            events.borrow_mut().push("receiver");
            input
        }
        .unwrap_or_else(|| {
            events.borrow_mut().push("fallback");
            "猫😀"
        });
        assert_eq!(value, if input.is_some() { "Ω" } else { "猫😀" });
        assert_eq!(
            *events.borrow(),
            if input.is_some() {
                vec!["receiver"]
            } else {
                vec!["receiver", "fallback"]
            }
        );
    }
}
