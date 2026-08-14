//! Recovery of the router-generated managed bootstrap administrator.

use std::process::Command;

use super::{AnyError, check_docker_output};

pub(super) fn read_token(container: &str) -> Result<String, AnyError> {
    const MARKER: &str = "Admin token (shown once, store it now):";
    let output = Command::new("docker").args(["logs", container]).output()?;
    check_docker_output(&output)?;
    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);
    stdout
        .lines()
        .chain(stderr.lines())
        .find_map(|line| {
            line.find(MARKER)
                .map(|position| line[position + MARKER.len()..].trim())
                .filter(|token| {
                    token.starts_with("la_sk_") && !token.contains(char::is_whitespace)
                })
                .map(str::to_string)
        })
        .ok_or_else(|| {
            format!(
                "managed router did not expose its bootstrap administrator in `docker logs {container}`; inspect the container startup logs"
            )
            .into()
        })
}
