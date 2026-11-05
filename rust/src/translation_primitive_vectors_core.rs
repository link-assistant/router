//! Bounded owned primitive Vec compatibility operations.
//! Library internals remain intentionally untranslated. Callers must retain
//! their actual source-bound moves, shared loans and primitive domains.

use ::core::convert::TryFrom;

const MAX_PRIMITIVE_VECTOR_VALUES: usize = 4096;

fn primitive_vector_bound(length: usize) {
    assert!(length <= MAX_PRIMITIVE_VECTOR_VALUES, "primitive vector resource bound");
}

fn primitive_vector_length<T>(values: &[T]) -> ::core::primitive::u64 {
    primitive_vector_bound(values.len());
    ::core::primitive::u64::try_from(values.len()).expect("primitive vector u64 length")
}

fn primitive_vector_get<T: ::core::marker::Copy>(
    values: &[T],
    index: ::core::primitive::u64,
) -> ::core::option::Option<T> {
    primitive_vector_bound(values.len());
    let Ok(index) = usize::try_from(index) else {
        return None;
    };
    values.get(index).copied()
}

fn primitive_vector_truncate<T>(
    mut values: ::std::vec::Vec<T>,
    length: ::core::primitive::u64,
) -> ::std::vec::Vec<T> {
    let current = primitive_vector_length(&values);
    if length < current {
        values.truncate(usize::try_from(length).expect("bounded primitive vector length"));
    }
    values
}

fn primitive_vector_replace<T>(
    mut values: ::std::vec::Vec<T>,
    index: ::core::primitive::u64,
    value: T,
) -> ::std::vec::Vec<T> {
    let length = primitive_vector_length(&values);
    assert!(index < length, "primitive vector replacement index");
    let index = usize::try_from(index).expect("bounded primitive vector index");
    values[index] = value;
    values
}

pub fn vec_bool_new() -> ::std::vec::Vec<::core::primitive::bool> {
    ::std::vec::Vec::new()
}

pub fn vec_bool_from_slice(
    values: &[::core::primitive::bool],
) -> ::std::vec::Vec<::core::primitive::bool> {
    primitive_vector_bound(values.len());
    values.to_vec()
}

pub fn vec_bool_push(
    mut values: ::std::vec::Vec<::core::primitive::bool>,
    value: ::core::primitive::bool,
) -> ::std::vec::Vec<::core::primitive::bool> {
    primitive_vector_bound(values.len());
    assert!(values.len() < MAX_PRIMITIVE_VECTOR_VALUES, "primitive vector resource bound");
    values.push(value);
    values
}

pub fn vec_bool_append(
    mut left: ::std::vec::Vec<::core::primitive::bool>,
    mut right: ::std::vec::Vec<::core::primitive::bool>,
) -> ::std::vec::Vec<::core::primitive::bool> {
    primitive_vector_bound(left.len());
    primitive_vector_bound(right.len());
    assert!(
        right.len() <= MAX_PRIMITIVE_VECTOR_VALUES - left.len(),
        "primitive vector resource bound"
    );
    left.append(&mut right);
    left
}

pub fn vec_bool_truncate(
    values: ::std::vec::Vec<::core::primitive::bool>,
    length: ::core::primitive::u64,
) -> ::std::vec::Vec<::core::primitive::bool> {
    primitive_vector_truncate(values, length)
}

pub fn vec_bool_replace(
    values: ::std::vec::Vec<::core::primitive::bool>,
    index: ::core::primitive::u64,
    value: ::core::primitive::bool,
) -> ::std::vec::Vec<::core::primitive::bool> {
    primitive_vector_replace(values, index, value)
}

#[allow(clippy::ptr_arg)]
pub fn vec_bool_len(values: &::std::vec::Vec<::core::primitive::bool>) -> ::core::primitive::u64 {
    primitive_vector_length(values)
}

