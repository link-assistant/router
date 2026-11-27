use std::fs::File;
use std::io::{self, Read as _};
use std::path::Path;

use serde_json::{Map, Value};
use toml_edit::{Array, DocumentMut, InlineTable, Item, TableLike, Value as TomlValue};

pub(super) const MAX_BYTES: usize = 256 * 1024;
const JSON_SECTIONS: [&str; 3] = ["cli-json", "cors-json", "payload-json"];

pub(super) fn read(path: &Path) -> io::Result<Option<String>> {
    match std::fs::symlink_metadata(path) {
        Ok(metadata) if metadata.is_file() => {}
        Ok(_) => return Err(io::Error::new(io::ErrorKind::InvalidInput, "expected a regular file")),
        Err(error) if error.kind() == io::ErrorKind::NotFound => return Ok(None),
        Err(error) => return Err(error),
    }
    let mut content = String::new();
    File::open(path)?
        .take(MAX_BYTES as u64 + 1)
        .read_to_string(&mut content)?;
    if content.len() > MAX_BYTES {
        return Err(io::Error::new(io::ErrorKind::InvalidData, "runtime config exceeds limit"));
    }
    Ok(Some(content))
}

pub(super) fn decode(text: &str) -> Result<(DocumentMut, Value), &'static str> {
    let toml = text.parse::<DocumentMut>().map_err(|_| "invalid runtime configuration TOML")?;
    let mut object = table_to_json(toml.as_table())?;
    for alternative in JSON_SECTIONS {
        if let Some(raw) = object.remove(alternative) {
            let name = alternative.strip_suffix("-json").expect("JSON alternative suffix");
            if object.contains_key(name) {
                return Err("runtime configuration contains both TOML and JSON forms of a section");
            }
            let json = raw.as_str().and_then(|raw| serde_json::from_str(raw).ok())
                .ok_or("invalid JSON in runtime configuration TOML")?;
            object.insert(name.into(), json);
        }
    }
    Ok((toml, Value::Object(object)))
}

fn table_to_json(table: &dyn TableLike) -> Result<Map<String, Value>, &'static str> {
    table.iter().map(|(key, item)| Ok((key.to_owned(), item_to_json(item)?))).collect()
}

fn item_to_json(item: &Item) -> Result<Value, &'static str> {
    if let Some(table) = item.as_table_like() {
        return Ok(Value::Object(table_to_json(table)?));
    }
    if let Some(tables) = item.as_array_of_tables() {
        return tables.iter().map(|table| table_to_json(table).map(Value::Object))
            .collect::<Result<Vec<_>, _>>().map(Value::Array);
    }
    item.as_value().map_or(
        Err("unsupported value in runtime configuration TOML"),
        toml_to_json,
    )
}

fn toml_to_json(value: &TomlValue) -> Result<Value, &'static str> {
    match value {
        TomlValue::String(value) => Ok(Value::from(value.value().as_str())),
        TomlValue::Integer(value) => Ok(Value::from(*value.value())),
        TomlValue::Float(value) => serde_json::Number::from_f64(*value.value())
            .map(Value::Number).ok_or("runtime configuration requires finite numbers"),
        TomlValue::Boolean(value) => Ok(Value::from(*value.value())),
        TomlValue::Array(values) => values.iter().map(toml_to_json).collect::<Result<Vec<_>, _>>()
            .map(Value::Array),
        TomlValue::InlineTable(table) => table_to_json(table).map(Value::Object),
        TomlValue::Datetime(_) => Err("runtime configuration dates must be quoted strings"),
    }
}

fn json_to_toml(value: &Value) -> Option<TomlValue> {
    match value {
        Value::Null => None,
        Value::Bool(value) => Some(TomlValue::from(*value)),
        Value::Number(value) => value.as_i64().map(TomlValue::from)
            .or_else(|| (!value.is_u64()).then(|| value.as_f64().map(TomlValue::from)).flatten()),
        Value::String(value) => Some(TomlValue::from(value.as_str())),
        Value::Array(values) => values.iter().map(json_to_toml).collect::<Option<Array>>()
            .map(TomlValue::Array),
        Value::Object(object) => object.iter().map(|(key, value)| {
            Some((key.clone(), json_to_toml(value)?))
        }).collect::<Option<InlineTable>>().map(TomlValue::InlineTable),
    }
}

pub(super) fn encode(mut toml: DocumentMut, document: &Value) -> Result<String, &'static str> {
    let object = document.as_object().ok_or("configuration document must be an object")?;
    let mut desired = Map::new();
    for (key, value) in object {
        let alternative = format!("{key}-json");
        // Preserve a hand-authored JSON section, and use the same lossless TOML
        // representation for JSON nulls or unsigned integers exceeding i64.
        if toml.contains_key(&alternative) || json_to_toml(value).is_none() {
            desired.insert(alternative, Value::String(value.to_string()));
        } else {
            desired.insert(key.clone(), value.clone());
        }
    }
    reconcile_table(toml.as_table_mut(), &desired)?;
    let text = toml.to_string();
    if text.len() > MAX_BYTES {
        return Err("runtime configuration TOML exceeds limit");
    }
    Ok(text)
}

fn reconcile_table(table: &mut dyn TableLike, desired: &Map<String, Value>) -> Result<(), &'static str> {
    let deleted = table.iter().filter(|(key, _)| !desired.contains_key(*key))
        .map(|(key, _)| key.to_owned()).collect::<Vec<_>>();
    for key in deleted {
        table.remove(&key);
    }
    for (key, value) in desired {
        if let Some(item) = table.get_mut(key) {
            reconcile_item(item, value)?;
        } else {
            let value = json_to_toml(value).ok_or("runtime configuration cannot be represented in TOML")?;
            table.insert(key, Item::Value(value));
        }
    }
    Ok(())
}

fn reconcile_item(item: &mut Item, desired: &Value) -> Result<(), &'static str> {
    if item_to_json(item).as_ref() == Ok(desired) {
        return Ok(());
    }
    if let (Some(table), Some(object)) = (item.as_table_like_mut(), desired.as_object()) {
        return reconcile_table(table, object);
    }
    if let Some(values) = desired.as_array() {
        if let Some(tables) = item.as_array_of_tables_mut()
            && tables.len() == values.len() && values.iter().all(Value::is_object)
        {
            for (table, value) in tables.iter_mut().zip(values) {
                reconcile_table(table, value.as_object().expect("checked object"))?;
            }
            return Ok(());
        }
        if let Some(array) = item.as_array_mut() {
            while array.len() > values.len() {
                array.remove(array.len() - 1);
            }
            for (index, value) in values.iter().enumerate() {
                if let Some(old) = array.get_mut(index) {
                    let mut wrapped = Item::Value(old.clone());
                    reconcile_item(&mut wrapped, value)?;
                    *old = wrapped.into_value().map_err(|_| "invalid runtime config array")?;
                } else {
                    array.push(json_to_toml(value).ok_or("invalid runtime config array")?);
                }
            }
            return Ok(());
        }
    }
    let mut replacement = json_to_toml(desired).ok_or("runtime configuration cannot be represented in TOML")?;
    if let Some(old) = item.as_value() {
        *replacement.decor_mut() = old.decor().clone();
    }
    *item = Item::Value(replacement);
    Ok(())
}
