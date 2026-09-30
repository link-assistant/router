//! Shared, pre-compilation preparation for real vendor verification.

use serde_json::{Value, json};
use std::path::Path;
use std::process::{Command, Stdio};
use std::time::Duration;

/// Native macOS HOME overrides do not isolate the user's Keychain daemon.
///
/// No environment switch can opt out of this boundary. Use a disposable Linux
/// container or runner; a disposable macOS account/VM needs its own verifier.
pub fn safety() -> Result<(), &'static str> {
    safety_for(std::env::consts::OS)
}

fn safety_for(os: &str) -> Result<(), &'static str> {
    if os == "macos" {
        Err(
            "safe OS credential-store boundary unavailable: native macOS vendor probes are refused before version, doctor or TUI; use the disposable Linux verification environment",
        )
    } else {
        Ok(())
    }
}

/// Strip inherited tokens, profile paths, IPC addresses and proxy credentials.
pub fn environment(command: &mut Command, home: &Path) {
    let path = std::env::var_os("PATH").unwrap_or_default();
    command
        .env_clear()
        .env("PATH", path)
        .env("HOME", home)
        .env("XDG_CONFIG_HOME", home.join(".config"))
        .env("XDG_DATA_HOME", home.join(".local/share"))
        .env("XDG_CACHE_HOME", home.join(".cache"))
        .env("CODEX_HOME", home.join(".codex"))
        .env("CLAUDE_CONFIG_DIR", home.join(".claude"))
        .env("CI", "1")
        .env("NO_COLOR", "1")
        .env("NO_PROXY", "127.0.0.1,localhost")
        .env("no_proxy", "127.0.0.1,localhost")
        .env("HTTP_PROXY", "http://127.0.0.1:9")
        .env("HTTPS_PROXY", "http://127.0.0.1:9")
        .env("ALL_PROXY", "http://127.0.0.1:9")
        .stdin(Stdio::null());
}

/// Extract one semantic version; extra banners may vary by vendor.
pub fn parse_version(text: &str) -> Option<String> {
    text.split(|ch: char| !ch.is_ascii_digit() && ch != '.')
        .find(|word| {
            let parts: Vec<_> = word.split('.').collect();
            parts.len() == 3 && parts.iter().all(|part| !part.is_empty())
        })
        .map(str::to_string)
}

pub const CLIENTS: &[(&str, &str)] = &[
    ("claude", "ROUTER_REAL_CLIENT_CLAUDE_VERSION"),
    ("codex", "ROUTER_REAL_CLIENT_CODEX_VERSION"),
    ("opencode", "ROUTER_REAL_CLIENT_OPENCODE_VERSION"),
];

/// Discover before Cargo builds `option_env!` expectations. Caller/CI pins win,
/// but a pin mismatch is a preparation failure, never a compatibility result.
#[must_use]
pub fn prepare(clients: &[&str]) -> (Vec<Value>, Vec<(String, String)>) {
    let mut report = Vec::new();
    let mut variables = Vec::new();
    for &(client, variable) in CLIENTS {
        if !clients.is_empty() && !clients.contains(&client) {
            continue;
        }
        let expected = std::env::var(variable).ok();
        if let Err(reason) = safety() {
            report.push(json!({"client":client,"expected":expected,"observed":null,"status":"not-proven","reason":reason}));
            continue;
        }
        let result = tempfile::tempdir().and_then(|home| {
            let mut command = Command::new(client);
            environment(&mut command, home.path());
            command.arg("--version");
            crate::bounded_process::output(&mut command, Duration::from_secs(15))
        });
        let observed = result
            .as_ref()
            .ok()
            .filter(|output| output.status.success())
            .and_then(|output| {
                parse_version(&format!(
                    "{}{}",
                    String::from_utf8_lossy(&output.stdout),
                    String::from_utf8_lossy(&output.stderr)
                ))
            });
        let (status, reason) = match (&result, &observed, &expected) {
            (Err(error), _, _) if error.kind() == std::io::ErrorKind::NotFound => {
                ("not-proven", "client is not installed")
            }
            (Err(_), _, _) => (
                "failed",
                "version discovery failed or exceeded its deadline",
            ),
            (_, None, _) => (
                "failed",
                "version discovery returned an invalid version or exit status",
            ),
            (_, Some(actual), Some(wanted)) if actual != wanted => {
                ("failed", "expected and installed client versions differ")
            }
            _ => (
                "prepared",
                "installed version discovered before compilation",
            ),
        };
        if status == "prepared" {
            variables.push((
                variable.to_string(),
                observed.clone().expect("prepared version"),
            ));
        }
        report.push(json!({"client":client,"expected":expected,"observed":observed,"status":status,"reason":reason}));
    }
    (report, variables)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn macos_refuses_even_a_version_probe_without_an_os_boundary() {
        assert!(safety_for("macos").is_err());
        assert!(safety_for("linux").is_ok());
    }

    #[test]
    fn versions_are_detected_without_pinning_a_workstation() {
        assert_eq!(parse_version("codex-cli 0.158.0\n"), Some("0.158.0".into()));
        assert_eq!(
            parse_version("2.1.284 (Claude Code)"),
            Some("2.1.284".into())
        );
        assert_eq!(parse_version("1.19.1\n"), Some("1.19.1".into()));
        assert_eq!(parse_version("unknown 1.2"), None);
    }
}