#[allow(clippy::ptr_arg)]
pub fn vec_bool_get(
    values: &::std::vec::Vec<::core::primitive::bool>,
    index: ::core::primitive::u64,
) -> ::core::option::Option<::core::primitive::bool> {
    primitive_vector_get(values, index)
}

pub fn vec_u8_new() -> ::std::vec::Vec<::core::primitive::u8> {
    ::std::vec::Vec::new()
}

pub fn vec_u8_from_slice(
    values: &[::core::primitive::u8],
) -> ::std::vec::Vec<::core::primitive::u8> {
    primitive_vector_bound(values.len());
    values.to_vec()
}

pub fn vec_u8_push(
    mut values: ::std::vec::Vec<::core::primitive::u8>,
    value: ::core::primitive::u8,
) -> ::std::vec::Vec<::core::primitive::u8> {
    primitive_vector_bound(values.len());
    assert!(values.len() < MAX_PRIMITIVE_VECTOR_VALUES, "primitive vector resource bound");
    values.push(value);
    values
}

pub fn vec_u8_append(
    mut left: ::std::vec::Vec<::core::primitive::u8>,
    mut right: ::std::vec::Vec<::core::primitive::u8>,
) -> ::std::vec::Vec<::core::primitive::u8> {
    primitive_vector_bound(left.len());
    primitive_vector_bound(right.len());
    assert!(
        right.len() <= MAX_PRIMITIVE_VECTOR_VALUES - left.len(),
        "primitive vector resource bound"
    );
    left.append(&mut right);
    left
}

pub fn vec_u8_truncate(
    values: ::std::vec::Vec<::core::primitive::u8>,
    length: ::core::primitive::u64,
) -> ::std::vec::Vec<::core::primitive::u8> {
    primitive_vector_truncate(values, length)
}

pub fn vec_u8_replace(
    values: ::std::vec::Vec<::core::primitive::u8>,
    index: ::core::primitive::u64,
    value: ::core::primitive::u8,
) -> ::std::vec::Vec<::core::primitive::u8> {
    primitive_vector_replace(values, index, value)
}

#[allow(clippy::ptr_arg)]
pub fn vec_u8_len(values: &::std::vec::Vec<::core::primitive::u8>) -> ::core::primitive::u64 {
    primitive_vector_length(values)
}

#[allow(clippy::ptr_arg)]
pub fn vec_u8_get(
    values: &::std::vec::Vec<::core::primitive::u8>,
    index: ::core::primitive::u64,
) -> ::core::option::Option<::core::primitive::u8> {
    primitive_vector_get(values, index)
}

pub fn vec_i8_new() -> ::std::vec::Vec<::core::primitive::i8> {
    ::std::vec::Vec::new()
}

pub fn vec_i8_from_slice(
    values: &[::core::primitive::i8],
) -> ::std::vec::Vec<::core::primitive::i8> {
    primitive_vector_bound(values.len());
    values.to_vec()
}

pub fn vec_i8_push(
    mut values: ::std::vec::Vec<::core::primitive::i8>,
    value: ::core::primitive::i8,
) -> ::std::vec::Vec<::core::primitive::i8> {
    primitive_vector_bound(values.len());
    assert!(values.len() < MAX_PRIMITIVE_VECTOR_VALUES, "primitive vector resource bound");
    values.push(value);
    values
}

pub fn vec_i8_append(
    mut left: ::std::vec::Vec<::core::primitive::i8>,
    mut right: ::std::vec::Vec<::core::primitive::i8>,
) -> ::std::vec::Vec<::core::primitive::i8> {
    primitive_vector_bound(left.len());
    primitive_vector_bound(right.len());
    assert!(
        right.len() <= MAX_PRIMITIVE_VECTOR_VALUES - left.len(),
        "primitive vector resource bound"
    );
    left.append(&mut right);
    left
}

