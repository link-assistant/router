//! Part of the generated `translation_owned_results_core` carrier, split out to keep each file
//! under the 1,000-line limit; the parent re-exports every item unchanged.
#![allow(clippy::wildcard_imports)]
use super::*;

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
    checked_result(&value, |_value| {});
    value.is_ok()
}

#[must_use]
pub fn i64_is_err(value: Result<i64, String>) -> bool {
    checked_result(&value, |_value| {});
    value.is_err()
}

#[must_use]
pub fn i64_unwrap_or(value: Result<i64, String>, other: i64) -> i64 {
    checked_result(&value, |_value| {});
    match value {
        Ok(value) => value,
        Err(_) => other,
    }
}

#[must_use]
pub fn i64_unwrap(value: Result<i64, String>) -> i64 {
    checked_result(&value, |_value| {});
    match value {
        Ok(value) => value,
        Err(error) => panic!("{}", error),
    }
}

#[must_use]
pub fn i64_expect(value: Result<i64, String>, other: &str) -> i64 {
    checked_result(&value, |_value| {});
    checked_text(other);
    match value {
        Ok(value) => value,
        Err(_) => panic!("{}", other),
    }
}

#[must_use]
pub fn i64_ok_option(value: Result<i64, String>) -> Option<i64> {
    checked_result(&value, |_value| {});
    value.ok()
}

#[must_use]
pub fn i64_err_option(value: Result<i64, String>) -> Option<String> {
    checked_result(&value, |_value| {});
    value.err()
}

#[must_use]
pub fn i64_unwrap_err(value: Result<i64, String>) -> String {
    checked_result(&value, |_value| {});
    match value {
        Err(error) => error,
        Ok(_) => panic!("{}", "primitive Result success"),
    }
}

#[must_use]
pub fn i64_expect_err(value: Result<i64, String>, other: &str) -> String {
    checked_result(&value, |_value| {});
    checked_text(other);
    match value {
        Err(error) => error,
        Ok(_) => panic!("{}", other),
    }
}

#[must_use]
pub fn i64_to_bool_map(
    value: Result<i64, String>,
    callback: impl FnOnce(i64) -> bool,
) -> Result<bool, String> {
    checked_result(&value, |_value| {});
    match value {
        Ok(value) => {
            let output = callback(value);
            Ok(output)
        }
        Err(error) => Err(error),
    }
}

#[must_use]
pub fn i64_to_bool_and_then(
    value: Result<i64, String>,
    callback: impl FnOnce(i64) -> Result<bool, String>,
) -> Result<bool, String> {
    checked_result(&value, |_value| {});
    match value {
        Ok(value) => {
            let output = callback(value);
            checked_result(&output, |_value| {});
            output
        }
        Err(error) => Err(error),
    }
}

#[must_use]
pub fn i64_to_u64_map(
    value: Result<i64, String>,
    callback: impl FnOnce(i64) -> u64,
) -> Result<u64, String> {
    checked_result(&value, |_value| {});
    match value {
        Ok(value) => {
            let output = callback(value);
            Ok(output)
        }
        Err(error) => Err(error),
    }
}

#[must_use]
pub fn i64_to_u64_and_then(
    value: Result<i64, String>,
    callback: impl FnOnce(i64) -> Result<u64, String>,
) -> Result<u64, String> {
    checked_result(&value, |_value| {});
    match value {
        Ok(value) => {
            let output = callback(value);
            checked_result(&output, |_value| {});
            output
        }
        Err(error) => Err(error),
    }
}

#[must_use]
pub fn i64_to_i64_map(
    value: Result<i64, String>,
    callback: impl FnOnce(i64) -> i64,
) -> Result<i64, String> {
    checked_result(&value, |_value| {});
    match value {
        Ok(value) => {
            let output = callback(value);
            Ok(output)
        }
        Err(error) => Err(error),
    }
}

#[must_use]
pub fn i64_to_i64_and_then(
    value: Result<i64, String>,
    callback: impl FnOnce(i64) -> Result<i64, String>,
) -> Result<i64, String> {
    checked_result(&value, |_value| {});
    match value {
        Ok(value) => {
            let output = callback(value);
            checked_result(&output, |_value| {});
            output
        }
        Err(error) => Err(error),
    }
}

