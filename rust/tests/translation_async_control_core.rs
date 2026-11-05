//! Native behavioral oracle source; Rust execution belongs only to gated CI.
use link_assistant_router::translation_async_control_core as control;
use control::ControlError;
use base64::{Engine as _, engine::general_purpose::STANDARD};

#[tokio::test]
async fn cancellation_clones_are_idempotent_and_wake_all_pollers() {
    let token = control::cancel_new();
    let copy = control::cancel_clone(&token);
    assert!(!control::cancel_is_set(&copy));
    assert!(control::cancel_set(&token));
    assert!(!control::cancel_set(&copy));
    control::cancel_wait(&copy).await;
    assert!(control::cancel_is_set(&copy));
    assert_eq!(control::sleep(0, &token).await, Err(ControlError::Cancelled));
}

#[tokio::test]
async fn zero_deadline_never_constructs_the_operation() {
    let token = control::cancel_new();
    let calls = std::cell::Cell::new(0);
    assert_eq!(control::with_deadline(0, &token, |_| {
        calls.set(calls.get() + 1);
        std::future::ready(42)
    }).await, Err(ControlError::Timeout));
    assert_eq!(calls.get(), 0);
    assert_eq!(control::with_deadline(1_000, &token, |_| std::future::ready(42)).await, Ok(42));
    assert_eq!(control::sleep(control::MAX_DELAY_MS + 1, &token).await, Err(ControlError::InvalidInput));
}

#[tokio::test]
async fn bounded_channel_preserves_empty_chunks_and_drains_before_absence() {
    let (sender, mut receiver) = control::channel(1).unwrap();
    let token = control::cancel_new();
    assert_eq!(control::send(&sender, "", &token).await, Ok(()));
    assert_eq!(control::receive(&mut receiver, &token).await, Ok(Some(String::new())));
    assert_eq!(control::send(&sender, "YQ==", &token).await, Ok(()));
    control::close(&mut receiver);
    assert_eq!(control::receive(&mut receiver, &token).await, Ok(Some("YQ==".to_owned())));
    assert_eq!(control::receive(&mut receiver, &token).await, Ok(None));
    assert_eq!(control::send(&sender, "Yg==", &token).await, Err(ControlError::Closed));
    control::dispose(&mut receiver);
}

#[tokio::test]
async fn close_wakes_a_sender_blocked_on_the_byte_budget() {
    let (sender, mut receiver) = control::channel(32).unwrap();
    let token = control::cancel_new();
    let large = STANDARD.encode(vec![0; control::MAX_BYTES]);
    assert_eq!(control::send(&sender, &large, &token).await, Ok(()));
    let pending = control::send(&sender, "YQ==", &token);
    tokio::pin!(pending);
    tokio::select! {
        output = &mut pending => panic!("backpressure was lost: {output:?}"),
        () = tokio::task::yield_now() => (),
    }
    control::close(&mut receiver);
    assert_eq!(pending.await, Err(ControlError::Closed));
    assert_eq!(control::receive(&mut receiver, &token).await, Ok(Some(large)));
    assert_eq!(control::receive(&mut receiver, &token).await, Ok(None));
}

#[tokio::test]
async fn cancelled_send_and_invalid_frames_cannot_publish_a_chunk() {
    let (sender, mut receiver) = control::channel(1).unwrap();
    let token = control::cancel_new();
    assert_eq!(control::send(&sender, "YQ", &token).await, Err(ControlError::InvalidInput));
    let _ = control::cancel_set(&token);
    assert_eq!(control::send(&sender, "YQ==", &token).await, Err(ControlError::Cancelled));
    control::close(&mut receiver);
    assert_eq!(control::receive(&mut receiver, &control::cancel_new()).await, Ok(None));
}
