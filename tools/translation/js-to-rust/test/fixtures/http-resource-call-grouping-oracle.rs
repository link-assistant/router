//! Independent native expectations; no local Rust execution is authorized.
fn identity<T>(value: T) -> T { value }
fn forward<T>(value: T) -> T { identity(value) }

#[test]
fn generic_grouping_and_noop_erasure_retain_native_values() {
    for value in [i64::MIN, -1, 0, i64::MAX] {
        assert_eq!(forward(value), value);
    }
    let value = String::from("é😀");
    assert_eq!(forward(value), "é😀");
}

#[tokio::test]
async fn deferred_grouped_calls_keep_the_original_cancellation_behavior() {
    use link_assistant_router::translation_async_control_core::{Cancellation, cancel_new, cancel_is_set, sleep, with_deadline};
    let cancellation = cancel_new();
    assert!(sleep(0, &cancellation).await.is_ok());
    assert_eq!(with_deadline(1000, &cancellation, |child: Cancellation| async move {
        cancel_is_set(&child)
    }).await, Ok(false));
}
