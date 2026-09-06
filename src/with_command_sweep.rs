//! Cleanup and permission helpers for temporary wrapper directories.

use std::fs::{self, TryLockError};
use std::path::Path;
#[cfg(unix)]
use std::process::Stdio;

pub(super) struct DisposableRunDirectory {
    directory: tempfile::TempDir,
    _lease: fs::File,
}

impl DisposableRunDirectory {
    pub(super) fn create(prefix: &str) -> Result<Self, std::io::Error> {
        let directory = tempfile::Builder::new().prefix(prefix).tempdir()?;
        set_directory_owner_only(directory.path())?;
        let lease_path = directory.path().join(".active.lock");
        let mut options = fs::OpenOptions::new();
        options.read(true).write(true).create(true);
        #[cfg(unix)]
        {
            use std::os::unix::fs::OpenOptionsExt as _;
            options.mode(0o600);
        }
        let lease = options.open(lease_path)?;
        lease.lock()?;
        sweep_stale_directories(directory.path());
        Ok(Self {
            directory,
            _lease: lease,
        })
    }

    pub(super) fn path(&self) -> &Path {
        self.directory.path()
    }
}

/// Remove leftovers from runs of *this user* that are no longer alive.
///
/// A pid is not a liveness token across a trust boundary. On a shared `TMPDIR`
/// — the usual `/tmp`, any multi-user host, a build agent running jobs as
/// different users — `kill(pid, 0)` on another user's live process fails with
/// `EPERM`, and treating any failure as "dead" deleted that run's working
/// directory, client configuration and credential while it was in use (issue
/// #313). So ownership is checked first, and a process that exists but is not
/// ours counts as alive.
///
/// `ours` is a directory this run just created, used as the reference for
/// "mine": comparing owners needs no privileged call and no `unsafe`.
pub(super) fn sweep_stale_directories(ours: &Path) {
    const PREFIX: &str = "link-assistant-router-with-";
    let Some(uid) = owner_of(ours) else {
        return;
    };
    let Ok(entries) = fs::read_dir(std::env::temp_dir()) else {
        return;
    };
    for entry in entries.flatten() {
        let name = entry.file_name();
        let name = name.to_string_lossy();
        let Some(rest) = name.strip_prefix(PREFIX) else {
            continue;
        };
        let Some(pid) = rest.split('-').next().and_then(|value| value.parse().ok()) else {
            continue;
        };
        if entry.path() == ours
            || owner_of(&entry.path()) != Some(uid)
            || run_is_active(&entry.path(), pid)
        {
            continue;
        }
        if fs::remove_dir_all(entry.path()).is_ok() {
            eprintln!("note: removed a leftover run directory from process {pid}");
        }
    }
}

fn run_is_active(path: &Path, pid: u32) -> bool {
    let lease = match fs::OpenOptions::new()
        .read(true)
        .write(true)
        .open(path.join(".active.lock"))
    {
        Ok(lease) => lease,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return process_alive(pid),
        // A lease that cannot be inspected is not proof that a run is stale.
        Err(_) => return true,
    };
    match lease.try_lock() {
        Ok(()) => {
            let _ = lease.unlock();
            false
        }
        Err(TryLockError::WouldBlock | TryLockError::Error(_)) => true,
    }
}

/// The numeric owner of a path, where the platform has one.
///
/// `None` on non-unix, where every directory compares equal and the liveness
/// check decides alone — there is no shared `TMPDIR` in the same sense.
pub(super) fn owner_of(path: &Path) -> Option<u32> {
    #[cfg(unix)]
    {
        use std::os::unix::fs::MetadataExt as _;

        fs::metadata(path).ok().map(|metadata| metadata.uid())
    }
    #[cfg(not(unix))]
    {
        let _ = path;
        Some(0)
    }
}

/// Whether the process might still be running.
///
/// "Might" is the contract: a check that cannot tell "gone" from "not yours"
/// must answer alive, because the cost of being wrong is deleting a live run's
/// files, and the cost of being right late is one directory swept next time.
pub(super) fn process_alive(pid: u32) -> bool {
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
        if signalled {
            return true;
        }
        // `kill -0` fails both for "no such process" and for a live process
        // owned by somebody else. `ps` answers the question that was actually
        // asked — does this pid exist — for any owner, so `EPERM` can no
        // longer read as "dead" (issue #313).
        std::process::Command::new("ps")
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

pub(super) fn set_directory_owner_only(path: &Path) -> Result<(), std::io::Error> {
    #[cfg(not(unix))]
    let _ = path;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt as _;
        fs::set_permissions(path, fs::Permissions::from_mode(0o700))?;
    }
    Ok(())
}
