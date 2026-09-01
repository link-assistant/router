//! End-to-end tests of the interactive login flow (issue #47).
//!
//! These drive [`LoginManager`] against `examples/fake-login-cli.sh`, a stand-in
//! for both the default TUI `/login` flow and the explicit `setup-token`
//! alternative. The default path includes the first-run theme and trust
//! screens, waits for `/login`, repaints its authorization URL, waits on stdin
//! for a code, and writes the same credential shape as the real TUI.
//!
//! The point of the test is the part that is easy to get wrong: the process
//! spawned by the first request must still be alive when a *separate* later
//! request types the code into it.
//!
//! Unix only: the fixture is a shell script, which Windows cannot execute
//! (`CreateProcessW … is not a valid Win32 application`). The flow itself
//! targets a Linux container, so the coverage is where it matters. The
//! platform-independent parts — ANSI stripping, URL recovery, credential
//! writing — are unit-tested in `src/login_pty.rs`, `src/login_url.rs` and
//! `src/login.rs`, which do run everywhere.
#![cfg(unix)]

use axum::Router;
use axum::extract::State;
use axum::routing::post;
use base64::Engine as _;
use link_assistant_router::login::{LoginConfig, LoginManager, LoginStatus};
use link_assistant_router::oauth::OAuthProvider;
use link_assistant_router::subscription::SubscriptionProvider;
use sha2::{Digest as _, Sha256};
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::time::Duration;
use tokio::io::{AsyncReadExt as _, AsyncWriteExt as _};

/// How long the fixture waits for the stand-in CLI's PTY handshake.
///
/// Not a property under test: every one of these is the budget for exchanging
/// screens with `examples/fake-login-cli.sh`, which does blocking reads while
/// the router writes replies and reads repaints. Twenty seconds was ample when
/// the file ran alone and marginal when the whole suite competes for CPU, which
/// showed up as two different tests here failing intermittently on full runs
/// and passing 5/5 in isolation. Raised rather than tuned, because a slow
/// machine is not a bug and this bound exists only to stop a hung child from
/// hanging the suite.
const HANDSHAKE_TIMEOUT: Duration = Duration::from_secs(120);

/// Keep the portable PTY fixture from competing with itself under the full
/// suite. Concurrent login sessions are covered by `pending_sessions_are_capped`;
/// parallel shell/PTY processes are not part of the behavior under test here.
static PTY_TEST_LOCK: tokio::sync::Mutex<()> = tokio::sync::Mutex::const_new(());

fn fake_cli() -> String {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("examples/fake-login-cli.sh")
        .to_string_lossy()
        .into_owned()
}

fn temp_home() -> PathBuf {
    let dir = std::env::temp_dir().join(format!("router-login-test-{}", uuid::Uuid::new_v4()));
    std::fs::create_dir_all(&dir).expect("temp home");
    dir
}

fn manager_with(home: &Path) -> LoginManager {
    LoginManager::new(LoginConfig {
        command: fake_cli(),
        args: vec![],
        claude_code_home: home.to_path_buf(),
        url_timeout: HANDSHAKE_TIMEOUT,
        code_timeout: HANDSHAKE_TIMEOUT,
        ..LoginConfig::default()
    })
}

fn setup_token_manager_with(home: &Path) -> LoginManager {
    LoginManager::new(LoginConfig {
        command: fake_cli(),
        args: vec!["setup-token".to_string()],
        claude_code_home: home.to_path_buf(),
        url_timeout: HANDSHAKE_TIMEOUT,
        code_timeout: HANDSHAKE_TIMEOUT,
        ..LoginConfig::default()
    })
}

