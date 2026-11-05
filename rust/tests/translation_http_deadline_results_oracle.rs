//! Independent error adapter oracle SOURCE. Gated Rust CI only.
use link_assistant_router::{translation_async_control_core::ControlError,
    translation_http_deadline_results_core as result};
use serde_json::json;

#[test]
fn original_control_errors_map_to_exact_stable_transport_strings() {
    for (error, expected) in [
        (ControlError::Cancelled,"HTTP operation cancelled"),
        (ControlError::Timeout,"HTTP operation timed out"),
        (ControlError::Closed,"HTTP operation channel closed"),
        (ControlError::Resource,"HTTP operation resource limit"),
        (ControlError::InvalidInput,"HTTP operation invalid input"),
    ] {
        assert_eq!(result::flatten_send(Err(error)), Err(expected.to_owned()));
        assert_eq!(result::flatten_read(Err(error)), Err(expected.to_owned()));
        assert!(matches!(result::flatten_open(Err(error)), Err(message) if message == expected));
    }
    assert_eq!(result::flatten_send(Ok(Ok(json!({"a":1})))), Ok(json!({"a":1})));
    assert_eq!(result::flatten_read(Ok(Ok(Some("eA==".to_owned())))), Ok(Some("eA==".to_owned())));
    assert_eq!(result::flatten_read(Ok(Ok(None))), Ok(None));
    assert_eq!(result::flatten_send(Ok(Err("provider".to_owned()))), Err("provider".to_owned()));
}
