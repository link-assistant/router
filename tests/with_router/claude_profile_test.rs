//! Claude profile lifecycle coverage for the compiled wrapper.

use std::process::Stdio;

use super::*;

fn mock_claude_router_impl(
    catalog: &str,
    administrator: bool,
) -> (String, thread::JoinHandle<Vec<String>>) {
    let listener = TcpListener::bind("127.0.0.1:0").expect("bind mock Claude router");
    let port = listener.local_addr().expect("mock address").port();
    let catalog = catalog.to_string();
    let handle = thread::spawn(move || {
        let mut paths = Vec::new();
        for _ in 0..if administrator { 5 } else { 3 } {
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
                "/api/management/tokens" if administrator => ("200 OK", r#"{"data":[]}"#),
                "/api/management/tokens" => (
                    "401 Unauthorized",
                    r#"{"error":{"message":"ordinary token"}}"#,
                ),
                "/api/management/tokens/client" => (
                    "200 OK",
                    r#"{"token":"la_sk_e30.eyJjbGllbnRfa2luZCI6ImNsYXVkZSIsInByaW5jaXBhbF9pZCI6InJ1bi1wcmluY2lwYWwiLCJzdWIiOiJydW4taWQifQ.signature"}"#,
                ),
                "/api/models" => ("200 OK", catalog.as_str()),
                "/api/management/tokens/revoke" => ("200 OK", r#"{"revoked":"run-id"}"#),
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

pub fn mock_claude_router_with_catalog(catalog: &str) -> (String, thread::JoinHandle<Vec<String>>) {
    mock_claude_router_impl(catalog, false)
}

fn mock_admin_claude_router_with_catalog(
    catalog: &str,
) -> (String, thread::JoinHandle<Vec<String>>) {
    mock_claude_router_impl(catalog, true)
}

fn mock_claude_router() -> (String, thread::JoinHandle<Vec<String>>) {
    mock_claude_router_with_catalog(
        r#"{"object":"list","data":[{"id":"claude-opus-5","owned_by":"anthropic"},{"id":"future-glm-alpha","owned_by":"z.ai","client_capabilities":{"claude":{"behaves_as":"claude-sonnet-5","source":"provider-protocol:z.ai-anthropic"}}},{"id":"future-glm-beta","owned_by":"z.ai","client_capabilities":{"claude":{"behaves_as":"claude-sonnet-5","source":"provider-protocol:z.ai-anthropic"}}}]}"#,
    )
}

#[allow(clippy::literal_string_with_formatting_args)] // POSIX shell parameter expansion.
pub fn fake_claude(bin_dir: &std::path::Path) {
    fs::create_dir_all(bin_dir).expect("create fake client directory");
    let path = bin_dir.join("claude");
    fs::write(
        &path,
        r#"#!/bin/sh
if [ "${1:-}" = "--version" ]; then
  printf '%s\n' "${FAKE_CLAUDE_VERSION:-2.1.265} (Claude Code)"
  if [ "${DELETE_AFTER_VERSION:-}" = 1 ]; then
    /bin/rm "$0"
  fi
  exit 0
fi
printf '%s\n' "${CLAUDE_CONFIG_DIR:-}" > "$CAPTURE_CLAUDE_CONFIG_DIR"
printf '%s\n' "$@" > "$CAPTURE_ARGS"
{
  printf '%s\n' "ANTHROPIC_MODEL=${ANTHROPIC_MODEL-<unset>}"
  printf '%s\n' "CLAUDE_CODE_SUBAGENT_MODEL=${CLAUDE_CODE_SUBAGENT_MODEL-<unset>}"
} > "$CAPTURE_MODEL_ENV"
{
  printf '%s\n' "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=${CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC-<unset>}"
  printf '%s\n' "DISABLE_TELEMETRY=${DISABLE_TELEMETRY-<unset>}"
  printf '%s\n' "DO_NOT_TRACK=${DO_NOT_TRACK-<unset>}"
  printf '%s\n' "DISABLE_ERROR_REPORTING=${DISABLE_ERROR_REPORTING-<unset>}"
  printf '%s\n' "DISABLE_AUTOUPDATER=${DISABLE_AUTOUPDATER-<unset>}"
  printf '%s\n' "DISABLE_FEEDBACK_COMMAND=${DISABLE_FEEDBACK_COMMAND-<unset>}"
} > "$CAPTURE_PRIVACY_ENV"
printf '%s\n' 'FAKE_CLAUDE_LAUNCHED' >&2
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

pub fn run_claude_with(
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
        .env("CAPTURE_MODEL_ENV", capture.join("model-env"))
        .env("CAPTURE_PRIVACY_ENV", capture.join("privacy-env"))
        .env_remove("DATA_DIR")
        .env_remove("VERBOSE")
        .env_remove("RUST_LOG")
        .env_remove("CLAUDE_CONFIG_DIR")
        .env_remove("ANTHROPIC_API_KEY")
        .env_remove("ANTHROPIC_MODEL")
        .env_remove("CLAUDE_CODE_SUBAGENT_MODEL");
    for name in [
        "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC",
        "DISABLE_TELEMETRY",
        "DO_NOT_TRACK",
        "DISABLE_ERROR_REPORTING",
        "DISABLE_AUTOUPDATER",
        "DISABLE_FEEDBACK_COMMAND",
    ] {
        command.env_remove(name);
    }
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
    assert_eq!(
        fs::read_to_string(capture.join("privacy-env")).expect("captured privacy overlay"),
        "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=<unset>\n\
DISABLE_TELEMETRY=<unset>\n\
DO_NOT_TRACK=<unset>\n\
DISABLE_ERROR_REPORTING=1\n\
DISABLE_AUTOUPDATER=1\n\
DISABLE_FEEDBACK_COMMAND=1\n",
        "Router must apply only the Monitor-compatible privacy defaults in the child process"
    );

    let arguments = fs::read_to_string(capture.join("args")).expect("captured Claude arguments");
    let arguments = arguments.lines().collect::<Vec<_>>();
    let settings = arguments
        .windows(2)
        .find_map(|pair| (pair[0] == "--settings").then_some(pair[1]))
        .expect("process-local model picker");
    assert_eq!(
        serde_json::from_str::<serde_json::Value>(settings).expect("settings JSON"),
        serde_json::json!({
            // A bare launch keeps a completed thinking trace visible without
            // `--extend-global-config`, `Ctrl+O`, or a manual flag, while the
            // Router-owned profile stays minimal and the normal profile — the
            // assertion below — stays byte-identical (issue #560).
            "verbose": true,
            "modelPicker": {
                // Every authorized exact model, Anthropic's included (#621).
                "options": [
                    {"label": "claude-opus-5", "model": "claude-opus-5"},
                    {"label": "future-glm-alpha", "model": "future-glm-alpha", "behavesAs": "claude-sonnet-5"},
                    {"label": "future-glm-beta", "model": "future-glm-beta", "behavesAs": "claude-sonnet-5"}
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

/// Issue #620: Router v1.14.2 serves live z.ai rows as
/// `selector_kind: provider_advertised_exact_id` with no Claude capability
/// metadata. The wrapper dropped every such row while parsing and then refused
/// to launch with "router catalog contains no models authorized for this client
/// token". This fixture is the exact released row shape; the launch must reach
/// Claude with both models in its `/model` picker (issue #621).
#[test]
fn released_zai_exact_rows_launch_claude_with_every_model_listed() {
    let directory = tempfile::tempdir().expect("temporary test directory");
    let home = directory.path().join("home");
    let bin = directory.path().join("bin");
    let capture = directory.path().join("capture");
    fs::create_dir_all(&capture).expect("create capture directory");
    fake_claude(&bin);
    let token = bound_client_token("claude");
    let (server, requests) = mock_claude_router_with_catalog(
        r#"{"object":"list","data":[{"id":"glm-5.3","object":"model","owned_by":"z.ai","router_protocols":["anthropic"],"selector_kind":"provider_advertised_exact_id","capability_provenance":{"fields":{}}},{"id":"glm-5.3-flash","object":"model","owned_by":"z.ai","router_protocols":["anthropic"],"selector_kind":"provider_advertised_exact_id","capability_provenance":{"fields":{}}}]}"#,
    );

    let output = run_claude_with(
        &home,
        &bin,
        &capture,
        &[
            "--server", &server, "--token", &token, "claude", "--", "-p", "hi",
        ],
        &[],
    );

    assert!(
        output.status.success(),
        "{}{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );
    assert_eq!(
        requests.join().expect("mock Router requests"),
        ["/api/health", "/api/management/tokens", "/api/models"]
    );
    let arguments = fs::read_to_string(capture.join("args")).expect("captured Claude arguments");
    let arguments = arguments.lines().collect::<Vec<_>>();
    let settings = arguments
        .windows(2)
        .find_map(|pair| (pair[0] == "--settings").then_some(pair[1]))
        .expect("process-local model picker");
    assert_eq!(
        serde_json::from_str::<serde_json::Value>(settings).expect("settings JSON")["modelPicker"],
        serde_json::json!({
            "options": [
                {"label": "glm-5.3", "model": "glm-5.3"},
                {"label": "glm-5.3-flash", "model": "glm-5.3-flash"}
            ],
            "replaceBuiltInOptions": true
        })
    );
}

/// Issue #583: Claude Code's context-window suffix is presentation syntax,
/// while Router's live catalog advertises the exact Anthropic base model. The
/// launcher must authorize that base without removing the suffix from argv.
#[test]
fn authorized_claude_context_variant_reaches_the_client_unchanged() {
    let directory = tempfile::tempdir().expect("temporary test directory");
    let home = directory.path().join("home");
    let bin = directory.path().join("bin");
    let capture = directory.path().join("capture");
    fs::create_dir_all(&capture).expect("create capture directory");
    fake_claude(&bin);
    let (server, requests) = mock_admin_claude_router_with_catalog(
        r#"{"object":"list","data":[{"id":"claude-opus-5","owned_by":"anthropic"}]}"#,
    );

    let output = run_claude_with(
        &home,
        &bin,
        &capture,
        &[
            "--server",
            &server,
            "--token",
            "admin-secret",
            "--model",
            "claude-opus-5[1m]",
            "--isolated-config",
            "claude",
            "--",
            "-p",
            "Reply with 42",
        ],
        &[],
    );
    assert!(
        output.status.success(),
        "{}{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );
    assert_eq!(
        requests.join().expect("mock Router requests"),
        [
            "/api/health",
            "/api/management/tokens",
            "/api/management/tokens/client",
            "/api/models",
            "/api/management/tokens/revoke"
        ]
    );
    let arguments = fs::read_to_string(capture.join("args")).expect("captured Claude arguments");
    let arguments = arguments.lines().collect::<Vec<_>>();
    assert!(
        arguments
            .windows(2)
            .any(|pair| pair == ["--model", "claude-opus-5[1m]"]),
        "the exact context variant must reach Claude: {arguments:?}"
    );
}

#[test]
fn claude_launch_preserves_user_privacy_values_and_logs_warning_before_spawn() {
    let directory = tempfile::tempdir().expect("temporary test directory");
    let home = directory.path().join("home");
    let bin = directory.path().join("bin");
    let capture = directory.path().join("capture");
    fs::create_dir_all(&capture).expect("create capture directory");
    fake_claude(&bin);
    let token = bound_client_token("claude");
    let (server, requests) = mock_claude_router();

    let output = run_claude_with(
        &home,
        &bin,
        &capture,
        &["--server", &server, "--token", &token, "claude"],
        &[
            (
                "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC",
                "operator-choice",
            ),
            ("DISABLE_TELEMETRY", "0"),
            ("DO_NOT_TRACK", "1"),
            ("DISABLE_ERROR_REPORTING", "keep-error-choice"),
            ("DISABLE_AUTOUPDATER", "keep-update-choice"),
            ("DISABLE_FEEDBACK_COMMAND", "keep-feedback-choice"),
        ],
    );
    assert!(
        output.status.success(),
        "{}{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );
    assert_eq!(requests.join().expect("mock Router requests").len(), 3);
    assert_eq!(
        fs::read_to_string(capture.join("privacy-env")).expect("captured privacy overlay"),
        "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=operator-choice\n\
DISABLE_TELEMETRY=0\n\
DO_NOT_TRACK=1\n\
DISABLE_ERROR_REPORTING=keep-error-choice\n\
DISABLE_AUTOUPDATER=keep-update-choice\n\
DISABLE_FEEDBACK_COMMAND=keep-feedback-choice\n",
        "the child must inherit every explicit user-owned value byte-for-byte"
    );
    assert_eq!(output.stderr, b"FAKE_CLAUDE_LAUNCHED\n");
    let diagnostics = super::launcher_logging_test::diagnostic_messages(&home);
    assert!(
        diagnostics.contains(
            "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC and DISABLE_TELEMETRY and DO_NOT_TRACK"
        ),
        "{diagnostics}"
    );
    assert!(
        diagnostics.contains("feature-flag-gated tools such as `Monitor` may be unavailable"),
        "{diagnostics}"
    );
    let log =
        fs::read_to_string(home.join(".link-assistant-router/launcher/launcher.log")).unwrap();
    assert!(log.find("feature-flag-gated tools").unwrap() < log.find("child_starting").unwrap());
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

/// Issue #585: an invocation-level model selection outranks a different model
/// remembered by the real Claude profile extended for this launch.
#[test]
fn explicit_model_overrides_saved_model_when_extending_real_profile() {
    let directory = tempfile::tempdir().expect("temporary test directory");
    let home = directory.path().join("home");
    let bin = directory.path().join("bin");
    let capture = directory.path().join("capture");
    fs::create_dir_all(home.join(".claude")).expect("create normal Claude profile");
    fs::create_dir_all(&capture).expect("create capture directory");
    let normal = b"{\"model\":\"fable\",\"permissions\":{\"allow\":[\"Read\"]}}\n";
    fs::write(home.join(".claude/settings.json"), normal).expect("seed saved Claude model");
    fake_claude(&bin);
    let (server, requests) = mock_admin_claude_router_with_catalog(
        r#"{"object":"list","data":[{"id":"glm-5.3-flash","owned_by":"z.ai","client_capabilities":{"claude":{"behaves_as":"claude-sonnet-5","source":"provider-protocol:z.ai-anthropic"}}}]}"#,
    );

    let output = run_claude_with(
        &home,
        &bin,
        &capture,
        &[
            "--server",
            &server,
            "--token",
            "admin-secret",
            "--model",
            "glm-5.3-flash",
            "--extend-global-config",
            "claude",
            "--",
            "-p",
            "reply exactly ok",
        ],
        &[],
    );

    assert!(
        output.status.success(),
        "{}{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );
    assert_eq!(
        requests.join().expect("mock Router requests"),
        [
            "/api/health",
            "/api/management/tokens",
            "/api/management/tokens/client",
            "/api/models",
            "/api/management/tokens/revoke"
        ]
    );
    assert_eq!(
        fs::read_to_string(capture.join("model-env")).expect("captured model environment"),
        "ANTHROPIC_MODEL=glm-5.3-flash\nCLAUDE_CODE_SUBAGENT_MODEL=glm-5.3-flash\n"
    );
    assert_eq!(
        fs::read(home.join(".claude/settings.json")).expect("normal settings after launch"),
        normal,
        "the invocation must not rewrite the saved profile choice"
    );
}

/// The Claude.ai refusal is per operation, not per version: a release newer
/// than the pinned fixture passes the version check, so this boundary must
/// still hold for it (issues #520 and #609).
#[test]
fn explicit_claude_ai_operation_fails_before_router_access_or_client_launch() {
    for version in ["2.1.265", "2.1.283"] {
        assert_claude_ai_operation_fails_closed(version);
    }
}

fn assert_claude_ai_operation_fails_closed(version: &str) {
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
        &[("FAKE_CLAUDE_VERSION", version)],
    );
    assert!(!output.status.success(), "{version}: {output:?}");
    assert!(output.stderr.is_empty());
    let stderr = super::launcher_logging_test::diagnostic_messages(&home);
    assert!(stderr.contains("Claude.ai"), "{stderr}");
    assert!(stderr.contains("no Router token was minted"), "{stderr}");
    assert!(
        !capture.join("args").exists(),
        "Claude {version} must not be launched for an operation known to be unavailable"
    );
    assert_eq!(
        fs::read(home.join(".claude/.credentials.json"))
            .expect("Claude credentials after rejected launch"),
        credentials
    );
}

/// Claude Code 2.1.283 launched through `with` exited before the client ran
/// because 2.1.265, the pinned fixture, was treated as a maximum (issue #609).
#[test]
fn newer_claude_release_is_not_rejected_by_version_alone() {
    let directory = tempfile::tempdir().expect("temporary test directory");
    let home = directory.path().join("home");
    let bin = directory.path().join("bin");
    let capture = directory.path().join("capture");
    fs::create_dir_all(&capture).expect("create capture directory");
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
            "claude",
            "--resume",
            "2a42a73e-19de-459a-8c24-c5e75abf9a65",
        ],
        &[("FAKE_CLAUDE_VERSION", "2.1.283")],
    );
    let stderr = String::from_utf8_lossy(&output.stderr);
    assert!(output.status.success(), "{stderr}");
    assert!(
        !stderr.contains("is required"),
        "a newer client must not be refused by number: {stderr}"
    );
    assert!(stderr.contains("FAKE_CLAUDE_LAUNCHED"), "{stderr}");
    assert_eq!(
        requests.join().expect("mock Router requests"),
        ["/api/health", "/api/management/tokens", "/api/models"]
    );
    let arguments = fs::read_to_string(capture.join("args")).expect("captured Claude arguments");
    let arguments = arguments.lines().collect::<Vec<_>>();
    assert_eq!(
        &arguments[arguments.len() - 2..],
        ["--resume", "2a42a73e-19de-459a-8c24-c5e75abf9a65"],
        "the resumed session must reach the newer client unchanged: {arguments:?}"
    );
}

/// The minimum stays: older releases lack current gateway alias resolution.
#[test]
fn claude_below_the_gateway_alias_minimum_is_refused_before_router_access() {
    let directory = tempfile::tempdir().expect("temporary test directory");
    let home = directory.path().join("home");
    let bin = directory.path().join("bin");
    let capture = directory.path().join("capture");
    fs::create_dir_all(&capture).expect("create capture directory");
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
            "claude",
        ],
        &[("FAKE_CLAUDE_VERSION", "2.1.252")],
    );
    assert!(!output.status.success(), "{output:?}");
    assert!(output.stderr.is_empty());
    let stderr = super::launcher_logging_test::diagnostic_messages(&home);
    assert!(stderr.contains("2.1.255 or newer"), "{stderr}");
    assert!(stderr.contains("2.1.252"), "{stderr}");
    assert!(
        !capture.join("args").exists(),
        "an unsupported Claude must not be launched"
    );
}

#[test]
fn exact_post_client_reset_keeps_sessions_and_requires_confirmation() {
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
        super::launcher_logging_test::diagnostic_messages(&home)
            .contains("requires interactive confirmation")
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
        &[("REQUIRE_SESSION", "1")],
    );
    assert!(
        reset.status.success(),
        "{}{}",
        String::from_utf8_lossy(&reset.stdout),
        String::from_utf8_lossy(&reset.stderr)
    );
    assert_eq!(requests.join().expect("reset Router requests").len(), 3);
    assert_eq!(
        fs::read(profile.join("session.jsonl")).expect("retained session"),
        b"previous session"
    );
    let backups = fs::read_dir(home.join(".config/link-assistant-router/client-backups"))
        .expect("list verified backups")
        .flatten()
        .filter(|entry| entry.path().join("manifest.sha256").exists())
        .collect::<Vec<_>>();
    assert_eq!(backups.len(), 1);
    assert_eq!(
        fs::read(
            backups[0]
                .path()
                .join("data/claude/router/home/session.jsonl")
        )
        .expect("recoverable session"),
        b"previous session"
    );
}

#[test]
fn reset_keeps_session_when_a_required_local_command_is_unavailable() {
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
    assert!(output.stderr.is_empty());
    let stderr = super::launcher_logging_test::diagnostic_messages(&home);
    assert!(
        stderr.contains("cannot check active") || stderr.contains("client executable `claude`"),
        "{stderr}"
    );
    assert_eq!(requests.join().expect("mock Router requests").len(), 3);
    assert_eq!(
        fs::read(profile.join("session.jsonl")).expect("restored session"),
        b"previous session"
    );
}
