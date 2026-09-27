//! Regression coverage for issue #606's local binary maintenance.

mod common;

#[cfg(unix)]
use common::router;
use common::router_with_env;
#[cfg(unix)]
use std::fs;

#[test]
fn maintenance_dry_run_reports_each_client_without_mutation() {
    let home = tempfile::tempdir().unwrap();
    let empty_path = tempfile::tempdir().unwrap();
    let output = router_with_env(
        home.path(),
        &["clients", "update", "--all", "--dry-run", "--json"],
        &[("PATH", empty_path.path().to_str().unwrap())],
    );
    assert!(!output.status.success());
    let plans: serde_json::Value = serde_json::from_slice(&output.stdout).unwrap();
    assert_eq!(plans.as_array().unwrap().len(), 8);
    assert!(
        plans
            .as_array()
            .unwrap()
            .iter()
            .all(|plan| plan["status"] == "unsupported")
    );
    assert!(
        !home
            .path()
            .join(".config/link-assistant-router/client-backups")
            .exists()
    );
}

#[cfg(unix)]
#[test]
fn npm_maintenance_verifies_versions_and_preserves_profiles() {
    use std::os::unix::fs::PermissionsExt;

    let home = tempfile::tempdir().unwrap();
    let global = home.path().join("npm-global");
    let bin = global.join("bin");
    fs::create_dir_all(&bin).unwrap();
    let version = home.path().join("codex-version");
    fs::write(&version, "codex 1.0\n").unwrap();
    let profile = home.path().join(".codex");
    fs::create_dir_all(&profile).unwrap();
    fs::write(profile.join("config.toml"), "model = 'old'\n").unwrap();

    let npm = bin.join("npm");
    fs::write(
        &npm,
        "#!/bin/sh\nif [ \"$1\" = root ]; then printf '%s\\n' \"$MOCK_NPM_ROOT\"; exit 0; fi\nif [ \"$MOCK_NPM_FAIL\" = yes ]; then exit 1; fi\nprintf '%s\\n' \"$MOCK_NPM_VERSION\" > \"$MOCK_VERSION_FILE\"\n",
    )
    .unwrap();
    let codex = bin.join("codex");
    fs::write(
        &codex,
        "#!/bin/sh\nif [ \"$1\" = --version ]; then /bin/cat \"$MOCK_VERSION_FILE\"; else exit 1; fi\n",
    )
    .unwrap();
    for script in [&npm, &codex] {
        let mut permissions = fs::metadata(script).unwrap().permissions();
        permissions.set_mode(0o700);
        fs::set_permissions(script, permissions).unwrap();
    }
    let path = format!("{}:{}", bin.display(), std::env::var("PATH").unwrap());
    let global = global.to_str().unwrap();
    let version_file = version.to_str().unwrap();
    let env = [
        ("PATH", path.as_str()),
        ("MOCK_NPM_ROOT", global),
        ("MOCK_VERSION_FILE", version_file),
        ("MOCK_NPM_VERSION", "codex 2.0"),
    ];

    let preview = router_with_env(
        home.path(),
        &[
            "clients",
            "update",
            "codex",
            "--latest",
            "--dry-run",
            "--json",
        ],
        &env,
    );
    assert!(
        preview.status.success(),
        "{}",
        String::from_utf8_lossy(&preview.stderr)
    );
    let plans: serde_json::Value = serde_json::from_slice(&preview.stdout).unwrap();
    assert_eq!(plans[0]["method"], "npm");
    assert_eq!(plans[0]["status"], "planned");
    assert_eq!(plans[0]["command"][3], "@openai/codex@latest");
    assert_eq!(fs::read_to_string(&version).unwrap(), "codex 1.0\n");

    let updated = router_with_env(
        home.path(),
        &["clients", "update", "codex", "--latest", "--json"],
        &env,
    );
    assert!(
        updated.status.success(),
        "{}",
        String::from_utf8_lossy(&updated.stderr)
    );
    let plans: serde_json::Value = serde_json::from_slice(&updated.stdout).unwrap();
    assert_eq!(plans[0]["status"], "completed");
    assert_eq!(plans[0]["version_before"], "codex 1.0");
    assert_eq!(plans[0]["version_after"], "codex 2.0");
    assert_eq!(
        fs::read_to_string(profile.join("config.toml")).unwrap(),
        "model = 'old'\n"
    );

    let unchanged = router_with_env(
        home.path(),
        &["clients", "update", "codex", "--latest", "--json"],
        &env,
    );
    assert!(unchanged.status.success());
    let plans: serde_json::Value = serde_json::from_slice(&unchanged.stdout).unwrap();
    assert_eq!(plans[0]["status"], "current");

    let failed = router_with_env(
        home.path(),
        &["clients", "update", "codex", "--latest", "--json"],
        &[env.as_slice(), &[("MOCK_NPM_FAIL", "yes")]].concat(),
    );
    assert!(!failed.status.success());
    let plans: serde_json::Value = serde_json::from_slice(&failed.stdout).unwrap();
    assert_eq!(plans[0]["status"], "failed");
    assert_eq!(fs::read_to_string(&version).unwrap(), "codex 2.0\n");

    let reinstalled = router_with_env(
        home.path(),
        &[
            "clients",
            "reinstall",
            "codex",
            "--latest",
            "--yes",
            "--json",
        ],
        &[env.as_slice(), &[("MOCK_NPM_VERSION", "codex 3.0")]].concat(),
    );
    assert!(
        reinstalled.status.success(),
        "{}",
        String::from_utf8_lossy(&reinstalled.stderr)
    );
    let plans: serde_json::Value = serde_json::from_slice(&reinstalled.stdout).unwrap();
    assert_eq!(plans[0]["status"], "completed");
    assert_eq!(plans[0]["version_after"], "codex 3.0");
    let id = plans[0]["backup_id"].as_str().unwrap();
    assert!(
        router(home.path(), &["clients", "backup", "verify", id])
            .status
            .success()
    );
    assert_eq!(
        fs::read_to_string(profile.join("config.toml")).unwrap(),
        "model = 'old'\n"
    );
}

