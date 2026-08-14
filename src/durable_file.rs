//! Owner-only, crash-durable file replacement and inter-process locking.

use std::fs::{self, OpenOptions};
use std::io::{self, Write};
use std::path::Path;

use fs2::FileExt;

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
    lock.lock_exclusive().map_err(E::from)?;
    let result = operation();
    let unlock = FileExt::unlock(&lock);
    match (result, unlock) {
        (Err(error), _) => Err(error),
        (Ok(_), Err(error)) => Err(E::from(error)),
        (Ok(value), Ok(())) => Ok(value),
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
}
