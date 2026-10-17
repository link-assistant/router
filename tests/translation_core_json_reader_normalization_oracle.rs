//! Native behavior oracle for source substitutions; Rust runs in CI only.
//! These equations do not translate Option or serde_json library internals.

// Keep the explicit branch under test rather than replacing it by a combinator.
#![allow(clippy::option_if_let_else)]

use link_assistant_router::translation_core::{Json, Maybe, Str};
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
