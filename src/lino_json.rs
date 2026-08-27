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
///
/// # Which files this is for
///
/// **Router-owned state** — anything this project both writes and reads:
/// the managed-server state, the server selection, the admin claim, the
/// refresh rejections, the pending Claude login, the token transaction
/// journal and the `with` rollback state. These are links notation, written
/// by [`encode`].
///
/// The per-token request log is router-owned too, and is links notation as
/// well — but one record per line, written by [`encode_line`], because it is
/// appended to and compacted on a newline boundary. It is the bulk of the
/// bytes, so it is named here explicitly: leaving it to be inferred from which
/// module its writes lived in is what made the split look accidental
/// (issue #346).
///
/// **Vendor-owned state** stays whatever the vendor writes:
/// `.credentials.json` is Anthropic's, `auth.json` is Codex's, and the client
/// `settings.json` files belong to the clients that read them. Rewriting one
/// in this project's format would break a tool this project does not own, and
/// the vendor files carry fields this crate deliberately does not model.
///
/// The optional audit JSONL is the third case and stays JSON Lines on
/// purpose: it is an outbound interoperability stream whose documented use is
/// piping into `jq`, so its consumer is not this project either.
///
/// The rule was real but implicit, inferable only from which module a write
/// lived in (issue #336).
pub fn encode<T: serde::Serialize>(value: &T) -> Result<String, serde_json::Error> {
    let json = serde_json::to_value(value)?;
    Ok(lino_objects_codec::encode(&to_lino(&json)))
}

/// Encode one record as a single readable line.
///
/// The request log is JSON Lines: one record per line, appended, and compacted
/// by scanning for the first newline after a byte floor. Neither encoder the
/// codec offers fits that shape — the readable one spans a line per field, and
/// the compact one is single-line but base64-encodes every string, which is
/// exactly the unreadability issue #328 removed from this same file. So the
/// log needed a form that is one line *and* readable, and this is it
/// (issue #336).
///
/// Strings keep their own characters; only what would break the framing or the
/// parse is escaped.
pub fn encode_line<T: serde::Serialize>(value: &T) -> Result<String, serde_json::Error> {
    let json = serde_json::to_value(value)?;
    let mut line = String::new();
    write_line(&mut line, &json);
    Ok(line)
}

/// Append `value` to `out` in the single-line form.
fn write_line(out: &mut String, value: &Value) {
    match value {
        Value::Null => out.push_str("()"),
        Value::Bool(flag) => out.push_str(if *flag { "true" } else { "false" }),
        Value::Number(number) => out.push_str(&number.to_string()),
        Value::String(text) => write_quoted(out, text),
        // `()` is null; `(#a)` and `(#o)` are the empty array and the empty
        // object. All three arrive in one record and mean different things,
        // and a `#` cannot begin any value this writes, so the markers cannot
        // collide with one -- a bare `-` did, since `(-1)` is the array
        // holding minus one.
        Value::Array(items) if items.is_empty() => out.push_str("(#a)"),
        Value::Array(items) => {
            out.push('(');
            for (index, item) in items.iter().enumerate() {
                if index > 0 {
                    out.push(' ');
                }
                write_line(out, item);
            }
            out.push(')');
        }
        // As with the empty array: `()` is null, so an empty object needs a
        // form of its own or the two cannot be told apart on the way back.
        Value::Object(fields) if fields.is_empty() => out.push_str("(#o)"),
        Value::Object(fields) => {
            out.push('(');
            for (index, (name, field)) in fields.iter().enumerate() {
                if index > 0 {
                    out.push(' ');
                }
                // `:` marks a field, so a pair can never be mistaken for an
                // array whose first element is a string -- `(("") )` is
                // otherwise both the pair named "" and the array holding "".
                out.push_str("(:");
                write_quoted(out, name);
                out.push(' ');
                write_line(out, field);
                out.push(')');
            }
            out.push(')');
        }
    }
}

/// Write `text` as a quoted string that cannot break the line or the parse.
///
/// A newline inside a body would end the record early and split one exchange
/// into two unparsable halves, so it is escaped rather than carried. Everything
/// else stays as the operator wrote it, which is the point: `grep` has to find
/// a model name in the file.
fn write_quoted(out: &mut String, text: &str) {
    out.push('"');
    for character in text.chars() {
        match character {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            other => out.push(other),
        }
    }
    out.push('"');
}

/// Decode a line written by [`encode_line`].
///
/// Falls back to JSON, so the 1.7 GB of `requests.jsonl` an earlier release
/// wrote keeps reading and the file migrates record by record as new ones are
/// appended (issue #336).
#[must_use]
pub fn decode_line(text: &str) -> Option<Value> {
    let text = text.trim();
    if text.is_empty() {
        return None;
    }
    if is_json(text) {
        return serde_json::from_str(text).ok();
    }
    read_value(&mut text.chars().peekable())
}

