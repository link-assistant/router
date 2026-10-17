//! Primitive types in the owned Rust/JavaScript compatibility interface.

/// A borrowed UTF-8 string slice, with ordinary Rust reference lifetimes.
///
/// The alias allocates no storage and does not transfer ownership. The checked
/// translation binds qualified references to its existing borrowed-text domain;
/// it does not translate the standard library implementation of `str`.
pub type Str = ::std::primitive::str;

/// JSON values use the registered immutable checked representation in translation.
/// The serde_json implementation remains an untranslated native dependency.
pub type Json = ::serde_json::Value;

/// Optional values retain Rust's ordinary variant, borrowing and Drop behavior.
pub type Maybe<T> = ::std::option::Option<T>;

/// Success and failure values retain both payloads and their ownership behavior.
pub type Outcome<T, E> = ::std::result::Result<T, E>;

/// Count Unicode scalar values, not UTF-8 bytes, UTF-16 units or graphemes.
/// The library iterator implementation remains intentionally untranslated.
#[must_use]
pub fn unicode_scalar_count(value: &Str) -> usize {
    value.chars().count()
}

/// Copy one canonical JSON value without sharing mutable storage.
/// Translation uses a bounded immutable deep copy (4096 nodes, depth 32).
#[must_use]
pub fn json_copy(value: &Json) -> Json {
    ::std::clone::Clone::clone(value)
}

/// Set a string key on an owned object (or promote Null to an object).
/// Non-object, non-null bases panic, matching serde_json string indexing.
/// Arguments evaluate once, left to right. Allocation/Drop internals remain
/// untranslated; translation admits bounded successful-resource projections.
#[must_use]
pub fn json_with_field(mut base: Json, key: &Str, value: Json) -> Json {
    base[key] = value;
    base
}

/// Read a string key; absent keys and non-object values return JSON Null.
/// The returned reference borrows only `value`, never the key.
#[must_use]
pub fn json_index_str<'a>(value: &'a Json, key: &Str) -> &'a Json {
    &value[key]
}

/// Read an array position; absent positions and non-arrays return JSON Null.
/// The returned reference borrows only `value`.
#[must_use]
pub fn json_index_usize<'a>(value: &'a Json, index: usize) -> &'a Json {
    &value[index]
}

/// Read an existing map entry, panicking when the key is absent.
/// This differs from Value indexing and never inserts an entry.
#[must_use]
pub fn json_map_index<'a>(
    value: &'a ::serde_json::Map<::std::string::String, Json>,
    key: &Str,
) -> &'a Json {
    &value[key]
}