#[tokio::test]
async fn native_claude_login_starts_without_spawning_the_vendor_cli() {
    let home = temp_home();
    let manager = LoginManager::new(LoginConfig {
        command: "claude".into(),
        args: vec![],
        claude_code_home: home.clone(),
        ..LoginConfig::default()
    });

    let begun = manager.begin().await.expect("native login should start");

    assert_eq!(begun.status, LoginStatus::AwaitingCode);
    assert!(begun.url.unwrap().starts_with("https://claude.com/"));
    assert!(
        std::fs::read_dir(&home).unwrap().next().is_none(),
        "beginning native OAuth should not install or write a CLI"
    );
    let _ = manager.cancel(&begun.login_id);
    std::fs::remove_dir_all(home).ok();
}

#[tokio::test]
async fn login_produces_a_url_then_a_usable_credential() {
    let _pty_test = PTY_TEST_LOCK.lock().await;
    let home = temp_home();
    let manager = manager_with(&home);

    let begun = manager.begin().await.expect("login should start");
    assert_eq!(begun.status, LoginStatus::AwaitingCode);
    let url = begun.url.as_deref().expect("a URL must be reported");
    assert!(
        url.starts_with("https://claude.com/cai/oauth/authorize?"),
        "unexpected URL: {url}"
    );
    for scope in [
        "org%3Acreate_api_key",
        "user%3Aprofile",
        "user%3Ainference",
        "user%3Asessions%3Aclaude_code",
        "user%3Amcp_servers",
        "user%3Afile_upload",
    ] {
        assert!(
            url.contains(scope),
            "default login URL lacks {scope}: {url}"
        );
    }

    // The session survives between requests: status is served from the registry
    // while the process is still parked on its stdin read.
    let seen = manager
        .status(&begun.login_id)
        .expect("session is registered");
    assert_eq!(seen.status, LoginStatus::AwaitingCode);
    assert_eq!(seen.url.as_deref(), Some(url));
    assert_eq!(manager.pending_count(), 1);

    let done = manager
        .submit_code(&begun.login_id, "good-code")
        .await
        .expect("code should be accepted");
    assert_eq!(done.status, LoginStatus::Authorized);

    // The credential must be readable by the component that serves upstream
    // requests, not merely present on disk.
    let token = OAuthProvider::new(home.to_str().unwrap())
        .get_token()
        .expect("the saved credential must be readable");
    assert!(token.starts_with("sk-ant-oat"), "unexpected token: {token}");

    // A finished session is cleaned up: it no longer counts against the cap.
    assert_eq!(manager.pending_count(), 0);
}

/// Issue #193: the published image carries no vendor CLI, so `setup-token`
/// must run entirely in-process.
///
/// The reported failure was a spawn of the vendor binary. This test asserts the
/// flow never reaches a spawn: it starts the narrow mode with the default
/// command and checks that the session is a live in-process OAuth
/// authorization, which is true whether or not a `claude` binary happens to
/// exist on the machine running the test.
#[tokio::test]
async fn setup_token_starts_without_any_vendor_binary() {
    let home = temp_home();
    let manager = LoginManager::new(LoginConfig {
        command: "claude".into(),
        args: vec!["setup-token".to_string()],
        claude_code_home: home.clone(),
        ..LoginConfig::default()
    });
    assert!(
        !manager.uses_external_command(),
        "the default command must never spawn a process"
    );

    let begun = manager
        .begin()
        .await
        .expect("setup-token must start without a vendor binary");
    let url = begun.url.as_deref().expect("a URL must be reported");
    assert!(
        url.contains("scope=user%3Ainference"),
        "the narrow mode must request user:inference: {url}"
    );
    assert!(
        !url.contains("user%3Aprofile") && !url.contains("org%3Acreate_api_key"),
        "the narrow mode must not request the full scope set: {url}"
    );
    assert!(
        url.starts_with(link_assistant_router::claude_auth::CLAUDE_AUTHORIZE_URL),
        "the narrow mode must use the real authorize host: {url}"
    );
    // The waiting session stays alive rather than dying on a spawn failure.
    assert_eq!(manager.pending_count(), 1);
    assert_eq!(
        manager
            .status(&begun.login_id)
            .expect("session must still exist")
            .status,
        LoginStatus::AwaitingCode
    );
}

