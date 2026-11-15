//! Part of the generated `translation_json_fields_core` carrier, split out to keep each file
//! under the 1,000-line limit; the parent re-exports every item unchanged.
#![allow(clippy::wildcard_imports)]
use super::*;

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
    (match value
        .get(key)
        .and_then(|value| value.get(second))
        .and_then(|value| value.get(third))
    {
        Some(value) => value.as_str(),
        None => None,
    })
    .map(str::to_owned)
}

#[must_use]
pub fn json_text_field3_or_empty(value: &Json, key: &str, second: &str, third: &str) -> String {
    (match value
        .get(key)
        .and_then(|value| value.get(second))
        .and_then(|value| value.get(third))
    {
        Some(value) => value.as_str(),
        None => None,
    })
    .unwrap_or("")
    .to_owned()
}

#[must_use]
pub fn json_text_field4(
    value: &Json,
    key: &str,
    second: &str,
    third: &str,
    fourth: &str,
) -> Option<String> {
    (match value
        .get(key)
        .and_then(|value| value.get(second))
        .and_then(|value| value.get(third))
        .and_then(|value| value.get(fourth))
    {
        Some(value) => value.as_str(),
        None => None,
    })
    .map(str::to_owned)
}

#[must_use]
pub fn json_text_field4_or_empty(
    value: &Json,
    key: &str,
    second: &str,
    third: &str,
    fourth: &str,
) -> String {
    (match value
        .get(key)
        .and_then(|value| value.get(second))
        .and_then(|value| value.get(third))
        .and_then(|value| value.get(fourth))
    {
        Some(value) => value.as_str(),
        None => None,
    })
    .unwrap_or("")
    .to_owned()
}

