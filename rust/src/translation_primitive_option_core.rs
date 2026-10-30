//! Finite primitive Option interfaces. Standard Option internals stay native.
const TEXT_LIMIT: usize = 1_048_576;

fn checked_text(value: &str) {
    assert!(value.len() <= TEXT_LIMIT, "primitive Option text input bound");
}

fn checked_str_option(value: Option<&str>) {
    if let Some(value) = value {
        checked_text(value);
    }
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
    value.unwrap_or(other).to_owned()
}

#[must_use]
pub fn str_unwrap(value: Option<&str>) -> String {
    checked_str_option(value);
    value.unwrap().to_owned()
}

#[must_use]
pub fn str_expect(value: Option<&str>, other: &str) -> String {
    checked_str_option(value);
    checked_text(other);
    value.expect(other).to_owned()
}

/// Preserve an entire generic Option without observing or dropping its payload.
pub fn option_identity<T>(value: Option<T>) -> Option<T> {
    value
}

#[must_use]
pub fn u8_some(value: u8) -> Option<u8> {
    Some(value)
}

#[must_use]
pub fn u8_none() -> Option<u8> {
    None
}

#[must_use]
pub fn u8_is_some(value: Option<u8>) -> bool {
    value.is_some()
}

#[must_use]
pub fn u8_is_none(value: Option<u8>) -> bool {
    value.is_none()
}

#[must_use]
pub fn u8_unwrap_or(value: Option<u8>, other: u8) -> u8 {
    value.unwrap_or(other)
}

#[must_use]
pub fn u8_unwrap(value: Option<u8>) -> u8 {
    value.unwrap()
}

#[must_use]
pub fn u8_expect(value: Option<u8>, other: &str) -> u8 {
    checked_text(other);
    value.expect(other)
}

#[must_use]
pub fn u8_and(value: Option<u8>, other: Option<u8>) -> Option<u8> {
    value.and(other)
}

#[must_use]
pub fn u8_or(value: Option<u8>, other: Option<u8>) -> Option<u8> {
    value.or(other)
}

#[must_use]
pub fn i8_some(value: i8) -> Option<i8> {
    Some(value)
}

#[must_use]
pub fn i8_none() -> Option<i8> {
    None
}

#[must_use]
pub fn i8_is_some(value: Option<i8>) -> bool {
    value.is_some()
}

#[must_use]
pub fn i8_is_none(value: Option<i8>) -> bool {
    value.is_none()
}

#[must_use]
pub fn i8_unwrap_or(value: Option<i8>, other: i8) -> i8 {
    value.unwrap_or(other)
}

#[must_use]
pub fn i8_unwrap(value: Option<i8>) -> i8 {
    value.unwrap()
}

#[must_use]
pub fn i8_expect(value: Option<i8>, other: &str) -> i8 {
    checked_text(other);
    value.expect(other)
}

#[must_use]
pub fn i8_and(value: Option<i8>, other: Option<i8>) -> Option<i8> {
    value.and(other)
}

#[must_use]
pub fn i8_or(value: Option<i8>, other: Option<i8>) -> Option<i8> {
    value.or(other)
}

#[must_use]
pub fn u16_some(value: u16) -> Option<u16> {
    Some(value)
}

#[must_use]
pub fn u16_none() -> Option<u16> {
    None
}

#[must_use]
pub fn u16_is_some(value: Option<u16>) -> bool {
    value.is_some()
}

#[must_use]
pub fn u16_is_none(value: Option<u16>) -> bool {
    value.is_none()
}

#[must_use]
pub fn u16_unwrap_or(value: Option<u16>, other: u16) -> u16 {
    value.unwrap_or(other)
}

#[must_use]
pub fn u16_unwrap(value: Option<u16>) -> u16 {
    value.unwrap()
}

#[must_use]
pub fn u16_expect(value: Option<u16>, other: &str) -> u16 {
    checked_text(other);
    value.expect(other)
}

#[must_use]
pub fn u16_and(value: Option<u16>, other: Option<u16>) -> Option<u16> {
    value.and(other)
}

#[must_use]
pub fn u16_or(value: Option<u16>, other: Option<u16>) -> Option<u16> {
    value.or(other)
}

#[must_use]
pub fn i16_some(value: i16) -> Option<i16> {
    Some(value)
}

#[must_use]
pub fn i16_none() -> Option<i16> {
    None
}

#[must_use]
pub fn i16_is_some(value: Option<i16>) -> bool {
    value.is_some()
}

