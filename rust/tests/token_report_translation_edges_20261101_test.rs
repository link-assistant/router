//! Independent original-owner boundary cases for later translation comparison.
//! SOURCE ONLY / UNRUN. Run only in CI after all eight same-SHA JS stages.
use link_assistant_router::token_report::row;
use serde_json::{json, Value};

// Contract columns expressed without calling the implementation formatter or
// deriving expected values from translator operation tables. Width counts
// Unicode scalar values, preserves oversized fields, and leaves label verbatim.
fn expected_columns(fields: [&str; 10]) -> String {
    let widths = [36_usize, 10, 10, 8, 13, 15, 9, 8, 6];
    let mut output = String::new();
    for (index, width) in widths.into_iter().enumerate() {
        output.push_str(fields[index]);
        for _ in fields[index].chars().count()..width {
            output.push(' ');
        }
        output.push_str("  ");
    }
    output.push_str(fields[9]);
    output
}

#[test]
fn original_row_missing_null_wrong_kind_and_nonobject_defaults_are_exact() {
    let expected = expected_columns(["", "0", "0", "false", "0/-", "0/-", "0", "-", "client", ""]);
    for input in [Value::Null, json!(true), json!([]), json!({}), json!({
        "id": [], "issued_at": null, "expires_at": "3", "revoked": "true",
        "used_requests": -1, "max_requests": 1.5, "used_tokens": false,
        "max_tokens": null, "reserved_tokens": [], "rate_limit_per_minute": {},
        "scope": "", "label": 7,
    })] {
        assert_eq!(row(&input), expected);
    }
}

#[test]
fn original_row_distinguishes_some_zero_float_and_missing_maximum() {
    let input = json!({
        "id": "zero", "issued_at": 1.0_f64, "expires_at": 0_u64,
        "revoked": true, "used_requests": 0_u64, "max_requests": 0_u64,
        "used_tokens": -1_i64, "max_tokens": 0.0_f64,
        "reserved_tokens": 0_u64, "rate_limit_per_minute": 0_u64,
        "scope": " ", "label": "",
    });
    assert_eq!(row(&input), expected_columns([
        "zero", "0", "0", "true", "0/0", "0/-", "0", "0", " ", "",
    ]));
}

#[test]
fn original_row_preserves_exact_unsigned_values_beyond_javascript_number() {
    // Parse decimal native input independently, including u64::MAX. Translation
    // must use its lossless JSON contract rather than round these via Number.
    let input: Value = serde_json::from_str(r#"{
        "id":"large", "issued_at":9007199254740993,
        "expires_at":18446744073709551615, "revoked":false,
        "used_requests":18446744073709551615,"max_requests":9007199254740993,
        "used_tokens":9007199254740993,"max_tokens":18446744073709551615,
        "reserved_tokens":18446744073709551615,
        "rate_limit_per_minute":9007199254740993,"scope":"admin","label":"max"
    }"#).unwrap();
    assert_eq!(row(&input), expected_columns([
        "large", "9007199254740993", "18446744073709551615", "false",
        "18446744073709551615/9007199254740993",
        "9007199254740993/18446744073709551615", "18446744073709551615",
        "9007199254740993", "admin", "max",
    ]));
}

#[test]
fn original_row_unicode_width_oversized_fields_and_literal_label_are_preserved() {
    let input = json!({"id":"é😀", "scope":"🧱", "label":"λ{}\n  tail"});
    assert_eq!(row(&input), expected_columns([
        "é😀", "0", "0", "false", "0/-", "0/-", "0", "-", "🧱", "λ{}\n  tail",
    ]));
    let long_id = "x".repeat(72);
    let input = json!({"id":long_id, "scope":"unbounded", "label":"  "});
    assert_eq!(row(&input), expected_columns([
        &"x".repeat(72), "0", "0", "false", "0/-", "0/-", "0", "-", "unbounded", "  ",
    ]));
}
