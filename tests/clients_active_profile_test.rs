//! Regression coverage for issue #610: a running client blocks lifecycle
//! operations only on the profile it can write.
//!
//! macOS used to refuse whenever any process of that name ran, so an unrelated
//! `claude` under the normal home blocked backup, reset, restore and even a
//! maintenance dry-run of a separate `--home` fixture. These tests run on
//! every unix, which includes the macOS CI runner.
#![cfg(unix)]

mod common;

use common::router_with_env;
use std::fs;
use std::path::Path;
use std::process::{Child, Command};
use std::time::{Duration, Instant};

/// A long-running process whose name is `name`, launched with only `env`.
///
/// macOS names a process after the file it executed, so a copy of `sleep`
/// works there. Linux takes the name from the script path instead, which
/// keeps working where `sleep` is a multi-call binary that dispatches on it.
fn spawn_client(directory: &Path, name: &str, env: &[(&str, &Path)]) -> Running {
    use std::os::unix::fs::PermissionsExt as _;

    fs::create_dir_all(directory).unwrap();
    let binary = directory.join(name);
    if cfg!(target_os = "linux") {
        fs::write(
            &binary,
            "#!/bin/sh\n[ \"$1\" = --version ] && exit 1\nwhile :; do sleep 1; done\n",
        )
        .unwrap();
    } else {
        fs::copy("/bin/sleep", &binary).unwrap();
    }
    fs::set_permissions(&binary, fs::Permissions::from_mode(0o755)).unwrap();
    let mut command = Command::new(&binary);
    command.arg("30").env_clear().env("PATH", "/usr/bin:/bin");
    for (key, value) in env {
        command.env(key, value);
    }
    // Owned by the guard at once, so a panic below still reaps it.
    let child = Running(command.spawn().unwrap());
    let pid = child.0.id().to_string();
    let deadline = Instant::now() + Duration::from_secs(10);
    while Instant::now() < deadline {
        let listed = Command::new("pgrep").args(["-x", name]).output().unwrap();
        if String::from_utf8_lossy(&listed.stdout)
            .lines()
            .any(|line| line.trim() == pid)
        {
            return child;
        }
        std::thread::sleep(Duration::from_millis(50));
    }
    panic!("{name} process {pid} never became visible to pgrep");
}

struct Running(Child);

impl Drop for Running {
    fn drop(&mut self) {
        let _ = self.0.kill();
        let _ = self.0.wait();
    }
}

/// A synthetic Claude profile, normal and Router-owned, under `home`.
fn claude_fixture(home: &Path) {
    let normal = home.join(".claude");
    let owned = home.join(".config/link-assistant-router/clients/claude/home");
    for profile in [&normal, &owned] {
        fs::create_dir_all(profile.join("projects")).unwrap();
        fs::write(profile.join("projects/session.jsonl"), b"session").unwrap();
        fs::write(profile.join("settings.json"), b"{\"theme\":\"dark\"}").unwrap();
    }
}

fn clients(user: &Path, fixture: &Path, args: &[&str], path: &str) -> std::process::Output {
    let mut all = vec!["clients", "--home", fixture.to_str().unwrap()];
    all.extend_from_slice(args);
    router_with_env(user, &all, &[("PATH", path)])
}

fn stderr(output: &std::process::Output) -> String {
    String::from_utf8_lossy(&output.stderr).into_owned()
}

#[test]
fn a_client_running_under_another_home_does_not_block_a_fixture() {
    let user = tempfile::tempdir().unwrap();
    let fixture = tempfile::tempdir().unwrap();
    let bin = tempfile::tempdir().unwrap();
    claude_fixture(fixture.path());
    let path = format!("{}:/usr/bin:/bin", bin.path().display());
    let _claude = spawn_client(bin.path(), "claude", &[("HOME", user.path())]);
    let _codex = spawn_client(bin.path(), "codex", &[("HOME", user.path())]);

    let created = clients(
        user.path(),
        fixture.path(),
        &["backup", "create", "claude", "--profile", "both"],
        &path,
    );
    assert!(created.status.success(), "{}", stderr(&created));
    let id = String::from_utf8(created.stdout).unwrap();
    let id = id.trim();

    let reset = clients(
        user.path(),
        fixture.path(),
        &[
            "reset",
            "claude",
            "--profile",
            "both",
            "--dry-run",
            "--json",
        ],
        &path,
    );
    assert!(reset.status.success(), "{}", stderr(&reset));

    let restored = clients(
        user.path(),
        fixture.path(),
        &["backup", "restore", id, "--dry-run"],
        &path,
    );
    assert!(restored.status.success(), "{}", stderr(&restored));

    let update = clients(
        user.path(),
        fixture.path(),
        &["update", "--all", "--dry-run", "--json"],
        &path,
    );
    let plans: serde_json::Value = serde_json::from_slice(&update.stdout).unwrap();
    for plan in plans.as_array().unwrap() {
        assert_ne!(plan["status"], "blocked", "{plan}");
    }
}

#[test]
fn a_client_writing_the_fixture_still_blocks_it() {
    let user = tempfile::tempdir().unwrap();
    let fixture = tempfile::tempdir().unwrap();
    let bin = tempfile::tempdir().unwrap();
    claude_fixture(fixture.path());
    let path = format!("{}:/usr/bin:/bin", bin.path().display());
    let backup = ["backup", "create", "claude", "--profile", "normal"];

    {
        let _claude = spawn_client(bin.path(), "claude", &[("HOME", fixture.path())]);
        let blocked = clients(user.path(), fixture.path(), &backup, &path);
        assert!(!blocked.status.success());
        assert!(
            stderr(&blocked).contains("claude is running with the normal profile"),
            "{}",
            stderr(&blocked)
        );
        let update = clients(
            user.path(),
            fixture.path(),
            &["update", "claude", "--dry-run", "--json"],
            &path,
        );
        let plans: serde_json::Value = serde_json::from_slice(&update.stdout).unwrap();
        assert_eq!(plans[0]["status"], "blocked", "{}", plans[0]);
    }

    // The home alone is not the profile: a redirected config dir is matched.
    let config = fixture.path().join(".claude");
    let _claude = spawn_client(
        bin.path(),
        "claude",
        &[("HOME", user.path()), ("CLAUDE_CONFIG_DIR", &config)],
    );
    let blocked = clients(user.path(), fixture.path(), &backup, &path);
    assert!(!blocked.status.success());
    assert!(
        stderr(&blocked).contains("is running"),
        "{}",
        stderr(&blocked)
    );
    let backups = fixture
        .path()
        .join(".config/link-assistant-router/client-backups");
    assert!(
        !backups.exists()
            || !backups.read_dir().unwrap().any(|entry| entry
                .unwrap()
                .file_name()
                .to_string_lossy()
                .len()
                == 32)
    );
}
