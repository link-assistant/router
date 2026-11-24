//! Secret-safety and compatibility coverage for persisted server selection.

#![cfg(unix)]

use std::fs;
use std::process::{Command, Output};

fn server_status(home: &std::path::Path) -> Output {
    Command::new(env!("CARGO_BIN_EXE_link-assistant-router"))
        .args(["server", "status"])
        .env("HOME", home)
        .env("TOKEN_SECRET", "legacy-load-secret")
        .env_remove("XDG_CONFIG_HOME")
        .env_remove("APPDATA")
        .output()
        .expect("server status runs")
}

#[test]
fn an_unsafe_legacy_selection_fails_closed_without_echoing_secrets() {
    let home = tempfile::tempdir().expect("temporary home");
    let directory = home.path().join(".config/link-assistant-router");
    fs::create_dir_all(&directory).expect("create config directory");
    fs::write(
        directory.join("server.json"),
        r#"{"server":"https://private-user:private-password@router.example/?token=private-query","token":"la_sk_private"}"#,
    )
    .expect("seed unsafe legacy selection");
    let output = server_status(home.path());
    assert!(!output.status.success());
    let rendered = format!(
        "{}{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );
    for secret in [
        "private-user",
        "private-password",
        "private-query",
        "la_sk_private",
    ] {
        assert!(
            !rendered.contains(secret),
            "legacy rejection leaked {secret}: {rendered}"
        );
    }
}

/// State written by an earlier release is JSON, and must keep loading: the
/// stores moved to links notation without changing their file names, so an
/// existing installation migrates on its next write rather than losing its
/// configuration (issue #235).
#[test]
fn a_json_server_selection_from_an_earlier_release_still_loads() {
    let home = tempfile::tempdir().expect("temporary home");
    let directory = home.path().join(".config/link-assistant-router");
    fs::create_dir_all(&directory).expect("create config directory");
    fs::write(
        directory.join("server.json"),
        r#"{"server":"https://legacy.example","token":"la_sk_legacy","run_max_requests":5}"#,
    )
    .expect("seed a legacy JSON selection");
    let output = server_status(home.path());
    let rendered = format!(
        "{}{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );
    assert!(
        rendered.contains("https://legacy.example"),
        "the legacy selection must still load: {rendered}"
    );
    assert!(!rendered.contains("la_sk_legacy"), "{rendered}");
}
