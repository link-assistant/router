//! Tests that pin [`crate::auth`] behaviour the `Mutants` workflow found
//! unchecked: a mutation of each branch below survived the rest of the suite.

use std::sync::atomic::AtomicUsize;

use super::*;
use axum::Json;
use axum::routing::post;
use tokio::io::AsyncWriteExt as _;

const USER_CODE_PATH: &str = "/api/accounts/deviceauth/usercode";
const TOKEN_PATH: &str = "/api/accounts/deviceauth/token";
const UNREACHABLE_ISSUER: &str = "http://127.0.0.1:1";

fn config(issuer: &str, home: &Path, timeout: Duration) -> CodexAuthConfig {
    CodexAuthConfig {
        issuer: issuer.to_string(),
        client_id: CODEX_CLIENT_ID.to_string(),
        port: 0,
        codex_home: home.to_path_buf(),
        timeout,
        bind_host: "127.0.0.1".to_string(),
    }
}

async fn serve(app: Router) -> (String, tokio::task::JoinHandle<()>) {
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let issuer = format!("http://{}", listener.local_addr().unwrap());
    let server = tokio::spawn(async move {
        axum::serve(listener, app).await.unwrap();
    });
    (issuer, server)
}

/// Start a device login against `app` and return the error it must report.
async fn begin_error(app: Router) -> String {
    let (issuer, server) = serve(app).await;
    let home = tempfile::tempdir().unwrap();
    let settings = config(&issuer, home.path(), Duration::from_secs(3));
    let Err(error) = CodexDeviceLogin::begin(settings).await else {
        panic!("the device-code request must fail");
    };
    server.abort();
    error
}

async fn unavailable() -> StatusCode {
    StatusCode::INTERNAL_SERVER_ERROR
}

async fn code_without_id() -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "device_auth_id": "",
        "user_code": "ABCD-EFGH",
        "interval": 5,
    }))
}

async fn code_with_blank_user_code() -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "device_auth_id": "device-1",
        "user_code": "  ",
        "interval": 5,
    }))
}

async fn code_polled_immediately() -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "device_auth_id": "device-1",
        "usercode": "ABCD-EFGH",
        "interval": 0,
    }))
}

async fn always_slow_down(State(polls): State<Arc<AtomicUsize>>) -> StatusCode {
    polls.fetch_add(1, Ordering::SeqCst);
    StatusCode::TOO_MANY_REQUESTS
}

async fn server_finishes(server: &tokio::task::AbortHandle) -> bool {
    let deadline = tokio::time::Instant::now() + Duration::from_secs(1);
    while !server.is_finished() {
        if tokio::time::Instant::now() >= deadline {
            return false;
        }
        tokio::time::sleep(Duration::from_millis(10)).await;
    }
    true
}

/// Send a provider error to a fresh loopback login and return its outcome.
async fn callback_failure(provider_error: &str) -> String {
    let home = tempfile::tempdir().unwrap();
    let settings = config(UNREACHABLE_ISSUER, home.path(), Duration::from_secs(3));
    let login = CodexLogin::bind(settings).await.unwrap();
    let port = login.port();
    let state = login
        .authorization_url()
        .split("state=")
        .nth(1)
        .unwrap()
        .split('&')
        .next()
        .unwrap()
        .to_string();
    let completion = tokio::spawn(login.complete());
    let response = reqwest::get(format!(
        "http://127.0.0.1:{port}{CODEX_CALLBACK_PATH}?error={provider_error}&state={state}"
    ))
    .await
    .unwrap();
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    completion.await.unwrap().unwrap_err()
}

#[test]
fn polling_intervals_are_read_as_numbers_or_trimmed_strings() {
    assert_eq!(PollInterval::Number(7).seconds(), Ok(7));
    assert_eq!(PollInterval::String(" 7 ".to_string()).seconds(), Ok(7));
    let soon = PollInterval::String("soon".to_string());
    let error = soon.seconds().unwrap_err();
    assert!(
        error.starts_with("invalid Codex device polling interval: "),
        "{error}"
    );
}