#[must_use]
pub fn json_str_field_nonempty<'a>(
    value: &'a Json,
    key: &str,
    trim_whitespace: bool,
) -> Option<&'a str> {
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
pub fn json_str_field_nonempty_or_empty<'a>(
    value: &'a Json,
    key: &str,
    trim_whitespace: bool,
) -> &'a str {
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
pub fn json_str_field2_nonempty<'a>(
    value: &'a Json,
    key: &str,
    second: &str,
    trim_whitespace: bool,
) -> Option<&'a str> {
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
pub fn json_str_field2_nonempty_or_empty<'a>(
    value: &'a Json,
    key: &str,
    second: &str,
    trim_whitespace: bool,
) -> &'a str {
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
pub fn json_text_field2_nonempty(
    value: &Json,
    key: &str,
    second: &str,
    trim_whitespace: bool,
) -> Option<String> {
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
pub fn json_text_field2_nonempty_or_empty(
    value: &Json,
    key: &str,
    second: &str,
    trim_whitespace: bool,
) -> String {
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
pub fn json_str_field3_nonempty<'a>(
    value: &'a Json,
    key: &str,
    second: &str,
    third: &str,
    trim_whitespace: bool,
) -> Option<&'a str> {
    (match value
        .get(key)
        .and_then(|value| value.get(second))
        .and_then(|value| value.get(third))
    {
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
pub fn json_str_field3_nonempty_or_empty<'a>(
    value: &'a Json,
    key: &str,
    second: &str,
    third: &str,
    trim_whitespace: bool,
) -> &'a str {
    (match value
        .get(key)
        .and_then(|value| value.get(second))
        .and_then(|value| value.get(third))
    {
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
pub fn json_text_field3_nonempty(
    value: &Json,
    key: &str,
    second: &str,
    third: &str,
    trim_whitespace: bool,
) -> Option<String> {
    (match value
        .get(key)
        .and_then(|value| value.get(second))
        .and_then(|value| value.get(third))
    {
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
pub fn json_text_field3_nonempty_or_empty(
    value: &Json,
    key: &str,
    second: &str,
    third: &str,
    trim_whitespace: bool,
) -> String {
    (match value
        .get(key)
        .and_then(|value| value.get(second))
        .and_then(|value| value.get(third))
    {
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
pub fn json_str_field4_nonempty<'a>(
    value: &'a Json,
    key: &str,
    second: &str,
    third: &str,
    fourth: &str,
    trim_whitespace: bool,
) -> Option<&'a str> {
    (match value
        .get(key)
        .and_then(|value| value.get(second))
        .and_then(|value| value.get(third))
        .and_then(|value| value.get(fourth))
    {
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
pub fn json_str_field4_nonempty_or_empty<'a>(
    value: &'a Json,
    key: &str,
    second: &str,
    third: &str,
    fourth: &str,
    trim_whitespace: bool,
) -> &'a str {
    (match value
        .get(key)
        .and_then(|value| value.get(second))
        .and_then(|value| value.get(third))
        .and_then(|value| value.get(fourth))
    {
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
pub fn json_text_field4_nonempty(
    value: &Json,
    key: &str,
    second: &str,
    third: &str,
    fourth: &str,
    trim_whitespace: bool,
) -> Option<String> {
    (match value
        .get(key)
        .and_then(|value| value.get(second))
        .and_then(|value| value.get(third))
        .and_then(|value| value.get(fourth))
    {
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
pub fn json_text_field4_nonempty_or_empty(
    value: &Json,
    key: &str,
    second: &str,
    third: &str,
    fourth: &str,
    trim_whitespace: bool,
) -> String {
    (match value
        .get(key)
        .and_then(|value| value.get(second))
        .and_then(|value| value.get(third))
        .and_then(|value| value.get(fourth))
    {
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
    (value.get(key)).unwrap_or(&Json::Null)
}

#[must_use]
pub fn json_owned_field(value: &Json, key: &str) -> Option<Json> {
    (value.get(key)).cloned()
}

#[must_use]
pub fn json_owned_field_or_null(value: &Json, key: &str) -> Json {
    (value.get(key)).cloned().unwrap_or(Json::Null)
}

#[must_use]
pub fn json_field2_or_null<'a>(value: &'a Json, key: &str, second: &str) -> &'a Json {
    (value.get(key).and_then(|value| value.get(second))).unwrap_or(&Json::Null)
}

#[must_use]
pub fn json_owned_field2(value: &Json, key: &str, second: &str) -> Option<Json> {
    (value.get(key).and_then(|value| value.get(second))).cloned()
}

#[must_use]
pub fn json_owned_field2_or_null(value: &Json, key: &str, second: &str) -> Json {
    (value.get(key).and_then(|value| value.get(second)))
        .cloned()
        .unwrap_or(Json::Null)
}

#[must_use]
pub fn json_field3_or_null<'a>(value: &'a Json, key: &str, second: &str, third: &str) -> &'a Json {
    (value
        .get(key)
        .and_then(|value| value.get(second))
        .and_then(|value| value.get(third)))
    .unwrap_or(&Json::Null)
}

#[must_use]
pub fn json_owned_field3(value: &Json, key: &str, second: &str, third: &str) -> Option<Json> {
    (value
        .get(key)
        .and_then(|value| value.get(second))
        .and_then(|value| value.get(third)))
    .cloned()
}

#[must_use]
pub fn json_owned_field3_or_null(value: &Json, key: &str, second: &str, third: &str) -> Json {
    (value
        .get(key)
        .and_then(|value| value.get(second))
        .and_then(|value| value.get(third)))
    .cloned()
    .unwrap_or(Json::Null)
}

#[must_use]
pub fn json_field4_or_null<'a>(
    value: &'a Json,
    key: &str,
    second: &str,
    third: &str,
    fourth: &str,
) -> &'a Json {
    (value
        .get(key)
        .and_then(|value| value.get(second))
        .and_then(|value| value.get(third))
        .and_then(|value| value.get(fourth)))
    .unwrap_or(&Json::Null)
}

#[must_use]
pub fn json_owned_field4(
    value: &Json,
    key: &str,
    second: &str,
    third: &str,
    fourth: &str,
) -> Option<Json> {
    (value
        .get(key)
        .and_then(|value| value.get(second))
        .and_then(|value| value.get(third))
        .and_then(|value| value.get(fourth)))
    .cloned()
}

#[must_use]
pub fn json_owned_field4_or_null(
    value: &Json,
    key: &str,
    second: &str,
    third: &str,
    fourth: &str,
) -> Json {
    (value
        .get(key)
        .and_then(|value| value.get(second))
        .and_then(|value| value.get(third))
        .and_then(|value| value.get(fourth)))
    .cloned()
    .unwrap_or(Json::Null)
}
