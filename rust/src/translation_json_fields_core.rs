//! Explicit owned-library boundary for common immutable JSON field readers.
//! Library internals remain native; callers retain ordinary source/type checks.
use crate::translation_core::Json;

#[must_use]
pub fn json_field<'a>(value: &'a Json, key: &str) -> Option<&'a Json> {
    value.get(key)
}

#[must_use]
pub fn json_index(value: &Json, index: u64) -> Option<&Json> {
    match usize::try_from(index) {
        Ok(index) => value.get(index),
        Err(_) => None,
    }
}

#[must_use]
pub fn json_str_field<'a>(value: &'a Json, key: &str) -> Option<&'a str> {
    match value.get(key) {
        Some(value) => value.as_str(),
        None => None,
    }
}

#[must_use]
pub fn json_bool_field(value: &Json, key: &str) -> Option<bool> {
    match value.get(key) {
        Some(value) => value.as_bool(),
        None => None,
    }
}

#[must_use]
pub fn json_u64_field(value: &Json, key: &str) -> Option<u64> {
    match value.get(key) {
        Some(value) => value.as_u64(),
        None => None,
    }
}

#[must_use]
pub fn json_i64_field(value: &Json, key: &str) -> Option<i64> {
    match value.get(key) {
        Some(value) => value.as_i64(),
        None => None,
    }
}

#[must_use]
pub fn json_str_field_or_empty<'a>(value: &'a Json, key: &str) -> &'a str {
    (match value.get(key) {
        Some(value) => value.as_str(),
        None => None,
    })
    .unwrap_or("")
}

#[must_use]
pub fn json_bool_field_or(value: &Json, key: &str, other: bool) -> bool {
    (match value.get(key) {
        Some(value) => value.as_bool(),
        None => None,
    })
    .unwrap_or(other)
}

#[must_use]
pub fn json_u64_field_or(value: &Json, key: &str, other: u64) -> u64 {
    (match value.get(key) {
        Some(value) => value.as_u64(),
        None => None,
    })
    .unwrap_or(other)
}

#[must_use]
pub fn json_i64_field_or(value: &Json, key: &str, other: i64) -> i64 {
    (match value.get(key) {
        Some(value) => value.as_i64(),
        None => None,
    })
    .unwrap_or(other)
}
