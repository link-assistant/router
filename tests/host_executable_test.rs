//! A real Router CLI keeps working when its installed executable is renamed.
#![cfg(unix)]

#[test]
fn renamed_router_cli_validates_its_actual_daemon_version() {
    let root = tempfile::tempdir().unwrap();
    let binary = root.path().join("router-installed-under-another-name");
    std::fs::copy(env!("CARGO_BIN_EXE_router"), &binary).unwrap();
    let output = std::process::Command::new(&binary)
        .args(["deploy", "--mode", "host", "--status", "--json", "--root"])
        .arg(root.path().join("deployment"))
        .env_clear()
        .env("HOME", root.path())
        .env("DATA_DIR", root.path().join("data"))
        .env("TOKEN_SECRET", "renamed-router-fixture-secret")
        .env("STORAGE_POLICY", "text")
        .current_dir(root.path())
        .output()
        .unwrap();
    assert!(
        output.status.success(),
        "{} {}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );
    let report: serde_json::Value = serde_json::from_slice(&output.stdout).unwrap();
    assert_eq!(
        report["data"]["host_router"]["executable"],
        binary.to_str().unwrap()
    );
    assert_eq!(
        report["data"]["host_router"]["version"],
        link_assistant_router::VERSION
    );
    assert_eq!(report["data"]["status_is_read_only"], true);
}
