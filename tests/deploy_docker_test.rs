//! `router deploy` against a real container runtime (issues #570, #572).
//!
//! The converge properties are pinned against a fake in `src/deploy_tests.rs`,
//! because they are claims about sequences of runs and need dozens of them. This
//! file answers the question a fake cannot: does the command actually bring a
//! containerised Router up, and does a real daemon behave the way the fake
//! assumes — a container reported `running` that answers `/api/health`, an
//! `inspect` on a missing container that means "absent" rather than "broken".
//!
//! Skipped unless a container runtime is present and an image is named, and it
//! says so rather than passing quietly: a tier that silently no-ops reports
//! success for work it never did (issue #567). Set
//! `ROUTER_DEPLOY_TEST_IMAGE=<tag>` to an already-built Router image — the
//! Dockerfile's release build is far too slow to run inside a test.
//!
//! Unix only: the harness shells out and cleans up with `docker`.
#![cfg(unix)]

use std::process::Command;

mod common;

/// Image under test, when the operator named one.
fn image() -> Option<String> {
    std::env::var("ROUTER_DEPLOY_TEST_IMAGE")
        .ok()
        .filter(|value| !value.trim().is_empty())
}

fn docker_available() -> bool {
    Command::new("docker")
        .args(["info", "--format", "{{.ServerVersion}}"])
        .output()
        .is_ok_and(|output| output.status.success())
}

/// The deployment this test owns, removed when it ends.
///
/// A distinct container name from the production default so a developer's own
/// `router deploy` is never touched by a test run.
struct Deployment {
    root: tempfile::TempDir,
    port: u16,
}

impl Drop for Deployment {
    fn drop(&mut self) {
        let _ = Command::new("docker")
            .args(["rm", "-f", link_assistant_router::deploy::CONTAINER])
            .output();
    }
}

impl Deployment {
    fn new() -> Self {
        // Remove any leftover from an interrupted previous run, so the first
        // converge starts from the state the test means to start from.
        let _ = Command::new("docker")
            .args(["rm", "-f", link_assistant_router::deploy::CONTAINER])
            .output();
        Self {
            root: tempfile::tempdir().expect("deployment root"),
            port: free_port(),
        }
    }

    fn deploy(&self, extra: &[&str]) -> std::process::Output {
        // A caller may name its own image — the moving-reference case — and clap
        // rejects the flag twice, so the default is only added when absent.
        let image = extra
            .iter()
            .position(|argument| *argument == "--image")
            .and_then(|at| extra.get(at + 1).map(|value| (*value).to_string()))
            .unwrap_or_else(|| image().expect("an image was named"));
        let extra: Vec<&str> = {
            let mut kept = Vec::with_capacity(extra.len());
            let mut skip_next = false;
            for argument in extra {
                if skip_next {
                    skip_next = false;
                    continue;
                }
                if *argument == "--image" {
                    skip_next = true;
                    continue;
                }
                kept.push(*argument);
            }
            kept
        };
        let mut arguments = vec![
            "deploy".to_string(),
            "--port".to_string(),
            self.port.to_string(),
            "--image".to_string(),
            image,
            "--root".to_string(),
            self.root.path().display().to_string(),
            "--data-dir".to_string(),
            self.root.path().join("state").display().to_string(),
        ];
        arguments.extend(extra.iter().map(|value| (*value).to_string()));
        Command::new(env!("CARGO_BIN_EXE_link-assistant-router"))
            .args(&arguments)
            .env("TOKEN_SECRET", "deploy-docker-test-secret")
            .env("NO_COLOR", "1")
            .output()
            .expect("the router binary runs")
    }

    fn health(&self) -> bool {
        use std::io::{Read as _, Write as _};
        let Ok(mut stream) = std::net::TcpStream::connect(("127.0.0.1", self.port)) else {
            return false;
        };
        let _ = stream.set_read_timeout(Some(std::time::Duration::from_secs(5)));
        if stream
            .write_all(b"GET /api/health HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n")
            .is_err()
        {
            return false;
        }
        let mut response = String::new();
        stream.read_to_string(&mut response).is_ok() && response.starts_with("HTTP/1.1 200")
    }
}

