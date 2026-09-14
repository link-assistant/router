//! End-to-end recovery of a lost administrator (issue #573).
//!
//! The unit tests in `src/admin_recovery_tests.rs` pin the rule; this file pins
//! the claim the issue actually makes — that an operator who still owns the
//! store gets administrative access back on a deployment that is *already
//! running*, with no restart, and that everything else it holds survives.
//!
//! Both halves need a real process to mean anything. "The running deployment
//! accepts it" is a statement about a server that was started before the token
//! existed, and "no restart" cannot be observed at all in-process: the same
//! `TokenManager` validating what it just signed proves only that the signature
//! round-trips. So the router here is the shipped binary, started first, and the
//! recovered token is presented to it over HTTP afterwards.
//!
//! Unix only: the harness kills the child to shut it down.
#![cfg(unix)]

use std::io::{BufRead, BufReader};
use std::net::TcpListener;
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

/// Signing secret shared by the server and the recovery command.
///
/// This *is* the mechanism under test: recovery works because whoever can read
/// the store can also read the secret, and a token signed with it is accepted by
/// the deployment without any registration step.
const SECRET: &str = "admin-recovery-end-to-end-secret";

/// A router process on its own port, killed when the test ends.
struct Router {
    child: Child,
    port: u16,
    bootstrap_token: Option<String>,
    data_dir: tempfile::TempDir,
}

impl Drop for Router {
    fn drop(&mut self) {
        let _ = self.child.kill();
        let _ = self.child.wait();
    }
}

const ATTEMPTS: usize = 5;

/// An ephemeral port no other suite in this process has been handed.
///
/// Copied from `admin_endpoints_test.rs` for the reason recorded there: the
/// listener is closed before the number is returned, so a concurrently running
/// test binary can still win the port, and the loser's requests would otherwise
/// be answered by a router that never heard of its tokens (issue #368).
fn free_port() -> u16 {
    use std::sync::OnceLock;
    static HANDED_OUT: OnceLock<Mutex<std::collections::HashSet<u16>>> = OnceLock::new();
    let seen = HANDED_OUT.get_or_init(|| Mutex::new(std::collections::HashSet::new()));
    for _ in 0..4_000 {
        let port = TcpListener::bind("127.0.0.1:0")
            .expect("bind ephemeral")
            .local_addr()
            .expect("address")
            .port();
        if seen.lock().expect("port registry").insert(port) {
            return port;
        }
    }
    panic!("no unused ephemeral port")
}

impl Router {
    fn start() -> Self {
        let mut last_port = 0;
        for _ in 0..ATTEMPTS {
            if let Some(router) = Self::try_start(&mut last_port) {
                return router;
            }
        }
        panic!("router never became healthy after {ATTEMPTS} attempts (last port {last_port})");
    }

    fn try_start(last_port: &mut u16) -> Option<Self> {
        let data_dir = tempfile::tempdir().expect("temp data dir");
        let port = free_port();
        *last_port = port;
        let mut command = Command::new(env!("CARGO_BIN_EXE_link-assistant-router"));
        command
            .arg("serve")
            .env("TOKEN_SECRET", SECRET)
            .env("ROUTER_HOST", "127.0.0.1")
            .env("ROUTER_PORT", port.to_string())
            .env("STORAGE_POLICY", "text")
            .env("DATA_DIR", data_dir.path())
            .env("CLAUDE_CODE_HOME", data_dir.path().join("claude"))
            .env("DISABLE_LOGIN_API", "true")
            .stdout(Stdio::piped())
            .stderr(Stdio::null());
        let mut child = command.spawn().expect("router should start");

        let stdout = child.stdout.take().expect("piped stdout");
        let lines = Arc::new(Mutex::new(Vec::new()));
        let sink = Arc::clone(&lines);
        std::thread::spawn(move || {
            for line in BufReader::new(stdout).lines().map_while(Result::ok) {
                sink.lock().expect("stdout lock").push(line);
            }
        });

        let mut router = Self {
            child,
            port,
            bootstrap_token: None,
            data_dir,
        };
        if !router.await_health() {
            return None;
        }
        router.bootstrap_token = lines
            .lock()
            .expect("stdout lock")
            .iter()
            .find_map(|line| line.split("store it now): ").nth(1))
            .map(|token| token.trim().to_string());
        Some(router)
    }

    fn await_health(&mut self) -> bool {
        let deadline = Instant::now() + Duration::from_secs(30);
        while Instant::now() < deadline {
            if request("GET", &self.url("/api/health"), None, None).is_some() {
                return true;
            }
            if matches!(self.child.try_wait(), Ok(Some(_))) {
                return false;
            }
            std::thread::sleep(Duration::from_millis(100));
        }
        false
    }

    fn url(&self, path: &str) -> String {
        format!("http://127.0.0.1:{}{path}", self.port)
    }

