//! End-to-end HTTP coverage of the administrative surface (issue #49).
//!
//! The unit tests in `src/admin_auth.rs` pin the authorisation *rule*; this
//! file pins the thing the issue actually reported — that a real router
//! process, started with no admin key, answered `200` to an unauthenticated
//! `POST /api/tokens`. It boots the released binary on a loopback port and
//! speaks HTTP to it, so nothing about the wiring between the rule and the
//! routes is assumed.
//!
//! Unix only: the harness sends SIGTERM to shut the child down.
#![cfg(unix)]

use std::io::{BufRead, BufReader};
use std::net::TcpListener;
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

/// A router process on its own port, killed when the test ends.
struct Router {
    child: Child,
    port: u16,
    /// The bootstrap admin token the router printed at startup, if any.
    bootstrap_token: Option<String>,
    _data_dir: tempfile::TempDir,
}

impl Drop for Router {
    fn drop(&mut self) {
        let _ = self.child.kill();
        let _ = self.child.wait();
    }
}

fn free_port() -> u16 {
    TcpListener::bind("127.0.0.1:0")
        .expect("should bind an ephemeral port")
        .local_addr()
        .expect("should have a local address")
        .port()
}

impl Router {
    fn start(extra_env: &[(&str, &str)]) -> Self {
        let data_dir = tempfile::tempdir().expect("temp data dir");
        let port = free_port();
        let mut cmd = Command::new(env!("CARGO_BIN_EXE_link-assistant-router"));
        cmd.arg("serve")
            .env("TOKEN_SECRET", "admin-endpoint-test-secret")
            .env("ROUTER_HOST", "127.0.0.1")
            .env("ROUTER_PORT", port.to_string())
            .env("STORAGE_POLICY", "text")
            .env("DATA_DIR", data_dir.path())
            // Keep the subscription-less start quiet and self-contained.
            .env("CLAUDE_CODE_HOME", data_dir.path().join("claude"))
            .env("DISABLE_LOGIN_API", "true")
            .stdout(Stdio::piped())
            .stderr(Stdio::null());
        for (k, v) in extra_env {
            cmd.env(k, v);
        }
        let mut child = cmd.spawn().expect("router should start");

        // Pump stdout on its own thread. With an admin key configured the
        // router prints no bootstrap token at all, so scanning for the line
        // inline would block until the process exits — i.e. forever.
        let stdout = child.stdout.take().expect("piped stdout");
        let lines = Arc::new(Mutex::new(Vec::new()));
        let sink = Arc::clone(&lines);
        std::thread::spawn(move || {
            for line in BufReader::new(stdout).lines().map_while(Result::ok) {
                sink.lock().expect("stdout lock").push(line);
            }
        });

        let mut router = Self {
            child,
            port,
            bootstrap_token: None,
            _data_dir: data_dir,
        };
        router.await_health();
        // The banner is printed before the listener binds, so by the time
        // `/health` answers everything we care about has been captured.
        router.bootstrap_token = lines
            .lock()
            .expect("stdout lock")
            .iter()
            .find_map(|line| line.split("store it now): ").nth(1))
            .map(|token| token.trim().to_string());
        router
    }

    fn await_health(&self) {
        let deadline = Instant::now() + Duration::from_secs(30);
        while Instant::now() < deadline {
            if ureq_get(&self.url("/health"), None).is_some() {
                return;
            }
            std::thread::sleep(Duration::from_millis(100));
        }
        panic!("router never became healthy on port {}", self.port);
    }

    fn url(&self, path: &str) -> String {
        format!("http://127.0.0.1:{}{path}", self.port)
    }
}

/// Minimal blocking HTTP helpers — the test only needs a status and a body,
/// and the crate's `reqwest` is async-only in this context.
fn ureq_get(url: &str, bearer: Option<&str>) -> Option<(u16, String)> {
    http_request("GET", url, bearer, None)
}

fn ureq_post(url: &str, bearer: Option<&str>, body: &str) -> Option<(u16, String)> {
    http_request("POST", url, bearer, Some(body))
}

