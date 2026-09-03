//! The `request`/`response` log lines an operator actually reads.
//!
//! Issue #320 left `model=-` on every line even when the request store held the
//! model for the same exchange. The unit tests cover the extraction; this
//! covers the line, because the defect was that a populated field never
//! reached it.

use std::io::{BufRead as _, BufReader, Read as _, Write as _};
use std::net::{TcpListener, TcpStream};
use std::process::{Child, ChildStderr, Command, Stdio};
use std::sync::mpsc::{Receiver, RecvTimeoutError, channel};
use std::time::{Duration, Instant};

struct Router {
    child: Child,
    port: u16,
    lines: Receiver<String>,
    _data_dir: tempfile::TempDir,
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
        let mut child = Command::new(env!("CARGO_BIN_EXE_link-assistant-router"))
            .arg("serve")
            .env("TOKEN_SECRET", "request-log-line-test-secret")
            .env("ROUTER_HOST", "127.0.0.1")
            .env("ROUTER_PORT", port.to_string())
            .env("DATA_DIR", data_dir.path())
            .env("STORAGE_POLICY", "text")
            .env("CLAUDE_CODE_HOME", data_dir.path().join("claude"))
            .env("DISABLE_LOGIN_API", "true")
            // The model is read from the body, and the body is only read once
            // the caller is authenticated; an anonymous request is refused on
            // its headers alone. Minting a token is what lets the request
            // reach routing, which is where the model matters.
            .env("ALLOW_ANONYMOUS_ADMIN", "true")
            .stdout(Stdio::null())
            .stderr(Stdio::piped())
            .spawn()
            .expect("start router");
        let stderr = child.stderr.take().expect("piped stderr");
        let lines = drain(stderr);
        let router = Self {
            child,
            port,
            lines,
            _data_dir: data_dir,
        };
        router.wait_until_ready();
        router
    }

    fn wait_until_ready(&self) {
        let deadline = Instant::now() + Duration::from_secs(30);
        while Instant::now() < deadline {
            if self.get("/api/health").is_some() {
                return;
            }
            std::thread::sleep(Duration::from_millis(100));
        }
        panic!("router did not become ready");
    }

    fn get(&self, path: &str) -> Option<String> {
        let mut stream = TcpStream::connect(("127.0.0.1", self.port)).ok()?;
        write!(
            stream,
            "GET {path} HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n"
        )
        .ok()?;
        let mut response = String::new();
        stream.read_to_string(&mut response).ok()?;
        Some(response)
    }

    fn post(&self, path: &str, headers: &str, body: &str) -> String {
        let mut stream =
            TcpStream::connect(("127.0.0.1", self.port)).expect("connect to the router");
        write!(
            stream,
            "POST {path} HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\
             content-type: application/json\r\ncontent-length: {}\r\n{headers}\r\n{body}",
            body.len()
        )
        .expect("send the request");
        let mut response = String::new();
        stream
            .read_to_string(&mut response)
            .expect("read the response");
        response
    }

    /// Mint a client token, so a request gets past authentication.
    fn client_token(&self) -> String {
        let response = self.post(
            "/api/management/tokens",
            "",
            r#"{"label":"request-log-line-test","expires_in_seconds":3600}"#,
        );
        // The admin surface answers chunked, so the JSON is what sits between
        // the first `{` and the last `}` rather than the whole body.
        let start = response.find('{');
        let end = response.rfind('}');
        let json = match (start, end) {
            (Some(start), Some(end)) if end > start => &response[start..=end],
            _ => panic!("token response: {response}"),
        };
        let value: serde_json::Value =
            serde_json::from_str(json).unwrap_or_else(|_| panic!("token response: {response}"));
        value["token"]
            .as_str()
            .unwrap_or_else(|| panic!("a minted token: {response}"))
            .to_string()
    }

    /// Discard the lines the readiness probes produced.
    ///
    /// `wait_until_ready` polls `/api/health`, and each poll logs a line; without
    /// this a test reads a probe's line and asserts against the wrong request.
    fn discard_pending(&self) {
        while self.lines.try_recv().is_ok() {}
    }

    /// The `request` log line for one exact route.
    ///
    /// Token minting can finish writing its HTTP response just before its log
    /// line reaches this process. Matching the route keeps that earlier line
    /// from being mistaken for the inference request under test.
    fn await_request_line(&self, uri: &str) -> String {
        self.await_line("request", &format!("uri={uri}"))
    }

    /// The `response` log line paired with one request ID.
    fn await_response_line(&self, request_id: &str) -> String {
        self.await_line("response", &format!("request_id={request_id}"))
    }

    fn await_line(&self, kind: &str, marker: &str) -> String {
        let deadline = Instant::now() + Duration::from_secs(30);
        while Instant::now() < deadline {
            match self.lines.recv_timeout(Duration::from_millis(500)) {
                Ok(line) if line.contains(kind) && line.contains(marker) => return line,
                // A line that is not the one wanted, and a quiet interval,
                // both just mean "keep waiting until the deadline".
                Ok(_) | Err(RecvTimeoutError::Timeout) => {}
                Err(RecvTimeoutError::Disconnected) => break,
            }
        }
        panic!("no {kind} log line arrived");
    }
}