    /// Run a `router` subcommand against this deployment's own store.
    ///
    /// The same `DATA_DIR` and `TOKEN_SECRET` the server is using — i.e. what an
    /// operator has when they can read the deployment's volume, which is the
    /// access the recovery path is gated on.
    fn cli(&self, arguments: &[&str]) -> std::process::Output {
        Command::new(env!("CARGO_BIN_EXE_link-assistant-router"))
            .args(arguments)
            .env("TOKEN_SECRET", SECRET)
            .env("STORAGE_POLICY", "text")
            .env("DATA_DIR", self.data_dir.path())
            .env("CLAUDE_CODE_HOME", self.data_dir.path().join("claude"))
            .env("NO_COLOR", "1")
            // `--local` keeps a developer's own selected server out of it: the
            // command refuses a remote target, and a machine with one selected
            // would otherwise exercise the refusal instead of the recovery.
            .arg("--local")
            .output()
            .expect("the router binary runs")
    }
}

fn request(
    method: &str,
    url: &str,
    bearer: Option<&str>,
    body: Option<&str>,
) -> Option<(u16, String)> {
    use std::io::{Read, Write};
    use std::net::TcpStream;

    let rest = url.strip_prefix("http://")?;
    let (authority, path) = rest.split_once('/')?;
    let path = format!("/{path}");

    let mut stream = TcpStream::connect(authority).ok()?;
    stream
        .set_read_timeout(Some(Duration::from_secs(10)))
        .ok()?;
    let body = body.unwrap_or("");
    let mut raw_request = format!(
        "{method} {path} HTTP/1.1\r\nHost: {authority}\r\nConnection: close\r\n\
         Content-Type: application/json\r\nContent-Length: {}\r\n",
        body.len()
    );
    if let Some(bearer) = bearer {
        raw_request.push_str("Authorization: Bearer ");
        raw_request.push_str(bearer);
        raw_request.push_str("\r\n");
    }
    raw_request.push_str("\r\n");
    raw_request.push_str(body);
    stream.write_all(raw_request.as_bytes()).ok()?;

    let mut raw = String::new();
    stream.read_to_string(&mut raw).ok()?;
    let status = raw.split_whitespace().nth(1)?.parse().ok()?;
    let body = raw
        .split_once("\r\n\r\n")
        .map_or("", |(_, rest)| rest)
        .to_string();
    Some((status, body))
}

/// The recovered token, from the command's JSON envelope.
fn recovered_token(output: &std::process::Output) -> String {
    assert!(
        output.status.success(),
        "recovery should succeed: {}",
        String::from_utf8_lossy(&output.stderr)
    );
    let stdout = String::from_utf8_lossy(&output.stdout);
    let line = stdout
        .lines()
        .find(|line| line.trim_start().starts_with('{'))
        .unwrap_or_else(|| panic!("recovery should print a JSON envelope: {stdout}"));
    let value: serde_json::Value =
        serde_json::from_str(line).unwrap_or_else(|error| panic!("JSON ({error}): {line}"));
    assert_eq!(value["recovered"], serde_json::Value::Bool(true));
    value["token"]
        .as_str()
        .unwrap_or_else(|| panic!("the envelope carries a token: {line}"))
        .to_string()
}

/// The issue's headline claim: the deployment keeps serving, the operator has
/// lost the printed token, and recovery makes it administrable again.
#[test]
fn a_running_deployment_is_administrable_again_after_recovery() {
    let router = Router::start();
    // The deployment minted and printed an administrator at first start. The
    // test never uses it again — that is what "lost" means here.
    assert!(
        router.bootstrap_token.is_some(),
        "a fresh deployment prints its admin token once"
    );

    // Before: the management surface is closed, which is the reported symptom.
    let (closed, _) = request("GET", &router.url("/api/management/tokens"), None, None)
        .expect("the router answers");
    assert_eq!(closed, 401, "management is closed without a credential");

    let token = recovered_token(&router.cli(&["tokens", "recover-admin", "--json"]));

    // After: accepted by the *already running* process. Nothing was restarted
    // between the two requests, so acceptance cannot come from re-reading state
    // at boot.
    let (status, body) = request(
        "GET",
        &router.url("/api/management/tokens"),
        Some(&token),
        None,
    )
    .expect("the router answers");
    assert_eq!(
        status, 200,
        "the recovered administrator is accepted by the running deployment: {body}"
    );
}

