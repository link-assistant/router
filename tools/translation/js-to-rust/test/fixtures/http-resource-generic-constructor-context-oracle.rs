//! Independent actual Rust generic constructor context oracle. Gated CI only.
fn raw<T>(value: T) -> T { value }
fn option<T>(value: Option<T>) -> Option<T> { value }
fn result<T>(value: Result<T, String>) -> Result<T, String> { value }
fn absent() -> Option<bool> { let value = raw::<Option<bool>>(None); value }
fn nested() -> Option<Option<bool>> {
    let value = option::<Option<bool>>(Some(None));
    value
}
fn success() -> Result<Option<bool>, String> {
    let value = result::<Option<bool>>(Ok(None));
    value
}
fn failure(error: String) -> Result<bool, String> {
    let value = result::<bool>(Err(error));
    value
}
fn nested_calls() -> Option<bool> { let value = raw::<Option<bool>>(raw(None)); value }
fn inferred() -> Option<bool> { raw(None) }
#[test]
fn actual_original_generic_contexts_preserve_empty_nested_and_error_values() {
    assert_eq!(absent(), None);
    assert_eq!(nested(), Some(None));
    assert_eq!(success(), Ok(None));
    assert_eq!(nested_calls(), None);
    assert_eq!(inferred(), None);
    for error in ["", "é😀", "\0"] {
        assert_eq!(failure(String::from(error)), Err(String::from(error)));
    }
}