/// The default mode keeps requesting the full Claude Code scope set, also
/// without a vendor binary, so one image serves both modes.
#[tokio::test]
async fn both_modes_run_in_process_in_the_same_image() {
    let home = temp_home();
    let full = LoginManager::new(LoginConfig {
        command: "claude".into(),
        args: vec![],
        claude_code_home: home.clone(),
        ..LoginConfig::default()
    })
    .begin()
    .await
    .expect("full mode must start");
    let full_url = full.url.as_deref().expect("a URL must be reported");
    assert!(full_url.contains("user%3Ainference"), "{full_url}");
    assert!(full_url.contains("org%3Acreate_api_key"), "{full_url}");

    let narrow = LoginManager::new(LoginConfig {
        command: "claude".into(),
        args: vec!["setup-token".to_string()],
        claude_code_home: temp_home(),
        ..LoginConfig::default()
    })
    .begin()
    .await
    .expect("narrow mode must start");
    let narrow_url = narrow.url.as_deref().expect("a URL must be reported");
    assert!(!narrow_url.contains("org%3Acreate_api_key"), "{narrow_url}");
}

/// The mode can be chosen per request, so one running router serves both
/// without a restart or a rebuild.
#[tokio::test]
async fn the_mode_is_selectable_per_request() {
    let manager = LoginManager::new(LoginConfig {
        command: "claude".into(),
        args: vec![],
        claude_code_home: temp_home(),
        ..LoginConfig::default()
    });

    let narrow = manager
        .begin_with_mode(
            SubscriptionProvider::Claude,
            link_assistant_router::claude_auth::ClaudeAuthMode::SetupToken,
        )
        .await
        .expect("per-request narrow mode must start");
    let narrow_url = narrow.url.as_deref().expect("a URL must be reported");
    assert!(
        narrow_url.contains("scope=user%3Ainference"),
        "{narrow_url}"
    );
    assert!(!narrow_url.contains("org%3Acreate_api_key"), "{narrow_url}");

    // ... and the same manager still serves the full flow.
    let full = manager
        .begin_with_mode(
            SubscriptionProvider::Claude,
            link_assistant_router::claude_auth::ClaudeAuthMode::Full,
        )
        .await
        .expect("per-request full mode must start");
    let full_url = full.url.as_deref().expect("a URL must be reported");
    assert!(full_url.contains("org%3Acreate_api_key"), "{full_url}");
}

/// `doctor` states whether each mode can run before a login is attempted.
#[test]
fn doctor_reports_the_availability_of_each_login_mode() {
    let in_process = link_assistant_router::doctor::login_mode_report(&LoginConfig {
        command: "claude".into(),
        args: vec!["setup-token".to_string()],
        ..LoginConfig::default()
    });
    let report = in_process.join("\n");
    assert!(report.contains("login_mode full"), "{report}");
    assert!(report.contains("login_mode setup-token"), "{report}");
    assert!(
        report.matches("available (in-process OAuth)").count() == 2,
        "both modes must be available without a binary: {report}"
    );
    assert!(
        report.contains("user:inference"),
        "the reported scopes must be visible: {report}"
    );

    // An operator-supplied backend that is missing is reported as unavailable
    // rather than failing later with an HTTP 502.
    let external = link_assistant_router::doctor::login_mode_report(&LoginConfig {
        command: "definitely-not-on-path-12345".into(),
        args: vec![],
        ..LoginConfig::default()
    })
    .join("\n");
    assert!(external.contains("UNAVAILABLE"), "{external}");
}

#[tokio::test]
async fn setup_token_remains_an_explicit_alternative() {
    let _pty_test = PTY_TEST_LOCK.lock().await;
    let home = temp_home();
    let manager = setup_token_manager_with(&home);

    let begun = manager.begin().await.expect("setup-token should start");
    let url = begun.url.as_deref().expect("a URL must be reported");
    assert!(
        url.contains("scope=user%3Ainference"),
        "unexpected URL: {url}"
    );
    assert!(!url.contains("user%3Aprofile"), "unexpected URL: {url}");

    let done = manager
        .submit_code(&begun.login_id, "good-code")
        .await
        .expect("code should be accepted");
    assert_eq!(done.status, LoginStatus::Authorized);
    assert!(
        OAuthProvider::new(home.to_str().unwrap())
            .get_token()
            .expect("the synthesized credential must be readable")
            .starts_with("sk-ant-oat")
    );
}

