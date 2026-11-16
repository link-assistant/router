//! Independent owned scalar/field-reader oracle SOURCE, entirely UNRUN.
//! Requires the json-scalar-readers-20261101 virtual native leaf overlay.
//! The old dynamic/native binary does NOT establish these new exports.
//! Coordinator schedules only after all eight same-SHA JavaScript gates.
use link_assistant_router::translation_core::Json;
use link_assistant_router::translation_json_fields_core::{
    json_field, json_str_field, json_text_field_or_empty,
    json_bool_field, json_u64_field, json_value_as_str,
    json_value_as_u64, json_value_as_bool, json_value_is_null,
};

fn borrowed_text<'a>(value: &'a Json) -> Option<&'a str> {
    json_value_as_str(value)
}

#[test]
fn explicit_owned_value_readers_match_independent_scalar_expectations() {
    let text = serde_json::json!("東京é😀{}\n");
    assert_eq!(borrowed_text(&text), Some("東京é😀{}\n"));
    assert_eq!(json_value_as_bool(&serde_json::json!(true)), Some(true));
    assert_eq!(json_value_as_bool(&serde_json::json!(false)), Some(false));
    assert_eq!(json_value_as_u64(&serde_json::json!(9007199254740993_u64)),
        Some(9007199254740993_u64));
    assert_eq!(json_value_as_u64(&serde_json::json!(u64::MAX)), Some(u64::MAX));
    assert_eq!(json_value_as_u64(&serde_json::json!(0_u64)), Some(0));
    assert!(json_value_is_null(&Json::Null));
    assert!(!json_value_is_null(&serde_json::json!({})));
    assert!(!json_value_is_null(&serde_json::json!([])));
    // No native pointer/reference identity is promised by the target ABI.
}

#[test]
fn missing_null_wrong_kind_negative_and_floating_numbers_remain_distinct() {
    for value in [Json::Null, serde_json::json!({}), serde_json::json!([]),
        serde_json::json!(true), serde_json::json!(7_u64)] {
        assert_eq!(json_value_as_str(&value), None);
    }
    for value in [Json::Null, serde_json::json!({}), serde_json::json!([]),
        serde_json::json!("true"), serde_json::json!(0_u64)] {
        assert_eq!(json_value_as_bool(&value), None);
    }
    for value in [Json::Null, serde_json::json!(-1_i64),
        serde_json::json!(1.0_f64), serde_json::json!(1.5_f64),
        serde_json::json!("18446744073709551615"), serde_json::json!(false)] {
        assert_eq!(json_value_as_u64(&value), None);
    }
    let value = serde_json::json!({"present":null});
    assert_eq!(json_field(&value, "absent"), None);
    assert_eq!(json_field(&value, "present"), Some(&Json::Null));
}

#[test]
fn actual_existing_field_library_retains_borrowed_and_real_owning_string_contracts() {
    let value = serde_json::json!({
        "text":"λ{}", "empty":"", "flag":true,
        "large":9007199254740993_u64, "wrong":[], "null":null,
    });
    assert_eq!(json_str_field(&value, "text"), Some("λ{}"));
    assert_eq!(json_str_field(&value, "empty"), Some(""));
    assert_eq!(json_str_field(&value, "wrong"), None);
    assert_eq!(json_bool_field(&value, "flag"), Some(true));
    assert_eq!(json_u64_field(&value, "large"), Some(9007199254740993_u64));
    assert_eq!(json_u64_field(&value, "null"), None);
    assert_eq!(json_u64_field(&value, "absent"), None);
    let detached = json_text_field_or_empty(&value, "text");
    assert!(std::mem::needs_drop::<String>());
    drop(value);
    assert_eq!(detached, "λ{}");
    drop(detached);
}

#[test]
fn existing_option_map_callback_is_lazy_and_returns_real_owned_text() {
    use link_assistant_router::translation_primitive_option_callbacks_core::u64_to_text_owned_map;
    use link_assistant_router::translation_primitive_option_core::text_owned_unwrap_or_default;
    let calls = std::cell::Cell::new(0_u32);
    let missing = u64_to_text_owned_map(None, |value| {
        calls.set(calls.get() + 1);
        link_assistant_router::translation_core::format!("N={value};")
    });
    assert_eq!(calls.get(), 0);
    assert_eq!(text_owned_unwrap_or_default(missing), "");
    let present = u64_to_text_owned_map(Some(9007199254740993_u64), |value| {
        calls.set(calls.get() + 1);
        link_assistant_router::translation_core::format!("N={value};")
    });
    assert_eq!(calls.get(), 1);
    assert_eq!(text_owned_unwrap_or_default(present), "N=9007199254740993;");
    // Cell is a native oracle witness; this does not admit Cell/FnOnce effects
    // in translated application callbacks or arbitrary captured target state.
}

#[test]
fn scalar_boundary_does_not_imply_general_original_row_translation() {
    // Actual owner retained. Its local closures and two-arm lazy formatting
    // are still distinct source prerequisites in this scalar receipt batch.
    let record = serde_json::json!({
        "id":"x", "issued_at":1_u64, "expires_at":2_u64,
        "revoked":false, "used_requests":3_u64,"max_requests":4_u64,
        "used_tokens":5_u64,"max_tokens":6_u64,
        "reserved_tokens":7_u64,"rate_limit_per_minute":8_u64,
        "scope":"client","label":"λ{}",
    });
    let actual = link_assistant_router::token_report::row(&record);
    // Independent literal fields plus exact column-count/order; no target
    // success claim is inferred from this native library baseline.
    assert_eq!(actual.split_whitespace().collect::<Vec<_>>(),
        ["x","1","2","false","3/4","5/6","7","8","client","λ{}"]);
    assert!(serde_json::from_str::<Json>("\"\\ud800\"").is_err());
}
