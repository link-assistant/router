//! The registry of local deployment roots (issue #684).
//!
//! A deployment started with `--root DIR` keeps its data, and so its recorded
//! provider exhaustion and account limits, in `DIR/data`. `router doctor`
//! inspected only its own data directory and the default root, so such a
//! deployment was invisible to it. Every successful local or host deploy now
//! records its root here, and doctor inspects each one it finds, or names the
//! one it could not see.
//!
//! The registry lives under `$HOME`, not `DATA_DIR`, so a doctor run with a
//! different data directory still finds every deployment of this user. It
//! holds paths, modes and ports only: never a secret.

use std::fmt::Write as _;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

/// The registry's file name inside the per-user directory.
pub const FILE: &str = "deployments.json";

/// One registered deployment.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize, schemars::JsonSchema)]
pub struct Entry {
    /// The absolute deployment root.
    pub root: PathBuf,
    /// `container` or `host`.
    pub mode: String,
    /// The loopback port it serves on.
    pub port: u16,
    /// The `--instance` it was deployed as, when any.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub instance: Option<String>,
    /// Unix seconds of the last successful deploy.
    pub registered_at: i64,
}

impl Entry {
    /// The data directory the deployment's Router writes to.
    #[must_use]
    pub fn data_dir(&self) -> PathBuf {
        self.root.join("data")
    }
}

#[derive(Debug, Default, Deserialize, Serialize)]
struct Document {
    #[serde(default)]
    deployments: Vec<Entry>,
}

/// The registry path for this user: `$HOME/.link-assistant-router/deployments.json`,
/// or under `fallback` (the data directory) when `HOME` is unset.
#[must_use]
pub fn path(fallback: &Path) -> PathBuf {
    crate::operation_context::var_os("HOME")
        .filter(|home| !home.is_empty())
        .map_or_else(
            || fallback.join(FILE),
            |home| {
                PathBuf::from(home)
                    .join(".link-assistant-router")
                    .join(FILE)
            },
        )
}

/// Every registered deployment; an absent or unreadable registry is empty.
#[must_use]
pub fn read(path: &Path) -> Vec<Entry> {
    std::fs::read(path)
        .ok()
        .and_then(|bytes| serde_json::from_slice::<Document>(&bytes).ok())
        .map(|document| document.deployments)
        .unwrap_or_default()
}

fn write(path: &Path, deployments: Vec<Entry>) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|error| format!("could not create {}: {error}", parent.display()))?;
    }
    let bytes = serde_json::to_vec_pretty(&Document { deployments })
        .map_err(|error| format!("could not encode the deployment registry: {error}"))?;
    crate::durable_file::atomic_write_owner_only(path, &bytes)
        .map_err(|error| crate::durable_file::describe_write_failure(path, &error))
}

/// Record `entry`, replacing an earlier record of the same root.
///
/// # Errors
///
/// When the registry cannot be written.
pub fn register(path: &Path, entry: Entry) -> Result<(), String> {
    let mut deployments: Vec<Entry> = read(path)
        .into_iter()
        .filter(|existing| existing.root != entry.root)
        .collect();
    deployments.push(entry);
    write(path, deployments)
}

/// Forget `root`, after its deployment was removed.
///
/// # Errors
///
/// When the registry cannot be written.
pub fn unregister(path: &Path, root: &Path) -> Result<(), String> {
    let deployments = read(path);
    if !deployments.iter().any(|entry| entry.root == root) {
        return Ok(());
    }
    write(
        path,
        deployments
            .into_iter()
            .filter(|entry| entry.root != root)
            .collect(),
    )
}

/// What doctor should inspect: the data directory of every registered root
/// that still exists, and a note for every one it cannot see.
#[must_use]
pub fn doctor_targets(path: &Path) -> (Vec<PathBuf>, String) {
    let mut directories = Vec::new();
    let mut notes = String::new();
    for entry in read(path) {
        if entry.root.is_dir() {
            directories.push(entry.data_dir());
        } else {
            let _ = writeln!(
                notes,
                "deployment registry    : could not see {} ({} on port {}); it was moved or \
                 removed without `router deploy --down`",
                entry.root.display(),
                entry.mode,
                entry.port
            );
        }
    }
    (directories, notes)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn entry(root: &Path, port: u16) -> Entry {
        Entry {
            root: root.to_path_buf(),
            mode: "host".to_string(),
            port,
            instance: None,
            registered_at: 1,
        }
    }

    #[test]
    fn a_root_is_registered_once_and_forgotten_on_down() {
        let directory = tempfile::tempdir().unwrap();
        let registry = directory.path().join("nested").join(FILE);
        let root = directory.path().join("custom");
        std::fs::create_dir_all(&root).unwrap();

        register(&registry, entry(&root, 8080)).unwrap();
        register(&registry, entry(&root, 9090)).unwrap();
        let entries = read(&registry);
        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].port, 9090);

        let (directories, notes) = doctor_targets(&registry);
        assert_eq!(directories, vec![root.join("data")]);
        assert!(notes.is_empty());

        unregister(&registry, &root).unwrap();
        assert!(read(&registry).is_empty());
    }

    #[test]
    fn a_missing_root_is_named_rather_than_silently_skipped() {
        let directory = tempfile::tempdir().unwrap();
        let registry = directory.path().join(FILE);
        let gone = directory.path().join("gone");
        register(&registry, entry(&gone, 8080)).unwrap();

        let (directories, notes) = doctor_targets(&registry);
        assert!(directories.is_empty());
        assert!(notes.contains("could not see"), "{notes}");
        assert!(notes.contains(&gone.display().to_string()), "{notes}");
    }

    #[test]
    fn a_corrupt_registry_reads_as_empty_and_is_rewritten() {
        let directory = tempfile::tempdir().unwrap();
        let registry = directory.path().join(FILE);
        std::fs::write(&registry, "not json").unwrap();
        assert!(read(&registry).is_empty());
        register(&registry, entry(directory.path(), 1)).unwrap();
        assert_eq!(read(&registry).len(), 1);
    }
}
