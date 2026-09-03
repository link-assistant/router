//! Black-box coverage for the managed Docker server (issue #151).

#![cfg(unix)]

use std::fs;
use std::io::{Read, Write};
use std::net::TcpListener;
use std::os::unix::fs::PermissionsExt;
use std::process::{Command, Output, Stdio};
use std::thread;
use std::time::{Duration, Instant};

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

fn mock_tcp_health() -> (u16, thread::JoinHandle<()>) {
    let listener = TcpListener::bind("127.0.0.1:0").expect("bind managed health server");
    let port = listener
        .local_addr()
        .expect("managed health address")
        .port();
    let handle = thread::spawn(move || {
        let (mut stream, _) = listener.accept().expect("accept managed health request");
        let mut buffer = [0_u8; 4096];
        let amount = stream
            .read(&mut buffer)
            .expect("read managed health request");
        assert_ne!(amount, 0, "managed health request must not be empty");
        stream
            .write_all(b"HTTP/1.1 200 OK\r\nContent-Length: 2\r\nConnection: close\r\n\r\nok")
            .expect("write managed health response");
    });
    (port, handle)
}

fn mock_managed_router(
    admin: bool,
    request_count: usize,
) -> (u16, thread::JoinHandle<Vec<String>>) {
    let listener = TcpListener::bind("127.0.0.1:0").expect("bind managed mock router");
    let port = listener.local_addr().expect("managed mock address").port();
    let handle = thread::spawn(move || {
        let mut paths = Vec::new();
        for _ in 0..request_count {
            let (mut stream, _) = listener.accept().expect("accept managed request");
            let request = read_request(&mut stream);
            let path = request
                .lines()
                .next()
                .and_then(|line| line.split_whitespace().nth(1))
                .unwrap_or("")
                .to_string();
            paths.push(path.clone());
            let (status, body) = match path.as_str() {
                "/api/health" => ("200 OK", "ok"),
                "/api/management/tokens" if admin => ("200 OK", r#"{"data":[]}"#),
                "/api/management/tokens" => (
                    "401 Unauthorized",
                    r#"{"error":{"message":"ordinary token"}}"#,
                ),
                "/api/management/tokens/client" => (
                    "200 OK",
                    r#"{"token":"e30.eyJzdWIiOiJtYW5hZ2VkLXJ1biJ9.signature"}"#,
                ),
                "/api/services/codex/v1/models" => (
                    "200 OK",
                    r#"{"object":"list","data":[{"id":"gpt-5.6-sol"}]}"#,
                ),
                "/api/management/tokens/revoke" => ("200 OK", r#"{"revoked":"managed-run"}"#),
                _ => ("404 Not Found", r#"{"error":"unexpected path"}"#),
            };
            write!(
                stream,
                "HTTP/1.1 {status}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
                body.len()
            )
            .expect("write managed mock response");
        }
        paths
    });
    (port, handle)
}

fn fake_docker(bin_dir: &std::path::Path) {
    fs::create_dir_all(bin_dir).expect("create fake Docker bin directory");
    let path = bin_dir.join("docker");
    fs::write(
        &path,
        r#"#!/bin/sh
printf '%s\n' "$*" >> "$DOCKER_LOG"
if [ "$FAKE_DOCKER_STATE" = permission ] && [ "$1" = info ]; then
  echo 'permission denied while connecting to daemon' >&2
  exit 1
fi
if [ "$FAKE_DOCKER_STATE" = daemon ] && [ "$1" = info ]; then
  echo 'Cannot connect to the Docker daemon' >&2
  exit 1
fi
if [ "$1" = inspect ]; then
  case "$FAKE_DOCKER_STATE" in
    absent) echo 'Error: No such object' >&2; exit 1 ;;
    absent-lowercase) echo 'error: no such object: link-assistant-router-managed' >&2; exit 1 ;;
    stopped) echo 'stopped 1'; exit 0 ;;
    unowned) echo 'running 0'; exit 0 ;;
    inspect-error) echo 'inspect exploded' >&2; exit 1 ;;
    *) echo 'running 1'; exit 0 ;;
  esac
fi
if [ "$1" = logs ]; then
  echo 'Admin token (shown once, store it now): la_sk_managed-test'
  exit 0
fi
if [ "$1" = exec ]; then
  if [ "$FAKE_DOCKER_STATE" = subscription-fail ]; then
    echo 'subscription query failed' >&2
    exit 1
  fi
  echo 'codex: authorized'
