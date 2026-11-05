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

#[must_use]
pub fn json_field2<'a>(value: &'a Json, key: &str, second: &str) -> Option<&'a Json> {
    value.get(key).and_then(|value| value.get(second))
}

#[must_use]
pub fn json_str_field2<'a>(value: &'a Json, key: &str, second: &str) -> Option<&'a str> {
    match value.get(key).and_then(|value| value.get(second)) {
        Some(value) => value.as_str(),
        None => None,
    }
}

#[must_use]
pub fn json_str_field2_or_empty<'a>(value: &'a Json, key: &str, second: &str) -> &'a str {
    (match value.get(key).and_then(|value| value.get(second)) {
        Some(value) => value.as_str(),
        None => None,
    })
    .unwrap_or("")
}

#[must_use]
pub fn json_bool_field2(value: &Json, key: &str, second: &str) -> Option<bool> {
    match value.get(key).and_then(|value| value.get(second)) {
        Some(value) => value.as_bool(),
        None => None,
    }
}

#[must_use]
pub fn json_bool_field2_or(value: &Json, key: &str, second: &str, other: bool) -> bool {
    (match value.get(key).and_then(|value| value.get(second)) {
        Some(value) => value.as_bool(),
        None => None,
    })
    .unwrap_or(other)
}

#[must_use]
pub fn json_u64_field2(value: &Json, key: &str, second: &str) -> Option<u64> {
    match value.get(key).and_then(|value| value.get(second)) {
        Some(value) => value.as_u64(),
        None => None,
    }
}

#[must_use]
pub fn json_u64_field2_or(value: &Json, key: &str, second: &str, other: u64) -> u64 {
    (match value.get(key).and_then(|value| value.get(second)) {
        Some(value) => value.as_u64(),
        None => None,
    })
    .unwrap_or(other)
}

#[must_use]
pub fn json_i64_field2(value: &Json, key: &str, second: &str) -> Option<i64> {
    match value.get(key).and_then(|value| value.get(second)) {
        Some(value) => value.as_i64(),
        None => None,
    }
}

#[must_use]
pub fn json_i64_field2_or(value: &Json, key: &str, second: &str, other: i64) -> i64 {
    (match value.get(key).and_then(|value| value.get(second)) {
        Some(value) => value.as_i64(),
        None => None,
    })
    .unwrap_or(other)
}

#[must_use]
pub fn json_field3<'a>(value: &'a Json, key: &str, second: &str, third: &str) -> Option<&'a Json> {
    value.get(key).and_then(|value| value.get(second)).and_then(|value| value.get(third))
}

#[must_use]
pub fn json_str_field3<'a>(value: &'a Json, key: &str, second: &str, third: &str) -> Option<&'a str> {
    match value.get(key).and_then(|value| value.get(second)).and_then(|value| value.get(third)) {
        Some(value) => value.as_str(),
        None => None,
    }
}

#[must_use]
pub fn json_str_field3_or_empty<'a>(value: &'a Json, key: &str, second: &str, third: &str) -> &'a str {
    (match value.get(key).and_then(|value| value.get(second)).and_then(|value| value.get(third)) {
        Some(value) => value.as_str(),
        None => None,
    })
    .unwrap_or("")
}

#[must_use]
pub fn json_bool_field3(value: &Json, key: &str, second: &str, third: &str) -> Option<bool> {
    match value.get(key).and_then(|value| value.get(second)).and_then(|value| value.get(third)) {
        Some(value) => value.as_bool(),
        None => None,
    }
}

#[must_use]
pub fn json_bool_field3_or(value: &Json, key: &str, second: &str, third: &str, other: bool) -> bool {
    (match value.get(key).and_then(|value| value.get(second)).and_then(|value| value.get(third)) {
        Some(value) => value.as_bool(),
        None => None,
    })
    .unwrap_or(other)
}

#[must_use]
pub fn json_u64_field3(value: &Json, key: &str, second: &str, third: &str) -> Option<u64> {
    match value.get(key).and_then(|value| value.get(second)).and_then(|value| value.get(third)) {
        Some(value) => value.as_u64(),
        None => None,
    }
}

#[must_use]
pub fn json_u64_field3_or(value: &Json, key: &str, second: &str, third: &str, other: u64) -> u64 {
    (match value.get(key).and_then(|value| value.get(second)).and_then(|value| value.get(third)) {
        Some(value) => value.as_u64(),
        None => None,
    })
    .unwrap_or(other)
}

