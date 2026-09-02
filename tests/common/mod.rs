//! Shared black-box helpers for the client-configurator test binaries.

#![allow(dead_code)]

use std::io::{Read, Write};
use std::net::TcpListener;
use std::process::{Command, Output};
use std::time::Duration;

pub fn router(home: &std::path::Path, args: &[&str]) -> Output {
    router_with_env(home, args, &[])
}

pub fn router_with_env(home: &std::path::Path, args: &[&str], env: &[(&str, &str)]) -> Output {
    let mut command = Command::new(env!("CARGO_BIN_EXE_link-assistant-router"));
    command
        .args(args)
        .env("HOME", home)
        .env_remove("CODEX_HOME")
        .env_remove("CLAUDE_CONFIG_DIR")
        .env_remove("XDG_CONFIG_HOME")
        .env_remove("QWEN_HOME")
        .env_remove("CURSOR_CONFIG_DIR")
        .env_remove("LINK_ASSISTANT_ROUTER_URL")
        .env_remove("ROUTER_URL")
        .env_remove("LINK_ASSISTANT_ROUTER_TOKEN")
        .env_remove("LINK_ASSISTANT_TOKEN")
        .env("TOKEN_SECRET", "clients-cli-test-secret")
        .env("DATA_DIR", home.join("router-data"))
        .env("STORAGE_POLICY", "text");
    for (key, value) in env {
        command.env(key, value);
    }
    command.output().expect("router CLI should run")
}

pub fn mock_router(
    models: &[(&str, &str)],
    request_count: usize,
) -> (String, std::thread::JoinHandle<Vec<String>>) {
    let listener = TcpListener::bind("127.0.0.1:0").expect("bind mock catalog");
    listener
        .set_nonblocking(true)
        .expect("make mock catalog nonblocking");
    let port = listener.local_addr().expect("listener address").port();
    let body = serde_json::json!({
        "object": "list",
        "data": models
            .iter()
            .map(|(id, owner)| serde_json::json!({"id": id, "owned_by": owner}))
            .collect::<Vec<_>>()
    })
    .to_string();
    let server = std::thread::spawn(move || {
        let deadline = std::time::Instant::now() + Duration::from_secs(10);
        let mut requests = Vec::new();
        while requests.len() < request_count {
            let mut stream = loop {
                match listener.accept() {
                    Ok((stream, _)) => break stream,
                    Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => {
                        if std::time::Instant::now() >= deadline {
                            return requests;
                        }
                        std::thread::sleep(Duration::from_millis(10));
                    }
                    Err(error) => panic!("accept mock router request: {error}"),
                }
            };
            stream
                .set_nonblocking(false)
                .expect("make mock router connection blocking");
            stream
                .set_read_timeout(Some(Duration::from_secs(5)))
                .expect("set timeout");
            let mut bytes = Vec::new();
            let mut buffer = [0_u8; 4096];
            loop {
                let count = stream.read(&mut buffer).expect("read request");
                if count == 0 {
                    break;
                }
                bytes.extend_from_slice(&buffer[..count]);
                if bytes.windows(4).any(|window| window == b"\r\n\r\n") {
                    break;
                }
            }
            let request = String::from_utf8_lossy(&bytes).into_owned();
            let path = request
                .lines()
                .next()
                .and_then(|line| line.split_whitespace().nth(1))
                .unwrap_or("");
            let (status, response_body) = match path {
                "/api/health" => ("200 OK", r#"{"status":"ok","version":"test"}"#),
                "/api/management/tokens" => ("401 Unauthorized", r#"{"error":"ordinary token"}"#),
                _ if request.starts_with("GET ") => ("200 OK", body.as_str()),
                _ => ("200 OK", "{}"),
            };
            let response = format!(
                "HTTP/1.1 {status}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{response_body}",
                response_body.len()
            );
            stream
                .write_all(response.as_bytes())
                .expect("write mock router response");
            requests.push(request);
        }
        requests
    });
    (format!("http://127.0.0.1:{port}"), server)
}

pub fn catalog_server(models: &[(&str, &str)]) -> (String, std::thread::JoinHandle<Vec<String>>) {
    mock_router(models, 1)
}
