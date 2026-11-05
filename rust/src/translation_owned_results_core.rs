//! Explicit primitive Result interfaces. Standard internals intentionally stay native.
fn checked_text(value: &str) {
    let _ = crate::translation_text_core::len_utf8(value);
}
fn checked_result<T>(value: &Result<T, String>, check: impl FnOnce(&T)) {
    match value { Ok(value) => check(value), Err(error) => checked_text(error) }
}

#[must_use]
pub fn bool_ok(value: bool) -> Result<bool, String> {
    Ok(value)
}

#[must_use]
pub fn bool_err(value: &str) -> Result<bool, String> {
    checked_text(value);
    Err(value.to_owned())
}

#[must_use]
pub fn bool_is_ok(value: Result<bool, String>) -> bool {
    checked_result(&value, |_value| {  });
    value.is_ok()
}

#[must_use]
pub fn bool_is_err(value: Result<bool, String>) -> bool {
    checked_result(&value, |_value| {  });
    value.is_err()
}

#[must_use]
pub fn bool_unwrap_or(value: Result<bool, String>, other: bool) -> bool {
    checked_result(&value, |_value| {  });
    match value { Ok(value) => value, Err(_) => other }
}

#[must_use]
pub fn bool_unwrap(value: Result<bool, String>) -> bool {
    checked_result(&value, |_value| {  });
    match value { Ok(value) => value, Err(error) => panic!("{}", error) }
}

#[must_use]
pub fn bool_expect(value: Result<bool, String>, other: &str) -> bool {
    checked_result(&value, |_value| {  });
    checked_text(other);
    match value { Ok(value) => value, Err(_) => panic!("{}", other) }
}

#[must_use]
pub fn bool_ok_option(value: Result<bool, String>) -> Option<bool> {
    checked_result(&value, |_value| {  });
    value.ok()
}

#[must_use]
pub fn bool_err_option(value: Result<bool, String>) -> Option<String> {
    checked_result(&value, |_value| {  });
    value.err()
}

#[must_use]
pub fn bool_unwrap_err(value: Result<bool, String>) -> String {
    checked_result(&value, |_value| {  });
    match value { Err(error) => error, Ok(_) => panic!("{}", "primitive Result success") }
}

#[must_use]
pub fn bool_expect_err(value: Result<bool, String>, other: &str) -> String {
    checked_result(&value, |_value| {  });
    checked_text(other);
    match value { Err(error) => error, Ok(_) => panic!("{}", other) }
}

#[must_use]
pub fn bool_to_bool_map(value: Result<bool, String>, callback: impl FnOnce(bool) -> bool) -> Result<bool, String> {
    checked_result(&value, |_value| {  });
    match value { Ok(value) => { let output = callback(value);  Ok(output) }, Err(error) => Err(error) }
}

#[must_use]
pub fn bool_to_bool_and_then(value: Result<bool, String>, callback: impl FnOnce(bool) -> Result<bool, String>) -> Result<bool, String> {
    checked_result(&value, |_value| {  });
    match value { Ok(value) => { let output = callback(value); checked_result(&output, |_value| {  }); output }, Err(error) => Err(error) }
}

#[must_use]
pub fn bool_to_u64_map(value: Result<bool, String>, callback: impl FnOnce(bool) -> u64) -> Result<u64, String> {
    checked_result(&value, |_value| {  });
    match value { Ok(value) => { let output = callback(value);  Ok(output) }, Err(error) => Err(error) }
}

#[must_use]
pub fn bool_to_u64_and_then(value: Result<bool, String>, callback: impl FnOnce(bool) -> Result<u64, String>) -> Result<u64, String> {
    checked_result(&value, |_value| {  });
    match value { Ok(value) => { let output = callback(value); checked_result(&output, |_value| {  }); output }, Err(error) => Err(error) }
}

#[must_use]
pub fn bool_to_i64_map(value: Result<bool, String>, callback: impl FnOnce(bool) -> i64) -> Result<i64, String> {
    checked_result(&value, |_value| {  });
    match value { Ok(value) => { let output = callback(value);  Ok(output) }, Err(error) => Err(error) }
}

