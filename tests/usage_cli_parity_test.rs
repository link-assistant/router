//! Local and selected-server `router usage` command parity (issue #416).

use std::io::{Read as _, Write as _};
use std::net::{TcpListener, TcpStream};
use std::process::{Command, Output};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;

fn run(args: &[&str], home: &std::path::Path) -> Output {
    Command::new(env!("CARGO_BIN_EXE_link-assistant-router"))
        .args(args)
        .env("HOME", home)
        .env("XDG_CONFIG_HOME", home.join("config"))
        .env("DATA_DIR", home.join("router-data"))
        .env("TOKEN_SECRET", "usage-cli-parity-secret")
        .env("LINK_ASSISTANT_ROUTER_TOKEN", "token-from-environment")
        .env("NO_PROXY", "127.0.0.1,localhost")
        .env("no_proxy", "127.0.0.1,localhost")
        .output()
        .expect("run usage command")
}

#[test]
fn local_and_remote_unfiltered_json_are_identical_and_use_the_environment_token() {
    let listener = TcpListener::bind("127.0.0.1:0").unwrap();
    listener.set_nonblocking(true).unwrap();
    let address = listener.local_addr().unwrap();
    let stopped = Arc::new(AtomicBool::new(false));
    let stop_for_server = Arc::clone(&stopped);
    let captured = Arc::new(Mutex::new(Vec::new()));
    let captured_for_server = Arc::clone(&captured);
    let server = thread::spawn(move || {
        let body = serde_json::json!({
            "schema_version": 1,
            "subscriptions": [
                {"provider":"anthropic","state":"available","status":"available","windows":[],"additional_limits":[]},
                {"provider":"openai","state":"available","status":"available","windows":[],"additional_limits":[]},
                {"provider":"z-ai","state":"unverified","status":"usage_unverified","windows":[],"additional_limits":[]},
                {"provider":"lefine","state":"unavailable","status":"usage_source_unavailable","windows":[],"additional_limits":[]},
                {"provider":"gemini","state":"unverified","status":"live_limits_unavailable","windows":[],"additional_limits":[]},
                {"provider":"qwen","state":"unverified","status":"live_limits_unavailable","windows":[],"additional_limits":[]}
            ]
        })
        .to_string();
        while !stop_for_server.load(Ordering::Acquire) {
            match listener.accept() {
                Ok((mut socket, _)) => {
                    socket.set_nonblocking(false).unwrap();
                    socket
                        .set_read_timeout(Some(Duration::from_secs(5)))
                        .unwrap();
                    let mut request = [0_u8; 8192];
                    let read = socket.read(&mut request).unwrap();
                    let head = String::from_utf8_lossy(&request[..read]).into_owned();
                    let (response_body, capture) = if head.starts_with("GET /api/health ") {
                        (r#"{"status":"ok","version":"test"}"#.to_owned(), false)
                    } else {
                        (body.clone(), true)
                    };
                    if capture {
                        captured_for_server.lock().unwrap().push(head);
                    }
                    write!(
                        socket,
                        "HTTP/1.1 200 OK\r\ncontent-type: application/json\r\ncontent-length: {}\r\nconnection: close\r\n\r\n{response_body}",
                        response_body.len()
                    )
                    .unwrap();
                }
                Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => {
                    thread::sleep(Duration::from_millis(10));
                }
                Err(error) => panic!("accept usage request: {error}"),
            }
        }
    });

    let home = tempfile::tempdir().unwrap();
    let origin = format!("http://{address}");
    let remote = run(&["usage", "--server", &origin, "--json"], home.path());
    let local = run(
        &[
            "--host",
            "127.0.0.1",
            "--port",
            &address.port().to_string(),
            "usage",
            "--local",
            "--json",
        ],
        home.path(),
    );
    stopped.store(true, Ordering::Release);
    let _ = TcpStream::connect(address);
    server.join().unwrap();

    for (name, output) in [("remote", &remote), ("local", &local)] {
        assert!(
            output.status.success(),
            "{name} failed: {}",
            String::from_utf8_lossy(&output.stderr)
        );
    }
    assert_eq!(remote.stdout, local.stdout);
    let answer: serde_json::Value = serde_json::from_slice(&local.stdout).unwrap();
    assert_eq!(answer["subscriptions"].as_array().unwrap().len(), 6);
    assert_eq!(answer["subscriptions"][3]["state"], "unavailable");
    let captured = captured.lock().unwrap();
    assert_eq!(captured.len(), 2);
    for request in captured.iter() {
        assert!(request.starts_with("GET /api/usage "), "{request}");
        assert!(
            request
                .to_ascii_lowercase()
                .contains("authorization: bearer token-from-environment"),
            "{request}"
        );
    }
}
