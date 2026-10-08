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

fn assert_no_deployment_state(home: &Path) {
    let data = home.join("router-data");
    if !data.exists() {
        return;
    }
    // Early operational diagnostics must not create deployment state.
    let entries = std::fs::read_dir(data)
        .unwrap()
        .map(|entry| entry.unwrap().file_name())
        .collect::<Vec<_>>();
    assert_eq!(entries, [std::ffi::OsString::from("logs")]);
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
        let report: serde_json::Value =
            link_assistant_router::contracts::validation::cli_payload(&output.stdout).unwrap();
        assert_eq!(report["namespace"], "router-stage-disposable");
        assert_eq!(report["status"], "absent");
        assert_eq!(report["parity"], false);
        assert_no_deployment_state(home.path());
    }
}

#[test]
fn invalid_staging_identity_reports_refusal_without_deployment_state() {
    let home = tempfile::tempdir().unwrap();
    let output = command(
        home.path(),
        &["deploy", "--staging", "../primary", "--json"],
    );
    assert!(!output.status.success());
    let report: serde_json::Value =
        link_assistant_router::contracts::validation::cli_payload(&output.stdout).unwrap();
    assert_eq!(report["status"], "refused");
    assert_eq!(report["parity"], false);
    assert!(report["reason"].as_str().unwrap().contains("staging NAME"));
    assert_no_deployment_state(home.path());
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
        assert_no_deployment_state(home.path());
    }
}