#[must_use]
pub fn bool_to_i64_and_then(value: Result<bool, String>, callback: impl FnOnce(bool) -> Result<i64, String>) -> Result<i64, String> {
    checked_result(&value, |_value| {  });
    match value { Ok(value) => { let output = callback(value); checked_result(&output, |_value| {  }); output }, Err(error) => Err(error) }
}

#[must_use]
pub fn bool_to_str_map<'output>(value: Result<bool, String>, callback: impl FnOnce(bool) -> &'output str) -> Result<&'output str, String> {
    checked_result(&value, |_value| {  });
    match value { Ok(value) => { let output = callback(value); checked_text(output); Ok(output) }, Err(error) => Err(error) }
}

#[must_use]
pub fn bool_to_str_and_then<'output>(value: Result<bool, String>, callback: impl FnOnce(bool) -> Result<&'output str, String>) -> Result<&'output str, String> {
    checked_result(&value, |_value| {  });
    match value { Ok(value) => { let output = callback(value); checked_result(&output, |value| { checked_text(value); }); output }, Err(error) => Err(error) }
}

#[must_use]
pub fn bool_map_err(value: Result<bool, String>, callback: impl FnOnce(String) -> String) -> Result<bool, String> {
    checked_result(&value, |_value| {  });
    match value { Ok(value) => Ok(value), Err(error) => { let output = callback(error); checked_text(&output); Err(output) } }
}

#[must_use]
pub fn bool_unwrap_or_else(value: Result<bool, String>, callback: impl FnOnce(String) -> bool) -> bool {
    checked_result(&value, |_value| {  });
    match value { Ok(value) => value, Err(error) => { let output = callback(error);  output } }
}

#[must_use]
pub fn bool_or_else(value: Result<bool, String>, callback: impl FnOnce(String) -> Result<bool, String>) -> Result<bool, String> {
    checked_result(&value, |_value| {  });
    match value { Ok(value) => Ok(value), Err(error) => { let output = callback(error); checked_result(&output, |_value| {  }); output } }
}

#[must_use]
pub fn u64_ok(value: u64) -> Result<u64, String> {
    Ok(value)
}

#[must_use]
pub fn u64_err(value: &str) -> Result<u64, String> {
    checked_text(value);
    Err(value.to_owned())
}

#[must_use]
pub fn u64_is_ok(value: Result<u64, String>) -> bool {
    checked_result(&value, |_value| {  });
    value.is_ok()
}

#[must_use]
pub fn u64_is_err(value: Result<u64, String>) -> bool {
    checked_result(&value, |_value| {  });
    value.is_err()
}

#[must_use]
pub fn u64_unwrap_or(value: Result<u64, String>, other: u64) -> u64 {
    checked_result(&value, |_value| {  });
    match value { Ok(value) => value, Err(_) => other }
}

#[must_use]
pub fn u64_unwrap(value: Result<u64, String>) -> u64 {
    checked_result(&value, |_value| {  });
    match value { Ok(value) => value, Err(error) => panic!("{}", error) }
}

#[must_use]
pub fn u64_expect(value: Result<u64, String>, other: &str) -> u64 {
    checked_result(&value, |_value| {  });
    checked_text(other);
    match value { Ok(value) => value, Err(_) => panic!("{}", other) }
}

#[must_use]
pub fn u64_ok_option(value: Result<u64, String>) -> Option<u64> {
    checked_result(&value, |_value| {  });
    value.ok()
}

#[must_use]
pub fn u64_err_option(value: Result<u64, String>) -> Option<String> {
    checked_result(&value, |_value| {  });
    value.err()
}

#[must_use]
pub fn u64_unwrap_err(value: Result<u64, String>) -> String {
    checked_result(&value, |_value| {  });
    match value { Err(error) => error, Ok(_) => panic!("{}", "primitive Result success") }
}

#[must_use]
pub fn u64_expect_err(value: Result<u64, String>, other: &str) -> String {
    checked_result(&value, |_value| {  });
    checked_text(other);
    match value { Err(error) => error, Ok(_) => panic!("{}", other) }
}

#[must_use]
pub fn u64_to_bool_map(value: Result<u64, String>, callback: impl FnOnce(u64) -> bool) -> Result<bool, String> {
    checked_result(&value, |_value| {  });
    match value { Ok(value) => { let output = callback(value);  Ok(output) }, Err(error) => Err(error) }
}

