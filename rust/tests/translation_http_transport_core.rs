//! Independent local HTTP oracle source. Only gated CI may execute Rust.
use base64::{Engine as _, engine::general_purpose::STANDARD};
use link_assistant_router::{translation_async_control_core as control,
    translation_http_protocol_core as value, translation_http_transport_core as transport};
use serde_json::{Value, json};
use std::time::Duration;
use tokio::{io::{AsyncReadExt, AsyncWriteExt}, net::TcpListener};

async fn mock(header_delay: u64, head: &'static str, parts: Vec<(u64, Vec<u8>)>) -> (String, tokio::task::JoinHandle<Vec<u8>>) {
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let url = format!("http://{}",listener.local_addr().unwrap());
    let task = tokio::spawn(async move {
        let (mut socket,_) = listener.accept().await.unwrap();
        let mut request = Vec::new(); let mut bytes = [0;4096];
        loop {
            let count = socket.read(&mut bytes).await.unwrap(); if count == 0 { break; }
            request.extend_from_slice(&bytes[..count]);
            if request.windows(4).any(|value|value == b"\r\n\r\n") { break; }
            assert!(request.len() < 65536);
        }
        tokio::time::sleep(Duration::from_millis(header_delay)).await;
        if socket.write_all(head.as_bytes()).await.is_ok() {
            for (delay,part) in parts {
                tokio::time::sleep(Duration::from_millis(delay)).await;
                if socket.write_all(&part).await.is_err() { break; }
            }
        }
        request
    }); (url,task)
}
fn request(url: &str) -> Value { value::http_request("POST",url,&json!([]),"").unwrap() }
fn client(idle: u64, first: u64) -> transport::Client { transport::client_new(1000,idle,first,"loopback").unwrap() }

#[tokio::test]
async fn cloned_clients_share_capacity_and_explicit_close_returns_the_slot() {
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let url = format!("http://{}",listener.local_addr().unwrap());
    let (finished,finish) = tokio::sync::oneshot::channel::<()>();
    let server = tokio::spawn(async move {
        let mut sockets = Vec::new();
        for _ in 0..33 {
            let (mut socket,_) = listener.accept().await.unwrap();
            let mut request = Vec::new(); let mut bytes = [0;4096];
            while !request.windows(4).any(|value|value == b"\r\n\r\n") {
                let count = socket.read(&mut bytes).await.unwrap(); assert!(count > 0);
                request.extend_from_slice(&bytes[..count]); assert!(request.len() < 65536);
            }
            socket.write_all(b"HTTP/1.1 200 OK\r\nContent-Length: 1\r\n\r\n").await.unwrap();
            sockets.push(socket);
        }
        finish.await.unwrap(); drop(sockets);
    });
    let mut value = client(0,1000); let mut copy = transport::client_clone(&value).unwrap();
    let token = control::cancel_new(); let request = request(&url); let mut streams = Vec::new();
    for index in 0..32 { streams.push(transport::open(if index % 2 == 0 { &value } else { &copy },&request,&token).await.unwrap()); }
    assert_eq!(transport::open(&copy,&request,&token).await.err(),Some("HTTP transport resource bound".to_owned()));
    transport::close(&mut streams[0]); streams.push(transport::open(&copy,&request,&token).await.unwrap());
    for stream in &mut streams { transport::close(stream); }
    transport::client_dispose(&mut value); transport::client_dispose(&mut copy);
    finished.send(()).unwrap(); server.await.unwrap();
}

