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
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread::JoinHandle;
use std::time::{Duration, Instant};

fn free_port() -> u16 {
    // `bind(":0")` then drop releases the port before the child binds it, so
    // another test binary running concurrently can take it in that window.
    // The loser then sends its requests to the winner's router, which answers
    // with its own tokens -- seen on CI as a scoped token appearing
    // unrestricted, because the reply came from a router that had never heard
    // of the scope (issue #368).
    //
    // The OS still picks the port, since only it knows what is already in use.
    // What is added is that no port is handed out twice within this process,
    // which removes the collisions between the suites of one binary; a caller
    // that still loses to another binary retries (see `Router::start`).
    use std::sync::{Mutex, OnceLock};
    static HANDED_OUT: OnceLock<Mutex<std::collections::HashSet<u16>>> = OnceLock::new();
    let seen = HANDED_OUT.get_or_init(|| Mutex::new(std::collections::HashSet::new()));
    for _ in 0..4_000 {
        let port = TcpListener::bind("127.0.0.1:0")
            .expect("bind ephemeral")
            .local_addr()
            .expect("address")
            .port();
        if seen.lock().expect("port registry").insert(port) {
            return port;
        }
    }
    panic!("no unused ephemeral port")
}

struct Router {
    child: Child,
    socket: std::path::PathBuf,
    _directory: tempfile::TempDir,
    data: tempfile::TempDir,
    log: std::path::PathBuf,
    upstream_requests: Arc<Mutex<Vec<String>>>,
    upstream_stop: Arc<AtomicBool>,
    upstream_thread: Option<JoinHandle<()>>,
}

impl Drop for Router {
    fn drop(&mut self) {
        let _ = self.child.kill();
        let _ = self.child.wait();
        self.upstream_stop.store(true, Ordering::Release);
        if let Some(thread) = self.upstream_thread.take() {
            let _ = thread.join();
        }
    }
}

