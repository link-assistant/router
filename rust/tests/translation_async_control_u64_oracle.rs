// Native unsigned-domain oracle SOURCE. Execute only in fully gated CI.
use link_assistant_router::translation_async_control_core as control;

#[tokio::test]
async fn unsigned_delay_domain_keeps_operation_specific_limits_and_cancellation() {
    let token = control::cancel_new();
    assert!(control::sleep(0, &token).await.is_ok());
    assert!(matches!(
        control::sleep(u64::MAX, &token).await,
        Err(control::ControlError::InvalidInput)
    ));
    assert!(control::cancel_set(&token));
    assert!(matches!(control::sleep(0, &token).await, Err(control::ControlError::Cancelled)));
}

#[test]
fn unsigned_capacity_domain_does_not_imply_an_allowed_resource_capacity() {
    assert!(matches!(control::channel(0), Err(control::ControlError::InvalidInput)));
    assert!(matches!(control::channel(33), Err(control::ControlError::InvalidInput)));
    assert!(matches!(control::channel(u64::MAX), Err(control::ControlError::InvalidInput)));
    let (_, mut receiver) = control::channel(1).expect("one valid slot");
    control::dispose(&mut receiver);
}
