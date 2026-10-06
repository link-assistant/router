//! Embed immutable source metadata without changing the package version.
use std::process::Command;

fn main() {
    println!("cargo:rerun-if-env-changed=ROUTER_SOURCE_COMMIT");
    println!("cargo:rerun-if-changed=.git/HEAD");
    println!("cargo:rerun-if-changed=.git/refs");
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
