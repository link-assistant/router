//! Read-only/refused commands cannot acquire a workstation deployment.
use std::path::Path;
use std::process::{Command, Output};
use std::time::Duration;

fn command(home: &Path, args: &[&str]) -> Output {
    let mut command = Command::new(env!("CARGO_BIN_EXE_router"));
    command
        .args(args)
        .env_clear()
        .env("HOME", home)
        .env("APPDATA", home.join("config"))
        .env("LOCALAPPDATA", home.join("local"))
        .env("DATA_DIR", home.join("router-data"));
    link_assistant_router::bounded_process::output(&mut command, Duration::from_secs(15)).unwrap()
}

#[test]
fn absent_staging_status_and_verification_are_read_only_without_docker() {
    let home = tempfile::tempdir().unwrap();
    for operation in ["--status", "--verify"] {
        let output = command(
            home.path(),
            &["deploy", "--staging", "disposable", operation, "--json"],
        );
        assert!(
            output.status.success(),
            "{}",
            String::from_utf8_lossy(&output.stderr)
        );
        let report: serde_json::Value = serde_json::from_slice(&output.stdout).unwrap();
        assert_eq!(report["namespace"], "router-stage-disposable");
        assert_eq!(report["status"], "absent");
        assert_eq!(report["parity"], false);
        assert!(!home.path().join("router-data").exists());
    }
}

#[test]
fn invalid_staging_identity_reports_refusal_before_any_files_are_created() {
    let home = tempfile::tempdir().unwrap();
    let output = command(
        home.path(),
        &["deploy", "--staging", "../primary", "--json"],
    );
    assert!(!output.status.success());
    let report: serde_json::Value = serde_json::from_slice(&output.stdout).unwrap();
    assert_eq!(report["status"], "refused");
    assert_eq!(report["parity"], false);
    assert!(report["reason"].as_str().unwrap().contains("staging NAME"));
    assert!(!home.path().join("router-data").exists());
}

#[test]
fn restore_requires_consent_and_rejects_conflicting_deployment_operations() {
    let home = tempfile::tempdir().unwrap();
    for options in [
        vec![],
        vec!["--yes", "--down"],
        vec!["--yes", "--staging", "candidate"],
        vec!["--yes", "--force-update"],
    ] {
        let mut args = vec!["deploy", "--restore-state", "private-checkpoint"];
        args.extend(options);
        let output = command(home.path(), &args);
        assert!(!output.status.success());
        let error = String::from_utf8_lossy(&output.stderr);
        assert!(
            error.contains("required") || error.contains("cannot be used with"),
            "{error}"
        );
        assert!(!home.path().join("router-data").exists());
    }
}
