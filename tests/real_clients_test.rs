//! Offline acceptance tests for the actual Claude Code, Codex, and `OpenCode`
//! binaries.
//!
//! Recorded fixtures remain the fast compatibility suite. This tier catches
//! the other half of client drift: whether the current executable still reads
//! the configuration written by `with-router` and emits the native request we
//! expect. Every model and Router endpoint used here is a loopback mock and
//! every answer is synthetic, so this never needs a vendor credential or
//! performs paid inference.

#![cfg(unix)]

use std::fmt::Write as _;
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::path::Path;
use std::process::{Command, Output, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};

use base64::Engine as _;
use serde_json::{Value, json};
use wait_timeout::ChildExt as _;

const CLAUDE_VERSION: &str = "2.1.260";
const CODEX_VERSION: &str = "0.153.3";
const OPENCODE_VERSION: &str = "1.18.28";
const PROMPT: &str = "Reply with exactly ROUTER_CAPTURE_OK";
const ANSWER: &str = "ROUTER_CAPTURE_OK";
const CODEX_ALTERNATE_MODEL: &str = "future-codex-switch-model";

#[derive(Clone, Copy)]
struct ClientCase {
    client: &'static str,
    executable: &'static str,
    version: &'static str,
    model: &'static str,
    owner: &'static str,
    inference_path: &'static str,
    user_agent_prefix: &'static str,
    credential_header: &'static str,
}

const CLAUDE: ClientCase = ClientCase {
    client: "claude",
    executable: "claude",
    version: CLAUDE_VERSION,
    model: "claude-sonnet-4-5-20250929",
    owner: "anthropic",
    inference_path: "/api/services/anthropic/v1/messages",
    user_agent_prefix: "claude-cli/2.1.260",
    credential_header: "authorization",
};

const CODEX: ClientCase = ClientCase {
    client: "codex",
    executable: "codex",
    version: CODEX_VERSION,
    model: "gpt-5.6-codex",
    owner: "openai",
    inference_path: "/api/services/codex/v1/responses",
    user_agent_prefix: "codex_exec/0.153.3",
    credential_header: "authorization",
};

const OPENCODE: ClientCase = ClientCase {
    client: "opencode",
    executable: "opencode",
    version: OPENCODE_VERSION,
    model: "future-chat-model",
    owner: "openai-compatible",
    inference_path: "/api/services/openai/v1/chat/completions",
    user_agent_prefix: "opencode/1.18.28",
    credential_header: "authorization",
};

#[derive(Clone, Debug)]
struct CapturedRequest {
    method: String,
    path: String,
    headers: Vec<(String, String)>,
    body: Vec<u8>,
}

impl CapturedRequest {
    fn header(&self, name: &str) -> Option<&str> {
        self.headers
            .iter()
            .find(|(candidate, _)| candidate.eq_ignore_ascii_case(name))
            .map(|(_, value)| value.as_str())
    }
}

struct MockRouter {
    origin: String,
    requests: Arc<Mutex<Vec<CapturedRequest>>>,
    stop: Arc<AtomicBool>,
    thread: Option<thread::JoinHandle<()>>,
}

impl MockRouter {
    fn start(case: ClientCase) -> Self {
        let listener = TcpListener::bind("127.0.0.1:0").expect("bind offline Router mock");
        listener
            .set_nonblocking(true)
            .expect("configure offline Router mock");
        let address = listener.local_addr().expect("offline Router address");
        let requests = Arc::new(Mutex::new(Vec::new()));
        let captured = Arc::clone(&requests);
        let stop = Arc::new(AtomicBool::new(false));
        let stopped = Arc::clone(&stop);
        let thread = thread::spawn(move || {
            while !stopped.load(Ordering::Acquire) {
                match listener.accept() {
                    Ok((mut stream, _)) => {
                        let request = read_request(&mut stream);
                        let response = mock_response(case, &request);
                        captured.lock().expect("capture request").push(request);
                        stream
                            .write_all(&response)
                            .expect("write offline Router response");
                    }
                    Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => {
                        thread::sleep(Duration::from_millis(10));
                    }
                    Err(error) => panic!("accept offline Router request: {error}"),
                }
            }
        });
        Self {
            origin: format!("http://{address}"),
            requests,
            stop,
            thread: Some(thread),
        }
    }

