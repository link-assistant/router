//! `router deploy --mode host` with the real binary (issue #626).
//!
//! On macOS the live Claude Code login is in the Keychain, which a container
//! cannot read, so Anthropic needs the Router on the host. This test issues a
//! client token into a deployment's data directory, starts the host Router
//! with `router deploy --mode host`, and checks over real HTTP that the
//! token still authorizes, that a rerun and `--status` are read-only no-ops,
//! that neither the secret nor the token is printed, and that `--down`
//! stops the process. It needs no container runtime.
#![cfg(unix)]

use std::io::{Read as _, Write as _};
use std::path::{Path, PathBuf};
use std::process::Output;

mod common;

const SECRET: &str = "deploy-host-test-secret";

struct Host {
    home: tempfile::TempDir,
    port: u16,
}

impl Host {
    fn root(&self) -> PathBuf {
        self.home.path().join("deploy")
    }

    fn deploy(&self, extra: &[&str]) -> Output {
        let port = self.port.to_string();
        let root = self.root().display().to_string();
        let mut args = vec!["deploy", "--port", &port, "--root", &root];
        args.extend_from_slice(extra);
        let output = common::router_with_env(self.home.path(), &args, &[("TOKEN_SECRET", SECRET)]);
        println!(
            "$ router {}\n{}{}",
            args.join(" "),
            String::from_utf8_lossy(&output.stdout),
            String::from_utf8_lossy(&output.stderr)
        );
        output
    }

    fn pid(&self) -> Option<u32> {
        let record = std::fs::read_to_string(self.root().join("state/host")).ok()?;
        serde_json::from_str::<serde_json::Value>(&record).ok()?["pid"]
            .as_u64()
            .and_then(|pid| u32::try_from(pid).ok())
    }

    fn status(&self, path: &str, token: Option<&str>) -> Option<u16> {
        let mut stream = std::net::TcpStream::connect(("127.0.0.1", self.port)).ok()?;
        stream
            .set_read_timeout(Some(std::time::Duration::from_secs(10)))
            .ok()?;
        let authorization = token.map_or_else(String::new, |token| {
            format!("Authorization: Bearer {token}\r\n")
        });
        write!(
            stream,
            "GET {path} HTTP/1.1\r\nHost: localhost\r\n{authorization}Connection: close\r\n\r\n"
        )
        .ok()?;
        let mut response = String::new();
        stream.read_to_string(&mut response).ok()?;
        response.split_whitespace().nth(1)?.parse().ok()
    }
}

impl Drop for Host {
    fn drop(&mut self) {
        if let Some(pid) = self.pid() {
            let _ = std::process::Command::new("kill")
                .arg(pid.to_string())
                .status();
        }
    }
}

fn free_port() -> u16 {
    std::net::TcpListener::bind(("127.0.0.1", 0))
        .unwrap()
        .local_addr()
        .unwrap()
        .port()
}

fn issue_token(home: &Path, data: &Path) -> String {
    let data = data.display().to_string();
    let output = common::router_with_env(
        home,
        &["tokens", "issue", "--label", "laptop"],
        &[("TOKEN_SECRET", SECRET), ("DATA_DIR", &data)],
    );
    assert!(output.status.success(), "{output:?}");
    String::from_utf8_lossy(&output.stdout)
        .split_whitespace()
        .find(|word| word.starts_with(link_assistant_router::token::TOKEN_PREFIX))
        .expect("the issued token is printed")
        .to_string()
}

fn text(output: &Output) -> String {
    format!(
        "{}{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    )
}

#[test]
fn host_mode_serves_the_deployment_tokens_and_stops_on_down() {
    let host = Host {
        home: tempfile::tempdir().unwrap(),
        port: free_port(),
    };
    let token = issue_token(host.home.path(), &host.root().join("data"));

    let plan = host.deploy(&["--mode", "host", "--status"]);
    assert!(plan.status.success(), "{}", text(&plan));
    assert!(text(&plan).contains("status_is_read_only=true"));
    assert!(host.pid().is_none(), "a plan starts nothing");

    let deployed = host.deploy(&["--mode", "host"]);
    assert!(deployed.status.success(), "{}", text(&deployed));
    assert!(text(&deployed).contains("host deployment ready"));
    let pid = host.pid().expect("the host process is recorded");

    assert_eq!(host.status("/api/health", None), Some(200));
    // 401 means the signature was rejected; a generic token without a
    // managed-client binding gets 403 once it is authenticated.
    let authorized = host.status("/api/models", Some(&token));
    assert!(
        authorized.is_some_and(|status| status != 401),
        "{authorized:?}"
    );
    assert_eq!(host.status("/api/models", Some("la_sk_forged")), Some(401));

    // Host mode stays selected without the flag, and a rerun changes nothing.
    let status = host.deploy(&["--status"]);
    assert!(status.status.success(), "{}", text(&status));
    assert!(text(&status).contains("converged=true"));
    let again = host.deploy(&[]);
    assert!(again.status.success(), "{}", text(&again));
    assert!(text(&again).contains("already converged"));
    assert_eq!(host.pid(), Some(pid));

    for output in [&plan, &deployed, &status, &again] {
        assert!(!text(output).contains(SECRET));
        assert!(!text(output).contains(&token));
    }

    let down = host.deploy(&["--down", "--yes"]);
    assert!(down.status.success(), "{}", text(&down));
    assert!(host.pid().is_none());
    assert_eq!(host.status("/api/health", None), None);
}
