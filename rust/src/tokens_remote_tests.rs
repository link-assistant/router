//! Unit tests for the remote token calls ([`crate::tokens_remote`]).
//!
//! What goes on the wire is the part that can be wrong in a way an operator
//! notices, and the part a live-server test covers worst.

use super::*;
use crate::cli::{AuthTarget, Cli};
use clap::Parser as _;

fn token_op(args: &[&str]) -> TokenOp {
    let cli = Cli::try_parse_from(args).expect("the command line must parse");
    match cli.command.expect("a subcommand") {
        crate::cli::Command::Tokens { op } => op,
        other => panic!("expected tokens, got {other:?}"),
    }
}

/// `rotate <ID>` replaces the named token, not the caller's own credential.
///
/// `/api/tokens/rotate` rotates the admin credential the request authenticated
/// with — aiming there would revoke the operator's own access and leave the
/// named token untouched, while still printing a token and reporting success.
#[test]
fn rotate_targets_the_named_token_not_the_callers_credential() {
    let call = call_for(&token_op(&["router", "tokens", "rotate", "tok-1"]));

    assert_eq!(call.path, "/api/management/tokens/rotate-client");
    assert_eq!(call.method, "POST");
    let body = call.body.expect("a rotate carries a body");
    assert_eq!(
        body["id"], "tok-1",
        "the named token is the subject: {body}"
    );
}

/// `issue --admin` asks for an admin-scoped token; a plain issue does not.
#[test]
fn an_admin_token_is_requested_only_when_asked_for() {
    let plain = call_for(&token_op(&["router", "tokens", "issue"]));
    let body = plain.body.expect("body");
    assert!(
        body["scope"].is_null(),
        "an ordinary issue must not request admin scope: {body}"
    );

    let admin = call_for(&token_op(&["router", "tokens", "issue", "--admin"]));
    let body = admin.body.expect("body");
    assert_eq!(body["scope"], crate::token::ADMIN_SCOPE, "{body}");
}

/// Caps and limits reach the deployment as given.
#[test]
fn issue_forwards_every_control_it_was_given() {
    let call = call_for(&token_op(&[
        "router",
        "tokens",
        "issue",
        "--label",
        "ci",
        "--max-requests",
        "100",
        "--max-tokens",
        "50000",
        "--rate-limit-per-minute",
        "60",
        "--account",
        "team-a",
        "--github-repo",
        "owner/repo",
    ]));

    let body = call.body.expect("body");
    assert_eq!(body["label"], "ci", "{body}");
    assert_eq!(body["max_requests"], 100, "{body}");
    assert_eq!(body["max_tokens"], 50_000, "{body}");
    assert_eq!(body["rate_limit_per_minute"], 60, "{body}");
    assert_eq!(body["account"], "team-a", "{body}");
    assert_eq!(body["github_repos"][0], "owner/repo", "{body}");
}

/// An unrestricted token sends no repository list at all.
///
/// An empty array would read as "restricted to nothing", which is the opposite
/// of the default every existing token keeps.
#[test]
fn an_unrestricted_token_sends_no_repository_list() {
    let call = call_for(&token_op(&["router", "tokens", "issue"]));

    let body = call.body.expect("body");
    assert!(body["github_repos"].is_null(), "{body}");
}

/// `revoke` and `expire` are the same call, as they are locally.
#[test]
fn revoke_and_expire_are_one_operation() {
    let revoke = call_for(&token_op(&["router", "tokens", "revoke", "tok-9"]));
    let expire = call_for(&token_op(&["router", "tokens", "expire", "tok-9"]));

    assert_eq!(revoke, expire);
    assert_eq!(revoke.path, "/api/management/tokens/revoke");
    assert_eq!(revoke.body.expect("body")["id"], "tok-9");
}

/// `list` and `show` read the same route: no `GET /api/tokens/{id}` exists.
#[test]
fn show_reads_the_list_rather_than_a_route_of_its_own() {
    let list = call_for(&token_op(&["router", "tokens", "list"]));
    let show = call_for(&token_op(&["router", "tokens", "show", "tok-1"]));

    assert_eq!(list.method, "GET");
    assert_eq!(list.path, "/api/management/tokens");
    assert_eq!(show, list, "show filters the list");
    assert!(list.body.is_none(), "a GET carries no body");
}

