//! Persist `serde`-shaped state as readable links notation.
//!
//! The token store already persists as links notation; the smaller stores did
//! not, so router state was split across two formats for no reason anyone chose
//! (issue #235).
//!
//! This bridges the two representations rather than rewriting each store's
//! types: a store keeps its `Serialize`/`Deserialize` derives, and the value is
//! carried through `serde_json::Value` into `LinoValue`. Since
//! `lino-objects-codec` 0.3 encodes readable text by default, the result is a
//! file an operator can read — which was the point of the request, and which an
//! earlier version of the codec could not deliver.

use lino_objects_codec::LinoValue;
use serde_json::{Map, Number, Value};

/// Convert a JSON value into its links-notation equivalent.
#[must_use]
pub fn to_lino(value: &Value) -> LinoValue {
    match value {
        Value::Null => LinoValue::Null,
        Value::Bool(flag) => LinoValue::Bool(*flag),
        Value::Number(number) => number.as_i64().map_or_else(
            || number.as_f64().map_or(LinoValue::Null, LinoValue::Float),
            LinoValue::Int,
        ),
        Value::String(text) => LinoValue::String(text.clone()),
        Value::Array(items) => LinoValue::Array(items.iter().map(to_lino).collect()),
        Value::Object(fields) => LinoValue::object(
            fields
                .iter()
                .map(|(key, child)| (key.as_str(), to_lino(child))),
        ),
    }
}

/// Convert links notation back into a JSON value.
///
/// An object and an array are the same construct in links notation, so the
/// distinction is carried by content: this is the inverse of [`to_lino`] for
/// any value it produced.
#[must_use]
pub fn from_lino(value: &LinoValue) -> Value {
    match value {
        LinoValue::Null => Value::Null,
        LinoValue::Bool(flag) => Value::Bool(*flag),
        LinoValue::Int(number) => Value::Number((*number).into()),
        LinoValue::Float(number) => Number::from_f64(*number).map_or(Value::Null, Value::Number),
        LinoValue::String(text) => Value::String(text.clone()),
        LinoValue::Array(items) => Value::Array(items.iter().map(from_lino).collect()),
        LinoValue::Object(fields) => Value::Object(
            fields
                .iter()
                .map(|(key, child)| (key.clone(), from_lino(child)))
                .collect::<Map<_, _>>(),
        ),
    }
}

/// Encode any serialisable state as readable links notation.
pub fn encode<T: serde::Serialize>(value: &T) -> Result<String, serde_json::Error> {
    let json = serde_json::to_value(value)?;
    Ok(lino_objects_codec::encode(&to_lino(&json)))
}

/// Decode state written by [`encode`].
///
/// Falls back to JSON when the text is not links notation, so a store written
/// by an earlier release keeps loading and migrates on its next write.
pub fn decode<T: serde::de::DeserializeOwned>(text: &str) -> Result<T, serde_json::Error> {
    // Which format this is has to be decided before parsing, not after: the
    // links-notation decoder accepts JSON too, but yields a different structure,
    // so a "try lino, fall back to JSON" order would silently misread every file
    // written by an earlier release rather than falling back at all.
    if is_json(text) {
        return serde_json::from_str(text);
    }
    lino_objects_codec::decode(text).map_or_else(
        |_| serde_json::from_str(text),
        |value| serde_json::from_value(from_lino(&value)),
    )
}

/// Whether `text` is the JSON an earlier release wrote.
///
/// Links notation opens with `(`; JSON opens with `{` or `[`.
fn is_json(text: &str) -> bool {
    text.trim_start().starts_with(['{', '['])
}

#[cfg(test)]
#[path = "lino_json_tests.rs"]
mod tests;
