use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::process::{Child, Command, Stdio};
use std::time::{Duration, Instant};

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
    fn start() -> Self {
        let port = TcpListener::bind("127.0.0.1:0")
            .expect("bind an ephemeral port")
            .local_addr()
            .expect("ephemeral address")
            .port();
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
        let router = Self {
            child,
            port,
            data_dir,
        };
        router.wait_until_ready();
        router
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

    fn wait_until_ready(&self) {
        let deadline = Instant::now() + Duration::from_secs(30);
        while Instant::now() < deadline {
            if self
                .request("")
                .is_some_and(|r| r.starts_with("HTTP/1.1 200"))
            {
                return;
            }
            std::thread::sleep(Duration::from_millis(50));
        }
        panic!("router did not become ready");
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

/// A request refused at authentication is logged with an empty body even though
/// the client sent one, so the record asserts `content-length: N` and
/// `"body": ""` at the same time. The body is captured lazily as a handler
/// reads the stream, and a rejected request is never read (issue #210).
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
    let body = record["body"].as_str().expect("body field is a string");
    assert_ne!(
        body, "",
        "a request that declared a body must not be logged as empty: {record}"
    );
    assert!(
        body.contains("MARKER-210") || body.contains("NOT READ"),
        "body must be the content or an explicit marker, got {body:?}"
    );
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
