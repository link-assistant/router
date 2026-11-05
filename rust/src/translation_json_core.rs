//! Bounded canonical JSON boundary shared with the JavaScript adapter.
//!
//! These library internals remain native. The translator must bind the complete
//! actual module and canonical serde_json layout before selecting a caller.

/// Validate the same successful-resource envelope as the immutable JS adapter.
/// JSON depth counts the root as zero; map keys do not add Value nodes.
/// Rust strings/numbers retain serde_json's native canonical scalar invariants.
pub fn json_validate(value: &::serde_json::Value) {
    fn visit(value: &::serde_json::Value, depth: usize, nodes: &mut usize) {
        *nodes += 1;
        assert!(*nodes <= 4096 && depth <= 32, "bounded canonical JSON domain");
        match value {
            ::serde_json::Value::Array(items) => {
                assert!(items.len() <= 4096, "bounded dense JSON array");
                for item in items {
                    visit(item, depth + 1, nodes);
                }
            }
            ::serde_json::Value::Object(items) => {
                assert!(items.len() <= 4096, "bounded dense JSON object");
                for item in items.values() {
                    visit(item, depth + 1, nodes);
                }
            }
            _ => {}
        }
    }
    visit(value, 0, &mut 0);
}

/// Validate and copy one canonical JSON value into independent owned storage.
#[must_use]
pub fn json_checked_copy(value: &::serde_json::Value) -> ::serde_json::Value {
    json_validate(value);
    ::std::clone::Clone::clone(value)
}

/// Validate both borrowed inputs and the complete updated result before return.
#[must_use]
pub fn json_checked_with_field(
    base: &::serde_json::Value,
    key: &str,
    value: &::serde_json::Value,
) -> ::serde_json::Value {
    json_validate(base);
    json_validate(value);
    assert!(base.is_null() || base.is_object(), "owned JSON update needs object or null");
    let result = crate::translation_core::json_with_field(
        ::std::clone::Clone::clone(base),
        key,
        ::std::clone::Clone::clone(value),
    );
    json_validate(&result);
    result
}

/// Build canonical scalar values without invoking caller Serialize implementations.
#[must_use]
pub fn json_build_null() -> ::serde_json::Value {
    ::serde_json::Value::Null
}

#[must_use]
pub fn json_build_bool(value: bool) -> ::serde_json::Value {
    ::serde_json::Value::Bool(value)
}

#[must_use]
pub fn json_build_string(value: &str) -> ::serde_json::Value {
    ::serde_json::Value::String(::std::borrow::ToOwned::to_owned(value))
}

#[must_use]
pub fn json_build_u64(value: u64) -> ::serde_json::Value {
    ::serde_json::Value::from(value)
}

#[must_use]
pub fn json_build_i64(value: i64) -> ::serde_json::Value {
    ::serde_json::Value::from(value)
}

/// Move an owned canonical vector into a JSON array and validate its added root.
#[must_use]
pub fn json_build_array(value: ::std::vec::Vec<::serde_json::Value>) -> ::serde_json::Value {
    let result = ::serde_json::Value::Array(value);
    json_validate(&result);
    result
}

/// Empty objects can be populated through the checked shared field-update boundary.
#[must_use]
pub fn json_build_object() -> ::serde_json::Value {
    ::serde_json::Value::Object(::serde_json::Map::new())
}

/// Build an object in one insertion pass without repeated whole-object copies.
#[must_use]
pub fn json_build_fields(
    keys: &::serde_json::Value,
    values: ::std::vec::Vec<::serde_json::Value>,
) -> ::serde_json::Value {
    json_validate(keys);
    let values = ::serde_json::Value::Array(values);
    json_validate(&values);
    let keys = keys.as_array().expect("canonical object keys must be an array");
    let ::serde_json::Value::Array(values) = values else {
        unreachable!("known canonical array constructor");
    };
    assert_eq!(keys.len(), values.len(), "canonical object field arity");
    let mut result = ::serde_json::Map::new();
    for (key, value) in keys.iter().zip(values) {
        let key = key.as_str().expect("canonical object keys must be strings");
        assert!(!result.contains_key(key), "duplicate canonical object key");
        result.insert(::std::borrow::ToOwned::to_owned(key), value);
    }
    let result = ::serde_json::Value::Object(result);
    json_validate(&result);
    result
}

/// Preserve checked signed JSON construction from an actual unsigned source value.
#[must_use]
pub fn json_build_i64_unsigned(value: u64) -> ::serde_json::Value {
    let signed = <i64 as ::std::convert::TryFrom<u64>>::try_from(value)
        .expect("bounded signed JSON integer domain");
    ::serde_json::Value::from(signed)
}