#[tokio::test]
async fn a_rejected_code_fails_the_session_without_writing_a_credential() {
    let _pty_test = PTY_TEST_LOCK.lock().await;
    let home = temp_home();
    let timeout = Duration::from_secs(3);
    let manager = LoginManager::new(LoginConfig {
        command: fake_cli(),
        args: vec![],
        claude_code_home: home.clone(),
        // Comfortably under `code_timeout`, which is what the elapsed-time
        // assertion below is about, but not so tight that a loaded machine
        // settles the PTY before the CLI has printed its rejection. At 50 ms
        // this test failed roughly one run in six under parallel load, which
        // reads as a real regression in rejection handling rather than as the
        // scheduling artefact it is.
        idle_settle: Duration::from_millis(250),
        url_timeout: HANDSHAKE_TIMEOUT,
        code_timeout: timeout,
        ..LoginConfig::default()
    });

    let begun = manager.begin().await.expect("login should start");
    let started = std::time::Instant::now();
    let done = manager
        .submit_code(&begun.login_id, "wrong-code")
        .await
        .expect("submitting is not itself an error");
    assert_eq!(done.status, LoginStatus::Failed);
    assert!(
        started.elapsed() < timeout,
        "a recognized rejection must not consume code_timeout"
    );
    let error = done
        .error
        .as_deref()
        .expect("a failure must explain itself");
    assert!(
        error.contains("authorization code was rejected"),
        "the caller must be told to obtain a fresh code: {error}"
    );
    assert!(
        error.contains("OAuth error") && error.contains("Invalid code"),
        "the CLI's verdict must be surfaced in readable form: {error}"
    );

    assert!(
        OAuthProvider::new(home.to_str().unwrap())
            .get_token()
            .is_err(),
        "a failed login must not leave a credential behind"
    );
    assert_eq!(manager.pending_count(), 0);
}

#[tokio::test]
async fn a_code_cannot_be_submitted_twice() {
    let _pty_test = PTY_TEST_LOCK.lock().await;
    let home = temp_home();
    let manager = manager_with(&home);

    let begun = manager.begin().await.expect("login should start");
    manager
        .submit_code(&begun.login_id, "good-code")
        .await
        .expect("first submission succeeds");

    let again = manager.submit_code(&begun.login_id, "good-code").await;
    assert!(
        again.is_err(),
        "a completed session must not accept another code"
    );
}

#[tokio::test]
async fn cancelling_releases_the_session_and_its_process() {
    let _pty_test = PTY_TEST_LOCK.lock().await;
    let home = temp_home();
    let manager = manager_with(&home);

    let begun = manager.begin().await.expect("login should start");
    assert_eq!(manager.pending_count(), 1);
    assert!(manager.cancel(&begun.login_id), "cancel should find it");
    assert_eq!(manager.pending_count(), 0);
    assert!(
        manager.status(&begun.login_id).is_none(),
        "a cancelled session is gone"
    );
    assert!(
        !manager.cancel(&begun.login_id),
        "cancelling twice is a no-op"
    );
}

#[tokio::test]
async fn an_expired_session_reports_expired_and_stops_accepting_codes() {
    let _pty_test = PTY_TEST_LOCK.lock().await;
    let home = temp_home();
    let manager = LoginManager::new(LoginConfig {
        command: fake_cli(),
        args: vec![],
        claude_code_home: home.clone(),
        session_ttl: Duration::from_millis(1),
        url_timeout: HANDSHAKE_TIMEOUT,
        ..LoginConfig::default()
    });

    let begun = manager.begin().await.expect("login should start");
    tokio::time::sleep(Duration::from_millis(50)).await;
    manager.sweep();

    let view = manager
        .status(&begun.login_id)
        .expect("an expired session is still reportable");
    assert_eq!(view.status, LoginStatus::Expired);
    assert!(
        manager
            .submit_code(&begun.login_id, "good-code")
            .await
            .is_err()
    );
}

