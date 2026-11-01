//! Unit tests for the shared token table ([`crate::token_report`]).

use super::*;

fn record() -> Value {
    serde_json::json!({
        "id": "tok-1",
        "label": "ci",
        "issued_at": 1_700_000_000_i64,
        "expires_at": 1_700_086_400_i64,
        "revoked": false,
        "used_requests": 7,
        "max_requests": 100,
        "used_tokens": 1_234,
        "max_tokens": 50_000,
        "reserved_tokens": 12,
        "rate_limit_per_minute": 60,
        "scope": "",
    })
}

/// The row carries every column an operator reads, in the local format.
#[test]
fn a_row_reports_usage_against_its_caps() {
    let line = row(&record());

    assert!(line.contains("tok-1"), "{line}");
    assert!(line.contains("7/100"), "requests used over cap: {line}");
    assert!(line.contains("1234/50000"), "tokens used over cap: {line}");
    assert!(line.contains("60"), "the per-minute rate: {line}");
    assert!(
        line.trim_end().ends_with("ci"),
        "the label ends the row: {line}"
    );
}

/// An absent cap prints as unlimited rather than as zero.
///
/// `0/0` would read as a token that can make no requests at all — the opposite
/// of what an omitted cap means.
#[test]
fn an_absent_cap_reads_as_unlimited() {
    let mut value = record();
    value["max_requests"] = Value::Null;
    value["max_tokens"] = Value::Null;
    value["rate_limit_per_minute"] = Value::Null;

    let line = row(&value);

    assert!(line.contains("7/-"), "an unlimited request cap: {line}");
    assert!(line.contains("1234/-"), "an unlimited token cap: {line}");
    assert!(
        line.contains(" - "),
        "an unlimited rate prints as a dash: {line}"
    );
}

/// An empty scope is the ordinary client token, and says so.
#[test]
fn an_empty_scope_reads_as_client() {
    assert!(row(&record()).contains("client"));

    let mut admin = record();
    admin["scope"] = Value::String("admin".into());
    let line = row(&admin);
    assert!(line.contains("admin"), "{line}");
    assert!(!line.contains("client"), "{line}");
}

/// A record missing fields still renders a row rather than panicking.
///
/// The remote path receives whatever the deployment sends, which may be an
/// older or newer shape than this build knows.
#[test]
fn an_unfamiliar_record_still_renders() {
    let line = row(&serde_json::json!({"id": "tok-2"}));

    assert!(line.contains("tok-2"), "{line}");
    assert!(
        line.contains("0/-"),
        "unknown usage is zero of unlimited: {line}"
    );
}

/// Only nonempty JSON strings supply the scope, including Unicode text.
#[test]
fn scope_reader_preserves_kind_and_empty_string_behavior() {
    let cases = [
        (Value::Null, "client"),
        (Value::Bool(true), "client"),
        (Value::from(7), "client"),
        (serde_json::json!([]), "client"),
        (serde_json::json!({}), "client"),
        (Value::String(String::new()), "client"),
        (Value::String("管理员😀".into()), "管理员😀"),
    ];

    for (scope, expected) in cases {
        let mut value = record();
        value["scope"] = scope;
        let line = row(&value);
        assert_eq!(line.split_whitespace().nth(8), Some(expected), "{line}");
    }
}

/// JSON truthiness must never replace the native boolean reader.
#[test]
fn revoked_reader_accepts_only_actual_json_booleans() {
    let cases = [
        (Value::Bool(true), "true"),
        (Value::Bool(false), "false"),
        (Value::Null, "false"),
        (Value::String("true".into()), "false"),
        (Value::from(1), "false"),
        (serde_json::json!([true]), "false"),
        (serde_json::json!({"revoked": true}), "false"),
    ];

    for (revoked, expected) in cases {
        let mut value = record();
        value["revoked"] = revoked;
        let line = row(&value);
        assert_eq!(line.split_whitespace().nth(3), Some(expected), "{line}");
    }
}

