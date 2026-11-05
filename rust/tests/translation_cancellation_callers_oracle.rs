// Independent synchronous resource oracle source. Execute only in gated CI.
use link_assistant_router::translation_async_control_core as control;

#[test]
fn owned_move_shared_clone_and_idempotent_signal() {
    let original = control::cancel_new();
    assert!(!control::cancel_is_set(&original));
    let copy = control::cancel_clone(&original);
    assert!(control::cancel_set(&copy));
    assert!(!control::cancel_set(&copy));
    assert!(control::cancel_is_set(&original));
    let next = original;
    assert!(control::cancel_is_set(&next));
}

#[test]
fn dropping_one_clone_preserves_other_shared_state() {
    let original = control::cancel_new();
    let copy = control::cancel_clone(&original);
    drop(original);
    assert!(!control::cancel_is_set(&copy));
    assert!(control::cancel_set(&copy));
    assert!(control::cancel_is_set(&copy));
}
