//! Independent caller oracle SOURCE. Compile and run only in gated Rust CI.
use link_assistant_router::{translation_async_control_core as control,
    translation_http_protocol_core as value, translation_http_transport_core as transport};
use serde_json::json;
use tokio::{io::{AsyncReadExt, AsyncWriteExt}, net::TcpListener};
use std::time::Duration;

async fn response(url: &str) -> Result<serde_json::Value, String> {
    let request = value::http_request("GET", url, &json!([]), "")?;
    let mut client = transport::client_new(1000, 0, 1000, "loopback")?;
    let token = control::cancel_new();
    let returned = match transport::send(&client, &request, &token).await {
        Ok(value) => value,
        Err(error) => { transport::client_dispose(&mut client); return Err(error); }
    };
    transport::client_dispose(&mut client);
    Ok(returned)
}

#[tokio::test]
async fn source_caller_preserves_request_body_and_resource_cleanup() {
    tokio::time::timeout(Duration::from_secs(5), async {
        let server = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let url = format!("http://{}", server.local_addr().unwrap());
        let task = tokio::spawn(async move {
            let (mut socket, _) = server.accept().await.unwrap();
            let mut received = Vec::new();
            let mut buffer = [0; 4096];
            while !received.windows(4).any(|part| part == b"\r\n\r\n") {
                let count = socket.read(&mut buffer).await.unwrap();
                assert!(count > 0); received.extend_from_slice(&buffer[..count]);
                assert!(received.len() < 65536);
            }
            let body = "é😀".as_bytes();
            socket.write_all(format!("HTTP/1.1 200 OK\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",body.len()).as_bytes()).await.unwrap();
            socket.write_all(body).await.unwrap();
        });
        let returned = response(&url).await.unwrap();
        assert_eq!(value::http_body_text(&returned), Ok("é😀".to_owned()));
        task.await.unwrap();
        assert!(response("invalid URL").await.is_err());
    }).await.expect("complete HTTP caller must terminate");
}
