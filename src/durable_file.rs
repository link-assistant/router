//! Owner-only, crash-durable file replacement and inter-process locking.

use std::fs::{self, OpenOptions, TryLockError};
use std::io::{self, Write};
use std::path::Path;

/// Describe a credential-write failure in terms an operator can act on.
///
/// A read-only mount is the common case — the deployment docs tell you to mount
/// the credential directory `:ro` — and it otherwise surfaces as a bare
/// `Read-only file system (os error 30)`, which does not say what to change
/// (issue #205).
#[must_use]
pub fn describe_write_failure(path: &Path, error: &io::Error) -> String {
    if error.kind() == io::ErrorKind::ReadOnlyFilesystem {
        return format!(
            "cannot write {}: the credential directory is mounted read-only. \
             Re-run without `:ro` to authorize, then restore it — serving and \
             token renewal do not need write access.",
            path.display()
        );
    }
    format!("could not create {}: {error}", path.display())
}

/// Replace `path` atomically, syncing both the file and its containing
/// directory so the rename survives power loss.
pub fn atomic_write_owner_only(path: &Path, contents: &[u8]) -> io::Result<()> {
    let parent = path
        .parent()
        .ok_or_else(|| io::Error::other("durable path has no parent directory"))?;
    fs::create_dir_all(parent)?;
    let name = path
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or_else(|| io::Error::other("durable file name is not valid UTF-8"))?;
    let temporary = parent.join(format!(
        ".{name}.{}.{}.tmp",
        std::process::id(),
        uuid::Uuid::new_v4()
    ));
    let result = (|| {
        let mut options = OpenOptions::new();
        options.write(true).create_new(true);
        #[cfg(unix)]
        {
            use std::os::unix::fs::OpenOptionsExt as _;
            options.mode(0o600);
        }
        let mut file = options.open(&temporary)?;
        file.write_all(contents)?;
        file.sync_all()?;
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt as _;
            file.set_permissions(fs::Permissions::from_mode(0o600))?;
        }
        drop(file);
        fs::rename(&temporary, path)?;
        sync_directory(parent)
    })();
    if result.is_err() {
        let _ = fs::remove_file(&temporary);
    }
    result
}

/// Execute a state mutation while holding an owner-only advisory lock shared
/// by every router process using the same data directory.
pub fn with_exclusive_lock<T, E>(
    path: &Path,
    operation: impl FnOnce() -> Result<T, E>,
) -> Result<T, E>
where
    E: From<io::Error>,
{
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(E::from)?;
    }
    let mut options = OpenOptions::new();
    options.read(true).write(true).create(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt as _;
        options.mode(0o600);
    }
    let lock = options.open(path).map_err(E::from)?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt as _;
        lock.set_permissions(fs::Permissions::from_mode(0o600))
            .map_err(E::from)?;
    }
    lock.lock().map_err(E::from)?;
    let result = operation();
    let unlock = lock.unlock();
    match (result, unlock) {
        (Err(error), _) => Err(error),
        (Ok(_), Err(error)) => Err(E::from(error)),
        (Ok(value), Ok(())) => Ok(value),
    }
}

/// Execute a read while holding a *shared* advisory lock on the same file.
///
/// A listing is a read, and a read that takes the exclusive lock serialises
/// itself against the request path: `try_consume_request` runs per proxied
/// request and wants the same lock, so one slow listing queues live traffic
/// behind it (issue #351). A shared lock lets concurrent readers proceed
/// together and still excludes writers.
pub fn with_shared_lock<T, E>(path: &Path, operation: impl FnOnce() -> Result<T, E>) -> Result<T, E>
where
    E: From<io::Error>,
{
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(E::from)?;
    }
    let mut options = OpenOptions::new();
    options.read(true).write(true).create(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt as _;
        options.mode(0o600);
    }
    let lock = options.open(path).map_err(E::from)?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt as _;
        lock.set_permissions(fs::Permissions::from_mode(0o600))
            .map_err(E::from)?;
    }
    lock.lock_shared().map_err(E::from)?;
    let result = operation();
    let unlock = lock.unlock();
    match (result, unlock) {
        (Err(error), _) => Err(error),
        (Ok(_), Err(error)) => Err(E::from(error)),
        (Ok(value), Ok(())) => Ok(value),
    }
}

