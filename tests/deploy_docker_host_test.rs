//! A working container deployment moves to the host Router and back
//! (issue #626), with real containers and the real binary.
//!
//! The client token issued by the container backend must keep authorizing
//! across both moves, on the same loopback endpoint; the containers are
//! stopped, not removed, and `router deploy --mode container` restores them.
//! Skipped, visibly, without a container runtime or `ROUTER_DEPLOY_TEST_IMAGE`.
#![cfg(unix)]

use std::io::{Read as _, Write as _};
use std::process::{Command, Output};

mod common;
#[path = "deploy_docker/harness.rs"]
mod harness;

use harness::{Deployment, ready};

const SECRET: &str = "deploy-docker-test-secret";

fn deploy(deployment: &Deployment, home: &std::path::Path, extra: &[&str]) -> Output {
    let output = deployment
        .command(extra)
        .env("HOME", home)
        .env_remove("CLAUDE_CONFIG_DIR")
        .output()
        .expect("the router binary runs");
    println!(
        "$ router deploy {}\n{}{}",
        extra.join(" "),
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );
    output
}

fn running(name: &str) -> bool {
    Command::new("docker")
        .args(["inspect", "--format", "{{.State.Running}}", name])
        .output()
        .is_ok_and(|output| String::from_utf8_lossy(&output.stdout).trim() == "true")
}

fn models_status(deployment: &Deployment, token: &str) -> Option<u16> {
    let mut stream = std::net::TcpStream::connect(("127.0.0.1", deployment.port)).ok()?;
    stream
        .set_read_timeout(Some(std::time::Duration::from_secs(10)))
        .ok()?;
    write!(
        stream,
        "GET /api/models HTTP/1.1\r\nHost: localhost\r\nAuthorization: Bearer {token}\r\nConnection: close\r\n\r\n"
    )
    .ok()?;
    let mut response = String::new();
    stream.read_to_string(&mut response).ok()?;
    response.split_whitespace().nth(1)?.parse().ok()
}

/// 403 is a token without a managed-client binding that was authenticated;
/// 401 is a rejected signature.
fn authorized(deployment: &Deployment, token: &str) -> bool {
    models_status(deployment, token).is_some_and(|status| status != 401)
}

fn id(flag: &str) -> String {
    let output = Command::new("id").arg(flag).output().unwrap();
    String::from_utf8_lossy(&output.stdout).trim().to_string()
}

fn assert_private(output: &Output, token: &str) {
    for stream in [&output.stdout, &output.stderr] {
        let text = String::from_utf8_lossy(stream);
        assert!(!text.contains(SECRET), "the secret was printed: {text}");
        assert!(!text.contains(token), "the token was printed: {text}");
    }
}

/// Stops a host Router left behind by a failed assertion.
struct HostGuard(std::path::PathBuf);

impl Drop for HostGuard {
    fn drop(&mut self) {
        let pid = std::fs::read_to_string(self.0.join("state/host"))
            .ok()
            .and_then(|record| serde_json::from_str::<serde_json::Value>(&record).ok())
            .and_then(|record| record["pid"].as_u64());
        if let Some(pid) = pid {
            let _ = Command::new("kill").arg(pid.to_string()).status();
        }
    }
}

#[test]
fn a_container_deployment_moves_to_the_host_and_back_keeping_its_tokens() {
    let test = "a_container_deployment_moves_to_the_host_and_back_keeping_its_tokens";
    let Some(_image) = ready(test) else { return };
    let deployment = Deployment::new();
    let _guard = HostGuard(deployment.root.path().to_path_buf());
    let home = tempfile::tempdir().unwrap();

    let installed = deploy(&deployment, home.path(), &[]);
    assert!(installed.status.success());
    let backend = std::fs::read_to_string(deployment.root.path().join("state/current"))
        .unwrap()
        .trim()
        .to_string();
    let issued = Command::new("docker")
        .args([
            "exec", &backend, "router", "tokens", "issue", "--label", "laptop",
        ])
        .output()
        .unwrap();
    assert!(issued.status.success());
    let token = String::from_utf8_lossy(&issued.stdout)
        .split_whitespace()
        .find(|word| word.starts_with(link_assistant_router::token::TOKEN_PREFIX))
        .expect("the issued token is printed")
        .to_string();
    assert!(authorized(&deployment, &token));

    let uid = id("-u");
    if uid != "0" {
        // The backend ran as root, so the data it wrote is root's: the plan
        // names the one command that hands it to this user.
        let plan = deploy(&deployment, home.path(), &["--mode", "host", "--status"]);
        assert_eq!(plan.status.code(), Some(1));
        assert!(String::from_utf8_lossy(&plan.stdout).contains("blocker=foreign-owned-data"));
        assert!(running(link_assistant_router::deploy::RELAY) && running(&backend));
        let owner = format!("{uid}:{}", id("-g"));
        let chown = Command::new("docker")
            .args(["exec", &backend, "chown", "-R", &owner, "/data/router"])
            .output()
            .unwrap();
        assert!(chown.status.success(), "{chown:?}");
    }

    let plan = deploy(&deployment, home.path(), &["--mode", "host", "--status"]);
    assert!(plan.status.success());
    assert_private(&plan, &token);

    let moved = deploy(&deployment, home.path(), &["--mode", "host"]);
    assert_private(&moved, &token);
    assert!(moved.status.success());
    assert!(!running(link_assistant_router::deploy::RELAY));
    assert!(!running(&backend), "stopped, retained for rollback");
    assert!(
        authorized(&deployment, &token),
        "the same token on the same endpoint"
    );
    assert!(!authorized(&deployment, "la_sk_forged"));

    let back = deploy(&deployment, home.path(), &["--mode", "container"]);
    assert_private(&back, &token);
    assert!(back.status.success());
    assert!(running(link_assistant_router::deploy::RELAY) && running(&backend));
    assert!(!deployment.root.path().join("state/host").exists());
    assert!(authorized(&deployment, &token));
}
