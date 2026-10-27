//! Finite closed primitive callbacks; Option and FnOnce implementations remain native.

fn checked_text(value: &str) {
    let _ = crate::translation_text_core::len_utf8(value);
}

fn checked_option_text(value: Option<&str>) {
    let _ = crate::translation_primitive_option_core::str_is_some(value);
}

#[must_use]
pub fn bool_to_bool_map(
    value: Option<bool>,
    callback: impl FnOnce(bool) -> bool,
) -> Option<bool> {
    value.map(|value| {
        let output = callback(value);
        output
    })
}

#[must_use]
pub fn bool_to_bool_and_then(
    value: Option<bool>,
    callback: impl FnOnce(bool) -> Option<bool>,
) -> Option<bool> {
    value.and_then(|value| {
        let output = callback(value);
        output
    })
}

#[must_use]
pub fn bool_to_u64_map(
    value: Option<bool>,
    callback: impl FnOnce(bool) -> u64,
) -> Option<u64> {
    value.map(|value| {
        let output = callback(value);
        output
    })
}

#[must_use]
pub fn bool_to_u64_and_then(
    value: Option<bool>,
    callback: impl FnOnce(bool) -> Option<u64>,
) -> Option<u64> {
    value.and_then(|value| {
        let output = callback(value);
        output
    })
}

#[must_use]
pub fn bool_to_i64_map(
    value: Option<bool>,
    callback: impl FnOnce(bool) -> i64,
) -> Option<i64> {
    value.map(|value| {
        let output = callback(value);
        output
    })
}

#[must_use]
pub fn bool_to_i64_and_then(
    value: Option<bool>,
    callback: impl FnOnce(bool) -> Option<i64>,
) -> Option<i64> {
    value.and_then(|value| {
        let output = callback(value);
        output
    })
}

#[must_use]
pub fn bool_to_str_map<'output>(
    value: Option<bool>,
    callback: impl FnOnce(bool) -> &'output str,
) -> Option<&'output str> {
    value.map(|value| {
        let output = callback(value);
        checked_text(output);
        output
    })
}

#[must_use]
pub fn bool_to_str_and_then<'output>(
    value: Option<bool>,
    callback: impl FnOnce(bool) -> Option<&'output str>,
) -> Option<&'output str> {
    value.and_then(|value| {
        let output = callback(value);
        checked_option_text(output);
        output
    })
}

#[must_use]
pub fn bool_unwrap_or_else(
    value: Option<bool>,
    callback: impl FnOnce() -> bool,
) -> bool {
    value.unwrap_or_else(callback)
}

#[must_use]
pub fn u64_to_bool_map(
    value: Option<u64>,
    callback: impl FnOnce(u64) -> bool,
) -> Option<bool> {
    value.map(|value| {
        let output = callback(value);
        output
    })
}

#[must_use]
pub fn u64_to_bool_and_then(
    value: Option<u64>,
    callback: impl FnOnce(u64) -> Option<bool>,
) -> Option<bool> {
    value.and_then(|value| {
        let output = callback(value);
        output
    })
}

#[must_use]
pub fn u64_to_u64_map(
    value: Option<u64>,
    callback: impl FnOnce(u64) -> u64,
) -> Option<u64> {
    value.map(|value| {
        let output = callback(value);
        output
    })
}

#[must_use]
pub fn u64_to_u64_and_then(
    value: Option<u64>,
    callback: impl FnOnce(u64) -> Option<u64>,
) -> Option<u64> {
    value.and_then(|value| {
        let output = callback(value);
        output
    })
}

#[must_use]
pub fn u64_to_i64_map(
    value: Option<u64>,
    callback: impl FnOnce(u64) -> i64,
) -> Option<i64> {
    value.map(|value| {
        let output = callback(value);
        output
    })
}

#[must_use]
pub fn u64_to_i64_and_then(
    value: Option<u64>,
    callback: impl FnOnce(u64) -> Option<i64>,
) -> Option<i64> {
    value.and_then(|value| {
        let output = callback(value);
        output
    })
}

#[must_use]
pub fn u64_to_str_map<'output>(
    value: Option<u64>,
    callback: impl FnOnce(u64) -> &'output str,
) -> Option<&'output str> {
    value.map(|value| {
        let output = callback(value);
        checked_text(output);
        output
    })
}

#[must_use]
pub fn u64_to_str_and_then<'output>(
    value: Option<u64>,
    callback: impl FnOnce(u64) -> Option<&'output str>,
) -> Option<&'output str> {
    value.and_then(|value| {
        let output = callback(value);
        checked_option_text(output);
        output
    })
}

#[must_use]
pub fn u64_unwrap_or_else(
    value: Option<u64>,
    callback: impl FnOnce() -> u64,
) -> u64 {
    value.unwrap_or_else(callback)
}

#[must_use]
pub fn i64_to_bool_map(
    value: Option<i64>,
    callback: impl FnOnce(i64) -> bool,
) -> Option<bool> {
    value.map(|value| {
        let output = callback(value);
        output
    })
}