pub fn vec_i8_truncate(
    values: ::std::vec::Vec<::core::primitive::i8>,
    length: ::core::primitive::u64,
) -> ::std::vec::Vec<::core::primitive::i8> {
    primitive_vector_truncate(values, length)
}

pub fn vec_i8_replace(
    values: ::std::vec::Vec<::core::primitive::i8>,
    index: ::core::primitive::u64,
    value: ::core::primitive::i8,
) -> ::std::vec::Vec<::core::primitive::i8> {
    primitive_vector_replace(values, index, value)
}

#[allow(clippy::ptr_arg)]
pub fn vec_i8_len(values: &::std::vec::Vec<::core::primitive::i8>) -> ::core::primitive::u64 {
    primitive_vector_length(values)
}

#[allow(clippy::ptr_arg)]
pub fn vec_i8_get(
    values: &::std::vec::Vec<::core::primitive::i8>,
    index: ::core::primitive::u64,
) -> ::core::option::Option<::core::primitive::i8> {
    primitive_vector_get(values, index)
}

pub fn vec_u16_new() -> ::std::vec::Vec<::core::primitive::u16> {
    ::std::vec::Vec::new()
}

pub fn vec_u16_from_slice(
    values: &[::core::primitive::u16],
) -> ::std::vec::Vec<::core::primitive::u16> {
    primitive_vector_bound(values.len());
    values.to_vec()
}

pub fn vec_u16_push(
    mut values: ::std::vec::Vec<::core::primitive::u16>,
    value: ::core::primitive::u16,
) -> ::std::vec::Vec<::core::primitive::u16> {
    primitive_vector_bound(values.len());
    assert!(values.len() < MAX_PRIMITIVE_VECTOR_VALUES, "primitive vector resource bound");
    values.push(value);
    values
}

pub fn vec_u16_append(
    mut left: ::std::vec::Vec<::core::primitive::u16>,
    mut right: ::std::vec::Vec<::core::primitive::u16>,
) -> ::std::vec::Vec<::core::primitive::u16> {
    primitive_vector_bound(left.len());
    primitive_vector_bound(right.len());
    assert!(
        right.len() <= MAX_PRIMITIVE_VECTOR_VALUES - left.len(),
        "primitive vector resource bound"
    );
    left.append(&mut right);
    left
}

pub fn vec_u16_truncate(
    values: ::std::vec::Vec<::core::primitive::u16>,
    length: ::core::primitive::u64,
) -> ::std::vec::Vec<::core::primitive::u16> {
    primitive_vector_truncate(values, length)
}

pub fn vec_u16_replace(
    values: ::std::vec::Vec<::core::primitive::u16>,
    index: ::core::primitive::u64,
    value: ::core::primitive::u16,
) -> ::std::vec::Vec<::core::primitive::u16> {
    primitive_vector_replace(values, index, value)
}

#[allow(clippy::ptr_arg)]
pub fn vec_u16_len(values: &::std::vec::Vec<::core::primitive::u16>) -> ::core::primitive::u64 {
    primitive_vector_length(values)
}

#[allow(clippy::ptr_arg)]
pub fn vec_u16_get(
    values: &::std::vec::Vec<::core::primitive::u16>,
    index: ::core::primitive::u64,
) -> ::core::option::Option<::core::primitive::u16> {
    primitive_vector_get(values, index)
}

pub fn vec_i16_new() -> ::std::vec::Vec<::core::primitive::i16> {
    ::std::vec::Vec::new()
}

pub fn vec_i16_from_slice(
    values: &[::core::primitive::i16],
) -> ::std::vec::Vec<::core::primitive::i16> {
    primitive_vector_bound(values.len());
    values.to_vec()
}

pub fn vec_i16_push(
    mut values: ::std::vec::Vec<::core::primitive::i16>,
    value: ::core::primitive::i16,
) -> ::std::vec::Vec<::core::primitive::i16> {
    primitive_vector_bound(values.len());
    assert!(values.len() < MAX_PRIMITIVE_VECTOR_VALUES, "primitive vector resource bound");
    values.push(value);
    values
}

