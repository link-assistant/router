//! Explicit owned JSON carriers; library internals are intentionally native.
#![allow(clippy::unnecessary_wraps)] // These operations construct the specified carrier ABI.
use crate::translation_core::Json;

#[must_use]
pub fn json_ok(value: &Json) -> Result<Json, String> {
    Ok(value.clone())
}

#[must_use]
pub fn json_err(error: &str) -> Result<Json, String> {
    Err(error.to_owned())
}

#[must_use]
pub fn json_result_copy(value: &Result<Json, String>) -> Result<Json, String> {
    value.clone()
}

#[must_use]
pub fn json_result_or(value: &Result<Json, String>, fallback: &Json) -> Json {
    match value {
        Ok(value) => value.clone(),
        Err(_) => fallback.clone(),
    }
}

#[must_use]
pub fn json_option_to_result(value: &Option<Json>, error: &str) -> Result<Json, String> {
    value.clone().ok_or_else(|| error.to_owned())
}

#[must_use]
pub fn json_result_to_option(value: &Result<Json, String>) -> Option<Json> {
    value.clone().ok()
}

#[must_use]
pub fn json_some(value: &Json) -> Option<Json> {
    Some(value.clone())
}

#[must_use]
pub fn json_none() -> Option<Json> {
    None
}

#[must_use]
pub fn json_option_or(value: &Option<Json>, fallback: &Json) -> Json {
    value.as_ref().unwrap_or(fallback).clone()
}
