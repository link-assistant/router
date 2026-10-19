//! Per-account HTTP clients keep cookies, connections and egress apart
//! (issue #678).
//!
//! The production Codex cookie store only accepts Cloudflare cookies from
//! `https` `ChatGPT` hosts, which a loopback stub cannot be, so these tests
//! swap in a store that accepts any cookie and check the isolation itself.

use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::{Arc, Mutex};

use link_assistant_router::account_http::{
    AccountClients, AccountHttpPolicy, CookieMode, parse_egress_proxies,
};
use reqwest::cookie::CookieStore;
use tokio::io::{AsyncReadExt as _, AsyncWriteExt as _};
use tokio::net::{TcpListener, TcpStream};

/// What a loopback stub saw.
#[derive(Default)]
struct Seen {
    /// TCP connections accepted.
    connections: AtomicUsize,
    /// Request heads, in arrival order.
    heads: Mutex<Vec<String>>,
}

impl Seen {
    fn heads(&self) -> Vec<String> {
        self.heads.lock().unwrap().clone()
    }
}

/// Read one request head (and discard its announced body); `None` once the
/// peer closes.
async fn read_head(stream: &mut TcpStream) -> Option<String> {
    let mut request = Vec::new();
    let mut byte = [0; 1];
    while !request.ends_with(b"\r\n\r\n") {
        if stream.read(&mut byte).await.ok()? == 0 {
            return None;
        }
        request.push(byte[0]);
    }
    let head = String::from_utf8_lossy(&request).to_string();
    let length = head
        .lines()
        .find_map(|line| {
            let (name, value) = line.split_once(':')?;
            name.eq_ignore_ascii_case("content-length")
                .then(|| value.trim().parse::<usize>().ok())?
        })
        .unwrap_or(0);
    let mut body = vec![0; length];
    stream.read_exact(&mut body).await.ok()?;
    Some(head)
}

/// A keep-alive server that sets a cookie on every answer and counts the
/// connections it accepts. `reply` answers a request head.
async fn stub(reply: fn(&str) -> String) -> (String, Arc<Seen>) {
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let address = listener.local_addr().unwrap();
    let seen = Arc::new(Seen::default());
    let shared = seen.clone();
    tokio::spawn(async move {
        while let Ok((mut stream, _)) = listener.accept().await {
            shared.connections.fetch_add(1, Ordering::SeqCst);
            let shared = shared.clone();
            tokio::spawn(async move {
                while let Some(head) = read_head(&mut stream).await {
                    shared.heads.lock().unwrap().push(head.clone());
                    if stream.write_all(reply(&head).as_bytes()).await.is_err() {
                        return;
                    }
                }
            });
        }
    });
    (format!("http://{address}"), seen)
}

fn ok_with_cookie(head: &str) -> String {
    let account = head
        .lines()
        .find_map(|line| line.strip_prefix("x-account: "))
        .unwrap_or("unknown")
        .trim()
        .to_string();
    format!(
        "HTTP/1.1 200 OK\r\nset-cookie: session={account}; Path=/\r\n\
         content-length: 2\r\n\r\nok"
    )
}

fn any_cookie() -> Arc<dyn CookieStore> {
    Arc::new(reqwest::cookie::Jar::default())
}

fn cookie_of(head: &str) -> Option<String> {
    head.lines()
        .find_map(|line| line.strip_prefix("cookie: "))
        .map(str::to_string)
}

async fn get(clients: &AccountClients, account: &str, url: &str, cookies: CookieMode) -> String {
    let client = clients.client(account, cookies).unwrap();
    let response = client
        .get(url)
        .header("x-account", account)
        .send()
        .await
        .unwrap();
    assert!(response.status().is_success());
    response.text().await.unwrap()
}

/// Account A's cookie and connection are reused for A and never for B.
#[tokio::test]
async fn cookies_and_connections_never_cross_accounts() {
    let (url, seen) = stub(ok_with_cookie).await;
    let clients =
        AccountClients::new(AccountHttpPolicy::default()).with_cookie_store_factory(any_cookie);
    let mode = CookieMode::CodexCloudflare;

    get(&clients, "primary", &url, mode).await;
    get(&clients, "primary", &url, mode).await;
    assert_eq!(
        seen.connections.load(Ordering::SeqCst),
        1,
        "an account reuses its connection"
    );
    get(&clients, "account-1", &url, mode).await;
    get(&clients, "account-1", &url, mode).await;
    get(&clients, "primary", &url, mode).await;

    let heads = seen.heads();
    assert_eq!(seen.connections.load(Ordering::SeqCst), 2, "{heads:?}");
    let cookies: Vec<_> = heads.iter().map(|head| cookie_of(head)).collect();
    assert_eq!(
        cookies,
        [
            None,
            Some("session=primary".to_string()),
            None,
            Some("session=account-1".to_string()),
            Some("session=primary".to_string()),
        ],
        "each account only ever sends its own cookie"
    );
}