fn http_request(
    method: &str,
    url: &str,
    bearer: Option<&str>,
    body: Option<&str>,
) -> Option<(u16, String)> {
    use std::io::{Read, Write};
    use std::net::TcpStream;

    let rest = url.strip_prefix("http://")?;
    let (authority, path) = rest.split_once('/')?;
    let path = format!("/{path}");

    let mut stream = TcpStream::connect(authority).ok()?;
    stream
        .set_read_timeout(Some(Duration::from_secs(10)))
        .ok()?;
    let body = body.unwrap_or("");
    let mut request = format!(
        "{method} {path} HTTP/1.1\r\nHost: {authority}\r\nConnection: close\r\n\
         Content-Type: application/json\r\nContent-Length: {}\r\n",
        body.len()
    );
    if let Some(bearer) = bearer {
        request.push_str("Authorization: Bearer ");
        request.push_str(bearer);
        request.push_str("\r\n");
    }
    request.push_str("\r\n");
    request.push_str(body);
    stream.write_all(request.as_bytes()).ok()?;

    let mut raw = String::new();
    stream.read_to_string(&mut raw).ok()?;
    let status = raw.split_whitespace().nth(1)?.parse().ok()?;
    let body = raw
        .split_once("\r\n\r\n")
        .map_or("", |(_, b)| b)
        .to_string();
    Some((status, body))
}

fn token_from(body: &str) -> String {
    let value: serde_json::Value = serde_json::from_str(strip_chunking(body).as_str())
        .unwrap_or_else(|e| panic!("response should be JSON ({e}): {body}"));
    value["token"]
        .as_str()
        .unwrap_or_else(|| panic!("response should carry a token: {body}"))
        .to_string()
}

/// Responses come back chunked; for these small single-chunk bodies, dropping
/// the size lines is enough to recover the JSON.
fn strip_chunking(body: &str) -> String {
    if body.trim_start().starts_with('{') {
        return body.trim().to_string();
    }
    body.lines()
        .filter(|line| line.trim_start().starts_with('{'))
        .collect::<Vec<_>>()
        .join("")
}

/// The reproduction from issue #49: with no admin credential configured, a
/// `POST /api/tokens` carrying no `Authorization` header used to return `200`
/// and a usable `la_sk_…` token.
#[test]
fn unauthenticated_token_issuance_is_refused_by_default() {
    let router = Router::start(&[]);

    let (status, body) = ureq_post(
        &router.url("/api/tokens"),
        None,
        r#"{"ttl_hours":1,"label":"anyone"}"#,
    )
    .expect("router should answer");

    assert_eq!(status, 401, "unexpected body: {body}");
    assert!(
        !body.contains("la_sk_"),
        "no token may be handed to an unauthenticated caller: {body}"
    );

    let (status, body) = ureq_get(&router.url("/api/tokens/list"), None).expect("should answer");
    assert_eq!(status, 401, "unexpected body: {body}");
}

/// The router must stay usable when nothing is configured: it mints an admin
/// credential at startup and prints it once.
#[test]
fn bootstrap_admin_token_is_printed_and_opens_the_admin_surface() {
    let router = Router::start(&[]);
    let token = router
        .bootstrap_token
        .clone()
        .expect("the router should print a bootstrap admin token");
    assert!(token.starts_with("la_sk_"), "unexpected token: {token}");

    let (status, body) =
        ureq_get(&router.url("/api/tokens/list"), Some(&token)).expect("should answer");
    assert_eq!(status, 200, "unexpected body: {body}");
}

/// Authorisation is by scope, not by "any valid token".
#[test]
fn client_tokens_cannot_reach_the_admin_surface() {
    let router = Router::start(&[]);
    let admin = router.bootstrap_token.clone().expect("bootstrap token");

    let (status, body) = ureq_post(
        &router.url("/api/tokens"),
        Some(&admin),
        r#"{"ttl_hours":1,"label":"task"}"#,
    )
    .expect("should answer");
    assert_eq!(status, 200, "unexpected body: {body}");
    let client = token_from(&body);

    let (status, body) =
        ureq_get(&router.url("/api/tokens/list"), Some(&client)).expect("should answer");
    assert_eq!(
        status, 401,
        "a client token must not read the admin surface: {body}"
    );
}

