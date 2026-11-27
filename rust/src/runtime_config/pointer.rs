use serde_json::{Map, Value};

#[derive(Debug, PartialEq, Eq)]
pub(super) enum PathError {
    Invalid,
    Missing,
}

pub(super) fn segments(pointer: &str) -> Result<Vec<String>, PathError> {
    if pointer.is_empty() {
        return Ok(Vec::new());
    }
    pointer
        .strip_prefix('/')
        .ok_or(PathError::Invalid)?
        .split('/')
        .map(|part| {
            let mut result = String::new();
            let mut chars = part.chars();
            while let Some(character) = chars.next() {
                result.push(if character == '~' {
                    match chars.next() {
                        Some('0') => '~',
                        Some('1') => '/',
                        _ => return Err(PathError::Invalid),
                    }
                } else {
                    character
                });
            }
            Ok(result)
        })
        .collect()
}

pub(super) fn index(key: &str, length: usize) -> Option<usize> {
    if key.is_empty()
        || !key.bytes().all(|byte| byte.is_ascii_digit())
        || (key.starts_with('0') && key.len() > 1)
    {
        return None;
    }
    key.parse::<usize>().ok().filter(|index| *index < length)
}

pub(super) fn child<'a>(value: &'a Value, key: &str) -> Option<&'a Value> {
    match value {
        Value::Array(array) => index(key, array.len()).map(|index| &array[index]),
        Value::Object(object) => object.get(key),
        _ => None,
    }
}

pub(super) fn get<'a>(document: &'a Value, path: &[String]) -> Option<&'a Value> {
    path.iter()
        .try_fold(document, |parent, key| child(parent, key))
}

pub(super) fn edit(
    document: &mut Value,
    path: &[String],
    replacement: Option<Value>,
    create_parents: bool,
) -> Result<(), PathError> {
    let Some((key, parents)) = path.split_last() else {
        return Err(PathError::Invalid);
    };
    let mut parent = document;
    for part in parents {
        parent = match parent {
            Value::Array(array) => {
                let offset = index(part, array.len()).ok_or(PathError::Missing)?;
                &mut array[offset]
            }
            Value::Object(object) if create_parents => object
                .entry(part)
                .or_insert_with(|| Value::Object(Map::new())),
            Value::Object(object) => object.get_mut(part).ok_or(PathError::Missing)?,
            _ => return Err(PathError::Invalid),
        };
    }
    match (parent, replacement) {
        (Value::Object(object), Some(value)) => {
            object.insert(key.clone(), value);
        }
        (Value::Object(object), None) => {
            object.remove(key).ok_or(PathError::Missing)?;
        }
        (Value::Array(array), Some(value)) if key == "-" && !create_parents => array.push(value),
        (Value::Array(array), replacement) => {
            let offset = index(key, array.len()).ok_or(PathError::Missing)?;
            if let Some(value) = replacement {
                array[offset] = value;
            } else {
                array.remove(offset);
            }
        }
        _ => return Err(PathError::Invalid),
    }
    Ok(())
}

pub(super) fn merge(target: &mut Value, patch: Value) {
    let Value::Object(patch) = patch else {
        *target = patch;
        return;
    };
    if !target.is_object() {
        *target = Value::Object(Map::new());
    }
    let target = target.as_object_mut().expect("object patch target");
    for (key, value) in patch {
        if value.is_null() {
            target.remove(&key);
        } else {
            merge(target.entry(key).or_insert(Value::Null), value);
        }
    }
}
