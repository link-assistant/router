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

/// Compile an ordinary executable under the client's real process name.
/// Apple's protected binaries cannot safely be copied/re-signed on every Mac
/// (#636). This fixture has no vendor code, credential-store access or children.
/// Write once so no running executable is rewritten.
fn spawn_client(directory: &Path, name: &str, env: &[(&str, &Path)]) -> Running {
    fs::create_dir_all(directory).unwrap();
    let binary = directory.join(name);
    if !binary.exists() {
        let built = Command::new("rustc")
            .args(["--edition=2024", "--crate-name", "idle_client"])
            .arg(Path::new(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures/process/idle.rs"))
            .arg("-o")
            .arg(&binary)
            .output()
            .expect("compile portable client fixture");
        assert!(
            built.status.success(),
            "{}",
            String::from_utf8_lossy(&built.stderr)
        );
    }
    let mut command = Command::new(&binary);
    command.arg("3600").env_clear().env("PATH", "/usr/bin:/bin");
    for (key, value) in env {
        command.env(key, value);
    }
    // Owned by the guard at once, so a panic below still reaps it.
    let mut child = Running(spawn_retrying_busy(&mut command));
    wait_visible(&mut child, name).unwrap_or_else(|error| panic!("{error}"));
    child
}

fn wait_visible(child: &mut Running, name: &str) -> Result<(), String> {
    let pid = child.0.id().to_string();
    let deadline = Instant::now() + Duration::from_secs(10);
    while Instant::now() < deadline {
        if let Some(status) = child.0.try_wait().unwrap() {
            return Err(format!(
                "{name} fixture exited ({status}) before pgrep; {}",
                child.describe()
            ));
        }
        let listed = Command::new("pgrep").args(["-x", name]).output().unwrap();
        if String::from_utf8_lossy(&listed.stdout)
            .lines()
            .any(|line| line.trim() == pid)
        {
            let shown = child.describe();
            // The profile detection needs the environment, not only the name.
            assert!(
                shown.contains("HOME="),
                "fixture environment is hidden: {shown}"
            );
            return Ok(());
        }
        std::thread::sleep(Duration::from_millis(50));
    }
    Err(format!(
        "{name} process {pid} never became visible to pgrep; {}",
        child.describe()
    ))
}

/// Another test thread may fork while this one still holds the new script
/// open for writing, and exec then fails with ETXTBSY until that child execs.
fn spawn_retrying_busy(command: &mut Command) -> Child {
    let deadline = Instant::now() + Duration::from_secs(5);
    loop {
        match command.spawn() {
            Err(error) if error.raw_os_error() == Some(26) && Instant::now() < deadline => {
                std::thread::sleep(Duration::from_millis(20));
            }
            result => return result.unwrap(),
        }
    }
}

struct Running(Child);

impl Running {
    /// Fail with what `ps` saw unless the fixture is still running after
    /// `step`, so a fixture that exited is never mistaken for Router letting
    /// a live writer through.
    fn assert_alive(&mut self, step: &str) {
        let exited = self.0.try_wait().unwrap();
        assert!(
            exited.is_none(),
            "the fixture client exited ({exited:?}) before {step} finished"
        );
    }

    /// The fixture as `ps -E` shows it, for a failure message.
    fn describe(&self) -> String {
        let mut command = Command::new("ps");
        #[cfg(target_os = "macos")]
        command.args(["-E", "-ww"]);
        #[cfg(not(target_os = "macos"))]
        command.args(["eww"]);
        let shown = command
            .args(["-o", "stat=", "-o", "command=", "-p"])
            .arg(self.0.id().to_string())
            .output()
            .unwrap();
        format!(
            "process {} as ps sees it: {}{}",
            self.0.id(),
            String::from_utf8_lossy(&shown.stdout).trim(),
            String::from_utf8_lossy(&shown.stderr).trim()
        )
    }
}

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
        let mut claude = spawn_client(bin.path(), "claude", &[("HOME", fixture.path())]);
        let blocked = clients(user.path(), fixture.path(), &backup, &path);
        claude.assert_alive("backup");
        assert!(
            !blocked.status.success(),
            "backup ran over a live writer; {}",
            claude.describe()
        );
        assert!(
            stderr(&blocked).contains("claude is running with the normal profile"),
            "{}; {}",
            stderr(&blocked),
            claude.describe()
        );
        let update = clients(
            user.path(),
            fixture.path(),
            &["update", "claude", "--dry-run", "--json"],
            &path,
        );
        claude.assert_alive("the update dry-run");
        let plans: serde_json::Value = serde_json::from_slice(&update.stdout).unwrap();
        assert_eq!(
            plans[0]["status"],
            "blocked",
            "{}; {}",
            plans[0],
            claude.describe()
        );
    }

    // The home alone is not the profile: a redirected config dir is matched.
    let config = fixture.path().join(".claude");
    let mut claude = spawn_client(
        bin.path(),
        "claude",
        &[("HOME", user.path()), ("CLAUDE_CONFIG_DIR", &config)],
    );
    let blocked = clients(user.path(), fixture.path(), &backup, &path);
    claude.assert_alive("backup");
    assert!(
        !blocked.status.success(),
        "backup ran over a live writer; {}",
        claude.describe()
    );
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

#[test]
fn an_exited_fixture_reports_its_status_without_waiting_for_pgrep() {
    let mut child = Running(
        Command::new("/bin/sh")
            .args(["-c", "exit 17"])
            .spawn()
            .unwrap(),
    );
    let started = Instant::now();
    let error = wait_visible(&mut child, "router-no-such-process").unwrap_err();
    assert!(started.elapsed() < Duration::from_secs(2), "{error}");
    assert!(
        error.contains("17") && error.contains("ps sees it"),
        "{error}"
    );
}