pub fn vec_i16_append(
    mut left: ::std::vec::Vec<::core::primitive::i16>,
    mut right: ::std::vec::Vec<::core::primitive::i16>,
) -> ::std::vec::Vec<::core::primitive::i16> {
    primitive_vector_bound(left.len());
    primitive_vector_bound(right.len());
    assert!(
        right.len() <= MAX_PRIMITIVE_VECTOR_VALUES - left.len(),
        "primitive vector resource bound"
    );
    left.append(&mut right);
    left
}

pub fn vec_i16_truncate(
    values: ::std::vec::Vec<::core::primitive::i16>,
    length: ::core::primitive::u64,
) -> ::std::vec::Vec<::core::primitive::i16> {
    primitive_vector_truncate(values, length)
}

pub fn vec_i16_replace(
    values: ::std::vec::Vec<::core::primitive::i16>,
    index: ::core::primitive::u64,
    value: ::core::primitive::i16,
) -> ::std::vec::Vec<::core::primitive::i16> {
    primitive_vector_replace(values, index, value)
}

#[allow(clippy::ptr_arg)]
pub fn vec_i16_len(values: &::std::vec::Vec<::core::primitive::i16>) -> ::core::primitive::u64 {
    primitive_vector_length(values)
}

#[allow(clippy::ptr_arg)]
pub fn vec_i16_get(
    values: &::std::vec::Vec<::core::primitive::i16>,
    index: ::core::primitive::u64,
) -> ::core::option::Option<::core::primitive::i16> {
    primitive_vector_get(values, index)
}

pub fn vec_u32_new() -> ::std::vec::Vec<::core::primitive::u32> {
    ::std::vec::Vec::new()
}

pub fn vec_u32_from_slice(
    values: &[::core::primitive::u32],
) -> ::std::vec::Vec<::core::primitive::u32> {
    primitive_vector_bound(values.len());
    values.to_vec()
}

pub fn vec_u32_push(
    mut values: ::std::vec::Vec<::core::primitive::u32>,
    value: ::core::primitive::u32,
) -> ::std::vec::Vec<::core::primitive::u32> {
    primitive_vector_bound(values.len());
    assert!(values.len() < MAX_PRIMITIVE_VECTOR_VALUES, "primitive vector resource bound");
    values.push(value);
    values
}

pub fn vec_u32_append(
    mut left: ::std::vec::Vec<::core::primitive::u32>,
    mut right: ::std::vec::Vec<::core::primitive::u32>,
) -> ::std::vec::Vec<::core::primitive::u32> {
    primitive_vector_bound(left.len());
    primitive_vector_bound(right.len());
    assert!(
        right.len() <= MAX_PRIMITIVE_VECTOR_VALUES - left.len(),
        "primitive vector resource bound"
    );
    left.append(&mut right);
    left
}

pub fn vec_u32_truncate(
    values: ::std::vec::Vec<::core::primitive::u32>,
    length: ::core::primitive::u64,
) -> ::std::vec::Vec<::core::primitive::u32> {
    primitive_vector_truncate(values, length)
}

pub fn vec_u32_replace(
    values: ::std::vec::Vec<::core::primitive::u32>,
    index: ::core::primitive::u64,
    value: ::core::primitive::u32,
) -> ::std::vec::Vec<::core::primitive::u32> {
    primitive_vector_replace(values, index, value)
}

#[allow(clippy::ptr_arg)]
pub fn vec_u32_len(values: &::std::vec::Vec<::core::primitive::u32>) -> ::core::primitive::u64 {
    primitive_vector_length(values)
}

#[allow(clippy::ptr_arg)]
pub fn vec_u32_get(
    values: &::std::vec::Vec<::core::primitive::u32>,
    index: ::core::primitive::u64,
) -> ::core::option::Option<::core::primitive::u32> {
    primitive_vector_get(values, index)
}

