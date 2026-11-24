//! Independent native explicit-call discard side effects, gated CI only.
#[test]
fn discarded_boolean_results_still_apply_the_real_native_cancellation_effect() {
    use link_assistant_router::translation_async_control_core as control;
    let value = control::cancel_new();
    assert!(!control::cancel_is_set(&value));
    let _ = control::cancel_set(&value);
    assert!(control::cancel_is_set(&value));
    let _ = control::cancel_set(&value);
    assert!(control::cancel_is_set(&value));
}