/// An exclusive advisory lock held for as long as the guard lives.
///
/// Returned by [`lock_exclusive_async`] so an `async` critical section — a
/// token exchange over the network — can serialise against other holders
/// without blocking a runtime worker on `flock`.
#[derive(Debug)]
pub struct FileLockGuard {
    file: fs::File,
    path: std::path::PathBuf,
}

impl FileLockGuard {
    /// Path of the lock file this guard holds.
    #[must_use]
    pub fn path(&self) -> &Path {
        &self.path
    }
}

impl Drop for FileLockGuard {
    fn drop(&mut self) {
        // Best effort: the lock is released by closing the descriptor anyway.
        let _ = self.file.unlock();
    }
}

/// How often a contended lock is re-tried while waiting.
const LOCK_POLL_INTERVAL: std::time::Duration = std::time::Duration::from_millis(20);

/// Acquire an exclusive advisory lock on `path`, waiting up to `timeout`.
///
/// `flock` has no async form, so the lock is polled rather than waited on: a
/// blocking [`std::fs::File::lock`] inside an `async fn` would park a runtime
/// worker for as long as another process holds it, which for a credential
/// refresh can be a full network round trip.
///
/// Contention is [`TryLockError::WouldBlock`], a variant of its own rather than
/// a platform errno to classify: `EWOULDBLOCK` maps to
/// [`io::ErrorKind::WouldBlock`] on unix, but Windows answers
/// `ERROR_LOCK_VIOLATION`, which maps to nothing in particular. Reading
/// contention as a broken lock would make the waiter proceed *unlocked*, and
/// two holders of one credential would then spend the same refresh token twice
/// (issue #239).
///
/// # Errors
///
/// Returns [`io::ErrorKind::WouldBlock`] when the lock is still held after
/// `timeout`, or the underlying error when the lock file cannot be opened.
pub async fn lock_exclusive_async(
    path: &Path,
    timeout: std::time::Duration,
) -> io::Result<FileLockGuard> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let mut options = OpenOptions::new();
    options.read(true).write(true).create(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt as _;
        options.mode(0o600);
    }
    let file = options.open(path)?;
    let mut waited = std::time::Duration::ZERO;
    loop {
        match file.try_lock() {
            Ok(()) => {
                return Ok(FileLockGuard {
                    file,
                    path: path.to_path_buf(),
                });
            }
            Err(TryLockError::WouldBlock) => {
                if waited >= timeout {
                    return Err(io::Error::new(
                        io::ErrorKind::WouldBlock,
                        format!("timed out waiting for the lock on {}", path.display()),
                    ));
                }
                tokio::time::sleep(LOCK_POLL_INTERVAL).await;
                waited = waited.saturating_add(LOCK_POLL_INTERVAL);
            }
            Err(TryLockError::Error(error)) => return Err(error),
        }
    }
}

