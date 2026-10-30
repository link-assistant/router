// Independent real native library oracle SOURCE; gated CI only, never local.
use link_assistant_router::translation_async_control_core::{self as control, ControlError};
use std::sync::{Arc, atomic::{AtomicUsize, Ordering}};

#[tokio::test]
async fn pure_owned_deadline_values_preserve_native_ranges_and_successful_child_cleanup() {
    let cancellation = control::cancel_new();
    let child_seen = Arc::new(std::sync::Mutex::new(None));
    let captured = child_seen.clone();
    let value = control::with_deadline(1000, &cancellation, |child| async move {
        *captured.lock().unwrap() = Some(child);
        (i64::MIN, "é😀".repeat(2))
    }).await;
    assert_eq!(value, Ok((i64::MIN, "é😀é😀".to_owned())));
    let child = child_seen.lock().unwrap().take().unwrap();
    assert!(control::cancel_is_set(&child));
}

#[tokio::test]
async fn zero_and_precancelled_deadlines_do_not_construct_the_callback_future() {
    let calls = Arc::new(AtomicUsize::new(0));
    let cancellation = control::cancel_new();
    let captured = calls.clone();
    assert_eq!(control::with_deadline(0, &cancellation, |_| {
        captured.fetch_add(1, Ordering::SeqCst);
        async { true }
    }).await, Err(ControlError::Timeout));
    assert_eq!(calls.load(Ordering::SeqCst), 0);
    control::cancel_set(&cancellation);
    let captured = calls.clone();
    assert_eq!(control::with_deadline(1000, &cancellation, |_| {
        captured.fetch_add(1, Ordering::SeqCst);
        async { false }
    }).await, Err(ControlError::Cancelled));
    assert_eq!(calls.load(Ordering::SeqCst), 0);
}
