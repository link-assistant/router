//! Owner-only on-disk state for the managed background router.
//!
//! Split from `managed_server.rs` to keep that file within the repository's
//! 1000-line limit.

use std::fs::{self, File, OpenOptions};
use std::io::Write as _;
use std::path::{Path, PathBuf};

use serde::Serialize;

use super::{AnyError, CONFIG_DIRECTORY, MANAGED_LOCK, MANAGED_STATE, ManagedState};

// A state root a test has claimed for itself, in this thread only.
//
// `cargo test` deleted the developer's own `server.json` — a file holding a
// live token — because `clearing_an_absent_selection_succeeds` called
// `clear_persisted()` with nothing overriding `HOME`, so it removed the real
// one. The test passed either way, which is why it read as harmless
// (issue #343).
//
// A thread-local rather than an environment variable: `XDG_CONFIG_HOME` is
// process-global and this crate forbids `unsafe`, so a test could not
// override it without racing every other test in the binary.
#[cfg(test)]
thread_local! {
    static TEST_STATE_ROOT: std::cell::RefCell<Option<PathBuf>> =
        const { std::cell::RefCell::new(None) };
}

/// Point state resolution at `root` until the guard is dropped.
///
/// Every test that reads or writes router state must hold one of these: the
/// alternative is a test that operates on whoever ran it.
#[cfg(test)]
pub fn claim_state_root(root: PathBuf) -> StateRootGuard {
    TEST_STATE_ROOT.with(|slot| *slot.borrow_mut() = Some(root));
    StateRootGuard
}

/// Restores real state resolution when the test ends, panic or not.
#[cfg(test)]
pub struct StateRootGuard;

#[cfg(test)]
impl Drop for StateRootGuard {
    fn drop(&mut self) {
        TEST_STATE_ROOT.with(|slot| *slot.borrow_mut() = None);
    }
}

pub(super) fn state_directory() -> Result<PathBuf, AnyError> {
    let root = resolved_root()?;
    let path = root.join(CONFIG_DIRECTORY);
    fs::create_dir_all(&path)?;
    set_owner_only(&path)?;
    Ok(path)
}

/// The directory router state lives under, outside tests.
///
/// An empty variable is unset, not configured: taking `Some("")` as a root
/// made every state path relative and wrote a live token into `$PWD`
/// (issue #340).
#[cfg(not(test))]
fn resolved_root() -> Result<PathBuf, AnyError> {
    let root = crate::env_paths::directory("XDG_CONFIG_HOME")
        .or_else(|| crate::env_paths::directory("HOME").map(|home| home.join(".config")))
        .or_else(|| crate::env_paths::directory("APPDATA"))
        .ok_or("HOME, XDG_CONFIG_HOME, and APPDATA are unset; cannot store server state")?;
    Ok(crate::env_paths::require_absolute(
        root,
        "the router's state directory",
    )?)
}

/// The root a test claimed, refusing to fall back to the developer's own.
///
/// No test may resolve real state. The failure mode is silent -- a test that
/// deletes the developer's credential passes just the same -- and silence is
/// what let it ship, so an unclaimed resolution fails loudly (issue #343).
#[cfg(test)]
fn resolved_root() -> Result<PathBuf, AnyError> {
    TEST_STATE_ROOT
        .with(|slot| slot.borrow().clone())
        .ok_or_else(|| {
            AnyError::from(
                "a test resolved the real state directory without claiming one; wrap it in \
                 `claim_state_root(tempfile::tempdir()?.path())`",
            )
        })
}

pub(super) fn lock_state() -> Result<File, AnyError> {
    let path = state_directory()?.join(MANAGED_LOCK);
    let file = OpenOptions::new()
        .create(true)
        .truncate(false)
        .read(true)
        .write(true)
        .open(path)?;
    file.lock()?;
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
