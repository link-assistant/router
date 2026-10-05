//! Per-account connections, cookies and egress proxies (issue #678).

use std::collections::HashSet;

use link_assistant_router::account_http::parse_egress_proxies;
use tokio::io::{AsyncReadExt as _, AsyncWriteExt as _};

use super::*;

/// A loopback HTTP proxy that records each request head and answers the
/// request itself, as an Anthropic message from `proxy`.
async fn proxy_stub() -> (String, Arc<Mutex<Vec<String>>>, tokio::task::JoinHandle<()>) {
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let address = listener.local_addr().unwrap();
    let heads = Arc::new(Mutex::new(Vec::new()));
    let recorded = heads.clone();
    let task = tokio::spawn(async move {
        while let Ok((mut stream, _)) = listener.accept().await {
            let recorded = recorded.clone();
            tokio::spawn(async move {
                let mut request = Vec::new();
                let mut buffer = [0; 8192];
                // The head, then as much body as it announces.
                let head_end = loop {
                    let Ok(read) = stream.read(&mut buffer).await else {
                        return;
                    };
                    if read == 0 {
                        return;
                    }
                    request.extend_from_slice(&buffer[..read]);
                    if let Some(end) = request.windows(4).position(|w| w == b"\r\n\r\n") {
                        break end + 4;
                    }
                };
                let head = String::from_utf8_lossy(&request[..head_end]).to_string();
                let length = head
                    .lines()
                    .find_map(|line| {
                        let (name, value) = line.split_once(':')?;
                        name.eq_ignore_ascii_case("content-length")
                            .then(|| value.trim().parse::<usize>().ok())?
                    })
                    .unwrap_or(0);
                while request.len() < head_end + length {
                    match stream.read(&mut buffer).await {
                        Ok(0) | Err(_) => break,
                        Ok(read) => request.extend_from_slice(&buffer[..read]),
                    }
                }
                recorded.lock().unwrap().push(head);
                let body = message_from("proxy").to_string();
                let _ = stream
                    .write_all(
                        format!(
                            "HTTP/1.1 200 OK\r\ncontent-type: application/json\r\n\
                             content-length: {}\r\nconnection: close\r\n\r\n{body}",
                            body.len()
                        )
                        .as_bytes(),
                    )
                    .await;
            });
        }
    });
    (format!("http://{address}"), heads, task)
}

fn ports(pool: &Pool, account: &str) -> HashSet<u16> {
    pool.vendor
        .peers
        .lock()
        .unwrap()
        .iter()
        .filter(|(seen, _)| seen == account)
        .map(|(_, port)| *port)
        .collect()
}

async fn pause(pool: &Pool, account: &str) {
    let paused = pool
        .admin(&format!("/api/management/accounts/{account}/pause"))
        .send()
        .await
        .unwrap();
    assert_eq!(paused.status(), StatusCode::OK);
}

/// Two accounts on one vendor never share a TCP connection, and a cookie the
/// vendor sets is never sent back by any account.
#[tokio::test]
async fn accounts_never_share_connections_or_cookies() {
    let pool = Pool::start(Options::default()).await;

    for _ in 0..2 {
        let (status, body) = pool.send(None, &hello(false)).await;
        assert_eq!(status, StatusCode::OK, "{body}");
        assert!(body.contains("answered by primary"), "{body}");
    }
    pause(&pool, "primary").await;
    for _ in 0..2 {
        let (status, body) = pool.send(None, &hello(false)).await;
        assert_eq!(status, StatusCode::OK, "{body}");
        assert!(body.contains("answered by account-1"), "{body}");
    }

    let primary = ports(&pool, "primary");
    let second = ports(&pool, "account-1");
    assert_eq!(primary.len(), 1, "an account reuses its own connection");
    assert_eq!(second.len(), 1, "an account reuses its own connection");
    assert!(
        primary.is_disjoint(&second),
        "account-1 must not reuse primary's connection: {primary:?} {second:?}"
    );
    assert!(
        pool.vendor.cookies.lock().unwrap().is_empty(),
        "no vendor cookie is ever echoed"
    );
}

