// Independent real cancellation/channel library source. Gated CI only.
use link_assistant_router::translation_async_control_core::{self as control, ControlError};

#[tokio::test]
async fn cancellable_tail_retains_both_results() {
    let cancellation = control::cancel_new();
    assert_eq!(control::with_deadline(1000, &cancellation, |child| async move {
        control::sleep(0, &child).await
    }).await, Ok(Ok(())));
    control::cancel_set(&cancellation);
    assert_eq!(control::with_deadline(1000, &cancellation, |child| async move {
        control::sleep(0, &child).await
    }).await, Err(ControlError::Cancelled));
}

#[tokio::test]
async fn timed_out_send_leaves_no_pending_payload_after_the_original_queue_is_drained() {
    let cancellation = control::cancel_new();
    let (sender, mut receiver) = control::channel(1).unwrap();
    assert_eq!(control::send(&sender, "YQ==", &cancellation).await, Ok(()));
    let shared = &sender;
    assert_eq!(control::with_deadline(1, &cancellation, |child| async move {
        control::send(shared, "Yg==", &child).await
    }).await, Err(ControlError::Timeout));
    assert_eq!(control::receive(&mut receiver, &cancellation).await, Ok(Some("YQ==".to_owned())));
    control::close(&mut receiver);
    assert_eq!(control::receive(&mut receiver, &cancellation).await, Ok(None));
    control::dispose(&mut receiver);
}
