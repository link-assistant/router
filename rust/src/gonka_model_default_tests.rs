//! `GONKA_MODEL` default-model injection into `OpenAI` request bodies.

use super::with_default_model;
use serde_json::json;

#[test]
fn unconfigured_gonka_injects_no_default() {
    let body = with_default_model(json!({"messages": []}), "");
    assert!(body.get("model").is_none());
}

#[test]
fn a_missing_or_blank_model_is_filled_from_the_configured_default() {
    let filled = with_default_model(json!({"messages": []}), "quillon-4-vector");
    assert_eq!(filled["model"], "quillon-4-vector");

    let blank = with_default_model(json!({"model": ""}), "quillon-4-vector");
    assert_eq!(blank["model"], "quillon-4-vector");
}

#[test]
fn an_explicit_model_is_left_alone() {
    let explicit = with_default_model(json!({"model": "aurora-2-base"}), "quillon-4-vector");
    assert_eq!(explicit["model"], "aurora-2-base");
}
