//! Part of the generated `translation_owned_results_core` carrier, split out to keep each file
//! under the 1,000-line limit; the parent re-exports every item unchanged.
#![allow(clippy::wildcard_imports)]
use super::*;

#[must_use]
pub fn bool_to_text_map(
    value: Result<bool, String>,
    callback: impl FnOnce(bool) -> String,
) -> Result<String, String> {
    checked_result(&value, |_value| {});
    match value {
        Ok(value) => {
            let output = callback(value);
            checked_text(&output);
            Ok(output)
        }
        Err(error) => Err(error),
    }
}

#[must_use]
pub fn bool_to_text_and_then(
    value: Result<bool, String>,
    callback: impl FnOnce(bool) -> Result<String, String>,
) -> Result<String, String> {
    checked_result(&value, |_value| {});
    match value {
        Ok(value) => {
            let output = callback(value);
            checked_result(&output, |value| {
                checked_text(&value);
            });
            output
        }
        Err(error) => Err(error),
    }
}

#[must_use]
pub fn u64_to_text_map(
    value: Result<u64, String>,
    callback: impl FnOnce(u64) -> String,
) -> Result<String, String> {
    checked_result(&value, |_value| {});
    match value {
        Ok(value) => {
            let output = callback(value);
            checked_text(&output);
            Ok(output)
        }
        Err(error) => Err(error),
    }
}

#[must_use]
pub fn u64_to_text_and_then(
    value: Result<u64, String>,
    callback: impl FnOnce(u64) -> Result<String, String>,
) -> Result<String, String> {
    checked_result(&value, |_value| {});
    match value {
        Ok(value) => {
            let output = callback(value);
            checked_result(&output, |value| {
                checked_text(&value);
            });
            output
        }
        Err(error) => Err(error),
    }
}

#[must_use]
pub fn i64_to_text_map(
    value: Result<i64, String>,
    callback: impl FnOnce(i64) -> String,
) -> Result<String, String> {
    checked_result(&value, |_value| {});
    match value {
        Ok(value) => {
            let output = callback(value);
            checked_text(&output);
            Ok(output)
        }
        Err(error) => Err(error),
    }
}

#[must_use]
pub fn i64_to_text_and_then(
    value: Result<i64, String>,
    callback: impl FnOnce(i64) -> Result<String, String>,
) -> Result<String, String> {
    checked_result(&value, |_value| {});
    match value {
        Ok(value) => {
            let output = callback(value);
            checked_result(&output, |value| {
                checked_text(&value);
            });
            output
        }
        Err(error) => Err(error),
    }
}

#[must_use]
pub fn str_to_text_map<'input>(
    value: Result<&'input str, String>,
    callback: impl FnOnce(&'input str) -> String,
) -> Result<String, String> {
    checked_result(&value, |value| {
        checked_text(value);
    });
    match value {
        Ok(value) => {
            let output = callback(value);
            checked_text(&output);
            Ok(output)
        }
        Err(error) => Err(error),
    }
}

#[must_use]
pub fn str_to_text_and_then<'input>(
    value: Result<&'input str, String>,
    callback: impl FnOnce(&'input str) -> Result<String, String>,
) -> Result<String, String> {
    checked_result(&value, |value| {
        checked_text(value);
    });
    match value {
        Ok(value) => {
            let output = callback(value);
            checked_result(&output, |value| {
                checked_text(&value);
            });
            output
        }
        Err(error) => Err(error),
    }
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
    checked_result(&value, |value| {
        checked_text(&value);
    });
    value.is_ok()
}

#[must_use]
pub fn text_is_err(value: Result<String, String>) -> bool {
    checked_result(&value, |value| {
        checked_text(&value);
    });
    value.is_err()
}

#[must_use]
pub fn text_unwrap_or(value: Result<String, String>, other: String) -> String {
    checked_result(&value, |value| {
        checked_text(&value);
    });
    checked_text(&other);
    match value {
        Ok(value) => value,
        Err(_) => other,
    }
}

#[must_use]
pub fn text_unwrap(value: Result<String, String>) -> String {
    checked_result(&value, |value| {
        checked_text(&value);
    });
    match value {
        Ok(value) => value,
        Err(error) => panic!("{}", error),
    }
}

#[must_use]
pub fn text_expect(value: Result<String, String>, other: &str) -> String {
    checked_result(&value, |value| {
        checked_text(&value);
    });
    checked_text(other);
    match value {
        Ok(value) => value,
        Err(_) => panic!("{}", other),
    }
}

#[must_use]
pub fn text_ok_option(value: Result<String, String>) -> Option<String> {
    checked_result(&value, |value| {
        checked_text(&value);
    });
    value.ok()
}

