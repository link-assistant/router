//! Exact, edit-aware backup and undo for `router with --global`.

use std::fs::{self, OpenOptions};
use std::io::Write as _;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};
use sha2::{Digest as _, Sha256};

use crate::clients::{ClientKind, ClientManager, RouterModel};

type AnyError = Box<dyn std::error::Error + Send + Sync>;

#[derive(Debug, Deserialize, Serialize)]
struct BackupState {
    config_existed: bool,
    #[serde(default)]
    config_mode: Option<u32>,
    config_hash_after_setup: String,
    marker_existed: bool,
    #[serde(default)]
    marker_mode: Option<u32>,
    #[serde(default)]
    marker_hash_after_setup: Option<String>,
    marker_path: Option<PathBuf>,
    setup_backup: Option<PathBuf>,
}

/// Existing `with --global` undo state is part of a repair transaction. A
/// repair must either advance its edit guard or restore it with everything
/// else, otherwise a later undo falsely reports the router's own repair as a
/// user edit.
pub(crate) fn undo_state_path(config_path: &Path) -> PathBuf {
    backup_paths(config_path).state
}

/// Files the reversible global configurator may create beside a client
/// configuration. Higher-level transactions include all of them in their
/// rollback allow-list.
pub(crate) fn transaction_paths(config_path: &Path) -> Vec<PathBuf> {
    let paths = backup_paths(config_path);
    vec![paths.config, paths.marker, paths.state]
}

pub(crate) fn update_post_configure_hash(
    config_path: &Path,
    marker_path: Option<&Path>,
) -> Result<(), AnyError> {
    let path = undo_state_path(config_path);
    let source = match fs::read(&path) {
        Ok(source) => source,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(()),
        Err(error) => return Err(error.into()),
    };
    let mut state: BackupState = crate::lino_json::decode(&String::from_utf8_lossy(&source))?;
    state.config_hash_after_setup = digest(&fs::read(config_path).unwrap_or_default());
    state.marker_hash_after_setup = marker_path
        .and_then(|path| fs::read(path).ok())
        .map(|contents| digest(&contents));
    crate::durable_file::atomic_write_owner_only(
        &path,
        crate::lino_json::encode(&state)?.as_bytes(),
    )?;
    Ok(())
}

/// Write the router into the client's own configuration, reversibly.
///
/// Returns the path that was written. Nothing is printed here: the caller
/// knows whether a credential was stored alongside it, and reporting half the
/// outcome from inside was how `with --global` came to announce success while
/// telling the user to go set an environment variable themselves (issue #296).
pub(crate) fn apply_with_manager_and_codex_backend(
    manager: &ClientManager,
    client: ClientKind,
    base_url: &str,
    models: &[RouterModel],
    codex_backend_base_url: Option<&str>,
) -> Result<PathBuf, AnyError> {
    if matches!(client, ClientKind::Cursor | ClientKind::GeminiCli) {
        return Err(client
            .setup_limitation()
            .unwrap_or("client cannot be configured globally")
            .into());
    }
    let config_path = manager.config_path(client);
    let paths = backup_paths(&config_path);
    if paths.state.exists() {
        return Err(format!(
            "a global backup already exists for {client}; run `link-assistant-router with --global --undo {client}` first"
        )
        .into());
    }
    let marker_path = manager.ownership_marker_path(client);
    let config_existed = config_path.exists();
    let marker_existed = marker_path.as_ref().is_some_and(|path| path.exists());
    let config_mode = file_mode(&config_path);
    let marker_mode = marker_path.as_deref().and_then(file_mode);
    if config_existed {
        copy_private(&config_path, &paths.config)?;
    }
    if let Some(marker) = marker_path.as_ref().filter(|_| marker_existed) {
        copy_private(marker, &paths.marker)?;
    }
    let setup =
        match manager.setup_with_codex_backend(client, base_url, models, codex_backend_base_url) {
            Ok(result) => result,
            Err(error) => {
                rollback(
                    &paths,
                    &config_path,
                    config_existed,
                    config_mode,
                    marker_path.as_deref(),
                    marker_existed,
                    marker_mode,
                )?;
                remove_if_present(&paths.config)?;
                remove_if_present(&paths.marker)?;
                return Err(error.into());
            }
        };
    let configured_contents = fs::read(&config_path)?;
    let state = BackupState {
        config_existed,
        config_mode,
        config_hash_after_setup: digest(&configured_contents),
        marker_existed,
        marker_mode,
        marker_hash_after_setup: marker_path
            .as_deref()
            .and_then(|path| fs::read(path).ok())
            .map(|contents| digest(&contents)),
        marker_path,
        setup_backup: setup.backup,
    };
    // Links notation, readable, with the file name unchanged so a run in
    // progress under an earlier release still rolls back (issue #336).
    if let Err(error) = write_private(&paths.state, crate::lino_json::encode(&state)?.as_bytes()) {
        rollback(
            &paths,
            &config_path,
            config_existed,
            config_mode,
            state.marker_path.as_deref(),
            marker_existed,
            marker_mode,
        )?;
        if let Some(setup_backup) = state.setup_backup {
            remove_if_present(&setup_backup)?;
        }
        remove_if_present(&paths.config)?;
        remove_if_present(&paths.marker)?;
        return Err(format!("could not save global undo state: {error}").into());
    }
    Ok(config_path)
}