#[must_use]
pub fn i16_is_none(value: Option<i16>) -> bool {
    value.is_none()
}

#[must_use]
pub fn i16_unwrap_or(value: Option<i16>, other: i16) -> i16 {
    value.unwrap_or(other)
}

#[must_use]
pub fn i16_unwrap(value: Option<i16>) -> i16 {
    value.unwrap()
}

#[must_use]
pub fn i16_expect(value: Option<i16>, other: &str) -> i16 {
    checked_text(other);
    value.expect(other)
}

#[must_use]
pub fn i16_and(value: Option<i16>, other: Option<i16>) -> Option<i16> {
    value.and(other)
}

#[must_use]
pub fn i16_or(value: Option<i16>, other: Option<i16>) -> Option<i16> {
    value.or(other)
}

#[must_use]
pub fn u32_some(value: u32) -> Option<u32> {
    Some(value)
}

#[must_use]
pub fn u32_none() -> Option<u32> {
    None
}

#[must_use]
pub fn u32_is_some(value: Option<u32>) -> bool {
    value.is_some()
}

#[must_use]
pub fn u32_is_none(value: Option<u32>) -> bool {
    value.is_none()
}

#[must_use]
pub fn u32_unwrap_or(value: Option<u32>, other: u32) -> u32 {
    value.unwrap_or(other)
}

#[must_use]
pub fn u32_unwrap(value: Option<u32>) -> u32 {
    value.unwrap()
}

#[must_use]
pub fn u32_expect(value: Option<u32>, other: &str) -> u32 {
    checked_text(other);
    value.expect(other)
}

#[must_use]
pub fn u32_and(value: Option<u32>, other: Option<u32>) -> Option<u32> {
    value.and(other)
}

#[must_use]
pub fn u32_or(value: Option<u32>, other: Option<u32>) -> Option<u32> {
    value.or(other)
}

#[must_use]
pub fn i32_some(value: i32) -> Option<i32> {
    Some(value)
}

#[must_use]
pub fn i32_none() -> Option<i32> {
    None
}

#[must_use]
pub fn i32_is_some(value: Option<i32>) -> bool {
    value.is_some()
}

#[must_use]
pub fn i32_is_none(value: Option<i32>) -> bool {
    value.is_none()
}

#[must_use]
pub fn i32_unwrap_or(value: Option<i32>, other: i32) -> i32 {
    value.unwrap_or(other)
}

#[must_use]
pub fn i32_unwrap(value: Option<i32>) -> i32 {
    value.unwrap()
}

#[must_use]
pub fn i32_expect(value: Option<i32>, other: &str) -> i32 {
    checked_text(other);
    value.expect(other)
}

#[must_use]
pub fn i32_and(value: Option<i32>, other: Option<i32>) -> Option<i32> {
    value.and(other)
}

#[must_use]
pub fn i32_or(value: Option<i32>, other: Option<i32>) -> Option<i32> {
    value.or(other)
}

#[must_use]
pub fn u128_some(value: u128) -> Option<u128> {
    Some(value)
}

#[must_use]
pub fn u128_none() -> Option<u128> {
    None
}

#[must_use]
pub fn u128_is_some(value: Option<u128>) -> bool {
    value.is_some()
}

#[must_use]
pub fn u128_is_none(value: Option<u128>) -> bool {
    value.is_none()
}

#[must_use]
pub fn u128_unwrap_or(value: Option<u128>, other: u128) -> u128 {
    value.unwrap_or(other)
}

#[must_use]
pub fn u128_unwrap(value: Option<u128>) -> u128 {
    value.unwrap()
}

#[must_use]
pub fn u128_expect(value: Option<u128>, other: &str) -> u128 {
    checked_text(other);
    value.expect(other)
}

#[must_use]
pub fn u128_and(value: Option<u128>, other: Option<u128>) -> Option<u128> {
    value.and(other)
}

#[must_use]
pub fn u128_or(value: Option<u128>, other: Option<u128>) -> Option<u128> {
    value.or(other)
}

#[must_use]
pub fn i128_some(value: i128) -> Option<i128> {
    Some(value)
}

#[must_use]
pub fn i128_none() -> Option<i128> {
    None
}

#[must_use]
pub fn i128_is_some(value: Option<i128>) -> bool {
    value.is_some()
}

#[must_use]
pub fn i128_is_none(value: Option<i128>) -> bool {
    value.is_none()
}

#[must_use]
pub fn i128_unwrap_or(value: Option<i128>, other: i128) -> i128 {
    value.unwrap_or(other)
}

