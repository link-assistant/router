//! Claude profile lifecycle coverage for the compiled wrapper.

use std::process::Stdio;

use super::*;

fn mock_claude_router() -> (String, thread::JoinHandle<Vec<String>>) {
    let listener = TcpListener::bind("127.0.0.1:0").expect("bind mock Claude router");
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
                "/api/health" => ("200 OK", r#"{"status":"ok","version":"1.2.1"}"#),
                "/api/management/tokens" => (
                    "401 Unauthorized",
                    r#"{"error":{"message":"ordinary token"}}"#,
                ),
                "/api/models" => (
                    "200 OK",
                    r#"{"object":"list","data":[{"id":"future-claude-native","owned_by":"anthropic"},{"id":"future-glm-alpha","owned_by":"z.ai","client_capabilities":{"claude":{"behaves_as":"claude-sonnet-4-5","source":"provider-protocol:z.ai-anthropic"}}},{"id":"future-glm-beta","owned_by":"z.ai","client_capabilities":{"claude":{"behaves_as":"claude-sonnet-4-5","source":"provider-protocol:z.ai-anthropic"}}}]}"#,
                ),
                _ => ("404 Not Found", r#"{"error":"unexpected path"}"#),
            };
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

#[allow(clippy::literal_string_with_formatting_args)] // POSIX shell parameter expansion.
fn fake_claude(bin_dir: &std::path::Path) {
    fs::create_dir_all(bin_dir).expect("create fake client directory");
    let path = bin_dir.join("claude");
    fs::write(
        &path,
        r#"#!/bin/sh
if [ "${1:-}" = "--version" ]; then
  printf '%s\n' '2.1.263 (Claude Code)'
  if [ "${DELETE_AFTER_VERSION:-}" = 1 ]; then
    /bin/rm "$0"
  fi
  exit 0
fi
printf '%s\n' "${CLAUDE_CONFIG_DIR:-}" > "$CAPTURE_CLAUDE_CONFIG_DIR"
printf '%s\n' "$@" > "$CAPTURE_ARGS"
if [ "${REQUIRE_SESSION:-}" = 1 ] && [ ! -f "$CLAUDE_CONFIG_DIR/session.jsonl" ]; then
  exit 41
fi
if [ "${REQUIRE_EMPTY_PROFILE:-}" = 1 ] && [ -n "$(find "$CLAUDE_CONFIG_DIR" -mindepth 1 -maxdepth 1 -print -quit)" ]; then
  exit 42
fi
if [ "${WRITE_SESSION:-}" = 1 ]; then
  printf '%s\n' 'Router session' > "$CLAUDE_CONFIG_DIR/session.jsonl"
fi
exit 0
"#,
    )
    .expect("write fake Claude");
    fs::set_permissions(&path, fs::Permissions::from_mode(0o755))
        .expect("make fake Claude executable");
}

fn run_claude_with(
    home: &std::path::Path,
    bin_dir: &std::path::Path,
    capture: &std::path::Path,
    arguments: &[&str],
    environment: &[(&str, &str)],
) -> Output {
    let only_fake_path = environment
        .iter()
        .any(|(name, value)| *name == "ONLY_FAKE_PATH" && *value == "1");
    let path = if only_fake_path {
        std::env::join_paths([bin_dir]).expect("compose isolated fake PATH")
    } else {
        let inherited_path = std::env::var_os("PATH").unwrap_or_default();
        std::env::join_paths(
            std::iter::once(bin_dir.to_path_buf()).chain(std::env::split_paths(&inherited_path)),
        )
        .expect("compose PATH")
    };
    let mut command = Command::new(env!("CARGO_BIN_EXE_with-router"));
    command
        .args(arguments)
        .stdin(Stdio::null())
        .env("HOME", home)
        .env("XDG_CONFIG_HOME", home.join(".config"))
        .env("PATH", path)
        .env(
            "CAPTURE_CLAUDE_CONFIG_DIR",
            capture.join("claude-config-dir"),
        )
        .env("CAPTURE_ARGS", capture.join("args"))
        .env_remove("CLAUDE_CONFIG_DIR")
        .env_remove("ANTHROPIC_API_KEY");
    for (name, value) in environment {
        command.env(name, value);
    }
    command.output().expect("run Claude wrapper")
}

#[test]
fn claude_default_profile_persists_without_touching_the_normal_profile() {
    let directory = tempfile::tempdir().expect("temporary test directory");
    let home = directory.path().join("home");
    let bin = directory.path().join("bin");
    let capture = directory.path().join("capture");
    fs::create_dir_all(home.join(".claude")).expect("create normal Claude profile");
    fs::create_dir_all(&capture).expect("create capture directory");
    let normal = b"{\"theme\":\"user-owned\",\"mcpServers\":{}}\n";
    fs::write(home.join(".claude/settings.json"), normal).expect("seed normal settings");
    fake_claude(&bin);
    let token = bound_client_token("claude");

    let (server, requests) = mock_claude_router();
    let first = run_claude_with(
        &home,
        &bin,
        &capture,
        &["--server", &server, "--token", &token, "claude"],
        &[("WRITE_SESSION", "1")],
    );
    assert!(
        first.status.success(),
        "{}{}",
        String::from_utf8_lossy(&first.stdout),
        String::from_utf8_lossy(&first.stderr)
    );
    assert_eq!(
        requests.join().expect("mock Router requests"),
        ["/api/health", "/api/management/tokens", "/api/models"]
    );
    let profile = home.join(".config/link-assistant-router/clients/claude/home");
    assert_eq!(
        fs::read_to_string(capture.join("claude-config-dir"))
            .expect("captured Claude profile")
            .trim(),
        profile.to_string_lossy()
    );
    assert_eq!(
        fs::read(home.join(".claude/settings.json")).expect("normal settings after launch"),
        normal
    );
    assert!(profile.join("session.jsonl").is_file());

    let arguments = fs::read_to_string(capture.join("args")).expect("captured Claude arguments");
    let arguments = arguments.lines().collect::<Vec<_>>();
    let settings = arguments
        .windows(2)
        .find_map(|pair| (pair[0] == "--settings").then_some(pair[1]))
        .expect("process-local model picker");
    assert_eq!(
        serde_json::from_str::<serde_json::Value>(settings).expect("settings JSON"),
        serde_json::json!({
            "modelPicker": {
                "options": [
                    {"label": "future-glm-alpha", "model": "future-glm-alpha", "behavesAs": "claude-sonnet-4-5"},
                    {"label": "future-glm-beta", "model": "future-glm-beta", "behavesAs": "claude-sonnet-4-5"}
                ],
                "replaceBuiltInOptions": false
            }
        })
    );

    let second_capture = directory.path().join("second-capture");
    fs::create_dir_all(&second_capture).expect("create second capture directory");
    let (server, requests) = mock_claude_router();
    let second = run_claude_with(
        &home,
        &bin,
        &second_capture,
        &["--server", &server, "--token", &token, "claude"],
        &[("REQUIRE_SESSION", "1")],
    );
    assert!(second.status.success(), "{second:?}");
    assert_eq!(requests.join().expect("second Router requests").len(), 3);
    assert_eq!(
        fs::read(home.join(".claude/settings.json")).expect("normal settings after second launch"),
        normal
    );
}

#[test]
fn claude_real_profile_extension_is_explicit() {
    let directory = tempfile::tempdir().expect("temporary test directory");
    let home = directory.path().join("home");
    let bin = directory.path().join("bin");
    let capture = directory.path().join("capture");
    fs::create_dir_all(home.join(".claude")).expect("create normal Claude profile");
    fs::create_dir_all(&capture).expect("create capture directory");
    let normal = b"{\"permissions\":{\"allow\":[\"Read\"]}}\n";
    let credentials = b"{\"claudeAiOauth\":{\"accessToken\":\"synthetic-full-scope\",\"refreshToken\":\"synthetic-refresh\",\"expiresAt\":4102444800000,\"scopes\":[\"user:inference\",\"user:mcp_servers\",\"user:profile\",\"user:sessions:claude_code\"]}}\n";
    fs::write(home.join(".claude/settings.json"), normal).expect("seed normal settings");
    fs::write(home.join(".claude/.credentials.json"), credentials)
        .expect("seed synthetic Claude credentials");
    fake_claude(&bin);
    let token = bound_client_token("claude");
    let (server, requests) = mock_claude_router();

    let output = run_claude_with(
        &home,
        &bin,
        &capture,
        &[
            "--server",
            &server,
            "--token",
            &token,
            "--extend-global-config",
            "claude",
        ],
        &[],
    );
    assert!(output.status.success(), "{output:?}");
    let stderr = String::from_utf8_lossy(&output.stderr);
    assert!(
        !stderr.contains("Claude.ai connectors")
            && !stderr.contains("Remote Control")
            && !stderr.contains("organization policy"),
        "an ordinary successful launch must not repeat the setup limitation: {stderr}"
    );
    assert_eq!(requests.join().expect("mock Router requests").len(), 3);
    assert_eq!(
        fs::read_to_string(capture.join("claude-config-dir")).expect("captured config variable"),
        "\n"
    );
    assert_eq!(
        fs::read(home.join(".claude/settings.json")).expect("normal settings after extension"),
        normal
    );
    assert_eq!(
        fs::read(home.join(".claude/.credentials.json"))
            .expect("Claude credentials after extension"),
        credentials,
        "Router must leave the stored Claude login byte-identical"
    );
}

#[test]
fn explicit_claude_ai_operation_fails_before_router_access_or_client_launch() {
    let directory = tempfile::tempdir().expect("temporary test directory");
    let home = directory.path().join("home");
    let bin = directory.path().join("bin");
    let capture = directory.path().join("capture");
    fs::create_dir_all(home.join(".claude")).expect("create normal Claude profile");
    fs::create_dir_all(&capture).expect("create capture directory");
    let credentials = b"synthetic credential bytes that Router must not read or change\n";
    fs::write(home.join(".claude/.credentials.json"), credentials)
        .expect("seed synthetic credentials");
    fake_claude(&bin);

    let output = run_claude_with(
        &home,
        &bin,
        &capture,
        &[
            "--server",
            "http://127.0.0.1:9",
            "--token",
            "synthetic-router-token",
            "--extend-global-config",
            "claude",
            "--remote-control",
        ],
        &[],
    );
    assert!(!output.status.success());
    let stderr = String::from_utf8_lossy(&output.stderr);
    assert!(stderr.contains("Claude.ai"), "{stderr}");
    assert!(stderr.contains("no Router token was minted"), "{stderr}");
    assert!(
        !capture.join("args").exists(),
        "Claude must not be launched for an operation known to be unavailable"
    );
    assert_eq!(
        fs::read(home.join(".claude/.credentials.json"))
            .expect("Claude credentials after rejected launch"),
        credentials
    );
}

#[test]
fn exact_post_client_reset_is_recoverable_and_requires_confirmation() {
    let directory = tempfile::tempdir().expect("temporary test directory");
    let home = directory.path().join("home");
    let bin = directory.path().join("bin");
    let capture = directory.path().join("capture");
    let profile = home.join(".config/link-assistant-router/clients/claude/home");
    fs::create_dir_all(&profile).expect("seed Router-owned profile");
    fs::create_dir_all(&capture).expect("create capture directory");
    fs::write(profile.join("session.jsonl"), b"previous session").expect("seed session");
    fake_claude(&bin);
    let token = bound_client_token("claude");

    let cancelled = run_claude_with(
        &home,
        &bin,
        &capture,
        &[
            "--server",
            "http://127.0.0.1:9",
            "--token",
            &token,
            "claude",
            "--reset-to-default-configuration",
        ],
        &[],
    );
    assert!(!cancelled.status.success());
    assert!(
        String::from_utf8_lossy(&cancelled.stderr).contains("requires interactive confirmation")
    );
    assert_eq!(
        fs::read(profile.join("session.jsonl")).expect("session after cancellation"),
        b"previous session"
    );

    let (server, requests) = mock_claude_router();
    let reset = run_claude_with(
        &home,
        &bin,
        &capture,
        &[
            "--server",
            &server,
            "--token",
            &token,
            "--yes",
            "claude",
            "--reset-to-default-configuration",
        ],
        &[("REQUIRE_EMPTY_PROFILE", "1"), ("WRITE_SESSION", "1")],
    );
    assert!(
        reset.status.success(),
        "{}{}",
        String::from_utf8_lossy(&reset.stdout),
        String::from_utf8_lossy(&reset.stderr)
    );
    assert_eq!(requests.join().expect("reset Router requests").len(), 3);
    assert_eq!(
        fs::read(profile.join("session.jsonl")).expect("new session"),
        b"Router session\n"
    );
    let backups = fs::read_dir(profile.parent().unwrap())
        .expect("list profile backups")
        .flatten()
        .filter(|entry| {
            entry
                .file_name()
                .to_string_lossy()
                .starts_with("home.reset-")
        })
        .collect::<Vec<_>>();
    assert_eq!(backups.len(), 1);
    assert_eq!(
        fs::read(backups[0].path().join("session.jsonl")).expect("recoverable session"),
        b"previous session"
    );
}

#[test]
fn reset_rolls_back_when_claude_cannot_spawn() {
    let directory = tempfile::tempdir().expect("temporary test directory");
    let home = directory.path().join("home");
    let bin = directory.path().join("bin");
    let capture = directory.path().join("capture");
    let profile = home.join(".config/link-assistant-router/clients/claude/home");
    fs::create_dir_all(&profile).expect("seed Router-owned profile");
    fs::create_dir_all(&capture).expect("create capture directory");
    fs::write(profile.join("session.jsonl"), b"previous session").expect("seed session");
    fake_claude(&bin);
    let token = bound_client_token("claude");
    let (server, requests) = mock_claude_router();

    let output = run_claude_with(
        &home,
        &bin,
        &capture,
        &[
            "--server",
            &server,
            "--token",
            &token,
            "--yes",
            "claude",
            "--reset-to-default-configuration",
        ],
        &[("DELETE_AFTER_VERSION", "1"), ("ONLY_FAKE_PATH", "1")],
    );
    assert!(!output.status.success());
    let stderr = String::from_utf8_lossy(&output.stderr);
    assert!(stderr.contains("client executable `claude`"), "{stderr}");
    assert_eq!(requests.join().expect("mock Router requests").len(), 3);
    assert_eq!(
        fs::read(profile.join("session.jsonl")).expect("restored session"),
        b"previous session"
    );
}