#[must_use]
pub fn json_i64_field3(value: &Json, key: &str, second: &str, third: &str) -> Option<i64> {
    match value.get(key).and_then(|value| value.get(second)).and_then(|value| value.get(third)) {
        Some(value) => value.as_i64(),
        None => None,
    }
}

#[must_use]
pub fn json_i64_field3_or(value: &Json, key: &str, second: &str, third: &str, other: i64) -> i64 {
    (match value.get(key).and_then(|value| value.get(second)).and_then(|value| value.get(third)) {
        Some(value) => value.as_i64(),
        None => None,
    })
    .unwrap_or(other)
}

#[must_use]
pub fn json_field4<'a>(value: &'a Json, key: &str, second: &str, third: &str, fourth: &str) -> Option<&'a Json> {
    value.get(key).and_then(|value| value.get(second)).and_then(|value| value.get(third)).and_then(|value| value.get(fourth))
}

#[must_use]
pub fn json_str_field4<'a>(value: &'a Json, key: &str, second: &str, third: &str, fourth: &str) -> Option<&'a str> {
    match value.get(key).and_then(|value| value.get(second)).and_then(|value| value.get(third)).and_then(|value| value.get(fourth)) {
        Some(value) => value.as_str(),
        None => None,
    }
}

#[must_use]
pub fn json_str_field4_or_empty<'a>(value: &'a Json, key: &str, second: &str, third: &str, fourth: &str) -> &'a str {
    (match value.get(key).and_then(|value| value.get(second)).and_then(|value| value.get(third)).and_then(|value| value.get(fourth)) {
        Some(value) => value.as_str(),
        None => None,
    })
    .unwrap_or("")
}

#[must_use]
pub fn json_bool_field4(value: &Json, key: &str, second: &str, third: &str, fourth: &str) -> Option<bool> {
    match value.get(key).and_then(|value| value.get(second)).and_then(|value| value.get(third)).and_then(|value| value.get(fourth)) {
        Some(value) => value.as_bool(),
        None => None,
    }
}

#[must_use]
pub fn json_bool_field4_or(value: &Json, key: &str, second: &str, third: &str, fourth: &str, other: bool) -> bool {
    (match value.get(key).and_then(|value| value.get(second)).and_then(|value| value.get(third)).and_then(|value| value.get(fourth)) {
        Some(value) => value.as_bool(),
        None => None,
    })
    .unwrap_or(other)
}

#[must_use]
pub fn json_u64_field4(value: &Json, key: &str, second: &str, third: &str, fourth: &str) -> Option<u64> {
    match value.get(key).and_then(|value| value.get(second)).and_then(|value| value.get(third)).and_then(|value| value.get(fourth)) {
        Some(value) => value.as_u64(),
        None => None,
    }
}

#[must_use]
pub fn json_u64_field4_or(value: &Json, key: &str, second: &str, third: &str, fourth: &str, other: u64) -> u64 {
    (match value.get(key).and_then(|value| value.get(second)).and_then(|value| value.get(third)).and_then(|value| value.get(fourth)) {
        Some(value) => value.as_u64(),
        None => None,
    })
    .unwrap_or(other)
}

#[must_use]
pub fn json_i64_field4(value: &Json, key: &str, second: &str, third: &str, fourth: &str) -> Option<i64> {
    match value.get(key).and_then(|value| value.get(second)).and_then(|value| value.get(third)).and_then(|value| value.get(fourth)) {
        Some(value) => value.as_i64(),
        None => None,
    }
}

#[must_use]
pub fn json_i64_field4_or(value: &Json, key: &str, second: &str, third: &str, fourth: &str, other: i64) -> i64 {
    (match value.get(key).and_then(|value| value.get(second)).and_then(|value| value.get(third)).and_then(|value| value.get(fourth)) {
        Some(value) => value.as_i64(),
        None => None,
    })
    .unwrap_or(other)
}

#[must_use]
pub fn json_text_field(value: &Json, key: &str) -> Option<String> {
    (match value.get(key) {
        Some(value) => value.as_str(),
        None => None,
    })
    .map(str::to_owned)
}

#[must_use]
pub fn json_text_field_or_empty(value: &Json, key: &str) -> String {
    (match value.get(key) {
        Some(value) => value.as_str(),
        None => None,
    })
    .unwrap_or("")
    .to_owned()
}

