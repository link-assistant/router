//! The container runtime boundary, so converge logic is testable without Docker.
//!
//! Every step in [`crate::deploy`] reaches the outside world only through
//! [`ContainerRuntime`]. That keeps the interesting part — the order of checks,
//! what counts as converged, which failures are the deployment's fault —
//! exercisable in milliseconds against a fake, while the real implementation
//! stays a thin, auditable shell around `docker`.
//!
//! The split matters for correctness, not just speed: the properties worth
//! pinning are things like "a second run performs no actions" and "a stopped
//! container is restored", which need many runs from many starting states. A
//! suite that can only express them against a real daemon expresses few of them.

use std::process::Command;
use std::time::Duration;

/// What a container is doing, as far as the runtime can tell.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ContainerState {
    /// No container by that name.
    Absent,
    /// Exists and is running. Not the same as answering — see
    /// [`ContainerRuntime::health`].
    Running,
    /// Exists and is not running.
    Stopped,
}

impl ContainerState {
    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Absent => "absent",
            Self::Running => "running",
            Self::Stopped => "stopped",
        }
    }
}

/// How a container should be created.
#[derive(Debug, Clone)]
pub struct RunSpec {
    pub name: String,
    pub image: String,
    /// Host port published to the container's listener.
    pub port: u16,
    /// `(host, container, read_only)` mounts.
    ///
    /// The credential mount is read-only and the data directory is separate,
    /// because the request log cannot live on a read-only mount — a lesson the
    /// issue records as a real failure (#570).
    pub mounts: Vec<(String, String, bool)>,
    /// Environment passed to the container. Values are never logged.
    pub env: Vec<(String, String)>,
    pub label: String,
}

/// Everything the deployment needs from a container runtime.
pub trait ContainerRuntime: Send + Sync {
    /// Fail if the runtime is unusable, with an operator-readable reason.
    fn available(&self) -> Result<String, String>;

    /// State of one container by name.
    fn state(&self, name: &str) -> Result<ContainerState, String>;

    /// Create and start a container.
    fn run(&self, spec: &RunSpec) -> Result<(), String>;

    /// Start an existing, stopped container.
    fn start(&self, name: &str) -> Result<(), String>;

    /// Remove a container, running or not.
    fn remove(&self, name: &str) -> Result<(), String>;

    /// Whether an image exists locally.
    fn image_present(&self, image: &str) -> Result<bool, String>;

    /// Build `image` from `context`, at an immutable ref.
    fn build(&self, image: &str, context: &str) -> Result<(), String>;

    /// The image a container was created from, for proving `--status` changed
    /// nothing.
    fn container_image(&self, name: &str) -> Result<Option<String>, String>;

    /// `GET /api/health` against the published port, following the rule that a
    /// container can be `Up` and not answer.
    fn health(&self, port: u16) -> bool;

    /// Names of containers holding `port`, so a stray instance is found before
    /// traffic silently goes to an old version.
    fn listeners_on(&self, port: u16) -> Result<Vec<String>, String>;

    /// Run a command inside the container, for the token and status steps.
    fn exec(&self, name: &str, arguments: &[&str]) -> Result<String, String>;
}

/// The real runtime: a thin shell around the `docker` CLI.
#[derive(Debug, Default)]
pub struct Docker;

impl Docker {
    fn docker(arguments: &[&str]) -> Result<String, String> {
        let output = Command::new("docker").args(arguments).output();
        let output = match output {
            Ok(output) => output,
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
                return Err("Docker is not installed".to_string());
            }
            Err(error) => return Err(error.to_string()),
        };
        if output.status.success() {
            return Ok(String::from_utf8_lossy(&output.stdout).trim().to_string());
        }
        Err(compact(&String::from_utf8_lossy(&output.stderr)))
    }
}

/// Collapse a multi-line command error into one readable line.
fn compact(text: &str) -> String {
    text.split_whitespace().collect::<Vec<_>>().join(" ")
}

impl ContainerRuntime for Docker {
    fn available(&self) -> Result<String, String> {
        Self::docker(&["info", "--format", "{{.ServerVersion}}"]).map_err(|error| {
            let lowered = error.to_ascii_lowercase();
            if lowered.contains("permission denied") {
                "permission denied while connecting to Docker; add this user to the Docker group"
                    .to_string()
            } else if lowered.contains("not installed") {
                error
            } else {
                format!("the Docker daemon is not running or unreachable: {error}")
            }
        })
    }

    fn state(&self, name: &str) -> Result<ContainerState, String> {
        match Self::docker(&[
            "inspect",
            "--format",
            "{{if .State.Running}}running{{else}}stopped{{end}}",
            name,
        ]) {
            Ok(rendered) if rendered == "running" => Ok(ContainerState::Running),
            Ok(_) => Ok(ContainerState::Stopped),
            Err(error) if is_absent(&error) => Ok(ContainerState::Absent),
            Err(error) => Err(error),
        }
    }