/// The same holds on the native Codex Responses route.
#[tokio::test]
async fn codex_accounts_never_share_connections() {
    let pool = Pool::start(Options {
        codex: true,
        ..Options::default()
    })
    .await;
    let turn = json!({"model": "gpt-5", "stream": true, "store": false, "input": "hi"});

    let (status, body) = pool.send_codex(&turn).await;
    assert_eq!(status, StatusCode::OK, "{body}");
    pause(&pool, "primary").await;
    let (status, body) = pool.send_codex(&turn).await;
    assert_eq!(status, StatusCode::OK, "{body}");
    assert_eq!(body, codex_stream_from("account-1"));

    let primary = ports(&pool, "primary");
    let second = ports(&pool, "account-1");
    assert_eq!((primary.len(), second.len()), (1, 1));
    assert!(primary.is_disjoint(&second), "{primary:?} {second:?}");
    assert!(pool.vendor.cookies.lock().unwrap().is_empty());
}

/// An account with an egress proxy sends through it, with the password read
/// from a file; accounts without one still go direct.
#[tokio::test]
async fn an_account_egresses_through_its_configured_proxy() {
    let (proxy_url, heads, proxy_task) = proxy_stub().await;
    let secrets = tempfile::tempdir().unwrap();
    let password = secrets.path().join("proxy-password");
    std::fs::write(&password, "s3cret\n").unwrap();
    let address = proxy_url.trim_start_matches("http://");
    let proxies = parse_egress_proxies(&format!(
        "account-1=http://alice@{address};password-file={}",
        password.display()
    ))
    .unwrap();
    let pool = Pool::start(Options {
        http: AccountHttpPolicy {
            proxies,
            ..AccountHttpPolicy::default()
        },
        ..Options::default()
    })
    .await;

    pause(&pool, "primary").await;
    let (status, body) = pool.send(None, &hello(false)).await;
    assert_eq!(status, StatusCode::OK, "{body}");
    assert!(body.contains("answered by proxy"), "{body}");

    let recorded = heads.lock().unwrap().clone();
    assert_eq!(recorded.len(), 1, "{recorded:?}");
    // Plain HTTP through a proxy uses the absolute request form.
    assert!(
        recorded[0].starts_with(&format!("POST {}/", pool.stub_url)),
        "{}",
        recorded[0]
    );
    assert!(
        recorded[0]
            .to_ascii_lowercase()
            .contains("proxy-authorization: basic ywxpy2u6cznjcmv0"),
        "the password comes from the file: {}",
        recorded[0]
    );
    assert!(
        pool.vendor.accounts_seen().is_empty(),
        "account-1 never reached the vendor directly"
    );

    // primary has no proxy and still goes direct.
    let resumed = pool
        .admin("/api/management/accounts/primary/resume")
        .send()
        .await
        .unwrap();
    assert_eq!(resumed.status(), StatusCode::OK);
    let (status, body) = pool.send(None, &hello(false)).await;
    assert_eq!(status, StatusCode::OK, "{body}");
    assert_eq!(pool.vendor.accounts_seen(), ["primary"]);
    assert_eq!(heads.lock().unwrap().len(), 1);
    proxy_task.abort();
}

/// A proxy whose secret is missing fails closed: the account never egresses
/// directly in its place.
#[tokio::test]
async fn a_missing_proxy_secret_never_egresses_directly() {
    let proxies =
        parse_egress_proxies("account-1=file:/nonexistent/link-assistant-router/proxy-url")
            .unwrap();
    let pool = Pool::start(Options {
        http: AccountHttpPolicy {
            proxies,
            ..AccountHttpPolicy::default()
        },
        ..Options::default()
    })
    .await;
    pause(&pool, "primary").await;

    let (status, body) = pool.send(None, &hello(false)).await;

    assert!(
        !pool
            .vendor
            .accounts_seen()
            .contains(&"account-1".to_string()),
        "{body}"
    );
    // Pre-first-byte failover may still serve the request from account-2.
    if status == StatusCode::OK {
        assert!(body.contains("answered by account-2"), "{body}");
    }
}