#[must_use]
pub fn i64_to_bool_and_then(
    value: Option<i64>,
    callback: impl FnOnce(i64) -> Option<bool>,
) -> Option<bool> {
    value.and_then(|value| {
        let output = callback(value);
        output
    })
}

#[must_use]
pub fn i64_to_u64_map(
    value: Option<i64>,
    callback: impl FnOnce(i64) -> u64,
) -> Option<u64> {
    value.map(|value| {
        let output = callback(value);
        output
    })
}

#[must_use]
pub fn i64_to_u64_and_then(
    value: Option<i64>,
    callback: impl FnOnce(i64) -> Option<u64>,
) -> Option<u64> {
    value.and_then(|value| {
        let output = callback(value);
        output
    })
}

#[must_use]
pub fn i64_to_i64_map(
    value: Option<i64>,
    callback: impl FnOnce(i64) -> i64,
) -> Option<i64> {
    value.map(|value| {
        let output = callback(value);
        output
    })
}

#[must_use]
pub fn i64_to_i64_and_then(
    value: Option<i64>,
    callback: impl FnOnce(i64) -> Option<i64>,
) -> Option<i64> {
    value.and_then(|value| {
        let output = callback(value);
        output
    })
}

#[must_use]
pub fn i64_to_str_map<'output>(
    value: Option<i64>,
    callback: impl FnOnce(i64) -> &'output str,
) -> Option<&'output str> {
    value.map(|value| {
        let output = callback(value);
        checked_text(output);
        output
    })
}

#[must_use]
pub fn i64_to_str_and_then<'output>(
    value: Option<i64>,
    callback: impl FnOnce(i64) -> Option<&'output str>,
) -> Option<&'output str> {
    value.and_then(|value| {
        let output = callback(value);
        checked_option_text(output);
        output
    })
}

#[must_use]
pub fn i64_unwrap_or_else(
    value: Option<i64>,
    callback: impl FnOnce() -> i64,
) -> i64 {
    value.unwrap_or_else(callback)
}

#[must_use]
pub fn str_to_bool_map<'input>(
    value: Option<&'input str>,
    callback: impl FnOnce(&'input str) -> bool,
) -> Option<bool> {
    checked_option_text(value);
    value.map(|value| {
        let output = callback(value);
        output
    })
}

#[must_use]
pub fn str_to_bool_and_then<'input>(
    value: Option<&'input str>,
    callback: impl FnOnce(&'input str) -> Option<bool>,
) -> Option<bool> {
    checked_option_text(value);
    value.and_then(|value| {
        let output = callback(value);
        output
    })
}

#[must_use]
pub fn str_to_u64_map<'input>(
    value: Option<&'input str>,
    callback: impl FnOnce(&'input str) -> u64,
) -> Option<u64> {
    checked_option_text(value);
    value.map(|value| {
        let output = callback(value);
        output
    })
}

#[must_use]
pub fn str_to_u64_and_then<'input>(
    value: Option<&'input str>,
    callback: impl FnOnce(&'input str) -> Option<u64>,
) -> Option<u64> {
    checked_option_text(value);
    value.and_then(|value| {
        let output = callback(value);
        output
    })
}

#[must_use]
pub fn str_to_i64_map<'input>(
    value: Option<&'input str>,
    callback: impl FnOnce(&'input str) -> i64,
) -> Option<i64> {
    checked_option_text(value);
    value.map(|value| {
        let output = callback(value);
        output
    })
}

#[must_use]
pub fn str_to_i64_and_then<'input>(
    value: Option<&'input str>,
    callback: impl FnOnce(&'input str) -> Option<i64>,
) -> Option<i64> {
    checked_option_text(value);
    value.and_then(|value| {
        let output = callback(value);
        output
    })
}

#[must_use]
pub fn str_to_str_map<'input, 'output>(
    value: Option<&'input str>,
    callback: impl FnOnce(&'input str) -> &'output str,
) -> Option<&'output str> {
    checked_option_text(value);
    value.map(|value| {
        let output = callback(value);
        checked_text(output);
        output
    })
}

#[must_use]
pub fn str_to_str_and_then<'input, 'output>(
    value: Option<&'input str>,
    callback: impl FnOnce(&'input str) -> Option<&'output str>,
) -> Option<&'output str> {
    checked_option_text(value);
    value.and_then(|value| {
        let output = callback(value);
        checked_option_text(output);
        output
    })
}

#[must_use]
pub fn str_unwrap_or_else<'input, 'output>(
    value: Option<&'input str>,
    callback: impl FnOnce() -> &'output str,
) -> String {
    checked_option_text(value);
    match value {
        Some(value) => value.to_owned(),
        None => {
            let output = callback();
            checked_text(output);
            output.to_owned()
        }
    }
}

#[must_use]
pub fn bool_to_text_owned_map(
    value: Option<bool>,
    callback: impl FnOnce(bool) -> String,
) -> Option<String> {
    value.map(|value| {
        let output = callback(value);
        checked_text(&output);
        output
    })
}