fn log_field<'a>(line: &'a str, name: &str) -> &'a str {
    let prefix = format!("{name}=");
    line.split_whitespace()
        .find_map(|field| field.strip_prefix(&prefix))
        .unwrap_or_else(|| panic!("missing {name} in log line: {line}"))
}

fn drain(stderr: ChildStderr) -> Receiver<String> {
    let (sender, receiver) = channel();
    std::thread::spawn(move || {
        for line in BufReader::new(stderr).lines().map_while(Result::ok) {
            if sender.send(strip_ansi(&line)).is_err() {
                return;
            }
        }
    });
    receiver
}

/// Remove the colour codes the subscriber writes to a pipe.
///
/// The field name and its `=` are coloured separately, so `model=x` is not a
/// substring of the raw line even when the line is exactly right — asserting
/// against it unstripped tests the terminal, not the log.
fn strip_ansi(line: &str) -> String {
    let mut plain = String::with_capacity(line.len());
    let mut characters = line.chars();
    while let Some(character) = characters.next() {
        if character != '\u{1b}' {
            plain.push(character);
            continue;
        }
        if characters.next() == Some('[') {
            for byte in characters.by_ref() {
                if byte.is_ascii_alphabetic() {
                    break;
                }
            }
        }
    }
    plain
}

/// The model a request names appears on the line that reports it.
///
/// Before issue #320, the field existed in the format but was never populated,
/// so every response line rendered `model=-` regardless of the request.
#[test]
fn the_response_line_names_the_model_the_request_asked_for() {
    let router = Router::start();
    router.discard_pending();

    // A model this synthetic catalog does not advertise. Without the field,
    // otherwise identical routing failures cannot be distinguished because the
    // URI is shared by every model on the same protocol surface.
    let token = router.client_token();
    router.discard_pending();
    let response = router.post(
        "/api/services/anthropic/v1/messages",
        &format!("authorization: Bearer {token}\r\n"),
        r#"{"model":"no-such-model-xyz","max_tokens":10,"messages":[]}"#,
    );
    assert!(
        response.starts_with("HTTP/1.1 4"),
        "an unadvertised model is refused: {}",
        response.lines().next().unwrap_or_default()
    );

    // Both lines, which is what the report asked for: the request line is
    // what an operator greps when the response never comes.
    let request_line = router.await_request_line("/api/services/anthropic/v1/messages");
    assert!(
        request_line.contains("model=no-such-model-xyz"),
        "the request line must name the model asked for: {request_line}"
    );
    let line = router.await_response_line(log_field(&request_line, "request_id"));
    assert!(
        line.contains("model=no-such-model-xyz"),
        "the refused model must be named on the line: {line}"
    );
    // The credential must never travel with it.
    assert!(
        !line.contains("la_sk_"),
        "no token value may appear on a log line: {line}"
    );
}

/// `-` stays reserved for a request that genuinely has no model.
///
/// A placeholder that means "unfilled" is what made the field useless; one
/// that means "there was none" is honest, so `/api/health` must still print it.
#[test]
fn a_request_with_no_model_still_reports_none() {
    let router = Router::start();
    let token = router.client_token();
    router.discard_pending();

    // A body that parses but names no model, sent authenticated so it reaches
    // routing: the model is genuinely absent rather than merely unread.
    router.post(
        "/api/services/anthropic/v1/messages",
        &format!("authorization: Bearer {token}\r\n"),
        r#"{"max_tokens":10,"messages":[]}"#,
    );

    let request_line = router.await_request_line("/api/services/anthropic/v1/messages");
    let line = router.await_response_line(log_field(&request_line, "request_id"));
    assert!(
        line.contains("model=-"),
        "a request naming no model reports none rather than guessing: {line}"
    );
    // Reserved for that case, not printed over a model that was named.
    assert!(
        !line.contains("model=no-such"),
        "the placeholder must not stand in for a real model: {line}"
    );
}
