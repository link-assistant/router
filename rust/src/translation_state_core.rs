//! Owned JSON state updates. Native library internals stay untranslated.
use crate::translation_core::Json;

pub fn json_with_index(mut base: Json, index: u64, value: Json) -> Json {
    let items = base.as_array_mut().expect("JSON replacement requires an array");
    let index = usize::try_from(index).expect("JSON replacement index exceeds usize");
    assert!(index < items.len(), "JSON replacement index is out of bounds");
    items[index] = value;
    base
}

pub fn json_append(mut base: Json, value: Json) -> Json {
    base.as_array_mut().expect("JSON append requires an array").push(value);
    base
}

pub fn json_extend(mut base: Json, values: &[Json]) -> Json {
    base.as_array_mut().expect("JSON extend requires an array").extend(values.iter().cloned());
    base
}

pub fn json_extend_owned(mut base: Json, values: Vec<Json>) -> Json {
    base.as_array_mut().expect("JSON extend requires an array").extend(values);
    base
}

pub fn json_from_values(values: Vec<Json>) -> Json { Json::Array(values) }

pub fn json_values_copy(values: &[Json]) -> Vec<Json> { values.to_vec() }

pub fn json_into_values(value: Json) -> Vec<Json> {
    match value {
        Json::Array(values) => values,
        _ => panic!("JSON extraction requires an array"),
    }
}

pub fn json_without_field(mut base: Json, key: &str) -> Json {
    if base.is_null() { return base; }
    base.as_object_mut().expect("JSON removal requires an object or null").remove(key);
    base
}

pub fn json_merge(mut base: Json, patch: &Json) -> Json {
    let patch = patch.as_object().expect("JSON merge patch requires an object");
    if base.is_null() { base = Json::Object(Default::default()); }
    let target = base.as_object_mut().expect("JSON merge base requires an object or null");
    for (key, value) in patch { target.insert(key.clone(), value.clone()); }
    base
}

pub fn json_object_keys(value: &Json) -> Json {
    let object = value.as_object().expect("JSON keys require an object");
    Json::Array(object.keys().map(|key| Json::String(key.clone())).collect())
}

pub fn json_array_len(value: &Json) -> u64 {
    u64::try_from(value.as_array().expect("JSON length requires an array").len())
        .expect("JSON array length exceeds u64")
}

pub fn json_object_has(value: &Json, key: &str) -> bool {
    value.as_object().map(|object| object.contains_key(key)).unwrap_or(false)
}
