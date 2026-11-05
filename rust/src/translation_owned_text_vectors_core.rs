//! Bounded owned String Vec compatibility draft. Native internals stay untranslated.
//! Get/from-slice clone owned text; caller moves/shared loans need private checks.

use ::core::convert::TryFrom;

const MAX_OWNED_TEXT_VECTOR_VALUES: usize = 4096;

fn owned_text_vector_bound(length: usize) {
    assert!(length <= MAX_OWNED_TEXT_VECTOR_VALUES, "owned text vector resource bound");
}

fn owned_text_vector_length<T>(values: &[T]) -> ::core::primitive::u64 {
    owned_text_vector_bound(values.len());
    ::core::primitive::u64::try_from(values.len()).expect("owned text vector u64 length")
}

fn owned_text_vector_get<T: ::core::clone::Clone>(
    values: &[T],
    index: ::core::primitive::u64,
) -> ::core::option::Option<T> {
    owned_text_vector_bound(values.len());
    let Ok(index) = usize::try_from(index) else {
        return None;
    };
    values.get(index).cloned()
}

fn owned_text_vector_truncate<T>(
    mut values: ::std::vec::Vec<T>,
    length: ::core::primitive::u64,
) -> ::std::vec::Vec<T> {
    let current = owned_text_vector_length(&values);
    if length < current {
        values.truncate(usize::try_from(length).expect("bounded owned text vector length"));
    }
    values
}

fn owned_text_vector_replace<T>(
    mut values: ::std::vec::Vec<T>,
    index: ::core::primitive::u64,
    value: T,
) -> ::std::vec::Vec<T> {
    let length = owned_text_vector_length(&values);
    assert!(index < length, "owned text vector replacement index");
    let index = usize::try_from(index).expect("bounded owned text vector index");
    values[index] = value;
    values
}

pub fn vec_text_new() -> ::std::vec::Vec<::std::string::String> {
    ::std::vec::Vec::new()
}

pub fn vec_text_from_slice(
    values: &[::std::string::String],
) -> ::std::vec::Vec<::std::string::String> {
    owned_text_vector_bound(values.len());
    values.to_vec()
}

pub fn vec_text_push(
    mut values: ::std::vec::Vec<::std::string::String>,
    value: ::std::string::String,
) -> ::std::vec::Vec<::std::string::String> {
    owned_text_vector_bound(values.len());
    assert!(values.len() < MAX_OWNED_TEXT_VECTOR_VALUES, "owned text vector resource bound");
    values.push(value);
    values
}

pub fn vec_text_append(
    mut left: ::std::vec::Vec<::std::string::String>,
    mut right: ::std::vec::Vec<::std::string::String>,
) -> ::std::vec::Vec<::std::string::String> {
    owned_text_vector_bound(left.len());
    owned_text_vector_bound(right.len());
    assert!(
        right.len() <= MAX_OWNED_TEXT_VECTOR_VALUES - left.len(),
        "owned text vector resource bound"
    );
    left.append(&mut right);
    left
}

pub fn vec_text_truncate(
    values: ::std::vec::Vec<::std::string::String>,
    length: ::core::primitive::u64,
) -> ::std::vec::Vec<::std::string::String> {
    owned_text_vector_truncate(values, length)
}

pub fn vec_text_replace(
    values: ::std::vec::Vec<::std::string::String>,
    index: ::core::primitive::u64,
    value: ::std::string::String,
) -> ::std::vec::Vec<::std::string::String> {
    owned_text_vector_replace(values, index, value)
}

#[allow(clippy::ptr_arg)]
pub fn vec_text_len(values: &::std::vec::Vec<::std::string::String>) -> ::core::primitive::u64 {
    owned_text_vector_length(values)
}

#[allow(clippy::ptr_arg)]
pub fn vec_text_get(
    values: &::std::vec::Vec<::std::string::String>,
    index: ::core::primitive::u64,
) -> ::core::option::Option<::std::string::String> {
    owned_text_vector_get(values, index)
}

