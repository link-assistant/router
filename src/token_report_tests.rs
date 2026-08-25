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
