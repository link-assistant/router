//! Embed immutable source metadata without changing the package version.
use std::process::Command;

fn main() {
    println!("cargo:rerun-if-env-changed=ROUTER_SOURCE_COMMIT");
    // Resolve metadata from the crate directory, including linked worktrees.
    for name in ["HEAD", "refs", "packed-refs"] {
        if let Ok(output) = Command::new("git").args(["rev-parse", "--git-path", name]).output() {
            if output.status.success() {
                let path = String::from_utf8_lossy(&output.stdout);
                let path = path.trim();
                if !path.is_empty() && !path.contains(['\n', '\r']) {
                    println!("cargo:rerun-if-changed={path}");
                }
            }
        }
    }
    let commit = std::env::var("ROUTER_SOURCE_COMMIT")
        .ok()
        .or_else(|| {
            Command::new("git")
                .args(["rev-parse", "HEAD"])
                .output()
                .ok()
                .filter(|output| output.status.success())
                .map(|output| String::from_utf8_lossy(&output.stdout).trim().to_owned())
        })
        .unwrap_or_else(|| "unknown".into());
    assert!(
        commit == "unknown"
            || (commit.len() == 40 && commit.bytes().all(|byte| byte.is_ascii_hexdigit())),
        "invalid ROUTER_SOURCE_COMMIT"
    );
    println!("cargo:rustc-env=ROUTER_SOURCE_COMMIT={commit}");
}
