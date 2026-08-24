//! Unit tests for remote authorization ([`crate::auth_remote`]).
//!
//! These speak to a real HTTP server on a loopback port rather than a mocked
//! client: the bug in issue #246 was about which endpoint gets contacted at
//! all, so a test that never opens a socket cannot see it.

use super::*;

use std::sync::Arc;
use std::sync::atomic::{AtomicUsize, Ordering};

use tokio::io::{AsyncReadExt as _, AsyncWriteExt as _};

/// A loopback server answering each request with a canned JSON body.
///
/// Returns its origin and a counter of the requests it served, so a test can
/// assert *that* the router was contacted, not only what it replied.
async fn serve(
    bodies: Vec<&'static str>,
) -> (
    String,
    Arc<AtomicUsize>,
    tokio::task::JoinHandle<Vec<String>>,
) {
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let origin = format!("http://{}", listener.local_addr().unwrap());
    let served = Arc::new(AtomicUsize::new(0));
    let counter = Arc::clone(&served);
    let handle = tokio::spawn(async move {
        let mut seen = Vec::new();
        for body in bodies {
            let Ok(Ok((mut socket, _))) =
                tokio::time::timeout(std::time::Duration::from_secs(20), listener.accept()).await
            else {
                break;
            };
            counter.fetch_add(1, Ordering::SeqCst);
            let mut request = [0; 4096];
            let read = socket.read(&mut request).await.unwrap_or(0);
            seen.push(String::from_utf8_lossy(&request[..read]).to_string());
            let _ = socket
                .write_all(
                    format!(
                        "HTTP/1.1 200 OK\r\ncontent-type: application/json\r\ncontent-length: {}\r\nconnection: close\r\n\r\n{body}",
                        body.len()
                    )
                    .as_bytes(),
                )
                .await;
        }
        seen
    });
    (origin, served, handle)
}

/// `auth status` must describe the router it was pointed at, not local homes.
///
/// Reporting `~/.claude` while a server was selected is half of what made #246
/// hard to notice: the command claimed to describe the subscription in use and
/// described a different one.
#[tokio::test]
async fn status_reports_the_accounts_of_the_targeted_router() {
    let (origin, requests, handle) = serve(vec![
        r#"{"accounts":[{"name":"primary","credential":"rejected","home":"/data/claude"}]}"#,
    ])
    .await;
    let target = ResolvedServer::at(origin, Some("admin".into()), "test");

    let code = status(&target).await;

    assert_eq!(code, std::process::ExitCode::SUCCESS);
    assert_eq!(
        requests.load(Ordering::SeqCst),
        1,
        "the router was not asked"
    );
    let seen = handle.await.unwrap();
    assert!(seen[0].starts_with("GET /v1/accounts"), "{}", seen[0]);
    assert!(
        seen[0].contains("authorization: Bearer admin"),
        "the selected token was not presented: {}",
        seen[0]
    );
}

/// A code-flow login must begin on the router and submit the code back to it.
#[tokio::test]
async fn authorize_begins_and_completes_the_login_on_the_router() {
    let (origin, requests, handle) = serve(vec![
        r#"{"login_id":"abc","provider":"claude","status":"awaiting_code","url":"https://example.invalid/auth","session_expires_at":"2030-01-01T00:00:00Z"}"#,
        r#"{"login_id":"abc","provider":"claude","status":"authorized","session_expires_at":"2030-01-01T00:00:00Z"}"#,
    ])
    .await;
    let target = ResolvedServer::at(origin, Some("admin".into()), "test");

    let code = authorize(&target, "claude", None, Some("copied-code".into())).await;

    assert_eq!(code, std::process::ExitCode::SUCCESS);
    assert_eq!(requests.load(Ordering::SeqCst), 2);
    let seen = handle.await.unwrap();
    assert!(seen[0].starts_with("POST /api/login"), "{}", seen[0]);
    assert!(seen[0].contains("claude"), "{}", seen[0]);
    assert!(
        seen[1].starts_with("POST /api/login/abc/code"),
        "the code went somewhere else: {}",
        seen[1]
    );
    assert!(seen[1].contains("copied-code"), "{}", seen[1]);
}

/// A login the router does not authorize must fail rather than report success.
///
/// The original bug was a login that *printed success* while leaving the target
/// unauthorized; a remote login that ends any other way must say so.
#[tokio::test]
async fn a_login_the_router_does_not_authorize_fails() {
    let (origin, _requests, _handle) = serve(vec![
        r#"{"login_id":"abc","provider":"claude","status":"awaiting_code","url":"https://example.invalid/auth","session_expires_at":"2030-01-01T00:00:00Z"}"#,
        r#"{"login_id":"abc","provider":"claude","status":"failed","session_expires_at":"2030-01-01T00:00:00Z"}"#,
    ])
    .await;
    let target = ResolvedServer::at(origin, Some("admin".into()), "test");

    let code = authorize(&target, "claude", None, Some("copied-code".into())).await;

    assert_ne!(code, std::process::ExitCode::SUCCESS);
}

