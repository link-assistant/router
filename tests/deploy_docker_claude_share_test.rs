//! `router deploy --claude-credentials share` against a real container runtime
//! (issue #622).
//!
//! The unit tests prove which mounts the coordinator asks for; only a real
//! runtime proves the properties the operator relies on: the backend reads the
//! host's live file rather than a copy, a rotation written on either side is the
//! other's next read, and a file the backend writes stays owned by the host
//! user so the host CLI can still open it.
//!
//! The login is a stand-in in a temporary `CLAUDE_CONFIG_DIR`; the operator's
//! real `~/.claude` is never read. Skipped, visibly, unless a container runtime
//! is present and `ROUTER_DEPLOY_TEST_IMAGE` names an already-built image.
#![cfg(unix)]

use std::os::unix::fs::MetadataExt as _;
use std::path::Path;
use std::process::{Command, Output};

mod common;

const ACCESS: &str = "sk-ant-oat01-deploy-share-stand-in-access";
const REFRESH: &str = "sk-ant-ort01-deploy-share-stand-in-refresh";
const ROTATED: &str = "sk-ant-ort01-deploy-share-stand-in-rotated";

fn ready(test: &str) -> Option<String> {
    let docker = Command::new("docker")
        .args(["info", "--format", "{{.ServerVersion}}"])
        .output()
        .is_ok_and(|output| output.status.success());
    if !docker {
        common::tiers::unavailable(
            common::tiers::Tier::Integration,
            test,
            "a container runtime is not available",
        );
        return None;
    }
    let image = std::env::var("ROUTER_DEPLOY_TEST_IMAGE")
        .ok()
        .filter(|value| !value.trim().is_empty());
    if image.is_none() {
        common::tiers::unavailable(
            common::tiers::Tier::Integration,
            test,
            "ROUTER_DEPLOY_TEST_IMAGE names no image",
        );
    }
    image
}

/// A deployment root and a stand-in Claude Code home, removed when dropped.
struct Deployment {
    image: String,
    root: tempfile::TempDir,
    claude: tempfile::TempDir,
    port: u16,
}

impl Drop for Deployment {
    fn drop(&mut self) {
        let _ = self.deploy(&["--down", "--yes"]);
    }
}

impl Deployment {
    fn new(image: String) -> Self {
        let port = std::net::TcpListener::bind("127.0.0.1:0")
            .and_then(|listener| listener.local_addr())
            .expect("a free port")
            .port();
        Self {
            image,
            root: tempfile::tempdir().expect("deployment root"),
            claude: tempfile::tempdir().expect("Claude Code home"),
            port,
        }
    }

    fn login(&self, refresh: &str) {
        let expires = (chrono::Utc::now() + chrono::Duration::hours(12)).timestamp_millis();
        let document = serde_json::json!({
            "claudeAiOauth": {
                "accessToken": ACCESS,
                "refreshToken": refresh,
                "expiresAt": expires,
                "scopes": ["user:inference"],
            }
        });
        std::fs::write(self.credential(), document.to_string()).expect("stand-in login");
    }

    fn credential(&self) -> std::path::PathBuf {
        self.claude.path().join(".credentials.json")
    }

    fn deploy(&self, extra: &[&str]) -> Output {
        Command::new(env!("CARGO_BIN_EXE_link-assistant-router"))
            .arg("deploy")
            .args(["--port", &self.port.to_string(), "--image", &self.image])
            .arg("--root")
            .arg(self.root.path())
            .arg("--data-dir")
            .arg(self.root.path().join("state"))
            .args(extra)
            .env("CLAUDE_CONFIG_DIR", self.claude.path())
            .env("TOKEN_SECRET", "deploy-share-test-signing-secret")
            .env("NO_COLOR", "1")
            .output()
            .expect("the router binary runs")
    }

    fn backend(&self) -> String {
        std::fs::read_to_string(self.root.path().join("state/current"))
            .expect("an active backend")
            .trim()
            .to_string()
    }
}

fn text(output: &Output) -> String {
    format!(
        "{}{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    )
}

fn assert_no_credential(output: &str) {
    for secret in [ACCESS, REFRESH, ROTATED, "stand-in"] {
        assert!(!output.contains(secret), "credential bytes were printed");
    }
}

fn exec(backend: &str, command: &[&str]) -> Output {
    Command::new("docker")
        .args(["exec", backend])
        .args(command)
        .output()
        .expect("docker exec runs")
}

fn host_uid(path: &Path) -> u32 {
    std::fs::metadata(path).expect("metadata").uid()
}

#[test]
fn a_shared_login_is_one_live_file_owned_by_the_host_user() {
    let Some(image) = ready("a_shared_login_is_one_live_file_owned_by_the_host_user") else {
        return;
    };
    let deployment = Deployment::new(image);
    deployment.login(REFRESH);
    let owner = host_uid(&deployment.credential());

    let first = deployment.deploy(&["--claude-credentials", "share"]);
    let output = text(&first);
    assert_no_credential(&output);
    assert!(first.status.success(), "{output}");
    assert!(
        output.contains("anthropic_credential=imported method=shared-mount")
            && output.contains("refresh_tokens_copied=0"),
        "{output}"
    );
    let backend = deployment.backend();

    let uid = exec(&backend, &["id", "-u"]);
    assert_eq!(
        String::from_utf8_lossy(&uid.stdout).trim(),
        owner.to_string()
    );
    let inside = exec(&backend, &["cat", "/data/claude/.credentials.json"]);
    assert_eq!(
        inside.stdout,
        std::fs::read(deployment.credential()).unwrap(),
        "the backend reads the host's file, not a copy"
    );

    // The host CLI rotates: the backend's next read is the successor.
    deployment.login(ROTATED);
    let inside = exec(&backend, &["cat", "/data/claude/.credentials.json"]);
    assert!(
        String::from_utf8_lossy(&inside.stdout).contains(ROTATED),
        "a host rotation is visible to the backend"
    );

    // The backend writes by rename beside the file: the host can still open it.
    let written = exec(
        &backend,
        &["sh", "-c", "echo rotated > /data/claude/.rotation-probe"],
    );
    assert!(written.status.success(), "{}", text(&written));
    assert_eq!(
        host_uid(&deployment.claude.path().join(".rotation-probe")),
        owner
    );

    // A routine update omits the flag and keeps the shared login unchanged.
    let second = deployment.deploy(&[]);
    let output = text(&second);
    assert_no_credential(&output);
    assert!(second.status.success(), "{output}");
    assert!(output.contains("already converged"), "{output}");
    assert_eq!(deployment.backend(), backend);
}

#[test]
fn an_unusable_login_is_refused_before_any_container_exists() {
    let Some(image) = ready("an_unusable_login_is_refused_before_any_container_exists") else {
        return;
    };
    let deployment = Deployment::new(image);

    let refused = deployment.deploy(&["--claude-credentials", "share"]);
    let output = text(&refused);
    assert_eq!(refused.status.code(), Some(2), "{output}");
    assert!(
        output.contains("anthropic_credential=refused") && output.contains("log in first"),
        "{output}"
    );
    assert!(
        !deployment.root.path().join("state/current").exists(),
        "no backend was started: {output}"
    );
}
