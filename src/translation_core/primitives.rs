//! Primitive types in the owned Rust/JavaScript compatibility interface.

/// A borrowed UTF-8 string slice, with ordinary Rust reference lifetimes.
///
/// The alias allocates no storage and does not transfer ownership. The checked
/// translation binds qualified references to its existing borrowed-text domain;
/// it does not translate the standard library implementation of `str`.
pub type Str = ::std::primitive::str;
