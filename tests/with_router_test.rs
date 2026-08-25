//! Black-box coverage for the temporary-by-default client launcher (issue #151).

#![cfg(unix)]

use std::fs::{self, OpenOptions};
use std::io::{Read, Write};
use std::net::TcpListener;
use std::os::unix::fs::PermissionsExt;
use std::process::{Command, Output};
use std::thread;
use std::time::Duration;
use wait_timeout::ChildExt as _;

fn read_request(stream: &mut std::net::TcpStream) -> String {
    stream
        .set_read_timeout(Some(Duration::from_secs(5)))
        .expect("set read timeout");
    let mut bytes = Vec::new();
    let mut buffer = [0_u8; 4096];
    let mut expected = None;
    loop {
        let count = stream.read(&mut buffer).expect("read request");
        if count == 0 {
            break;
        }
        bytes.extend_from_slice(&buffer[..count]);
        if expected.is_none()
            && let Some(header_end) = bytes.windows(4).position(|window| window == b"\r\n\r\n")
        {
            let headers = String::from_utf8_lossy(&bytes[..header_end]);
            let content_length = headers.lines().find_map(|line| {
                line.split_once(':').and_then(|(name, value)| {
                    name.eq_ignore_ascii_case("content-length")
                        .then(|| value.trim().parse::<usize>().ok())
                        .flatten()
                })
            });
            expected = Some(header_end + 4 + content_length.unwrap_or(0));
        }
        if expected.is_some_and(|expected| bytes.len() >= expected) {
            break;
        }
    }
    String::from_utf8_lossy(&bytes).into_owned()
}

