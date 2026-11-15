use std::io::{Read, Write};
use std::net::TcpStream;
use std::process::{Child, Command, Stdio};
use std::time::{Duration, Instant};

#[path = "support/free_port.rs"]
mod free_port;
use free_port::free_port;

struct Router {
    child: Child,
    port: u16,
    data_dir: tempfile::TempDir,
}

impl Drop for Router {
    fn drop(&mut self) {
        let _ = self.child.kill();
        let _ = self.child.wait();
    }
}

impl Router {
    /// Start a router on a free port, and again on another port if it exits
    /// before it is ready: the port is released before the router binds it, so
    /// a parallel test's listener can take it first.
    fn start() -> Self {
        for _ in 0..5 {
            if let Some(router) = Self::try_start(free_port()) {
                return router;
            }
        }
        panic!("router never served /api/health on a port of its own");
    }

    fn try_start(port: u16) -> Option<Self> {
        let data_dir = tempfile::tempdir().expect("temporary data directory");
        let child = Command::new(env!("CARGO_BIN_EXE_link-assistant-router"))
            .arg("serve")
            .env("TOKEN_SECRET", "request-logging-test-secret")
            .env("ROUTER_HOST", "127.0.0.1")
            .env("ROUTER_PORT", port.to_string())
            .env("DATA_DIR", data_dir.path())
            .env("STORAGE_POLICY", "text")
            .env("CLAUDE_CODE_HOME", data_dir.path().join("claude"))
            .env("DISABLE_LOGIN_API", "true")
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
            .expect("start router");
        let mut router = Self {
            child,
            port,
            data_dir,
        };
        router.wait_until_ready().then_some(router)
    }

    fn request(&self, extra_headers: &str) -> Option<String> {
        let mut stream = TcpStream::connect(("127.0.0.1", self.port)).ok()?;
        write!(
            stream,
            "GET /api/health HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n{extra_headers}\r\n"
        )
        .ok()?;
        let mut response = String::new();
        stream.read_to_string(&mut response).ok()?;
        Some(response)
    }

    /// Send a request with a body, so the record can be checked against what
    /// the client actually transmitted.
    fn post(&self, path: &str, headers: &str, body: &str) -> Option<String> {
        let mut stream = TcpStream::connect(("127.0.0.1", self.port)).ok()?;
        write!(
            stream,
            "POST {path} HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\
             Content-Type: application/json\r\nContent-Length: {}\r\n{headers}\r\n{body}",
            body.len()
        )
        .ok()?;
        let mut response = String::new();
        stream.read_to_string(&mut response).ok()?;
        Some(response)
    }

    /// The `client_request` record for a correlation, once it lands.
    fn await_client_request(&self, needle: &str) -> String {
        let log_path = self
            .data_dir
            .path()
            .join("requests/unauthenticated/requests.lino");
        let deadline = Instant::now() + Duration::from_secs(5);
        while Instant::now() < deadline {
            if let Ok(log) = std::fs::read_to_string(&log_path) {
                for line in log.lines() {
                    if line.contains("\"client_request\"") && line.contains(needle) {
                        return line.to_string();
                    }
                }
            }
            std::thread::sleep(Duration::from_millis(25));
        }
        panic!("no client_request record containing {needle}");
    }

    /// Wait until this router answers `/api/health` with its bare `ok`, as
    /// `managed_server::tcp_health` checks (it arrives chunked); `false` if it exited first, as it
    /// does when another listener took its port.
    fn wait_until_ready(&mut self) -> bool {
        let deadline = Instant::now() + Duration::from_secs(30);
        while matches!(self.child.try_wait(), Ok(None)) {
            let response = self.request("").unwrap_or_default();
            if link_assistant_router::health_response::is_ready(&response) {
                return true;
            }
            assert!(Instant::now() < deadline, "router did not become ready");
            std::thread::sleep(Duration::from_millis(50));
        }
        false
    }
}