#[must_use]
pub fn json_text_field2(value: &Json, key: &str, second: &str) -> Option<String> {
    (match value.get(key).and_then(|value| value.get(second)) {
        Some(value) => value.as_str(),
        None => None,
    })
    .map(str::to_owned)
}

#[must_use]
pub fn json_text_field2_or_empty(value: &Json, key: &str, second: &str) -> String {
    (match value.get(key).and_then(|value| value.get(second)) {
        Some(value) => value.as_str(),
        None => None,
    })
    .unwrap_or("")
    .to_owned()
}

#[must_use]
pub fn json_text_field3(value: &Json, key: &str, second: &str, third: &str) -> Option<String> {
    (match value.get(key).and_then(|value| value.get(second)).and_then(|value| value.get(third)) {
        Some(value) => value.as_str(),
        None => None,
    })
    .map(str::to_owned)
}

#[must_use]
pub fn json_text_field3_or_empty(value: &Json, key: &str, second: &str, third: &str) -> String {
    (match value.get(key).and_then(|value| value.get(second)).and_then(|value| value.get(third)) {
        Some(value) => value.as_str(),
        None => None,
    })
    .unwrap_or("")
    .to_owned()
}

#[must_use]
pub fn json_text_field4(value: &Json, key: &str, second: &str, third: &str, fourth: &str) -> Option<String> {
    (match value.get(key).and_then(|value| value.get(second)).and_then(|value| value.get(third)).and_then(|value| value.get(fourth)) {
        Some(value) => value.as_str(),
        None => None,
    })
    .map(str::to_owned)
}

#[must_use]
pub fn json_text_field4_or_empty(value: &Json, key: &str, second: &str, third: &str, fourth: &str) -> String {
    (match value.get(key).and_then(|value| value.get(second)).and_then(|value| value.get(third)).and_then(|value| value.get(fourth)) {
        Some(value) => value.as_str(),
        None => None,
    })
    .unwrap_or("")
    .to_owned()
}

#[must_use]
pub fn json_str_field_nonempty<'a>(value: &'a Json, key: &str, trim_whitespace: bool) -> Option<&'a str> {
    (match value.get(key) {
        Some(value) => value.as_str(),
        None => None,
    })
    .filter(|value| {
        if trim_whitespace {
            !value.trim().is_empty()
        } else {
            !value.is_empty()
        }
    })
}

#[must_use]
pub fn json_str_field_nonempty_or_empty<'a>(value: &'a Json, key: &str, trim_whitespace: bool) -> &'a str {
    (match value.get(key) {
        Some(value) => value.as_str(),
        None => None,
    })
    .filter(|value| {
        if trim_whitespace {
            !value.trim().is_empty()
        } else {
            !value.is_empty()
        }
    })
    .unwrap_or("")
}

#[must_use]
pub fn json_text_field_nonempty(value: &Json, key: &str, trim_whitespace: bool) -> Option<String> {
    (match value.get(key) {
        Some(value) => value.as_str(),
        None => None,
    })
    .filter(|value| {
        if trim_whitespace {
            !value.trim().is_empty()
        } else {
            !value.is_empty()
        }
    })
    .map(str::to_owned)
}

#[must_use]
pub fn json_text_field_nonempty_or_empty(value: &Json, key: &str, trim_whitespace: bool) -> String {
    (match value.get(key) {
        Some(value) => value.as_str(),
        None => None,
    })
    .filter(|value| {
        if trim_whitespace {
            !value.trim().is_empty()
        } else {
            !value.is_empty()
        }
    })
    .unwrap_or("")
    .to_owned()
}

#[must_use]
pub fn json_str_field2_nonempty<'a>(value: &'a Json, key: &str, second: &str, trim_whitespace: bool) -> Option<&'a str> {
    (match value.get(key).and_then(|value| value.get(second)) {
        Some(value) => value.as_str(),
        None => None,
    })
    .filter(|value| {
        if trim_whitespace {
            !value.trim().is_empty()
        } else {
            !value.is_empty()
        }
    })
}

#[must_use]
pub fn json_str_field2_nonempty_or_empty<'a>(value: &'a Json, key: &str, second: &str, trim_whitespace: bool) -> &'a str {
    (match value.get(key).and_then(|value| value.get(second)) {
        Some(value) => value.as_str(),
        None => None,
    })
    .filter(|value| {
        if trim_whitespace {
            !value.trim().is_empty()
        } else {
            !value.is_empty()
        }
    })
    .unwrap_or("")
}