fi
if [ "$1" = volume ] && [ "$FAKE_DOCKER_STATE" = volume-error ]; then
  echo 'volume is busy' >&2
  exit 1
fi
exit 0
"#,
    )
    .expect("write fake Docker");
    fs::set_permissions(&path, fs::Permissions::from_mode(0o755))
        .expect("make fake Docker executable");
}

fn fake_stateful_docker(bin_dir: &std::path::Path) {
    fs::create_dir_all(bin_dir).expect("create fake Docker bin directory");
    let path = bin_dir.join("docker");
    fs::write(
        &path,
        r#"#!/bin/sh
printf '%s\n' "$*" >> "$DOCKER_LOG"
state=$(cat "$FAKE_DOCKER_FILE" 2>/dev/null || printf absent)
if [ "$1" = inspect ]; then
  case "$state" in
    absent) echo 'Error: No such object' >&2; exit 1 ;;
    stopped) echo 'stopped 1'; exit 0 ;;
    *) echo 'running 1'; exit 0 ;;
  esac
fi
if [ "$1" = logs ]; then
  echo 'Admin token (shown once, store it now): la_sk_managed-test'
  exit 0
fi
if [ "$1" = run ] || [ "$1" = start ]; then
  printf running > "$FAKE_DOCKER_FILE"
fi
if [ "$1" = stop ]; then
  printf stopped > "$FAKE_DOCKER_FILE"
fi
exit 0
"#,
    )
    .expect("write stateful fake Docker");
    fs::set_permissions(&path, fs::Permissions::from_mode(0o755))
        .expect("make stateful fake Docker executable");
}

fn managed_state_path(home: &std::path::Path) -> std::path::PathBuf {
    home.join(".config/link-assistant-router/managed-server.json")
}

fn seed_managed_state(home: &std::path::Path, port: u16) {
    let path = managed_state_path(home);
    fs::create_dir_all(path.parent().expect("managed state parent"))
        .expect("create managed state directory");
    fs::write(
        path,
        format!(
            "{{\"port\":{port},\"token_secret\":\"test-secret\",\"references\":[4294967294],\"keep_running\":false}}"
        ),
    )
    .expect("seed managed state");
}

fn seed_claimed_managed_state(home: &std::path::Path, port: u16) {
    let path = managed_state_path(home);
    fs::create_dir_all(path.parent().expect("managed state parent"))
        .expect("create managed state directory");
    fs::write(
        path,
        format!(
            "{{\"port\":{port},\"token_secret\":\"test-secret\",\"references\":[],\"keep_running\":false,\"claimed\":true}}"
        ),
    )
    .expect("seed claimed managed state");
}

fn server_command(
    home: &std::path::Path,
    bin: &std::path::Path,
    log: &std::path::Path,
    state: &str,
    arguments: &[&str],
) -> Output {
    let inherited_path = std::env::var_os("PATH").unwrap_or_default();
    let path = std::env::join_paths(
        std::iter::once(bin.to_path_buf()).chain(std::env::split_paths(&inherited_path)),
    )
    .expect("compose fake Docker PATH");
    Command::new(env!("CARGO_BIN_EXE_link-assistant-router"))
        .arg("server")
        .args(arguments)
        .env("HOME", home)
        .env("PATH", path)
        .env("DOCKER_LOG", log)
        .env("FAKE_DOCKER_STATE", state)
        .env_remove("XDG_CONFIG_HOME")
        .env_remove("APPDATA")
        .env_remove("LINK_ASSISTANT_ROUTER_URL")
        .env_remove("ROUTER_URL")
        .output()
        .expect("run server command")
}

