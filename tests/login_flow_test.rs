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

use link_assistant_router::login::{LoginConfig, LoginManager, LoginStatus};
use link_assistant_router::oauth::OAuthProvider;
use link_assistant_router::subscription::SubscriptionProvider;
use std::path::{Path, PathBuf};
use std::time::Duration;
use tokio::io::{AsyncReadExt as _, AsyncWriteExt as _};

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
        url_timeout: Duration::from_secs(20),
        code_timeout: Duration::from_secs(20),
        ..LoginConfig::default()
    })
}

fn setup_token_manager_with(home: &Path) -> LoginManager {
    LoginManager::new(LoginConfig {
        command: fake_cli(),
        args: vec!["setup-token".to_string()],
        claude_code_home: home.to_path_buf(),
        url_timeout: Duration::from_secs(20),
        code_timeout: Duration::from_secs(20),
        ..LoginConfig::default()
    })
}

#[tokio::test]
async fn login_produces_a_url_then_a_usable_credential() {
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

#[tokio::test]
async fn setup_token_remains_an_explicit_alternative() {
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
    let home = temp_home();
    let timeout = Duration::from_secs(3);
    let manager = LoginManager::new(LoginConfig {
        command: fake_cli(),
        args: vec![],
        claude_code_home: home.clone(),
        idle_settle: Duration::from_millis(50),
        url_timeout: Duration::from_secs(20),
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
    let home = temp_home();
    let manager = LoginManager::new(LoginConfig {
        command: fake_cli(),
        args: vec![],
        claude_code_home: home.clone(),
        session_ttl: Duration::from_millis(1),
        url_timeout: Duration::from_secs(20),
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
    let home = temp_home();
    let manager = LoginManager::new(LoginConfig {
        command: fake_cli(),
        args: vec![],
        claude_code_home: home.clone(),
        max_sessions: 1,
        url_timeout: Duration::from_secs(20),
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
