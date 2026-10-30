//! Independent actual shared generic identity caller oracle. Gated CI only.
use link_assistant_router::translation_owned_results_core::text_result_identity;
use link_assistant_router::translation_primitive_option_core::option_identity;
use std::cell::Cell;
fn optional<T>(value: Option<T>) -> Option<T> { option_identity(value) }
fn outcome<T>(value: Result<T, String>) -> Result<T, String> {
    let value = text_result_identity(value);
    text_result_identity(value)
}
#[test]
fn actual_native_library_callers_preserve_empty_error_and_numeric_edges() {
    assert_eq!(optional::<bool>(None), None);
    for value in [false, true] {
        assert_eq!(optional(Some(value)), Some(value));
        assert_eq!(outcome(Ok(value)), Ok(value));
    }
    assert_eq!(optional(Some(u64::MAX)), Some(u64::MAX));
    assert_eq!(outcome(Ok(i64::MIN)), Ok(i64::MIN));
    assert_eq!(outcome(Ok(Some(true))), Ok(Some(true)));
    for error in ["", "é😀", "\0"] {
        assert_eq!(outcome::<bool>(Err(String::from(error))), Err(String::from(error)));
    }
}
#[test]
fn actual_native_shared_callers_do_not_duplicate_observe_or_early_drop_payloads() {
    struct Counted<'a>(&'a Cell<usize>);
    impl Drop for Counted<'_> { fn drop(&mut self) { self.0.set(self.0.get() + 1); } }
    let drops = Cell::new(0);
    let value = optional(Some(Counted(&drops)));
    assert_eq!(drops.get(), 0);
    drop(value);
    assert_eq!(drops.get(), 1);
    let value = outcome(Ok(Counted(&drops)));
    assert_eq!(drops.get(), 1);
    drop(value);
    assert_eq!(drops.get(), 2);
    let error = outcome::<Counted<'_>>(Err(String::from("expected")));
    assert_eq!(drops.get(), 2);
    drop(error);
    assert_eq!(drops.get(), 2);
}
