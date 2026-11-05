// Independent native behavior oracle SOURCE; UNRUN. Gated CI only.
use link_assistant_router::{translation_async_control_core as control,
    translation_http_transport_core as transport};

fn release_if(client: &mut transport::Client, token: &control::Cancellation, immediate: bool) -> bool {
    if immediate {
        let _ = control::cancel_set(token);
        transport::client_dispose(client);
        return true;
    }
    false
}

async fn release(client: &mut transport::Client, token: &control::Cancellation, immediate: bool) -> bool {
    if release_if(client, token, immediate) {
        control::cancel_is_set(token)
    } else {
        transport::client_dispose(client);
        control::cancel_is_set(token)
    }
}

#[tokio::test]
async fn branch_sensitive_helper_cleanup_preserves_cold_cancellation_and_exclusive_client_lifetime() {
    for immediate in [false, true] {
        let mut client = transport::client_new(0, 0, 0, "").unwrap();
        let token = control::cancel_new();
        let pending = release(&mut client, &token, immediate);
        assert!(!control::cancel_is_set(&token));
        assert_eq!(pending.await, immediate);
        assert_eq!(control::cancel_is_set(&token), immediate);
        assert!(transport::client_clone(&client).is_err());
    }
}
