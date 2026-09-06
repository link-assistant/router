//! Lifecycle for Claude's persistent Router-owned wrapper profile.

use std::fs;
use std::path::{Path, PathBuf};
#[cfg(unix)]
use std::process::Stdio;
use std::time::Duration;

type AnyError = Box<dyn std::error::Error + Send + Sync>;

#[derive(Debug)]
pub struct ProfileSession {
    profile: PathBuf,
    marker: PathBuf,
    reset: Option<ResetTransaction>,
}

impl ProfileSession {
    pub async fn prepare(profile: PathBuf, reset: bool) -> Result<Self, AnyError> {
        let state = profile
            .parent()
            .ok_or("the Router-owned Claude profile has no parent")?;
        fs::create_dir_all(state)?;
        set_directory_owner_only(state)?;
        let lock_path = state.join("profile-operation.lock");
        let lock = crate::durable_file::lock_exclusive_async(&lock_path, Duration::from_secs(10))
            .await
            .map_err(|_| "could not serialize Claude profile operations")?;
        let active = state.join("active");
        fs::create_dir_all(&active)?;
        set_directory_owner_only(&active)?;
        if reset && has_active_session(&active)? {
            return Err(
                "refusing to reset while an active Router-launched Claude uses the profile".into(),
            );
        }
        let reset = if reset {
            Some(ResetTransaction::begin(profile.clone())?)
        } else {
            fs::create_dir_all(&profile)?;
            set_directory_owner_only(&profile)?;
            None
        };
        let marker = active.join(format!("{}.run", uuid::Uuid::new_v4().simple()));
        crate::durable_file::atomic_write_owner_only(
            &marker,
            format!("{}\n", std::process::id()).as_bytes(),
        )?;
        drop(lock);
        Ok(Self {
            profile,
            marker,
            reset,
        })
    }

    #[must_use]
    pub fn path(&self) -> &Path {
        &self.profile
    }

    pub fn commit_launch(&mut self, child_pid: u32) -> Result<(), AnyError> {
        crate::durable_file::atomic_write_owner_only(
            &self.marker,
            format!("{}\n{child_pid}\n", std::process::id()).as_bytes(),
        )?;
        if let Some(reset) = self.reset.as_mut() {
            reset.commit();
        }
        Ok(())
    }
}

#[derive(Debug)]
struct ResetTransaction {
    profile: PathBuf,
    backup: Option<PathBuf>,
    committed: bool,
}

impl ResetTransaction {
    fn begin(profile: PathBuf) -> Result<Self, AnyError> {
        let backup = if profile.exists() {
            let name = profile
                .file_name()
                .and_then(|name| name.to_str())
                .ok_or("the Router-owned Claude profile name is invalid")?;
            let backup = profile.with_file_name(format!(
                "{name}.reset-{}.bak",
                uuid::Uuid::new_v4().simple()
            ));
            fs::rename(&profile, &backup)?;
            if let Err(error) = set_directory_owner_only(&backup) {
                let _ = fs::rename(&backup, &profile);
                return Err(error.into());
            }
            Some(backup)
        } else {
            None
        };
        if let Err(error) =
            fs::create_dir(&profile).and_then(|()| set_directory_owner_only(&profile))
        {
            let _ = fs::remove_dir_all(&profile);
            if let Some(backup) = backup.as_ref() {
                let _ = fs::rename(backup, &profile);
            }
            return Err(error.into());
        }
        Ok(Self {
            profile,
            backup,
            committed: false,
        })
    }

    const fn commit(&mut self) {
        self.committed = true;
    }
}

impl Drop for ResetTransaction {
    fn drop(&mut self) {
        if self.committed {
            return;
        }
        let _ = fs::remove_dir_all(&self.profile);
        if let Some(backup) = self.backup.as_ref() {
            let _ = fs::rename(backup, &self.profile);
        }
    }
}

fn has_active_session(active: &Path) -> std::io::Result<bool> {
    for entry in fs::read_dir(active)? {
        let entry = entry?;
        let Ok(source) = fs::read_to_string(entry.path()) else {
            return Ok(true);
        };
        let mut parsed = false;
        let alive = source.lines().any(|line| {
            let Some(pid) = line.parse::<u32>().ok() else {
                return false;
            };
            parsed = true;
            process_alive(pid)
        });
        if alive || !parsed {
            return Ok(true);
        }
        fs::remove_file(entry.path())?;
    }
    Ok(false)
}

fn process_alive(pid: u32) -> bool {
    if pid == std::process::id() {
        return true;
    }
    #[cfg(unix)]
    {
        let signalled = std::process::Command::new("kill")
            .args(["-0", &pid.to_string()])
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status()
            .is_ok_and(|status| status.success());
        signalled
            || std::process::Command::new("ps")
                .args(["-p", &pid.to_string()])
                .stdout(Stdio::piped())
                .stderr(Stdio::null())
                .output()
                .is_ok_and(|output| {
                    String::from_utf8_lossy(&output.stdout)
                        .lines()
                        .filter(|line| !line.trim().is_empty())
                        .count()
                        > 1
                })
    }
    #[cfg(windows)]
    {
        std::process::Command::new("tasklist")
            .args(["/FI", &format!("PID eq {pid}"), "/NH"])
            .output()
            .is_ok_and(|output| {
                output.status.success()
                    && String::from_utf8_lossy(&output.stdout).contains(&pid.to_string())
            })
    }
}

