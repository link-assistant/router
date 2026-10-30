//! Independent actual shared generic Result ABI oracle. Gated CI only.
use link_assistant_router::translation_owned_results_core::text_result_identity;
use std::cell::Cell;

#[test]
fn actual_generic_library_retains_success_values_and_exact_owned_string_errors() {
    for value in [false, true] { assert_eq!(text_result_identity(Ok(value)), Ok(value)); }
    assert_eq!(text_result_identity(Ok(u64::MAX)), Ok(u64::MAX));
    assert_eq!(text_result_identity(Ok(i64::MIN)), Ok(i64::MIN));
    assert_eq!(text_result_identity(Ok(String::from("é😀"))), Ok(String::from("é😀")));
    for message in ["", "é😀", "\0"] {
        assert_eq!(text_result_identity::<bool>(Err(String::from(message))), Err(String::from(message)));
    }
}

#[test]
fn generic_success_moves_opaque_payloads_without_early_or_duplicate_drop() {
    struct Counted<'a>(&'a Cell<usize>);
    impl Drop for Counted<'_> {
        fn drop(&mut self) { self.0.set(self.0.get() + 1); }
    }
    let drops = Cell::new(0);
    let result = text_result_identity(Ok(Counted(&drops)));
    assert_eq!(drops.get(), 0);
    drop(result);
    assert_eq!(drops.get(), 1);
    let error = text_result_identity::<Counted<'_>>(Err(String::from("expected")));
    assert_eq!(drops.get(), 1);
    assert!(error.is_err());
    drop(error);
    assert_eq!(drops.get(), 1);
}