#[tokio::test]
async fn redirects_duplicate_headers_and_body_bytes_are_preserved_without_a_second_request() {
    let (url,server) = mock(0,"HTTP/1.1 302 Found\r\nContent-Length: 5\r\nSet-Cookie: a=1\r\nSet-Cookie: b=2\r\nLocation: /never-follow\r\nConnection: close\r\n\r\n",vec![(0,b"moved".to_vec())]).await;
    let mut client = client(1000,1000); let token = control::cancel_new();
    let response = transport::send(&client,&request(&url),&token).await.unwrap();
    assert_eq!(value::http_status(&response),Ok(302));
    assert_eq!(value::http_body_text(&response),Ok("moved".to_owned()));
    assert_eq!(value::http_headers_get_all(&response,"set-cookie"),Ok(json!(["YT0x","Yj0y"])));
    let captured = String::from_utf8(server.await.unwrap()).unwrap();
    assert!(captured.to_ascii_lowercase().contains("content-length: 0"));
    transport::client_dispose(&mut client);
}
#[tokio::test]
async fn pull_reads_preserve_binary_data_and_never_exceed_the_explicit_chunk_bound() {
    let expected = vec![255;200000];
    let (url,server) = mock(0,"HTTP/1.1 200 OK\r\nContent-Length: 200000\r\nConnection: close\r\n\r\n",vec![(0,expected.clone())]).await;
    let mut client = client(1000,1000); let token = control::cancel_new();
    let mut stream = transport::open(&client,&request(&url),&token).await.unwrap();
    assert_eq!(value::http_status(&transport::head(&stream)),Ok(200));
    let mut actual = Vec::new();
    while let Some(chunk) = transport::read(&mut stream,&token).await.unwrap() {
        let bytes = STANDARD.decode(chunk).unwrap(); assert!(bytes.len() <= 65536); actual.extend(bytes);
    }
    assert_eq!(actual,expected); assert_eq!(transport::read(&mut stream,&token).await,Ok(None));
    transport::close(&mut stream); transport::client_dispose(&mut client); server.await.unwrap();
}
#[tokio::test]
async fn literal_destination_policy_pre_cancelled_work_and_disposed_clients_fail_before_dialing() {
    let mut strict = transport::client_new(0,0,0,"").unwrap(); let token = control::cancel_new();
    assert_eq!(transport::open(&strict,&request("http://127.0.0.1:9"),&token).await.err(),Some("HTTP destination refused".to_owned()));
    assert!(control::cancel_set(&token));
    assert_eq!(transport::open(&strict,&request("http://127.0.0.1:9"),&token).await.err(),Some("HTTP cancelled".to_owned()));
    transport::client_dispose(&mut strict);
    assert_eq!(transport::client_clone(&strict).err(),Some("HTTP client closed".to_owned()));
}
#[tokio::test]
async fn first_byte_and_idle_bounds_are_distinct_and_active_cancellation_closes_the_stream() {
    let (url,server) = mock(150,"HTTP/1.1 200 OK\r\nContent-Length: 4\r\n\r\n",vec![(0,b"late".to_vec())]).await;
    let mut value = client(0,10); let token = control::cancel_new();
    assert_eq!(transport::open(&value,&request(&url),&token).await.err(),Some("HTTP timeout".to_owned()));
    transport::client_dispose(&mut value); server.await.unwrap();
    let (url,server) = mock(0,"HTTP/1.1 200 OK\r\nContent-Length: 4\r\n\r\n",vec![(150,b"late".to_vec())]).await;
    let mut value = client(10,1000); let mut stream = transport::open(&value,&request(&url),&token).await.unwrap();
    assert_eq!(transport::read(&mut stream,&token).await,Err("HTTP timeout".to_owned()));
    transport::close(&mut stream); transport::client_dispose(&mut value); server.await.unwrap();
    let (url,server) = mock(0,"HTTP/1.1 200 OK\r\nContent-Length: 4\r\n\r\n",vec![(150,b"late".to_vec())]).await;
    let mut value = client(0,0); let token = control::cancel_new(); let copy = control::cancel_clone(&token);
    let mut stream = transport::open(&value,&request(&url),&token).await.unwrap();
    let signal = tokio::spawn(async move { tokio::task::yield_now().await; assert!(control::cancel_set(&copy)); });
    assert_eq!(transport::read(&mut stream,&token).await,Err("HTTP cancelled".to_owned())); signal.await.unwrap();
    assert_eq!(transport::read(&mut stream,&control::cancel_new()).await,Ok(None));
    transport::client_dispose(&mut value); server.await.unwrap();
}
#[tokio::test]
async fn idle_bound_does_not_become_a_total_stream_deadline_and_buffering_is_bounded() {
    let (url,server) = mock(0,"HTTP/1.1 200 OK\r\nContent-Length: 4\r\n\r\n",vec![(60,b"a".to_vec());4]).await;
    let mut value = client(100,0); let token = control::cancel_new();
    let response = transport::send(&value,&request(&url),&token).await.unwrap();
    assert_eq!(value::http_body_text(&response),Ok("aaaa".to_owned())); server.await.unwrap();
    let (url,server) = mock(0,"HTTP/1.1 200 OK\r\nContent-Length: 786433\r\n\r\n",vec![(0,vec![0;786433])]).await;
    assert_eq!(transport::send(&value,&request(&url),&token).await,Err("HTTP body bound".to_owned()));
    transport::client_dispose(&mut value); server.await.unwrap();
}
