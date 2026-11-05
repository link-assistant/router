//! Independent HTTP deadline/borrow cleanup oracle. Run only in gated Rust CI.
use link_assistant_router::{
    translation_async_control_core as control, translation_http_deadline_core as deadline,
    translation_http_protocol_core as value, translation_http_transport_core as transport,
};
use serde_json::json;
use std::time::Duration;
use tokio::{
    io::{AsyncReadExt, AsyncWriteExt},
    net::TcpListener,
};

async fn endpoint(delay: u64) -> (String, tokio::task::JoinHandle<()>) {
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let url = format!("http://{}", listener.local_addr().unwrap());
    let task = tokio::spawn(async move {
        let (mut socket, _) = listener.accept().await.unwrap();
        let mut request = Vec::new();
        let mut bytes = [0; 4096];
        while !request.windows(4).any(|part| part == b"\r\n\r\n") {
            let count = socket.read(&mut bytes).await.unwrap();
            assert!(count > 0);
            request.extend_from_slice(&bytes[..count]);
            assert!(request.len() < 65536);
        }
        if socket.write_all(b"HTTP/1.1 200 OK\r\nContent-Length: 1\r\nConnection: close\r\n\r\n").await.is_ok() {
            tokio::time::sleep(Duration::from_millis(delay)).await;
            let _ = socket.write_all(b"x").await;
        }
    });
    (url, task)
}

#[tokio::test]
async fn unstarted_read_keeps_its_stream_and_started_timeout_closes_before_return() {
    tokio::time::timeout(Duration::from_secs(5), async {
        let token = control::cancel_new();
        let mut client = transport::client_new(1000, 0, 1000, "loopback").unwrap();
        let (url, server) = endpoint(0).await;
        let request = value::http_request("GET", &url, &json!([]), "").unwrap();
        let mut stream = transport::open(&client, &request, &token).await.unwrap();
        assert!(matches!(deadline::read(0, &mut stream, &token).await, Err(control::ControlError::Timeout)));
        assert_eq!(transport::read(&mut stream, &token).await, Ok(Some("eA==".to_owned())));
        transport::close(&mut stream);
        server.await.unwrap();
        let (url, server) = endpoint(150).await;
        let request = value::http_request("GET", &url, &json!([]), "").unwrap();
        let mut stream = transport::open(&client, &request, &token).await.unwrap();
        assert!(matches!(deadline::read(5, &mut stream, &token).await, Err(control::ControlError::Timeout)));
        assert_eq!(transport::read(&mut stream, &token).await, Ok(None));
        transport::close(&mut stream);
        transport::client_dispose(&mut client);
        server.await.unwrap();
    }).await.expect("closed HTTP deadline work must terminate");
}

#[tokio::test]
async fn completed_send_retains_nested_results_and_preexisting_cancellation_does_not_dial() {
    tokio::time::timeout(Duration::from_secs(5), async {
        let token = control::cancel_new();
        let mut client = transport::client_new(1000, 0, 1000, "loopback").unwrap();
        let (url, server) = endpoint(0).await;
        let request = value::http_request("GET", &url, &json!([]), "").unwrap();
        let response = deadline::send(1000, &client, &request, &token).await.unwrap().unwrap();
        assert_eq!(value::http_body_text(&response), Ok("x".to_owned()));
        server.await.unwrap();
        assert!(control::cancel_set(&token));
        assert!(matches!(deadline::open(1000, &client, &request, &token).await, Err(control::ControlError::Cancelled)));
        transport::client_dispose(&mut client);
    }).await.expect("closed HTTP deadline work must terminate");
}
