//! Primitive sequence compatibility operations. Library internals remain native.
//! This draft is compiled by its CI-only integration oracle; root activation is separate.
use ::core::convert::TryFrom;

fn primitive_sequence_length<T>(values: &[T]) -> ::core::primitive::u64 {
    ::core::primitive::u64::try_from(values.len()).expect("Primitive sequence length exceeds u64")
}

fn primitive_sequence_get<T: ::core::marker::Copy>(
    values: &[T],
    index: ::core::primitive::u64,
) -> ::core::option::Option<T> {
    ::core::primitive::usize::try_from(index)
        .ok()
        .and_then(|at| values.get(at))
        .copied()
}

#[must_use]
pub fn slice_bool_len(values: &[::core::primitive::bool]) -> ::core::primitive::u64 {
    primitive_sequence_length(values)
}

#[must_use]
pub fn slice_bool_is_empty(values: &[::core::primitive::bool]) -> ::core::primitive::bool {
    values.is_empty()
}

#[must_use]
pub fn slice_bool_get(
    values: &[::core::primitive::bool],
    index: ::core::primitive::u64,
) -> ::core::option::Option<::core::primitive::bool> {
    primitive_sequence_get(values, index)
}

#[must_use]
pub fn slice_u8_len(values: &[::core::primitive::u8]) -> ::core::primitive::u64 {
    primitive_sequence_length(values)
}

#[must_use]
pub fn slice_u8_is_empty(values: &[::core::primitive::u8]) -> ::core::primitive::bool {
    values.is_empty()
}

#[must_use]
pub fn slice_u8_get(
    values: &[::core::primitive::u8],
    index: ::core::primitive::u64,
) -> ::core::option::Option<::core::primitive::u8> {
    primitive_sequence_get(values, index)
}

#[must_use]
pub fn slice_i8_len(values: &[::core::primitive::i8]) -> ::core::primitive::u64 {
    primitive_sequence_length(values)
}

#[must_use]
pub fn slice_i8_is_empty(values: &[::core::primitive::i8]) -> ::core::primitive::bool {
    values.is_empty()
}

#[must_use]
pub fn slice_i8_get(
    values: &[::core::primitive::i8],
    index: ::core::primitive::u64,
) -> ::core::option::Option<::core::primitive::i8> {
    primitive_sequence_get(values, index)
}

#[must_use]
pub fn slice_u16_len(values: &[::core::primitive::u16]) -> ::core::primitive::u64 {
    primitive_sequence_length(values)
}

#[must_use]
pub fn slice_u16_is_empty(values: &[::core::primitive::u16]) -> ::core::primitive::bool {
    values.is_empty()
}

#[must_use]
pub fn slice_u16_get(
    values: &[::core::primitive::u16],
    index: ::core::primitive::u64,
) -> ::core::option::Option<::core::primitive::u16> {
    primitive_sequence_get(values, index)
}

#[must_use]
pub fn slice_i16_len(values: &[::core::primitive::i16]) -> ::core::primitive::u64 {
    primitive_sequence_length(values)
}

#[must_use]
pub fn slice_i16_is_empty(values: &[::core::primitive::i16]) -> ::core::primitive::bool {
    values.is_empty()
}

#[must_use]
pub fn slice_i16_get(
    values: &[::core::primitive::i16],
    index: ::core::primitive::u64,
) -> ::core::option::Option<::core::primitive::i16> {
    primitive_sequence_get(values, index)
}

#[must_use]
pub fn slice_u32_len(values: &[::core::primitive::u32]) -> ::core::primitive::u64 {
    primitive_sequence_length(values)
}

#[must_use]
pub fn slice_u32_is_empty(values: &[::core::primitive::u32]) -> ::core::primitive::bool {
    values.is_empty()
}

#[must_use]
pub fn slice_u32_get(
    values: &[::core::primitive::u32],
    index: ::core::primitive::u64,
) -> ::core::option::Option<::core::primitive::u32> {
    primitive_sequence_get(values, index)
}

#[must_use]
pub fn slice_i32_len(values: &[::core::primitive::i32]) -> ::core::primitive::u64 {
    primitive_sequence_length(values)
}

#[must_use]
pub fn slice_i32_is_empty(values: &[::core::primitive::i32]) -> ::core::primitive::bool {
    values.is_empty()
}

#[must_use]
pub fn slice_i32_get(
    values: &[::core::primitive::i32],
    index: ::core::primitive::u64,
) -> ::core::option::Option<::core::primitive::i32> {
    primitive_sequence_get(values, index)
}

#[must_use]
pub fn slice_u64_len(values: &[::core::primitive::u64]) -> ::core::primitive::u64 {
    primitive_sequence_length(values)
}

#[must_use]
pub fn slice_u64_is_empty(values: &[::core::primitive::u64]) -> ::core::primitive::bool {
    values.is_empty()
}

#[must_use]
pub fn slice_u64_get(
    values: &[::core::primitive::u64],
    index: ::core::primitive::u64,
) -> ::core::option::Option<::core::primitive::u64> {
    primitive_sequence_get(values, index)
}

#[must_use]
pub fn slice_i64_len(values: &[::core::primitive::i64]) -> ::core::primitive::u64 {
    primitive_sequence_length(values)
}

#[must_use]
pub fn slice_i64_is_empty(values: &[::core::primitive::i64]) -> ::core::primitive::bool {
    values.is_empty()
}

#[must_use]
pub fn slice_i64_get(
    values: &[::core::primitive::i64],
    index: ::core::primitive::u64,
) -> ::core::option::Option<::core::primitive::i64> {
    primitive_sequence_get(values, index)
}

#[must_use]
pub fn slice_u128_len(values: &[::core::primitive::u128]) -> ::core::primitive::u64 {
    primitive_sequence_length(values)
}

#[must_use]
pub fn slice_u128_is_empty(values: &[::core::primitive::u128]) -> ::core::primitive::bool {
    values.is_empty()
}

#[must_use]
pub fn slice_u128_get(
    values: &[::core::primitive::u128],
    index: ::core::primitive::u64,
) -> ::core::option::Option<::core::primitive::u128> {
    primitive_sequence_get(values, index)
}

#[must_use]
pub fn slice_i128_len(values: &[::core::primitive::i128]) -> ::core::primitive::u64 {
    primitive_sequence_length(values)
}

#[must_use]
pub fn slice_i128_is_empty(values: &[::core::primitive::i128]) -> ::core::primitive::bool {
    values.is_empty()
}

#[must_use]
pub fn slice_i128_get(
    values: &[::core::primitive::i128],
    index: ::core::primitive::u64,
) -> ::core::option::Option<::core::primitive::i128> {
    primitive_sequence_get(values, index)
}
