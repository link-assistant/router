//! Credential redaction for recorded requests, responses and URIs.
//!
//! The request store holds complete client and upstream exchanges, so it is
//! the one place a credential must never survive. Redaction is partial rather
//! than total wherever a value has to stay distinguishable — an operator
//! correlating two records needs to tell one token from another without either
//! being reconstructable. Split from `request_log.rs` to keep that file within
//! the repository's 1000-line limit.

use std::collections::BTreeMap;

use axum::http::HeaderMap;
use serde_json::{Value, json};

use super::{
    MIN_PARTIAL_REDACTION_LENGTH, REDACTED, REDACTED_PREFIX_LENGTH, REDACTED_SUFFIX_LENGTH,
};

pub(super) fn partially_redact(value: &str) -> String {
    let length = value.chars().count();
    if length < MIN_PARTIAL_REDACTION_LENGTH {
        return REDACTED.to_string();
    }
    let prefix = value
        .chars()
        .take(REDACTED_PREFIX_LENGTH)
        .collect::<String>();
    let suffix = value
        .chars()
        .skip(length - REDACTED_SUFFIX_LENGTH)
        .collect::<String>();
    let mask = "*".repeat(length - REDACTED_PREFIX_LENGTH - REDACTED_SUFFIX_LENGTH);
    format!("{prefix}{mask}{suffix}")
}

fn redact_secret(value: &str) -> String {
    let trimmed = value.trim();
    if trimmed
        .get(..7)
        .is_some_and(|prefix| prefix.eq_ignore_ascii_case("bearer "))
    {
        return format!("{}{}", &trimmed[..7], partially_redact(&trimmed[7..]));
    }
    partially_redact(trimmed)
}

/// Mask credentials while retaining header names for diagnostics.
#[must_use]
pub fn redacted_headers(headers: &HeaderMap) -> BTreeMap<String, String> {
    headers
        .iter()
        .map(|(name, value)| {
            let name = name.as_str().to_string();
            let value = if is_secret_name(&name) {
                value
                    .to_str()
                    .map_or_else(|_| REDACTED.to_string(), redact_secret)
            } else {
                value.to_str().map_or_else(
                    |_| "[NON-UTF8]".to_string(),
                    |value| {
                        if is_secret_value(value) {
                            redact_secret(value)
                        } else {
                            value.to_string()
                        }
                    },
                )
            };
            (name, value)
        })
        .collect()
}

/// How a body that is not valid UTF-8 is represented in the log.
///
/// `String::from_utf8_lossy` replaces every invalid byte with U+FFFD, which for
/// a compressed body destroys it: the record is then neither readable nor
/// decodable after the fact (issue #231). Such a body is base64-encoded instead,
/// under a marker that says what the reader is looking at.
pub const BINARY_BODY_KEY: &str = "base64";

/// Encode a body for the log without losing it.
///
/// A body is stored as JSON when it parses as JSON, as text when it is valid
/// UTF-8, and otherwise as base64 — which is what a `gzip`, `br` or `zstd`
/// response looks like here, because the router does not decompress upstream
/// bodies and a single frame of a compressed *stream* cannot be decoded on its
/// own anyway.
#[must_use]
pub fn redacted_body(body: &[u8]) -> Value {
    if let Ok(value) = serde_json::from_slice::<Value>(body) {
        return redact_value(value);
    }
    std::str::from_utf8(body).map_or_else(
        |_| {
            json!({
                BINARY_BODY_KEY: base64::Engine::encode(
                    &base64::engine::general_purpose::STANDARD,
                    body,
                ),
                "bytes": body.len(),
            })
        },
        |text| Value::String(text.to_string()),
    )
}

pub(super) fn redact_value(mut value: Value) -> Value {
    match &mut value {
        Value::Object(object) => {
            for (key, child) in object {
                if is_secret_name(key) {
                    *child = child.as_str().map_or_else(
                        || Value::String(REDACTED.to_string()),
                        |secret| Value::String(redact_secret(secret)),
                    );
                } else if key.eq_ignore_ascii_case("uri")
                    && let Value::String(uri) = child
                {
                    *uri = redacted_uri(uri);
                } else {
                    *child = redact_value(child.take());
                }
            }
        }
        Value::Array(array) => {
            for child in array {
                *child = redact_value(child.take());
            }
        }
        Value::String(text) if is_secret_value(text) => {
            *text = redact_secret(text);
        }
        _ => {}
    }
    value
}