/// Restore the exact configuration a previous `apply` replaced.
///
/// Returns the restored path, or `None` when this client never had a
/// configuration file to save — `configure grok` stores only a credential.
pub fn undo(client: ClientKind) -> Result<Option<PathBuf>, AnyError> {
    let manager = ClientManager::from_env()?;
    undo_with_manager(&manager, client)
}

pub(crate) fn undo_with_manager(
    manager: &ClientManager,
    client: ClientKind,
) -> Result<Option<PathBuf>, AnyError> {
    let config_path = manager.config_path(client);
    let paths = backup_paths(&config_path);
    let source = match fs::read(&paths.state) {
        Ok(source) => source,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(None),
        Err(error) => {
            return Err(format!("could not read {}: {error}", paths.state.display()).into());
        }
    };
    // Either encoding: state written by an earlier release is JSON.
    let state: BackupState = crate::lino_json::decode(&String::from_utf8_lossy(&source))?;
    let current = fs::read(&config_path).unwrap_or_default();
    if digest(&current) != state.config_hash_after_setup {
        return Err(format!(
            "refusing to overwrite {} because it changed after it was configured; preserve your edits or restore the managed version before retrying",
            config_path.display()
        )
        .into());
    }
    if let Some(marker_path) = state.marker_path.as_ref() {
        if let Some(expected) = state.marker_hash_after_setup.as_deref() {
            let current = fs::read(marker_path).unwrap_or_default();
            if digest(&current) != expected {
                return Err(format!(
                    "refusing to overwrite {} because it changed after it was configured",
                    marker_path.display()
                )
                .into());
            }
        }
        if state.marker_existed {
            restore(&paths.marker, marker_path, state.marker_mode)?;
        } else {
            remove_if_present(marker_path)?;
        }
    }
    if state.config_existed {
        restore(&paths.config, &config_path, state.config_mode)?;
    } else {
        remove_if_present(&config_path)?;
    }
    if let Some(setup_backup) = state.setup_backup {
        remove_if_present(&setup_backup)?;
    }
    remove_if_present(&paths.config)?;
    remove_if_present(&paths.marker)?;
    remove_if_present(&paths.state)?;
    Ok(Some(config_path))
}

struct BackupPaths {
    config: PathBuf,
    marker: PathBuf,
    state: PathBuf,
}

fn backup_paths(config: &Path) -> BackupPaths {
    BackupPaths {
        config: append(config, ".with-router.bak"),
        marker: append(config, ".with-router-marker.bak"),
        state: append(config, ".with-router-state.json"),
    }
}

fn append(path: &Path, suffix: &str) -> PathBuf {
    let mut value = path.as_os_str().to_os_string();
    value.push(suffix);
    PathBuf::from(value)
}

fn restore(backup: &Path, destination: &Path, mode: Option<u32>) -> Result<(), AnyError> {
    let contents = fs::read(backup)?;
    remove_if_present(destination)?;
    write_private(destination, &contents)?;
    set_file_mode(destination, mode)?;
    Ok(())
}