pub fn vec_i32_new() -> ::std::vec::Vec<::core::primitive::i32> {
    ::std::vec::Vec::new()
}

pub fn vec_i32_from_slice(
    values: &[::core::primitive::i32],
) -> ::std::vec::Vec<::core::primitive::i32> {
    primitive_vector_bound(values.len());
    values.to_vec()
}

pub fn vec_i32_push(
    mut values: ::std::vec::Vec<::core::primitive::i32>,
    value: ::core::primitive::i32,
) -> ::std::vec::Vec<::core::primitive::i32> {
    primitive_vector_bound(values.len());
    assert!(values.len() < MAX_PRIMITIVE_VECTOR_VALUES, "primitive vector resource bound");
    values.push(value);
    values
}

pub fn vec_i32_append(
    mut left: ::std::vec::Vec<::core::primitive::i32>,
    mut right: ::std::vec::Vec<::core::primitive::i32>,
) -> ::std::vec::Vec<::core::primitive::i32> {
    primitive_vector_bound(left.len());
    primitive_vector_bound(right.len());
    assert!(
        right.len() <= MAX_PRIMITIVE_VECTOR_VALUES - left.len(),
        "primitive vector resource bound"
    );
    left.append(&mut right);
    left
}

pub fn vec_i32_truncate(
    values: ::std::vec::Vec<::core::primitive::i32>,
    length: ::core::primitive::u64,
) -> ::std::vec::Vec<::core::primitive::i32> {
    primitive_vector_truncate(values, length)
}

pub fn vec_i32_replace(
    values: ::std::vec::Vec<::core::primitive::i32>,
    index: ::core::primitive::u64,
    value: ::core::primitive::i32,
) -> ::std::vec::Vec<::core::primitive::i32> {
    primitive_vector_replace(values, index, value)
}

#[allow(clippy::ptr_arg)]
pub fn vec_i32_len(values: &::std::vec::Vec<::core::primitive::i32>) -> ::core::primitive::u64 {
    primitive_vector_length(values)
}

#[allow(clippy::ptr_arg)]
pub fn vec_i32_get(
    values: &::std::vec::Vec<::core::primitive::i32>,
    index: ::core::primitive::u64,
) -> ::core::option::Option<::core::primitive::i32> {
    primitive_vector_get(values, index)
}

pub fn vec_u64_new() -> ::std::vec::Vec<::core::primitive::u64> {
    ::std::vec::Vec::new()
}

pub fn vec_u64_from_slice(
    values: &[::core::primitive::u64],
) -> ::std::vec::Vec<::core::primitive::u64> {
    primitive_vector_bound(values.len());
    values.to_vec()
}

pub fn vec_u64_push(
    mut values: ::std::vec::Vec<::core::primitive::u64>,
    value: ::core::primitive::u64,
) -> ::std::vec::Vec<::core::primitive::u64> {
    primitive_vector_bound(values.len());
    assert!(values.len() < MAX_PRIMITIVE_VECTOR_VALUES, "primitive vector resource bound");
    values.push(value);
    values
}

pub fn vec_u64_append(
    mut left: ::std::vec::Vec<::core::primitive::u64>,
    mut right: ::std::vec::Vec<::core::primitive::u64>,
) -> ::std::vec::Vec<::core::primitive::u64> {
    primitive_vector_bound(left.len());
    primitive_vector_bound(right.len());
    assert!(
        right.len() <= MAX_PRIMITIVE_VECTOR_VALUES - left.len(),
        "primitive vector resource bound"
    );
    left.append(&mut right);
    left
}

pub fn vec_u64_truncate(
    values: ::std::vec::Vec<::core::primitive::u64>,
    length: ::core::primitive::u64,
) -> ::std::vec::Vec<::core::primitive::u64> {
    primitive_vector_truncate(values, length)
}