#[must_use]
pub fn bool_to_text_owned_and_then(
    value: Option<bool>,
    callback: impl FnOnce(bool) -> Option<String>,
) -> Option<String> {
    value.and_then(|value| {
        let output = callback(value);
        checked_option_text(output.as_deref());
        output
    })
}

#[must_use]
pub fn u64_to_text_owned_map(
    value: Option<u64>,
    callback: impl FnOnce(u64) -> String,
) -> Option<String> {
    value.map(|value| {
        let output = callback(value);
        checked_text(&output);
        output
    })
}

#[must_use]
pub fn u64_to_text_owned_and_then(
    value: Option<u64>,
    callback: impl FnOnce(u64) -> Option<String>,
) -> Option<String> {
    value.and_then(|value| {
        let output = callback(value);
        checked_option_text(output.as_deref());
        output
    })
}

#[must_use]
pub fn i64_to_text_owned_map(
    value: Option<i64>,
    callback: impl FnOnce(i64) -> String,
) -> Option<String> {
    value.map(|value| {
        let output = callback(value);
        checked_text(&output);
        output
    })
}

#[must_use]
pub fn i64_to_text_owned_and_then(
    value: Option<i64>,
    callback: impl FnOnce(i64) -> Option<String>,
) -> Option<String> {
    value.and_then(|value| {
        let output = callback(value);
        checked_option_text(output.as_deref());
        output
    })
}

#[must_use]
pub fn str_to_text_owned_map<'input>(
    value: Option<&'input str>,
    callback: impl FnOnce(&'input str) -> String,
) -> Option<String> {
    checked_option_text(value);
    value.map(|value| {
        let output = callback(value);
        checked_text(&output);
        output
    })
}

#[must_use]
pub fn str_to_text_owned_and_then<'input>(
    value: Option<&'input str>,
    callback: impl FnOnce(&'input str) -> Option<String>,
) -> Option<String> {
    checked_option_text(value);
    value.and_then(|value| {
        let output = callback(value);
        checked_option_text(output.as_deref());
        output
    })
}

#[must_use]
pub fn text_owned_to_bool_map(
    value: Option<String>,
    callback: impl FnOnce(String) -> bool,
) -> Option<bool> {
    checked_option_text(value.as_deref());
    value.map(|value| {
        let output = callback(value);
        output
    })
}

#[must_use]
pub fn text_owned_to_bool_and_then(
    value: Option<String>,
    callback: impl FnOnce(String) -> Option<bool>,
) -> Option<bool> {
    checked_option_text(value.as_deref());
    value.and_then(|value| {
        let output = callback(value);
        output
    })
}

#[must_use]
pub fn text_owned_to_u64_map(
    value: Option<String>,
    callback: impl FnOnce(String) -> u64,
) -> Option<u64> {
    checked_option_text(value.as_deref());
    value.map(|value| {
        let output = callback(value);
        output
    })
}

#[must_use]
pub fn text_owned_to_u64_and_then(
    value: Option<String>,
    callback: impl FnOnce(String) -> Option<u64>,
) -> Option<u64> {
    checked_option_text(value.as_deref());
    value.and_then(|value| {
        let output = callback(value);
        output
    })
}

#[must_use]
pub fn text_owned_to_i64_map(
    value: Option<String>,
    callback: impl FnOnce(String) -> i64,
) -> Option<i64> {
    checked_option_text(value.as_deref());
    value.map(|value| {
        let output = callback(value);
        output
    })
}

#[must_use]
pub fn text_owned_to_i64_and_then(
    value: Option<String>,
    callback: impl FnOnce(String) -> Option<i64>,
) -> Option<i64> {
    checked_option_text(value.as_deref());
    value.and_then(|value| {
        let output = callback(value);
        output
    })
}

#[must_use]
pub fn text_owned_to_text_owned_map(
    value: Option<String>,
    callback: impl FnOnce(String) -> String,
) -> Option<String> {
    checked_option_text(value.as_deref());
    value.map(|value| {
        let output = callback(value);
        checked_text(&output);
        output
    })
}

#[must_use]
pub fn text_owned_to_text_owned_and_then(
    value: Option<String>,
    callback: impl FnOnce(String) -> Option<String>,
) -> Option<String> {
    checked_option_text(value.as_deref());
    value.and_then(|value| {
        let output = callback(value);
        checked_option_text(output.as_deref());
        output
    })
}

#[must_use]
pub fn text_owned_unwrap_or_else(
    value: Option<String>,
    callback: impl FnOnce() -> String,
) -> String {
    checked_option_text(value.as_deref());
    match value {
        Some(value) => value,
        None => {
            let output = callback();
            checked_text(&output);
            output
        }
    }
}

#[must_use]
pub fn text_owned_or_else(
    value: Option<String>,
    callback: impl FnOnce() -> Option<String>,
) -> Option<String> {
    checked_option_text(value.as_deref());
    value.or_else(|| {
        let output = callback();
        checked_option_text(output.as_deref());
        output
    })
}
