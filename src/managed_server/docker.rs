//! Docker command boundary for managed Router lifecycle operations.

use std::ffi::OsStr;
use std::process::Command;

use super::{AnyError, CONTAINER, compact};

pub(super) fn docker_container_state() -> Result<String, AnyError> {
    let output = Command::new("docker")
        .args([
            "inspect",
            "--format",
            "{{if .State.Running}}running{{else}}stopped{{end}} {{index .Config.Labels \"com.link-assistant.router.managed\"}}",
            CONTAINER,
        ])
        .output();
    let output = match output {
        Ok(output) => output,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
            return Err("Docker is not installed".into());
        }
        Err(error) => return Err(error.into()),
    };
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        // Case-insensitively: Docker spells this `No such object` and Docker
        // Desktop `no such object`, and matching only the capitalised form
        // read "this container does not exist yet" as a hard inspect failure.
        // The container that should then have been created never was, so
        // `with` failed in exactly the situation the managed path exists to
        // handle, naming an internal container the user has never heard of
        // (issue #333).
        let lowered = stderr.to_ascii_lowercase();
        if lowered.contains("no such object") || lowered.contains("no such container") {
            return Ok("absent".into());
        }
        return Err(format!("could not inspect {CONTAINER}: {}", compact(&stderr)).into());
    }
    let rendered = String::from_utf8_lossy(&output.stdout);
    let (state, label) = rendered.trim().split_once(' ').unwrap_or(("", ""));
    if label != "1" {
        return Err(format!(
            "container {CONTAINER} exists but is not owned by this wrapper; rename or remove it before retrying"
        )
        .into());
    }
    Ok(state.to_string())
}

pub(super) fn docker_subscription_status() -> String {
    let output = Command::new("docker")
        .args(["exec", CONTAINER, "link-assistant-router", "auth", "status"])
        .output();
    match output {
        Ok(output) if output.status.success() => compact(&String::from_utf8_lossy(&output.stdout)),
        Ok(output) => format!(
            "unavailable ({})",
            compact(&String::from_utf8_lossy(&output.stderr))
        ),
        Err(error) => format!("unavailable ({error})"),
    }
}

pub(super) fn ensure_docker() -> Result<(), AnyError> {
    let output = Command::new("docker")
        .args(["info", "--format", "{{.ServerVersion}}"])
        .output();
    let output = match output {
        Ok(output) => output,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
            return Err("Docker is not installed; install Docker or pass --server <URL>".into());
        }
        Err(error) => return Err(error.into()),
    };
    if output.status.success() {
        return Ok(());
    }
    let stderr = String::from_utf8_lossy(&output.stderr);
    if stderr.to_ascii_lowercase().contains("permission denied") {
        Err("permission denied while connecting to Docker; add this user to the Docker group or pass --server <URL>".into())
    } else {
        Err(format!(
            "the Docker daemon is not running or unreachable; start Docker or pass --server <URL>: {}",
            compact(&stderr)
        )
        .into())
    }
}

pub(super) fn docker_checked<I, S>(args: I) -> Result<(), AnyError>
where
    I: IntoIterator<Item = S>,
    S: AsRef<OsStr>,
{
    let output = Command::new("docker").args(args).output()?;
    check_docker_output(&output)
}

pub(super) fn check_docker_output(output: &std::process::Output) -> Result<(), AnyError> {
    if output.status.success() {
        Ok(())
    } else {
        Err(format!(
            "Docker command failed: {}",
            compact(&String::from_utf8_lossy(&output.stderr))
        )
        .into())
    }
}