/// Sync a directory entry update on platforms that support directory fsync.
pub fn sync_directory(path: &Path) -> io::Result<()> {
    #[cfg(unix)]
    {
        fs::File::open(path)?.sync_all()
    }
    #[cfg(not(unix))]
    {
        let _ = path;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn durable_write_is_owner_only_and_leaves_no_temporary_file() {
        let directory = tempfile::tempdir().unwrap();
        let path = directory.path().join("state.json");
        atomic_write_owner_only(&path, b"one").unwrap();
        atomic_write_owner_only(&path, b"two").unwrap();
        assert_eq!(fs::read(&path).unwrap(), b"two");
        assert_eq!(fs::read_dir(directory.path()).unwrap().count(), 1);
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt as _;
            assert_eq!(
                fs::metadata(path).unwrap().permissions().mode() & 0o777,
                0o600
            );
        }
    }

    /// Contention has to be recognised on every platform, not only where it
    /// happens to map onto `WouldBlock`.
    ///
    /// Windows answers a contended `LockFileEx` with `ERROR_LOCK_VIOLATION`,
    /// which `io::ErrorKind` does not classify; reading that as a broken lock
    /// makes the waiter proceed *unlocked*, and two holders of one credential
    /// then spend the same refresh token twice — exactly the race the lock
    /// exists to prevent (issue #239). The standard library answers with
    /// [`TryLockError::WouldBlock`] on every platform, so this asserts the
    /// variant rather than an errno.
    ///
    /// Advisory locks belong to the *open file description*, so two separate
    /// handles inside one process contend exactly as two processes do — which
    /// is what lets this run without spawning one.
    #[tokio::test]
    async fn contention_is_told_apart_from_a_lock_that_cannot_work() {
        let directory = tempfile::tempdir().unwrap();
        let path = directory.path().join("credential.lock");

        let holder = OpenOptions::new()
            .read(true)
            .write(true)
            .create(true)
            .truncate(false)
            .open(&path)
            .unwrap();
        holder.lock().unwrap();

        let waiter = OpenOptions::new()
            .read(true)
            .write(true)
            .open(&path)
            .unwrap();
        assert!(
            matches!(waiter.try_lock(), Err(TryLockError::WouldBlock)),
            "a contended lock must report WouldBlock, not a platform errno"
        );

        // And the polling waiter must read that as "held", not as "broken".
        let refused = lock_exclusive_async(&path, std::time::Duration::from_millis(60)).await;
        let error = refused.expect_err("the lock was held");
        assert_eq!(error.kind(), io::ErrorKind::WouldBlock);

        holder.unlock().unwrap();
        assert!(
            lock_exclusive_async(&path, std::time::Duration::from_millis(60))
                .await
                .is_ok(),
            "the lock must be available once the holder releases it"
        );
    }

    /// Two holders of one credential must serialise, and a holder that cannot
    /// get in must give up rather than wait forever: a stale lock must never be
    /// able to wedge token renewal (issue #239).
    ///
    /// Linux-only because the contending holder is `flock(1)`, which macOS does
    /// not ship; the code under test is the same on both.
    #[cfg(target_os = "linux")]
    #[tokio::test]
    async fn an_exclusive_lock_excludes_and_then_gives_up() {
        use std::os::unix::fs::PermissionsExt as _;

        let directory = tempfile::tempdir().unwrap();
        let path = directory.path().join("nested").join("credential.lock");
        let taken = directory.path().join("taken");
        {
            let guard = lock_exclusive_async(&path, std::time::Duration::from_secs(1))
                .await
                .expect("first holder");
            assert_eq!(guard.path(), path);
            assert_eq!(
                fs::metadata(&path).unwrap().permissions().mode() & 0o777,
                0o600
            );
        }

        // Contention is exercised from another process: two lock attempts on
        // the same descriptor within one process would not exclude each other.
        let mut holder = std::process::Command::new("sh")
            .arg("-c")
            .arg(format!(
                "exec 9>>'{}'; flock 9 && touch '{}' && sleep 5",
                path.display(),
                taken.display()
            ))
            .spawn()
            .expect("spawn the competing holder");
        for _ in 0..200 {
            if taken.exists() {
                break;
            }
            tokio::time::sleep(std::time::Duration::from_millis(10)).await;
        }
        assert!(taken.exists(), "the competing holder never took the lock");

        let refused = lock_exclusive_async(&path, std::time::Duration::from_millis(60)).await;
        let error = refused.expect_err("the lock was held by another process");
        assert_eq!(error.kind(), io::ErrorKind::WouldBlock);
        assert!(error.to_string().contains("credential.lock"), "{error}");

        let _ = holder.kill();
        let _ = holder.wait();
    }

    /// A read-only mount is the common cause of a failed credential write, and
    /// the bare `errno` does not say what to change (issue #205).
    #[test]
    fn a_read_only_mount_is_named_as_the_cause() {
        let message = describe_write_failure(
            Path::new("/data/claude/.credentials.json"),
            &io::Error::from(io::ErrorKind::ReadOnlyFilesystem),
        );
        assert!(
            message.contains("/data/claude/.credentials.json"),
            "{message}"
        );
        assert!(message.contains("read-only"), "{message}");
        // The remedy must be actionable, and say the cost of applying it.
        assert!(message.contains(":ro"), "{message}");
        assert!(
            message.contains("token renewal do not need write"),
            "{message}"
        );
    }

    #[test]
    fn other_write_failures_keep_the_underlying_error() {
        let message = describe_write_failure(
            Path::new("/data/x.json"),
            &io::Error::from(io::ErrorKind::PermissionDenied),
        );
        assert!(message.contains("/data/x.json"), "{message}");
        assert!(!message.contains("read-only"), "{message}");
    }
}
