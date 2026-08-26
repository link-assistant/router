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

/// Write the router into the client's own configuration, reversibly.
///
/// Returns the path that was written. Nothing is printed here: the caller
/// knows whether a credential was stored alongside it, and reporting half the
/// outcome from inside was how `with --global` came to announce success while
/// telling the user to go set an environment variable themselves (issue #296).
pub(crate) fn apply(
    client: ClientKind,
    base_url: &str,
    models: &[RouterModel],
) -> Result<PathBuf, AnyError> {
    if matches!(client, ClientKind::Cursor | ClientKind::GeminiCli) {
        return Err(client
            .setup_limitation()
            .unwrap_or("client cannot be configured globally")
            .into());
    }
    let manager = ClientManager::from_env()?;
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
    let setup = match manager.setup(client, base_url, models) {
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
    if let Err(error) = write_private(&paths.state, &serde_json::to_vec_pretty(&state)?) {
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
    let config_path = manager.config_path(client);
    let paths = backup_paths(&config_path);
    let source = match fs::read(&paths.state) {
        Ok(source) => source,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(None),
        Err(error) => {
            return Err(format!("could not read {}: {error}", paths.state.display()).into());
        }
    };
    let state: BackupState = serde_json::from_slice(&source)?;
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
}
