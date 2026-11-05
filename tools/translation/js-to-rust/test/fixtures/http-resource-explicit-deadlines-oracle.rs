// Independent real native generic slot/range oracle source. Gated CI only.
use link_assistant_router::translation_async_control_core as control;

#[tokio::test]
async fn inferred_signed_deadline_slots_keep_positive_native_values_and_boundary_types() {
    let cancellation = control::cancel_new();
    for value in [i64::MIN, -1, 0, 1, i64::MAX] {
        let actual: Result<i64, control::ControlError> = control::with_deadline(
            1000, &cancellation, |_child| async move { value },
        ).await;
        assert_eq!(actual, Ok(value));
    }
    let nested: Result<Result<(), control::ControlError>, control::ControlError> =
        control::with_deadline(1000, &cancellation, |child| async move {
            control::sleep(0, &child).await
        }).await;
    assert_eq!(nested, Ok(Ok(())));
}