#[must_use]
pub fn u64_to_bool_and_then(value: Result<u64, String>, callback: impl FnOnce(u64) -> Result<bool, String>) -> Result<bool, String> {
    checked_result(&value, |_value| {  });
    match value { Ok(value) => { let output = callback(value); checked_result(&output, |_value| {  }); output }, Err(error) => Err(error) }
}

#[must_use]
pub fn u64_to_u64_map(value: Result<u64, String>, callback: impl FnOnce(u64) -> u64) -> Result<u64, String> {
    checked_result(&value, |_value| {  });
    match value { Ok(value) => { let output = callback(value);  Ok(output) }, Err(error) => Err(error) }
}

#[must_use]
pub fn u64_to_u64_and_then(value: Result<u64, String>, callback: impl FnOnce(u64) -> Result<u64, String>) -> Result<u64, String> {
    checked_result(&value, |_value| {  });
    match value { Ok(value) => { let output = callback(value); checked_result(&output, |_value| {  }); output }, Err(error) => Err(error) }
}

#[must_use]
pub fn u64_to_i64_map(value: Result<u64, String>, callback: impl FnOnce(u64) -> i64) -> Result<i64, String> {
    checked_result(&value, |_value| {  });
    match value { Ok(value) => { let output = callback(value);  Ok(output) }, Err(error) => Err(error) }
}

#[must_use]
pub fn u64_to_i64_and_then(value: Result<u64, String>, callback: impl FnOnce(u64) -> Result<i64, String>) -> Result<i64, String> {
    checked_result(&value, |_value| {  });
    match value { Ok(value) => { let output = callback(value); checked_result(&output, |_value| {  }); output }, Err(error) => Err(error) }
}

#[must_use]
pub fn u64_to_str_map<'output>(value: Result<u64, String>, callback: impl FnOnce(u64) -> &'output str) -> Result<&'output str, String> {
    checked_result(&value, |_value| {  });
    match value { Ok(value) => { let output = callback(value); checked_text(output); Ok(output) }, Err(error) => Err(error) }
}

#[must_use]
pub fn u64_to_str_and_then<'output>(value: Result<u64, String>, callback: impl FnOnce(u64) -> Result<&'output str, String>) -> Result<&'output str, String> {
    checked_result(&value, |_value| {  });
    match value { Ok(value) => { let output = callback(value); checked_result(&output, |value| { checked_text(value); }); output }, Err(error) => Err(error) }
}

#[must_use]
pub fn u64_map_err(value: Result<u64, String>, callback: impl FnOnce(String) -> String) -> Result<u64, String> {
    checked_result(&value, |_value| {  });
    match value { Ok(value) => Ok(value), Err(error) => { let output = callback(error); checked_text(&output); Err(output) } }
}

#[must_use]
pub fn u64_unwrap_or_else(value: Result<u64, String>, callback: impl FnOnce(String) -> u64) -> u64 {
    checked_result(&value, |_value| {  });
    match value { Ok(value) => value, Err(error) => { let output = callback(error);  output } }
}

#[must_use]
pub fn u64_or_else(value: Result<u64, String>, callback: impl FnOnce(String) -> Result<u64, String>) -> Result<u64, String> {
    checked_result(&value, |_value| {  });
    match value { Ok(value) => Ok(value), Err(error) => { let output = callback(error); checked_result(&output, |_value| {  }); output } }
}

#[must_use]
pub fn i64_ok(value: i64) -> Result<i64, String> {
    Ok(value)
}

#[must_use]
pub fn i64_err(value: &str) -> Result<i64, String> {
    checked_text(value);
    Err(value.to_owned())
}

#[must_use]
pub fn i64_is_ok(value: Result<i64, String>) -> bool {
    checked_result(&value, |_value| {  });
    value.is_ok()
}

#[must_use]
pub fn i64_is_err(value: Result<i64, String>) -> bool {
    checked_result(&value, |_value| {  });
    value.is_err()
}

#[must_use]
pub fn i64_unwrap_or(value: Result<i64, String>, other: i64) -> i64 {
    checked_result(&value, |_value| {  });
    match value { Ok(value) => value, Err(_) => other }
}

