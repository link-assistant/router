//! Native-only oracle for the owned aliases. UNRUN locally during issue #759.
#[path = "../src/translation_core.rs"]
mod translation_core;

use translation_core::{Json, Maybe, Outcome, Str, Text};

fn is_resolved(task: &Json) -> bool {
    task.get("isResolved")
        .and_then(Json::as_bool)
        .unwrap_or(false)
}

fn request_asks_for_a_stream(record: &Json) -> bool {
    record
        .get("body")
        .and_then(|body| body.get("json"))
        .and_then(|body| body.get("stream"))
        .and_then(Json::as_bool)
        .unwrap_or(false)
}

#[test]
fn variant_identity_and_owned_error_text() {
    let present: Maybe<bool> = Maybe::Some(true);
    let absent: Maybe<bool> = Maybe::None;
    let success: Outcome<bool, Text> = Outcome::Ok(true);
    let failure: Outcome<bool, Text> = Outcome::Err("no".to_owned());
    assert_eq!(present, Some(true));
    assert_eq!(absent, None);
    assert_eq!(success, Ok(true));
    assert_eq!(failure, Err("no".to_owned()));
}

#[test]
fn actual_nested_boolean_defaults_do_not_coerce() {
    for (text, resolved, stream) in [
        ("{}", false, false),
        (r#"{"isResolved":true}"#, true, false),
        (r#"{"isResolved":"true"}"#, false, false),
        (r#"{"body":{"json":{"stream":true}}}"#, false, true),
        (r#"{"body":{"json":{"stream":null}}}"#, false, false),
    ] {
        let value: Json = serde_json::from_str(text).unwrap();
        assert_eq!(is_resolved(&value), resolved);
        assert_eq!(request_asks_for_a_stream(&value), stream);
    }
}

#[test]
fn missing_null_and_wrong_scalar_remain_distinct() {
    let value: Json = serde_json::json!({"null": null, "flag": true, "string": "true"});
    assert_eq!(value.get("missing"), Maybe::None);
    assert_eq!(value.get("null"), Maybe::Some(&Json::Null));
    assert_eq!(value.get("flag").and_then(Json::as_bool), Maybe::Some(true));
    assert_eq!(value.get("string").and_then(Json::as_bool), Maybe::None);
}

#[test]
fn integer_values_preserve_full_i64_domain() {
    for value in [i64::MIN, -7, 0, i64::MAX] {
        let document: Json = serde_json::json!({"update_id": value});
        assert_eq!(document.get("update_id").and_then(Json::as_i64), Some(value));
    }
}

#[test]
fn borrowed_text_outlives_no_source_and_keeps_unicode() {
    let value: Json = serde_json::json!({"text":"Ω😀"});
    let text: Maybe<&Str> = value.get("text").and_then(Json::as_str);
    assert_eq!(text, Maybe::Some("Ω😀"));
}

#[test]
fn native_alias_destruction_and_lazy_defaults_are_ordinary_rust() {
    use std::cell::Cell;
    struct Dropped<'a>(&'a Cell<usize>);
    impl Drop for Dropped<'_> {
        fn drop(&mut self) {
            self.0.set(self.0.get() + 1);
        }
    }
    let drops = Cell::new(0);
    let calls = Cell::new(0);
    {
        let value: Maybe<Dropped<'_>> = Maybe::Some(Dropped(&drops));
        let _owned = value.unwrap_or_else(|| {
            calls.set(calls.get() + 1);
            Dropped(&drops)
        });
        assert_eq!(calls.get(), 0);
        assert_eq!(drops.get(), 0);
    }
    assert_eq!(drops.get(), 1);
}
