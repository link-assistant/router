use super::*;

#[test]
fn upstream_reads_are_bounded_unless_explicitly_disabled() {
    assert_eq!(
        parse_upstream_read_timeout(None),
        Some(Duration::from_secs(DEFAULT_UPSTREAM_READ_TIMEOUT_SECS))
    );
    assert_eq!(
        parse_upstream_read_timeout(Some("30")),
        Some(Duration::from_secs(30))
    );
    assert_eq!(parse_upstream_read_timeout(Some("0")), None);
    assert_eq!(
        parse_upstream_read_timeout(Some("not-a-number")),
        Some(Duration::from_secs(DEFAULT_UPSTREAM_READ_TIMEOUT_SECS))
    );
}

#[test]
fn cookie_client_is_limited_to_canonical_codex_subscription_traffic() {
    use crate::subscription::SubscriptionProvider;

    let default = build_upstream_client().expect("default client builds");
    let default_ptr = std::ptr::from_ref(&default);
    assert_ne!(
        std::ptr::from_ref(subscription_client(
            &default,
            SubscriptionProvider::Codex,
            false
        )),
        default_ptr
    );
    assert_eq!(
        std::ptr::from_ref(subscription_client(
            &default,
            SubscriptionProvider::Codex,
            true
        )),
        default_ptr
    );
    for provider in [
        SubscriptionProvider::Claude,
        SubscriptionProvider::Gemini,
        SubscriptionProvider::Qwen,
    ] {
        assert_eq!(
            std::ptr::from_ref(subscription_client(&default, provider, false)),
            default_ptr
        );
    }
}

#[test]
fn every_bound_has_a_default_and_zero_disables_it() {
    assert_eq!(
        parse_timeout_secs(None, DEFAULT_UPSTREAM_CONNECT_TIMEOUT_SECS),
        Some(Duration::from_secs(10))
    );
    assert_eq!(parse_timeout_secs(Some("0"), 10), None);
    assert_eq!(
        parse_timeout_secs(Some(" 3 "), 10),
        Some(Duration::from_secs(3))
    );
    assert_eq!(
        DEFAULT_UPSTREAM_FIRST_BYTE_TIMEOUT_SECS, DEFAULT_UPSTREAM_READ_TIMEOUT_SECS,
        "the first-byte bound must not change behaviour unless configured"
    );
}

/// A listener that accepts connections and then never writes a byte.
async fn silent_listener() -> (std::net::SocketAddr, tokio::task::JoinHandle<()>) {
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    let task = tokio::spawn(async move {
        // Keep every accepted socket open, so the client sees silence rather
        // than a closed connection.
        let mut held = Vec::new();
        while let Ok((socket, _)) = listener.accept().await {
            held.push(socket);
        }
        drop(held);
    });
    (addr, task)
}

#[tokio::test]
async fn an_upstream_that_accepts_but_never_answers_times_out() {
    let (addr, server) = silent_listener().await;
    let client = configured_builder(
        Some(Duration::from_secs(1)),
        Some(Duration::from_millis(300)),
    )
    .build()
    .unwrap();
    let started = std::time::Instant::now();
    let error = client
        .get(format!("http://{addr}/v1/messages"))
        .send()
        .await
        .expect_err("a silent upstream must not hang the request");
    assert!(error.is_timeout(), "{error}");
    assert!(started.elapsed() < Duration::from_secs(5));
    server.abort();
}