#[must_use]
pub fn i64_unwrap(value: Result<i64, String>) -> i64 {
    checked_result(&value, |_value| {  });
    match value { Ok(value) => value, Err(error) => panic!("{}", error) }
}

#[must_use]
pub fn i64_expect(value: Result<i64, String>, other: &str) -> i64 {
    checked_result(&value, |_value| {  });
    checked_text(other);
    match value { Ok(value) => value, Err(_) => panic!("{}", other) }
}

#[must_use]
pub fn i64_ok_option(value: Result<i64, String>) -> Option<i64> {
    checked_result(&value, |_value| {  });
    value.ok()
}

#[must_use]
pub fn i64_err_option(value: Result<i64, String>) -> Option<String> {
    checked_result(&value, |_value| {  });
    value.err()
}

#[must_use]
pub fn i64_unwrap_err(value: Result<i64, String>) -> String {
    checked_result(&value, |_value| {  });
    match value { Err(error) => error, Ok(_) => panic!("{}", "primitive Result success") }
}

#[must_use]
pub fn i64_expect_err(value: Result<i64, String>, other: &str) -> String {
    checked_result(&value, |_value| {  });
    checked_text(other);
    match value { Err(error) => error, Ok(_) => panic!("{}", other) }
}

#[must_use]
pub fn i64_to_bool_map(value: Result<i64, String>, callback: impl FnOnce(i64) -> bool) -> Result<bool, String> {
    checked_result(&value, |_value| {  });
    match value { Ok(value) => { let output = callback(value);  Ok(output) }, Err(error) => Err(error) }
}

#[must_use]
pub fn i64_to_bool_and_then(value: Result<i64, String>, callback: impl FnOnce(i64) -> Result<bool, String>) -> Result<bool, String> {
    checked_result(&value, |_value| {  });
    match value { Ok(value) => { let output = callback(value); checked_result(&output, |_value| {  }); output }, Err(error) => Err(error) }
}

#[must_use]
pub fn i64_to_u64_map(value: Result<i64, String>, callback: impl FnOnce(i64) -> u64) -> Result<u64, String> {
    checked_result(&value, |_value| {  });
    match value { Ok(value) => { let output = callback(value);  Ok(output) }, Err(error) => Err(error) }
}

#[must_use]
pub fn i64_to_u64_and_then(value: Result<i64, String>, callback: impl FnOnce(i64) -> Result<u64, String>) -> Result<u64, String> {
    checked_result(&value, |_value| {  });
    match value { Ok(value) => { let output = callback(value); checked_result(&output, |_value| {  }); output }, Err(error) => Err(error) }
}

#[must_use]
pub fn i64_to_i64_map(value: Result<i64, String>, callback: impl FnOnce(i64) -> i64) -> Result<i64, String> {
    checked_result(&value, |_value| {  });
    match value { Ok(value) => { let output = callback(value);  Ok(output) }, Err(error) => Err(error) }
}

#[must_use]
pub fn i64_to_i64_and_then(value: Result<i64, String>, callback: impl FnOnce(i64) -> Result<i64, String>) -> Result<i64, String> {
    checked_result(&value, |_value| {  });
    match value { Ok(value) => { let output = callback(value); checked_result(&output, |_value| {  }); output }, Err(error) => Err(error) }
}

#[must_use]
pub fn i64_to_str_map<'output>(value: Result<i64, String>, callback: impl FnOnce(i64) -> &'output str) -> Result<&'output str, String> {
    checked_result(&value, |_value| {  });
    match value { Ok(value) => { let output = callback(value); checked_text(output); Ok(output) }, Err(error) => Err(error) }
}

#[must_use]
pub fn i64_to_str_and_then<'output>(value: Result<i64, String>, callback: impl FnOnce(i64) -> Result<&'output str, String>) -> Result<&'output str, String> {
    checked_result(&value, |_value| {  });
    match value { Ok(value) => { let output = callback(value); checked_result(&output, |value| { checked_text(value); }); output }, Err(error) => Err(error) }
}

#[must_use]
pub fn i64_map_err(value: Result<i64, String>, callback: impl FnOnce(String) -> String) -> Result<i64, String> {
    checked_result(&value, |_value| {  });
    match value { Ok(value) => Ok(value), Err(error) => { let output = callback(error); checked_text(&output); Err(output) } }
}