#[must_use]
pub fn i64_to_str_map<'output>(
    value: Result<i64, String>,
    callback: impl FnOnce(i64) -> &'output str,
) -> Result<&'output str, String> {
    checked_result(&value, |_value| {});
    match value {
        Ok(value) => {
            let output = callback(value);
            checked_text(output);
            Ok(output)
        }
        Err(error) => Err(error),
    }
}

#[must_use]
pub fn i64_to_str_and_then<'output>(
    value: Result<i64, String>,
    callback: impl FnOnce(i64) -> Result<&'output str, String>,
) -> Result<&'output str, String> {
    checked_result(&value, |_value| {});
    match value {
        Ok(value) => {
            let output = callback(value);
            checked_result(&output, |value| {
                checked_text(value);
            });
            output
        }
        Err(error) => Err(error),
    }
}

#[must_use]
pub fn i64_map_err(
    value: Result<i64, String>,
    callback: impl FnOnce(String) -> String,
) -> Result<i64, String> {
    checked_result(&value, |_value| {});
    match value {
        Ok(value) => Ok(value),
        Err(error) => {
            let output = callback(error);
            checked_text(&output);
            Err(output)
        }
    }
}

#[must_use]
pub fn i64_unwrap_or_else(value: Result<i64, String>, callback: impl FnOnce(String) -> i64) -> i64 {
    checked_result(&value, |_value| {});
    match value {
        Ok(value) => value,
        Err(error) => {
            let output = callback(error);
            output
        }
    }
}

#[must_use]
pub fn i64_or_else(
    value: Result<i64, String>,
    callback: impl FnOnce(String) -> Result<i64, String>,
) -> Result<i64, String> {
    checked_result(&value, |_value| {});
    match value {
        Ok(value) => Ok(value),
        Err(error) => {
            let output = callback(error);
            checked_result(&output, |_value| {});
            output
        }
    }
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
    checked_result(&value, |value| {
        checked_text(value);
    });
    value.is_ok()
}

#[must_use]
pub fn str_is_err<'input>(value: Result<&'input str, String>) -> bool {
    checked_result(&value, |value| {
        checked_text(value);
    });
    value.is_err()
}

#[must_use]
pub fn str_unwrap_or<'input>(value: Result<&'input str, String>, other: &str) -> String {
    checked_result(&value, |value| {
        checked_text(value);
    });
    checked_text(other);
    match value {
        Ok(value) => value.to_owned(),
        Err(_) => other.to_owned(),
    }
}

#[must_use]
pub fn str_unwrap<'input>(value: Result<&'input str, String>) -> String {
    checked_result(&value, |value| {
        checked_text(value);
    });
    match value {
        Ok(value) => value.to_owned(),
        Err(error) => panic!("{}", error),
    }
}

#[must_use]
pub fn str_expect<'input>(value: Result<&'input str, String>, other: &str) -> String {
    checked_result(&value, |value| {
        checked_text(value);
    });
    checked_text(other);
    match value {
        Ok(value) => value.to_owned(),
        Err(_) => panic!("{}", other),
    }
}

#[must_use]
pub fn str_ok_option<'input>(value: Result<&'input str, String>) -> Option<&'input str> {
    checked_result(&value, |value| {
        checked_text(value);
    });
    value.ok()
}

#[must_use]
pub fn str_err_option<'input>(value: Result<&'input str, String>) -> Option<String> {
    checked_result(&value, |value| {
        checked_text(value);
    });
    value.err()
}

#[must_use]
pub fn str_unwrap_err<'input>(value: Result<&'input str, String>) -> String {
    checked_result(&value, |value| {
        checked_text(value);
    });
    match value {
        Err(error) => error,
        Ok(_) => panic!("{}", "primitive Result success"),
    }
}

#[must_use]
pub fn str_expect_err<'input>(value: Result<&'input str, String>, other: &str) -> String {
    checked_result(&value, |value| {
        checked_text(value);
    });
    checked_text(other);
    match value {
        Err(error) => error,
        Ok(_) => panic!("{}", other),
    }
}

#[must_use]
pub fn str_to_bool_map<'input>(
    value: Result<&'input str, String>,
    callback: impl FnOnce(&'input str) -> bool,
) -> Result<bool, String> {
    checked_result(&value, |value| {
        checked_text(value);
    });
    match value {
        Ok(value) => {
            let output = callback(value);
            Ok(output)
        }
        Err(error) => Err(error),
    }
}