/// An empty code must not be sent to the router, and must say where the
/// pending login now lives — it is on the router, not on this machine.
#[tokio::test]
async fn an_empty_code_is_refused_before_it_reaches_the_router() {
    let (origin, requests, _handle) = serve(vec![
        r#"{"login_id":"abc","provider":"claude","status":"awaiting_code","url":"https://example.invalid/auth","session_expires_at":"2030-01-01T00:00:00Z"}"#,
    ])
    .await;
    let target = ResolvedServer::at(origin, Some("admin".into()), "test");

    let code = authorize(&target, "claude", None, Some("   ".into())).await;

    assert_ne!(code, std::process::ExitCode::SUCCESS);
    assert_eq!(
        requests.load(Ordering::SeqCst),
        1,
        "an empty code was sent to the router anyway"
    );
}

/// A router that refuses the credential must say how to fix it: an admin token
/// is what the login API needs, and that is not obvious from a bare 401.
#[tokio::test]
async fn an_unauthorised_reply_names_the_remedy() {
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let origin = format!("http://{}", listener.local_addr().unwrap());
    tokio::spawn(async move {
        if let Ok(Ok((mut socket, _))) =
            tokio::time::timeout(std::time::Duration::from_secs(2), listener.accept()).await
        {
            let mut request = [0; 2048];
            let _ = socket.read(&mut request).await;
            let _ = socket
                .write_all(
                    b"HTTP/1.1 401 Unauthorized\r\ncontent-length: 2\r\nconnection: close\r\n\r\n{}",
                )
                .await;
        }
    });
    let server = ResolvedServer::at(&origin, None, "test");

    let client = reqwest::Client::new();
    let error =
        send::<serde_json::Value>(&client, &server, reqwest::Method::GET, "/v1/accounts", None)
            .await
            .expect_err("a 401 must be an error");

    assert!(error.contains("server use"), "{error}");
    assert!(error.contains(&origin), "{error}");
}

/// An unreachable router is an error, never a quiet local fallback.
#[tokio::test]
async fn an_unreachable_router_is_an_error() {
    let target = ResolvedServer::at("http://127.0.0.1:1", None, "test");

    let code = status(&target).await;

    assert_ne!(code, std::process::ExitCode::SUCCESS);
}

/// A device flow has no code to paste: the router is polled until the human
/// approves it in their browser, and the credential lands on the router.
#[tokio::test]
async fn a_device_flow_is_polled_until_the_router_authorizes_it() {
    let (origin, requests, handle) = serve(vec![
        r#"{"login_id":"dev","provider":"codex","status":"awaiting_device","user_code":"ABCD-EFGH","session_expires_at":"2030-01-01T00:00:00Z"}"#,
        r#"{"login_id":"dev","provider":"codex","status":"awaiting_device","session_expires_at":"2030-01-01T00:00:00Z"}"#,
        r#"{"login_id":"dev","provider":"codex","status":"authorized","session_expires_at":"2030-01-01T00:00:00Z"}"#,
    ])
    .await;
    let target = ResolvedServer::at(origin, Some("admin".into()), "test");

    let code = authorize(&target, "codex", None, None).await;

    assert_eq!(code, std::process::ExitCode::SUCCESS);
    assert_eq!(requests.load(Ordering::SeqCst), 3);
    let seen = handle.await.unwrap();
    assert!(seen[0].starts_with("POST /api/login"), "{}", seen[0]);
    assert!(
        seen[1].starts_with("GET /api/login/dev"),
        "the device login was not polled: {}",
        seen[1]
    );
}

/// A device login the router ends as failed must not report success.
#[tokio::test]
async fn a_device_flow_that_the_router_fails_is_an_error() {
    let (origin, _requests, _handle) = serve(vec![
        r#"{"login_id":"dev","provider":"codex","status":"awaiting_device","user_code":"ABCD-EFGH","session_expires_at":"2030-01-01T00:00:00Z"}"#,
        r#"{"login_id":"dev","provider":"codex","status":"expired","session_expires_at":"2030-01-01T00:00:00Z"}"#,
    ])
    .await;
    let target = ResolvedServer::at(origin, Some("admin".into()), "test");

    let code = authorize(&target, "codex", None, None).await;

    assert_ne!(code, std::process::ExitCode::SUCCESS);
}