#[must_use]
pub fn i64_unwrap_or_else(value: Result<i64, String>, callback: impl FnOnce(String) -> i64) -> i64 {
    checked_result(&value, |_value| {  });
    match value { Ok(value) => value, Err(error) => { let output = callback(error);  output } }
}

#[must_use]
pub fn i64_or_else(value: Result<i64, String>, callback: impl FnOnce(String) -> Result<i64, String>) -> Result<i64, String> {
    checked_result(&value, |_value| {  });
    match value { Ok(value) => Ok(value), Err(error) => { let output = callback(error); checked_result(&output, |_value| {  }); output } }
}

#[must_use]
pub fn str_ok<'input>(value: &'input str) -> Result<&'input str, String> {
    checked_text(value);
    Ok(value)
}

#[must_use]
pub fn str_err(value: &str) -> Result<&'static str, String> {
    checked_text(value);
    Err(value.to_owned())
}

#[must_use]
pub fn str_is_ok<'input>(value: Result<&'input str, String>) -> bool {
    checked_result(&value, |value| { checked_text(value); });
    value.is_ok()
}

#[must_use]
pub fn str_is_err<'input>(value: Result<&'input str, String>) -> bool {
    checked_result(&value, |value| { checked_text(value); });
    value.is_err()
}

#[must_use]
pub fn str_unwrap_or<'input>(value: Result<&'input str, String>, other: &str) -> String {
    checked_result(&value, |value| { checked_text(value); });
    checked_text(other);
    match value { Ok(value) => value.to_owned(), Err(_) => other.to_owned() }
}

#[must_use]
pub fn str_unwrap<'input>(value: Result<&'input str, String>) -> String {
    checked_result(&value, |value| { checked_text(value); });
    match value { Ok(value) => value.to_owned(), Err(error) => panic!("{}", error) }
}

#[must_use]
pub fn str_expect<'input>(value: Result<&'input str, String>, other: &str) -> String {
    checked_result(&value, |value| { checked_text(value); });
    checked_text(other);
    match value { Ok(value) => value.to_owned(), Err(_) => panic!("{}", other) }
}

#[must_use]
pub fn str_ok_option<'input>(value: Result<&'input str, String>) -> Option<&'input str> {
    checked_result(&value, |value| { checked_text(value); });
    value.ok()
}

#[must_use]
pub fn str_err_option<'input>(value: Result<&'input str, String>) -> Option<String> {
    checked_result(&value, |value| { checked_text(value); });
    value.err()
}

#[must_use]
pub fn str_unwrap_err<'input>(value: Result<&'input str, String>) -> String {
    checked_result(&value, |value| { checked_text(value); });
    match value { Err(error) => error, Ok(_) => panic!("{}", "primitive Result success") }
}

#[must_use]
pub fn str_expect_err<'input>(value: Result<&'input str, String>, other: &str) -> String {
    checked_result(&value, |value| { checked_text(value); });
    checked_text(other);
    match value { Err(error) => error, Ok(_) => panic!("{}", other) }
}

#[must_use]
pub fn str_to_bool_map<'input>(value: Result<&'input str, String>, callback: impl FnOnce(&'input str) -> bool) -> Result<bool, String> {
    checked_result(&value, |value| { checked_text(value); });
    match value { Ok(value) => { let output = callback(value);  Ok(output) }, Err(error) => Err(error) }
}

#[must_use]
pub fn str_to_bool_and_then<'input>(value: Result<&'input str, String>, callback: impl FnOnce(&'input str) -> Result<bool, String>) -> Result<bool, String> {
    checked_result(&value, |value| { checked_text(value); });
    match value { Ok(value) => { let output = callback(value); checked_result(&output, |_value| {  }); output }, Err(error) => Err(error) }
}

#[must_use]
pub fn str_to_u64_map<'input>(value: Result<&'input str, String>, callback: impl FnOnce(&'input str) -> u64) -> Result<u64, String> {
    checked_result(&value, |value| { checked_text(value); });
    match value { Ok(value) => { let output = callback(value);  Ok(output) }, Err(error) => Err(error) }
}

