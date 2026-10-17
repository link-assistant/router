//! Owned compatibility operations shared by Rust and checked translation.
//!
//! These library implementations are intentionally not translated. The
//! translator binds this complete facade and checks its supported operand domain.

mod primitives;
pub use self::primitives::{Json, Maybe, Outcome, Str};
pub use self::primitives::unicode_scalar_count;
pub use self::primitives::{json_copy, json_with_field};
pub use self::primitives::{json_index_str, json_index_usize, json_map_index};

mod json_collections;
pub use self::json_collections::{json_map, json_filter_map};

mod ranges;
pub use self::ranges::f64_inclusive_contains;

/// Owned UTF-8 text returned by the compatibility formatting operation.
pub type Text = ::std::string::String;

#[doc(hidden)]
#[macro_export]
macro_rules! __router_translation_core_format {
    ($($arguments:tt)*) => { ::std::format!($($arguments)*) };
}

/// Format through Rust's library; translation checks the primitive format subset.
pub use crate::__router_translation_core_format as format;

#[doc(hidden)]
#[macro_export]
macro_rules! __router_translation_core_json {
    ($($tokens:tt)*) => { ::serde_json::json!($($tokens)*) };
}

/// Construct JSON through the library; translation checks each supported value.
pub use crate::__router_translation_core_json as json;