#[must_use]
pub fn text_err_option(value: Result<String, String>) -> Option<String> {
    checked_result(&value, |value| {
        checked_text(&value);
    });
    value.err()
}

#[must_use]
pub fn text_unwrap_err(value: Result<String, String>) -> String {
    checked_result(&value, |value| {
        checked_text(&value);
    });
    match value {
        Err(error) => error,
        Ok(_) => panic!("{}", "primitive Result success"),
    }
}

#[must_use]
pub fn text_expect_err(value: Result<String, String>, other: &str) -> String {
    checked_result(&value, |value| {
        checked_text(&value);
    });
    checked_text(other);
    match value {
        Err(error) => error,
        Ok(_) => panic!("{}", other),
    }
}

#[must_use]
pub fn text_to_bool_map(
    value: Result<String, String>,
    callback: impl FnOnce(String) -> bool,
) -> Result<bool, String> {
    checked_result(&value, |value| {
        checked_text(&value);
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
pub fn text_to_bool_and_then(
    value: Result<String, String>,
    callback: impl FnOnce(String) -> Result<bool, String>,
) -> Result<bool, String> {
    checked_result(&value, |value| {
        checked_text(&value);
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
pub fn text_to_u64_map(
    value: Result<String, String>,
    callback: impl FnOnce(String) -> u64,
) -> Result<u64, String> {
    checked_result(&value, |value| {
        checked_text(&value);
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
pub fn text_to_u64_and_then(
    value: Result<String, String>,
    callback: impl FnOnce(String) -> Result<u64, String>,
) -> Result<u64, String> {
    checked_result(&value, |value| {
        checked_text(&value);
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
pub fn text_to_i64_map(
    value: Result<String, String>,
    callback: impl FnOnce(String) -> i64,
) -> Result<i64, String> {
    checked_result(&value, |value| {
        checked_text(&value);
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
pub fn text_to_i64_and_then(
    value: Result<String, String>,
    callback: impl FnOnce(String) -> Result<i64, String>,
) -> Result<i64, String> {
    checked_result(&value, |value| {
        checked_text(&value);
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
pub fn text_to_str_map<'output>(
    value: Result<String, String>,
    callback: impl FnOnce(String) -> &'output str,
) -> Result<&'output str, String> {
    checked_result(&value, |value| {
        checked_text(&value);
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
pub fn text_to_str_and_then<'output>(
    value: Result<String, String>,
    callback: impl FnOnce(String) -> Result<&'output str, String>,
) -> Result<&'output str, String> {
    checked_result(&value, |value| {
        checked_text(&value);
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
pub fn text_to_text_map(
    value: Result<String, String>,
    callback: impl FnOnce(String) -> String,
) -> Result<String, String> {
    checked_result(&value, |value| {
        checked_text(&value);
    });
    match value {
        Ok(value) => {
            let output = callback(value);
            checked_text(&output);
            Ok(output)
        }
        Err(error) => Err(error),
    }
}

#[must_use]
pub fn text_to_text_and_then(
    value: Result<String, String>,
    callback: impl FnOnce(String) -> Result<String, String>,
) -> Result<String, String> {
    checked_result(&value, |value| {
        checked_text(&value);
    });
    match value {
        Ok(value) => {
            let output = callback(value);
            checked_result(&output, |value| {
                checked_text(&value);
            });
            output
        }
        Err(error) => Err(error),
    }
}

#[must_use]
pub fn text_map_err(
    value: Result<String, String>,
    callback: impl FnOnce(String) -> String,
) -> Result<String, String> {
    checked_result(&value, |value| {
        checked_text(&value);
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
pub fn text_unwrap_or_else(
    value: Result<String, String>,
    callback: impl FnOnce(String) -> String,
) -> String {
    checked_result(&value, |value| {
        checked_text(&value);
    });
    match value {
        Ok(value) => value,
        Err(error) => {
            let output = callback(error);
            checked_text(&output);
            output
        }
    }
}

#[must_use]
pub fn text_or_else(
    value: Result<String, String>,
    callback: impl FnOnce(String) -> Result<String, String>,
) -> Result<String, String> {
    checked_result(&value, |value| {
        checked_text(&value);
    });
    match value {
        Ok(value) => Ok(value),
        Err(error) => {
            let output = callback(error);
            checked_result(&output, |value| {
                checked_text(&value);
            });
            output
        }
    }
}

/// Preserve a complete generic String-error Result without observing its payload.
pub fn text_result_identity<T>(value: Result<T, String>) -> Result<T, String> {
    value
}
