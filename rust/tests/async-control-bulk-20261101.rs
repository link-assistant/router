// Independent oracle SOURCE, UNRUN. CI only after all eight same-SHA JS gates.
use link_assistant_router::translation_async_control_core as control;

async fn exchange(encoded: &str, token: &control::Cancellation) -> Result<Option<String>, control::ControlError> {
    let (sender, mut receiver) = control::channel(1)?;
    if let Err(error) = control::send(&sender, encoded, token).await {
        control::dispose(&mut receiver);
        return Err(error);
    }
    control::close(&mut receiver);
    let received = control::receive(&mut receiver, token).await;
    control::dispose(&mut receiver);
    received
}

#[tokio::test]
async fn exchange_preserves_bytes_invalid_input_and_cancellation() {
    let token = control::cancel_new();
    for encoded in ["", "aGk=", "8J+YgA=="] {
        assert_eq!(exchange(encoded, &token).await, Ok(Some(encoded.to_owned())));
    }
    assert_eq!(exchange("invalid base64", &token).await, Err(control::ControlError::InvalidInput));
    assert!(control::cancel_set(&token));
    assert_eq!(exchange("", &token).await, Err(control::ControlError::Cancelled));
}

#[tokio::test]
async fn close_drains_exactly_once_and_deadline_keeps_nested_success() {
    let token = control::cancel_new();
    let (sender, mut receiver) = control::channel(1).expect("bounded channel");
    assert_eq!(control::send(&sender, "aGk=", &token).await, Ok(()));
    let borrowed = &mut receiver;
    let value = control::with_deadline(1000, &token, move |child| async move {
        control::receive(borrowed, &child).await
    }).await;
    assert_eq!(value, Ok(Ok(Some("aGk=".to_owned()))));
    assert_eq!(control::send(&sender, "", &token).await, Ok(()));
    control::close(&mut receiver);
    assert_eq!(control::receive(&mut receiver, &token).await, Ok(Some(String::new())));
    assert_eq!(control::receive(&mut receiver, &token).await, Ok(None));
    assert_eq!(control::send(&sender, "", &token).await, Err(control::ControlError::Closed));
    control::dispose(&mut receiver);
}

#[tokio::test]
async fn wait_then_sleep_remains_cold_and_returns_cancelled() {
    let token = control::cancel_new();
    let pending = async {
        control::cancel_wait(&token).await;
        control::sleep(0, &token).await
    };
    assert!(!control::cancel_is_set(&token));
    assert!(control::cancel_set(&token));
    assert!(!control::cancel_set(&token));
    assert!(control::cancel_is_set(&token));
    assert_eq!(pending.await, Err(control::ControlError::Cancelled));
}
