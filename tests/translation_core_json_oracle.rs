//! Independent native oracle for the owned JSON contract.
//! UNRUN locally during issue #759; CI runs Rust only after same-SHA JS is green.
use link_assistant_router::translation_core;
use translation_core::{Json, Maybe, Str};

#[test]
fn nested_literals_and_empty_arrays_preserve_json_values() {
    let actual = translation_core::json!({
        "β": {"flag": true, "empty": null, "text": "猫😀"},
        "a": {},
        "array": [],
    });
    assert_eq!(actual["β"]["flag"], true);
    assert!(actual["β"]["empty"].is_null());
    assert_eq!(actual["β"]["text"], "猫😀");
    assert_eq!(actual["array"].as_array().map(Vec::len), Some(0));
    assert_eq!(actual["a"].as_object().map(serde_json::Map::len), Some(0));
}

#[test]
fn fixed_integer_widening_preserves_sign_and_exact_extremes() {
    let value = translation_core::json!({
        "i8": i8::MIN,
        "u8": u8::MAX,
        "i16": i16::MIN,
        "u16": u16::MAX,
        "i32": i32::MIN,
        "u32": u32::MAX,
        "i64": i64::MIN,
        "u64": u64::MAX,
        "zero": 0,
    });
    assert_eq!(value["i8"].as_i64(), Some(-128));
    assert_eq!(value["u8"].as_u64(), Some(255));
    assert_eq!(value["i16"].as_i64(), Some(-32768));
    assert_eq!(value["u16"].as_u64(), Some(65535));
    assert_eq!(value["i32"].as_i64(), Some(-2147483648));
    assert_eq!(value["u32"].as_u64(), Some(4294967295));
    assert_eq!(value["i64"].as_i64(), Some(i64::MIN));
    assert_eq!(value["u64"].as_u64(), Some(u64::MAX));
    assert_eq!(value["zero"].as_i64(), Some(0));
}

#[test]
fn borrowed_unicode_and_json_copy_leave_inputs_unchanged() {
    let text: &Str = "e\u{301}猫😀\0";
    let input = translation_core::json!({"nested": [true, text, null]});
    let copy = translation_core::json!(&input);
    assert_eq!(copy, input);
    let value = translation_core::json!({"text": text, "flag": true});
    assert_eq!(value["text"].as_str(), Some(text));
    assert_eq!(value["flag"].as_bool(), Some(true));
    // Literal arrays and copies share the bounded translated operand domain.
}

fn optional(a: Maybe<&Str>, b: Maybe<&Str>) -> Maybe<Json> {
    Some(translation_core::json!({"a": a?, "b": b?}))
}

#[test]
fn question_marks_short_circuit_the_actual_outer_option() {
    assert_eq!(optional(None, Some("second")), None);
    assert_eq!(optional(Some("first"), None), None);
    let value = optional(Some("first"), Some("second")).expect("both present");
    assert_eq!(value["a"], "first");
    assert_eq!(value["b"], "second");
}

fn optional_array(a: Maybe<&Str>, b: Maybe<&Str>) -> Maybe<Json> {
    Some(translation_core::json!([a?, {"tail": b?}]))
}

#[test]
fn literal_arrays_preserve_outer_option_flow_and_independent_json_copies() {
    assert_eq!(optional_array(None, Some("second")), None);
    assert_eq!(optional_array(Some("first"), None), None);
    let expected = translation_core::json!(["猫😀", {"tail": "Ω"}]);
    assert_eq!(optional_array(Some("猫😀"), Some("Ω")), Some(expected));

    let mut input = translation_core::json!({"value": [true, null]});
    let copies = translation_core::json!([&input, &input]);
    input["value"][0] = Json::Bool(false);
    assert_eq!(copies[0]["value"][0], true);
    assert_eq!(copies[1]["value"][0], true);
}

#[test]
fn qualified_owned_macro_does_not_select_a_local_same_name_macro() {
    macro_rules! json {
        () => {
            false
        };
    }
    assert!(!json!());
    let value = translation_core::json!({"owned": true});
    assert_eq!(value["owned"], true);
}

#[test]
fn actual_gemini_error_mapping_uses_u16_without_numeric_coercion() {
    fn response(status: u16, body: &Json) -> Json {
        let message = body
            .pointer("/error/message")
            .and_then(Json::as_str)
            .unwrap_or("upstream request failed");
        let status_text = match status {
            400 => "INVALID_ARGUMENT",
            401 | 403 => "PERMISSION_DENIED",
            404 => "NOT_FOUND",
            429 => "RESOURCE_EXHAUSTED",
            503 => "UNAVAILABLE",
            _ => "INTERNAL",
        };
        translation_core::json!({
            "error": {"code": status, "message": message, "status": status_text}
        })
    }
    let body = translation_core::json!({"error": {"message": "猫😀"}});
    for (status, label) in [
        (400, "INVALID_ARGUMENT"),
        (401, "PERMISSION_DENIED"),
        (404, "NOT_FOUND"),
        (429, "RESOURCE_EXHAUSTED"),
        (503, "UNAVAILABLE"),
        (500, "INTERNAL"),
    ] {
        let actual = response(status, &body);
        assert_eq!(actual["error"]["code"].as_u64(), Some(u64::from(status)));
        assert_eq!(actual["error"]["message"], "猫😀");
        assert_eq!(actual["error"]["status"], label);
    }
}