#[must_use]
pub fn str_to_bool_and_then<'input>(
    value: Result<&'input str, String>,
    callback: impl FnOnce(&'input str) -> Result<bool, String>,
) -> Result<bool, String> {
    checked_result(&value, |value| {
        checked_text(value);
    });
    match value {
        Ok(value) => {
            let output = callback(value);
            checked_result(&output, |_value| {});
            output
        }
        Err(error) => Err(error),
    }
}

#[must_use]
pub fn str_to_u64_map<'input>(
    value: Result<&'input str, String>,
    callback: impl FnOnce(&'input str) -> u64,
) -> Result<u64, String> {
    checked_result(&value, |value| {
        checked_text(value);
    });
    match value {
        Ok(value) => {
            let output = callback(value);
            Ok(output)
        }
        Err(error) => Err(error),
    }
}

#[must_use]
pub fn str_to_u64_and_then<'input>(
    value: Result<&'input str, String>,
    callback: impl FnOnce(&'input str) -> Result<u64, String>,
) -> Result<u64, String> {
    checked_result(&value, |value| {
        checked_text(value);
    });
    match value {
        Ok(value) => {
            let output = callback(value);
            checked_result(&output, |_value| {});
            output
        }
        Err(error) => Err(error),
    }
}

#[must_use]
pub fn str_to_i64_map<'input>(
    value: Result<&'input str, String>,
    callback: impl FnOnce(&'input str) -> i64,
) -> Result<i64, String> {
    checked_result(&value, |value| {
        checked_text(value);
    });
    match value {
        Ok(value) => {
            let output = callback(value);
            Ok(output)
        }
        Err(error) => Err(error),
    }
}

#[must_use]
pub fn str_to_i64_and_then<'input>(
    value: Result<&'input str, String>,
    callback: impl FnOnce(&'input str) -> Result<i64, String>,
) -> Result<i64, String> {
    checked_result(&value, |value| {
        checked_text(value);
    });
    match value {
        Ok(value) => {
            let output = callback(value);
            checked_result(&output, |_value| {});
            output
        }
        Err(error) => Err(error),
    }
}

#[must_use]
pub fn str_to_str_map<'input, 'output>(
    value: Result<&'input str, String>,
    callback: impl FnOnce(&'input str) -> &'output str,
) -> Result<&'output str, String> {
    checked_result(&value, |value| {
        checked_text(value);
    });
    match value {
        Ok(value) => {
            let output = callback(value);
            checked_text(output);
            Ok(output)
        }
        Err(error) => Err(error),
    }
}

#[must_use]
pub fn str_to_str_and_then<'input, 'output>(
    value: Result<&'input str, String>,
    callback: impl FnOnce(&'input str) -> Result<&'output str, String>,
) -> Result<&'output str, String> {
    checked_result(&value, |value| {
        checked_text(value);
    });
    match value {
        Ok(value) => {
            let output = callback(value);
            checked_result(&output, |value| {
                checked_text(value);
            });
            output
        }
        Err(error) => Err(error),
    }
}

#[must_use]
pub fn str_map_err<'input>(
    value: Result<&'input str, String>,
    callback: impl FnOnce(String) -> String,
) -> Result<&'input str, String> {
    checked_result(&value, |value| {
        checked_text(value);
    });
    match value {
        Ok(value) => Ok(value),
        Err(error) => {
            let output = callback(error);
            checked_text(&output);
            Err(output)
        }
    }
}

#[must_use]
pub fn str_unwrap_or_else<'input, 'fallback>(
    value: Result<&'input str, String>,
    callback: impl FnOnce(String) -> &'fallback str,
) -> String {
    checked_result(&value, |value| {
        checked_text(value);
    });
    match value {
        Ok(value) => value.to_owned(),
        Err(error) => {
            let output = callback(error);
            checked_text(output);
            output.to_owned()
        }
    }
}

#[must_use]
pub fn str_or_else<'input>(
    value: Result<&'input str, String>,
    callback: impl FnOnce(String) -> Result<&'input str, String>,
) -> Result<&'input str, String> {
    checked_result(&value, |value| {
        checked_text(value);
    });
    match value {
        Ok(value) => Ok(value),
        Err(error) => {
            let output = callback(error);
            checked_result(&output, |value| {
                checked_text(value);
            });
            output
        }
    }
}