#[test]
fn device_poll_errors_map_to_slow_down_pending_or_failure() {
    let slow_down = [
        (StatusCode::TOO_MANY_REQUESTS, ""),
        (StatusCode::BAD_REQUEST, r#"{"error":"SLOW_DOWN"}"#),
    ];
    for (status, body) in slow_down {
        let Ok(DevicePoll::SlowDown) = classify_device_error(status, body) else {
            panic!("{status} {body} must slow polling down");
        };
    }
    let pending = [
        (StatusCode::FORBIDDEN, ""),
        (StatusCode::NOT_FOUND, ""),
        (
            StatusCode::BAD_REQUEST,
            r#"{"error":"authorization_pending"}"#,
        ),
    ];
    for (status, body) in pending {
        let Ok(DevicePoll::Pending) = classify_device_error(status, body) else {
            panic!("{status} {body} must keep polling");
        };
    }
    let failures = [
        (
            StatusCode::BAD_REQUEST,
            r#"{"error":"expired_token"}"#,
            "Codex device authorization failed: expired_token",
        ),
        (
            StatusCode::FORBIDDEN,
            r#"{"error":"access_denied"}"#,
            "Codex device authorization failed: access_denied",
        ),
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            "",
            "Codex device authorization endpoint returned 500 Internal Server Error",
        ),
        (
            StatusCode::BAD_REQUEST,
            r#"{"error":"invalid_request"}"#,
            "Codex device authorization endpoint returned 400 Bad Request",
        ),
    ];
    for (status, body, expected) in failures {
        let Err(error) = classify_device_error(status, body) else {
            panic!("{status} {body} must stop polling");
        };
        assert_eq!(error, expected);
    }
}

/// OAuth state and PKCE verifiers come from fresh 128-bit random values.
#[test]
fn urlsafe_random_values_are_fresh_uuid_hex() {
    let first = random_urlsafe();
    let second = random_urlsafe();
    assert_eq!(first.len(), 32, "{first}");
    let hex = first.bytes().all(|byte| byte.is_ascii_hexdigit());
    assert!(hex, "{first}");
    assert_ne!(first, second);
}

#[tokio::test]
async fn a_missing_device_endpoint_suggests_the_loopback_flow() {
    let error = begin_error(Router::new()).await;
    assert_eq!(
        error,
        "Codex device-code endpoint returned 404 Not Found: \
         device authorization is not enabled; use --flow loopback"
    );
}

#[tokio::test]
async fn a_failing_device_endpoint_does_not_suggest_the_loopback_flow() {
    let app = Router::new().route(USER_CODE_PATH, post(unavailable));
    let error = begin_error(app).await;
    assert_eq!(
        error,
        "Codex device-code endpoint returned 500 Internal Server Error: \
         device authorization could not be started"
    );
}

#[tokio::test]
async fn a_device_code_needs_both_an_id_and_a_user_code() {
    for app in [
        Router::new().route(USER_CODE_PATH, post(code_without_id)),
        Router::new().route(USER_CODE_PATH, post(code_with_blank_user_code)),
    ] {
        assert_eq!(
            begin_error(app).await,
            "invalid Codex device-code response: missing id or user code"
        );
    }
}

/// `slow_down` adds five seconds to the interval, so a one-second login
/// expires after exactly one poll instead of polling again at once.
#[tokio::test]
async fn slow_down_lengthens_the_polling_interval() {
    let polls = Arc::new(AtomicUsize::new(0));
    let app = Router::new()
        .route(USER_CODE_PATH, post(code_polled_immediately))
        .route(TOKEN_PATH, post(always_slow_down))
        .with_state(Arc::clone(&polls));
    let (issuer, server) = serve(app).await;
    let home = tempfile::tempdir().unwrap();
    let settings = config(&issuer, home.path(), Duration::from_secs(1));
    let login = CodexDeviceLogin::begin(settings).await.unwrap();

    let error = login.complete().await.unwrap_err();
    assert!(error.ends_with("expired after 1 seconds"), "{error}");
    assert_eq!(polls.load(Ordering::SeqCst), 1);
    server.abort();
}

#[tokio::test]
async fn provider_callback_errors_keep_their_documented_reasons() {
    for (provider_error, reason) in [
        ("server_error", "server_error"),
        ("temporarily_unavailable", "temporarily_unavailable"),
        ("invalid_scope", "provider_error"),
    ] {
        assert_eq!(
            callback_failure(provider_error).await,
            format!("Codex authorization failed: {reason}")
        );
    }
}

/// Graceful shutdown alone waits for a client that never finishes its request
/// head; dropping the login must stop the callback server regardless.
#[tokio::test]
async fn dropping_a_login_stops_its_server_despite_an_unfinished_request() {
    let home = tempfile::tempdir().unwrap();
    let settings = config(UNREACHABLE_ISSUER, home.path(), Duration::from_secs(3));
    let login = CodexLogin::bind(settings).await.unwrap();
    let callback_server = login.server.abort_handle();
    let mut client = tokio::net::TcpStream::connect(("127.0.0.1", login.port()))
        .await
        .unwrap();
    client
        .write_all(b"GET /auth/callback?state=x HTTP/1.1\r\nhost: localhost\r\n")
        .await
        .unwrap();
    // Let the server accept the connection and buffer the partial head.
    tokio::time::sleep(Duration::from_millis(100)).await;

    drop(login);
    assert!(server_finishes(&callback_server).await);
    drop(client);
}
