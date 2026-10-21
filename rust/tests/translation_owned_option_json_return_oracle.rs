//! Independent native oracle for existing Option filtering, allocation and
//! full-tail lexical normalization. Rust CI owns execution; local runs are UNRUN.
use link_assistant_router::translation_core::{self, Json, Maybe, Str};
use std::cell::RefCell;

fn original_json_string(body: &[u8], name: &Str) -> Maybe<String> {
    serde_json::from_slice::<serde_json::Value>(body)
        .ok()?
        .get(name)?
        .as_str()
        .filter(|value| !value.is_empty())
        .map(str::to_string)
}

fn normalized_json_string(body: &[u8], name: &Str) -> Maybe<String> {
    let json = translation_core::json_parse_bytes(body)?;
    json.get(name)?
        .as_str()
        .filter(|value| !value.is_empty())
        .map(str::to_string)
}

fn original_root_id(body: &[u8]) -> Maybe<String> {
    serde_json::from_slice::<serde_json::Value>(body)
        .ok()?
        .get("id")?
        .as_str()
        .filter(|id| !id.is_empty())
        .map(str::to_string)
}

fn normalized_root_id(body: &[u8]) -> Maybe<String> {
    let json = translation_core::json_parse_bytes(body)?;
    json.get("id")?
        .as_str()
        .filter(|id| !id.is_empty())
        .map(str::to_string)
}

#[test]
fn complete_original_and_normalized_tails_keep_independent_expected_results() {
    for (source, expected) in [
        ("bad", None),
        ("null", None),
        ("[]", None),
        ("{}", None),
        (r#"{"id":null}"#, None),
        (r#"{"id":false}"#, None),
        (r#"{"id":0}"#, None),
        (r#"{"id":""}"#, None),
        (r#"{"id":"猫😀"}"#, Some("猫😀")),
        (r#"{"id":"e\u0301"}"#, Some("e\u{301}")),
        (r#"{"id":"\u0000"}"#, Some("\0")),
    ] {
        let bytes = source.as_bytes();
        let before = bytes.to_vec();
        let expected = expected.map(str::to_string);
        assert_eq!(original_json_string(bytes, "id"), expected);
        assert_eq!(normalized_json_string(bytes, "id"), expected);
        assert_eq!(original_root_id(bytes), expected);
        assert_eq!(normalized_root_id(bytes), expected);
        assert_eq!(bytes, before);
    }
    let invalid_utf8 = [b'"', 0xff, b'"'];
    assert_eq!(original_json_string(&invalid_utf8, "id"), None);
    assert_eq!(normalized_json_string(&invalid_utf8, "id"), None);
    assert_eq!(original_root_id(&invalid_utf8), None);
    assert_eq!(normalized_root_id(&invalid_utf8), None);
}

#[test]
fn owned_results_survive_their_inputs_and_intermediate_json_roots() {
    let result = {
        let input = Vec::from(br#"{"id":"owned \u732b"}"#);
        normalized_root_id(&input)
    };
    assert_eq!(result.as_deref(), Some("owned 猫"));
    let result = translation_core::json_parse(r#"{"v":"猫😀"}"#).and_then(|json| {
        json.get("v").and_then(Json::as_str).map(str::to_string)
    });
    assert_eq!(result.as_deref(), Some("猫😀"));
}

#[test]
fn standard_filter_and_map_are_lazy_and_the_receiver_runs_once() {
    let trace = RefCell::new(Vec::new());
    for (input, expected) in [
        (None, None),
        (Some(""), None),
        (Some("猫😀"), Some("猫😀")),
    ] {
        trace.borrow_mut().clear();
        let receiver = || {
            trace.borrow_mut().push("receiver");
            input
        };
        let result = receiver()
            .filter(|value| {
                trace.borrow_mut().push("predicate");
                !value.is_empty()
            })
            .map(|value| {
                trace.borrow_mut().push("allocation");
                value.to_string()
            });
        assert_eq!(result.as_deref(), expected);
        let expected_trace: &[&str] = match input {
            None => &["receiver"],
            Some("") => &["receiver", "predicate"],
            Some(_) => &["receiver", "predicate", "allocation"],
        };
        assert_eq!(trace.borrow().as_slice(), expected_trace);
    }
}

#[test]
fn prior_owned_json_and_string_error_carriers_remain_distinct() {
    let value = translation_core::json_parse("null");
    assert_eq!(value, Some(Json::Null));
    let result: Result<Json, String> = Ok(Json::Null);
    assert_eq!(result, Ok(Json::Null));
}
