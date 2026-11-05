//! Owned JSON iterator boundaries. Native library internals stay untranslated.
use crate::translation_core::Json;

/// Preserve matching values in order, each in fresh owned JSON storage.
pub fn json_filter<F>(values: &[Json], mut predicate: F) -> Vec<Json>
where
    F: FnMut(&Json) -> bool,
{
    values.iter().filter(|value| predicate(value)).cloned().collect()
}

/// Stop immediately after the first true predicate result.
pub fn json_any<F>(values: &[Json], predicate: F) -> bool
where
    F: FnMut(&Json) -> bool,
{
    values.iter().any(predicate)
}

/// Stop immediately after the first false predicate result.
pub fn json_all<F>(values: &[Json], predicate: F) -> bool
where
    F: FnMut(&Json) -> bool,
{
    values.iter().all(predicate)
}

/// Return a fresh owned copy of the first matching value, including Null.
pub fn json_find<F>(values: &[Json], mut predicate: F) -> Option<Json>
where
    F: FnMut(&Json) -> bool,
{
    values.iter().find(|value| predicate(value)).cloned()
}

/// Consume each owned accumulator in order and retain only the next result.
pub fn json_fold<F>(values: &[Json], initial: Json, callback: F) -> Json
where
    F: FnMut(Json, &Json) -> Json,
{
    values.iter().fold(initial, callback)
}