#[must_use]
pub fn str_to_u64_and_then<'input>(value: Result<&'input str, String>, callback: impl FnOnce(&'input str) -> Result<u64, String>) -> Result<u64, String> {
    checked_result(&value, |value| { checked_text(value); });
    match value { Ok(value) => { let output = callback(value); checked_result(&output, |_value| {  }); output }, Err(error) => Err(error) }
}

#[must_use]
pub fn str_to_i64_map<'input>(value: Result<&'input str, String>, callback: impl FnOnce(&'input str) -> i64) -> Result<i64, String> {
    checked_result(&value, |value| { checked_text(value); });
    match value { Ok(value) => { let output = callback(value);  Ok(output) }, Err(error) => Err(error) }
}

#[must_use]
pub fn str_to_i64_and_then<'input>(value: Result<&'input str, String>, callback: impl FnOnce(&'input str) -> Result<i64, String>) -> Result<i64, String> {
    checked_result(&value, |value| { checked_text(value); });
    match value { Ok(value) => { let output = callback(value); checked_result(&output, |_value| {  }); output }, Err(error) => Err(error) }
}

#[must_use]
pub fn str_to_str_map<'input, 'output>(value: Result<&'input str, String>, callback: impl FnOnce(&'input str) -> &'output str) -> Result<&'output str, String> {
    checked_result(&value, |value| { checked_text(value); });
    match value { Ok(value) => { let output = callback(value); checked_text(output); Ok(output) }, Err(error) => Err(error) }
}

#[must_use]
pub fn str_to_str_and_then<'input, 'output>(value: Result<&'input str, String>, callback: impl FnOnce(&'input str) -> Result<&'output str, String>) -> Result<&'output str, String> {
    checked_result(&value, |value| { checked_text(value); });
    match value { Ok(value) => { let output = callback(value); checked_result(&output, |value| { checked_text(value); }); output }, Err(error) => Err(error) }
}

#[must_use]
pub fn str_map_err<'input>(value: Result<&'input str, String>, callback: impl FnOnce(String) -> String) -> Result<&'input str, String> {
    checked_result(&value, |value| { checked_text(value); });
    match value { Ok(value) => Ok(value), Err(error) => { let output = callback(error); checked_text(&output); Err(output) } }
}

#[must_use]
pub fn str_unwrap_or_else<'input, 'fallback>(value: Result<&'input str, String>, callback: impl FnOnce(String) -> &'fallback str) -> String {
    checked_result(&value, |value| { checked_text(value); });
    match value { Ok(value) => value.to_owned(), Err(error) => { let output = callback(error); checked_text(output); output.to_owned() } }
}

#[must_use]
pub fn str_or_else<'input>(value: Result<&'input str, String>, callback: impl FnOnce(String) -> Result<&'input str, String>) -> Result<&'input str, String> {
    checked_result(&value, |value| { checked_text(value); });
    match value { Ok(value) => Ok(value), Err(error) => { let output = callback(error); checked_result(&output, |value| { checked_text(value); }); output } }
}

#[must_use]
pub fn bool_to_text_map(value: Result<bool, String>, callback: impl FnOnce(bool) -> String) -> Result<String, String> {
    checked_result(&value, |_value| {  });
    match value { Ok(value) => { let output = callback(value); checked_text(&output); Ok(output) }, Err(error) => Err(error) }
}

#[must_use]
pub fn bool_to_text_and_then(value: Result<bool, String>, callback: impl FnOnce(bool) -> Result<String, String>) -> Result<String, String> {
    checked_result(&value, |_value| {  });
    match value { Ok(value) => { let output = callback(value); checked_result(&output, |value| { checked_text(&value); }); output }, Err(error) => Err(error) }
}

#[must_use]
pub fn u64_to_text_map(value: Result<u64, String>, callback: impl FnOnce(u64) -> String) -> Result<String, String> {
    checked_result(&value, |_value| {  });
    match value { Ok(value) => { let output = callback(value); checked_text(&output); Ok(output) }, Err(error) => Err(error) }
}

#[must_use]
pub fn u64_to_text_and_then(value: Result<u64, String>, callback: impl FnOnce(u64) -> Result<String, String>) -> Result<String, String> {
    checked_result(&value, |_value| {  });
    match value { Ok(value) => { let output = callback(value); checked_result(&output, |value| { checked_text(&value); }); output }, Err(error) => Err(error) }
}