impl Drop for ProfileSession {
    fn drop(&mut self) {
        let _ = fs::remove_file(&self.marker);
    }
}

fn set_directory_owner_only(path: &Path) -> std::io::Result<()> {
    #[cfg(not(unix))]
    let _ = path;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt as _;
        fs::set_permissions(path, fs::Permissions::from_mode(0o700))?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use std::fs;

    use super::*;

    #[tokio::test]
    async fn separate_launches_reuse_the_same_claude_profile() {
        let root = tempfile::tempdir().expect("profile parent");
        let profile = root.path().join("clients/claude/home");

        let mut first = ProfileSession::prepare(profile.clone(), false)
            .await
            .expect("first profile session");
        assert_eq!(first.path(), profile);
        fs::write(first.path().join("session.jsonl"), b"first session")
            .expect("Claude writes session");
        first
            .commit_launch(std::process::id())
            .expect("commit first launch");
        drop(first);

        let second = ProfileSession::prepare(profile.clone(), false)
            .await
            .expect("second profile session");
        assert_eq!(
            fs::read(second.path().join("session.jsonl")).expect("persistent session"),
            b"first session"
        );

        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt as _;
            assert_eq!(
                fs::metadata(second.path())
                    .expect("profile metadata")
                    .permissions()
                    .mode()
                    & 0o777,
                0o700
            );
        }
    }

    #[tokio::test]
    async fn committed_reset_keeps_a_recoverable_backup_and_starts_empty() {
        let root = tempfile::tempdir().expect("profile parent");
        let profile = root.path().join("clients/claude/home");
        fs::create_dir_all(&profile).expect("seed profile");
        fs::write(profile.join("session.jsonl"), b"previous session").expect("seed session");

        let mut reset = ProfileSession::prepare(profile.clone(), true)
            .await
            .expect("reset profile");
        assert_eq!(
            fs::read_dir(reset.path())
                .expect("empty reset profile")
                .count(),
            0
        );
        reset
            .commit_launch(std::process::id())
            .expect("commit reset launch");
        drop(reset);

        let backups = fs::read_dir(profile.parent().unwrap())
            .expect("list profile state")
            .flatten()
            .filter(|entry| {
                entry
                    .file_name()
                    .to_string_lossy()
                    .starts_with("home.reset-")
            })
            .collect::<Vec<_>>();
        assert_eq!(backups.len(), 1, "one recoverable reset backup");
        assert_eq!(
            fs::read(backups[0].path().join("session.jsonl")).expect("backup session"),
            b"previous session"
        );
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt as _;
            assert_eq!(
                backups[0]
                    .metadata()
                    .expect("backup metadata")
                    .permissions()
                    .mode()
                    & 0o777,
                0o700
            );
        }
    }

    #[tokio::test]
    async fn uncommitted_reset_restores_the_previous_profile() {
        let root = tempfile::tempdir().expect("profile parent");
        let profile = root.path().join("clients/claude/home");
        fs::create_dir_all(&profile).expect("seed profile");
        fs::write(profile.join("settings.json"), b"previous").expect("seed settings");

        let reset = ProfileSession::prepare(profile.clone(), true)
            .await
            .expect("begin reset");
        assert!(!reset.path().join("settings.json").exists());
        drop(reset); // Models setup or process spawning failed before launch.

        assert_eq!(
            fs::read(profile.join("settings.json")).expect("restored settings"),
            b"previous"
        );
    }

    #[tokio::test]
    async fn reset_refuses_an_active_router_launched_claude_profile() {
        let root = tempfile::tempdir().expect("profile parent");
        let profile = root.path().join("clients/claude/home");
        let mut active = ProfileSession::prepare(profile.clone(), false)
            .await
            .expect("active session");
        active
            .commit_launch(std::process::id())
            .expect("record active process");

        let error = ProfileSession::prepare(profile.clone(), true)
            .await
            .expect_err("an active profile must not be reset")
            .to_string();
        assert!(error.contains("active Router-launched Claude"), "{error}");
        drop(active);
        ProfileSession::prepare(profile, true)
            .await
            .expect("reset is available after the active session exits");
    }

    #[tokio::test]
    async fn concurrent_resets_cannot_both_replace_the_profile() {
        let root = tempfile::tempdir().expect("profile parent");
        let profile = root.path().join("clients/claude/home");
        fs::create_dir_all(&profile).expect("seed profile");

        let (left, right) = tokio::join!(
            ProfileSession::prepare(profile.clone(), true),
            ProfileSession::prepare(profile, true),
        );
        assert_eq!(usize::from(left.is_ok()) + usize::from(right.is_ok()), 1);
    }
}