#[test]
fn successful_request_is_logged_by_default() {
    let router = Router::start();
    let response = router
        .request("x-test-marker: issue-100-request\r\n")
        .expect("successful request");
    assert!(response.starts_with("HTTP/1.1 200"));

    let log_path = router
        .data_dir
        .path()
        .join("requests/unauthenticated/requests.lino");
    let deadline = Instant::now() + Duration::from_secs(5);
    while Instant::now() < deadline {
        if let Ok(log) = std::fs::read_to_string(&log_path)
            && log.contains("issue-100-request")
        {
            assert!(log.contains("correlation_id"));
            assert!(log.contains("client_request"));
            return;
        }
        std::thread::sleep(Duration::from_millis(25));
    }
    panic!(
        "successful request was not written to {}",
        log_path.display()
    );
}

/// A small JSON request refused at authentication retains its redacted body.
/// This keeps the diagnostic content without letting an unauthenticated caller
/// force large or streaming bodies into memory (issues #210 and #429).
#[test]
fn a_rejected_request_does_not_claim_an_empty_body() {
    let router = Router::start();
    let response = router
        .post(
            "/api/services/openai/v1/chat/completions",
            "authorization: Bearer la_sk_invalid\r\nx-test-marker: issue-210-rejected\r\n",
            r#"{"model":"m","messages":[{"role":"user","content":"MARKER-210"}]}"#,
        )
        .expect("rejected request");
    assert!(
        response.starts_with("HTTP/1.1 401"),
        "expected a 401, got: {}",
        response.lines().next().unwrap_or_default()
    );

    let record = router.await_client_request("issue-210-rejected");
    let record =
        link_assistant_router::lino_json::decode_line(&record).expect("record is readable");
    let body = &record["body"];
    assert_ne!(body, "", "declared body must not be empty: {record}");
    assert_eq!(body["messages"][0]["content"], "MARKER-210");
}

/// The marker must not swallow the genuinely bodiless case: a `GET` with no
/// body has to stay distinguishable from a body that was never read.
#[test]
fn a_bodiless_request_is_still_logged_as_empty() {
    let router = Router::start();
    router
        .request("x-test-marker: issue-210-bodiless\r\n")
        .expect("bodiless request");

    let record = router.await_client_request("issue-210-bodiless");
    let record =
        link_assistant_router::lino_json::decode_line(&record).expect("record is readable");
    assert_eq!(
        record["body"], "",
        "a request that declared no body is genuinely empty: {record}"
    );
}

/// The two fields must agree: a record that reports a non-zero
/// `content-length` must not also report an empty body.
#[test]
fn a_declared_content_length_implies_a_non_empty_logged_body() {
    let router = Router::start();
    router
        .post(
            "/api/services/openai/v1/chat/completions",
            "authorization: Bearer la_sk_invalid\r\nx-test-marker: issue-210-consistent\r\n",
            r#"{"model":"m","messages":[{"role":"user","content":"CONSISTENCY"}]}"#,
        )
        .expect("rejected request");

    let record = router.await_client_request("issue-210-consistent");
    let record =
        link_assistant_router::lino_json::decode_line(&record).expect("record is readable");
    let declared: u64 = record["headers"]["content-length"]
        .as_str()
        .expect("content-length is logged")
        .parse()
        .expect("content-length is a number");
    assert!(declared > 0, "{record}");
    assert_ne!(
        record["body"], "",
        "content-length {declared} contradicts an empty body: {record}"
    );
}

/// A request whose body was genuinely read and was empty must not be labelled
/// as unread. The marker keys on the contradiction between a declared length
/// and an empty buffer, so a `content-length: 0` body takes the normal path.
#[test]
fn a_zero_length_body_is_not_reported_as_unread() {
    let router = Router::start();
    router
        .post(
            "/api/services/openai/v1/chat/completions",
            "authorization: Bearer la_sk_invalid\r\nx-test-marker: issue-210-zero-length\r\n",
            "",
        )
        .expect("zero-length request");

    let record = router.await_client_request("issue-210-zero-length");
    let record =
        link_assistant_router::lino_json::decode_line(&record).expect("record is readable");
    let body = record["body"].as_str().unwrap_or_default();
    assert!(
        !body.contains("NOT READ"),
        "a declared-empty body must not be marked unread: {record}"
    );
}