#[allow(clippy::too_many_arguments)]
fn rollback(
    paths: &BackupPaths,
    config_path: &Path,
    config_existed: bool,
    config_mode: Option<u32>,
    marker_path: Option<&Path>,
    marker_existed: bool,
    marker_mode: Option<u32>,
) -> Result<(), AnyError> {
    if let Some(marker_path) = marker_path {
        if marker_existed {
            restore(&paths.marker, marker_path, marker_mode)?;
        } else {
            remove_if_present(marker_path)?;
        }
    }
    if config_existed {
        restore(&paths.config, config_path, config_mode)?;
    } else {
        remove_if_present(config_path)?;
    }
    Ok(())
}

fn copy_private(source: &Path, destination: &Path) -> Result<(), AnyError> {
    write_private(destination, &fs::read(source)?)
}

fn write_private(path: &Path, contents: &[u8]) -> Result<(), AnyError> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let mut options = OpenOptions::new();
    options.create_new(true).write(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt as _;
        options.mode(0o600);
    }
    let mut file = options.open(path)?;
    file.write_all(contents)?;
    file.sync_all()?;
    Ok(())
}

fn remove_if_present(path: &Path) -> Result<(), std::io::Error> {
    match fs::remove_file(path) {
        Ok(()) => Ok(()),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(error) => Err(error),
    }
}

fn digest(contents: &[u8]) -> String {
    hex::encode(Sha256::digest(contents))
}

#[cfg(unix)]
fn file_mode(path: &Path) -> Option<u32> {
    use std::os::unix::fs::PermissionsExt as _;

    fs::metadata(path)
        .ok()
        .map(|metadata| metadata.permissions().mode())
}

#[cfg(not(unix))]
fn file_mode(_path: &Path) -> Option<u32> {
    None
}

#[cfg(unix)]
fn set_file_mode(path: &Path, mode: Option<u32>) -> Result<(), std::io::Error> {
    use std::os::unix::fs::PermissionsExt as _;

    if let Some(mode) = mode {
        fs::set_permissions(path, fs::Permissions::from_mode(mode))?;
    }
    Ok(())
}

