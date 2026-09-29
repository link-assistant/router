//! The `router deploy` harness shared by the real-container test files.
//!
//! Each test owns a temporary deployment root and a free loopback port; its
//! containers are removed when the `Deployment` drops.

#![allow(dead_code)]

use std::process::Command;

use crate::common;

/// Image under test, when the operator named one.
pub fn image() -> Option<String> {
    std::env::var("ROUTER_DEPLOY_TEST_IMAGE")
        .ok()
        .filter(|value| !value.trim().is_empty())
}

pub fn docker_available() -> bool {
    Command::new("docker")
        .args(["info", "--format", "{{.ServerVersion}}"])
        .output()
        .is_ok_and(|output| output.status.success())
}

/// The deployment this test owns, removed when it ends.
pub struct Deployment {
    pub root: tempfile::TempDir,
    pub port: u16,
}

impl Drop for Deployment {
    fn drop(&mut self) {
        self.remove_owned();
    }
}

impl Deployment {
    pub fn new() -> Self {
        // Remove any leftover from an interrupted previous run, so the first
        // converge starts from the state the test means to start from.
        let deployment = Self {
            root: tempfile::tempdir().expect("deployment root"),
            port: free_port(),
        };
        deployment.remove_owned();
        deployment
    }

    pub fn command(&self, extra: &[&str]) -> Command {
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

    pub fn deploy(&self, extra: &[&str]) -> std::process::Output {
        self.command(extra)
            .output()
            .expect("the router binary runs")
    }

    pub fn health(&self) -> bool {
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

    pub fn remove_owned(&self) {
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

/// The backend's issued tokens, keyed by id. Compared as records rather
/// than bytes: a release before #618 listed them in per-process hash order.
pub fn token_records(container: &str) -> std::collections::BTreeMap<String, serde_json::Value> {
    let output = Command::new("docker")
        .args(["exec", container, "router", "tokens", "list", "--json"])
        .output()
        .unwrap();
    assert!(output.status.success(), "tokens list failed in {container}");
    let records: Vec<serde_json::Value> = serde_json::from_slice(&output.stdout).unwrap();
    records
        .into_iter()
        .map(|record| (record["id"].as_str().unwrap().to_string(), record))
        .collect()
}

pub fn free_port() -> u16 {
    std::net::TcpListener::bind("127.0.0.1:0")
        .expect("bind ephemeral")
        .local_addr()
        .expect("address")
        .port()
}

/// Whether this test can run, reporting a visible skip when it cannot.
pub fn ready(test: &str) -> Option<String> {
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
