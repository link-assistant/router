//! Persistent diagnostics must survive a process that fails before serving.
use std::process::Command;

#[test]
fn early_configuration_failure_has_a_durable_exit_record() {
    let home = tempfile::tempdir().unwrap();
    let output = Command::new(env!("CARGO_BIN_EXE_router"))
        .args(["serve", "--host", "127.0.0.1"])
        .env("HOME", home.path())
        .env("DATA_DIR", home.path().join("data"))
        .env("TOKEN_SECRET", "")
        .env_remove("TOKEN_SECRET_FILE")
        .env_remove("RUST_LOG")
        .env_remove("VERBOSE")
        .output()
        .unwrap();
    assert!(!output.status.success());
    let log = std::fs::read_to_string(home.path().join("data/logs/operational.log"))
        .expect("early errors must persist without terminal redirection");
    assert!(log.contains("process_start"), "{log}");
    assert!(log.contains("Configuration error"), "{log}");
    assert!(
        log.contains("process_exit") && log.contains("exit_code=2"),
        "{log}"
    );
    assert!(output.stdout.is_empty());
    assert!(output.stderr.is_empty(), "{:?}", output.stderr);
}

#[test]
fn explicit_json_results_remain_machine_readable() {
    let home = tempfile::tempdir().unwrap();
    let output = Command::new(env!("CARGO_BIN_EXE_router"))
        .args(["version", "--json"])
        .env("HOME", home.path())
        .env("DATA_DIR", home.path().join("data"))
        .output()
        .unwrap();
    assert!(output.status.success());
    let result: serde_json::Value = serde_json::from_slice(&output.stdout).unwrap();
    assert_eq!(result["data"]["version"], link_assistant_router::VERSION);
    assert!(output.stderr.is_empty());
    assert!(home.path().join("data/logs/operational.log").exists());
}

#[test]
fn explicit_data_directory_wins_over_environment() {
    let home = tempfile::tempdir().unwrap();
    let selected = home.path().join("selected");
    let output = Command::new(env!("CARGO_BIN_EXE_router"))
        .args(["version", "--data-dir"])
        .arg(&selected)
        .env("HOME", home.path())
        .env("DATA_DIR", home.path().join("ignored"))
        .output()
        .unwrap();
    assert!(output.status.success());
    assert!(selected.join("logs/operational.log").exists());
    assert!(!home.path().join("ignored/logs").exists());
}
