//! The router mediates git and GitHub traffic for an isolated agent task.
//!
//! Issues #261, #262, #263: an agent that reaches GitHub only through the
//! router should neither hold a credential nor be able to destroy history, and
//! a router on an internal network should be reachable by clients that refuse
//! plaintext. These drive the released binary so the whole path is exercised.

use std::io::{Read as _, Write as _};
use std::net::{TcpListener, TcpStream};
use std::process::{Child, Command, Stdio};
use std::time::{Duration, Instant};

fn free_port() -> u16 {
    TcpListener::bind("127.0.0.1:0")
        .expect("bind ephemeral")
        .local_addr()
        .expect("address")
        .port()
}

/// An upstream that accepts every push, so a refusal can only come from the
/// router rather than from GitHub.
fn permissive_git_upstream() -> u16 {
    let listener = TcpListener::bind("127.0.0.1:0").expect("bind upstream");
    let port = listener.local_addr().expect("address").port();
    std::thread::spawn(move || {
        for stream in listener.incoming() {
            let Ok(mut stream) = stream else { continue };
            let mut scratch = [0; 8192];
            let _ = stream.read(&mut scratch);
            let body = "0031\x01000eunpack ok\n0019ok refs/heads/main\n00000000";
            let _ = stream.write_all(
                format!(
                    "HTTP/1.1 200 OK\r\ncontent-type: application/x-git-receive-pack-result\r\n\
                     content-length: {}\r\nconnection: close\r\n\r\n{body}",
                    body.len()
                )
                .as_bytes(),
            );
        }
    });
    port
}

struct Router {
    child: Child,
    port: u16,
    data: tempfile::TempDir,
}

impl Drop for Router {
    fn drop(&mut self) {
        let _ = self.child.kill();
        let _ = self.child.wait();
    }
}

impl Router {
    fn start(upstream: u16) -> Self {
        let data = tempfile::tempdir().expect("data dir");
        let port = free_port();
        let child = Command::new(env!("CARGO_BIN_EXE_link-assistant-router"))
            .arg("serve")
            .env("TOKEN_SECRET", "agent-sandbox-secret")
            .env("ROUTER_HOST", "127.0.0.1")
            .env("ROUTER_PORT", port.to_string())
            .env("STORAGE_POLICY", "text")
            .env("DATA_DIR", data.path())
            .env("DISABLE_LOGIN_API", "true")
            .env("GITHUB_PROXY_TOKEN", "operator-secret")
            .env(
                "GITHUB_PROXY_BASE_URL",
                format!("http://127.0.0.1:{upstream}"),
            )
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
            .expect("start the router");
        let router = Self { child, port, data };
        let deadline = Instant::now() + Duration::from_secs(40);
        while Instant::now() < deadline {
            if router.get("/health").contains(" 200 ") {
                return router;
            }
            std::thread::sleep(Duration::from_millis(150));
        }
        panic!("router never became healthy on port {}", router.port);
    }

    fn get(&self, path: &str) -> String {
        self.send(&format!(
            "GET {path} HTTP/1.1\r\nHost: x\r\nConnection: close\r\n\r\n"
        ))
    }

    fn send(&self, request: &str) -> String {
        let Ok(mut stream) = TcpStream::connect(("127.0.0.1", self.port)) else {
            return String::new();
        };
        if stream.write_all(request.as_bytes()).is_err() {
            return String::new();
        }
        let mut response = String::new();
        let _ = stream.read_to_string(&mut response);
        response
    }

    fn token(&self, extra: &[&str]) -> String {
        let mut command = Command::new(env!("CARGO_BIN_EXE_link-assistant-router"));
        command
            .args(["tokens", "issue", "--ttl-hours", "1", "--label", "agent"])
            .args(extra)
            .env("TOKEN_SECRET", "agent-sandbox-secret")
            .env("DATA_DIR", self.data.path())
            .env("STORAGE_POLICY", "text");
        String::from_utf8_lossy(&command.output().expect("issue a token").stdout)
            .lines()
            .last()
            .unwrap_or_default()
            .trim()
            .to_string()
    }

