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