/// Recovery is not a way into somebody else's deployment: the authority is the
/// store, so a token signed against a different secret stays refused.
#[test]
fn a_token_recovered_against_another_secret_is_refused() {
    let router = Router::start();

    let elsewhere = tempfile::tempdir().expect("temp data dir");
    let output = Command::new(env!("CARGO_BIN_EXE_link-assistant-router"))
        .args(["tokens", "recover-admin", "--json", "--local"])
        .env("TOKEN_SECRET", "a-different-deployments-signing-secret")
        .env("STORAGE_POLICY", "text")
        .env("DATA_DIR", elsewhere.path())
        .env("NO_COLOR", "1")
        .output()
        .expect("the router binary runs");
    let foreign = recovered_token(&output);

    let (status, _) = request(
        "GET",
        &router.url("/api/management/tokens"),
        Some(&foreign),
        None,
    )
    .expect("the router answers");
    assert_eq!(
        status, 401,
        "a foreign store's recovered token is not an administrator here"
    );
}

/// Client tokens are the thing "destroy it and start over" would have thrown
/// away, so recovery has to leave them working.
#[test]
fn a_client_token_issued_before_recovery_still_works_afterwards() {
    let router = Router::start();
    let admin = router
        .bootstrap_token
        .clone()
        .expect("a bootstrap administrator");
    let (issued, body) = request(
        "POST",
        &router.url("/api/management/tokens"),
        Some(&admin),
        Some(r#"{"ttl_hours":24,"label":"a-client"}"#),
    )
    .expect("the router answers");
    assert_eq!(issued, 200, "a client token is issued: {body}");
    let client = client_token_in(&body);

    // A catalog route authenticates an ordinary token without needing a
    // subscription, so it isolates "is this credential still accepted" from
    // whether any provider is configured.
    let catalog = "/api/services/anthropic/v1/models";
    let (before, _) =
        request("GET", &router.url(catalog), Some(&client), None).expect("the router answers");
    assert_eq!(before, 200, "the client token works before recovery");

    router.cli(&["tokens", "recover-admin", "--json"]);

    let (after, _) =
        request("GET", &router.url(catalog), Some(&client), None).expect("the router answers");
    assert_eq!(after, 200, "the client token still works after recovery");
}

/// `--revoke-others` is for a credential believed to be in someone else's
/// hands, so the old administrator has to actually stop working.
#[test]
fn revoking_others_closes_the_lost_administrator_out() {
    let router = Router::start();
    let lost = router
        .bootstrap_token
        .clone()
        .expect("a bootstrap administrator");
    let (before, _) = request(
        "GET",
        &router.url("/api/management/tokens"),
        Some(&lost),
        None,
    )
    .expect("the router answers");
    assert_eq!(before, 200, "the lost administrator works to begin with");

    let replacement =
        recovered_token(&router.cli(&["tokens", "recover-admin", "--json", "--revoke-others"]));

    let (after, _) = request(
        "GET",
        &router.url("/api/management/tokens"),
        Some(&lost),
        None,
    )
    .expect("the router answers");
    assert_eq!(
        after, 401,
        "the revoked administrator is refused by the running deployment"
    );
    let (kept, _) = request(
        "GET",
        &router.url("/api/management/tokens"),
        Some(&replacement),
        None,
    )
    .expect("the router answers");
    assert_eq!(kept, 200, "the replacement is not caught by its own sweep");
}

/// A recovery has to be visible after the fact, from the deployment itself.
#[test]
fn the_recovery_is_visible_in_the_deployments_own_token_list() {
    let router = Router::start();
    let token = recovered_token(&router.cli(&["tokens", "recover-admin", "--json"]));

    let (status, body) = request(
        "GET",
        &router.url("/api/management/tokens"),
        Some(&token),
        None,
    )
    .expect("the router answers");
    assert_eq!(status, 200);
    assert!(
        body.contains("recovered-admin"),
        "the deployment reports the recovery in its own token list: {body}"
    );
}

/// Secrets must not leak into output. The human-readable form prints the token
/// once by design; everything *else* it says must be free of it, and the
/// surrounding report must not repeat it.
#[test]
fn recovery_output_does_not_repeat_the_credential() {
    let router = Router::start();

    let output = router.cli(&["tokens", "recover-admin"]);
    let stdout = String::from_utf8_lossy(&output.stdout);

    let occurrences = stdout.matches("la_sk_").count();
    assert_eq!(
        occurrences, 1,
        "the credential is printed exactly once, not echoed again: {stdout}"
    );
    let stderr = String::from_utf8_lossy(&output.stderr);
    assert!(
        !stderr.contains("la_sk_"),
        "the credential never reaches stderr: {stderr}"
    );
}

fn client_token_in(body: &str) -> String {
    let json = body
        .lines()
        .find(|line| line.trim_start().starts_with('{'))
        .unwrap_or_else(|| body.trim());
    let value: serde_json::Value =
        serde_json::from_str(json).unwrap_or_else(|error| panic!("JSON ({error}): {body}"));
    value["token"]
        .as_str()
        .unwrap_or_else(|| panic!("a token in the response: {body}"))
        .to_string()
}