pub fn vec_u64_replace(
    values: ::std::vec::Vec<::core::primitive::u64>,
    index: ::core::primitive::u64,
    value: ::core::primitive::u64,
) -> ::std::vec::Vec<::core::primitive::u64> {
    primitive_vector_replace(values, index, value)
}

#[allow(clippy::ptr_arg)]
pub fn vec_u64_len(values: &::std::vec::Vec<::core::primitive::u64>) -> ::core::primitive::u64 {
    primitive_vector_length(values)
}

#[allow(clippy::ptr_arg)]
pub fn vec_u64_get(
    values: &::std::vec::Vec<::core::primitive::u64>,
    index: ::core::primitive::u64,
) -> ::core::option::Option<::core::primitive::u64> {
    primitive_vector_get(values, index)
}

pub fn vec_i64_new() -> ::std::vec::Vec<::core::primitive::i64> {
    ::std::vec::Vec::new()
}

pub fn vec_i64_from_slice(
    values: &[::core::primitive::i64],
) -> ::std::vec::Vec<::core::primitive::i64> {
    primitive_vector_bound(values.len());
    values.to_vec()
}

pub fn vec_i64_push(
    mut values: ::std::vec::Vec<::core::primitive::i64>,
    value: ::core::primitive::i64,
) -> ::std::vec::Vec<::core::primitive::i64> {
    primitive_vector_bound(values.len());
    assert!(values.len() < MAX_PRIMITIVE_VECTOR_VALUES, "primitive vector resource bound");
    values.push(value);
    values
}

pub fn vec_i64_append(
    mut left: ::std::vec::Vec<::core::primitive::i64>,
    mut right: ::std::vec::Vec<::core::primitive::i64>,
) -> ::std::vec::Vec<::core::primitive::i64> {
    primitive_vector_bound(left.len());
    primitive_vector_bound(right.len());
    assert!(
        right.len() <= MAX_PRIMITIVE_VECTOR_VALUES - left.len(),
        "primitive vector resource bound"
    );
    left.append(&mut right);
    left
}

pub fn vec_i64_truncate(
    values: ::std::vec::Vec<::core::primitive::i64>,
    length: ::core::primitive::u64,
) -> ::std::vec::Vec<::core::primitive::i64> {
    primitive_vector_truncate(values, length)
}

pub fn vec_i64_replace(
    values: ::std::vec::Vec<::core::primitive::i64>,
    index: ::core::primitive::u64,
    value: ::core::primitive::i64,
) -> ::std::vec::Vec<::core::primitive::i64> {
    primitive_vector_replace(values, index, value)
}

#[allow(clippy::ptr_arg)]
pub fn vec_i64_len(values: &::std::vec::Vec<::core::primitive::i64>) -> ::core::primitive::u64 {
    primitive_vector_length(values)
}

#[allow(clippy::ptr_arg)]
pub fn vec_i64_get(
    values: &::std::vec::Vec<::core::primitive::i64>,
    index: ::core::primitive::u64,
) -> ::core::option::Option<::core::primitive::i64> {
    primitive_vector_get(values, index)
}

pub fn vec_u128_new() -> ::std::vec::Vec<::core::primitive::u128> {
    ::std::vec::Vec::new()
}

pub fn vec_u128_from_slice(
    values: &[::core::primitive::u128],
) -> ::std::vec::Vec<::core::primitive::u128> {
    primitive_vector_bound(values.len());
    values.to_vec()
}

pub fn vec_u128_push(
    mut values: ::std::vec::Vec<::core::primitive::u128>,
    value: ::core::primitive::u128,
) -> ::std::vec::Vec<::core::primitive::u128> {
    primitive_vector_bound(values.len());
    assert!(values.len() < MAX_PRIMITIVE_VECTOR_VALUES, "primitive vector resource bound");
    values.push(value);
    values
}