/// Read one value from `characters`, or `None` when the text is malformed.
fn read_value(characters: &mut std::iter::Peekable<std::str::Chars<'_>>) -> Option<Value> {
    skip_spaces(characters);
    match characters.peek()? {
        '"' => read_quoted(characters).map(Value::String),
        '(' => read_group(characters),
        _ => read_bare(characters),
    }
}

/// Read a parenthesised group, which is either an object or an array.
fn read_group(characters: &mut std::iter::Peekable<std::str::Chars<'_>>) -> Option<Value> {
    characters.next();
    read_group_body(characters)
}

/// Read a group whose opening paren has already been consumed.
fn read_group_body(characters: &mut std::iter::Peekable<std::str::Chars<'_>>) -> Option<Value> {
    let mut pairs: Vec<(String, Value)> = Vec::new();
    let mut items: Vec<Value> = Vec::new();
    let mut keyed = true;
    loop {
        skip_spaces(characters);
        match characters.peek() {
            None => return None,
            Some(')') => {
                characters.next();
                break;
            }
            Some('(') => {
                // A pair is `("name" value)`; any other group is an array
                // item -- an array of objects, say, which is what a
                // `messages` or `tools` field holds.
                match read_pair(characters)? {
                    Group::Pair(name, value) => pairs.push((name, value)),
                    Group::NotAPair(value) => {
                        keyed = false;
                        items.push(value);
                    }
                }
            }
            Some('#') => {
                characters.next();
                let marker = characters.next()?;
                skip_spaces(characters);
                if characters.next() != Some(')') {
                    return None;
                }
                return match marker {
                    'a' => Some(Value::Array(Vec::new())),
                    'o' => Some(Value::Object(serde_json::Map::new())),
                    _ => None,
                };
            }
            Some(_) => {
                keyed = false;
                items.push(read_value(characters)?);
            }
        }
    }
    if keyed && !pairs.is_empty() {
        return Some(Value::Object(pairs.into_iter().collect()));
    }
    if pairs.is_empty() && items.is_empty() {
        // `()` is how null is written.
        return Some(Value::Null);
    }
    Some(Value::Array(items))
}

/// What a nested group turned out to be.
enum Group {
    /// `("name" value)` — a field of the enclosing object.
    Pair(String, Value),
    /// Any other group, so the enclosing one is an array of these.
    NotAPair(Value),
}

/// Read `("name" value)`, or the group that turned out not to be one.
///
/// A group opening with anything but a quoted name is an array element rather
/// than a field — an array of objects is what a `messages` or `tools` field
/// holds, and reading it as a malformed pair rejected every request body that
/// carried one.
fn read_pair(characters: &mut std::iter::Peekable<std::str::Chars<'_>>) -> Option<Group> {
    // Consume the opening paren, then decide from what follows. Cloning the
    // remaining input to look ahead would be O(n) per group and quadratic
    // over a record, and a log line carries thousands of them.
    characters.next();
    if characters.peek() != Some(&':') {
        // Not a field, so this group is an array element. It has already lost
        // its opening paren, so its contents are read here directly.
        return read_group_body(characters).map(Group::NotAPair);
    }
    characters.next();
    let name = read_quoted(characters)?;
    let value = read_value(characters)?;
    skip_spaces(characters);
    if characters.next() != Some(')') {
        return None;
    }
    Some(Group::Pair(name, value))
}

/// Read a quoted string, undoing the escapes [`write_quoted`] applied.
fn read_quoted(characters: &mut std::iter::Peekable<std::str::Chars<'_>>) -> Option<String> {
    if characters.next() != Some('"') {
        return None;
    }
    let mut text = String::new();
    loop {
        match characters.next()? {
            '"' => return Some(text),
            '\\' => match characters.next()? {
                'n' => text.push('\n'),
                'r' => text.push('\r'),
                other => text.push(other),
            },
            other => text.push(other),
        }
    }
}

/// Read a number, boolean or null written without quotes.
fn read_bare(characters: &mut std::iter::Peekable<std::str::Chars<'_>>) -> Option<Value> {
    let mut text = String::new();
    while let Some(character) = characters.peek() {
        if character.is_whitespace() || *character == ')' || *character == '(' {
            break;
        }
        text.push(*character);
        characters.next();
    }
    match text.as_str() {
        "" => None,
        "true" => Some(Value::Bool(true)),
        "false" => Some(Value::Bool(false)),
        "null" => Some(Value::Null),
        number => number.parse::<serde_json::Number>().ok().map(Value::Number),
    }
}

fn skip_spaces(characters: &mut std::iter::Peekable<std::str::Chars<'_>>) {
    while characters
        .peek()
        .is_some_and(|character| character.is_whitespace())
    {
        characters.next();
    }
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
