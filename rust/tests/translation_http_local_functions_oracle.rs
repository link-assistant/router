//! Independent local helper behavior oracle SOURCE. JavaScript-gated CI only.
use link_assistant_router::{translation_text_core as text,
    translation_http_deadline_core as deadline,
    translation_http_transport_core as transport, translation_async_control_core as control};

fn cleaned(input: &str) -> String { finish(input) }
fn finish(input: &str) -> String { text::repeat(view(input),1) }
fn view(input: &str) -> &str { text::trim(input) }

#[test]
fn complete_local_string_calls_keep_the_original_root_and_order() {
    assert_eq!(cleaned(" é😀 "),"é😀");
    assert_eq!(view(" é "),"é");
}

#[tokio::test]
async fn local_cold_deadline_forwarding_preserves_nested_errors() {
    async fn forwarded(client: &transport::Client, token: &control::Cancellation)
        -> Result<Result<serde_json::Value,String>,control::ControlError> {
        deadline::send(0,client,&serde_json::Value::Null,token).await
    }
    let token = control::cancel_new();
    let mut client = transport::client_new(0,0,0,"").unwrap();
    assert!(matches!(forwarded(&client,&token).await,Err(control::ControlError::Timeout)));
    transport::client_dispose(&mut client);
}
