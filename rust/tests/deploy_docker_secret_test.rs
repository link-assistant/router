//! `TOKEN_SECRET` is part of the local launch specification (issue #625).
//!
//! v1.14.3 called a deploy with another signing secret "already converged",
//! and an update with a mistaken secret broke every issued client token
//! while `/api/health` stayed green. This test deploys with secret A, issues
//! a client token, then deploys A → B → A on one image and root, checking
//! real HTTP authorization through the relay, the backend and its token
//! records, and that neither secret nor the token is ever printed. Skipped,
//! visibly, without a container runtime or `ROUTER_DEPLOY_TEST_IMAGE`.
#![cfg(unix)]

use std::io::{Read as _, Write as _};
use std::process::{Command, Output};

mod common;
#[path = "deploy_docker/harness.rs"]
mod harness;

use harness::{Deployment, ready, token_records};

const SECRET_A: &str = "deploy-docker-test-secret";
const SECRET_B: &str = "deploy-docker-mistaken-secret";

fn deploy(deployment: &Deployment, secret: &str, extra: &[&str]) -> Output {
    deployment
        .command(extra)
        .env("TOKEN_SECRET", secret)
        .output()
        .expect("the router binary runs")
}

fn serving(deployment: &Deployment) -> String {
    std::fs::read_to_string(deployment.root.path().join("state/current"))
        .unwrap()
        .trim()
        .to_string()
}

fn container_id(name: &str) -> String {
    let output = Command::new("docker")
        .args(["inspect", "--format", "{{.Id}}", name])
        .output()
        .unwrap();
    String::from_utf8_lossy(&output.stdout).trim().to_string()
}

/// The HTTP status the deployment answers an authenticated request with.
fn models_status(deployment: &Deployment, token: &str) -> u16 {
    let mut stream = std::net::TcpStream::connect(("127.0.0.1", deployment.port)).unwrap();
    stream
        .set_read_timeout(Some(std::time::Duration::from_secs(10)))
        .unwrap();
    write!(
        stream,
        "GET /api/models HTTP/1.1\r\nHost: localhost\r\nAuthorization: Bearer {token}\r\nConnection: close\r\n\r\n"
    )
    .unwrap();
    let mut response = String::new();
    stream.read_to_string(&mut response).unwrap();
    response
        .split_whitespace()
        .nth(1)
        .and_then(|status| status.parse().ok())
        .unwrap_or_else(|| panic!("no HTTP status in {:?}", response.lines().next()))
}

fn authorized(deployment: &Deployment, token: &str) -> bool {
    // 403 is the answer for a token without a managed-client binding: the
    // signature was accepted. 401 means the backend rejected the token.
    models_status(deployment, token) != 401
}

fn assert_private(output: &Output, token: &str) {
    for stream in [&output.stdout, &output.stderr] {
        let text = String::from_utf8_lossy(stream);
        for secret in [SECRET_A, SECRET_B, token] {
            assert!(!text.contains(secret), "a secret was printed: {text}");
        }
    }
}

#[test]
fn a_to_b_to_a_keeps_issued_tokens_authorized_and_recovers_without_an_image_switch() {
    let test = "a_to_b_to_a_keeps_issued_tokens_authorized_and_recovers_without_an_image_switch";
    let Some(_image) = ready(test) else { return };
    let deployment = Deployment::new();
    let first = deploy(&deployment, SECRET_A, &[]);
    assert!(first.status.success(), "{first:?}");
    let backend = serving(&deployment);
    let backend_id = container_id(&backend);
    let issued = Command::new("docker")
        .args([
            "exec", &backend, "router", "tokens", "issue", "--label", "laptop",
        ])
        .output()
        .unwrap();
    assert!(issued.status.success());
    // Kept in memory only; `assert_private` proves it is never printed.
    let token = String::from_utf8_lossy(&issued.stdout).trim().to_string();
    assert!(authorized(&deployment, &token));
    let tokens_before = token_records(&backend);

    // B on the same image and root is a launch-specification change,
    // refused before anything is touched.
    let wrong = deploy(&deployment, SECRET_B, &[]);
    assert_private(&wrong, &token);
    assert_eq!(wrong.status.code(), Some(2), "{wrong:?}");
    assert!(String::from_utf8_lossy(&wrong.stderr).contains("TOKEN_SECRET differs"));
    let report = deploy(&deployment, SECRET_B, &["--status"]);
    assert_private(&report, &token);
    assert!(String::from_utf8_lossy(&report.stdout).contains("token_secret=changed"));
    assert_eq!(container_id(&backend), backend_id);
    assert!(authorized(&deployment, &token));

    // A again changes nothing.
    let same = deploy(&deployment, SECRET_A, &[]);
    assert_private(&same, &token);
    assert!(same.status.success(), "{same:?}");
    assert!(String::from_utf8_lossy(&same.stdout).contains("already converged"));
    assert_eq!(container_id(&backend), backend_id);
    assert!(authorized(&deployment, &token));
    assert_eq!(token_records(&backend), tokens_before);

    // Forcing B strands the tokens, as v1.14.3 did silently.
    let forced = deploy(&deployment, SECRET_B, &["--force-update"]);
    assert_private(&forced, &token);
    assert!(forced.status.success(), "{forced:?}");
    assert!(String::from_utf8_lossy(&forced.stdout).contains("token_probe=skipped"));
    assert!(!authorized(&deployment, &token));

    // The saved secret is detected on the same image and root, and applied
    // deliberately without removing a container by hand.
    let refused = deploy(&deployment, SECRET_A, &[]);
    assert_private(&refused, &token);
    assert_eq!(refused.status.code(), Some(2), "{refused:?}");
    let recovered = deploy(&deployment, SECRET_A, &["--force-update"]);
    assert_private(&recovered, &token);
    assert!(recovered.status.success(), "{recovered:?}");
    assert!(authorized(&deployment, &token));
    assert_eq!(token_records(&serving(&deployment)), tokens_before);

    // An ordinary update now proves token continuity before cutover.
    let status = deploy(&deployment, SECRET_A, &["--status"]);
    assert!(String::from_utf8_lossy(&status.stdout).contains("token_secret=matches"));
    assert!(deployment.health());
}