#[must_use]
pub fn json_text_field2_nonempty(value: &Json, key: &str, second: &str, trim_whitespace: bool) -> Option<String> {
    (match value.get(key).and_then(|value| value.get(second)) {
        Some(value) => value.as_str(),
        None => None,
    })
    .filter(|value| {
        if trim_whitespace {
            !value.trim().is_empty()
        } else {
            !value.is_empty()
        }
    })
    .map(str::to_owned)
}

#[must_use]
pub fn json_text_field2_nonempty_or_empty(value: &Json, key: &str, second: &str, trim_whitespace: bool) -> String {
    (match value.get(key).and_then(|value| value.get(second)) {
        Some(value) => value.as_str(),
        None => None,
    })
    .filter(|value| {
        if trim_whitespace {
            !value.trim().is_empty()
        } else {
            !value.is_empty()
        }
    })
    .unwrap_or("")
    .to_owned()
}

#[must_use]
pub fn json_str_field3_nonempty<'a>(value: &'a Json, key: &str, second: &str, third: &str, trim_whitespace: bool) -> Option<&'a str> {
    (match value.get(key).and_then(|value| value.get(second)).and_then(|value| value.get(third)) {
        Some(value) => value.as_str(),
        None => None,
    })
    .filter(|value| {
        if trim_whitespace {
            !value.trim().is_empty()
        } else {
            !value.is_empty()
        }
    })
}

#[must_use]
pub fn json_str_field3_nonempty_or_empty<'a>(value: &'a Json, key: &str, second: &str, third: &str, trim_whitespace: bool) -> &'a str {
    (match value.get(key).and_then(|value| value.get(second)).and_then(|value| value.get(third)) {
        Some(value) => value.as_str(),
        None => None,
    })
    .filter(|value| {
        if trim_whitespace {
            !value.trim().is_empty()
        } else {
            !value.is_empty()
        }
    })
    .unwrap_or("")
}

#[must_use]
pub fn json_text_field3_nonempty(value: &Json, key: &str, second: &str, third: &str, trim_whitespace: bool) -> Option<String> {
    (match value.get(key).and_then(|value| value.get(second)).and_then(|value| value.get(third)) {
        Some(value) => value.as_str(),
        None => None,
    })
    .filter(|value| {
        if trim_whitespace {
            !value.trim().is_empty()
        } else {
            !value.is_empty()
        }
    })
    .map(str::to_owned)
}

#[must_use]
pub fn json_text_field3_nonempty_or_empty(value: &Json, key: &str, second: &str, third: &str, trim_whitespace: bool) -> String {
    (match value.get(key).and_then(|value| value.get(second)).and_then(|value| value.get(third)) {
        Some(value) => value.as_str(),
        None => None,
    })
    .filter(|value| {
        if trim_whitespace {
            !value.trim().is_empty()
        } else {
            !value.is_empty()
        }
    })
    .unwrap_or("")
    .to_owned()
}

#[must_use]
pub fn json_str_field4_nonempty<'a>(value: &'a Json, key: &str, second: &str, third: &str, fourth: &str, trim_whitespace: bool) -> Option<&'a str> {
    (match value.get(key).and_then(|value| value.get(second)).and_then(|value| value.get(third)).and_then(|value| value.get(fourth)) {
        Some(value) => value.as_str(),
        None => None,
    })
    .filter(|value| {
        if trim_whitespace {
            !value.trim().is_empty()
        } else {
            !value.is_empty()
        }
    })
}

#[must_use]
pub fn json_str_field4_nonempty_or_empty<'a>(value: &'a Json, key: &str, second: &str, third: &str, fourth: &str, trim_whitespace: bool) -> &'a str {
    (match value.get(key).and_then(|value| value.get(second)).and_then(|value| value.get(third)).and_then(|value| value.get(fourth)) {
        Some(value) => value.as_str(),
        None => None,
    })
    .filter(|value| {
        if trim_whitespace {
            !value.trim().is_empty()
        } else {
            !value.is_empty()
        }
    })
    .unwrap_or("")
}

#[must_use]
pub fn json_text_field4_nonempty(value: &Json, key: &str, second: &str, third: &str, fourth: &str, trim_whitespace: bool) -> Option<String> {
    (match value.get(key).and_then(|value| value.get(second)).and_then(|value| value.get(third)).and_then(|value| value.get(fourth)) {
        Some(value) => value.as_str(),
        None => None,
    })
    .filter(|value| {
        if trim_whitespace {
            !value.trim().is_empty()
        } else {
            !value.is_empty()
        }
    })
    .map(str::to_owned)
}

