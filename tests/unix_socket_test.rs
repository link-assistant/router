//! The router answers on a unix socket, so `gh` can reach it without TLS.
//!
//! `gh` builds a custom host's REST base as `https://<host>/api/v3/`. On Linux
//! it can be pointed at a self-signed certificate with `SSL_CERT_FILE`, which
//! Go's `crypto/x509` reads in `root_unix.go`; on macOS `root_darwin.go` uses
//! the Security framework and ignores it, and `gh` has no `--cacert` flag, so
//! there the certificate cannot be handed over at all (issue #270). It does
//! honour `http_unix_socket` everywhere, and over a socket it speaks plain
//! HTTP, so a socket sidesteps the certificate problem on both (issue #265).

#![cfg(unix)]

use std::io::{Read as _, Write as _};
use std::net::TcpListener;
use std::os::unix::net::UnixStream;
use std::process::{Child, Command, Stdio};
use std::time::{Duration, Instant};

fn free_port() -> u16 {
    TcpListener::bind("127.0.0.1:0")
        .expect("bind ephemeral")
        .local_addr()
        .expect("address")
        .port()
}

struct Router {
    child: Child,
    socket: std::path::PathBuf,
    _directory: tempfile::TempDir,
    data: tempfile::TempDir,
    log: std::path::PathBuf,
}

impl Drop for Router {
    fn drop(&mut self) {
        let _ = self.child.kill();
        let _ = self.child.wait();
    }
}

impl Router {
    fn start() -> Self {
        let directory = tempfile::tempdir().expect("socket directory");
        let data = tempfile::tempdir().expect("data dir");
        let socket = directory.path().join("router.sock");
        // The router reports why it could not start on stderr, so it is kept
        // rather than discarded: a startup failure here used to surface only
        // as "never answered", with the reason thrown away, which left a CI
        // failure with nothing to diagnose it by (issue #365).
        let log = directory.path().join("router.log");
        let stderr = std::fs::File::create(&log).expect("create the router log");
        let child = Command::new(env!("CARGO_BIN_EXE_link-assistant-router"))
            .arg("serve")
            .env("TOKEN_SECRET", "unix-socket-test-secret")
            .env("ROUTER_HOST", "127.0.0.1")
            .env("ROUTER_PORT", free_port().to_string())
            .env("STORAGE_POLICY", "text")
            .env("DATA_DIR", data.path())
            .env("DISABLE_LOGIN_API", "true")
            .env("LISTEN_UNIX_SOCKET", &socket)
            .stdout(Stdio::null())
            .stderr(Stdio::from(stderr))
            .spawn()
            .expect("start the router");
        let mut router = Self {
            child,
            socket,
            _directory: directory,
            data,
            log,
        };
        let deadline = Instant::now() + Duration::from_secs(40);
        while Instant::now() < deadline {
            if router.request("GET /health HTTP/1.1").contains(" 200 ") {
                return router;
            }
            // A process that has already exited will never answer, so waiting
            // out the full deadline only delays the report.
            if let Ok(Some(status)) = router.child.try_wait() {
                panic!(
                    "the router exited with {status} before answering on {}\n{}",
                    router.socket.display(),
                    router.log()
                );
            }
            std::thread::sleep(Duration::from_millis(150));
        }
        panic!(
            "router never answered on {} within 40s\n{}",
            router.socket.display(),
            router.log()
        );
    }

    /// What the router wrote to stderr, for a panic message that can be acted on.
    fn log(&self) -> String {
        match std::fs::read_to_string(&self.log) {
            Ok(text) if text.trim().is_empty() => "router stderr: <empty>".to_string(),
            Ok(text) => format!("router stderr:\n{text}"),
            Err(error) => format!("router stderr unavailable: {error}"),
        }
    }

    /// One plain-HTTP request over the socket — no TLS anywhere.
    fn request(&self, line: &str) -> String {
        let Ok(mut stream) = UnixStream::connect(&self.socket) else {
            return String::new();
        };
        if stream
            .write_all(
                format!("{line}\r\nHost: router.internal\r\nConnection: close\r\n\r\n").as_bytes(),
            )
            .is_err()
        {
            return String::new();
        }
        let mut response = String::new();
        let _ = stream.read_to_string(&mut response);
        response
    }

    fn token(&self) -> String {
        let output = Command::new(env!("CARGO_BIN_EXE_link-assistant-router"))
            .args(["tokens", "issue", "--ttl-hours", "1", "--label", "gh"])
            .env("TOKEN_SECRET", "unix-socket-test-secret")
            .env("DATA_DIR", self.data.path())
            .env("STORAGE_POLICY", "text")
            .output()
            .expect("issue a token");
        String::from_utf8_lossy(&output.stdout)
            .lines()
            .last()
            .unwrap_or_default()
            .trim()
            .to_string()
    }
}

/// The socket serves plain HTTP, which is what makes it usable by a client
/// that cannot be handed a certificate.
#[test]
fn the_socket_answers_plain_http() {
    let router = Router::start();

    let response = router.request("GET /health HTTP/1.1");

    assert!(response.contains(" 200 "), "{response}");
    assert!(
        !response.is_empty(),
        "a TLS listener would have rejected a plaintext request"
    );
}

/// The socket is owner-only, so it is no wider a door than the loopback port.
#[test]
fn the_socket_is_owner_only() {
    use std::os::unix::fs::PermissionsExt as _;

    let router = Router::start();

    let mode = std::fs::metadata(&router.socket)
        .expect("stat the socket")
        .permissions()
        .mode();
    assert_eq!(mode & 0o777, 0o600, "mode was {:o}", mode & 0o777);
}

/// Reaching the router over a socket does not bypass authentication: the
/// credential is still required, so the socket is a transport, not a back door.
#[test]
fn the_socket_still_requires_a_token() {
    let router = Router::start();

    let refused = router.request("GET /v1/models HTTP/1.1");
    assert!(
        refused.contains(" 401 ") || refused.contains(" 403 "),
        "an unauthenticated request must be refused: {refused}"
    );

    let token = router.token();
    assert!(!token.is_empty(), "a token is needed for the positive case");
    let Ok(mut stream) = UnixStream::connect(&router.socket) else {
        panic!("connect over the socket");
    };
    stream
        .write_all(
            format!(
                "GET /v1/models HTTP/1.1\r\nHost: router.internal\r\n\
                 authorization: Bearer {token}\r\nConnection: close\r\n\r\n"
            )
            .as_bytes(),
        )
        .expect("send the authenticated request");
    let mut accepted = String::new();
    let _ = stream.read_to_string(&mut accepted);
    assert!(accepted.contains(" 200 "), "{accepted}");
}
