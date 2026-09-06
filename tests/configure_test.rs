//! Permanent client setup: one name, one target, one reversal (issue #296).

#![cfg(unix)]

use base64::Engine as _;
use sha2::{Digest as _, Sha256};
use std::fs;
use std::io::{Read, Write};
use std::net::TcpListener;
use std::os::unix::fs::PermissionsExt as _;
use std::process::{Command, Output};
use std::thread;
use std::time::Duration;

struct BridgeCleanup(std::path::PathBuf);

impl Drop for BridgeCleanup {
    fn drop(&mut self) {
        let Ok(contents) = fs::read(&self.0) else {
            return;
        };
        let Ok(state) = serde_json::from_slice::<serde_json::Value>(&contents) else {
            return;
        };
        if let Some(pid) = state["pid"].as_u64() {
            let _ = Command::new("/bin/kill")
                .args(["-TERM", &pid.to_string()])
                .status();
        }
    }
}

fn bound_client_token(client: &str) -> String {
    let payload = base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(
        serde_json::json!({
            "sub": "configure-id",
            "client_kind": client,
            "principal_id": "configure-principal",
        })
        .to_string(),
    );
    format!("la_sk_e30.{payload}.signature")
}

/// A router that answers the three probes permanent setup makes: is it there,
/// is this credential an admin one, and what does it serve?
///
/// `/api/management/tokens` answers 401 so the supplied bound client token is
/// treated as an ordinary managed credential and validated by the catalog.
fn mock_router(requests: usize) -> (String, thread::JoinHandle<Vec<String>>) {
    let listener = TcpListener::bind("127.0.0.1:0").expect("bind mock router");
    listener
        .set_nonblocking(true)
        .expect("nonblocking listener");
    let port = listener.local_addr().expect("mock address").port();
    let handle = thread::spawn(move || {
        // Deadline-bounded rather than counted: the exact number of probes is
        // an implementation detail, and a test that blocks on one that never
        // comes reports a hang instead of the assertion that matters.
        let deadline = std::time::Instant::now() + Duration::from_secs(10);
        let mut paths = Vec::new();
        while paths.len() < requests {
            let mut stream = match listener.accept() {
                Ok((stream, _)) => stream,
                Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => {
                    if std::time::Instant::now() >= deadline {
                        return paths;
                    }
                    thread::sleep(Duration::from_millis(10));
                    continue;
                }
                Err(error) => panic!("accept mock router request: {error}"),
            };
            stream.set_nonblocking(false).expect("blocking connection");
            stream
                .set_read_timeout(Some(Duration::from_secs(5)))
                .expect("set read timeout");
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
                .unwrap_or("")
                .to_string();
            let (status, body) = match path.as_str() {
                "/api/health" => ("200 OK", r#"{"status":"ok","version":"0.115.0"}"#),
                "/api/management/tokens" => ("401 Unauthorized", r#"{"error":"ordinary token"}"#),
                "/api/services/anthropic/v1/models" => (
                    "200 OK",
                    r#"{"object":"list","data":[{"id":"gpt-5.6-sol","owned_by":"openai"}]}"#,
                ),
                _ => ("404 Not Found", r#"{"error":"unexpected path"}"#),
            };
            paths.push(path);
            write!(
                stream,
                "HTTP/1.1 {status}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
                body.len()
            )
            .expect("write mock response");
        }
        paths
    });
    (format!("http://127.0.0.1:{port}"), handle)
}

fn mock_external_codex_router(requests: usize) -> (String, thread::JoinHandle<Vec<String>>) {
    let listener = TcpListener::bind("0.0.0.0:0").expect("bind external mock router");
    listener
        .set_nonblocking(true)
        .expect("nonblocking listener");
    let port = listener.local_addr().expect("mock address").port();
    let handle = thread::spawn(move || {
        let deadline = std::time::Instant::now() + Duration::from_secs(10);
        let mut paths = Vec::new();
        while paths.len() < requests {
            let mut stream = match listener.accept() {
                Ok((stream, _)) => stream,
                Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => {
                    if std::time::Instant::now() >= deadline {
                        return paths;
                    }
                    thread::sleep(Duration::from_millis(10));
                    continue;
                }
                Err(error) => panic!("accept external mock request: {error}"),
            };
            let request = read_split_request(&mut stream);
            let path = request
                .lines()
                .next()
                .and_then(|line| line.split_whitespace().nth(1))
                .unwrap_or("")
                .to_string();
            let (status, body) = match path.as_str() {
                "/api/health" => ("200 OK", r#"{"status":"ok","version":"test"}"#),
                "/api/management/tokens" => ("401 Unauthorized", r#"{"error":"ordinary token"}"#),
                "/api/services/codex/v1/models" | "/api/models" => (
                    "200 OK",
                    r#"{"object":"list","data":[{"id":"gpt-future","owned_by":"openai"}]}"#,
                ),
                _ => ("404 Not Found", r#"{"error":"unexpected path"}"#),
            };
            paths.push(path);
            write!(
                stream,
                "HTTP/1.1 {status}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
                body.len()
            )
            .expect("write external mock response");
        }
        paths
    });
    (format!("http://0.0.0.0:{port}"), handle)
}

fn split_listener(
    management: bool,
    request_count: usize,
) -> (String, thread::JoinHandle<Vec<String>>) {
    let listener = TcpListener::bind("127.0.0.1:0").expect("bind split listener");
    let port = listener.local_addr().expect("split address").port();
    let issued = serde_json::json!({"token": bound_client_token("codex")}).to_string();
    let handle = thread::spawn(move || {
        let mut requests = Vec::new();
        for _ in 0..request_count {
            let (mut stream, _) = listener.accept().expect("accept split request");
            let request = read_split_request(&mut stream);
            let path = request
                .lines()
                .next()
                .and_then(|line| line.split_whitespace().nth(1))
                .unwrap_or("");
            let (status, body) = if management {
                match path {
                    "/api/management/tokens" => ("200 OK", r#"{"data":[]}"#),
                    "/api/management/tokens/client" => ("200 OK", issued.as_str()),
                    _ => ("404 Not Found", r#"{"error":"route class crossed"}"#),
                }
            } else {
                match path {
                    "/api/health" => ("200 OK", r#"{"status":"ok","version":"test"}"#),
                    "/api/services/codex/v1/models" => (
                        "200 OK",
                        r#"{"object":"list","data":[{"id":"gpt-future","owned_by":"openai"}]}"#,
                    ),
                    _ => ("404 Not Found", r#"{"error":"route class crossed"}"#),
                }
            };
            requests.push(request);
            write!(
                stream,
                "HTTP/1.1 {status}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
                body.len()
            )
            .expect("write split response");
        }
        requests
    });
    (format!("http://127.0.0.1:{port}"), handle)
}

fn read_split_request(stream: &mut std::net::TcpStream) -> String {
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
    String::from_utf8_lossy(&bytes).into_owned()
}

fn router(home: &std::path::Path, args: &[&str]) -> Output {
    let mut command = Command::new(env!("CARGO_BIN_EXE_link-assistant-router"));
    command
        .args(args)
        .env("HOME", home)
        .env_remove("CODEX_HOME")
        .env_remove("CLAUDE_CONFIG_DIR")
        .env_remove("XDG_CONFIG_HOME")
        .env_remove("LINK_ASSISTANT_ROUTER_URL")
        .env_remove("ROUTER_URL")
        .env_remove("LINK_ASSISTANT_ROUTER_TOKEN")
        .env_remove("LINK_ASSISTANT_TOKEN")
        .env_remove("TOKEN_SECRET")
        .env("DATA_DIR", home.join("router-data"))
        .env("STORAGE_POLICY", "text");
    command.output().expect("router CLI runs")
}

fn select(home: &std::path::Path, server: &str) {
    let token = bound_client_token("claude");
    let selected = router(home, &["server", "use", server, "--token", &token]);
    assert!(
        selected.status.success(),
        "server use failed: {}{}",
        String::from_utf8_lossy(&selected.stdout),
        String::from_utf8_lossy(&selected.stderr)
    );
}

/// The defect at the centre of issue #296: permanent setup wrote this CLI's
/// own `--host`/`--port` default into the client while a different router was
/// selected, with no error. The operator was left with a client pointed at a
/// deployment that may not even be running.
#[test]
fn configure_writes_the_selected_router_and_stores_its_credential() {
    let directory = tempfile::tempdir().expect("temporary directory");
    let home = directory.path().join("home");
    std::fs::create_dir_all(home.join(".claude")).expect("create home");
    let (server, requests) = mock_router(3);
    select(&home, &server);

    let configured = router(&home, &["configure", "claude"]);
    assert!(
        configured.status.success(),
        "configure failed: {}{}",
        String::from_utf8_lossy(&configured.stdout),
        String::from_utf8_lossy(&configured.stderr)
    );

    let settings =
        std::fs::read_to_string(home.join(".claude/settings.json")).expect("read Claude settings");
    assert!(
        settings.contains(&server),
        "the selected router must be the address written: {settings}"
    );
    assert!(
        !settings.contains(":8080"),
        "this CLI's own listen address must not be written: {settings}"
    );
    assert!(
        !settings.contains("la_sk_"),
        "the token must not land in the client's config: {settings}"
    );

    // The command did the whole job: address *and* credential. `with --global`
    // stored none and told the user to go set a variable themselves.
    let environment = home.join(".config/link-assistant-router/clients/claude.env");
    let stored = std::fs::read_to_string(&environment).expect("read stored credential");
    assert!(stored.contains(&bound_client_token("claude")), "{stored}");
    assert!(stored.contains(&server), "{stored}");
    assert_eq!(
        std::fs::metadata(&environment)
            .expect("credential metadata")
            .permissions()
            .mode()
            & 0o777,
        0o600,
        "a stored credential must be owner-only"
    );
    requests.join().expect("mock router thread");
}

#[test]
fn configure_keeps_split_route_classes_on_their_own_listeners() {
    let home = tempfile::tempdir().expect("temporary home");
    let (management_url, management) = split_listener(true, 2);
    let (base_url, inference) = split_listener(false, 2);

    let output = router(
        home.path(),
        &[
            "configure",
            "codex",
            "--server",
            &base_url,
            "--management-server",
            &management_url,
            "--token",
            "la_sk_admin",
        ],
    );
    assert!(
        output.status.success(),
        "{}{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );
    let management = management.join().expect("management listener");
    let inference = inference.join().expect("inference listener");
    assert!(management[0].starts_with("GET /api/management/tokens "));
    assert!(management[1].starts_with("POST /api/management/tokens/client "));
    assert!(inference[0].starts_with("GET /api/health "));
    assert!(inference[1].starts_with("GET /api/services/codex/v1/models "));
    let config =
        fs::read_to_string(home.path().join(".codex/config.toml")).expect("configured Codex");
    assert!(config.contains(&base_url));
    assert!(!config.contains(&management_url));
}

#[test]
fn external_codex_configure_owns_and_removes_a_loopback_bridge() {
    let directory = tempfile::tempdir().expect("temporary directory");
    let home = directory.path().join("home");
    let codex_home = home.join(".codex");
    fs::create_dir_all(&codex_home).expect("create Codex home");
    let original = "model_reasoning_effort = \"high\"\n\
chatgpt_base_url = \"https://user.example/backend\"\n\
experimental_realtime_ws_base_url = \"wss://user.example/realtime\"\n\
experimental_realtime_webrtc_call_base_url = \"https://user.example/calls\"\n";
    fs::write(codex_home.join("config.toml"), original).expect("seed Codex config");
    fs::write(codex_home.join("auth.json"), b"auth-private").expect("seed Codex auth");
    fs::write(
        codex_home.join("remote-control.json"),
        b"enrollment-private",
    )
    .expect("seed Codex enrollment");
    let (server, requests) = mock_external_codex_router(8);
    let token = bound_client_token("codex");
    let state_path = home.join(".config/link-assistant-router/clients/codex.loopback-bridge.json");
    let _bridge_cleanup = BridgeCleanup(state_path.clone());

    let configured = router(
        &home,
        &[
            "configure",
            "codex",
            "--server",
            &server,
            "--management-server",
            &server,
            "--token",
            &token,
        ],
    );
    assert!(
        configured.status.success(),
        "configure failed: {}{}",
        String::from_utf8_lossy(&configured.stdout),
        String::from_utf8_lossy(&configured.stderr)
    );
    let config = fs::read_to_string(codex_home.join("config.toml")).expect("configured Codex");
    assert!(
        config.contains("chatgpt_base_url = \"http://127.0.0.1:"),
        "{config}"
    );
    assert!(
        config.contains("/api/services/codex/backend-api\""),
        "{config}"
    );
    assert!(
        config.contains(&format!(
            "experimental_realtime_ws_base_url = \"{server}/api/services/codex/v1\""
        )),
        "{config}"
    );
    assert!(
        config.contains(&format!(
            "experimental_realtime_webrtc_call_base_url = \"{server}/api/services/codex/v1\""
        )),
        "{config}"
    );
    let metadata: serde_json::Value = serde_json::from_slice(
        &fs::read(home.join(".config/link-assistant-router/clients/codex.credential.json"))
            .expect("credential metadata"),
    )
    .expect("credential metadata JSON");
    assert_eq!(
        metadata["config_sha256"],
        hex::encode(Sha256::digest(config.as_bytes())),
        "metadata must describe the committed configuration"
    );
    let state: serde_json::Value =
        serde_json::from_slice(&fs::read(&state_path).expect("owned persistent bridge state"))
            .expect("bridge state JSON");
    assert_eq!(state["upstream_origin"], server);
    assert!(state["pid"].as_u64().is_some());
    assert_eq!(
        fs::metadata(&state_path)
            .expect("state metadata")
            .permissions()
            .mode()
            & 0o777,
        0o600
    );
    assert_eq!(
        fs::read(codex_home.join("auth.json")).unwrap(),
        b"auth-private"
    );
    assert_eq!(
        fs::read(codex_home.join("remote-control.json")).unwrap(),
        b"enrollment-private"
    );
    let loopback = url::Url::parse(state["loopback_origin"].as_str().unwrap()).unwrap();
    let mut health =
        std::net::TcpStream::connect((loopback.host_str().unwrap(), loopback.port().unwrap()))
            .expect("persistent bridge is listening");
    let nonce = state["nonce"].as_str().unwrap();
    write!(
        health,
        "GET /__link_assistant_router/codex_bridge/{nonce} HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n"
    )
    .unwrap();
    let mut health_response = String::new();
    health.read_to_string(&mut health_response).unwrap();
    assert!(
        health_response.starts_with("HTTP/1.1 200"),
        "{health_response}"
    );
    assert!(
        health_response
            .to_ascii_lowercase()
            .contains("x-link-assistant-router-codex-bridge:"),
        "{health_response}"
    );

    let repeated = router(
        &home,
        &[
            "configure",
            "codex",
            "--server",
            &server,
            "--management-server",
            &server,
            "--token",
            &token,
        ],
    );
    if !repeated.status.success() {
        let shown = router(&home, &["clients", "show", "codex"]);
        let current_state = fs::read_to_string(&state_path).unwrap_or_default();
        let _ = router(&home, &["configure", "--undo", "codex"]);
        let observed = requests.join().expect("external mock router");
        panic!(
            "repeat failed: {}\nstatus: {}{}\ninitial state: {state}\ncurrent state: {current_state}\nrequests: {observed:?}",
            String::from_utf8_lossy(&repeated.stderr),
            String::from_utf8_lossy(&shown.stdout),
            String::from_utf8_lossy(&shown.stderr)
        );
    }
    let repeated_state: serde_json::Value =
        serde_json::from_slice(&fs::read(&state_path).expect("reused bridge state"))
            .expect("bridge state JSON");
    assert_eq!(repeated_state, state, "repeat started another bridge");

    let stopped = Command::new("/bin/kill")
        .args(["-TERM", &state["pid"].as_u64().unwrap().to_string()])
        .status()
        .expect("stop bridge to simulate a crash");
    assert!(stopped.success());
    for _ in 0..100 {
        if !state_path.exists() {
            break;
        }
        thread::sleep(Duration::from_millis(20));
    }
    let recovered = router(
        &home,
        &[
            "configure",
            "codex",
            "--server",
            &server,
            "--management-server",
            &server,
            "--token",
            &token,
        ],
    );
    assert!(
        recovered.status.success(),
        "{}",
        String::from_utf8_lossy(&recovered.stderr)
    );
    let recovered_state: serde_json::Value =
        serde_json::from_slice(&fs::read(&state_path).expect("recovered bridge state"))
            .expect("bridge state JSON");
    assert_ne!(recovered_state["pid"], state["pid"]);
    let recovered_config = fs::read_to_string(codex_home.join("config.toml")).unwrap();
    assert!(
        recovered_config.contains(recovered_state["loopback_origin"].as_str().unwrap()),
        "{recovered_config}"
    );

    let undone = router(&home, &["configure", "--undo", "codex"]);
    assert!(
        undone.status.success(),
        "undo failed: {}{}",
        String::from_utf8_lossy(&undone.stdout),
        String::from_utf8_lossy(&undone.stderr)
    );
    assert_eq!(
        fs::read_to_string(codex_home.join("config.toml")).unwrap(),
        original
    );
    assert!(!state_path.exists(), "bridge state survived undo");
    assert_eq!(
        fs::read(codex_home.join("auth.json")).unwrap(),
        b"auth-private"
    );
    assert_eq!(
        fs::read(codex_home.join("remote-control.json")).unwrap(),
        b"enrollment-private"
    );
    assert_eq!(
        requests.join().expect("external mock router"),
        [
            "/api/health",
            "/api/management/tokens",
            "/api/models",
            "/api/health",
            "/api/models",
            "/api/health",
            "/api/models",
            "/api/models"
        ]
    );
}

#[test]
fn failed_external_codex_configure_removes_the_uncommitted_bridge() {
    let directory = tempfile::tempdir().expect("temporary directory");
    let home = directory.path().join("home");
    let codex_home = home.join(".codex");
    fs::create_dir_all(&codex_home).expect("create Codex home");
    let invalid = b"model_provider = [\n";
    fs::write(codex_home.join("config.toml"), invalid).expect("seed invalid Codex config");
    fs::write(codex_home.join("auth.json"), b"auth-private").expect("seed Codex auth");
    let (server, requests) = mock_external_codex_router(3);
    let token = bound_client_token("codex");
    let state_path = home.join(".config/link-assistant-router/clients/codex.loopback-bridge.json");
    let _bridge_cleanup = BridgeCleanup(state_path.clone());

    let configured = router(
        &home,
        &[
            "configure",
            "codex",
            "--server",
            &server,
            "--management-server",
            &server,
            "--token",
            &token,
        ],
    );
    assert!(!configured.status.success());
    assert!(
        String::from_utf8_lossy(&configured.stderr).contains("invalid TOML"),
        "{}",
        String::from_utf8_lossy(&configured.stderr)
    );
    assert_eq!(fs::read(codex_home.join("config.toml")).unwrap(), invalid);
    assert_eq!(
        fs::read(codex_home.join("auth.json")).unwrap(),
        b"auth-private"
    );
    let clients = state_path.parent().expect("clients directory");
    assert!(!state_path.exists());
    assert!(!clients.join("codex.env").exists());
    assert!(!clients.join("codex.credential.json").exists());
    assert!(
        !codex_home
            .join("config.toml.with-router-state.json")
            .exists()
    );
    assert_eq!(
        requests.join().expect("external mock router"),
        [
            "/api/health",
            "/api/management/tokens",
            "/api/services/codex/v1/models"
        ]
    );
}

/// `with --global` is the same command under an older name, so it cannot
/// disagree with it — four separate disagreements is what issue #296 reported.
#[test]
fn with_global_is_the_same_command_under_an_older_name() {
    let directory = tempfile::tempdir().expect("temporary directory");
    let home = directory.path().join("home");
    std::fs::create_dir_all(home.join(".claude")).expect("create home");
    let (server, requests) = mock_router(3);
    select(&home, &server);

    let configured = router(&home, &["with", "--global", "claude"]);
    assert!(
        configured.status.success(),
        "with --global failed: {}{}",
        String::from_utf8_lossy(&configured.stdout),
        String::from_utf8_lossy(&configured.stderr)
    );
    let settings =
        std::fs::read_to_string(home.join(".claude/settings.json")).expect("read Claude settings");
    assert!(settings.contains(&server), "{settings}");
    assert!(
        home.join(".config/link-assistant-router/clients/claude.env")
            .exists(),
        "the older spelling must store a credential too"
    );
    requests.join().expect("mock router thread");
}

/// Reversal by the same name, and the credential goes with the configuration
/// rather than outliving it.
#[test]
fn undo_restores_the_configuration_and_removes_the_credential() {
    let directory = tempfile::tempdir().expect("temporary directory");
    let home = directory.path().join("home");
    std::fs::create_dir_all(home.join(".claude")).expect("create home");
    let original = "{\n  \"theme\": \"dark\"\n}\n";
    std::fs::write(home.join(".claude/settings.json"), original).expect("seed settings");
    let (server, requests) = mock_router(3);
    select(&home, &server);

    assert!(router(&home, &["configure", "claude"]).status.success());
    let environment = home.join(".config/link-assistant-router/clients/claude.env");
    assert!(environment.exists());

    let undone = router(&home, &["configure", "--undo", "claude"]);
    assert!(
        undone.status.success(),
        "undo failed: {}{}",
        String::from_utf8_lossy(&undone.stdout),
        String::from_utf8_lossy(&undone.stderr)
    );
    assert_eq!(
        std::fs::read_to_string(home.join(".claude/settings.json")).expect("restored settings"),
        original,
        "the user's own file must come back byte for byte"
    );
    assert!(
        !environment.exists(),
        "a credential must not outlive the configuration that used it"
    );
    requests.join().expect("mock router thread");
}

/// `clients setup` mints from *this* deployment's token store, so it cannot
/// follow a remote selection — a locally signed token would be rejected there.
/// It used to write its own listen address anyway, silently. Refusing and
/// naming the command that can do it is the shape settled in issue #294.
#[test]
fn clients_setup_refuses_rather_than_writing_the_wrong_address() {
    let directory = tempfile::tempdir().expect("temporary directory");
    let home = directory.path().join("home");
    std::fs::create_dir_all(home.join(".claude")).expect("create home");
    let (server, requests) = mock_router(0);
    select(&home, &server);

    let attempted = Command::new(env!("CARGO_BIN_EXE_link-assistant-router"))
        .args(["clients", "setup", "claude"])
        .env("HOME", &home)
        .env_remove("CODEX_HOME")
        .env_remove("CLAUDE_CONFIG_DIR")
        .env_remove("XDG_CONFIG_HOME")
        .env("TOKEN_SECRET", "configure-test-secret")
        .env("DATA_DIR", home.join("router-data"))
        .env("STORAGE_POLICY", "text")
        .output()
        .expect("router CLI runs");
    assert!(!attempted.status.success());
    let stderr = String::from_utf8_lossy(&attempted.stderr);
    assert!(
        stderr.contains(&server),
        "the target must be named: {stderr}"
    );
    assert!(
        stderr.contains("router configure claude"),
        "the refusal must name what can do it: {stderr}"
    );
    assert!(
        !home.join(".claude/settings.json").exists()
            || !std::fs::read_to_string(home.join(".claude/settings.json"))
                .expect("read settings")
                .contains(":8080"),
        "the wrong address must not be written"
    );
    drop(requests);
}

/// A read-only listing signs nothing, so it has no reason to demand the
/// deployment's signing secret — and the check was satisfied by any value,
/// so it only taught operators to keep one in their shell.
#[test]
fn listing_clients_does_not_demand_a_signing_secret() {
    let directory = tempfile::tempdir().expect("temporary directory");
    let home = directory.path().join("home");
    std::fs::create_dir_all(&home).expect("create home");

    let listed = router(&home, &["clients", "list"]);
    assert!(
        listed.status.success(),
        "clients list failed: {}{}",
        String::from_utf8_lossy(&listed.stdout),
        String::from_utf8_lossy(&listed.stderr)
    );
    assert!(
        String::from_utf8_lossy(&listed.stdout).contains("claude"),
        "the table must still be printed"
    );
}