#[tokio::test]
async fn an_upstream_that_stalls_after_its_headers_times_out_mid_body() {
    use tokio::io::{AsyncReadExt, AsyncWriteExt};
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    let server = tokio::spawn(async move {
        let (mut socket, _) = listener.accept().await.unwrap();
        let mut request = [0_u8; 1024];
        let _ = socket.read(&mut request).await;
        socket
            .write_all(
                b"HTTP/1.1 200 OK\r\ncontent-type: text/event-stream\r\ntransfer-encoding: chunked\r\n\r\n\
                  1a\r\nevent: message_start\ndata: {}\r\n",
            )
            .await
            .unwrap();
        tokio::time::sleep(Duration::from_secs(30)).await;
        drop(socket);
    });
    let client = configured_builder(None, Some(Duration::from_millis(300)))
        .build()
        .unwrap();
    let mut response = client.get(format!("http://{addr}/")).send().await.unwrap();
    assert_eq!(response.status(), 200);
    let started = std::time::Instant::now();
    let mut error = None;
    loop {
        match response.chunk().await {
            Ok(Some(_)) => {}
            Ok(None) => break,
            Err(cause) => {
                error = Some(cause);
                break;
            }
        }
    }
    let error = error.expect("a stalled stream ends in an error, never a clean end");
    assert!(error.is_timeout() || error.is_body(), "{error}");
    assert!(started.elapsed() < Duration::from_secs(5));
    server.abort();
}

#[tokio::test]
async fn a_black_holed_connect_is_bounded() {
    // TEST-NET-1 is never routed; depending on the host the dial either hangs
    // (and the connect timeout fires) or fails at once. Both are bounded.
    let client = configured_builder(Some(Duration::from_millis(300)), None)
        .build()
        .unwrap();
    let started = std::time::Instant::now();
    let result = client.get("http://192.0.2.1:81/").send().await;
    assert!(result.is_err());
    assert!(started.elapsed() < Duration::from_secs(5));
}

async fn assert_redirect_not_followed(client: &reqwest::Client) {
    use tokio::io::{AsyncReadExt, AsyncWriteExt};
    let second = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let second_addr = second.local_addr().unwrap();
    let second_task = tokio::spawn(async move {
        tokio::time::timeout(Duration::from_millis(500), second.accept())
            .await
            .is_ok()
    });
    let first = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let first_addr = first.local_addr().unwrap();
    tokio::spawn(async move {
        let (mut socket, _) = first.accept().await.unwrap();
        let mut request = [0_u8; 2048];
        let _ = socket.read(&mut request).await;
        let response = format!(
            "HTTP/1.1 307 Temporary Redirect\r\nlocation: http://{second_addr}/steal\r\ncontent-length: 0\r\n\r\n"
        );
        socket.write_all(response.as_bytes()).await.unwrap();
    });
    let response = client
        .post(format!("http://{first_addr}/v1/messages"))
        .header("authorization", "Bearer secret-upstream-credential")
        .body("{}")
        .send()
        .await
        .unwrap();
    assert_eq!(
        response.status(),
        307,
        "the redirect is relayed, not followed"
    );
    assert!(
        !second_task.await.unwrap(),
        "the redirect target must never receive a connection, so never the Authorization header"
    );
}

#[tokio::test]
async fn no_upstream_client_follows_a_redirect() {
    let default = build_upstream_client().unwrap();
    assert_redirect_not_followed(&default).await;
    assert_redirect_not_followed(codex_chatgpt_client()).await;
    assert_redirect_not_followed(provider_client(&default)).await;
}

#[tokio::test]
async fn the_first_byte_timeout_fails_a_request_whose_headers_never_come() {
    let (addr, server) = silent_listener().await;
    let client = configured_builder(None, None).build().unwrap();
    let request = client.get(format!("http://{addr}/")).build().unwrap();
    let started = std::time::Instant::now();
    let error = execute_with_first_byte_timeout(&client, request, Some(Duration::from_millis(200)))
        .await
        .expect_err("no headers within the bound is an error");
    assert!(error.is_timeout());
    assert!(matches!(error, UpstreamSendError::FirstByteTimeout(_)));
    assert!(
        error
            .to_string()
            .contains("UPSTREAM_FIRST_BYTE_TIMEOUT_SECS")
    );
    assert!(started.elapsed() < Duration::from_secs(5));
    server.abort();
}
