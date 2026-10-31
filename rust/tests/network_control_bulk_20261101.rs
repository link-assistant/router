// Independent HTTP/control oracle SOURCE. UNRUN; Rust belongs to gated CI only.
use base64::{Engine as _, engine::general_purpose::STANDARD};
use link_assistant_router::{translation_async_control_core as control,
    translation_http_deadline_core as deadline, translation_http_protocol_core as protocol,
    translation_http_transport_core as transport};
use serde_json::{Value, json};
use std::time::Duration;
use tokio::{io::{AsyncReadExt, AsyncWriteExt}, net::TcpListener};

async fn first_chunk(client: &transport::Client, request: &Value, token: &control::Cancellation) -> Result<Option<String>, String> {
    let mut stream = transport::open(client, request, token).await?;
    let chunk = transport::read(&mut stream, token).await;
    transport::close(&mut stream);
    chunk
}

#[tokio::test]
async fn buffered_and_first_chunk_callers_preserve_unicode_and_release_streams() {
    tokio::time::timeout(Duration::from_secs(5), async {
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let url = format!("http://{}", listener.local_addr().unwrap());
        let server = tokio::spawn(async move {
            for _ in 0..2 {
                let (mut socket, _) = listener.accept().await.unwrap();
                let mut request = Vec::new();
                let mut scratch = [0; 4096];
                while !request.windows(4).any(|value| value == b"\r\n\r\n") {
                    let count = socket.read(&mut scratch).await.unwrap();
                    assert!(count > 0);
                    request.extend_from_slice(&scratch[..count]);
                    assert!(request.len() <= 65536);
                }
                socket.write_all(b"HTTP/1.1 200 OK\r\nContent-Length: 6\r\nConnection: close\r\n\r\n").await.unwrap();
                socket.write_all("é😀".as_bytes()).await.unwrap();
            }
        });
        let mut client = transport::client_new(1000, 0, 1000, "loopback").unwrap();
        let token = control::cancel_new();
        let request = protocol::http_request("GET", &url, &json!([]), "").unwrap();
        let buffered = transport::send(&client, &request, &token).await.unwrap();
        assert_eq!(protocol::http_body_text(&buffered), Ok("é😀".to_owned()));
        let chunk = first_chunk(&client, &request, &token).await.unwrap().unwrap();
        let bytes = STANDARD.decode(chunk).unwrap();
        assert!(!bytes.is_empty());
        assert!("é😀".as_bytes().starts_with(&bytes));
        server.await.unwrap();
        assert!(matches!(deadline::send(0, &client, &request, &token).await, Err(control::ControlError::Timeout)));
        assert!(control::cancel_set(&token));
        assert!(matches!(deadline::send(0, &client, &request, &token).await, Err(control::ControlError::Cancelled)));
        assert!(first_chunk(&client, &request, &token).await.is_err());
        transport::client_dispose(&mut client);
    }).await.expect("bounded loopback oracle");
}