    fn inference_request(&self, path: &str) -> Option<CapturedRequest> {
        self.requests
            .lock()
            .expect("read captured requests")
            .iter()
            .find(|request| request.path == path)
            .cloned()
    }

    fn inference_requests(&self, path: &str) -> Vec<CapturedRequest> {
        self.requests
            .lock()
            .expect("read captured requests")
            .iter()
            .filter(|request| request.path == path)
            .cloned()
            .collect()
    }
}

impl Drop for MockRouter {
    fn drop(&mut self) {
        self.stop.store(true, Ordering::Release);
        let _ = TcpStream::connect(self.origin.trim_start_matches("http://"));
        if let Some(thread) = self.thread.take() {
            thread.join().expect("stop offline Router mock");
        }
    }
}

fn enabled() -> bool {
    std::env::var("ROUTER_REAL_CLIENT_TESTS").as_deref() == Ok("1")
}

fn command_exists(command: &str) -> bool {
    std::env::var_os("PATH").is_some_and(|path| {
        std::env::split_paths(&path).any(|directory| directory.join(command).is_file())
    })
}

fn read_request(stream: &mut TcpStream) -> CapturedRequest {
    stream
        .set_read_timeout(Some(Duration::from_secs(10)))
        .expect("set mock read timeout");
    let mut bytes = Vec::new();
    let mut buffer = [0_u8; 16 * 1024];
    loop {
        let count = stream.read(&mut buffer).expect("read mock request");
        assert_ne!(count, 0, "client closed an incomplete HTTP request");
        bytes.extend_from_slice(&buffer[..count]);
        if request_is_complete(&bytes) {
            break;
        }
    }
    parse_request(&bytes)
}

fn request_is_complete(bytes: &[u8]) -> bool {
    let Some(header_end) = bytes.windows(4).position(|window| window == b"\r\n\r\n") else {
        return false;
    };
    let headers = String::from_utf8_lossy(&bytes[..header_end]);
    if let Some(length) = headers.lines().find_map(|line| {
        let (name, value) = line.split_once(':')?;
        name.eq_ignore_ascii_case("content-length")
            .then(|| value.trim().parse::<usize>().ok())
            .flatten()
    }) {
        return bytes.len() >= header_end + 4 + length;
    }
    if headers.lines().any(|line| {
        line.split_once(':').is_some_and(|(name, value)| {
            name.eq_ignore_ascii_case("transfer-encoding")
                && value.to_ascii_lowercase().contains("chunked")
        })
    }) {
        return bytes[header_end + 4..]
            .windows(5)
            .any(|window| window == b"0\r\n\r\n");
    }
    true
}

fn parse_request(bytes: &[u8]) -> CapturedRequest {
    let header_end = bytes
        .windows(4)
        .position(|window| window == b"\r\n\r\n")
        .expect("complete HTTP headers");
    let head = String::from_utf8_lossy(&bytes[..header_end]);
    let mut lines = head.lines();
    let mut request_line = lines.next().expect("HTTP request line").split_whitespace();
    let method = request_line.next().expect("HTTP method").to_string();
    let path = request_line
        .next()
        .expect("HTTP request path")
        .split('?')
        .next()
        .expect("path before query")
        .to_string();
    let headers = lines
        .filter_map(|line| {
            line.split_once(':')
                .map(|(name, value)| (name.to_string(), value.trim().to_string()))
        })
        .collect();
    CapturedRequest {
        method,
        path,
        headers,
        body: bytes[header_end + 4..].to_vec(),
    }
}

fn http_response(status: &str, content_type: &str, body: &str) -> Vec<u8> {
    format!(
        "HTTP/1.1 {status}\r\nContent-Type: {content_type}\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
        body.len()
    )
    .into_bytes()
}

fn run_token(case: ClientCase) -> String {
    let payload = json!({
        "sub": "offline-run",
        "client_kind": case.client,
        "principal_id": "offline-acceptance"
    });
    let encoded = base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(payload.to_string());
    format!("e30.{encoded}.offline-signature")
}