    fn run(&self, spec: &RunSpec) -> Result<(), String> {
        let port = format!("127.0.0.1:{}:8080", spec.port);
        let mut arguments: Vec<String> = vec![
            "run".into(),
            "-d".into(),
            "--name".into(),
            spec.name.clone(),
            "--label".into(),
            spec.label.clone(),
            "-p".into(),
            port,
        ];
        for (host, container, read_only) in &spec.mounts {
            arguments.push("-v".into());
            arguments.push(if *read_only {
                format!("{host}:{container}:ro")
            } else {
                format!("{host}:{container}")
            });
        }
        // Names are passed on the command line; values are handed over through
        // the child's environment so a secret never reaches `ps` or a shell
        // history (issue #572).
        for (key, _) in &spec.env {
            arguments.push("-e".into());
            arguments.push(key.clone());
        }
        arguments.push(spec.image.clone());
        arguments.push("serve".into());

        let mut command = Command::new("docker");
        command.args(&arguments);
        for (key, value) in &spec.env {
            command.env(key, value);
        }
        let output = command.output().map_err(|error| error.to_string())?;
        if output.status.success() {
            Ok(())
        } else {
            Err(compact(&String::from_utf8_lossy(&output.stderr)))
        }
    }

    fn start(&self, name: &str) -> Result<(), String> {
        Self::docker(&["start", name]).map(|_| ())
    }

    fn remove(&self, name: &str) -> Result<(), String> {
        Self::docker(&["rm", "-f", name]).map(|_| ())
    }

    fn image_present(&self, image: &str) -> Result<bool, String> {
        match Self::docker(&["image", "inspect", "--format", "{{.Id}}", image]) {
            Ok(id) => Ok(!id.is_empty()),
            Err(error) if is_absent(&error) => Ok(false),
            Err(error) => Err(error),
        }
    }

    fn build(&self, image: &str, context: &str) -> Result<(), String> {
        Self::docker(&["build", "-t", image, context]).map(|_| ())
    }

    fn container_image(&self, name: &str) -> Result<Option<String>, String> {
        match Self::docker(&["inspect", "--format", "{{.Image}}", name]) {
            Ok(id) => Ok(Some(id)),
            Err(error) if is_absent(&error) => Ok(None),
            Err(error) => Err(error),
        }
    }

    fn health(&self, port: u16) -> bool {
        use std::io::{Read as _, Write as _};

        let Ok(mut stream) = std::net::TcpStream::connect(("127.0.0.1", port)) else {
            return false;
        };
        let _ = stream.set_read_timeout(Some(Duration::from_secs(2)));
        let _ = stream.set_write_timeout(Some(Duration::from_secs(2)));
        if stream
            .write_all(b"GET /api/health HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n")
            .is_err()
        {
            return false;
        }
        let mut response = String::new();
        stream.read_to_string(&mut response).is_ok() && response.starts_with("HTTP/1.1 200")
    }

    fn listeners_on(&self, port: u16) -> Result<Vec<String>, String> {
        let rendered = Self::docker(&[
            "ps",
            "--filter",
            &format!("publish={port}"),
            "--format",
            "{{.Names}}",
        ])?;
        Ok(rendered
            .lines()
            .map(str::trim)
            .filter(|name| !name.is_empty())
            .map(str::to_string)
            .collect())
    }

    fn exec(&self, name: &str, arguments: &[&str]) -> Result<String, String> {
        let mut full = vec!["exec", name];
        full.extend_from_slice(arguments);
        Self::docker(&full)
    }
}

/// Whether a Docker error means "that object does not exist".
///
/// Matched case-insensitively because Docker and Docker Desktop disagree on the
/// capitalisation, and reading "does not exist yet" as a hard failure meant the
/// container that should then have been created never was (issue #333).
fn is_absent(error: &str) -> bool {
    let lowered = error.to_ascii_lowercase();
    lowered.contains("no such object")
        || lowered.contains("no such container")
        || lowered.contains("no such image")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn docker_absence_messages_are_recognised_in_either_spelling() {
        // Docker Desktop lowercases this; the capitalised form is Docker's own.
        assert!(is_absent("Error: No such object: router-deploy"));
        assert!(is_absent("error: no such container: router-deploy"));
        assert!(is_absent("No such image: ghcr.io/x:1"));
        // A daemon that is down is *not* an absent container: treating it as one
        // would report a deployment as "needs creating" while nothing can run.
        assert!(!is_absent("Cannot connect to the Docker daemon"));
    }

    #[test]
    fn multiline_command_errors_collapse_to_one_line() {
        assert_eq!(
            compact("failed:\n  because\n  reasons"),
            "failed: because reasons"
        );
    }
}
