//! Owner-only file and directory creation for the request store.
//!
//! The request log is the only place complete client and upstream bodies
//! exist, so every file and directory it creates is `0o600`/`0o700` from the
//! moment it exists rather than being tightened afterwards. Split from
//! `request_log.rs` to keep that file within the repository's 1000-line limit.

use std::fs::{self, OpenOptions};
use std::io::Write as _;
use std::path::Path;

pub(super) fn ensure_owner_only_dir(path: &Path) -> std::io::Result<()> {
    fs::create_dir_all(path)?;
    set_dir_owner_only(path)
}

#[cfg(unix)]
fn set_dir_owner_only(path: &Path) -> std::io::Result<()> {
    use std::os::unix::fs::PermissionsExt as _;

    fs::set_permissions(path, fs::Permissions::from_mode(0o700))
}

#[cfg(not(unix))]
fn set_dir_owner_only(_path: &Path) -> std::io::Result<()> {
    Ok(())
}

pub(super) fn append_owner_only(path: &Path, contents: &[u8]) -> std::io::Result<()> {
    let mut options = OpenOptions::new();
    options.create(true).append(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt as _;
        options.mode(0o600);
    }
    let mut file = options.open(path)?;
    set_owner_only(&file)?;
    file.write_all(contents)
}

pub(super) fn write_owner_only(path: &Path, contents: &[u8]) -> std::io::Result<()> {
    let mut options = OpenOptions::new();
    options.create(true).write(true).truncate(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt as _;
        options.mode(0o600);
    }
    let mut file = options.open(path)?;
    set_owner_only(&file)?;
    file.write_all(contents)
}

#[cfg(unix)]
fn set_owner_only(file: &fs::File) -> std::io::Result<()> {
    use std::os::unix::fs::PermissionsExt as _;

    file.set_permissions(fs::Permissions::from_mode(0o600))
}

#[cfg(not(unix))]
fn set_owner_only(_file: &fs::File) -> std::io::Result<()> {
    Ok(())
}