pub fn vec_u128_append(
    mut left: ::std::vec::Vec<::core::primitive::u128>,
    mut right: ::std::vec::Vec<::core::primitive::u128>,
) -> ::std::vec::Vec<::core::primitive::u128> {
    primitive_vector_bound(left.len());
    primitive_vector_bound(right.len());
    assert!(
        right.len() <= MAX_PRIMITIVE_VECTOR_VALUES - left.len(),
        "primitive vector resource bound"
    );
    left.append(&mut right);
    left
}

pub fn vec_u128_truncate(
    values: ::std::vec::Vec<::core::primitive::u128>,
    length: ::core::primitive::u64,
) -> ::std::vec::Vec<::core::primitive::u128> {
    primitive_vector_truncate(values, length)
}

pub fn vec_u128_replace(
    values: ::std::vec::Vec<::core::primitive::u128>,
    index: ::core::primitive::u64,
    value: ::core::primitive::u128,
) -> ::std::vec::Vec<::core::primitive::u128> {
    primitive_vector_replace(values, index, value)
}

#[allow(clippy::ptr_arg)]
pub fn vec_u128_len(values: &::std::vec::Vec<::core::primitive::u128>) -> ::core::primitive::u64 {
    primitive_vector_length(values)
}

#[allow(clippy::ptr_arg)]
pub fn vec_u128_get(
    values: &::std::vec::Vec<::core::primitive::u128>,
    index: ::core::primitive::u64,
) -> ::core::option::Option<::core::primitive::u128> {
    primitive_vector_get(values, index)
}

pub fn vec_i128_new() -> ::std::vec::Vec<::core::primitive::i128> {
    ::std::vec::Vec::new()
}

pub fn vec_i128_from_slice(
    values: &[::core::primitive::i128],
) -> ::std::vec::Vec<::core::primitive::i128> {
    primitive_vector_bound(values.len());
    values.to_vec()
}

pub fn vec_i128_push(
    mut values: ::std::vec::Vec<::core::primitive::i128>,
    value: ::core::primitive::i128,
) -> ::std::vec::Vec<::core::primitive::i128> {
    primitive_vector_bound(values.len());
    assert!(values.len() < MAX_PRIMITIVE_VECTOR_VALUES, "primitive vector resource bound");
    values.push(value);
    values
}

pub fn vec_i128_append(
    mut left: ::std::vec::Vec<::core::primitive::i128>,
    mut right: ::std::vec::Vec<::core::primitive::i128>,
) -> ::std::vec::Vec<::core::primitive::i128> {
    primitive_vector_bound(left.len());
    primitive_vector_bound(right.len());
    assert!(
        right.len() <= MAX_PRIMITIVE_VECTOR_VALUES - left.len(),
        "primitive vector resource bound"
    );
    left.append(&mut right);
    left
}

pub fn vec_i128_truncate(
    values: ::std::vec::Vec<::core::primitive::i128>,
    length: ::core::primitive::u64,
) -> ::std::vec::Vec<::core::primitive::i128> {
    primitive_vector_truncate(values, length)
}

pub fn vec_i128_replace(
    values: ::std::vec::Vec<::core::primitive::i128>,
    index: ::core::primitive::u64,
    value: ::core::primitive::i128,
) -> ::std::vec::Vec<::core::primitive::i128> {
    primitive_vector_replace(values, index, value)
}

#[allow(clippy::ptr_arg)]
pub fn vec_i128_len(values: &::std::vec::Vec<::core::primitive::i128>) -> ::core::primitive::u64 {
    primitive_vector_length(values)
}

#[allow(clippy::ptr_arg)]
pub fn vec_i128_get(
    values: &::std::vec::Vec<::core::primitive::i128>,
    index: ::core::primitive::u64,
) -> ::core::option::Option<::core::primitive::i128> {
    primitive_vector_get(values, index)
}

