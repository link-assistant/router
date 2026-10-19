//! Managed lifecycle diagnostics with the shared operational sink.
use super::*;

#[test]
fn reaper_reports_cleanup_failures() {
    let data_dir = tempfile::tempdir().expect("operational log directory");
    let output = Command::new(env!("CARGO_BIN_EXE_link-assistant-router"))
        .args(["server", "reap", "4294967294"])
        .arg("--data-dir")
        .arg(data_dir.path())
        .env_remove("HOME")
        .env_remove("XDG_CONFIG_HOME")
        .env_remove("APPDATA")
        .output()
        .expect("run crash reaper without a state directory");

    assert!(!output.status.success());
    let stderr = String::from_utf8_lossy(&output.stderr);
    assert!(stderr.contains("could not reap managed router reference 4294967294"));
    assert!(stderr.contains("HOME, XDG_CONFIG_HOME, and APPDATA are unset"));
}

#[test]
fn managed_claim_is_one_time_and_requires_a_later_token() {
    let directory = tempfile::tempdir().expect("temporary test directory");
    let home = directory.path().join("home");
    let bin = directory.path().join("bin");
    let log = directory.path().join("docker.log");
    fs::create_dir_all(&home).expect("create home");
    fs::write(&log, "").expect("create Docker log");
    fake_docker(&bin);
    seed_managed_state(&home, 18080);

    let claimed = server_command(&home, &bin, &log, "running", &["claim"]);
    assert!(claimed.status.success());
    assert_eq!(
        String::from_utf8_lossy(&claimed.stdout),
        "la_sk_managed-test\n"
    );
    assert!(String::from_utf8_lossy(&claimed.stderr).contains("future `with` runs require"));
    assert!(
        fs::read_to_string(managed_state_path(&home))
            .expect("read claimed state")
            .contains("claimed true")
    );
    let repeated = server_command(&home, &bin, &log, "running", &["claim"]);
    assert!(!repeated.status.success());
    assert!(
        repeated.stdout.is_empty(),
        "credential must not be printed twice"
    );
    assert!(String::from_utf8_lossy(&repeated.stderr).contains("already claimed"));

    let (port, router) = mock_managed_router(false, 2);
    seed_claimed_managed_state(&home, port);
    let inherited_path = std::env::var_os("PATH").unwrap_or_default();
    let path =
        std::env::join_paths(std::iter::once(bin).chain(std::env::split_paths(&inherited_path)))
            .expect("compose PATH");
    let rejected = with_router_command(&home)
        .arg("codex")
        .env("PATH", path)
        .env("DOCKER_LOG", &log)
        .env("FAKE_DOCKER_STATE", "running")
        .output()
        .expect("run claimed managed router without token");
    assert!(!rejected.status.success());
    assert!(
        rejected.stderr.is_empty(),
        "quiet launcher diagnostics belong in the log"
    );
    let error = fs::read_to_string(home.join(".link-assistant-router/logs/operational.log"))
        .expect("persistent managed launcher failure");
    assert!(error.contains("is claimed and no token is available"));
    assert!(error.contains("docker exec link-assistant-router-managed"));
    assert_eq!(
        router.join().expect("managed router thread"),
        ["/api/health", "/api/health"]
    );
}
