//! Lifecycle for Claude's persistent Router-owned wrapper profile.

use std::fs;
use std::path::{Path, PathBuf};
use std::time::Duration;

type AnyError = Box<dyn std::error::Error + Send + Sync>;

#[derive(Debug)]
pub struct ProfileSession {
    profile: PathBuf,
    marker: PathBuf,
}

impl ProfileSession {
    pub async fn prepare(profile: PathBuf, reset: bool) -> Result<Self, AnyError> {
        if reset {
            return Err("direct Claude profile replacement is retired; use router clients reset for a verified settings reset".into());
        }
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
        fs::create_dir_all(&profile)?;
        set_directory_owner_only(&profile)?;
        let marker = active.join(format!("{}.run", uuid::Uuid::new_v4().simple()));
        crate::durable_file::atomic_write_owner_only(
            &marker,
            format!("{}\n", std::process::id()).as_bytes(),
        )?;
        drop(lock);
        Ok(Self { profile, marker })
    }

    #[must_use]
    pub fn path(&self) -> &Path {
        &self.profile
    }

    pub fn commit_launch(&self, child_pid: u32) -> Result<(), AnyError> {
        crate::durable_file::atomic_write_owner_only(
            &self.marker,
            format!("{}\n{child_pid}\n", std::process::id()).as_bytes(),
        )?;
        Ok(())
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

        let first = ProfileSession::prepare(profile.clone(), false)
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
    async fn direct_profile_replacement_is_retired_without_moving_sessions() {
        let root = tempfile::tempdir().expect("profile parent");
        let profile = root.path().join("clients/claude/home");
        fs::create_dir_all(&profile).expect("seed profile");
        fs::write(profile.join("session.jsonl"), b"previous session").expect("seed session");
        let error = ProfileSession::prepare(profile.clone(), true)
            .await
            .expect_err("old reset cannot bypass verified backup")
            .to_string();
        assert!(error.contains("router clients reset"), "{error}");
        assert_eq!(
            fs::read(profile.join("session.jsonl")).expect("active session retained"),
            b"previous session"
        );
        assert_eq!(fs::read_dir(profile.parent().unwrap()).unwrap().count(), 1);
    }
}