#[must_use]
pub fn i128_unwrap(value: Option<i128>) -> i128 {
    value.unwrap()
}

#[must_use]
pub fn i128_expect(value: Option<i128>, other: &str) -> i128 {
    checked_text(other);
    value.expect(other)
}

#[must_use]
pub fn i128_and(value: Option<i128>, other: Option<i128>) -> Option<i128> {
    value.and(other)
}

#[must_use]
pub fn i128_or(value: Option<i128>, other: Option<i128>) -> Option<i128> {
    value.or(other)
}

#[must_use]
pub fn text_owned_some(value: String) -> Option<String> {
    checked_text(&value);
    Some(value)
}

#[must_use]
pub fn text_owned_none() -> Option<String> {
    None
}

#[must_use]
pub fn text_owned_unwrap_or(value: Option<String>, other: String) -> String {
    checked_str_option(value.as_deref());
    checked_text(&other);
    value.unwrap_or(other)
}

#[must_use]
pub fn text_owned_unwrap(value: Option<String>) -> String {
    checked_str_option(value.as_deref());
    value.unwrap()
}

#[must_use]
pub fn text_owned_expect(value: Option<String>, other: &str) -> String {
    checked_str_option(value.as_deref());
    checked_text(other);
    value.expect(other)
}

#[must_use]
pub fn text_owned_and(value: Option<String>, other: Option<String>) -> Option<String> {
    checked_str_option(value.as_deref());
    checked_str_option(other.as_deref());
    value.and(other)
}

#[must_use]
pub fn text_owned_or(value: Option<String>, other: Option<String>) -> Option<String> {
    checked_str_option(value.as_deref());
    checked_str_option(other.as_deref());
    value.or(other)
}

#[must_use]
pub fn text_owned_unwrap_or_default(value: Option<String>) -> String {
    checked_str_option(value.as_deref());
    value.unwrap_or_default()
}

#[must_use]
pub fn text_owned_filter_nonempty(value: Option<String>, trim_whitespace: bool) -> Option<String> {
    checked_str_option(value.as_deref());
    value.filter(|text| if trim_whitespace { !text.trim().is_empty() } else { !text.is_empty() })
}

#[must_use]
pub fn str_filter_nonempty(value: Option<&str>, trim_whitespace: bool) -> Option<&str> {
    checked_str_option(value);
    value.filter(|text| if trim_whitespace { !text.trim().is_empty() } else { !text.is_empty() })
}

#[must_use]
pub fn bool_ok_or(value: Option<bool>, error: String) -> Result<bool, String> {
    checked_text(&error);
    value.ok_or(error)
}

#[must_use]
pub fn bool_ok_or_text(value: Option<bool>, error: &str) -> Result<bool, String> {
    checked_text(error);
    value.ok_or_else(|| error.to_owned())
}

#[must_use]
pub fn u64_ok_or(value: Option<u64>, error: String) -> Result<u64, String> {
    checked_text(&error);
    value.ok_or(error)
}

#[must_use]
pub fn u64_ok_or_text(value: Option<u64>, error: &str) -> Result<u64, String> {
    checked_text(error);
    value.ok_or_else(|| error.to_owned())
}

#[must_use]
pub fn i64_ok_or(value: Option<i64>, error: String) -> Result<i64, String> {
    checked_text(&error);
    value.ok_or(error)
}

#[must_use]
pub fn i64_ok_or_text(value: Option<i64>, error: &str) -> Result<i64, String> {
    checked_text(error);
    value.ok_or_else(|| error.to_owned())
}

#[must_use]
pub fn str_ok_or<'input>(value: Option<&'input str>, error: String) -> Result<&'input str, String> {
    checked_str_option(value);
    checked_text(&error);
    value.ok_or(error)
}

#[must_use]
pub fn str_ok_or_text<'input>(value: Option<&'input str>, error: &str) -> Result<&'input str, String> {
    checked_str_option(value);
    checked_text(error);
    value.ok_or_else(|| error.to_owned())
}

#[must_use]
pub fn text_owned_ok_or(value: Option<String>, error: String) -> Result<String, String> {
    checked_str_option(value.as_deref());
    checked_text(&error);
    value.ok_or(error)
}

#[must_use]
pub fn text_owned_ok_or_text(value: Option<String>, error: &str) -> Result<String, String> {
    checked_str_option(value.as_deref());
    checked_text(error);
    value.ok_or_else(|| error.to_owned())
}