fn mock_router() -> (String, thread::JoinHandle<Vec<String>>) {
    let listener = TcpListener::bind("127.0.0.1:0").expect("bind mock router");
    listener
        .set_nonblocking(false)
        .expect("configure mock router");
    let port = listener.local_addr().expect("mock address").port();
    let handle = thread::spawn(move || {
        let mut paths = Vec::new();
        for _ in 0..3 {
            let (mut stream, _) = listener.accept().expect("accept wrapper request");
            let request = read_request(&mut stream);
            let path = request
                .lines()
                .next()
                .and_then(|line| line.split_whitespace().nth(1))
                .unwrap_or("")
                .to_string();
            paths.push(path.clone());
            let (status, body) = match path.as_str() {
                "/health" => ("200 OK", r#"{"status":"ok","version":"0.68.0"}"#),
                "/api/tokens/list" => (
                    "401 Unauthorized",
                    r#"{"error":{"message":"ordinary token"}}"#,
                ),
                "/v1/models" => (
                    "200 OK",
                    r#"{"object":"list","data":[{"id":"gpt-5.6-sol"}]}"#,
                ),
                _ => ("404 Not Found", r#"{"error":"unexpected path"}"#),
            };
            let response = format!(
                "HTTP/1.1 {status}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
                body.len()
            );
            stream
                .write_all(response.as_bytes())
                .expect("write mock response");
        }
        paths
    });
    (format!("http://127.0.0.1:{port}"), handle)
}

fn mock_admin_router() -> (String, thread::JoinHandle<Vec<String>>) {
    let listener = TcpListener::bind("127.0.0.1:0").expect("bind mock router");
    let port = listener.local_addr().expect("mock address").port();
    let handle = thread::spawn(move || {
        let mut requests = Vec::new();
        for _ in 0..5 {
            let (mut stream, _) = listener.accept().expect("accept wrapper request");
            let request = read_request(&mut stream);
            let path = request
                .lines()
                .next()
                .and_then(|line| line.split_whitespace().nth(1))
                .unwrap_or("");
            let (status, body) = match path {
                "/health" => ("200 OK", r#"{"status":"ok","version":"0.68.0"}"#),
                "/api/tokens/list" => ("200 OK", r#"{"data":[]}"#),
                "/api/tokens" => (
                    "200 OK",
                    r#"{"token":"e30.eyJzdWIiOiJydW4taWQifQ.signature"}"#,
                ),
                "/v1/models" => (
                    "200 OK",
                    r#"{"object":"list","data":[{"id":"gpt-5.6-sol"}]}"#,
                ),
                "/api/tokens/revoke" => ("200 OK", r#"{"revoked":"run-id"}"#),
                _ => ("404 Not Found", r#"{"error":"unexpected path"}"#),
            };
            requests.push(request);
            write!(
                stream,
                "HTTP/1.1 {status}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
                body.len()
            )
            .expect("write mock response");
        }
        requests
    });
    (format!("http://127.0.0.1:{port}"), handle)
}

fn mock_health_router() -> (String, thread::JoinHandle<()>) {
    let listener = TcpListener::bind("127.0.0.1:0").expect("bind mock router");
    let port = listener.local_addr().expect("mock address").port();
    let handle = thread::spawn(move || {
        let (mut stream, _) = listener.accept().expect("accept health request");
        let mut buffer = [0_u8; 4096];
        let amount = stream.read(&mut buffer).expect("read health request");
        assert_ne!(amount, 0, "health request must not be empty");
        let body = r#"{"status":"ok","version":"0.68.0"}"#;
        write!(
            stream,
            "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
            body.len()
        )
        .expect("write health response");
    });
    (format!("http://127.0.0.1:{port}"), handle)
}

fn mock_rejected_token_router(message: &'static str) -> (String, thread::JoinHandle<()>) {
    let listener = TcpListener::bind("127.0.0.1:0").expect("bind rejected-token router");
    let port = listener
        .local_addr()
        .expect("rejected-token address")
        .port();
    let handle = thread::spawn(move || {
        for _ in 0..3 {
            let (mut stream, _) = listener.accept().expect("accept token validation request");
            let request = read_request(&mut stream);
            let path = request
                .lines()
                .next()
                .and_then(|line| line.split_whitespace().nth(1))
                .unwrap_or("");
            let (status, body) = match path {
                "/health" => ("200 OK", r#"{"status":"ok"}"#.to_string()),
                "/api/tokens/list" => (
                    "401 Unauthorized",
                    r#"{"error":{"message":"ordinary token"}}"#.to_string(),
                ),
                "/v1/models" => (
                    "401 Unauthorized",
                    format!(r#"{{"error":{{"message":"{message}"}}}}"#),
                ),
                _ => ("404 Not Found", r#"{"error":"unexpected"}"#.to_string()),
            };
            write!(
                stream,
                "HTTP/1.1 {status}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
                body.len()
            )
            .expect("write rejected-token response");
        }
    });
    (format!("http://127.0.0.1:{port}"), handle)
}

fn fake_codex(bin_dir: &std::path::Path) {
    fs::create_dir_all(bin_dir).expect("create fake bin directory");
    let path = bin_dir.join("codex");
    fs::write(
        &path,
        format!(
            r#"#!/bin/sh
if [ "${{{wait}}}" = 1 ]; then
  trap 'exit 42' INT TERM
fi
printf '%s\n' "$@" > "$CAPTURE_ARGS"
printf '%s\n' "$HOME" > "$CAPTURE_HOME"
cp "$HOME/.codex/config.toml" "$CAPTURE_CONFIG"
printf '%s\n' "$LINK_ASSISTANT_TOKEN" > "$CAPTURE_TOKEN"
if [ -n "$FAKE_DELAY" ]; then
  sleep "$FAKE_DELAY"
fi
if [ "${{{wait}}}" = 1 ]; then
  while :; do sleep 1; done
fi
exit "${{{exit}}}"
"#,
            wait = "FAKE_WAIT:-",
            exit = "FAKE_EXIT:-23",
        ),
    )
    .expect("write fake Codex");
    fs::set_permissions(&path, fs::Permissions::from_mode(0o755))
        .expect("make fake Codex executable");
}

fn run_with(
    binary: &str,
    home: &std::path::Path,
    bin_dir: &std::path::Path,
    capture: &std::path::Path,
    server: &str,
    standalone: bool,
) -> Output {
    let inherited_path = std::env::var_os("PATH").unwrap_or_default();
    let path = std::env::join_paths(
        std::iter::once(bin_dir.to_path_buf()).chain(std::env::split_paths(&inherited_path)),
    )
    .expect("compose PATH");
    let mut command = Command::new(binary);
    if !standalone {
        command.arg("with");
    }
    command
        .args([
            "--server",
            server,
            "--token",
            "la_sk_ordinary",
            "codex",
            "--",
            "--global",
            "hi",
        ])
        .env("HOME", home)
        .env("PATH", path)
        .env("CAPTURE_ARGS", capture.join("args"))
        .env("CAPTURE_HOME", capture.join("home"))
        .env("CAPTURE_CONFIG", capture.join("config"))
        .env("CAPTURE_TOKEN", capture.join("token"))
        .env_remove("CODEX_HOME")
        .output()
        .expect("run wrapper")
}

fn assert_temporary_launch(standalone: bool) {
    let directory = tempfile::tempdir().expect("temporary test directory");
    let home = directory.path().join("home");
    let bin = directory.path().join("bin");
    let capture = directory.path().join("capture");
    fs::create_dir_all(home.join(".codex")).expect("create real Codex home");
    fs::create_dir_all(&capture).expect("create capture directory");
    let stale = std::env::temp_dir().join(format!(
        "link-assistant-router-with-4294967294-{}",
        directory
            .path()
            .file_name()
            .expect("temporary directory name")
            .to_string_lossy()
    ));
    fs::create_dir_all(&stale).expect("create stale wrapper directory");
    let original = "model_provider = \"user-owned\"\n";
    fs::write(home.join(".codex/config.toml"), original).expect("seed real config");
    fake_codex(&bin);
    let (server, requests) = mock_router();

    let output = run_with(
        if standalone {
            env!("CARGO_BIN_EXE_with-router")
        } else {
            env!("CARGO_BIN_EXE_link-assistant-router")
        },
        &home,
        &bin,
        &capture,
        &server,
        standalone,
    );

    assert_eq!(
        output.status.code(),
        Some(23),
        "client status must propagate; stdout: {}; stderr: {}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );
    assert_eq!(
        fs::read_to_string(home.join(".codex/config.toml")).expect("read real config"),
        original,
        "temporary launch must not change the user's config"
    );
    let args = fs::read_to_string(capture.join("args")).expect("captured argv");
    assert!(args.lines().any(|argument| argument == "--global"));
    assert_eq!(args.lines().last(), Some("hi"));
    let config = fs::read_to_string(capture.join("config")).expect("captured temp config");
    assert!(config.contains(&format!("base_url = \"{server}/v1\"")));
    assert!(!config.contains("la_sk_ordinary"));
    assert_eq!(
        fs::read_to_string(capture.join("token")).expect("captured token"),
        "la_sk_ordinary\n"
    );
    let router_home = fs::read_to_string(capture.join("home")).expect("captured HOME");
    let router_home = router_home.trim();
    assert_ne!(router_home, home.to_string_lossy());
    // Codex is routed through a file the router writes, so it cannot be
    // extended and lives in a profile of its own. That profile is kept: a
    // directory thrown away after every run made every launch a first launch,
    // with no session history and nothing to resume (issue #298).
    assert!(
        std::path::Path::new(router_home).is_dir(),
        "a client that cannot be extended must keep its profile"
    );
    assert!(
        std::path::Path::new(router_home).starts_with(home.join(".config")),
        "the profile belongs under the router's own directory, not TMPDIR: {router_home}"
    );
    assert!(!stale.exists(), "a later run must sweep crash leftovers");
    assert_eq!(
        requests.join().expect("mock router thread").join(","),
        "/health,/api/tokens/list,/v1/models"
    );
}

#[test]
fn router_with_uses_temporary_config_and_preserves_status() {
    assert_temporary_launch(false);
}

#[test]
fn standalone_with_router_uses_the_same_safe_contract() {
    assert_temporary_launch(true);
}

#[test]
fn interrupt_reaches_client_and_still_cleans_temporary_home() {
    let directory = tempfile::tempdir().expect("temporary test directory");
    let home = directory.path().join("home");
    let bin = directory.path().join("bin");
    let capture = directory.path().join("capture");
    fs::create_dir_all(&home).expect("create home");
    fs::create_dir_all(&capture).expect("create capture directory");
    fake_codex(&bin);
    let (server, requests) = mock_router();
    let inherited_path = std::env::var_os("PATH").unwrap_or_default();
    let path =
        std::env::join_paths(std::iter::once(bin).chain(std::env::split_paths(&inherited_path)))
            .expect("compose PATH");
    let mut wrapper = Command::new(env!("CARGO_BIN_EXE_with-router"))
        .args([
            "--server",
            &server,
            "--token",
            "la_sk_ordinary",
            "codex",
            "wait",
        ])
        .env("HOME", &home)
        .env("PATH", path)
        .env("FAKE_WAIT", "1")
        .env("CAPTURE_ARGS", capture.join("args"))
        .env("CAPTURE_HOME", capture.join("home"))
        .env("CAPTURE_CONFIG", capture.join("config"))
        .env("CAPTURE_TOKEN", capture.join("token"))
        .env_remove("CODEX_HOME")
        .spawn()
        .expect("spawn wrapper");
    for _ in 0..100 {
        if capture.join("home").exists() {
            break;
        }
        thread::sleep(Duration::from_millis(20));
    }
    assert!(capture.join("home").exists(), "client did not start");
    let signal = Command::new("kill")
        .args(["-INT", &wrapper.id().to_string()])
        .status()
        .expect("signal wrapper");
    assert!(signal.success());
    let status = wrapper
        .wait_timeout(Duration::from_secs(8))
        .expect("wait for interrupted wrapper")
        .unwrap_or_else(|| {
            wrapper.kill().expect("kill stuck wrapper");
            panic!("wrapper did not clean up after Ctrl-C");
        });
    assert_eq!(status.code(), Some(42));
    let router_home = fs::read_to_string(capture.join("home")).expect("captured HOME");
    // The profile survives an interrupted run too — that is the point of
    // keeping it (issue #298). What must not survive is a disposable root.
    assert!(std::path::Path::new(router_home.trim()).is_dir());
    assert_eq!(
        requests.join().expect("mock router thread").join(","),
        "/health,/api/tokens/list,/v1/models"
    );
}

#[test]
fn global_undo_restores_exact_config_and_permissions() {
    let directory = tempfile::tempdir().expect("temporary test directory");
    let home = directory.path().join("home");
    let config_directory = home.join(".codex");
    let config = config_directory.join("config.toml");
    fs::create_dir_all(&config_directory).expect("create Codex home");
    let original = b"# user formatting stays exact\nmodel_provider='personal'\n";
    fs::write(&config, original).expect("seed config");
    fs::set_permissions(&config, fs::Permissions::from_mode(0o640)).expect("set original mode");
    let (server, health) = mock_router();

    let configured = Command::new(env!("CARGO_BIN_EXE_link-assistant-router"))
        .args([
            "with",
            "--server",
            &server,
            "--token",
            "la_sk_ordinary",
            "--global",
            "codex",
        ])
        .env("HOME", &home)
        .env_remove("CODEX_HOME")
        .output()
        .expect("configure globally");
    assert!(
        configured.status.success(),
        "global setup failed: {}{}",
        String::from_utf8_lossy(&configured.stdout),
        String::from_utf8_lossy(&configured.stderr)
    );
    health.join().expect("mock router thread");
    assert_ne!(fs::read(&config).expect("configured config"), original);

    let undone = Command::new(env!("CARGO_BIN_EXE_link-assistant-router"))
        .args(["with", "--global", "--undo", "codex"])
        .env("HOME", &home)
        .env_remove("CODEX_HOME")
        .output()
        .expect("undo global setup");
    assert!(
        undone.status.success(),
        "global undo failed: {}{}",
        String::from_utf8_lossy(&undone.stdout),
        String::from_utf8_lossy(&undone.stderr)
    );
    assert_eq!(fs::read(&config).expect("restored config"), original);
    assert_eq!(
        fs::metadata(&config)
            .expect("restored metadata")
            .permissions()
            .mode()
            & 0o777,
        0o640
    );
    let leftovers = fs::read_dir(config_directory)
        .expect("read Codex home")
        .map(|entry| entry.expect("directory entry").file_name())
        .collect::<Vec<_>>();
    assert_eq!(leftovers, [std::ffi::OsString::from("config.toml")]);
}

#[test]
fn global_undo_refuses_to_overwrite_later_user_edits() {
    let directory = tempfile::tempdir().expect("temporary test directory");
    let home = directory.path().join("home");
    let config = home.join(".codex/config.toml");
    fs::create_dir_all(config.parent().expect("config parent")).expect("create Codex home");
    fs::write(&config, "model_provider = 'personal'\n").expect("seed config");
    let (server, health) = mock_router();
    let configured = Command::new(env!("CARGO_BIN_EXE_with-router"))
        .args([
            "--server",
            &server,
            "--token",
            "la_sk_ordinary",
            "--global",
            "codex",
        ])
        .env("HOME", &home)
        .env_remove("CODEX_HOME")
        .output()
        .expect("configure globally");
    assert!(configured.status.success());
    health.join().expect("mock router thread");
    let mut edited = OpenOptions::new()
        .append(true)
        .open(&config)
        .expect("open configured file");
    edited
        .write_all(b"# user edit after setup\n")
        .expect("append user edit");

    let undone = Command::new(env!("CARGO_BIN_EXE_with-router"))
        .args(["--global", "--undo", "codex"])
        .env("HOME", &home)
        .env_remove("CODEX_HOME")
        .output()
        .expect("attempt undo");
    assert!(!undone.status.success());
    assert!(String::from_utf8_lossy(&undone.stderr).contains("changed after it was configured"));
    assert!(
        fs::read_to_string(config)
            .expect("read edited config")
            .contains("user edit after setup")
    );
}

#[test]
fn global_undo_removes_a_config_that_did_not_exist_before_setup() {
    let directory = tempfile::tempdir().expect("temporary test directory");
    let home = directory.path().join("home");
    fs::create_dir_all(&home).expect("create home");
    let config = home.join(".codex/config.toml");
    let (server, health) = mock_router();

    let configured = Command::new(env!("CARGO_BIN_EXE_link-assistant-router"))
        .args([
            "with",
            "--server",
            &server,
            "--token",
            "la_sk_ordinary",
            "--global",
            "codex",
        ])
        .env("HOME", &home)
        .env_remove("CODEX_HOME")
        .output()
        .expect("configure absent config globally");
    assert!(configured.status.success());
    health.join().expect("mock router thread");
    assert!(config.exists());

    let undone = Command::new(env!("CARGO_BIN_EXE_link-assistant-router"))
        .args(["with", "--global", "--undo", "codex"])
        .env("HOME", &home)
        .env_remove("CODEX_HOME")
        .output()
        .expect("undo absent global config");
    assert!(undone.status.success());
    assert!(!config.exists(), "undo must restore the original absence");
}

#[test]
fn launcher_rejects_missing_credentials_and_unavailable_models_before_exec() {
    let directory = tempfile::tempdir().expect("temporary test directory");
    let home = directory.path().join("home");
    fs::create_dir_all(&home).expect("create home");
    let (server, health) = mock_health_router();
    let missing_token = Command::new(env!("CARGO_BIN_EXE_with-router"))
        .args(["--server", &server, "codex"])
        .env("HOME", &home)
        .env_remove("LINK_ASSISTANT_ROUTER_TOKEN")
        .env_remove("LINK_ASSISTANT_TOKEN")
        .output()
        .expect("run launcher without token");
    assert!(!missing_token.status.success());
    assert!(String::from_utf8_lossy(&missing_token.stderr).contains("no token is available"));
    health.join().expect("mock router thread");

    for (message, diagnostic) in [
        ("Token has expired", "supplied token as expired"),
        ("Token has been revoked", "supplied token as revoked"),
        ("invalid token", "supplied token as invalid"),
    ] {
        let (server, router) = mock_rejected_token_router(message);
        let rejected = Command::new(env!("CARGO_BIN_EXE_with-router"))
            .args(["--server", &server, "--token", "rejected", "codex"])
            .env("HOME", &home)
            .output()
            .expect("run launcher with rejected token");
        assert!(!rejected.status.success());
        assert!(
            String::from_utf8_lossy(&rejected.stderr).contains(diagnostic),
            "unexpected token diagnostic: {}",
            String::from_utf8_lossy(&rejected.stderr)
        );
        router.join().expect("rejected-token router thread");
    }

    let (server, requests) = mock_router();
    let unavailable = Command::new(env!("CARGO_BIN_EXE_with-router"))
        .args([
            "--server",
            &server,
            "--token",
            "ordinary",
            "--model",
            "not-in-catalog",
            "codex",
        ])
        .env("HOME", &home)
        .output()
        .expect("run launcher with unavailable model");
    assert!(!unavailable.status.success());
    assert!(String::from_utf8_lossy(&unavailable.stderr).contains("not available"));
    assert_eq!(requests.join().expect("mock router thread").len(), 3);
}

#[test]
fn admin_credentials_are_exchanged_and_revoked_per_run() {
    let directory = tempfile::tempdir().expect("temporary test directory");
    let home = directory.path().join("home");
    let bin = directory.path().join("bin");
    let capture = directory.path().join("capture");
    fs::create_dir_all(&home).expect("create home");
    fs::create_dir_all(&capture).expect("create capture directory");
    fake_codex(&bin);
    let (server, router) = mock_admin_router();
    let inherited_path = std::env::var_os("PATH").unwrap_or_default();
    let path =
        std::env::join_paths(std::iter::once(bin).chain(std::env::split_paths(&inherited_path)))
            .expect("compose PATH");

    let output = Command::new(env!("CARGO_BIN_EXE_with-router"))
        .args([
            "--server",
            &server,
            "--token",
            "admin-secret",
            "--run-ttl-hours",
            "2",
            "--run-max-requests",
            "7",
            "codex",
            "hello",
        ])
        .env("HOME", &home)
        .env("PATH", path)
        .env("FAKE_EXIT", "0")
        .env("CAPTURE_ARGS", capture.join("args"))
        .env("CAPTURE_HOME", capture.join("home"))
        .env("CAPTURE_CONFIG", capture.join("config"))
        .env("CAPTURE_TOKEN", capture.join("token"))
        .env_remove("CODEX_HOME")
        .output()
        .expect("run wrapper with admin credential");
    assert!(
        output.status.success(),
        "wrapper failed: {}{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );
    assert_eq!(
        fs::read_to_string(capture.join("token")).expect("captured token"),
        "e30.eyJzdWIiOiJydW4taWQifQ.signature\n"
    );
    let requests = router.join().expect("mock router thread");
    let paths = requests
        .iter()
        .map(|request| {
            request
                .lines()
                .next()
                .and_then(|line| line.split_whitespace().nth(1))
                .unwrap_or("")
        })
        .collect::<Vec<_>>();
    assert_eq!(
        paths,
        [
            "/health",
            "/api/tokens/list",
            "/api/tokens",
            "/v1/models",
            "/api/tokens/revoke"
        ]
    );
    assert!(requests[1].contains("authorization: Bearer admin-secret"));
    assert!(requests[2].contains(r#""ttl_hours":2"#));
    assert!(requests[2].contains(r#""max_requests":7"#));
    assert!(requests[4].contains(r#""id":"run-id""#));
}

#[test]
fn persisted_remote_token_is_private_and_never_echoed() {
    let directory = tempfile::tempdir().expect("temporary test directory");
    let home = directory.path().join("home");
    fs::create_dir_all(&home).expect("create home");
    let token = "la_sk_do-not-print-this-value";
    let output = Command::new(env!("CARGO_BIN_EXE_link-assistant-router"))
        .args([
            "server",
            "use",
            "https://router.example.internal",
            "--token",
            token,
            "--run-max-requests",
            "9",
        ])
        .env("HOME", &home)
        .env_remove("XDG_CONFIG_HOME")
        .env_remove("APPDATA")
        .output()
        .expect("persist remote server");
    assert!(output.status.success());
    let rendered = format!(
        "{}{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );
    assert!(!rendered.contains(token));
    assert!(rendered.contains("token set"));
    let state = home.join(".config/link-assistant-router/server.json");
    let contents = fs::read_to_string(&state).expect("read persisted server state");
    assert!(contents.contains(token));
    assert!(contents.contains("https://router.example.internal"));
    assert_eq!(
        fs::metadata(state)
            .expect("server state metadata")
            .permissions()
            .mode()
            & 0o777,
        0o600
    );
}

fn fake_claude(bin_dir: &std::path::Path) {
    fs::create_dir_all(bin_dir).expect("create fake bin directory");
    let path = bin_dir.join("claude");
    fs::write(
        &path,
        r#"#!/bin/sh
printf '%s\n' "$@" > "$CAPTURE_ARGS"
printf 'MAX_THINKING_TOKENS=%s\n' "$MAX_THINKING_TOKENS" > "$CAPTURE_ENV"
exit 0
"#,
    )
    .expect("write fake Claude");
    fs::set_permissions(&path, fs::Permissions::from_mode(0o755))
        .expect("make fake Claude executable");
}

/// End to end, through a terminal, for the exact command issue #297 reported.
///
/// `router with claude --resume <id>` used to reach the client as
/// `--model <catalog-first> --print --resume <id>`: a session told to answer
/// once and exit, with no prompt to answer, on a model the user never chose.
/// The client's own error was correct for that request and named neither
/// `--print` nor the router, so nothing in it led back to the cause.
///
/// A pty is required because the mode also depends on whether anyone is there
/// to hold a session; piping the launcher's output would answer that question
/// before the interesting one is reached.
#[test]
fn a_client_flag_starts_a_session_rather_than_a_one_shot_run() {
    use portable_pty::{CommandBuilder, PtySize, native_pty_system};

    let directory = tempfile::tempdir().expect("temporary test directory");
    let home = directory.path().join("home");
    let bin = directory.path().join("bin");
    let capture = directory.path().join("capture");
    fs::create_dir_all(&home).expect("create home");
    fs::create_dir_all(&capture).expect("create capture directory");
    fake_claude(&bin);
    let (server, requests) = mock_router();

    let inherited_path = std::env::var_os("PATH").unwrap_or_default();
    let path =
        std::env::join_paths(std::iter::once(bin).chain(std::env::split_paths(&inherited_path)))
            .expect("compose PATH");

    let pty = native_pty_system()
        .openpty(PtySize::default())
        .expect("allocate a pty");
    let mut command = CommandBuilder::new(env!("CARGO_BIN_EXE_with-router"));
    command.args([
        "--server",
        &server,
        "--token",
        "la_sk_ordinary",
        "claude",
        "--resume",
        "2a42a73e-19de-459a-8c24-c5e75abf9a65",
    ]);
    command.env("HOME", &home);
    command.env("PATH", path);
    command.env("CAPTURE_ARGS", capture.join("args"));
    command.env("CAPTURE_ENV", capture.join("env"));
    command.env_remove("MAX_THINKING_TOKENS");
    let mut child = pty.slave.spawn_command(command).expect("spawn launcher");
    drop(pty.slave);
    // The wrapper's own output would otherwise fill the pty buffer and block it.
    let mut reader = pty.master.try_clone_reader().expect("clone pty reader");
    let drain = thread::spawn(move || {
        let mut sink = Vec::new();
        let _ = reader.read_to_end(&mut sink);
        String::from_utf8_lossy(&sink).into_owned()
    });
    let status = child.wait().expect("await launcher");
    drop(pty.master);
    let transcript = drain.join().expect("pty reader thread");
    assert!(
        status.success(),
        "launcher failed; transcript: {transcript}"
    );

    let args = fs::read_to_string(capture.join("args")).expect("captured argv");
    let args: Vec<&str> = args.lines().collect();
    assert!(
        !args.contains(&"--print"),
        "a session was turned into a one-shot run: {args:?}"
    );
    assert!(
        !args.contains(&"--model"),
        "a model nobody asked for was forced: {args:?}"
    );
    assert_eq!(
        args,
        ["--resume", "2a42a73e-19de-459a-8c24-c5e75abf9a65"],
        "the client's own arguments must reach it unchanged"
    );
    assert_eq!(
        fs::read_to_string(capture.join("env")).expect("captured env"),
        "MAX_THINKING_TOKENS=\n",
        "the thinking budget is the user's setting, not the router's"
    );
    assert_eq!(
        requests.join().expect("mock router thread").join(","),
        "/health,/api/tokens/list,/v1/models"
    );
}