/// Id of the deployment's container, when one exists.
///
/// A free function rather than a method: the container name is a constant, so
/// this asks nothing of a particular deployment instance.
fn deployed_container_id() -> Option<String> {
    let output = Command::new("docker")
        .args([
            "inspect",
            "--format",
            "{{.Id}}",
            link_assistant_router::deploy::CONTAINER,
        ])
        .output()
        .ok()?;
    output
        .status
        .success()
        .then(|| String::from_utf8_lossy(&output.stdout).trim().to_string())
}

fn free_port() -> u16 {
    std::net::TcpListener::bind("127.0.0.1:0")
        .expect("bind ephemeral")
        .local_addr()
        .expect("address")
        .port()
}

/// Whether this test can run, reporting a visible skip when it cannot.
fn ready(test: &str) -> Option<String> {
    if !docker_available() {
        common::tiers::unavailable(
            common::tiers::Tier::Integration,
            test,
            "a container runtime is not available",
        );
        return None;
    }
    let named = image();
    if named.is_none() {
        common::tiers::unavailable(
            common::tiers::Tier::Integration,
            test,
            "ROUTER_DEPLOY_TEST_IMAGE names no image",
        );
    }
    named
}

/// The headline claim of #570: one command produces a container answering
/// `/api/health`, and a second run reports every step already converged.
#[test]
fn deploy_brings_up_a_container_and_a_second_run_changes_nothing() {
    if ready("deploy_brings_up_a_container_and_a_second_run_changes_nothing").is_none() {
        return;
    }
    let deployment = Deployment::new();

    let first = deployment.deploy(&[]);
    let stdout = String::from_utf8_lossy(&first.stdout);
    assert!(
        first.status.success(),
        "the first converge succeeds: {stdout}{}",
        String::from_utf8_lossy(&first.stderr)
    );
    assert!(
        deployment.health(),
        "the deployment answers /api/health: {stdout}"
    );
    let created = deployed_container_id().expect("a container exists");

    let second = deployment.deploy(&[]);
    let repeated = String::from_utf8_lossy(&second.stdout);
    assert!(second.status.success(), "{repeated}");
    // "Performs no actions" is the property that makes this usable as a fixture.
    assert!(
        !repeated.contains("acted"),
        "a converged deployment acts on nothing: {repeated}"
    );
    assert_eq!(
        deployed_container_id().as_deref(),
        Some(created.as_str()),
        "the same container is kept rather than replaced"
    );
}

/// `--status` reports without changing anything, proven by comparing the
/// container identity across the call.
#[test]
fn status_reports_without_changing_the_deployment() {
    if ready("status_reports_without_changing_the_deployment").is_none() {
        return;
    }
    let deployment = Deployment::new();
    assert!(deployment.deploy(&[]).status.success());
    let before = deployed_container_id().expect("a container");

    let status = deployment.deploy(&["--status"]);
    let stdout = String::from_utf8_lossy(&status.stdout);

    assert!(status.status.success(), "{stdout}");
    assert!(!stdout.contains("acted"), "--status is a report: {stdout}");
    assert_eq!(deployed_container_id().as_deref(), Some(before.as_str()));
}

/// A container stopped out of band is restored on the next run — and restored,
/// not recreated, so the store it holds survives.
#[test]
fn a_stopped_deployment_is_restored_on_the_next_run() {
    if ready("a_stopped_deployment_is_restored_on_the_next_run").is_none() {
        return;
    }
    let deployment = Deployment::new();
    assert!(deployment.deploy(&[]).status.success());
    let before = deployed_container_id().expect("a container");
    assert!(
        Command::new("docker")
            .args(["stop", link_assistant_router::deploy::CONTAINER])
            .output()
            .expect("docker stop")
            .status
            .success()
    );

    let restored = deployment.deploy(&[]);
    let stdout = String::from_utf8_lossy(&restored.stdout);

    assert!(restored.status.success(), "{stdout}");
    assert!(deployment.health(), "it answers again: {stdout}");
    assert_eq!(
        deployed_container_id().as_deref(),
        Some(before.as_str()),
        "the container is started rather than replaced, so its store survives"
    );
}