#[must_use]
pub fn json_text_field4_nonempty_or_empty(value: &Json, key: &str, second: &str, third: &str, fourth: &str, trim_whitespace: bool) -> String {
    (match value.get(key).and_then(|value| value.get(second)).and_then(|value| value.get(third)).and_then(|value| value.get(fourth)) {
        Some(value) => value.as_str(),
        None => None,
    })
    .filter(|value| {
        if trim_whitespace {
            !value.trim().is_empty()
        } else {
            !value.is_empty()
        }
    })
    .unwrap_or("")
    .to_owned()
}

#[must_use]
pub fn json_index_or_null(value: &Json, index: u64) -> &Json {
    (match usize::try_from(index) {
        Ok(index) => value.get(index),
        Err(_) => None,
    })
    .unwrap_or(&Json::Null)
}

#[must_use]
pub fn json_owned_index(value: &Json, index: u64) -> Option<Json> {
    (match usize::try_from(index) {
        Ok(index) => value.get(index),
        Err(_) => None,
    })
    .cloned()
}

#[must_use]
pub fn json_owned_index_or_null(value: &Json, index: u64) -> Json {
    (match usize::try_from(index) {
        Ok(index) => value.get(index),
        Err(_) => None,
    })
    .cloned()
    .unwrap_or(Json::Null)
}

#[must_use]
pub fn json_field_or_null<'a>(value: &'a Json, key: &str) -> &'a Json {
    (value.get(key))
    .unwrap_or(&Json::Null)
}

#[must_use]
pub fn json_owned_field(value: &Json, key: &str) -> Option<Json> {
    (value.get(key))
    .cloned()
}

#[must_use]
pub fn json_owned_field_or_null(value: &Json, key: &str) -> Json {
    (value.get(key))
    .cloned()
    .unwrap_or(Json::Null)
}

#[must_use]
pub fn json_field2_or_null<'a>(value: &'a Json, key: &str, second: &str) -> &'a Json {
    (value.get(key).and_then(|value| value.get(second)))
    .unwrap_or(&Json::Null)
}

#[must_use]
pub fn json_owned_field2(value: &Json, key: &str, second: &str) -> Option<Json> {
    (value.get(key).and_then(|value| value.get(second)))
    .cloned()
}

#[must_use]
pub fn json_owned_field2_or_null(value: &Json, key: &str, second: &str) -> Json {
    (value.get(key).and_then(|value| value.get(second)))
    .cloned()
    .unwrap_or(Json::Null)
}

#[must_use]
pub fn json_field3_or_null<'a>(value: &'a Json, key: &str, second: &str, third: &str) -> &'a Json {
    (value.get(key).and_then(|value| value.get(second)).and_then(|value| value.get(third)))
    .unwrap_or(&Json::Null)
}

#[must_use]
pub fn json_owned_field3(value: &Json, key: &str, second: &str, third: &str) -> Option<Json> {
    (value.get(key).and_then(|value| value.get(second)).and_then(|value| value.get(third)))
    .cloned()
}

#[must_use]
pub fn json_owned_field3_or_null(value: &Json, key: &str, second: &str, third: &str) -> Json {
    (value.get(key).and_then(|value| value.get(second)).and_then(|value| value.get(third)))
    .cloned()
    .unwrap_or(Json::Null)
}

#[must_use]
pub fn json_field4_or_null<'a>(value: &'a Json, key: &str, second: &str, third: &str, fourth: &str) -> &'a Json {
    (value.get(key).and_then(|value| value.get(second)).and_then(|value| value.get(third)).and_then(|value| value.get(fourth)))
    .unwrap_or(&Json::Null)
}

#[must_use]
pub fn json_owned_field4(value: &Json, key: &str, second: &str, third: &str, fourth: &str) -> Option<Json> {
    (value.get(key).and_then(|value| value.get(second)).and_then(|value| value.get(third)).and_then(|value| value.get(fourth)))
    .cloned()
}

#[must_use]
pub fn json_owned_field4_or_null(value: &Json, key: &str, second: &str, third: &str, fourth: &str) -> Json {
    (value.get(key).and_then(|value| value.get(second)).and_then(|value| value.get(third)).and_then(|value| value.get(fourth)))
    .cloned()
    .unwrap_or(Json::Null)
}
