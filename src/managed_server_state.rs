//! Owner-only on-disk state for the managed background router.
//!
//! Split from `managed_server.rs` to keep that file within the repository's
//! 1000-line limit.

use std::fs::{self, File, OpenOptions};
use std::io::Write as _;
use std::path::{Path, PathBuf};

use fs2::FileExt as _;

use serde::Serialize;

use super::{AnyError, CONFIG_DIRECTORY, MANAGED_LOCK, MANAGED_STATE, ManagedState};

pub(super) fn state_directory() -> Result<PathBuf, AnyError> {
    let root = std::env::var_os("XDG_CONFIG_HOME")
        .map(PathBuf::from)
        .or_else(|| std::env::var_os("HOME").map(|home| PathBuf::from(home).join(".config")))
        .or_else(|| std::env::var_os("APPDATA").map(PathBuf::from))
        .ok_or("HOME, XDG_CONFIG_HOME, and APPDATA are unset; cannot store server state")?;
    let path = root.join(CONFIG_DIRECTORY);
    fs::create_dir_all(&path)?;
    set_owner_only(&path)?;
    Ok(path)
}

pub(super) fn lock_state() -> Result<File, AnyError> {
    let path = state_directory()?.join(MANAGED_LOCK);
    let file = OpenOptions::new()
        .create(true)
        .truncate(false)
        .read(true)
        .write(true)
        .open(path)?;
    file.lock_exclusive()?;
    Ok(file)
}

pub(super) fn load_managed() -> Result<Option<ManagedState>, AnyError> {
    let path = state_directory()?.join(MANAGED_STATE);
    match fs::read_to_string(&path) {
        Ok(source) => Ok(Some(crate::lino_json::decode(&source).map_err(
            |error| format!("invalid managed server state {}: {error}", path.display()),
        )?)),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(error) => Err(error.into()),
    }
}

pub(super) fn save_managed(state: &ManagedState) -> Result<(), AnyError> {
    write_private_json(&state_directory()?.join(MANAGED_STATE), state)
}

pub(super) fn write_private_json(path: &Path, value: &impl Serialize) -> Result<(), AnyError> {
    let temporary = path.with_extension(format!("tmp-{}", uuid::Uuid::new_v4()));
    let mut options = OpenOptions::new();
    options.write(true).create_new(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt as _;
        options.mode(0o600);
    }
    let mut file = options.open(&temporary)?;
    // Links notation, readable, with the file name unchanged so an existing
    // installation keeps its path and migrates on the next write (issue #235).
    file.write_all(crate::lino_json::encode(value)?.as_bytes())?;
    file.write_all(b"\n")?;
    file.sync_all()?;
    #[cfg(windows)]
    if path.exists() {
        fs::remove_file(path)?;
    }
    fs::rename(&temporary, path)?;
    set_owner_only(path)?;
    Ok(())
}

pub(super) fn set_owner_only(path: &Path) -> Result<(), std::io::Error> {
    #[cfg(not(unix))]
    let _ = path;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt as _;
        let mode = if path.is_dir() { 0o700 } else { 0o600 };
        fs::set_permissions(path, fs::Permissions::from_mode(mode))?;
    }
    Ok(())
}
