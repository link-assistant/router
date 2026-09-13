//! What "the same request" means on replay, and how a difference is named.
//!
//! Issue #566 makes strictness the point: a replay that answered any request
//! with the next recorded response would be a fixture server, and would pass
//! while a router change quietly dropped a field, reordered a tool result or
//! rewrote a system message. So the comparison is exact over everything the
//! recording holds — and when it fails it has to say *which* turn and *what*
//! differed, because "mismatch at turn 2" is the generic report the issue
//! explicitly rejects.
//!
//! Split from `conversation_record.rs` for the 1000-line limit.

use serde_json::Value;

/// Headers that legitimately differ between a recording and its replay.
///
/// These are transport bookkeeping, not conversation content: the framing of
/// the same body may differ, the host is whatever port the replay bound, and
/// the token in `authorization` is already redacted to a mask that a freshly
/// minted token would not reproduce. Comparing them would make every replay
/// fail for reasons that have nothing to do with the exchange under test.
const IGNORED_HEADERS: &[&str] = &[
    "authorization",
    "content-length",
    "host",
    "proxy-authorization",
    "user-agent",
    "x-api-key",
    "x-request-id",
    "date",
    "cookie",
];

/// Fields of a recorded request that are compared.
///
/// `uri` and `method` identify the endpoint; `body` is the conversation. The
/// header map is compared separately so the report can name the header.
const COMPARED_FIELDS: &[&str] = &["method", "uri"];

/// Whether a header name takes part in matching.
#[must_use]
pub fn header_is_compared(name: &str) -> bool {
    !IGNORED_HEADERS.contains(&name.to_ascii_lowercase().as_str())
}

/// The first way `incoming` differs from `recorded`, described in English.
///
/// `None` means the two requests match. The description names a path into the
/// body — `body.messages[1].content[0].text` — so the turn that failed points
/// at the field that moved rather than at the whole request.
#[must_use]
pub fn describe_difference(recorded: &Value, incoming: &Value) -> Option<String> {
    for field in COMPARED_FIELDS {
        let expected = recorded.get(*field);
        let actual = incoming.get(*field);
        if expected != actual {
            return Some(format!(
                "{field}: recorded {}, received {}",
                render(expected),
                render(actual)
            ));
        }
    }
    if let Some(difference) = header_difference(recorded, incoming) {
        return Some(difference);
    }
    compare(
        "body",
        recorded.get("body").unwrap_or(&Value::Null),
        incoming.get("body").unwrap_or(&Value::Null),
    )
}

/// The first compared header that differs.
fn header_difference(recorded: &Value, incoming: &Value) -> Option<String> {
    let expected = recorded.get("headers").and_then(Value::as_object)?;
    let actual = incoming.get("headers").and_then(Value::as_object);
    for (name, value) in expected {
        if !header_is_compared(name) {
            continue;
        }
        let received = actual.and_then(|actual| actual.get(name));
        if received != Some(value) {
            return Some(format!(
                "header {name}: recorded {}, received {}",
                render(Some(value)),
                render(received)
            ));
        }
    }
    // A header the client added is as much a divergence as one it dropped: an
    // extra beta flag changes what the upstream is being asked for.
    let actual = actual?;
    actual
        .iter()
        .filter(|(name, _)| header_is_compared(name))
        .find(|(name, _)| !expected.contains_key(name.as_str()))
        .map(|(name, value)| {
            format!(
                "header {name}: absent from the recording, received {}",
                render(Some(value))
            )
        })
}

/// Walk two values in parallel and describe the first divergence at `path`.
fn compare(path: &str, recorded: &Value, incoming: &Value) -> Option<String> {
    match (recorded, incoming) {
        (Value::Object(expected), Value::Object(actual)) => {
            for (key, value) in expected {
                let Some(received) = actual.get(key) else {
                    return Some(format!("{path}.{key} is missing from the request"));
                };
                if let Some(difference) = compare(&format!("{path}.{key}"), value, received) {
                    return Some(difference);
                }
            }
            actual
                .keys()
                .find(|key| !expected.contains_key(key.as_str()))
                .map(|key| format!("{path}.{key} is not in the recording"))
        }
        (Value::Array(expected), Value::Array(actual)) => {
            if expected.len() != actual.len() {
                return Some(format!(
                    "{path} has {} element(s), the recording has {}",
                    actual.len(),
                    expected.len()
                ));
            }
            expected
                .iter()
                .zip(actual)
                .enumerate()
                .find_map(|(index, (expected, actual))| {
                    compare(&format!("{path}[{index}]"), expected, actual)
                })
        }
        _ if recorded == incoming => None,
        _ => Some(format!(
            "{path}: recorded {}, received {}",
            render(Some(recorded)),
            render(Some(incoming))
        )),
    }
}

/// How long a value may be before a report abbreviates it.
///
/// A mismatch report goes to a test log and a terminal; a full system prompt
/// pasted into it buries the one field that moved.
const RENDERED_LIMIT: usize = 120;

/// Render a value for a mismatch report, abbreviated but never elided entirely.
fn render(value: Option<&Value>) -> String {
    let Some(value) = value else {
        return "nothing".to_string();
    };
    let text = match value {
        Value::String(text) => text.clone(),
        other => other.to_string(),
    };
    if text.chars().count() <= RENDERED_LIMIT {
        return format!("{text:?}");
    }
    let head: String = text.chars().take(RENDERED_LIMIT).collect();
    format!("{head:?}… ({} characters)", text.chars().count())
}
