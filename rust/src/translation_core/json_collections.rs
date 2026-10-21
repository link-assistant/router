//! Eager owned JSON collections. The library implementation stays native Rust.
use super::{Json, Maybe};

/// Visit shared inputs in order and collect one fresh owned result per input.
pub fn json_map<F>(values: &[Json], callback: F) -> ::std::vec::Vec<Json>
where
    F: FnMut(&Json) -> Json,
{
    values.iter().map(callback).collect()
}

/// Visit every shared input in order, retaining only owned `Some` payloads.
pub fn json_filter_map<F>(values: &[Json], callback: F) -> ::std::vec::Vec<Json>
where
    F: FnMut(&Json) -> Maybe<Json>,
{
    values.iter().filter_map(callback).collect()
}