#[must_use]
pub fn i64_to_text_map(value: Result<i64, String>, callback: impl FnOnce(i64) -> String) -> Result<String, String> {
    checked_result(&value, |_value| {  });
    match value { Ok(value) => { let output = callback(value); checked_text(&output); Ok(output) }, Err(error) => Err(error) }
}

#[must_use]
pub fn i64_to_text_and_then(value: Result<i64, String>, callback: impl FnOnce(i64) -> Result<String, String>) -> Result<String, String> {
    checked_result(&value, |_value| {  });
    match value { Ok(value) => { let output = callback(value); checked_result(&output, |value| { checked_text(&value); }); output }, Err(error) => Err(error) }
}

#[must_use]
pub fn str_to_text_map<'input>(value: Result<&'input str, String>, callback: impl FnOnce(&'input str) -> String) -> Result<String, String> {
    checked_result(&value, |value| { checked_text(value); });
    match value { Ok(value) => { let output = callback(value); checked_text(&output); Ok(output) }, Err(error) => Err(error) }
}

#[must_use]
pub fn str_to_text_and_then<'input>(value: Result<&'input str, String>, callback: impl FnOnce(&'input str) -> Result<String, String>) -> Result<String, String> {
    checked_result(&value, |value| { checked_text(value); });
    match value { Ok(value) => { let output = callback(value); checked_result(&output, |value| { checked_text(&value); }); output }, Err(error) => Err(error) }
}

#[must_use]
pub fn text_ok(value: String) -> Result<String, String> {
    checked_text(&value);
    Ok(value)
}

#[must_use]
pub fn text_err(value: &str) -> Result<String, String> {
    checked_text(value);
    Err(value.to_owned())
}

#[must_use]
pub fn text_is_ok(value: Result<String, String>) -> bool {
    checked_result(&value, |value| { checked_text(&value); });
    value.is_ok()
}

#[must_use]
pub fn text_is_err(value: Result<String, String>) -> bool {
    checked_result(&value, |value| { checked_text(&value); });
    value.is_err()
}

#[must_use]
pub fn text_unwrap_or(value: Result<String, String>, other: String) -> String {
    checked_result(&value, |value| { checked_text(&value); });
    checked_text(&other);
    match value { Ok(value) => value, Err(_) => other }
}

#[must_use]
pub fn text_unwrap(value: Result<String, String>) -> String {
    checked_result(&value, |value| { checked_text(&value); });
    match value { Ok(value) => value, Err(error) => panic!("{}", error) }
}

#[must_use]
pub fn text_expect(value: Result<String, String>, other: &str) -> String {
    checked_result(&value, |value| { checked_text(&value); });
    checked_text(other);
    match value { Ok(value) => value, Err(_) => panic!("{}", other) }
}

#[must_use]
pub fn text_ok_option(value: Result<String, String>) -> Option<String> {
    checked_result(&value, |value| { checked_text(&value); });
    value.ok()
}

#[must_use]
pub fn text_err_option(value: Result<String, String>) -> Option<String> {
    checked_result(&value, |value| { checked_text(&value); });
    value.err()
}

#[must_use]
pub fn text_unwrap_err(value: Result<String, String>) -> String {
    checked_result(&value, |value| { checked_text(&value); });
    match value { Err(error) => error, Ok(_) => panic!("{}", "primitive Result success") }
}

#[must_use]
pub fn text_expect_err(value: Result<String, String>, other: &str) -> String {
    checked_result(&value, |value| { checked_text(&value); });
    checked_text(other);
    match value { Err(error) => error, Ok(_) => panic!("{}", other) }
}

#[must_use]
pub fn text_to_bool_map(value: Result<String, String>, callback: impl FnOnce(String) -> bool) -> Result<bool, String> {
    checked_result(&value, |value| { checked_text(&value); });
    match value { Ok(value) => { let output = callback(value);  Ok(output) }, Err(error) => Err(error) }
}