fn is_secret_name(name: &str) -> bool {
    let normalized = normalize_name(name);
    matches!(
        normalized.as_str(),
        "authorization"
            | "proxy_authorization"
            | "x_api_key"
            | "api_key"
            | "key"
            | "cookie"
            | "set_cookie"
            | "access_token"
            | "refresh_token"
            | "oauth_token"
            | "auth_token"
            | "security_token"
            | "x_auth_token"
            | "x_goog_api_key"
            | "x_amz_security_token"
            | "token"
            | "password"
            | "secret"
            | "client_secret"
            | "private_key"
    ) || normalized.ends_with("_password")
        || normalized.ends_with("_secret")
        || normalized.ends_with("_token")
        || normalized.ends_with("_api_key")
}

fn normalize_name(name: &str) -> String {
    let mut normalized = String::with_capacity(name.len());
    let mut previous_was_lowercase_or_digit = false;
    for character in name.chars() {
        if character.is_ascii_uppercase() {
            if previous_was_lowercase_or_digit && !normalized.ends_with('_') {
                normalized.push('_');
            }
            normalized.push(character.to_ascii_lowercase());
            previous_was_lowercase_or_digit = false;
        } else if character.is_ascii_alphanumeric() {
            normalized.push(character.to_ascii_lowercase());
            previous_was_lowercase_or_digit =
                character.is_ascii_lowercase() || character.is_ascii_digit();
        } else {
            if !normalized.ends_with('_') {
                normalized.push('_');
            }
            previous_was_lowercase_or_digit = false;
        }
    }
    normalized.trim_matches('_').to_string()
}

fn is_secret_value(value: &str) -> bool {
    let value = value.trim();
    value
        .get(..7)
        .is_some_and(|prefix| prefix.eq_ignore_ascii_case("bearer "))
        || [
            "sk-ant-",
            crate::token::TOKEN_PREFIX,
            crate::admin::ADMIN_TOKEN_PREFIX,
        ]
        .iter()
        .any(|prefix| value.contains(prefix))
        || is_jwt(
            value
                .strip_prefix(crate::token::TOKEN_PREFIX)
                .unwrap_or(value),
        )
}

fn is_jwt(value: &str) -> bool {
    let mut segments = value.split('.');
    let Some(header) = segments.next() else {
        return false;
    };
    let Some(payload) = segments.next() else {
        return false;
    };
    let Some(signature) = segments.next() else {
        return false;
    };
    segments.next().is_none()
        && header.starts_with("eyJ")
        && [header, payload, signature].iter().all(|segment| {
            segment.len() >= 8
                && segment.chars().all(|character| {
                    character.is_ascii_alphanumeric() || matches!(character, '-' | '_')
                })
        })
}

pub(super) fn redacted_uri(uri: &str) -> String {
    let Some((path, query)) = uri.split_once('?') else {
        return uri.to_string();
    };
    let query = query
        .split('&')
        .map(|parameter| {
            let (name, value) = parameter.split_once('=').unwrap_or((parameter, ""));
            let decoded_name = percent_decode(name);
            let decoded_value = percent_decode(value);
            if is_secret_name(&decoded_name) || is_secret_value(&decoded_value) {
                format!("{name}={}", redact_secret(&decoded_value))
            } else {
                parameter.to_string()
            }
        })
        .collect::<Vec<_>>()
        .join("&");
    format!("{path}?{query}")
}

fn percent_decode(value: &str) -> String {
    let bytes = value.as_bytes();
    let mut decoded = Vec::with_capacity(bytes.len());
    let mut index = 0;
    while index < bytes.len() {
        match bytes[index] {
            b'%' if index + 2 < bytes.len() => {
                if let (Some(high), Some(low)) =
                    (hex_digit(bytes[index + 1]), hex_digit(bytes[index + 2]))
                {
                    decoded.push(high * 16 + low);
                    index += 3;
                    continue;
                }
                decoded.push(bytes[index]);
            }
            b'+' => decoded.push(b' '),
            byte => decoded.push(byte),
        }
        index += 1;
    }
    String::from_utf8_lossy(&decoded).into_owned()
}

const fn hex_digit(byte: u8) -> Option<u8> {
    match byte {
        b'0'..=b'9' => Some(byte - b'0'),
        b'a'..=b'f' => Some(byte - b'a' + 10),
        b'A'..=b'F' => Some(byte - b'A' + 10),
        _ => None,
    }
}