fn mock_response(case: ClientCase, request: &CapturedRequest) -> Vec<u8> {
    match (request.method.as_str(), request.path.as_str()) {
        ("GET", "/api/health") => http_response("200 OK", "application/json", r#"{"status":"ok"}"#),
        ("GET", "/api/management/tokens") => {
            http_response("200 OK", "application/json", r#"{"data":[]}"#)
        }
        ("POST", "/api/management/tokens/client") => http_response(
            "200 OK",
            "application/json",
            &json!({"token": run_token(case)}).to_string(),
        ),
        ("POST", "/api/management/tokens/revoke") => {
            http_response("200 OK", "application/json", r#"{"revoked":"offline-run"}"#)
        }
        ("GET", path) if path.ends_with("/models") => {
            let models = if case.client == "codex" {
                vec![
                    json!({
                        "id": case.model,
                        "type": "model",
                        "display_name": case.model,
                        "created_at": "2026-09-04T00:00:00Z",
                        "owned_by": case.owner,
                        "default_reasoning_level": "medium",
                        "supported_reasoning_levels": [
                            {"effort": "medium", "description": "Balanced reasoning"},
                            {"effort": "high", "description": "Deep reasoning"},
                            {"effort": "xhigh", "description": "Deepest reasoning"}
                        ]
                    }),
                    json!({
                        "id": CODEX_ALTERNATE_MODEL,
                        "type": "model",
                        "display_name": CODEX_ALTERNATE_MODEL,
                        "created_at": "2026-09-04T00:00:00Z",
                        "owned_by": case.owner,
                        "default_reasoning_level": "high",
                        "supported_reasoning_levels": [
                            {"effort": "high", "description": "Default reasoning"},
                            {"effort": "xhigh", "description": "Maximum reasoning"}
                        ]
                    }),
                ]
            } else {
                vec![json!({
                    "id": case.model,
                    "type": "model",
                    "display_name": case.model,
                    "created_at": "2026-09-04T00:00:00Z",
                    "owned_by": case.owner
                })]
            };
            let body = json!({
                "object": "list",
                "data": models,
                "has_more": false,
                "first_id": case.model,
                "last_id": if case.client == "codex" { CODEX_ALTERNATE_MODEL } else { case.model }
            });
            http_response("200 OK", "application/json", &body.to_string())
        }
        ("POST", path) if path.ends_with("/messages/count_tokens") => {
            http_response("200 OK", "application/json", r#"{"input_tokens":1}"#)
        }
        ("POST", path) if path == case.inference_path => match case.client {
            "claude" => anthropic_answer(),
            "codex" => {
                let model = serde_json::from_slice::<Value>(&request.body)
                    .ok()
                    .and_then(|body| {
                        body.get("model")
                            .and_then(Value::as_str)
                            .map(str::to_string)
                    })
                    .unwrap_or_else(|| case.model.to_string());
                responses_answer(&model)
            }
            "opencode" => chat_answer(case.model, &request.body),
            other => panic!("no offline answer for {other}"),
        },
        _ => http_response(
            "404 Not Found",
            "application/json",
            &json!({"error": {"message": format!("unexpected offline path {}", request.path)}})
                .to_string(),
        ),
    }
}

fn anthropic_answer() -> Vec<u8> {
    let message = json!({
        "id": "msg_offline",
        "type": "message",
        "role": "assistant",
        "model": CLAUDE.model,
        "content": [],
        "stop_reason": null,
        "stop_sequence": null,
        "usage": {"input_tokens": 1, "output_tokens": 0}
    });
    let events = [
        (
            "message_start",
            json!({"type":"message_start", "message":message}),
        ),
        (
            "content_block_start",
            json!({"type":"content_block_start", "index":0, "content_block":{"type":"text", "text":""}}),
        ),
        (
            "content_block_delta",
            json!({"type":"content_block_delta", "index":0, "delta":{"type":"text_delta", "text":ANSWER}}),
        ),
        (
            "content_block_stop",
            json!({"type":"content_block_stop", "index":0}),
        ),
        (
            "message_delta",
            json!({"type":"message_delta", "delta":{"stop_reason":"end_turn", "stop_sequence":null}, "usage":{"output_tokens":1}}),
        ),
        ("message_stop", json!({"type":"message_stop"})),
    ];
    let mut body = String::new();
    for (event, value) in events {
        write!(&mut body, "event: {event}\ndata: {value}\n\n").expect("write event stream");
    }
    http_response("200 OK", "text/event-stream", &body)
}

fn responses_answer(model: &str) -> Vec<u8> {
    let output = json!({
        "id": "msg_offline",
        "type": "message",
        "status": "completed",
        "role": "assistant",
        "content": [{"type":"output_text", "text":ANSWER, "annotations":[]}]
    });
    let response = json!({
        "id": "resp_offline",
        "object": "response",
        "status": "completed",
        "model": model,
        "output": [output],
        "usage": {"input_tokens":1, "output_tokens":1, "total_tokens":2}
    });
    let events = [
        json!({"type":"response.created", "response":{"id":"resp_offline", "status":"in_progress", "model":model, "output":[]}}),
        json!({"type":"response.output_item.added", "output_index":0, "item":{"id":"msg_offline", "type":"message", "status":"in_progress", "role":"assistant", "content":[]}}),
        json!({"type":"response.content_part.added", "item_id":"msg_offline", "output_index":0, "content_index":0, "part":{"type":"output_text", "text":"", "annotations":[]}}),
        json!({"type":"response.output_text.delta", "item_id":"msg_offline", "output_index":0, "content_index":0, "delta":ANSWER}),
        json!({"type":"response.output_text.done", "item_id":"msg_offline", "output_index":0, "content_index":0, "text":ANSWER}),
        json!({"type":"response.content_part.done", "item_id":"msg_offline", "output_index":0, "content_index":0, "part":{"type":"output_text", "text":ANSWER, "annotations":[]}}),
        json!({"type":"response.output_item.done", "output_index":0, "item":output}),
        json!({"type":"response.completed", "response":response}),
    ];
    let mut body = String::new();
    for value in events {
        let event = value["type"].as_str().expect("response event type");
        write!(&mut body, "event: {event}\ndata: {value}\n\n").expect("write event stream");
    }
    body.push_str("data: [DONE]\n\n");
    http_response("200 OK", "text/event-stream", &body)
}

fn chat_answer(model: &str, request_body: &[u8]) -> Vec<u8> {
    let streamed = serde_json::from_slice::<Value>(request_body)
        .ok()
        .and_then(|value| value.get("stream").and_then(Value::as_bool))
        .unwrap_or(false);
    if streamed {
        let first = json!({
            "id":"chatcmpl-offline", "object":"chat.completion.chunk", "created":0,
            "model":model, "choices":[{"index":0, "delta":{"role":"assistant", "content":ANSWER}, "finish_reason":null}]
        });
        let last = json!({
            "id":"chatcmpl-offline", "object":"chat.completion.chunk", "created":0,
            "model":model, "choices":[{"index":0, "delta":{}, "finish_reason":"stop"}]
        });
        return http_response(
            "200 OK",
            "text/event-stream",
            &format!("data: {first}\n\ndata: {last}\n\ndata: [DONE]\n\n"),
        );
    }
    let body = json!({
        "id":"chatcmpl-offline", "object":"chat.completion", "created":0, "model":model,
        "choices":[{"index":0, "message":{"role":"assistant", "content":ANSWER}, "finish_reason":"stop"}],
        "usage":{"prompt_tokens":1, "completion_tokens":1, "total_tokens":2}
    });
    http_response("200 OK", "application/json", &body.to_string())
}

fn version_output(case: ClientCase, home: &Path) -> Output {
    Command::new(case.executable)
        .arg("--version")
        .env("HOME", home)
        .env("XDG_CONFIG_HOME", home.join(".config"))
        .env("CODEX_HOME", home.join(".codex"))
        .stdin(Stdio::null())
        .output()
        .unwrap_or_else(|error| panic!("launch {} --version: {error}", case.executable))
}

fn run_wrapper(case: ClientCase, working_directory: &Path, home: &Path, server: &str) -> Output {
    run_wrapper_with_model(case, working_directory, home, server, case.model)
}

fn run_wrapper_with_model(
    case: ClientCase,
    working_directory: &Path,
    home: &Path,
    server: &str,
    model: &str,
) -> Output {
    let mut child = Command::new(env!("CARGO_BIN_EXE_with-router"))
        .args([
            "--server",
            server,
            "--token",
            "offline-admin",
            "--model",
            model,
            "--non-interactive",
            case.client,
            PROMPT,
        ])
        .current_dir(working_directory)
        .env("HOME", home)
        .env("XDG_CONFIG_HOME", home.join(".config"))
        .env("CODEX_HOME", home.join(".codex"))
        .env("CI", "1")
        .env("NO_COLOR", "1")
        .env("NO_PROXY", "127.0.0.1,localhost")
        .env("no_proxy", "127.0.0.1,localhost")
        .env("HTTP_PROXY", "http://127.0.0.1:9")
        .env("HTTPS_PROXY", "http://127.0.0.1:9")
        .env("ALL_PROXY", "http://127.0.0.1:9")
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .expect("launch with-router real-client capture tier");
    let status = child
        .wait_timeout(Duration::from_secs(60))
        .expect("wait for real client");
    if status.is_none() {
        child.kill().expect("stop timed-out real client");
        let output = child.wait_with_output().expect("collect timed-out output");
        panic!(
            "{} did not finish against the offline mock; stdout: {}; stderr: {}",
            case.client,
            String::from_utf8_lossy(&output.stdout),
            String::from_utf8_lossy(&output.stderr)
        );
    }
    child
        .wait_with_output()
        .expect("collect real-client output")
}

fn assert_real_client_capture(case: ClientCase) {
    if !enabled() {
        return;
    }
    assert!(
        command_exists(case.executable),
        "{} is required when ROUTER_REAL_CLIENT_TESTS=1",
        case.executable
    );
    let directory = tempfile::tempdir().expect("temporary real-client home");
    let foreign_codex_config = if case.client == "codex" {
        let codex_home = directory.path().join(".codex");
        std::fs::create_dir_all(&codex_home).expect("create temporary Codex home");
        let foreign_catalog = codex_home.join("foreign-models.json");
        std::fs::write(
            &foreign_catalog,
            json!({"models": [{"slug": "static-foreign-model", "display_name": "static"}]})
                .to_string(),
        )
        .expect("write foreign Codex catalog");
        let config = codex_home.join("config.toml");
        let contents = format!(
            "model_catalog_json = {:?}\nmodel_reasoning_effort = \"xhigh\"\n\n[mcp_servers.keep]\ncommand = \"kept-mcp\"\n",
            foreign_catalog.to_string_lossy()
        );
        std::fs::write(&config, &contents).expect("write foreign Codex config");
        Some((config, contents.into_bytes()))
    } else {
        None
    };
    let version = version_output(case, directory.path());
    assert!(
        version.status.success(),
        "{} --version failed: {}",
        case.executable,
        String::from_utf8_lossy(&version.stderr)
    );
    let rendered_version = format!(
        "{}{}",
        String::from_utf8_lossy(&version.stdout),
        String::from_utf8_lossy(&version.stderr)
    );
    assert!(
        rendered_version.contains(case.version),
        "expected {} {}, got {rendered_version:?}",
        case.executable,
        case.version
    );

    let router = MockRouter::start(case);
    let output = run_wrapper(
        case,
        Path::new(env!("CARGO_MANIFEST_DIR")),
        directory.path(),
        &router.origin,
    );
    assert!(
        output.status.success(),
        "{} failed against the offline mock; stdout: {}; stderr: {}",
        case.client,
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );
    assert!(
        String::from_utf8_lossy(&output.stdout).contains(ANSWER),
        "{} did not print the synthetic answer; stdout: {}",
        case.client,
        String::from_utf8_lossy(&output.stdout)
    );
    if case.client == "codex" {
        let switched = run_wrapper_with_model(
            case,
            Path::new(env!("CARGO_MANIFEST_DIR")),
            directory.path(),
            &router.origin,
            CODEX_ALTERNATE_MODEL,
        );
        assert!(
            switched.status.success(),
            "Codex model switch failed against the offline mock; stdout: {}; stderr: {}",
            String::from_utf8_lossy(&switched.stdout),
            String::from_utf8_lossy(&switched.stderr)
        );
    }
    if let Some((config, before)) = foreign_codex_config {
        assert_eq!(
            std::fs::read(config).expect("read Codex config after run"),
            before,
            "with codex must neutralize the foreign catalog only in the child process"
        );
    }

    let deadline = Instant::now() + Duration::from_secs(2);
    let request = loop {
        if let Some(request) = router.inference_request(case.inference_path) {
            break request;
        }
        assert!(
            Instant::now() < deadline,
            "{} never reached {}",
            case.client,
            case.inference_path
        );
        thread::sleep(Duration::from_millis(10));
    };
    assert_eq!(request.method, "POST");
    assert!(
        request
            .header("user-agent")
            .is_some_and(|value| value.starts_with(case.user_agent_prefix)),
        "unexpected {} user-agent: {:?}",
        case.client,
        request.header("user-agent")
    );
    let token = run_token(case);
    let expected_credential = if case.credential_header == "authorization" {
        format!("Bearer {token}")
    } else {
        token
    };
    assert_eq!(
        request.header(case.credential_header),
        Some(expected_credential.as_str()),
        "{} did not use its native credential carrier",
        case.client
    );
    assert!(
        request
            .headers
            .iter()
            .all(|(name, _)| !name.to_ascii_lowercase().starts_with("x-router")),
        "the real client unexpectedly emitted an internal Router header"
    );
    let body: Value = serde_json::from_slice(&request.body).unwrap_or_else(|error| {
        panic!(
            "{} sent invalid JSON ({error}): {}",
            case.client,
            String::from_utf8_lossy(&request.body)
        )
    });
    assert_eq!(body["model"], case.model);
    assert!(
        String::from_utf8_lossy(&request.body).contains(PROMPT),
        "{} request omitted the prompt",
        case.client
    );
    match case.client {
        "claude" => assert_eq!(request.header("anthropic-version"), Some("2023-06-01")),
        "codex" => {
            assert_eq!(request.header("originator"), Some("codex_exec"));
            assert!(request.header("x-codex-turn-metadata").is_some());
            let requests = router.inference_requests(case.inference_path);
            assert_eq!(
                requests.len(),
                2,
                "expected one request for each live model"
            );
            let bodies = requests
                .iter()
                .map(|request| serde_json::from_slice::<Value>(&request.body).unwrap())
                .collect::<Vec<_>>();
            assert_eq!(bodies[0]["model"], case.model);
            assert_eq!(bodies[1]["model"], CODEX_ALTERNATE_MODEL);
            for body in bodies {
                assert_eq!(
                    body["reasoning"]["effort"], "xhigh",
                    "model selection must preserve the user's explicit reasoning effort"
                );
            }
        }
        "opencode" => {
            assert!(request.header("x-session-id").is_some());
            assert!(request.header("x-session-affinity").is_some());
        }
        _ => unreachable!(),
    }
}

#[test]
fn current_claude_code_reaches_the_native_anthropic_surface_offline() {
    assert_real_client_capture(CLAUDE);
}

#[test]
fn current_codex_reaches_the_native_responses_surface_offline() {
    assert_real_client_capture(CODEX);
}

#[test]
fn current_opencode_reaches_the_native_chat_surface_offline() {
    assert_real_client_capture(OPENCODE);
}

#[test]
fn offline_capture_contracts_are_distinct_and_exact() {
    let cases = [CLAUDE, CODEX, OPENCODE];
    for (index, left) in cases.iter().enumerate() {
        assert!(left.inference_path.starts_with("/api/services/"));
        assert!(!left.model.contains('/'));
        for right in &cases[index + 1..] {
            assert_ne!(left.inference_path, right.inference_path);
            assert_ne!(left.model, right.model);
            assert_ne!(left.credential_header, "x-router-token");
        }
    }
}
