//! Finite primitive Option interfaces. Standard Option internals stay native.
const TEXT_LIMIT: usize = 1_048_576;

fn checked_text(value: &str) {
    assert!(value.len() <= TEXT_LIMIT, "primitive Option text input bound");
}

fn checked_str_option(value: Option<&str>) {
    if let Some(value) = value { checked_text(value); }
}

#[must_use]
pub fn bool_some(value: bool) -> Option<bool> {
    Some(value)
}

#[must_use]
pub fn bool_none() -> Option<bool> {
    None
}

#[must_use]
pub fn bool_is_some(value: Option<bool>) -> bool {
    value.is_some()
}

#[must_use]
pub fn bool_is_none(value: Option<bool>) -> bool {
    value.is_none()
}

#[must_use]
pub fn bool_unwrap_or(value: Option<bool>, other: bool) -> bool {
    value.unwrap_or(other)
}

#[must_use]
pub fn bool_unwrap(value: Option<bool>) -> bool {
    value.unwrap()
}

#[must_use]
pub fn bool_expect(value: Option<bool>, other: &str) -> bool {
    checked_text(other);
    value.expect(other)
}

#[must_use]
pub fn bool_and(value: Option<bool>, other: Option<bool>) -> Option<bool> {
    value.and(other)
}

#[must_use]
pub fn bool_or(value: Option<bool>, other: Option<bool>) -> Option<bool> {
    value.or(other)
}

#[must_use]
pub fn u64_some(value: u64) -> Option<u64> {
    Some(value)
}

#[must_use]
pub fn u64_none() -> Option<u64> {
    None
}

#[must_use]
pub fn u64_is_some(value: Option<u64>) -> bool {
    value.is_some()
}

#[must_use]
pub fn u64_is_none(value: Option<u64>) -> bool {
    value.is_none()
}

#[must_use]
pub fn u64_unwrap_or(value: Option<u64>, other: u64) -> u64 {
    value.unwrap_or(other)
}

#[must_use]
pub fn u64_unwrap(value: Option<u64>) -> u64 {
    value.unwrap()
}

#[must_use]
pub fn u64_expect(value: Option<u64>, other: &str) -> u64 {
    checked_text(other);
    value.expect(other)
}

#[must_use]
pub fn u64_and(value: Option<u64>, other: Option<u64>) -> Option<u64> {
    value.and(other)
}

#[must_use]
pub fn u64_or(value: Option<u64>, other: Option<u64>) -> Option<u64> {
    value.or(other)
}

#[must_use]
pub fn i64_some(value: i64) -> Option<i64> {
    Some(value)
}

#[must_use]
pub fn i64_none() -> Option<i64> {
    None
}

#[must_use]
pub fn i64_is_some(value: Option<i64>) -> bool {
    value.is_some()
}

#[must_use]
pub fn i64_is_none(value: Option<i64>) -> bool {
    value.is_none()
}

#[must_use]
pub fn i64_unwrap_or(value: Option<i64>, other: i64) -> i64 {
    value.unwrap_or(other)
}

#[must_use]
pub fn i64_unwrap(value: Option<i64>) -> i64 {
    value.unwrap()
}

#[must_use]
pub fn i64_expect(value: Option<i64>, other: &str) -> i64 {
    checked_text(other);
    value.expect(other)
}

#[must_use]
pub fn i64_and(value: Option<i64>, other: Option<i64>) -> Option<i64> {
    value.and(other)
}

#[must_use]
pub fn i64_or(value: Option<i64>, other: Option<i64>) -> Option<i64> {
    value.or(other)
}

#[must_use]
pub fn str_some(value: &str) -> Option<&str> {
    checked_text(value);
    Some(value)
}

#[must_use]
pub fn str_none() -> Option<&'static str> {
    None
}

#[must_use]
pub fn str_is_some(value: Option<&str>) -> bool {
    checked_str_option(value);
    value.is_some()
}

#[must_use]
pub fn str_is_none(value: Option<&str>) -> bool {
    checked_str_option(value);
    value.is_none()
}

#[must_use]
pub fn str_unwrap_or(value: Option<&str>, other: &str) -> String {
    checked_str_option(value);
    checked_text(other);
    value.unwrap_or(other) .to_owned()
}

#[must_use]
pub fn str_unwrap(value: Option<&str>) -> String {
    checked_str_option(value);
    value.unwrap() .to_owned()
}

#[must_use]
pub fn str_expect(value: Option<&str>, other: &str) -> String {
    checked_str_option(value);
    checked_text(other);
    value.expect(other) .to_owned()
}