/// `--down` removes this deployment and leaves unrelated containers alone.
#[test]
fn down_removes_only_this_deployment() {
    if ready("down_removes_only_this_deployment").is_none() {
        return;
    }
    let deployment = Deployment::new();
    assert!(deployment.deploy(&[]).status.success());
    let others_before = other_container_ids();

    // Without consent, nothing is removed: the data directory holds issued
    // tokens and the request log.
    let refused = deployment.deploy(&["--down"]);
    assert!(!refused.status.success());
    assert!(
        String::from_utf8_lossy(&refused.stderr).contains("--yes"),
        "the refusal says how to proceed"
    );
    assert!(deployed_container_id().is_some(), "it still exists");

    let removed = deployment.deploy(&["--down", "--yes"]);
    assert!(removed.status.success());
    assert!(deployed_container_id().is_none(), "it is gone");
    assert_eq!(
        other_container_ids(),
        others_before,
        "unrelated containers are untouched"
    );
}

/// Every container on this machine except the deployment's own.
fn other_container_ids() -> Vec<String> {
    let output = Command::new("docker")
        .args(["ps", "-aq"])
        .output()
        .expect("docker ps");
    let ours = Command::new("docker")
        .args([
            "inspect",
            "--format",
            "{{.Id}}",
            link_assistant_router::deploy::CONTAINER,
        ])
        .output()
        .ok()
        .and_then(|output| {
            output
                .status
                .success()
                .then(|| String::from_utf8_lossy(&output.stdout).trim().to_string())
        });
    String::from_utf8_lossy(&output.stdout)
        .lines()
        .map(str::trim)
        .filter(|id| !id.is_empty())
        // `docker ps -aq` prints short ids; compare on the prefix.
        .filter(|id| ours.as_deref().is_none_or(|ours| !ours.starts_with(*id)))
        .map(str::to_string)
        .collect()
}

/// A failed step names itself, what it expected, what it found, and why the
/// check exists — the shape #572 asks an operator to be able to act on.
#[test]
fn a_failing_step_reports_the_step_and_its_purpose() {
    if ready("a_failing_step_reports_the_step_and_its_purpose").is_none() {
        return;
    }
    let deployment = Deployment::new();

    // A moving image reference is refused before anything is created, so this
    // needs no container and cannot leave one behind.
    let refused = deployment.deploy(&["--image", "ghcr.io/link-assistant/router:latest"]);
    let combined = format!(
        "{}{}",
        String::from_utf8_lossy(&refused.stdout),
        String::from_utf8_lossy(&refused.stderr)
    );

    assert!(!refused.status.success(), "a moving ref fails: {combined}");
    for expected in ["image-ref", "expected:", "found:", "why:"] {
        assert!(
            combined.contains(expected),
            "the report carries {expected}: {combined}"
        );
    }
    assert!(
        deployed_container_id().is_none(),
        "nothing was created: {combined}"
    );
}

/// Per-step timing, because "deployment is slow" is otherwise unactionable.
#[test]
fn each_step_reports_its_duration() {
    if ready("each_step_reports_its_duration").is_none() {
        return;
    }
    let deployment = Deployment::new();

    let output = deployment.deploy(&["--status"]);
    let stdout = String::from_utf8_lossy(&output.stdout);

    assert!(stdout.contains("ms)"), "per-step timing: {stdout}");
    assert!(stdout.contains("total"), "a total: {stdout}");
}

/// No secret reaches the output, asserted on the captured bytes (#572).
#[test]
fn deploy_output_contains_no_secret_material() {
    if ready("deploy_output_contains_no_secret_material").is_none() {
        return;
    }
    let deployment = Deployment::new();

    let output = deployment.deploy(&[]);
    let combined = format!(
        "{}{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );

    assert!(
        !combined.contains("deploy-docker-test-secret"),
        "the signing secret never appears in output: {combined}"
    );
    // The client token is minted but not printed: the deployment holds it, and
    // the caller decides whether a credential reaches a terminal.
    assert!(
        !combined.contains("la_sk_"),
        "no credential is echoed: {combined}"
    );
}