/// An admin-scoped token minted over HTTP works, and can rotate itself.
#[test]
fn admin_scoped_tokens_are_issuable_and_rotatable_over_http() {
    let router = Router::start(&[]);
    let admin = router.bootstrap_token.clone().expect("bootstrap token");

    let (status, body) = ureq_post(
        &router.url("/api/tokens"),
        Some(&admin),
        r#"{"ttl_hours":1,"label":"ops","scope":"admin"}"#,
    )
    .expect("should answer");
    assert_eq!(status, 200, "unexpected body: {body}");
    let scoped = token_from(&body);

    let (status, body) =
        ureq_get(&router.url("/api/tokens/list"), Some(&scoped)).expect("should answer");
    assert_eq!(status, 200, "unexpected body: {body}");

    let (status, body) =
        ureq_post(&router.url("/api/tokens/rotate"), Some(&scoped), "{}").expect("should answer");
    assert_eq!(status, 200, "unexpected body: {body}");
    let replacement = token_from(&body);
    assert_ne!(replacement, scoped);

    // The rotated-away credential is revoked; its replacement works.
    let (status, _) =
        ureq_get(&router.url("/api/tokens/list"), Some(&scoped)).expect("should answer");
    assert_eq!(status, 401, "the rotated-away token must stop working");
    let (status, _) =
        ureq_get(&router.url("/api/tokens/list"), Some(&replacement)).expect("should answer");
    assert_eq!(status, 200);
}

/// An unknown scope is a client error, not a silently-ignored field.
#[test]
fn an_unknown_scope_is_rejected() {
    let router = Router::start(&[]);
    let admin = router.bootstrap_token.clone().expect("bootstrap token");

    let (status, body) = ureq_post(
        &router.url("/api/tokens"),
        Some(&admin),
        r#"{"ttl_hours":1,"label":"x","scope":"root"}"#,
    )
    .expect("should answer");
    assert_eq!(status, 400, "unexpected body: {body}");
}

/// The flat `TOKEN_ADMIN_KEY` keeps working unchanged as a bootstrap
/// credential, and suppresses the generated one.
#[test]
fn the_flat_admin_key_still_authorises() {
    let router = Router::start(&[("TOKEN_ADMIN_KEY", "s3cret-bootstrap-key")]);
    assert!(
        router.bootstrap_token.is_none(),
        "a configured admin key must not trigger token generation"
    );

    let (status, _) = ureq_get(&router.url("/api/tokens/list"), None).expect("should answer");
    assert_eq!(status, 401);

    let (status, _) =
        ureq_get(&router.url("/api/tokens/list"), Some("wrong-key")).expect("should answer");
    assert_eq!(status, 401);

    let (status, body) = ureq_get(
        &router.url("/api/tokens/list"),
        Some("s3cret-bootstrap-key"),
    )
    .expect("should answer");
    assert_eq!(status, 200, "unexpected body: {body}");
}

/// The historical open behaviour is still reachable, but only on purpose.
#[test]
fn allow_anonymous_admin_restores_the_open_surface() {
    let router = Router::start(&[("ALLOW_ANONYMOUS_ADMIN", "1")]);

    let (status, body) = ureq_post(
        &router.url("/api/tokens"),
        None,
        r#"{"ttl_hours":1,"label":"anyone"}"#,
    )
    .expect("should answer");
    assert_eq!(status, 200, "unexpected body: {body}");
    assert!(token_from(&body).starts_with("la_sk_"));
}

/// Guards the assumption that the binary under test is the one built from this
/// working tree (a stale `PATH` binary would make every assertion above lie).
#[test]
fn the_binary_under_test_comes_from_this_workspace() {
    let bin = PathBuf::from(env!("CARGO_BIN_EXE_link-assistant-router"));
    assert!(bin.exists(), "{} should exist", bin.display());
    assert!(bin.starts_with(env!("CARGO_MANIFEST_DIR")));
}
