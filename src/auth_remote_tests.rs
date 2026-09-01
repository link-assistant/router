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
        r#"{"login_id":"dev","provider":"codex","status":"awaiting_device","url":"https://auth.openai.com/codex/device","user_code":"ABCD-EFGH","session_expires_at":"2030-01-01T00:00:00Z"}"#,
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
    assert!(
        seen.iter()
            .skip(1)
            .all(|request| !request.contains("/code")),
        "a device flow must never submit a pasted code: {seen:#?}"
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

/// `--managed` keeps the local path for `auth`, so a clean-room run is
/// unaffected by whatever is listening (issue #250). The families that cannot
/// start a container refuse the flag instead of taking this branch silently
/// (issue #315).
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
    // Against a state root this test owns: resolution reads the persisted
    // selection, and a test must not depend on -- or disturb -- whatever the
    // developer has configured (issue #343).
    let directory = tempfile::tempdir().expect("temporary state root");
    let _guard = crate::managed_server::claim_state_root(directory.path().to_path_buf());
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

    assert_eq!(
        lines.len(),
        3,
        "a header and each provider is named: {lines:?}"
    );
    assert_eq!(lines[0], crate::accounts_cli::header());
    assert!(
        lines[1].contains("claude") && lines[1].contains("ok") && lines[1].contains("true"),
        "{lines:?}"
    );
    assert!(
        lines[2].contains("codex") && lines[2].contains("expired") && lines[2].contains("false"),
        "the health verdict is the column the command exists to answer: {lines:?}"
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

    assert_eq!(lines.len(), 3);
    assert_eq!(lines[0], crate::accounts_cli::header());
    assert!(
        lines[1].contains("team-a") && lines[1].contains("ok"),
        "{lines:?}"
    );
    assert!(
        lines[2].contains("team-b") && lines[2].contains("rejected"),
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

/// The refusal names the directory the selected router reads from (#291).
///
/// "Not from here" alone leaves the operator to guess the next step; the path
/// is the instruction. Single-account deployments report it under
/// `credentials`, pooled ones under `accounts`.
#[test]
fn a_reported_credential_home_is_found_in_either_shape() {
    let single = serde_json::json!({
        "accounts": [],
        "credentials": [
            {"name": "claude", "home": "/srv/deployment-claude", "credential": "ok"},
            {"name": "codex", "home": "/srv/deployment-codex", "credential": "missing"},
        ],
    });
    assert_eq!(
        home_in_accounts(&single, "claude").as_deref(),
        Some("/srv/deployment-claude")
    );
    assert_eq!(
        home_in_accounts(&single, "codex").as_deref(),
        Some("/srv/deployment-codex")
    );

    let pooled = serde_json::json!({
        "accounts": [{"name": "claude", "home": "/pool/a", "credential": "ok"}],
    });
    assert_eq!(
        home_in_accounts(&pooled, "claude").as_deref(),
        Some("/pool/a")
    );
}

/// A router that reports no home simply omits the line.
///
/// The refusal is correct without it, so a missing or older `/v1/accounts`
/// must never turn into a failure of its own.
#[test]
fn an_unreported_home_yields_nothing_rather_than_failing() {
    assert_eq!(home_in_accounts(&serde_json::json!({}), "claude"), None);
    assert_eq!(
        home_in_accounts(&serde_json::json!({"accounts": []}), "claude"),
        None
    );
    // A provider this deployment does not report.
    let body = serde_json::json!({"credentials": [{"name": "codex", "home": "/srv/c"}]});
    assert_eq!(home_in_accounts(&body, "claude"), None);
    // An entry with no home at all.
    let body = serde_json::json!({"credentials": [{"name": "claude"}]});
    assert_eq!(home_in_accounts(&body, "claude"), None);
}

/// The refusal says what cannot be done, where it would have to go, and how to
/// ask for the local action instead (issue #291).
#[test]
fn the_refusal_names_the_target_and_the_local_alternative() {
    let lines = remote_import_refusal("http://router.example:8080", Some("/srv/deployment-claude"));

    let all = lines.join("\n");
    assert!(
        all.contains("http://router.example:8080"),
        "the target must be named, since answering about the local home is the bug: {all}"
    );
    assert!(
        all.contains("/srv/deployment-claude"),
        "the directory the credential would have to land in is the instruction: {all}"
    );
    assert!(
        all.contains("--local"),
        "the local action must stay reachable: {all}"
    );
    assert!(
        all.starts_with("error:"),
        "this is a refusal, not a note: {all}"
    );
}

/// A router that reports no home still gets a complete, actionable refusal.
#[test]
fn the_refusal_omits_an_unreported_home_rather_than_guessing() {
    let lines = remote_import_refusal("http://router.example:8080", None);

    assert!(
        !lines
            .iter()
            .any(|line| line.contains("reads its credential from")),
        "an unreported home must be omitted, not invented: {lines:?}"
    );
    let all = lines.join("\n");
    assert!(all.contains("http://router.example:8080"), "{all}");
    assert!(all.contains("--local"), "{all}");
}

/// The shared helpers reach the route they are given, with the admin credential.
///
/// Every remote command routes through these, so a missing bearer or a mangled
/// path would break `tokens`, `accounts` and `providers` at once (issue #294).
#[tokio::test]
async fn the_shared_helpers_carry_the_admin_credential() {
    let (origin, request_count, handle) =
        serve(vec![r#"{"ok":true}"#, r#"{"ok":true}"#, r#"{"ok":true}"#]).await;
    let server = ResolvedServer::at(origin, Some("admin-token".to_string()), "test");

    get(&server, "/api/tokens/list").await.expect("a GET");
    post(&server, "/api/tokens", serde_json::json!({"label": "ci"}))
        .await
        .expect("a POST");
    delete(&server, "/api/providers/demo")
        .await
        .expect("a DELETE");

    assert_eq!(request_count.load(Ordering::SeqCst), 3);
    let seen = handle.await.expect("the server task");
    assert!(seen[0].starts_with("GET /api/tokens/list"), "{}", seen[0]);
    assert!(seen[1].starts_with("POST /api/tokens"), "{}", seen[1]);
    assert!(
        seen[2].starts_with("DELETE /api/providers/demo"),
        "{}",
        seen[2]
    );
    for request in &seen {
        assert!(
            request.contains("authorization: Bearer admin-token"),
            "every call must authenticate: {request}"
        );
    }
    assert!(
        seen[1].contains(r#""label":"ci""#),
        "the body must reach the deployment: {}",
        seen[1]
    );
}

/// `accounts list` reads the proxy-port route, not the admin-port spelling.
///
/// `/api/admin/accounts` is the same handler on the admin listener and 404s on
/// the port `ResolvedServer` names, so the wrong spelling makes the command
/// fail against every ordinary deployment.
#[tokio::test]
async fn accounts_reads_the_route_the_selected_port_serves() {
    let body =
        r#"{"accounts":[],"credentials":[{"name":"claude","home":"/srv/c","credential":"ok"}]}"#;
    let (origin, request_count, handle) = serve(vec![body]).await;
    let server = ResolvedServer::at(origin, Some("admin-token".to_string()), "test");

    let code = accounts(&server).await;

    assert_eq!(
        format!("{code:?}"),
        format!("{:?}", std::process::ExitCode::SUCCESS)
    );
    assert_eq!(request_count.load(Ordering::SeqCst), 1);
    let seen = handle.await.expect("the server task");
    assert!(
        seen[0].starts_with("GET /v1/accounts"),
        "the admin-port spelling 404s on this listener: {}",
        seen[0]
    );
}

/// A router that refuses the credential says how to re-select it.
#[tokio::test]
async fn a_refused_credential_names_the_fix() {
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let origin = format!("http://{}", listener.local_addr().unwrap());
    tokio::spawn(async move {
        if let Ok((mut socket, _)) = listener.accept().await {
            let mut buffer = [0; 1024];
            let _ = socket.read(&mut buffer).await;
            let _ = socket
                .write_all(
                    b"HTTP/1.1 401 Unauthorized\r\ncontent-length: 0\r\nconnection: close\r\n\r\n",
                )
                .await;
        }
    });
    let server = ResolvedServer::at(origin, Some("stale".to_string()), "test");

    let error = get(&server, "/api/tokens/list")
        .await
        .expect_err("a 401 is an error");

    assert!(
        error.contains("server use"),
        "the operator needs the command that fixes it: {error}"
    );
}

/// The defect in issue #306: the remote form printed three of eight columns,
/// dropping `healthy` — the one the command exists to answer — so a dead
/// subscription rendered identically to a live one. Its own comment claimed
/// parity; nothing checked it.
#[test]
fn both_modes_print_the_same_columns() {
    let body = serde_json::json!({
        "accounts": [{
            "name": "team-a",
            "home": "/srv/a",
            "credential": "ok",
            "healthy": false,
            "used": 12,
            "request_limit": 100,
            "remaining_requests": 88,
        }],
    });

    let lines = credential_report(&body);

    assert_eq!(lines[0], crate::accounts_cli::header());
    for column in ["healthy", "used", "limit", "remaining"] {
        assert!(lines[0].contains(column), "{column} missing: {}", lines[0]);
    }
    // Numbers are read as numbers. `as_str()` on a JSON number yields the same
    // placeholder as a field the server never sent, so the remote table could
    // not show a figure at all.
    for value in ["false", "12", "100", "88"] {
        assert!(
            lines[1].split_whitespace().any(|field| field == value),
            "{value} missing from {}",
            lines[1]
        );
    }
}