/// A login the router reports as already authorized needs no code at all.
#[tokio::test]
async fn an_already_authorized_login_needs_no_code() {
    let (origin, requests, _handle) = serve(vec![
        r#"{"login_id":"done","provider":"claude","status":"authorized","session_expires_at":"2030-01-01T00:00:00Z"}"#,
    ])
    .await;
    let target = ResolvedServer::at(origin, Some("admin".into()), "test");

    let code = authorize(&target, "claude", None, None).await;

    assert_eq!(code, std::process::ExitCode::SUCCESS);
    assert_eq!(requests.load(Ordering::SeqCst), 1, "a code was submitted");
}

/// A reply that is not a login view must fail rather than be read as one.
#[tokio::test]
async fn a_reply_without_a_login_id_is_an_error() {
    let (origin, _requests, _handle) = serve(vec![r#"{"unexpected":true}"#]).await;
    let target = ResolvedServer::at(origin, Some("admin".into()), "test");

    let code = authorize(&target, "claude", None, Some("code".into())).await;

    assert_ne!(code, std::process::ExitCode::SUCCESS);
}

/// A router with no accounts says so plainly rather than printing nothing.
#[tokio::test]
async fn a_router_without_accounts_says_so() {
    let (origin, requests, _handle) = serve(vec![r#"{"accounts":[]}"#]).await;
    let target = ResolvedServer::at(origin, Some("admin".into()), "test");

    let code = status(&target).await;

    assert_eq!(code, std::process::ExitCode::SUCCESS);
    assert_eq!(requests.load(Ordering::SeqCst), 1);
}

/// An explicit mode is forwarded, so `--mode setup-token` narrows the scope on
/// the router exactly as it does locally.
#[tokio::test]
async fn an_explicit_mode_is_forwarded_to_the_router() {
    let (origin, _requests, handle) = serve(vec![
        r#"{"login_id":"abc","provider":"claude","status":"awaiting_code","url":"https://example.invalid/a","session_expires_at":"2030-01-01T00:00:00Z"}"#,
        r#"{"login_id":"abc","provider":"claude","status":"authorized","session_expires_at":"2030-01-01T00:00:00Z"}"#,
    ])
    .await;
    let target = ResolvedServer::at(origin, Some("admin".into()), "test");

    let code = authorize(&target, "claude", Some("setup-token"), Some("code".into())).await;

    assert_eq!(code, std::process::ExitCode::SUCCESS);
    let seen = handle.await.unwrap();
    assert!(seen[0].contains("setup-token"), "{}", seen[0]);
}

/// A non-401 failure must report the status and the router's own words, so an
/// operator sees what the router actually said rather than a generic message.
#[tokio::test]
async fn a_server_error_reports_the_status_and_the_reply() {
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let origin = format!("http://{}", listener.local_addr().unwrap());
    tokio::spawn(async move {
        if let Ok(Ok((mut socket, _))) =
            tokio::time::timeout(std::time::Duration::from_secs(5), listener.accept()).await
        {
            let mut request = [0; 2048];
            let _ = socket.read(&mut request).await;
            let _ = socket
                .write_all(
                    b"HTTP/1.1 503 Service Unavailable\r\ncontent-length: 13\r\nconnection: close\r\n\r\nstill booting",
                )
                .await;
        }
    });
    let server = ResolvedServer::at(&origin, Some("admin".into()), "test");

    let client = reqwest::Client::new();
    let error =
        send::<serde_json::Value>(&client, &server, reqwest::Method::GET, "/v1/accounts", None)
            .await
            .expect_err("a 503 must be an error");

    assert!(error.contains("503"), "{error}");
    assert!(error.contains("still booting"), "{error}");
}

/// A success whose body is not the expected shape must fail rather than be
/// read as an empty result.
#[tokio::test]
async fn an_unreadable_reply_is_an_error() {
    let (origin, _requests, _handle) = serve(vec!["not json"]).await;
    let server = ResolvedServer::at(origin, Some("admin".into()), "test");

    let client = reqwest::Client::new();
    let error =
        send::<serde_json::Value>(&client, &server, reqwest::Method::GET, "/v1/accounts", None)
            .await
            .expect_err("an unreadable reply must be an error");

    assert!(error.contains("could not read the reply"), "{error}");
}

/// `--managed` must keep `auth` on the local path even when a router is
/// listening: that is the opt-out issue #250 asks for.
#[tokio::test]
async fn forcing_managed_selects_no_remote_server() {
    let selected = selected_server(true).await.expect("no error");

    assert!(
        selected.is_none(),
        "--managed must not adopt a running router"
    );
}

/// `--local` keeps `auth` on this machine's credential directory even when a
/// server is selected — the explicit escape hatch from issue #246.
#[tokio::test]
async fn local_selects_no_remote_server() {
    let target = target_for(true, false, None).await.expect("no error");

    assert!(target.is_none(), "--local must stay local");
}

/// `--managed` keeps the local path too, so a clean-room run is unaffected by
/// whatever is listening (issue #250).
#[tokio::test]
async fn managed_selects_no_remote_server() {
    let target = target_for(false, true, None).await.expect("no error");

    assert!(target.is_none(), "--managed must stay off a running router");
}

/// `--local` wins even when a server is also named: the flags are mutually
/// exclusive at the parser, and the resolver must not contact anything.
#[tokio::test]
async fn local_beats_a_named_server() {
    let target = target_for(true, false, Some("http://127.0.0.1:1"))
        .await
        .expect("no error");

    assert!(target.is_none(), "--local must not reach for a server");
}

/// A named server that cannot be reached is an error naming that server, not a
/// silent fall back to a local directory.
#[tokio::test]
async fn an_unreachable_named_server_is_an_error() {
    // Matched rather than `expect_err`: `ResolvedServer` holds a token and so
    // deliberately does not implement `Debug`.
    let Err(error) = target_for(false, false, Some("http://127.0.0.1:1")).await else {
        panic!("an unreachable server must be an error");
    };

    assert!(error.contains("127.0.0.1:1"), "{error}");
    assert!(error.contains("not usable"), "{error}");
}

/// A named server that is reachable is used, and reported as coming from the
/// flag rather than from a selection or a container.
#[tokio::test]
async fn a_named_server_is_used() {
    let (origin, _requests, _handle) = serve(vec![r#"{"status":"ok"}"#]).await;

    let target = target_for(false, false, Some(&origin))
        .await
        .expect("a reachable server is usable")
        .expect("a server was named");

    assert_eq!(target.source, "flag");
    assert!(target.base_url.contains("127.0.0.1"), "{}", target.base_url);
}

/// A serving single-account deployment is not reported as unconfigured
/// (issue #281).
///
/// `accounts: []` means *no account pool*, the ordinary state of a
/// single-subscription router. Reading it as "no credential" made `auth status`
/// describe a router serving live traffic as unauthorized, and the natural next
/// step from that output is to re-authenticate something already working.
#[test]
fn a_single_account_deployment_reports_its_credentials() {
    let body = serde_json::json!({
        "accounts": [],
        "credentials": [
            {"name": "claude", "home": "/srv/router-claude", "credential": "ok", "healthy": true},
            {"name": "codex", "home": "/srv/router-codex", "credential": "expired", "healthy": false},
        ],
        "note": "single-account mode (no AccountRouter configured)",
    });

    let lines = credential_report(&body);

    assert_eq!(lines.len(), 2, "each provider is named: {lines:?}");
    assert!(
        lines[0].contains("claude") && lines[0].contains("ok"),
        "{lines:?}"
    );
    assert!(
        lines[1].contains("codex") && lines[1].contains("expired"),
        "{lines:?}"
    );
    assert!(
        !lines
            .iter()
            .any(|line| line.contains("no accounts are configured")),
        "a deployment holding a usable credential must not read as unconfigured: {lines:?}"
    );
}

/// An older router sends only the note; that note is the answer.
///
/// The server already distinguishes "single-account mode" from "nothing here",
/// and dropping the explanation is what left the misleading sentence as the
/// only output.
#[test]
fn the_servers_explanation_is_printed_rather_than_discarded() {
    let body = serde_json::json!({
        "accounts": [],
        "note": "single-account mode (no AccountRouter configured)",
    });

    let lines = credential_report(&body);

    assert_eq!(
        lines,
        vec!["single-account mode (no AccountRouter configured)"]
    );
}

/// With a pool configured, the pool is what gets reported, unchanged.
#[test]
fn a_configured_pool_is_reported_as_before() {
    let body = serde_json::json!({
        "accounts": [
            {"name": "team-a", "home": "/srv/a", "credential": "ok"},
            {"name": "team-b", "home": "/srv/b", "credential": "rejected"},
        ],
    });

    let lines = credential_report(&body);

    assert_eq!(lines.len(), 2);
    assert!(
        lines[0].contains("team-a") && lines[0].contains("ok"),
        "{lines:?}"
    );
    assert!(
        lines[1].contains("team-b") && lines[1].contains("rejected"),
        "{lines:?}"
    );
}

/// A router that says nothing at all still gets the original sentence: with no
/// accounts, no credentials and no note, "nothing is configured" is true.
#[test]
fn a_silent_router_still_reports_nothing_configured() {
    let lines = credential_report(&serde_json::json!({"accounts": []}));

    assert_eq!(lines, vec!["no accounts are configured on this router"]);
}
