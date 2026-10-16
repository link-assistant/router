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
