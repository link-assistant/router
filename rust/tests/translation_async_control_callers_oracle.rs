// Independent native oracle source. Run only in CI after all same-SHA JS stages.
use link_assistant_router::translation_async_control_core as control;

#[tokio::test]
async fn bounded_channel_data_order_and_explicit_receiver_cleanup() {
    let cancellation = control::cancel_new();
    let (sender, mut receiver) = control::channel(1).expect("one slot");
    let second = control::sender_clone(&sender);
    assert!(control::send(&second, "aGk=", &cancellation).await.is_ok());
    assert!(matches!(
        control::receive(&mut receiver, &cancellation).await,
        Ok(Some(value)) if value == "aGk="
    ));
    control::close(&mut receiver);
    assert!(matches!(control::receive(&mut receiver, &cancellation).await, Ok(None)));
    control::dispose(&mut receiver);
    assert!(matches!(control::receive(&mut receiver, &cancellation).await, Ok(None)));
}

#[tokio::test]
async fn lazy_native_future_preserves_cancellation_and_deadline_result_layers() {
    let cancellation = control::cancel_new();
    assert!(control::sleep(0, &cancellation).await.is_ok());
    let nested = control::with_deadline(1000, &cancellation, |child| async move {
        control::sleep(0, &child).await
    }).await;
    assert!(matches!(nested, Ok(Ok(()))));
    let timed = control::with_deadline(0, &cancellation, |child| async move {
        control::sleep(1000, &child).await
    }).await;
    assert!(matches!(timed, Err(control::ControlError::Timeout)));
    let shared = control::cancel_clone(&cancellation);
    assert!(control::cancel_set(&shared));
    assert!(!control::cancel_set(&shared));
    assert!(control::cancel_is_set(&cancellation));
    control::cancel_wait(&cancellation).await;
    assert!(matches!(control::sleep(0, &cancellation).await, Err(control::ControlError::Cancelled)));
}

#[tokio::test]
async fn failed_send_releases_the_owned_receiver_explicitly() {
    let cancellation = control::cancel_new();
    let (sender, mut receiver) = control::channel(1).expect("one slot");
    let result = control::send(&sender, "invalid base64", &cancellation).await;
    if result.is_err() {
        control::dispose(&mut receiver);
    }
    assert!(matches!(result, Err(control::ControlError::InvalidInput)));
    assert!(control::channel(0).is_err());
}
