//! Bounded owned text maps. BTreeMap internals intentionally remain native.
//! A private field protects construction invariants; this is not a compiler proof.
use std::collections::BTreeMap;

const MAX_ENTRIES: usize = 4096;
const MAX_BYTES: usize = 1_048_576;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct OrderedTextMap(BTreeMap<String, String>);

fn bounded_pair(key: &str, value: &str) -> usize {
    let size = key.len().checked_add(value.len()).expect("text map byte overflow");
    assert!(size <= MAX_BYTES, "text map byte bound");
    size
}

fn bounded_map(value: BTreeMap<String, String>) -> OrderedTextMap {
    assert!(value.len() <= MAX_ENTRIES, "text map entry bound");
    let mut bytes = 0usize;
    for (key, value) in &value {
        bytes = bytes.checked_add(bounded_pair(key, value)).expect("text map byte overflow");
        assert!(bytes <= MAX_BYTES, "text map byte bound");
    }
    OrderedTextMap(value)
}

pub fn text_map_new() -> OrderedTextMap { OrderedTextMap(BTreeMap::new()) }

pub fn text_map_from_pairs(pairs: Vec<(String, String)>) -> OrderedTextMap {
    assert!(pairs.len() <= MAX_ENTRIES, "text map input entry bound");
    let mut bytes = 0usize;
    let mut result = BTreeMap::new();
    for (key, value) in pairs {
        bytes = bytes.checked_add(bounded_pair(&key, &value)).expect("text map byte overflow");
        assert!(bytes <= MAX_BYTES, "text map input byte bound");
        result.insert(key, value);
    }
    bounded_map(result)
}

pub fn text_map_insert(mut map: OrderedTextMap, key: String, value: String) -> OrderedTextMap {
    bounded_pair(&key, &value);
    map.0.insert(key, value);
    bounded_map(map.0)
}

pub fn text_map_remove(mut map: OrderedTextMap, key: &str) -> OrderedTextMap {
    bounded_pair(key, "");
    map.0.remove(key);
    map
}

pub fn text_map_get<'a>(map: &'a OrderedTextMap, key: &str) -> Option<&'a str> {
    bounded_pair(key, "");
    map.0.get(key).map(String::as_str)
}

pub fn text_map_contains(map: &OrderedTextMap, key: &str) -> bool {
    bounded_pair(key, "");
    map.0.contains_key(key)
}

pub fn text_map_len(map: &OrderedTextMap) -> u64 {
    u64::try_from(map.0.len()).expect("text map length exceeds u64")
}

pub fn text_map_copy(map: &OrderedTextMap) -> OrderedTextMap { map.clone() }

pub fn text_map_pairs(map: &OrderedTextMap) -> Vec<(String, String)> {
    map.0.iter().map(|(key, value)| (key.clone(), value.clone())).collect()
}

pub fn text_map_keys(map: &OrderedTextMap) -> Vec<String> { map.0.keys().cloned().collect() }
