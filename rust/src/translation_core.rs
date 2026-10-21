//! Owned compatibility operations shared by Rust and checked translation.
//!
//! These library implementations are intentionally not translated. The
//! translator binds this complete facade and checks its supported operand domain.

mod primitives;
pub use self::primitives::{Json, Maybe, Outcome, Str};
pub use self::primitives::{unicode_scalar_count, ascii_chars_in};
pub use self::primitives::{json_copy, json_with_field};
pub use self::primitives::{json_parse, json_parse_bytes};
pub use self::primitives::{json_index_str, json_index_usize, json_map_index};

mod json_collections;
pub use self::json_collections::{json_map, json_filter_map};

mod ranges;
pub use self::ranges::f64_inclusive_contains;

mod base64;
pub use self::base64::{
    Base64Error, base64_standard_decode_owned_text, base64_standard_decode_text,
    base64_standard_encode_bytes, base64_standard_encode_owned_bytes, base64_standard_encode_text,
    base64_standard_no_pad_decode_text, base64_standard_no_pad_encode_text,
    base64_url_no_pad_decode_owned_text, base64_url_no_pad_decode_text,
    base64_url_no_pad_encode_array32, base64_url_no_pad_encode_bytes,
    base64_url_no_pad_encode_owned_bytes, base64_url_no_pad_encode_owned_text,
};

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

#[doc(hidden)]
#[macro_export]
macro_rules! __router_translation_core_vec {
    ($($arguments:tt)*) => { ::std::vec!($($arguments)*) };
}

/// Construct a vector through Rust; translation checks the bounded comma-list subset.
pub use crate::__router_translation_core_vec as vec;

#[doc(hidden)]
#[macro_export]
macro_rules! __router_translation_core_matches {
    ($($arguments:tt)*) => { ::std::matches!($($arguments)*) };
}

/// Test scalar literal patterns; translation checks every subject and alternative.
pub use crate::__router_translation_core_matches as matches;

/// Test checked Copy/no-Drop unit-enum constructors; library internals stay native.
pub use crate::__router_translation_core_matches as matches_unit;