#[cfg(not(unix))]
fn set_file_mode(_path: &Path, _mode: Option<u32>) -> Result<(), std::io::Error> {
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn backup_paths_are_derived_from_the_config_path() {
        let paths = backup_paths(std::path::Path::new("/tmp/router/config.json"));
        // Both siblings live beside the config so a rollback is a local rename.
        assert!(
            paths
                .config
                .to_string_lossy()
                .starts_with("/tmp/router/config.json")
        );
        assert_ne!(paths.config, paths.marker);
        assert_ne!(paths.marker, paths.state);
    }

    #[test]
    fn append_adds_a_suffix_without_losing_the_stem() {
        let appended = append(std::path::Path::new("/tmp/a/config.json"), ".bak");
        assert_eq!(appended.to_string_lossy(), "/tmp/a/config.json.bak");
    }

    #[test]
    fn digest_is_stable_and_distinguishes_contents() {
        assert_eq!(digest(b"same"), digest(b"same"));
        assert_ne!(digest(b"same"), digest(b"other"));
        assert!(!digest(b"").is_empty());
    }

    #[test]
    fn removing_an_absent_path_succeeds() {
        let dir = tempfile::tempdir().expect("temp dir");
        // Idempotent: undo runs on machines where the file was never written.
        remove_if_present(&dir.path().join("nothing-here")).expect("absent path is fine");

        let present = dir.path().join("present");
        std::fs::write(&present, b"x").expect("write");
        remove_if_present(&present).expect("remove");
        assert!(!present.exists());
    }

    #[test]
    fn writing_privately_creates_a_readable_file() {
        let dir = tempfile::tempdir().expect("temp dir");
        let path = dir.path().join("secret.json");
        write_private(&path, b"{}").expect("write");
        assert_eq!(std::fs::read(&path).expect("read"), b"{}");
    }

    /// A restore puts back the exact bytes *and* the exact permissions. Losing
    /// the mode would silently widen access to a file that held a credential.
    #[test]
    fn a_restore_returns_the_bytes_and_the_mode() {
        let dir = tempfile::tempdir().expect("temp dir");
        let backup = dir.path().join("config.json.bak");
        let destination = dir.path().join("config.json");
        std::fs::write(&backup, b"{\"original\":true}").expect("seed backup");
        std::fs::write(&destination, b"{\"replaced\":true}").expect("seed destination");

        restore(&backup, &destination, Some(0o600)).expect("restore");

        assert_eq!(
            std::fs::read(&destination).expect("read"),
            b"{\"original\":true}"
        );
        // `file_mode` reports the raw `st_mode`, type bits included, and
        // answers `None` on platforms with no mode to report.
        #[cfg(unix)]
        assert_eq!(
            file_mode(&destination).map(|mode| mode & 0o777),
            Some(0o600)
        );
    }

    /// Undo of a client that had no configuration before `configure` ran must
    /// leave nothing behind, not an empty file the client would then read.
    #[test]
    fn a_rollback_removes_what_did_not_exist_before() {
        let dir = tempfile::tempdir().expect("temp dir");
        let config = dir.path().join("config.json");
        std::fs::write(&config, b"written by configure").expect("seed");
        let paths = backup_paths(&config);

        rollback(&paths, &config, false, None, None, false, None).expect("rollback");

        assert!(
            !config.exists(),
            "a config that did not exist must not remain"
        );
    }

    /// The other half: a configuration that *did* exist comes back byte for
    /// byte, and a marker file is rolled back alongside it.
    #[test]
    fn a_rollback_restores_what_existed_before() {
        let dir = tempfile::tempdir().expect("temp dir");
        let config = dir.path().join("config.json");
        let marker = dir.path().join("marker");
        let paths = backup_paths(&config);
        std::fs::write(&paths.config, b"the user's own config").expect("seed backup");
        std::fs::write(&paths.marker, b"the user's own marker").expect("seed marker backup");
        std::fs::write(&config, b"written by configure").expect("seed config");
        std::fs::write(&marker, b"written by configure").expect("seed marker");

        rollback(
            &paths,
            &config,
            true,
            Some(0o600),
            Some(&marker),
            true,
            Some(0o600),
        )
        .expect("rollback");

        assert_eq!(
            std::fs::read(&config).expect("read config"),
            b"the user's own config"
        );
        assert_eq!(
            std::fs::read(&marker).expect("read marker"),
            b"the user's own marker"
        );
    }

    /// A marker that did not exist before is removed rather than restored.
    #[test]
    fn a_rollback_removes_a_marker_that_did_not_exist_before() {
        let dir = tempfile::tempdir().expect("temp dir");
        let config = dir.path().join("config.json");
        let marker = dir.path().join("marker");
        let paths = backup_paths(&config);
        std::fs::write(&marker, b"written by configure").expect("seed marker");

        rollback(&paths, &config, false, None, Some(&marker), false, None).expect("rollback");

        assert!(!marker.exists());
    }

    /// Copying a configuration aside must not widen its permissions on the way.
    #[test]
    fn a_private_copy_keeps_the_contents_and_stays_private() {
        let dir = tempfile::tempdir().expect("temp dir");
        let source = dir.path().join("source.json");
        let destination = dir.path().join("nested/destination.json");
        std::fs::write(&source, b"{\"k\":1}").expect("seed");

        copy_private(&source, &destination).expect("copy");

        assert_eq!(std::fs::read(&destination).expect("read"), b"{\"k\":1}");
        #[cfg(unix)]
        assert_eq!(
            file_mode(&destination).map(|mode| mode & 0o777),
            Some(0o600),
            "a copy must not be world-readable"
        );
    }

    /// `file_mode` answers `None` for a path that is not there, which is what
    /// lets `apply` tell "no configuration yet" from "unreadable".
    #[test]
    fn the_mode_of_an_absent_file_is_unknown() {
        let dir = tempfile::tempdir().expect("temp dir");
        assert_eq!(file_mode(&dir.path().join("absent")), None);
    }

    /// Setting no mode is a no-op rather than an error: not every platform has
    /// one to set.
    #[test]
    fn setting_no_mode_leaves_the_file_alone() {
        let dir = tempfile::tempdir().expect("temp dir");
        let path = dir.path().join("f");
        std::fs::write(&path, b"x").expect("seed");
        set_file_mode(&path, None).expect("no mode is fine");
        assert_eq!(std::fs::read(&path).expect("read"), b"x");
    }
}