    /// Send a `git-receive-pack` push carrying one ref command.
    fn push(&self, token: &str, repository: &str, command: &str) -> String {
        let line = format!("{command}\n");
        let body = format!("{:04x}{line}0000PACK", line.len() + 4);
        self.send(&format!(
            "POST /git/{repository}.git/git-receive-pack HTTP/1.1\r\nHost: x\r\n\
             authorization: Bearer {token}\r\n\
             content-type: application/x-git-receive-pack-request\r\n\
             content-length: {}\r\nConnection: close\r\n\r\n{body}",
            body.len()
        ))
    }
}

const OLD: &str = "1111111111111111111111111111111111111111";
const NEW: &str = "2222222222222222222222222222222222222222";
const ZERO: &str = "0000000000000000000000000000000000000000";

/// The destructive sequence issue #261 defends against: a force-push over the
/// git transport, which never reached the API policy at all.
#[test]
fn a_force_push_is_refused_over_the_git_transport() {
    let router = Router::start(permissive_git_upstream());
    let token = router.token(&[]);

    let response = router.push(
        &token,
        "acme/demo",
        &format!("{OLD} {NEW} refs/heads/main\0report-status force-ref-updates"),
    );

    assert!(response.contains(" 403 "), "{response}");
    assert!(
        response.contains("force-updating refs/heads/main"),
        "{response}"
    );
    assert!(
        response.contains("x-link-assistant-policy: blocked"),
        "{response}"
    );
}

/// Deleting a branch is refused for the same reason.
#[test]
fn a_branch_deletion_is_refused_over_the_git_transport() {
    let router = Router::start(permissive_git_upstream());
    let token = router.token(&[]);

    let response = router.push(
        &token,
        "acme/demo",
        &format!("{OLD} {ZERO} refs/heads/main"),
    );

    assert!(response.contains(" 403 "), "{response}");
    assert!(response.contains("deleting refs/heads/main"), "{response}");
}

/// An ordinary push must still reach the upstream: a proxy that refuses
/// everything is no more usable than no proxy at all.
#[test]
fn an_ordinary_push_reaches_the_upstream() {
    let router = Router::start(permissive_git_upstream());
    let token = router.token(&[]);

    let response = router.push(
        &token,
        "acme/demo",
        &format!("{OLD} {NEW} refs/heads/feature\0report-status"),
    );

    assert!(response.contains(" 200 "), "{response}");
    assert!(response.contains("unpack ok"), "{response}");
}

/// A token scoped to one repository cannot push to another (issue #262).
#[test]
fn a_scoped_token_cannot_push_to_another_repository() {
    let router = Router::start(permissive_git_upstream());
    let token = router.token(&["--github-repo", "acme/demo"]);

    let allowed = router.push(
        &token,
        "acme/demo",
        &format!("{OLD} {NEW} refs/heads/feature\0report-status"),
    );
    assert!(allowed.contains(" 200 "), "its own repository: {allowed}");

    let refused = router.push(
        &token,
        "someone-else/private",
        &format!("{OLD} {NEW} refs/heads/feature\0report-status"),
    );
    assert!(refused.contains(" 403 "), "another repository: {refused}");
    assert!(
        refused.contains("outside this token's repositories"),
        "{refused}"
    );
}

/// A scoped token is refused on the REST surface too, so the restriction is
/// not merely a git-transport property.
#[test]
fn a_scoped_token_cannot_reach_another_repository_over_rest() {
    let router = Router::start(permissive_git_upstream());
    let token = router.token(&["--github-repo", "acme/demo"]);

    let response = router.send(&format!(
        "GET /repos/someone-else/private/issues HTTP/1.1\r\nHost: x\r\n\
         authorization: Bearer {token}\r\nConnection: close\r\n\r\n"
    ));

    assert!(response.contains(" 403 "), "{response}");
    assert!(
        response.contains("x-link-assistant-policy: blocked"),
        "{response}"
    );
}

/// An unrestricted token keeps reaching every repository, which is the default
/// and what every existing token keeps.
#[test]
fn an_unrestricted_token_is_not_narrowed() {
    let router = Router::start(permissive_git_upstream());
    let token = router.token(&[]);

    let response = router.push(
        &token,
        "anyone/anything",
        &format!("{OLD} {NEW} refs/heads/feature\0report-status"),
    );

    assert!(response.contains(" 200 "), "{response}");
}
