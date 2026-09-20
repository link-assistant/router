//! `router deploy` against a real container runtime (issues #570, #572, #598).
//!
//! This file answers the questions a fake cannot: whether a containerised Router
//! answers `/api/health`, whether the stable relay keeps an established stream
//! attached to its old backend during cutover, and whether durable state really
//! survives across versioned backend containers.
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
struct Deployment {
    root: tempfile::TempDir,
    port: u16,
}

impl Drop for Deployment {
    fn drop(&mut self) {
        self.remove_owned();
    }
}

impl Deployment {
    fn new() -> Self {
        // Remove any leftover from an interrupted previous run, so the first
        // converge starts from the state the test means to start from.
        let deployment = Self {
            root: tempfile::tempdir().expect("deployment root"),
            port: free_port(),
        };
        deployment.remove_owned();
        deployment
    }

    fn command(&self, extra: &[&str]) -> Command {
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
        let mut command = Command::new(env!("CARGO_BIN_EXE_link-assistant-router"));
        command
            .args(&arguments)
            .env("TOKEN_SECRET", "deploy-docker-test-secret")
            .env("NO_COLOR", "1");
        command
    }

    fn deploy(&self, extra: &[&str]) -> std::process::Output {
        self.command(extra)
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

    fn remove_owned(&self) {
        let root = self.root.path().display().to_string();
        if let Ok(output) = Command::new("docker")
            .args([
                "ps",
                "-aq",
                "--filter",
                &format!("label={}=1", link_assistant_router::deploy::LABEL_KEY),
                "--filter",
                &format!(
                    "label={}.root={root}",
                    link_assistant_router::deploy::LABEL_KEY
                ),
            ])
            .output()
        {
            for id in String::from_utf8_lossy(&output.stdout).split_whitespace() {
                let _ = Command::new("docker").args(["rm", "-f", id]).output();
            }
        }
        let legacy = link_assistant_router::deploy::CONTAINER;
        let legacy_data = Command::new("docker")
            .args([
                "inspect",
                "--format",
                "{{range .Mounts}}{{if eq .Destination \"/data/router\"}}{{.Source}}{{end}}{{end}}",
                legacy,
            ])
            .output()
            .ok()
            .filter(|output| output.status.success())
            .map(|output| String::from_utf8_lossy(&output.stdout).trim().to_string());
        let data_home = self.root.path().join("data").display().to_string();
        if legacy_data.as_deref() == Some(data_home.as_str()) {
            let _ = Command::new("docker").args(["rm", "-f", legacy]).output();
        }
        let _ = Command::new("docker")
            .args(["network", "rm", link_assistant_router::deploy::NETWORK])
            .output();
    }
}

/// A connection accepted before pointer swap remains on the old backend. The
/// coordinator cannot remove that backend until the relay reports zero.
#[test]
fn rolling_update_drains_a_stream_older_than_thirty_seconds() {
    use std::io::{Read as _, Write as _};
    use std::time::{Duration, Instant};
    use wait_timeout::ChildExt as _;

    let Some(source_image) = ready("rolling_update_drains_a_stream_older_than_thirty_seconds")
    else {
        return;
    };
    let deployment = Deployment::new();
    assert!(deployment.deploy(&[]).status.success());
    let old = std::fs::read_to_string(deployment.root.path().join("state/current"))
        .unwrap()
        .trim()
        .to_string();
    let tokens_before = Command::new("docker")
        .args(["exec", &old, "router", "tokens", "list", "--json"])
        .output()
        .unwrap()
        .stdout;
    let retained = deployment.root.path().join("data/selected-server.json");
    std::fs::write(&retained, b"exact-model-server\n").unwrap();
    let alias = format!("router-issue-598:{}", uuid::Uuid::new_v4().simple());
    assert!(
        Command::new("docker")
            .args(["tag", &source_image, &alias])
            .status()
            .unwrap()
            .success()
    );

    let mut stream = std::net::TcpStream::connect(("127.0.0.1", deployment.port)).unwrap();
    stream
        .write_all(b"GET /api/health HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n")
        .unwrap();
    let mut update = deployment.command(&["--image", &alias]).spawn().unwrap();
    let deadline = Instant::now() + Duration::from_secs(120);
    loop {
        let selected = std::fs::read_to_string(deployment.root.path().join("state/current"))
            .unwrap_or_default();
        if !selected.trim().is_empty() && selected.trim() != old {
            break;
        }
        assert!(Instant::now() < deadline, "candidate was never selected");
        std::thread::sleep(Duration::from_millis(100));
    }
    assert!(
        Command::new("docker")
            .args(["inspect", &old])
            .status()
            .unwrap()
            .success(),
        "old backend retired while its stream was open"
    );
    std::thread::sleep(Duration::from_secs(31));
    assert!(
        Command::new("docker")
            .args(["inspect", &old])
            .status()
            .unwrap()
            .success(),
        "old backend did not wait for the long stream"
    );

    stream.write_all(b"\r\n").unwrap();
    let mut response = String::new();
    stream.read_to_string(&mut response).unwrap();
    assert!(response.starts_with("HTTP/1.1 200"), "{response}");
    // `read_to_string` observes the server's write-side EOF, but the relay's
    // bidirectional copy retains the stream until the client write side closes
    // too. Closing here is the point at which this request is truly drained.
    drop(stream);
    assert!(
        update
            .wait_timeout(Duration::from_secs(30))
            .unwrap()
            .expect("update did not finish after the stream drained")
            .success()
    );
    assert!(
        !Command::new("docker")
            .args(["inspect", &old])
            .status()
            .unwrap()
            .success(),
        "old backend remained after connection count reached zero"
    );
    let successor = std::fs::read_to_string(deployment.root.path().join("state/current"))
        .unwrap()
        .trim()
        .to_string();
    assert_eq!(
        Command::new("docker")
            .args(["exec", &successor, "router", "tokens", "list", "--json",])
            .output()
            .unwrap()
            .stdout,
        tokens_before
    );
    assert_eq!(std::fs::read(retained).unwrap(), b"exact-model-server\n");
    let _ = Command::new("docker")
        .args(["image", "rm", &alias])
        .output();
}

/// A pre-policy wrapper record cannot be called exact-model protected. Legacy
/// topology also has no connection counter, so migration is refused until the
/// operator explicitly accepts the named impact.
#[test]
fn legacy_unpinned_runs_are_named_before_forced_migration() {
    use std::time::{Duration, Instant};

    let Some(image) = ready("legacy_unpinned_runs_are_named_before_forced_migration") else {
        return;
    };
    let deployment = Deployment::new();
    std::fs::create_dir_all(deployment.root.path().join("credentials")).unwrap();
    std::fs::create_dir_all(deployment.root.path().join("data")).unwrap();
    let legacy = link_assistant_router::deploy::CONTAINER;
    let output = Command::new("docker")
        .args([
            "run",
            "-d",
            "--name",
            legacy,
            "--label",
            link_assistant_router::deploy::LABEL,
            "-p",
            &format!("127.0.0.1:{}:8080", deployment.port),
            "-v",
            &format!(
                "{}:/data/claude:ro",
                deployment.root.path().join("credentials").display()
            ),
            "-v",
            &format!(
                "{}:/data/router",
                deployment.root.path().join("data").display()
            ),
            "-e",
            "TOKEN_SECRET",
            "-e",
            "DATA_DIR=/data/router",
            "-e",
            "STORAGE_POLICY=text",
            "-e",
            "CLAUDE_CODE_HOME=/data/claude",
            &image,
            "serve",
        ])
        .env("TOKEN_SECRET", "deploy-docker-test-secret")
        .output()
        .unwrap();
    assert!(
        output.status.success(),
        "legacy container: {}",
        String::from_utf8_lossy(&output.stderr)
    );
    let deadline = Instant::now() + Duration::from_secs(120);
    while !deployment.health() {
        assert!(
            Instant::now() < deadline,
            "legacy deployment was not healthy"
        );
        std::thread::sleep(Duration::from_millis(200));
    }

    let admin = Command::new("docker")
        .args([
            "exec",
            legacy,
            "router",
            "tokens",
            "issue",
            "--admin",
            "--ttl-hours",
            "1",
            "--label",
            "migration-admin",
        ])
        .output()
        .unwrap();
    assert!(admin.status.success());
    let admin = String::from_utf8_lossy(&admin.stdout).trim().to_string();
    let script = r"
const response = await fetch('http://127.0.0.1:8080/api/management/tokens/client', {
  method: 'POST',
  headers: {authorization: `Bearer ${process.env.ADMIN}`, 'content-type': 'application/json'},
  body: JSON.stringify({client_kind: 'codex', label: 'pre-policy-wrapper', ttl_hours: 1, ephemeral: true})
});
if (response.status !== 200) throw new Error(`${response.status}: ${await response.text()}`);
";
    let issued = Command::new("docker")
        .args(["exec", "-e", "ADMIN", legacy, "bun", "-e", script])
        .env("ADMIN", admin)
        .output()
        .unwrap();
    assert!(
        issued.status.success(),
        "legacy run credential: {}",
        String::from_utf8_lossy(&issued.stderr)
    );
    let records = Command::new("docker")
        .args(["exec", legacy, "router", "tokens", "list", "--json"])
        .output()
        .unwrap();
    let records: Vec<serde_json::Value> = serde_json::from_slice(&records.stdout).unwrap();
    let run_id = records
        .iter()
        .find(|record| record["label"] == "pre-policy-wrapper")
        .and_then(|record| record["id"].as_str())
        .unwrap()
        .to_string();

    let refused = deployment.deploy(&[]);
    let refusal = format!(
        "{}{}",
        String::from_utf8_lossy(&refused.stdout),
        String::from_utf8_lossy(&refused.stderr)
    );
    assert!(
        !refused.status.success(),
        "migration was not gated: {refusal}"
    );
    for expected in [
        run_id.as_str(),
        "pre-policy-wrapper",
        "legacy-unpinned",
        "--force-update",
    ] {
        assert!(
            refusal.contains(expected),
            "refusal omitted {expected}: {refusal}"
        );
    }
    assert!(
        deployment.health(),
        "refusal interrupted the legacy deployment"
    );

    let migrated = deployment.deploy(&["--force-update"]);
    let migration = format!(
        "{}{}",
        String::from_utf8_lossy(&migrated.stdout),
        String::from_utf8_lossy(&migrated.stderr)
    );
    assert!(
        migrated.status.success(),
        "forced migration failed: {migration}"
    );
    assert!(
        migration.contains(&run_id),
        "force report omitted run id: {migration}"
    );
    assert!(deployment.health(), "relay was not healthy after migration");
    assert!(
        !Command::new("docker")
            .args(["inspect", legacy])
            .status()
            .unwrap()
            .success(),
        "legacy container survived accepted migration"
    );

    // The same record is now in shared managed storage. Even a topology repair
    // must classify it before it starts a serving process.
    assert!(
        Command::new("docker")
            .args(["stop", link_assistant_router::deploy::RELAY])
            .status()
            .unwrap()
            .success()
    );
    let refused_repair = deployment.deploy(&[]);
    let repair_refusal = format!(
        "{}{}",
        String::from_utf8_lossy(&refused_repair.stdout),
        String::from_utf8_lossy(&refused_repair.stderr)
    );
    assert!(!refused_repair.status.success(), "{repair_refusal}");
    assert!(repair_refusal.contains(&run_id), "{repair_refusal}");
    let relay_running = Command::new("docker")
        .args([
            "inspect",
            "--format",
            "{{.State.Running}}",
            link_assistant_router::deploy::RELAY,
        ])
        .output()
        .unwrap();
    assert_eq!(
        String::from_utf8_lossy(&relay_running.stdout).trim(),
        "false",
        "a refused repair changed serving state"
    );

    let forced_repair = deployment.deploy(&["--force-update"]);
    assert!(
        forced_repair.status.success(),
        "{}{}",
        String::from_utf8_lossy(&forced_repair.stdout),
        String::from_utf8_lossy(&forced_repair.stderr)
    );
    assert!(
        deployment.health(),
        "forced repair did not restore the relay"
    );
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
            link_assistant_router::deploy::RELAY,
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
    let owned = owned_container_ids(deployment.root.path());
    let current_path = deployment.root.path().join("state/current");
    let active_path = deployment.root.path().join("state/active");
    let current = std::fs::read(&current_path).unwrap();
    let active = std::fs::read(&active_path).unwrap();
    let backend = String::from_utf8(current.clone())
        .unwrap()
        .trim()
        .to_string();
    let tokens = Command::new("docker")
        .args(["exec", &backend, "router", "tokens", "list", "--json"])
        .output()
        .unwrap()
        .stdout;

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
    assert_eq!(owned_container_ids(deployment.root.path()), owned);
    assert_eq!(std::fs::read(current_path).unwrap(), current);
    assert_eq!(std::fs::read(active_path).unwrap(), active);
    assert_eq!(
        Command::new("docker")
            .args(["exec", &backend, "router", "tokens", "list", "--json"])
            .output()
            .unwrap()
            .stdout,
        tokens,
        "a no-op deploy does not mint or rewrite a token"
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
    let current_path = deployment.root.path().join("state/current");
    let active_path = deployment.root.path().join("state/active");
    let current_before = std::fs::read(&current_path).unwrap();
    let active_before = std::fs::read(&active_path).unwrap();
    let owned_before = owned_container_ids(deployment.root.path());

    let status = deployment.deploy(&["--status"]);
    let stdout = String::from_utf8_lossy(&status.stdout);

    assert!(status.status.success(), "{stdout}");
    assert!(!stdout.contains("acted"), "--status is a report: {stdout}");
    for field in [
        "old_backend=",
        "candidate_backend=",
        "connections=",
        "run_inventory",
        "credential_ownership=",
        "force_update_interrupts=",
    ] {
        assert!(stdout.contains(field), "status omitted {field}: {stdout}");
    }
    assert_eq!(deployed_container_id().as_deref(), Some(before.as_str()));
    assert_eq!(std::fs::read(current_path).unwrap(), current_before);
    assert_eq!(std::fs::read(active_path).unwrap(), active_before);
    assert_eq!(owned_container_ids(deployment.root.path()), owned_before);
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
            .args(["stop", link_assistant_router::deploy::RELAY])
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
    let others_before = other_container_ids(deployment.root.path());

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
        other_container_ids(deployment.root.path()),
        others_before,
        "unrelated containers are untouched"
    );
}

/// Every container on this machine except the deployment's own.
fn other_container_ids(root: &std::path::Path) -> Vec<String> {
    let output = Command::new("docker")
        .args(["ps", "-aq"])
        .output()
        .expect("docker ps");
    let ours = Command::new("docker")
        .args([
            "ps",
            "-aq",
            "--filter",
            &format!("label={}=1", link_assistant_router::deploy::LABEL_KEY),
            "--filter",
            &format!(
                "label={}.root={}",
                link_assistant_router::deploy::LABEL_KEY,
                root.display()
            ),
        ])
        .output()
        .ok()
        .filter(|output| output.status.success())
        .map(|output| {
            String::from_utf8_lossy(&output.stdout)
                .split_whitespace()
                .map(str::to_string)
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();
    String::from_utf8_lossy(&output.stdout)
        .lines()
        .map(str::trim)
        .filter(|id| !id.is_empty())
        // `docker ps -aq` prints short ids; compare on the prefix.
        .filter(|id| !ours.iter().any(|ours| ours.starts_with(*id)))
        .map(str::to_string)
        .collect()
}

fn owned_container_ids(root: &std::path::Path) -> Vec<String> {
    let output = Command::new("docker")
        .args([
            "ps",
            "-aq",
            "--filter",
            &format!("label={}=1", link_assistant_router::deploy::LABEL_KEY),
            "--filter",
            &format!(
                "label={}.root={}",
                link_assistant_router::deploy::LABEL_KEY,
                root.display()
            ),
        ])
        .output()
        .unwrap();
    let mut ids = String::from_utf8_lossy(&output.stdout)
        .split_whitespace()
        .map(str::to_string)
        .collect::<Vec<_>>();
    ids.sort();
    ids
}

/// A refused image names the invariant and why the supplied ref is unsafe.
#[test]
fn a_failing_image_check_reports_an_actionable_reason() {
    if ready("a_failing_image_check_reports_an_actionable_reason").is_none() {
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
    for expected in ["image-ref", "moving reference", "release tag or a digest"] {
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
