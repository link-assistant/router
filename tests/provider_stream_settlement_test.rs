//! An OpenAI-compatible stream is settled with a terminal record.
//!
//! Of the four streaming relays, only the Anthropic path called `settle_stream`.
//! This one recorded every frame and then simply stopped, so its exchanges
//! reached the log with no terminal record and `logs anomalies` could only
//! report the ending as unknown even when the recorded stream had completed
//! (issue #258).

use std::io::{Read as _, Write as _};
use std::net::{TcpListener, TcpStream};
use std::process::{Child, Command, Stdio};
use std::time::{Duration, Instant};

use serde_json::Value;

/// An upstream that answers one chat completion as a complete SSE stream.
fn spawn_upstream() -> (u16, std::thread::JoinHandle<()>) {
    let listener = TcpListener::bind("127.0.0.1:0").expect("bind upstream");
    let port = listener.local_addr().expect("upstream address").port();
    let handle = std::thread::spawn(move || {
        for stream in listener.incoming().take(1) {
            let Ok(mut stream) = stream else { continue };
            let mut scratch = [0; 8192];
            let _ = stream.read(&mut scratch);
            let body = "data: {\"choices\":[{\"delta\":{\"content\":\"hi\"}}]}\n\n\
                        data: [DONE]\n\n";
            let _ = stream.write_all(
                format!(
                    "HTTP/1.1 200 OK\r\ncontent-type: text/event-stream\r\n\
                     content-length: {}\r\nconnection: close\r\n\r\n{body}",
                    body.len()
                )
                .as_bytes(),
            );
        }
    });
    (port, handle)
}

struct Router {
    child: Child,
    port: u16,
}

impl Drop for Router {
    fn drop(&mut self) {
        let _ = self.child.kill();
        let _ = self.child.wait();
    }
}

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

/// Send one request, returning an empty string when nothing is listening yet.
fn http(port: u16, request: &str) -> String {
    let Ok(mut stream) = TcpStream::connect(("127.0.0.1", port)) else {
        return String::new();
    };
    if stream.write_all(request.as_bytes()).is_err() {
        return String::new();
    }
    let mut response = String::new();
    let _ = stream.read_to_string(&mut response);
    response
}

impl Router {
    /// Start a router, retrying if a sibling test binary won the port.
    ///
    /// `free_port` releases the port before the child binds it, so a
    /// concurrent test binary can take it. Losing is recoverable -- the next
    /// port differs -- so it is retried (issue #368).
    fn start(upstream: u16, data: &std::path::Path, log: &std::path::Path) -> Self {
        for _ in 0..10 {
            if let Some(router) = Self::try_start(upstream, data, log) {
                return router;
            }
        }
        panic!("could not claim a port for the router in ten attempts");
    }

    fn try_start(upstream: u16, data: &std::path::Path, log: &std::path::Path) -> Option<Self> {
        let port = free_port();
        let child = Command::new(env!("CARGO_BIN_EXE_link-assistant-router"))
            .arg("serve")
            .env("TOKEN_SECRET", "provider-stream-test-secret")
            .env("ROUTER_HOST", "127.0.0.1")
            .env("ROUTER_PORT", port.to_string())
            .env("STORAGE_POLICY", "text")
            .env("DATA_DIR", data)
            .env("REQUEST_LOG", log)
            .env("DISABLE_LOGIN_API", "true")
            .env("UPSTREAM_PROVIDER", "openai-compatible")
            .env(
                "OPENAI_COMPATIBLE_BASE_URL",
                format!("http://127.0.0.1:{upstream}"),
            )
            .env("OPENAI_COMPATIBLE_MODEL", "test-model")
            .env("OPENAI_COMPATIBLE_API_KEY", "upstream-key")
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
            .expect("start router");
        let mut router = Self { child, port };
        let deadline = Instant::now() + Duration::from_secs(30);
        while Instant::now() < deadline {
            // A reply here may come from a sibling binary that won the port;
            // a child that lost exits, which is what tells them apart.
            match router.child.try_wait() {
                Ok(Some(_)) => return None,
                Ok(None) => {}
                Err(error) => panic!("cannot poll the router: {error}"),
            }
            if http(
                router.port,
                "GET /api/health HTTP/1.1\r\nHost: x\r\nConnection: close\r\n\r\n",
            )
            .contains(" 200 ")
            {
                return Some(router);
            }
            std::thread::sleep(Duration::from_millis(100));
        }
        panic!("router never became healthy on port {}", router.port);
    }
}

/// A streamed turn through this relay must leave a terminal record saying it
/// completed — the record whose absence made every such exchange look unknown.
#[test]
fn an_openai_compatible_stream_is_settled_in_the_log() {
    let (upstream, upstream_thread) = spawn_upstream();
    let data = tempfile::tempdir().expect("data dir");
    let log = tempfile::tempdir().expect("log dir");
    let router = Router::start(upstream, data.path(), log.path());

    let token = String::from_utf8_lossy(
        &Command::new(env!("CARGO_BIN_EXE_link-assistant-router"))
            .args(["tokens", "issue", "--ttl-hours", "1", "--label", "t"])
            .env("TOKEN_SECRET", "provider-stream-test-secret")
            .env("DATA_DIR", data.path())
            .env("STORAGE_POLICY", "text")
            .output()
            .expect("issue a token")
            .stdout,
    )
    .lines()
    .last()
    .unwrap_or_default()
    .trim()
    .to_string();
    assert!(!token.is_empty(), "a token is needed to reach the proxy");

    let body =
        r#"{"model":"test-model","stream":true,"messages":[{"role":"user","content":"hi"}]}"#;
    let response = http(
        router.port,
        &format!(
            "POST /api/services/openai/v1/chat/completions HTTP/1.1\r\nHost: x\r\n\
             authorization: Bearer {token}\r\ncontent-type: application/json\r\n\
             content-length: {}\r\nConnection: close\r\n\r\n{body}",
            body.len()
        ),
    );
    assert!(response.contains(" 200 "), "proxy call failed: {response}");
    let _ = upstream_thread.join();

    // The relay writes the terminal record as the stream finishes, which is
    // after the response head has been read back here.
    let deadline = Instant::now() + Duration::from_secs(10);
    let mut settled = None;
    while Instant::now() < deadline && settled.is_none() {
        settled = read_stream_end(log.path());
        if settled.is_none() {
            std::thread::sleep(Duration::from_millis(100));
        }
    }

    let record = settled.expect("the relay must write a terminal record for a stream it forwards");
    assert_eq!(record["streamed"], Value::Bool(true), "{record}");
    assert_eq!(
        record["outcome"], "completed",
        "the upstream sent [DONE], so the turn completed: {record}"
    );
    assert_eq!(record["complete"], Value::Bool(true), "{record}");
}

/// The `stream_end` record from any token directory under `root`.
fn read_stream_end(root: &std::path::Path) -> Option<Value> {
    for entry in std::fs::read_dir(root).ok()? {
        let path = entry.ok()?.path().join("requests.lino");
        let Ok(contents) = std::fs::read_to_string(&path) else {
            continue;
        };
        for line in contents.lines() {
            let Some(record) = link_assistant_router::lino_json::decode_line(line) else {
                continue;
            };
            if record.get("phase").and_then(Value::as_str) == Some("stream_end") {
                return Some(record);
            }
        }
    }
    None
}