/// Independent full-row oracle: explicit semantic column values, with Unicode
/// scalar padding instead of invoking the application's formatting macro.
fn independently_padded_row(fields: [&str; 10]) -> String {
    let widths = [36, 10, 10, 8, 13, 15, 9, 8, 6];
    let mut expected = String::new();
    for (index, width) in widths.into_iter().enumerate() {
        expected.push_str(fields[index]);
        for _ in fields[index].chars().count()..width {
            expected.push(' ');
        }
        expected.push_str("  ");
    }
    expected.push_str(fields[9]);
    expected
}

/// These exact fields are also independently specified in the JS receiving
/// vectors. Parsing raw JSON preserves integer versus floating-number kinds.
#[test]
fn complete_translation_edge_rows_match_independent_native_expectations() {
    let defaults = ["", "0", "0", "false", "0/-", "0/-", "0", "-", "client", ""];
    for input in ["null", "true", "[]", "{}"] {
        let value: Value = serde_json::from_str(input).expect("independent JSON input");
        assert_eq!(row(&value), independently_padded_row(defaults), "{input}");
    }

    let cases = [
        (
            r#"{"id":[],"issued_at":null,"expires_at":"3","revoked":"true","used_requests":-1,"max_requests":1.5,"used_tokens":false,"max_tokens":null,"reserved_tokens":[],"rate_limit_per_minute":{},"scope":"","label":7}"#,
            defaults,
        ),
        (
            r#"{"id":"zero","issued_at":1.0,"expires_at":0,"revoked":true,"used_requests":0,"max_requests":0,"used_tokens":-1,"max_tokens":0.0,"reserved_tokens":0,"rate_limit_per_minute":0,"scope":" ","label":""}"#,
            ["zero", "0", "0", "true", "0/0", "0/-", "0", "0", " ", ""],
        ),
        (
            r#"{"id":"large","issued_at":9007199254740993,"expires_at":18446744073709551615,"revoked":false,"used_requests":18446744073709551615,"max_requests":9007199254740993,"used_tokens":9007199254740993,"max_tokens":18446744073709551615,"reserved_tokens":18446744073709551615,"rate_limit_per_minute":9007199254740993,"scope":"admin","label":"max"}"#,
            [
                "large",
                "9007199254740993",
                "18446744073709551615",
                "false",
                "18446744073709551615/9007199254740993",
                "9007199254740993/18446744073709551615",
                "18446744073709551615",
                "9007199254740993",
                "admin",
                "max",
            ],
        ),
        (
            r#"{"id":"é😀","scope":"🧱","label":"λ{}\n  tail"}"#,
            ["é😀", "0", "0", "false", "0/-", "0/-", "0", "-", "🧱", "λ{}\n  tail"],
        ),
        (
            r#"{"id":"xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx","scope":"unbounded","label":"  "}"#,
            [
                "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                "0",
                "0",
                "false",
                "0/-",
                "0/-",
                "0",
                "-",
                "unbounded",
                "  ",
            ],
        ),
    ];
    for (input, fields) in cases {
        let value: Value = serde_json::from_str(input).expect("independent JSON input");
        assert_eq!(row(&value), independently_padded_row(fields), "{input}");
    }
}

/// The real private constant and every actual source index stay in one order.
#[test]
fn original_header_cells_and_literal_indices_keep_the_table_contract() {
    let expected = [
        "id",
        "issued_at",
        "expires_at",
        "revoked",
        "requests",
        "tokens",
        "reserved",
        "rpm",
        "scope",
    ];
    assert_eq!(HEADERS, expected);
    assert_eq!(
        [
            HEADERS[0], HEADERS[1], HEADERS[2], HEADERS[3], HEADERS[4], HEADERS[5], HEADERS[6],
            HEADERS[7], HEADERS[8]
        ],
        expected
    );
}
