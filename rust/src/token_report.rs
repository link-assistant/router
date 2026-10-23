//! How `router tokens list` renders, for local and remote alike.
//!
//! Split out so the two paths cannot drift: an operator reading a table has no
//! way to tell which machine answered, and a column that means one thing
//! locally and another remotely would be worse than no column (issue #293).
//!
//! Driven from JSON rather than [`crate::storage::TokenRecord`] because the
//! remote path receives exactly that — the endpoint serialises the same record,
//! so parsing it back into the struct only to format it would add a failure
//! mode without adding information.

use serde_json::Value;

/// Column headers, in the order [`print_table`] writes them.
const HEADERS: [&crate::translation_core::Str; 9] = [
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

/// Print the token table, one row per record.
pub fn print_table(records: &[crate::translation_core::Json]) {
    println!(
        "{:<36}  {:<10}  {:<10}  {:<8}  {:<13}  {:<15}  {:<9}  {:<8}  {:<6}  label",
        HEADERS[0],
        HEADERS[1],
        HEADERS[2],
        HEADERS[3],
        HEADERS[4],
        HEADERS[5],
        HEADERS[6],
        HEADERS[7],
        HEADERS[8]
    );
    for record in records {
        println!("{}", row(record));
    }
}

/// One table row, as the local path formats it.
#[must_use]
pub fn row(record: &crate::translation_core::Json) -> crate::translation_core::Text {
    let text = |key: &str| {
        record
            .get(key)
            .and_then(Value::as_str)
            .unwrap_or_default()
            .to_string()
    };
    let number = |key: &str| record.get(key).and_then(Value::as_u64);
    let used_over_max = |used: &str, max: &str| {
        let used = number(used).unwrap_or(0);
        number(max).map_or_else(|| crate::translation_core::format!("{used}/-"), |max| crate::translation_core::format!("{used}/{max}"))
    };

    let scope = { let __router_json_reader_0 = record
        .get("scope")
        ; if let crate::translation_core::Maybe::Some(__router_json_reader_1) = __router_json_reader_0 { crate::translation_core::Json::as_str(__router_json_reader_1) } else { crate::translation_core::Maybe::None } }
        .filter(|scope| !scope.is_empty())
        .unwrap_or("client");
    let rpm = number("rate_limit_per_minute").map_or_else(|| crate::translation_core::format!("{}", "-"), |v| v.to_string());
    let revoked = { let __router_json_reader_2 = record
        .get("revoked")
        ; if let crate::translation_core::Maybe::Some(__router_json_reader_3) = __router_json_reader_2 { crate::translation_core::Json::as_bool(__router_json_reader_3) } else { crate::translation_core::Maybe::None } }
        .unwrap_or(false);

    crate::translation_core::format!(
        "{:<36}  {:<10}  {:<10}  {:<8}  {:<13}  {:<15}  {:<9}  {:<8}  {scope:<6}  {}",
        text("id"),
        number("issued_at").unwrap_or(0),
        number("expires_at").unwrap_or(0),
        revoked,
        used_over_max("used_requests", "max_requests"),
        used_over_max("used_tokens", "max_tokens"),
        number("reserved_tokens").unwrap_or(0),
        rpm,
        text("label"),
    )
}

#[cfg(test)]
#[path = "token_report_tests.rs"]
mod tests;