/// Without a cookie mode no account stores or sends any cookie.
#[tokio::test]
async fn cookie_less_clients_send_no_cookies() {
    let (url, seen) = stub(ok_with_cookie).await;
    let clients =
        AccountClients::new(AccountHttpPolicy::default()).with_cookie_store_factory(any_cookie);

    for _ in 0..2 {
        get(&clients, "primary", &url, CookieMode::None).await;
    }
    assert!(seen.heads().iter().all(|head| cookie_of(head).is_none()));
}

/// Past its maximum age an account gets a fresh client, so later requests
/// open a new connection while the cookie store carries over.
#[tokio::test]
async fn an_aged_client_is_rotated_and_keeps_its_cookies() {
    let (url, seen) = stub(ok_with_cookie).await;
    let clients = AccountClients::new(AccountHttpPolicy {
        max_connection_age: Some(std::time::Duration::from_millis(50)),
        ..AccountHttpPolicy::default()
    })
    .with_cookie_store_factory(any_cookie);
    let mode = CookieMode::CodexCloudflare;

    get(&clients, "primary", &url, mode).await;
    tokio::time::sleep(std::time::Duration::from_millis(100)).await;
    get(&clients, "primary", &url, mode).await;

    assert_eq!(seen.connections.load(Ordering::SeqCst), 2);
    assert_eq!(
        cookie_of(&seen.heads()[1]).as_deref(),
        Some("session=primary")
    );
}

fn proxied_answer(_head: &str) -> String {
    "HTTP/1.1 200 OK\r\ncontent-length: 7\r\n\r\nproxied".to_string()
}

fn refuse_tunnel(_head: &str) -> String {
    "HTTP/1.1 403 Forbidden\r\ncontent-length: 0\r\n\r\n".to_string()
}

/// A plain HTTP request goes to the proxy in absolute form, with the
/// credentials from the referenced secret file.
#[tokio::test]
async fn an_http_proxy_carries_the_request_and_its_credentials() {
    let (proxy, seen) = stub(proxied_answer).await;
    let secrets = tempfile::tempdir().unwrap();
    let file = secrets.path().join("proxy-url");
    // The whole URL, credentials included, lives in the secret file.
    std::fs::write(&file, format!("http://alice:s3cret@{}\n", &proxy[7..])).unwrap();
    let proxies = parse_egress_proxies(&format!("account-1=file:{}", file.display())).unwrap();
    let clients = AccountClients::new(AccountHttpPolicy {
        proxies,
        ..AccountHttpPolicy::default()
    });

    let body = get(
        &clients,
        "account-1",
        "http://vendor.invalid/v1/messages",
        CookieMode::None,
    )
    .await;

    assert_eq!(body, "proxied");
    let heads = seen.heads();
    assert_eq!(heads.len(), 1);
    assert!(
        heads[0].starts_with("GET http://vendor.invalid/v1/messages HTTP/1.1"),
        "{}",
        heads[0]
    );
    assert!(
        heads[0]
            .to_ascii_lowercase()
            .contains("proxy-authorization: basic ywxpy2u6cznjcmv0"),
        "{}",
        heads[0]
    );
}

/// An `https` target is tunnelled with `CONNECT`, so the proxy never sees
/// the request itself; a refused tunnel fails the request rather than
/// egressing directly.
#[tokio::test]
async fn an_https_target_is_tunnelled_with_connect() {
    let (proxy, seen) = stub(refuse_tunnel).await;
    let proxies = parse_egress_proxies(&format!("primary={proxy}")).unwrap();
    let clients = AccountClients::new(AccountHttpPolicy {
        proxies,
        ..AccountHttpPolicy::default()
    });
    let client = clients.client("primary", CookieMode::None).unwrap();

    let result = client
        .get("https://vendor.invalid/v1/messages")
        .send()
        .await;

    assert!(result.is_err(), "a refused tunnel is an error");
    let heads = seen.heads();
    assert_eq!(heads.len(), 1, "{heads:?}");
    assert!(
        heads[0].starts_with("CONNECT vendor.invalid:443 HTTP/1.1"),
        "{}",
        heads[0]
    );
}