impl Router {
    fn start() -> Self {
        let directory = tempfile::tempdir().expect("socket directory");
        let data = tempfile::tempdir().expect("data dir");
        let socket = directory.path().join("router.sock");
        let upstream = TcpListener::bind("127.0.0.1:0").expect("bind GitHub stub");
        upstream.set_nonblocking(true).expect("nonblocking stub");
        let upstream_origin = format!("http://{}", upstream.local_addr().unwrap());
        let upstream_requests = Arc::new(Mutex::new(Vec::new()));
        let requests_for_thread = Arc::clone(&upstream_requests);
        let upstream_stop = Arc::new(AtomicBool::new(false));
        let stop_for_thread = Arc::clone(&upstream_stop);
        let upstream_thread = std::thread::spawn(move || {
            while !stop_for_thread.load(Ordering::Acquire) {
                match upstream.accept() {
                    Ok((mut stream, _)) => {
                        stream.set_nonblocking(false).unwrap();
                        stream
                            .set_read_timeout(Some(Duration::from_secs(2)))
                            .unwrap();
                        let mut bytes = vec![0_u8; 32 * 1024].into_boxed_slice();
                        let read = stream.read(&mut bytes).unwrap_or_default();
                        let request = String::from_utf8_lossy(&bytes[..read]).into_owned();
                        requests_for_thread.lock().unwrap().push(request.clone());
                        let (content_type, body) = if request.starts_with("GET /user ") {
                            ("application/json", r#"{"login":"router-test"}"#)
                        } else if request.starts_with("POST /graphql ") {
                            (
                                "application/json",
                                r#"{"data":{"viewer":{"login":"router-test"}}}"#,
                            )
                        } else if request.contains(".git/info/refs") {
                            (
                                "application/x-git-upload-pack-advertisement",
                                "001e# service=git-upload-pack\n0000",
                            )
                        } else {
                            ("application/json", r#"{"message":"not found"}"#)
                        };
                        let status = if body.contains("not found") {
                            "404 Not Found"
                        } else {
                            "200 OK"
                        };
                        write!(
                            stream,
                            "HTTP/1.1 {status}\r\ncontent-type: {content_type}\r\ncontent-length: {}\r\nconnection: close\r\n\r\n{body}",
                            body.len()
                        )
                        .expect("answer GitHub stub");
                    }
                    Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => {
                        std::thread::sleep(Duration::from_millis(10));
                    }
                    Err(error) => panic!("GitHub stub accept: {error}"),
                }
            }
        });
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
            .env("GITHUB_PROXY_TOKEN", "unix-socket-upstream-token")
            .env("GITHUB_PROXY_BASE_URL", upstream_origin)
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
            upstream_requests,
            upstream_stop,
            upstream_thread: Some(upstream_thread),
        };
        let deadline = Instant::now() + Duration::from_secs(40);
        while Instant::now() < deadline {
            if router
                .request("GET /api/v3/user HTTP/1.1")
                .contains(" 401 ")
            {
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
        self.request_with(line, &[], "")
    }

    fn request_with(&self, line: &str, headers: &[(&str, &str)], body: &str) -> String {
        let Ok(mut stream) = UnixStream::connect(&self.socket) else {
            return String::new();
        };
        let mut rendered_headers = String::new();
        for (name, value) in headers {
            std::fmt::Write::write_fmt(&mut rendered_headers, format_args!("{name}: {value}\r\n"))
                .expect("render request header");
        }
        if stream
            .write_all(
                format!(
                    "{line}\r\nHost: router.internal\r\n{rendered_headers}content-length: {}\r\nConnection: close\r\n\r\n{body}",
                    body.len()
                )
                .as_bytes(),
            )
            .is_err()
        {
            return String::new();
        }
        let mut response = String::new();
        let _ = stream.read_to_string(&mut response);
        response
    }

    fn upstream_requests(&self) -> Vec<String> {
        self.upstream_requests.lock().unwrap().clone()
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

    let response = router.request("GET /api/v3/user HTTP/1.1");

    assert!(response.contains(" 401 "), "{response}");
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

    let refused = router.request("GET /api/v3/user HTTP/1.1");
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
                "GET /api/v3/user HTTP/1.1\r\nHost: router.internal\r\n\
                 authorization: Bearer {token}\r\nConnection: close\r\n\r\n"
            )
            .as_bytes(),
        )
        .expect("send the authenticated request");
    let mut accepted = String::new();
    let _ = stream.read_to_string(&mut accepted);
    assert!(
        !accepted.contains(" 401 ") && !accepted.contains(" 403 ") && !accepted.contains(" 404 "),
        "an authenticated request must reach the configured upstream: {accepted}"
    );
}

#[test]
fn real_gh_api_uses_the_adapter_socket_and_router_token() {
    if Command::new("gh").arg("--version").output().is_err() {
        return;
    }
    let router = Router::start();
    let token = router.token();
    let config = tempfile::tempdir().expect("isolated gh config");
    let configured = Command::new("gh")
        .args([
            "config",
            "set",
            "http_unix_socket",
            router.socket.to_str().unwrap(),
        ])
        .env("GH_CONFIG_DIR", config.path())
        .output()
        .expect("configure gh socket");
    assert!(
        configured.status.success(),
        "gh config failed: {}",
        String::from_utf8_lossy(&configured.stderr)
    );

    let output = Command::new("gh")
        .args(["api", "user", "--hostname", "router.internal"])
        .env("GH_CONFIG_DIR", config.path())
        .env("GH_ENTERPRISE_TOKEN", &token)
        .env("GH_HOST", "router.internal")
        .env("NO_PROXY", "*")
        .env("no_proxy", "*")
        .output()
        .expect("run gh api through Router");
    assert!(
        output.status.success(),
        "gh api failed: {}",
        String::from_utf8_lossy(&output.stderr)
    );
    assert!(
        String::from_utf8_lossy(&output.stdout).contains("router-test"),
        "{}",
        String::from_utf8_lossy(&output.stdout)
    );
    let upstream = router.upstream_requests();
    assert!(upstream.iter().any(|request| {
        request.starts_with("GET /user ")
            && request
                .to_ascii_lowercase()
                .contains("authorization: bearer unix-socket-upstream-token")
    }));
}

#[test]
fn adapter_socket_routes_graphql_and_git_transport() {
    let router = Router::start();
    let token = router.token();
    let authorization = format!("Bearer {token}");
    let graphql = router.request_with(
        "POST /api/graphql HTTP/1.1",
        &[
            ("authorization", &authorization),
            ("content-type", "application/json"),
        ],
        r#"{"query":"query { viewer { login } }"}"#,
    );
    assert!(graphql.contains(" 200 "), "{graphql}");
    assert!(graphql.contains("router-test"), "{graphql}");

    let git = router.request_with(
        "GET /git/acme/demo.git/info/refs?service=git-upload-pack HTTP/1.1",
        &[("authorization", &authorization)],
        "",
    );
    assert!(git.contains(" 200 "), "{git}");
    assert!(git.contains("service=git-upload-pack"), "{git}");

    let upstream = router.upstream_requests();
    assert!(
        upstream
            .iter()
            .any(|request| request.starts_with("POST /graphql ")),
        "{upstream:?}"
    );
    assert!(
        upstream
            .iter()
            .any(|request| request.contains(".git/info/refs?service=git-upload-pack")),
        "{upstream:?}"
    );
}