#[must_use]
pub fn text_to_bool_and_then(value: Result<String, String>, callback: impl FnOnce(String) -> Result<bool, String>) -> Result<bool, String> {
    checked_result(&value, |value| { checked_text(&value); });
    match value { Ok(value) => { let output = callback(value); checked_result(&output, |_value| {  }); output }, Err(error) => Err(error) }
}

#[must_use]
pub fn text_to_u64_map(value: Result<String, String>, callback: impl FnOnce(String) -> u64) -> Result<u64, String> {
    checked_result(&value, |value| { checked_text(&value); });
    match value { Ok(value) => { let output = callback(value);  Ok(output) }, Err(error) => Err(error) }
}

#[must_use]
pub fn text_to_u64_and_then(value: Result<String, String>, callback: impl FnOnce(String) -> Result<u64, String>) -> Result<u64, String> {
    checked_result(&value, |value| { checked_text(&value); });
    match value { Ok(value) => { let output = callback(value); checked_result(&output, |_value| {  }); output }, Err(error) => Err(error) }
}

#[must_use]
pub fn text_to_i64_map(value: Result<String, String>, callback: impl FnOnce(String) -> i64) -> Result<i64, String> {
    checked_result(&value, |value| { checked_text(&value); });
    match value { Ok(value) => { let output = callback(value);  Ok(output) }, Err(error) => Err(error) }
}

#[must_use]
pub fn text_to_i64_and_then(value: Result<String, String>, callback: impl FnOnce(String) -> Result<i64, String>) -> Result<i64, String> {
    checked_result(&value, |value| { checked_text(&value); });
    match value { Ok(value) => { let output = callback(value); checked_result(&output, |_value| {  }); output }, Err(error) => Err(error) }
}

#[must_use]
pub fn text_to_str_map<'output>(value: Result<String, String>, callback: impl FnOnce(String) -> &'output str) -> Result<&'output str, String> {
    checked_result(&value, |value| { checked_text(&value); });
    match value { Ok(value) => { let output = callback(value); checked_text(output); Ok(output) }, Err(error) => Err(error) }
}

#[must_use]
pub fn text_to_str_and_then<'output>(value: Result<String, String>, callback: impl FnOnce(String) -> Result<&'output str, String>) -> Result<&'output str, String> {
    checked_result(&value, |value| { checked_text(&value); });
    match value { Ok(value) => { let output = callback(value); checked_result(&output, |value| { checked_text(value); }); output }, Err(error) => Err(error) }
}

#[must_use]
pub fn text_to_text_map(value: Result<String, String>, callback: impl FnOnce(String) -> String) -> Result<String, String> {
    checked_result(&value, |value| { checked_text(&value); });
    match value { Ok(value) => { let output = callback(value); checked_text(&output); Ok(output) }, Err(error) => Err(error) }
}

#[must_use]
pub fn text_to_text_and_then(value: Result<String, String>, callback: impl FnOnce(String) -> Result<String, String>) -> Result<String, String> {
    checked_result(&value, |value| { checked_text(&value); });
    match value { Ok(value) => { let output = callback(value); checked_result(&output, |value| { checked_text(&value); }); output }, Err(error) => Err(error) }
}

#[must_use]
pub fn text_map_err(value: Result<String, String>, callback: impl FnOnce(String) -> String) -> Result<String, String> {
    checked_result(&value, |value| { checked_text(&value); });
    match value { Ok(value) => Ok(value), Err(error) => { let output = callback(error); checked_text(&output); Err(output) } }
}

#[must_use]
pub fn text_unwrap_or_else(value: Result<String, String>, callback: impl FnOnce(String) -> String) -> String {
    checked_result(&value, |value| { checked_text(&value); });
    match value { Ok(value) => value, Err(error) => { let output = callback(error); checked_text(&output); output } }
}

#[must_use]
pub fn text_or_else(value: Result<String, String>, callback: impl FnOnce(String) -> Result<String, String>) -> Result<String, String> {
    checked_result(&value, |value| { checked_text(&value); });
    match value { Ok(value) => Ok(value), Err(error) => { let output = callback(error); checked_result(&output, |value| { checked_text(&value); }); output } }
}

/// Preserve a complete generic String-error Result without observing its payload.
pub fn text_result_identity<T>(value: Result<T, String>) -> Result<T, String> {
    value
}
