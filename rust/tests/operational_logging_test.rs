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
fn explicit_command_errors_stay_visible_and_persist_without_duplicate_verbose_output() {
    for verbose in [false, true] {
        let home = tempfile::tempdir().unwrap();
        let mut command = Command::new(env!("CARGO_BIN_EXE_router"));
        command.args(["tokens", "issue", "--local"]);
        if verbose {
            command.arg("--verbose");
        }
        let output = command
            .env_clear()
            .env("HOME", home.path())
            .env("DATA_DIR", home.path().join("data"))
            .env("TOKEN_SECRET", "")
            .output()
            .unwrap();
        assert_eq!(output.status.code(), Some(2));
        let console = String::from_utf8_lossy(&output.stderr);
        let message = "TOKEN_SECRET environment variable is required";
        assert_eq!(console.matches(message).count(), 1, "{console}");
        let log = std::fs::read_to_string(home.path().join("data/logs/operational.log"))
            .expect("explicit command diagnostics persist");
        assert!(log.contains(message), "{log}");
        assert!(log.contains("process_exit exit_code=2"), "{log}");
    }
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

#[test]
fn an_unusable_log_destination_reports_the_initialization_failure() {
    let home = tempfile::tempdir().unwrap();
    std::fs::write(home.path().join("logs"), "an existing file").unwrap();
    let output = Command::new(env!("CARGO_BIN_EXE_router"))
        .args(["version", "--data-dir"])
        .arg(home.path())
        .env_clear()
        .env("HOME", home.path())
        .output()
        .unwrap();
    assert_eq!(output.status.code(), Some(1));
    assert!(output.stdout.is_empty());
    assert!(String::from_utf8_lossy(&output.stderr).contains("cannot initialize operational log"));
    assert_eq!(
        std::fs::read_to_string(home.path().join("logs")).unwrap(),
        "an existing file"
    );
}
