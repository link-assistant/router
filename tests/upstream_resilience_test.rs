//! A stalled upstream stream and upstream redirects, through the real binary
//! (issues #668 and #669).
//!
//! The idle timeout is read from the environment when the HTTP client is
//! built, so these tests start the router as a child process with
//! `UPSTREAM_IDLE_TIMEOUT_SECS=1` rather than changing this process's
//! environment.

use std::io::{Read as _, Write as _};
use std::net::{TcpListener, TcpStream};
use std::process::{Child, Command, Stdio};
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::{Arc, Mutex, OnceLock};
use std::time::{Duration, Instant};

use link_assistant_router::config::StoragePolicy;
use link_assistant_router::storage::build_token_store;
use link_assistant_router::token::{IssueRequest, TokenManager};

const SECRET: &str = "upstream-resilience-test-secret";
/// How long a stalled stub holds the stream open; far beyond the idle timeout.
const STALL: Duration = Duration::from_secs(30);

/// What the stub answers to a `POST`.
#[derive(Clone)]
enum Post {
    /// Headers and one SSE event, then silence.
    Stall(&'static str),
    /// A redirect to the given location.
    Redirect(u16, String),
}

/// Read a request head and its announced body; empty when the peer closes.
fn read_request(stream: &mut TcpStream) -> String {
    let mut request = Vec::new();
    let mut byte = [0; 1];
    while !request.ends_with(b"\r\n\r\n") {
        match stream.read(&mut byte) {
            Ok(1) => request.push(byte[0]),
            _ => return String::new(),
        }
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
    let _ = stream.read_exact(&mut body);
    head
}

/// An upstream that lists `test-model` for any `GET` and answers every `POST`
/// with `answer`. Returns its port and the `POST` request lines it received.
fn spawn_upstream(answer: Post) -> (u16, Arc<Mutex<Vec<String>>>) {
    let listener = TcpListener::bind("127.0.0.1:0").expect("bind upstream");
    let port = listener.local_addr().expect("upstream address").port();
    let posts = Arc::new(Mutex::new(Vec::new()));
    let recorded = posts.clone();
    std::thread::spawn(move || {
        for stream in listener.incoming() {
            let Ok(mut stream) = stream else { continue };
            let answer = answer.clone();
            let recorded = recorded.clone();
            std::thread::spawn(move || {
                let head = read_request(&mut stream);
                if head.starts_with("GET ") {
                    let body = r#"{"object":"list","data":[{"id":"test-model"}]}"#;
                    let _ = write!(
                        stream,
                        "HTTP/1.1 200 OK\r\ncontent-type: application/json\r\n\
                         content-length: {}\r\nconnection: close\r\n\r\n{body}",
                        body.len()
                    );
                    return;
                }
                recorded
                    .lock()
                    .unwrap()
                    .push(head.lines().next().unwrap_or_default().to_string());
                match answer {
                    Post::Stall(event) => {
                        let _ = write!(
                            stream,
                            "HTTP/1.1 200 OK\r\ncontent-type: text/event-stream\r\n\
                             transfer-encoding: chunked\r\n\r\n{:x}\r\n{event}\r\n",
                            event.len()
                        );
                        let _ = stream.flush();
                        std::thread::sleep(STALL);
                    }
                    Post::Redirect(status, location) => {
                        let _ = write!(
                            stream,
                            "HTTP/1.1 {status} Redirect\r\nlocation: {location}\r\n\
                             content-length: 0\r\nconnection: close\r\n\r\n"
                        );
                    }
                }
            });
        }
    });
    (port, posts)
}

/// A server that only counts the connections reaching it.
fn spawn_redirect_target() -> (u16, Arc<AtomicUsize>) {
    let listener = TcpListener::bind("127.0.0.1:0").expect("bind target");
    let port = listener.local_addr().expect("target address").port();
    let hits = Arc::new(AtomicUsize::new(0));
    let counted = hits.clone();
    std::thread::spawn(move || {
        for stream in listener.incoming() {
            counted.fetch_add(1, Ordering::SeqCst);
            drop(stream);
        }
    });
    (port, hits)
}

struct Router {
    child: Child,
    port: u16,
    data: tempfile::TempDir,
}

impl Drop for Router {
    fn drop(&mut self) {
        let _ = self.child.kill();
        let _ = self.child.wait();
    }
}

/// An ephemeral port never handed out twice in this process (issue #368).
fn free_port() -> u16 {
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

/// Send one request and read until the router closes the connection.
fn http(port: u16, request: &str) -> String {
    let Ok(mut stream) = TcpStream::connect(("127.0.0.1", port)) else {
        return String::new();
    };
    let _ = stream.set_read_timeout(Some(Duration::from_secs(20)));
    if stream.write_all(request.as_bytes()).is_err() {
        return String::new();
    }
    let mut response = Vec::new();
    let _ = stream.read_to_end(&mut response);
    String::from_utf8_lossy(&response).to_string()
}

impl Router {
    /// Start a router with `env`, retrying if a sibling binary won the port.
    fn start(env: &[(&str, String)]) -> Self {
        for _ in 0..10 {
            if let Some(router) = Self::try_start(env) {
                return router;
            }
        }
        panic!("could not claim a port for the router in ten attempts");
    }

    fn try_start(env: &[(&str, String)]) -> Option<Self> {
        let port = free_port();
        let data = tempfile::tempdir().expect("data dir");
        // A Claude subscription for the Anthropic tests; unused otherwise.
        let claude = data.path().join("claude");
        std::fs::create_dir_all(&claude).expect("claude home");
        std::fs::write(
            claude.join(".credentials.json"),
            r#"{"claudeAiOauth":{"accessToken":"tok-primary","refreshToken":"refresh-primary","expiresAt":4102444800000}}"#,
        )
        .expect("write credentials");
        let mut command = Command::new(env!("CARGO_BIN_EXE_link-assistant-router"));
        command
            .arg("serve")
            .env("TOKEN_SECRET", SECRET)
            .env("ROUTER_HOST", "127.0.0.1")
            .env("ROUTER_PORT", port.to_string())
            .env("STORAGE_POLICY", "text")
            .env("UPSTREAM_ALLOW_PRIVATE_NETWORKS", "loopback")
            .env("UPSTREAM_IDLE_TIMEOUT_SECS", "1")
            .env("DATA_DIR", data.path())
            .env("REQUEST_LOG", data.path().join("requests"))
            .env("CLAUDE_CODE_HOME", &claude)
            .env("DISABLE_LOGIN_API", "true")
            .stdout(Stdio::null())
            .stderr(Stdio::null());
        for (name, value) in env {
            command.env(name, value);
        }
        let child = command.spawn().expect("start router");
        let mut router = Self { child, port, data };
        let deadline = Instant::now() + Duration::from_secs(30);
        while Instant::now() < deadline {
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

    fn token(&self, client_kind: &str) -> String {
        let store = build_token_store(StoragePolicy::Text, self.data.path()).expect("token store");
        TokenManager::with_store(SECRET, store)
            .issue(&IssueRequest {
                ttl_hours: 1,
                label: "upstream resilience client",
                account: Some("primary"),
                client_kind: Some(client_kind),
                principal_id: Some("primary"),
                ..IssueRequest::default()
            })
            .expect("issue a token")
    }

    fn post(&self, path: &str, headers: &str, body: &str) -> String {
        http(
            self.port,
            &format!(
                "POST {path} HTTP/1.1\r\nHost: x\r\n{headers}content-type: application/json\r\n\
                 content-length: {}\r\nConnection: close\r\n\r\n{body}",
                body.len()
            ),
        )
    }
}

fn openai_compatible(upstream: u16) -> Router {
    Router::start(&[
        ("UPSTREAM_PROVIDER", "openai-compatible".into()),
        (
            "OPENAI_COMPATIBLE_BASE_URL",
            format!("http://127.0.0.1:{upstream}"),
        ),
        ("OPENAI_COMPATIBLE_MODEL", "test-model".into()),
        ("OPENAI_COMPATIBLE_API_KEY", "upstream-key".into()),
        ("OPENAI_COMPATIBLE_SUPPORTED_CLIENTS", "opencode".into()),
    ])
}

fn chat(router: &Router, stream: bool) -> String {
    let token = router.token("opencode");
    router.post(
        "/api/services/openai/v1/chat/completions",
        &format!(
            "authorization: Bearer {token}\r\nuser-agent: opencode/1.18.28\r\n\
             x-session-id: upstream-resilience\r\n"
        ),
        &format!(
            r#"{{"model":"test-model","stream":{stream},"messages":[{{"role":"user","content":"hi"}}]}}"#
        ),
    )
}

fn anthropic_subscription(upstream: u16) -> Router {
    Router::start(&[
        ("UPSTREAM_PROVIDER", "anthropic".into()),
        ("UPSTREAM_BASE_URL", format!("http://127.0.0.1:{upstream}")),
    ])
}

fn messages(router: &Router) -> String {
    let token = router.token("claude");
    router.post(
        "/api/services/anthropic/v1/messages",
        &format!(
            "x-api-key: {token}\r\nanthropic-version: 2023-06-01\r\n\
             user-agent: claude-cli/2.1.259\r\n"
        ),
        r#"{"model":"claude-sonnet-4-5","max_tokens":64,"stream":true,"messages":[{"role":"user","content":"hi"}]}"#,
    )
}

/// An `OpenAI` Chat stream that stalls after its first event ends, within a
/// few idle timeouts, with exactly one in-band error and no `[DONE]`.
#[test]
fn a_stalled_openai_chat_stream_ends_with_one_in_band_error() {
    let (upstream, posts) = spawn_upstream(Post::Stall(
        "data: {\"choices\":[{\"index\":0,\"delta\":{\"content\":\"partial\"}}]}\n\n",
    ));
    let router = openai_compatible(upstream);

    let started = Instant::now();
    let response = chat(&router, true);

    let elapsed = started.elapsed();
    assert!(
        elapsed >= Duration::from_secs(1),
        "ended by the idle timeout"
    );
    assert!(elapsed < STALL / 2, "the stall was cut short");
    assert_eq!(posts.lock().unwrap().len(), 1, "{response}");
    assert!(response.contains(" 200 "), "{response}");
    assert!(response.contains("partial"), "{response}");
    let errors = response
        .lines()
        .filter(|line| line.starts_with("data: ") && line.contains("\"error\""))
        .count();
    assert_eq!(errors, 1, "exactly one in-band error: {response}");
    assert!(!response.contains("[DONE]"), "{response}");
}

/// An Anthropic stream that stalls after `message_start` ends with exactly
/// one Anthropic `error` event.
#[test]
fn a_stalled_anthropic_stream_ends_with_one_in_band_error() {
    let (upstream, posts) = spawn_upstream(Post::Stall(
        "event: message_start\ndata: {\"type\":\"message_start\",\"message\":{\"id\":\"msg_1\",\
         \"type\":\"message\",\"role\":\"assistant\",\"model\":\"claude-sonnet-4-5\",\
         \"content\":[],\"stop_reason\":null,\"stop_sequence\":null,\
         \"usage\":{\"input_tokens\":3,\"output_tokens\":1}}}\n\n",
    ));
    let router = anthropic_subscription(upstream);

    let started = Instant::now();
    let response = messages(&router);

    let elapsed = started.elapsed();
    assert!(
        elapsed >= Duration::from_secs(1),
        "ended by the idle timeout"
    );
    assert!(elapsed < STALL / 2, "the stall was cut short");
    assert_eq!(posts.lock().unwrap().len(), 1, "{response}");
    assert!(response.contains(" 200 "), "{response}");
    assert!(response.contains("message_start"), "{response}");
    assert_eq!(
        response.matches("event: error").count(),
        1,
        "exactly one in-band error: {response}"
    );
}

/// A redirect from an API-key provider is relayed or refused, never
/// followed: the target never sees the request or the provider key.
#[test]
fn an_api_key_provider_redirect_is_not_followed() {
    for status in [302, 307] {
        let (target, hits) = spawn_redirect_target();
        let (upstream, posts) = spawn_upstream(Post::Redirect(
            status,
            format!("http://127.0.0.1:{target}/v1/chat/completions"),
        ));
        let router = openai_compatible(upstream);

        let response = chat(&router, false);

        assert_eq!(posts.lock().unwrap().len(), 1, "{response}");
        let status_line = response.lines().next().unwrap_or_default();
        assert!(
            !status_line.contains(" 200 "),
            "a redirect is not a success: {response}"
        );
        std::thread::sleep(Duration::from_millis(200));
        assert_eq!(
            hits.load(Ordering::SeqCst),
            0,
            "{status}: the redirect target was reached"
        );
    }
}