#[tokio::test]
async fn pending_sessions_are_capped() {
    let _pty_test = PTY_TEST_LOCK.lock().await;
    let home = temp_home();
    let manager = LoginManager::new(LoginConfig {
        command: fake_cli(),
        args: vec![],
        claude_code_home: home.clone(),
        max_sessions: 1,
        url_timeout: HANDSHAKE_TIMEOUT,
        ..LoginConfig::default()
    });

    let first = manager.begin().await.expect("first login should start");
    assert!(
        manager.begin().await.is_err(),
        "the cap must reject a second concurrent login"
    );

    // Freeing the slot makes room again.
    assert!(manager.cancel(&first.login_id));
    manager.begin().await.expect("a slot is free again");
}

#[tokio::test]
async fn a_disabled_manager_serves_nothing() {
    let manager = LoginManager::new(LoginConfig {
        enabled: false,
        ..LoginConfig::default()
    });
    assert!(!manager.is_enabled());
    assert!(manager.begin().await.is_err());
}

#[tokio::test]
async fn codex_login_defaults_to_device_auth_without_a_callback_listener() {
    let issuer_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let issuer = format!("http://{}", issuer_listener.local_addr().unwrap());
    let server = tokio::spawn(async move {
        let mut first = true;
        loop {
            let Ok((mut socket, _)) = issuer_listener.accept().await else {
                break;
            };
            let mut bytes = vec![0_u8; 2048];
            let read = socket.read(&mut bytes).await.unwrap();
            let request = String::from_utf8_lossy(&bytes[..read]);
            let (status, body) = if first {
                first = false;
                assert!(request.starts_with("POST /api/accounts/deviceauth/usercode "));
                (
                    "200 OK",
                    r#"{"device_auth_id":"device-1","user_code":"ABCD-EFGH","interval":"5"}"#,
                )
            } else {
                assert!(request.starts_with("POST /api/accounts/deviceauth/token "));
                ("403 Forbidden", r#"{"error":"authorization_pending"}"#)
            };
            socket
                .write_all(
                    format!(
                        "HTTP/1.1 {status}\r\ncontent-type: application/json\r\ncontent-length: {}\r\nconnection: close\r\n\r\n{body}",
                        body.len()
                    )
                    .as_bytes(),
                )
                .await
                .unwrap();
        }
    });
    let occupied = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let occupied_port = occupied.local_addr().unwrap().port();
    let home = temp_home();
    let manager = LoginManager::new(LoginConfig {
        codex_home: home,
        codex_issuer: issuer,
        codex_callback_port: occupied_port,
        ..LoginConfig::default()
    });
    let begun = manager
        .begin_for(SubscriptionProvider::Codex)
        .await
        .expect("Codex device login should start");
    assert_eq!(begun.provider, SubscriptionProvider::Codex);
    assert_eq!(begun.status, LoginStatus::AwaitingDevice);
    assert_eq!(begun.user_code.as_deref(), Some("ABCD-EFGH"));
    assert!(begun.url.as_deref().unwrap().ends_with("/codex/device"));
    let response = serde_json::to_value(&begun).unwrap();
    assert_eq!(response["status"], "awaiting_device");
    assert_eq!(response["user_code"], "ABCD-EFGH");
    assert_eq!(occupied.local_addr().unwrap().port(), occupied_port);
    assert!(
        manager
            .submit_code(&begun.login_id, "there-is-no-codex-paste-code")
            .await
            .is_err()
    );
    assert!(manager.cancel(&begun.login_id));
    server.abort();
}

#[derive(Default)]
struct AdminCodexStub {
    polls: AtomicUsize,
    exchanges: AtomicUsize,
}

async fn admin_device_code() -> axum::Json<serde_json::Value> {
    axum::Json(serde_json::json!({
        "device_auth_id": "device-1",
        "user_code": "ABCD-EFGH",
        "interval": "0"
    }))
}

async fn admin_poll_device(State(state): State<Arc<AdminCodexStub>>) -> axum::response::Response {
    use axum::response::IntoResponse as _;
    if state.polls.fetch_add(1, Ordering::SeqCst) == 0 {
        return (
            axum::http::StatusCode::FORBIDDEN,
            axum::Json(serde_json::json!({"error": "authorization_pending"})),
        )
            .into_response();
    }
    let verifier = "device-verifier";
    let challenge = base64::engine::general_purpose::URL_SAFE_NO_PAD
        .encode(Sha256::digest(verifier.as_bytes()));
    axum::Json(serde_json::json!({
        "authorization_code": "device-code",
        "code_challenge": challenge,
        "code_verifier": verifier
    }))
    .into_response()
}

async fn admin_exchange(State(state): State<Arc<AdminCodexStub>>) -> axum::Json<serde_json::Value> {
    state.exchanges.fetch_add(1, Ordering::SeqCst);
    axum::Json(serde_json::json!({
        "id_token": "header.payload.sig",
        "access_token": "admin-access",
        "refresh_token": "admin-refresh"
    }))
}

/// The admin `LoginManager` passes the resolved data directory into native Codex
/// and contends on the exact primary refresh lock during installation.
#[tokio::test]
async fn admin_native_codex_writer_contends_on_the_refresh_lock() {
    let state = Arc::new(AdminCodexStub::default());
    let app = Router::new()
        .route("/api/accounts/deviceauth/usercode", post(admin_device_code))
        .route("/api/accounts/deviceauth/token", post(admin_poll_device))
        .route("/oauth/token", post(admin_exchange))
        .with_state(Arc::clone(&state));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let issuer = format!("http://{}", listener.local_addr().unwrap());
    let server = tokio::spawn(async move { axum::serve(listener, app).await.unwrap() });
    let root = tempfile::tempdir().unwrap();
    let codex_home = root.path().join("codex");
    let data_dir = root.path().join("data");
    let lock_path = link_assistant_router::credential_recovery_store::credential_lock_path(
        &data_dir,
        SubscriptionProvider::Codex,
        link_assistant_router::credential_recovery_store::PRIMARY_ACCOUNT,
    );
    let holder = link_assistant_router::durable_file::lock_exclusive_async(
        &lock_path,
        Duration::from_secs(1),
    )
    .await
    .unwrap();
    let manager = LoginManager::new_with_data_dir(
        LoginConfig {
            codex_home: codex_home.clone(),
            codex_issuer: issuer,
            session_ttl: Duration::from_secs(3),
            ..LoginConfig::default()
        },
        data_dir.clone(),
    );

    let begun = manager
        .begin_for(SubscriptionProvider::Codex)
        .await
        .expect("begin admin Codex login");
    for _ in 0..100 {
        if state.exchanges.load(Ordering::SeqCst) > 0 {
            break;
        }
        tokio::time::sleep(Duration::from_millis(10)).await;
    }
    assert_eq!(state.exchanges.load(Ordering::SeqCst), 1);
    assert_eq!(
        manager.status(&begun.login_id).unwrap().status,
        LoginStatus::AwaitingDevice
    );
    assert!(!codex_home.join("auth.json").exists());
    drop(holder);

    for _ in 0..100 {
        if manager.status(&begun.login_id).unwrap().status == LoginStatus::Authorized {
            break;
        }
        tokio::time::sleep(Duration::from_millis(10)).await;
    }
    assert_eq!(
        manager.status(&begun.login_id).unwrap().status,
        LoginStatus::Authorized
    );
    assert!(codex_home.join("auth.json").is_file());
    server.abort();
}