/// `show` exits 2 for an unknown id, matching the local path.
#[test]
fn showing_an_unknown_token_exits_two() {
    let records = vec![serde_json::json!({"id": "tok-1"})];

    assert_eq!(show_one(&records, "tok-1"), std::process::ExitCode::SUCCESS);
    assert_eq!(
        format!("{:?}", show_one(&records, "absent")),
        format!("{:?}", std::process::ExitCode::from(2)),
        "an unknown id must not read as success"
    );
}

/// The records live under `data`, and an unfamiliar answer yields none.
#[test]
fn records_are_read_from_the_data_array() {
    let answer = serde_json::json!({"data": [{"id": "a"}, {"id": "b"}]});
    assert_eq!(records_in(&answer).len(), 2);

    assert!(records_in(&serde_json::json!({})).is_empty());
    assert!(records_in(&serde_json::json!({"data": "not an array"})).is_empty());
}

/// The target flags never leak into the request body.
#[test]
fn the_target_is_not_sent_to_the_deployment() {
    let call = call_for(&token_op(&[
        "router",
        "tokens",
        "issue",
        "--server",
        "http://router.example:8080",
    ]));

    let body = call.body.expect("body").to_string();
    assert!(
        !body.contains("router.example"),
        "which router was targeted is not the deployment's business: {body}"
    );
    let _ = AuthTarget::default();
}

/// The whole operation reaches the deployment and reports its answer.
///
/// Driven against a loopback server rather than a mock, because what issue
/// #293 was about is *which endpoint gets contacted at all* — a test that
/// never opens a socket cannot see that.
#[tokio::test]
async fn a_remote_issue_prints_the_token_the_deployment_minted() {
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let origin = format!("http://{}", listener.local_addr().unwrap());
    let handle = tokio::spawn(async move {
        use tokio::io::{AsyncReadExt as _, AsyncWriteExt as _};
        let (mut socket, _) = listener.accept().await.expect("a request");
        let mut buffer = [0; 4096];
        let read = socket.read(&mut buffer).await.unwrap_or(0);
        let body = r#"{"token":"la_sk_minted_there"}"#;
        let _ = socket
            .write_all(
                format!(
                    "HTTP/1.1 200 OK\r\ncontent-type: application/json\r\ncontent-length: {}\r\nconnection: close\r\n\r\n{body}",
                    body.len()
                )
                .as_bytes(),
            )
            .await;
        String::from_utf8_lossy(&buffer[..read]).to_string()
    });
    let server = ResolvedServer::at(origin, Some("admin-token".to_string()), "test");

    let code = run(
        &server,
        &token_op(&["router", "tokens", "issue", "--label", "ci"]),
    )
    .await;

    assert_eq!(
        format!("{code:?}"),
        format!("{:?}", std::process::ExitCode::SUCCESS)
    );
    let request = handle.await.expect("the server task");
    assert!(
        request.starts_with("POST /api/management/tokens"),
        "{request}"
    );
    assert!(request.contains(r#""label":"ci""#), "{request}");
}

/// A deployment that refuses the call is an error, not a silent success.
#[tokio::test]
async fn a_refused_remote_call_is_not_reported_as_success() {
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let origin = format!("http://{}", listener.local_addr().unwrap());
    tokio::spawn(async move {
        use tokio::io::{AsyncReadExt as _, AsyncWriteExt as _};
        if let Ok((mut socket, _)) = listener.accept().await {
            let mut buffer = [0; 1024];
            let _ = socket.read(&mut buffer).await;
            let _ = socket
                .write_all(
                    b"HTTP/1.1 403 Forbidden\r\ncontent-length: 0\r\nconnection: close\r\n\r\n",
                )
                .await;
        }
    });
    let server = ResolvedServer::at(origin, Some("admin-token".to_string()), "test");

    let code = run(&server, &token_op(&["router", "tokens", "list"])).await;

    assert_ne!(
        format!("{code:?}"),
        format!("{:?}", std::process::ExitCode::SUCCESS),
        "a refused call must not read as an empty token list"
    );
}
