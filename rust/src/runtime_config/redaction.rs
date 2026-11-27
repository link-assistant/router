use serde_json::{Map, Value, json};

const MASK: &str = "[REDACTED]";

fn secret_key(key: &str) -> bool {
    crate::request_log::is_secret_name(key)
        || crate::contracts::secret_option(&key.replace('-', "_"))
        || key.split(['.', '/', '~']).any(|part| {
            crate::request_log::is_secret_name(part)
                || crate::contracts::secret_option(&part.replace('-', "_"))
        })
        || matches!(
            key,
            "account-egress-proxy" | "safety_identifier" | "prompt_cache_key" | "user_id"
        )
}

fn secret_string(text: &str) -> bool {
    let text = text.trim();
    text.starts_with("la_sk_")
        || text.starts_with("la_admin_")
        || text.starts_with("sk-")
        || text.get(..7).is_some_and(|prefix| prefix.eq_ignore_ascii_case("bearer "))
        || (text.contains("://") && url::Url::parse(text).is_ok_and(|url| {
            !url.username().is_empty()
                || url.password().is_some()
                || url.query_pairs().any(|(key, _)| secret_key(&key))
        }))
        || ((text.starts_with('{') || text.starts_with('['))
            && serde_json::from_str::<Value>(text).is_ok_and(|value| view(&value) != value))
}

pub(super) fn view(value: &Value) -> Value {
    match value {
        Value::Object(map) => Value::Object(map.iter().map(|(key, child)| {
            let result = if secret_key(key) { json!(MASK) } else { view(child) };
            (key.clone(), result)
        }).collect()),
        Value::Array(list) => Value::Array(list.iter().map(view).collect()),
        Value::String(text) if secret_string(text) => json!(MASK),
        _ => value.clone(),
    }
}

pub(super) fn restore_masks(new: &mut Value, old: &Value) {
    match new {
        Value::Object(map) => {
            for (key, value) in map {
                if let Some(previous) = old.get(key.as_str()) {
                    if value.as_str() == Some(MASK) && secret_key(key) {
                        *value = previous.clone();
                    } else {
                        restore_masks(value, previous);
                    }
                }
            }
        }
        Value::Array(list) => {
            for (index, value) in list.iter_mut().enumerate() {
                if let Some(previous) = old.get(index) {
                    restore_masks(value, previous);
                }
            }
        }
        Value::String(text) if text == MASK && old.as_str().is_some_and(secret_string) => {
            *new = old.clone();
        }
        _ => {}
    }
}

pub(super) fn applied(path: &[String], value: &Value) -> Value {
    if path.iter().any(|key| secret_key(key) || key == "metadata") {
        json!(MASK)
    } else {
        view(value)
    }
}

pub(super) fn diff(before: &Value, after: &Value) -> Value {
    let changed = |left: &Value, right: &Value, key: &str| left.get(key) != right.get(key);
    let mut output = Map::new();
    for section in ["cli", "cors", "payload"] {
        if !changed(before, after, section) {
            continue;
        }
        let left = &before[section];
        let right = &after[section];
        if section == "cli" {
            let mut options = Map::new();
            for key in left.as_object().into_iter().flatten().map(|(key, _)| key)
                .chain(right.as_object().into_iter().flatten().map(|(key, _)| key))
            {
                if changed(left, right, key) {
                    let show = |value: &Value| {
                        if value.is_null() { Value::Null } else { applied(std::slice::from_ref(key), value) }
                    };
                    options.insert(key.clone(), json!({"before": show(&left[key]), "after": show(&right[key])}));
                }
            }
            output.insert(section.to_owned(), Value::Object(options));
        } else {
            output.insert(section.to_owned(), json!({"before": view(left), "after": view(right)}));
        }
    }
    Value::Object(output)
}