#[cfg(unix)]
#[test]
fn native_claude_update_and_reinstall_keep_sessions_and_login() {
    use std::os::unix::fs::PermissionsExt;

    let home = tempfile::tempdir().unwrap();
    let bin = home.path().join(".local/bin");
    fs::create_dir_all(&bin).unwrap();
    let version = home.path().join("claude-version");
    let invocation = home.path().join("claude-invocation");
    fs::write(&version, "claude 1.0\n").unwrap();
    let claude = bin.join("claude");
    fs::write(
        &claude,
        "#!/bin/sh\nif [ \"$1\" = --version ]; then /bin/cat \"$MOCK_VERSION_FILE\"; exit 0; fi\nprintf '%s\\n' \"$*\" > \"$MOCK_INVOCATION\"\nprintf '%s\\n' \"$MOCK_NEXT_VERSION\" > \"$MOCK_VERSION_FILE\"\n",
    )
    .unwrap();
    let mut permissions = fs::metadata(&claude).unwrap().permissions();
    permissions.set_mode(0o700);
    fs::set_permissions(&claude, permissions).unwrap();
    let profile = home.path().join(".claude");
    fs::create_dir_all(profile.join("projects")).unwrap();
    fs::write(profile.join("projects/session.jsonl"), "session").unwrap();
    fs::write(profile.join(".credentials.json"), "login").unwrap();
    fs::write(
        profile.join("settings.json"),
        "{\"autoUpdatesChannel\":\"stable\"}",
    )
    .unwrap();
    let path = format!("{}:{}", bin.display(), std::env::var("PATH").unwrap());
    let env = [
        ("PATH", path.as_str()),
        ("MOCK_VERSION_FILE", version.to_str().unwrap()),
        ("MOCK_INVOCATION", invocation.to_str().unwrap()),
        ("MOCK_NEXT_VERSION", "claude 2.0"),
    ];

    let preview = router_with_env(
        home.path(),
        &[
            "clients",
            "reinstall",
            "claude",
            "--channel",
            "stable",
            "--dry-run",
            "--json",
        ],
        &env,
    );
    assert!(
        preview.status.success(),
        "{}",
        String::from_utf8_lossy(&preview.stderr)
    );
    let plans: serde_json::Value = serde_json::from_slice(&preview.stdout).unwrap();
    assert_eq!(plans[0]["method"], "native");
    assert_eq!(plans[0]["channel"], "stable");
    assert_eq!(plans[0]["command"][1], "install");
    assert_eq!(plans[0]["command"][2], "stable");
    assert!(!invocation.exists());

    let updated = router_with_env(
        home.path(),
        &["clients", "update", "claude", "--json"],
        &env,
    );
    assert!(
        updated.status.success(),
        "{}",
        String::from_utf8_lossy(&updated.stderr)
    );
    let plans: serde_json::Value = serde_json::from_slice(&updated.stdout).unwrap();
    assert_eq!(plans[0]["status"], "completed");
    assert_eq!(plans[0]["version_after"], "claude 2.0");
    assert_eq!(fs::read_to_string(&invocation).unwrap(), "update\n");

    let reinstalled = router_with_env(
        home.path(),
        &[
            "clients",
            "reinstall",
            "claude",
            "--channel",
            "stable",
            "--yes",
            "--json",
        ],
        &[env.as_slice(), &[("MOCK_NEXT_VERSION", "claude 3.0")]].concat(),
    );
    assert!(
        reinstalled.status.success(),
        "{}",
        String::from_utf8_lossy(&reinstalled.stderr)
    );
    let plans: serde_json::Value = serde_json::from_slice(&reinstalled.stdout).unwrap();
    assert_eq!(plans[0]["status"], "completed");
    assert_eq!(plans[0]["version_after"], "claude 3.0");
    assert_eq!(fs::read_to_string(&invocation).unwrap(), "install stable\n");
    let id = plans[0]["backup_id"].as_str().unwrap();
    assert!(
        router(home.path(), &["clients", "backup", "verify", id])
            .status
            .success()
    );
    assert_eq!(
        fs::read_to_string(profile.join("projects/session.jsonl")).unwrap(),
        "session"
    );
    assert_eq!(
        fs::read_to_string(profile.join(".credentials.json")).unwrap(),
        "login"
    );
}