fn with_router_command(home: &std::path::Path) -> Command {
    let mut command = Command::new(env!("CARGO_BIN_EXE_with-router"));
    command
        .env("HOME", home)
        .env_remove("XDG_CONFIG_HOME")
        .env_remove("APPDATA")
        .env_remove("LINK_ASSISTANT_ROUTER_URL")
        .env_remove("ROUTER_URL")
        .env_remove("LINK_ASSISTANT_ROUTER_TOKEN")
        .env_remove("LINK_ASSISTANT_TOKEN");
    command
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
if [ -n "$CAPTURE_PID" ]; then
  printf '%s\n' "$$" > "$CAPTURE_PID"
fi
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

fn fake_supported_claude(bin_dir: &std::path::Path) {
    fs::create_dir_all(bin_dir).expect("create fake bin directory");
    let path = bin_dir.join("claude");
    fs::write(
        &path,
        "#!/bin/sh\nif [ \"$1\" = \"--version\" ]; then echo '2.1.255 (Claude Code)'; exit 0; fi\nexit 23\n",
    )
    .expect("write fake Claude");
    fs::set_permissions(&path, fs::Permissions::from_mode(0o755))
        .expect("make fake Claude executable");
}

#[test]
fn managed_server_lifecycle_is_idempotent_and_preserves_data_until_remove() {
    let directory = tempfile::tempdir().expect("temporary test directory");
    let home = directory.path().join("home");
    let bin = directory.path().join("bin");
    let log = directory.path().join("docker.log");
    fs::create_dir_all(&home).expect("create home");
    fs::write(&log, "").expect("create Docker log");
    fake_docker(&bin);

    let refused = server_command(&home, &bin, &log, "absent", &["remove"]);
    assert!(!refused.status.success());
    assert!(String::from_utf8_lossy(&refused.stderr).contains("permanently lost"));

    let absent = server_command(&home, &bin, &log, "absent", &["status"]);
    assert!(absent.status.success());
    assert!(String::from_utf8_lossy(&absent.stdout).contains("managed server: absent"));

    let (port, health) = mock_tcp_health();
    seed_managed_state(&home, port);
    let started = server_command(&home, &bin, &log, "absent", &["start"]);
    assert!(
        started.status.success(),
        "start failed: {}",
        String::from_utf8_lossy(&started.stderr)
    );
    health.join().expect("managed health thread");
    let state = fs::read_to_string(managed_state_path(&home)).expect("read started state");
    // The state file is links notation, so a field reads `name value` (issue #235).
    assert!(state.contains("keep_running true"), "{state}");

    let status = server_command(&home, &bin, &log, "running", &["status"]);
    assert!(status.status.success());
    let rendered = String::from_utf8_lossy(&status.stdout);
    assert!(rendered.contains("managed server: running"));
    assert!(rendered.contains("administrator=unclaimed"));
    assert!(rendered.contains("subscriptions=codex: authorized"));
    let state = fs::read_to_string(managed_state_path(&home)).expect("read managed state");
    assert!(!state.contains("admin_key"));
    assert!(!state.contains("managed-test"));

    let stopped = server_command(&home, &bin, &log, "running", &["stop"]);
    assert!(stopped.status.success());
    assert!(managed_state_path(&home).exists());

    let (port, health) = mock_tcp_health();
    seed_managed_state(&home, port);
    let restarted = server_command(&home, &bin, &log, "stopped", &["start"]);
    assert!(restarted.status.success());
    health.join().expect("restarted health thread");

    let removed = server_command(&home, &bin, &log, "running", &["remove", "--yes"]);
    assert!(removed.status.success());
    assert!(!managed_state_path(&home).exists());
    let docker_log = fs::read_to_string(log).expect("read Docker log");
    assert!(docker_log.contains("run -d --name link-assistant-router-managed"));
    assert!(docker_log.contains("-e TOKEN_SECRET"));
    assert!(!docker_log.contains("TOKEN_ADMIN_KEY"));
    assert!(!docker_log.contains("managed-test"));
    assert!(!docker_log.contains("test-secret"));
    assert!(docker_log.contains("start link-assistant-router-managed"));
    assert!(docker_log.contains("stop link-assistant-router-managed"));
    assert!(docker_log.contains("volume rm link-assistant-router-managed-data"));
}

#[test]
fn managed_admin_is_used_only_for_unclaimed_per_run_minting() {
    let directory = tempfile::tempdir().expect("temporary test directory");
    let home = directory.path().join("home");
    let bin = directory.path().join("bin");
    let capture = directory.path().join("capture");
    let log = directory.path().join("docker.log");
    fs::create_dir_all(&home).expect("create home");
    fs::create_dir_all(&capture).expect("create capture directory");
    fs::write(&log, "").expect("create Docker log");
    fake_docker(&bin);
    fake_codex(&bin);
    let (port, router) = mock_managed_router(true, 6);
    seed_managed_state(&home, port);
    let inherited_path = std::env::var_os("PATH").unwrap_or_default();
    let path =
        std::env::join_paths(std::iter::once(bin).chain(std::env::split_paths(&inherited_path)))
            .expect("compose PATH");

    let output = with_router_command(&home)
        .args(["codex", "hello"])
        .env("PATH", path)
        .env("DOCKER_LOG", &log)
        .env("FAKE_DOCKER_STATE", "running")
        .env("FAKE_EXIT", "0")
        .env("CAPTURE_ARGS", capture.join("args"))
        .env("CAPTURE_HOME", capture.join("home"))
        .env("CAPTURE_CONFIG", capture.join("config"))
        .env("CAPTURE_TOKEN", capture.join("token"))
        .env_remove("CODEX_HOME")
        .output()
        .expect("run against unclaimed managed router");

    assert!(
        output.status.success(),
        "unclaimed managed launch failed: {}",
        String::from_utf8_lossy(&output.stderr)
    );
    assert_eq!(
        fs::read_to_string(capture.join("token")).expect("captured run token"),
        "e30.eyJzdWIiOiJtYW5hZ2VkLXJ1biJ9.signature\n"
    );
    assert_eq!(
        router.join().expect("managed router thread"),
        [
            "/api/health",
            "/api/health",
            "/api/management/tokens",
            "/api/management/tokens/client",
            "/api/services/codex/v1/models",
            "/api/management/tokens/revoke"
        ]
    );
}

#[test]
fn concurrent_managed_launches_create_one_shared_container() {
    let directory = tempfile::tempdir().expect("temporary test directory");
    let home = directory.path().join("home");
    let bin = directory.path().join("bin");
    let log = directory.path().join("docker.log");
    let docker_state = directory.path().join("docker.state");
    fs::create_dir_all(&home).expect("create home");
    fs::write(&log, "").expect("create Docker log");
    fake_stateful_docker(&bin);
    fake_codex(&bin);
    let (port, router) = mock_managed_router(true, 12);
    seed_managed_state(&home, port);
    let inherited_path = std::env::var_os("PATH").unwrap_or_default();
    let path =
        std::env::join_paths(std::iter::once(bin).chain(std::env::split_paths(&inherited_path)))
            .expect("compose PATH");
    let mut children = Vec::new();
    for index in 0..2 {
        let capture = directory.path().join(format!("capture-{index}"));
        fs::create_dir_all(&capture).expect("create capture directory");
        let child = with_router_command(&home)
            .args(["codex", "hello"])
            .env("PATH", &path)
            .env("DOCKER_LOG", &log)
            .env("FAKE_DOCKER_FILE", &docker_state)
            .env("FAKE_DELAY", "1")
            .env("FAKE_EXIT", "0")
            .env("CAPTURE_ARGS", capture.join("args"))
            .env("CAPTURE_HOME", capture.join("home"))
            .env("CAPTURE_CONFIG", capture.join("config"))
            .env("CAPTURE_TOKEN", capture.join("token"))
            .env_remove("CODEX_HOME")
            .spawn()
            .expect("spawn concurrent managed wrapper");
        children.push(child);
    }
    for mut child in children {
        assert!(child.wait().expect("wait for managed wrapper").success());
    }
    assert_eq!(router.join().expect("managed router thread").len(), 12);
    let docker_log = fs::read_to_string(log).expect("read Docker log");
    assert_eq!(
        docker_log
            .lines()
            .filter(|line| line.starts_with("run -d --name"))
            .count(),
        1,
        "the lifecycle lock must serialize container creation: {docker_log}"
    );
}

#[test]
fn reaper_releases_its_reference_when_the_owner_pipe_closes() {
    let directory = tempfile::tempdir().expect("temporary test directory");
    let home = directory.path().join("home");
    let bin = directory.path().join("bin");
    let log = directory.path().join("docker.log");
    fs::create_dir_all(&home).expect("create home");
    fs::write(&log, "").expect("create Docker log");
    fake_docker(&bin);
    fs::create_dir_all(
        managed_state_path(&home)
            .parent()
            .expect("managed state parent"),
    )
    .expect("create managed state directory");
    fs::write(
        managed_state_path(&home),
        format!(
            "{{\"port\":18080,\"token_secret\":\"test-secret\",\"references\":[{}],\"keep_running\":false}}",
            std::process::id()
        ),
    )
    .expect("seed live managed reference");

    let inherited_path = std::env::var_os("PATH").unwrap_or_default();
    let path =
        std::env::join_paths(std::iter::once(bin).chain(std::env::split_paths(&inherited_path)))
            .expect("compose fake Docker PATH");
    let mut reaper = Command::new(env!("CARGO_BIN_EXE_link-assistant-router"))
        .args(["server", "reap", &std::process::id().to_string()])
        .env("HOME", &home)
        .env("PATH", path)
        .env("DOCKER_LOG", &log)
        .env("FAKE_DOCKER_STATE", "running")
        .env_remove("XDG_CONFIG_HOME")
        .env_remove("APPDATA")
        .stdin(Stdio::piped())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .expect("spawn crash reaper");

    thread::sleep(Duration::from_millis(100));
    assert!(
        reaper.try_wait().expect("inspect running reaper").is_none(),
        "the reaper must remain armed while the owner pipe is open"
    );
    drop(reaper.stdin.take());

    // Full CI runs can briefly starve this child while hundreds of tests are
    // completing in parallel. Keep the assertion bounded without making the
    // scheduler itself part of the contract.
    let deadline = Instant::now() + Duration::from_secs(5);
    let status = loop {
        if let Some(status) = reaper.try_wait().expect("inspect released reaper") {
            break status;
        }
        if Instant::now() >= deadline {
            reaper.kill().expect("kill stuck reaper");
            reaper.wait().expect("collect stuck reaper");
            panic!("the reaper did not exit after its owner pipe closed");
        }
        thread::sleep(Duration::from_millis(20));
    };
    assert!(status.success());
    let state = fs::read_to_string(managed_state_path(&home)).expect("read reaped state");
    assert!(state.contains("references ()"), "{state}");
    assert!(
        fs::read_to_string(log)
            .expect("read Docker log")
            .contains("stop link-assistant-router-managed")
    );
}

#[test]
fn reaper_reports_cleanup_failures() {
    let output = Command::new(env!("CARGO_BIN_EXE_link-assistant-router"))
        .args(["server", "reap", "4294967294"])
        .env_remove("HOME")
        .env_remove("XDG_CONFIG_HOME")
        .env_remove("APPDATA")
        .output()
        .expect("run crash reaper without a state directory");

    assert!(!output.status.success());
    let stderr = String::from_utf8_lossy(&output.stderr);
    assert!(stderr.contains("could not reap managed router reference 4294967294"));
    assert!(stderr.contains("HOME, XDG_CONFIG_HOME, and APPDATA are unset"));
}

#[test]
fn killed_last_wrapper_is_reaped_and_stops_the_shared_container() {
    let directory = tempfile::tempdir().expect("temporary test directory");
    let home = directory.path().join("home");
    let bin = directory.path().join("bin");
    let capture = directory.path().join("capture");
    let log = directory.path().join("docker.log");
    let docker_state = directory.path().join("docker.state");
    fs::create_dir_all(&home).expect("create home");
    fs::create_dir_all(&capture).expect("create capture directory");
    fs::write(&log, "").expect("create Docker log");
    fake_stateful_docker(&bin);
    fake_codex(&bin);
    let (port, router) = mock_managed_router(true, 5);
    seed_managed_state(&home, port);
    let inherited_path = std::env::var_os("PATH").unwrap_or_default();
    let path =
        std::env::join_paths(std::iter::once(bin).chain(std::env::split_paths(&inherited_path)))
            .expect("compose PATH");
    let mut wrapper = with_router_command(&home)
        .args(["codex", "wait"])
        .env("PATH", path)
        .env("DOCKER_LOG", &log)
        .env("FAKE_DOCKER_FILE", &docker_state)
        .env("FAKE_WAIT", "1")
        .env("FAKE_EXIT", "0")
        .env("CAPTURE_ARGS", capture.join("args"))
        .env("CAPTURE_HOME", capture.join("home"))
        .env("CAPTURE_CONFIG", capture.join("config"))
        .env("CAPTURE_TOKEN", capture.join("token"))
        .env("CAPTURE_PID", capture.join("pid"))
        .env_remove("CODEX_HOME")
        .spawn()
        .expect("spawn wrapper to kill");
    let start_deadline = Instant::now() + Duration::from_secs(10);
    while Instant::now() < start_deadline {
        if capture.join("pid").exists() {
            break;
        }
        thread::sleep(Duration::from_millis(20));
    }
    assert!(capture.join("pid").exists(), "managed client did not start");
    let killed = Command::new("kill")
        .args(["-KILL", &wrapper.id().to_string()])
        .status()
        .expect("kill wrapper");
    assert!(killed.success());
    assert!(!wrapper.wait().expect("reap killed wrapper").success());
    router.join().expect("managed router thread");

    for _ in 0..120 {
        let stopped = fs::read_to_string(&log)
            .expect("read Docker log")
            .contains("stop link-assistant-router-managed");
        let reaped = fs::read_to_string(managed_state_path(&home))
            .is_ok_and(|state| state.contains("references ()"));
        if stopped && reaped {
            break;
        }
        thread::sleep(Duration::from_millis(50));
    }
    let docker_log = fs::read_to_string(&log).expect("read final Docker log");
    assert!(docker_log.contains("stop link-assistant-router-managed"));
    let state = fs::read_to_string(managed_state_path(&home)).expect("read reaped state");
    assert!(state.contains("references ()"), "{state}");

    let client_pid = fs::read_to_string(capture.join("pid")).expect("read client pid");
    let _ = Command::new("kill")
        .args(["-KILL", client_pid.trim()])
        .status();
}

#[test]
fn managed_claim_is_one_time_and_requires_a_later_token() {
    let directory = tempfile::tempdir().expect("temporary test directory");
    let home = directory.path().join("home");
    let bin = directory.path().join("bin");
    let log = directory.path().join("docker.log");
    fs::create_dir_all(&home).expect("create home");
    fs::write(&log, "").expect("create Docker log");
    fake_docker(&bin);
    seed_managed_state(&home, 18080);

    let claimed = server_command(&home, &bin, &log, "running", &["claim"]);
    assert!(claimed.status.success());
    assert_eq!(
        String::from_utf8_lossy(&claimed.stdout),
        "la_sk_managed-test\n"
    );
    assert!(String::from_utf8_lossy(&claimed.stderr).contains("future `with` runs require"));
    assert!(
        fs::read_to_string(managed_state_path(&home))
            .expect("read claimed state")
            .contains("claimed true")
    );
    let repeated = server_command(&home, &bin, &log, "running", &["claim"]);
    assert!(!repeated.status.success());
    assert!(
        repeated.stdout.is_empty(),
        "credential must not be printed twice"
    );
    assert!(String::from_utf8_lossy(&repeated.stderr).contains("already claimed"));

    let (port, router) = mock_managed_router(false, 2);
    seed_claimed_managed_state(&home, port);
    let inherited_path = std::env::var_os("PATH").unwrap_or_default();
    let path =
        std::env::join_paths(std::iter::once(bin).chain(std::env::split_paths(&inherited_path)))
            .expect("compose PATH");
    let rejected = with_router_command(&home)
        .arg("codex")
        .env("PATH", path)
        .env("DOCKER_LOG", &log)
        .env("FAKE_DOCKER_STATE", "running")
        .output()
        .expect("run claimed managed router without token");
    assert!(!rejected.status.success());
    let error = String::from_utf8_lossy(&rejected.stderr);
    assert!(error.contains("is claimed and no token is available"));
    assert!(error.contains("docker exec link-assistant-router-managed"));
    assert_eq!(
        router.join().expect("managed router thread"),
        ["/api/health", "/api/health"]
    );
}

#[test]
fn claimed_managed_router_accepts_an_explicit_ordinary_token() {
    let directory = tempfile::tempdir().expect("temporary test directory");
    let home = directory.path().join("home");
    let bin = directory.path().join("bin");
    let capture = directory.path().join("capture");
    let log = directory.path().join("docker.log");
    fs::create_dir_all(&home).expect("create home");
    fs::create_dir_all(&capture).expect("create capture directory");
    fs::write(&log, "").expect("create Docker log");
    fake_docker(&bin);
    fake_codex(&bin);
    let (port, router) = mock_managed_router(false, 4);
    seed_claimed_managed_state(&home, port);
    let inherited_path = std::env::var_os("PATH").unwrap_or_default();
    let path =
        std::env::join_paths(std::iter::once(bin).chain(std::env::split_paths(&inherited_path)))
            .expect("compose PATH");

    let output = with_router_command(&home)
        .args(["--token", "ordinary-after-claim", "codex", "hello"])
        .env("PATH", path)
        .env("DOCKER_LOG", &log)
        .env("FAKE_DOCKER_STATE", "running")
        .env("FAKE_EXIT", "0")
        .env("CAPTURE_ARGS", capture.join("args"))
        .env("CAPTURE_HOME", capture.join("home"))
        .env("CAPTURE_CONFIG", capture.join("config"))
        .env("CAPTURE_TOKEN", capture.join("token"))
        .env_remove("CODEX_HOME")
        .output()
        .expect("run claimed managed router with ordinary token");
    assert!(
        output.status.success(),
        "claimed managed launch failed: {}",
        String::from_utf8_lossy(&output.stderr)
    );
    assert_eq!(
        fs::read_to_string(capture.join("token")).expect("captured ordinary token"),
        "ordinary-after-claim\n"
    );
    assert_eq!(
        router.join().expect("managed router thread"),
        [
            "/api/health",
            "/api/health",
            "/api/management/tokens",
            "/api/services/codex/v1/models"
        ]
    );
}

#[test]
fn remove_never_deletes_an_unowned_container() {
    let directory = tempfile::tempdir().expect("temporary test directory");
    let home = directory.path().join("home");
    let bin = directory.path().join("bin");
    let log = directory.path().join("docker.log");
    fs::create_dir_all(&home).expect("create home");
    fs::write(&log, "").expect("create Docker log");
    fake_docker(&bin);
    seed_managed_state(&home, 18080);

    let output = server_command(&home, &bin, &log, "unowned", &["remove", "--yes"]);
    assert!(!output.status.success());
    assert!(String::from_utf8_lossy(&output.stderr).contains("not owned by this wrapper"));
    assert!(managed_state_path(&home).exists());
    assert!(
        !fs::read_to_string(log)
            .expect("read Docker log")
            .contains("rm -f")
    );
}

/// An unreachable selected server says which one, and what to do.
///
/// The report that prompted this got docker's words about an internal
/// container it had never heard of. A refusal is the right answer -- silently
/// using a router other than the one selected is its own surprise -- but it
/// has to name the server and the way out (issue #333).
#[test]
fn an_unreachable_selection_names_itself_and_the_way_out() {
    let directory = tempfile::tempdir().expect("temporary test directory");
    let home = directory.path().join("home");
    let bin = directory.path().join("bin");
    let log = directory.path().join("docker.log");
    let selection = home.join(".config/link-assistant-router");
    fs::create_dir_all(&selection).expect("create the selection directory");
    fs::write(&log, "").expect("create Docker log");
    fake_docker(&bin);
    fake_supported_claude(&bin);
    // Port 1 is not listening, so the selection is unreachable.
    fs::write(
        selection.join("server.json"),
        r#"{"server":"http://127.0.0.1:1"}"#,
    )
    .expect("write the selection");

    let inherited_path = std::env::var_os("PATH").unwrap_or_default();
    let path =
        std::env::join_paths(std::iter::once(bin).chain(std::env::split_paths(&inherited_path)))
            .expect("compose fake Docker PATH");
    let output = Command::new(env!("CARGO_BIN_EXE_link-assistant-router"))
        .args(["with", "claude"])
        .env("HOME", &home)
        .env("PATH", path)
        .env("DOCKER_LOG", &log)
        .env("FAKE_DOCKER_STATE", "absent")
        .env("TOKEN_SECRET", "managed-selection-test")
        .env_remove("XDG_CONFIG_HOME")
        .env_remove("APPDATA")
        .env_remove("LINK_ASSISTANT_ROUTER_URL")
        .env_remove("ROUTER_URL")
        .output()
        .expect("run with");

    let stderr = String::from_utf8_lossy(&output.stderr);
    assert!(!output.status.success(), "an unreachable selection fails");
    assert!(
        stderr.contains("127.0.0.1:1"),
        "the message must name the server that is not answering: {stderr}"
    );
    assert!(
        stderr.contains("--local") && stderr.contains("--managed"),
        "the message must name the ways out: {stderr}"
    );
    assert!(
        stderr.contains("router server use"),
        "the message must name the command that changes the selection: {stderr}"
    );
    // The internal container name is not the user's problem.
    assert!(
        !stderr.contains("link-assistant-router-managed"),
        "an internal container name must not appear: {stderr}"
    );
}

/// An absent container is recognised however Docker spells it.
///
/// The sentinel was matched case-sensitively, and Docker Desktop writes
/// `error: no such object: …` in lower case. A container that simply did not
/// exist yet was therefore read as a hard inspect failure, so the one that
/// should have been created never was and `with` failed naming an internal
/// container the user has never heard of (issue #333).
#[test]
fn an_absent_container_is_recognised_in_either_spelling() {
    for state in ["absent", "absent-lowercase"] {
        let directory = tempfile::tempdir().expect("temporary test directory");
        let home = directory.path().join("home");
        let bin = directory.path().join("bin");
        let log = directory.path().join("docker.log");
        fs::create_dir_all(&home).expect("create home");
        fs::write(&log, "").expect("create Docker log");
        fake_docker(&bin);

        let output = server_command(&home, &bin, &log, state, &["start"]);
        let stderr = String::from_utf8_lossy(&output.stderr);
        assert!(
            !stderr.contains("could not inspect"),
            "{state}: an absent container is not an inspect failure: {stderr}"
        );
        // The absent case proceeds to create one, which is the whole point.
        let commands = fs::read_to_string(&log).expect("docker log");
        assert!(
            commands.lines().any(|line| line.starts_with("run ")),
            "{state}: the container that was absent must be created: {commands}"
        );
    }
}

#[test]
fn managed_server_reports_actionable_docker_failures() {
    for (state, expected) in [
        ("permission", "permission denied while connecting to Docker"),
        ("daemon", "Docker daemon is not running or unreachable"),
        ("unowned", "is not owned by this wrapper"),
    ] {
        let directory = tempfile::tempdir().expect("temporary test directory");
        let home = directory.path().join("home");
        let bin = directory.path().join("bin");
        let log = directory.path().join("docker.log");
        fs::create_dir_all(&home).expect("create home");
        fs::write(&log, "").expect("create Docker log");
        fake_docker(&bin);
        let output = server_command(&home, &bin, &log, state, &["start"]);
        assert!(!output.status.success());
        assert!(
            String::from_utf8_lossy(&output.stderr).contains(expected),
            "unexpected {state} diagnostic: {}",
            String::from_utf8_lossy(&output.stderr)
        );
    }
}

#[test]
fn managed_server_edge_failures_preserve_state_and_hide_credentials() {
    let directory = tempfile::tempdir().expect("temporary test directory");
    let home = directory.path().join("home");
    let bin = directory.path().join("bin");
    let log = directory.path().join("docker.log");
    fs::create_dir_all(&home).expect("create home");
    fs::write(&log, "").expect("create Docker log");
    fake_docker(&bin);

    let stopped = server_command(&home, &bin, &log, "absent", &["stop"]);
    assert!(!stopped.status.success());
    assert!(String::from_utf8_lossy(&stopped.stderr).contains("managed router is absent"));

    seed_managed_state(&home, 18080);
    let subscription_failure = server_command(&home, &bin, &log, "subscription-fail", &["status"]);
    assert!(subscription_failure.status.success());
    assert!(
        String::from_utf8_lossy(&subscription_failure.stdout)
            .contains("subscriptions=unavailable (subscription query failed)")
    );

    let inspect_failure = server_command(&home, &bin, &log, "inspect-error", &["status"]);
    assert!(inspect_failure.status.success());
    assert!(String::from_utf8_lossy(&inspect_failure.stdout).contains("unavailable"));

    let remove_failure = server_command(&home, &bin, &log, "volume-error", &["remove", "--yes"]);
    assert!(!remove_failure.status.success());
    assert!(String::from_utf8_lossy(&remove_failure.stderr).contains("volume is busy"));
    assert!(managed_state_path(&home).exists());

    fs::write(managed_state_path(&home), "not json").expect("corrupt managed state");
    let invalid = server_command(&home, &bin, &log, "absent", &["status"]);
    assert!(!invalid.status.success());
    assert!(String::from_utf8_lossy(&invalid.stderr).contains("invalid managed server state"));
}

#[test]
fn server_selection_rejects_ambiguous_or_invalid_updates_and_can_clear() {
    let directory = tempfile::tempdir().expect("temporary test directory");
    let home = directory.path().join("home");
    let bin = directory.path().join("bin");
    let log = directory.path().join("docker.log");
    fs::create_dir_all(&home).expect("create home");
    fs::write(&log, "").expect("create Docker log");
    fake_docker(&bin);

    let ambiguous = server_command(
        &home,
        &bin,
        &log,
        "absent",
        &["use", "https://router.example", "--clear"],
    );
    assert!(!ambiguous.status.success());
    assert!(String::from_utf8_lossy(&ambiguous.stderr).contains("cannot be combined"));

    let invalid = server_command(&home, &bin, &log, "absent", &["use", "router.example"]);
    assert!(!invalid.status.success());
    assert!(String::from_utf8_lossy(&invalid.stderr).contains("absolute http:// or https://"));

    for unsafe_origin in [
        "https://private-user:private-password@router.example",
        "https://router.example/?access_token=private-query",
        "https://router.example/#private-fragment",
        "https://router.example/private-path",
    ] {
        let rejected = server_command(&home, &bin, &log, "absent", &["use", unsafe_origin]);
        assert!(!rejected.status.success());
        let output = format!(
            "{}{}",
            String::from_utf8_lossy(&rejected.stdout),
            String::from_utf8_lossy(&rejected.stderr)
        );
        for secret in [
            "private-user",
            "private-password",
            "private-query",
            "private-fragment",
            "private-path",
        ] {
            assert!(
                !output.contains(secret),
                "rejection leaked {secret}: {output}"
            );
        }
    }

    let cleared = server_command(&home, &bin, &log, "absent", &["use", "--clear"]);
    assert!(cleared.status.success());
}
