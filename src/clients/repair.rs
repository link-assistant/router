//! Transactional, edit-aware client configuration repair.

use std::fs;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};
use sha2::{Digest as _, Sha256};

use super::{
    ClientConfigAnalysis, ClientError, ClientKind, ClientManager, ManagedCredential,
    OwnershipState, RouterModel,
};

/// A secret-free repair preview. Constructing it performs no writes or I/O to
/// the selected Router.
#[derive(Clone, Debug, Serialize)]
pub struct RepairPlan {
    pub client: ClientKind,
    pub state: OwnershipState,
    pub conflicts: Vec<String>,
    pub changes: Vec<PathBuf>,
    pub action: &'static str,
}

/// Result of a committed local repair transaction.
#[derive(Clone, Debug, Serialize)]
pub struct RepairResult {
    pub client: ClientKind,
    pub before: OwnershipState,
    pub after: OwnershipState,
    pub changed: bool,
    pub restart_required: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub backup_id: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
struct SnapshotManifest {
    version: u8,
    id: String,
    client: String,
    entries: Vec<SnapshotEntry>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
struct SnapshotEntry {
    path: PathBuf,
    existed: bool,
    #[serde(default)]
    mode: Option<u32>,
    #[serde(default)]
    before_sha256: Option<String>,
    #[serde(default)]
    after_sha256: Option<String>,
    #[serde(default)]
    backup: Option<String>,
}

impl ClientManager {
    /// Describe the exact local files repair is allowed to reconcile.
    pub fn repair_plan(&self, client: ClientKind) -> Result<RepairPlan, ClientError> {
        let analysis = self.analyze(client)?;
        Ok(RepairPlan {
            client,
            state: analysis.state,
            conflicts: analysis.conflicts,
            changes: self.repair_paths(client),
            action: if analysis.state == OwnershipState::ManagedIntact {
                "none"
            } else if client.setup_limitation().is_some() {
                "unsupported"
            } else {
                "reconcile"
            },
        })
    }

    /// Reconcile all managed files as one recoverable transaction.
    pub(crate) fn apply_repair(
        &self,
        client: ClientKind,
        base_url: &str,
        token: &str,
        credential: &ManagedCredential,
        models: &[RouterModel],
    ) -> Result<RepairResult, ClientError> {
        let before = self.analyze(client)?;
        if before.state == OwnershipState::ManagedIntact {
            return Ok(RepairResult {
                client,
                before: before.state,
                after: before.state,
                changed: false,
                restart_required: false,
                backup_id: None,
            });
        }
        if let Some(limitation) = client.setup_limitation() {
            return Err(ClientError::message(limitation));
        }

        let mut snapshot = self.capture_snapshot(client, &before)?;
        let id = snapshot.manifest.id.clone();
        let result = (|| {
            // A corrupt marker cannot safely be interpreted by the surgical
            // setup writers. Its exact bytes are already in the snapshot.
            if before.state == OwnershipState::Ambiguous
                && before
                    .conflicts
                    .iter()
                    .any(|conflict| conflict == "ownership-marker:invalid")
                && let Some(path) = self.ownership_marker_path(client)
            {
                remove_if_present(&path)?;
            }
            let setup = self.setup(client, base_url, models)?;
            if let Some(path) = setup.backup.as_deref() {
                remove_if_present(path)?;
            }
            self.write_environment(client, base_url, token)?;
            self.write_credential_metadata(client, credential)?;
            crate::client_global::update_post_configure_hash(
                &self.config_path(client),
                self.ownership_marker_path(client).as_deref(),
            )
            .map_err(|error| ClientError::message(error.to_string()))?;
            let after = self.analyze(client)?;
            if after.state != OwnershipState::ManagedIntact {
                return Err(ClientError::message(format!(
                    "repair did not produce an intact managed configuration; remaining conflicts: {}",
                    after.conflicts.join(", ")
                )));
            }
            snapshot.record_after()?;
            snapshot.write()?;
            Ok(RepairResult {
                client,
                before: before.state,
                after: after.state,
                changed: true,
                restart_required: client == ClientKind::ClaudeCode,
                backup_id: Some(id),
            })
        })();
        if let Err(error) = result {
            if let Err(rollback_error) = snapshot.restore(false) {
                return Err(ClientError::message(format!(
                    "{error}; automatic rollback also failed: {rollback_error}"
                )));
            }
            return Err(error);
        }
        result
    }

    /// Restore a named snapshot only if none of its repaired files changed.
    pub fn rollback_repair(
        &self,
        client: ClientKind,
        id: &str,
    ) -> Result<RepairResult, ClientError> {
        validate_id(id)?;
        let root = self.repair_root().join(id);
        let source = fs::read(root.join("manifest.json")).map_err(|error| {
            ClientError::message(format!("could not read repair snapshot {id}: {error}"))
        })?;
        let manifest: SnapshotManifest = serde_json::from_slice(&source)?;
        if manifest.id != id || manifest.client != client.canonical_name() {
            return Err(ClientError::message(
                "repair snapshot does not belong to the requested client",
            ));
        }
        let before = self.analyze(client)?.state;
        let snapshot = Snapshot { root, manifest };
        snapshot.restore(true)?;
        let after = self.analyze(client)?.state;
        Ok(RepairResult {
            client,
            before,
            after,
            changed: true,
            restart_required: client == ClientKind::ClaudeCode,
            backup_id: Some(id.to_string()),
        })
    }

    fn repair_root(&self) -> PathBuf {
        self.config_home.join("link-assistant-router/repairs")
    }

    fn repair_paths(&self, client: ClientKind) -> Vec<PathBuf> {
        let mut paths = vec![
            self.config_path(client),
            self.environment_path(client),
            self.credential_metadata_path(client),
        ];
        if let Some(marker) = self.ownership_marker_path(client) {
            paths.push(marker);
        }
        paths.push(crate::client_global::undo_state_path(
            &self.config_path(client),
        ));
        paths.sort();
        paths.dedup();
        paths
    }

    fn capture_snapshot(
        &self,
        client: ClientKind,
        analysis: &ClientConfigAnalysis,
    ) -> Result<Snapshot, ClientError> {
        // Refuse paths whose type could redirect the transaction outside its
        // fixed allow-list. The observation and capture hashes also make a
        // pre-analysis edit visible before any managed write occurs.
        for observed in &analysis.observed {
            if observed.exists && observed.kind != "file" {
                return Err(ClientError::message(format!(
                    "refusing to repair {} because it is a {}",
                    observed.path.display(),
                    observed.kind
                )));
            }
            let current = current_state(&observed.path)?;
            if current.0 != observed.exists || current.1 != observed.sha256 {
                return Err(ClientError::message(format!(
                    "{} changed after analysis; retry repair",
                    observed.path.display()
                )));
            }
        }
        let id = uuid::Uuid::new_v4().simple().to_string();
        let root = self.repair_root().join(&id);
        fs::create_dir_all(&root)?;
        set_mode(&root, 0o700)?;
        let mut entries = Vec::new();
        for (index, path) in self.repair_paths(client).into_iter().enumerate() {
            entries.push(capture_entry(&root, index, path)?);
        }
        let snapshot = Snapshot {
            root,
            manifest: SnapshotManifest {
                version: 1,
                id,
                client: client.canonical_name().to_string(),
                entries,
            },
        };
        snapshot.verify_before()?;
        snapshot.write()?;
        Ok(snapshot)
    }
}

struct Snapshot {
    root: PathBuf,
    manifest: SnapshotManifest,
}

impl Snapshot {
    fn write(&self) -> Result<(), ClientError> {
        let rendered = format!("{}\n", serde_json::to_string_pretty(&self.manifest)?);
        crate::durable_file::atomic_write_owner_only(
            &self.root.join("manifest.json"),
            rendered.as_bytes(),
        )?;
        set_mode(&self.root.join("manifest.json"), 0o600)
    }

    fn verify_before(&self) -> Result<(), ClientError> {
        for entry in &self.manifest.entries {
            let current = current_state(&entry.path)?;
            if current.0 != entry.existed || current.1 != entry.before_sha256 {
                return Err(ClientError::message(format!(
                    "{} changed while repair was being prepared; retry",
                    entry.path.display()
                )));
            }
        }
        Ok(())
    }

    fn record_after(&mut self) -> Result<(), ClientError> {
        for entry in &mut self.manifest.entries {
            let current = current_state(&entry.path)?;
            entry.after_sha256 = current.1;
        }
        Ok(())
    }

    fn restore(&self, detect_conflicts: bool) -> Result<(), ClientError> {
        if detect_conflicts {
            for entry in &self.manifest.entries {
                let current = current_state(&entry.path)?;
                if current.0 != entry.after_sha256.is_some() || current.1 != entry.after_sha256 {
                    return Err(ClientError::message(format!(
                        "refusing rollback because {} changed after repair",
                        entry.path.display()
                    )));
                }
            }
        }
        for entry in self.manifest.entries.iter().rev() {
            if entry.existed {
                let backup = entry.backup.as_deref().ok_or_else(|| {
                    ClientError::message("repair snapshot is missing a backup name")
                })?;
                let bytes = fs::read(self.root.join(backup))?;
                crate::durable_file::atomic_write_owner_only(&entry.path, &bytes)?;
                set_optional_mode(&entry.path, entry.mode)?;
            } else {
                remove_if_present(&entry.path)?;
            }
        }
        Ok(())
    }
}

fn capture_entry(root: &Path, index: usize, path: PathBuf) -> Result<SnapshotEntry, ClientError> {
    let (exists, hash) = current_state(&path)?;
    let mode = file_mode(&path);
    let backup = if exists {
        let name = format!("{index}.backup");
        crate::durable_file::atomic_write_owner_only(&root.join(&name), &fs::read(&path)?)?;
        set_mode(&root.join(&name), 0o600)?;
        Some(name)
    } else {
        None
    };
    Ok(SnapshotEntry {
        path,
        existed: exists,
        mode,
        before_sha256: hash,
        after_sha256: None,
        backup,
    })
}

fn current_state(path: &Path) -> Result<(bool, Option<String>), ClientError> {
    match fs::symlink_metadata(path) {
        Ok(metadata) if !metadata.file_type().is_symlink() && metadata.is_file() => {
            let bytes = fs::read(path)?;
            Ok((true, Some(hex::encode(Sha256::digest(bytes)))))
        }
        Ok(metadata) => Err(ClientError::message(format!(
            "refusing to access {} because it is {}",
            path.display(),
            if metadata.file_type().is_symlink() {
                "a symlink"
            } else {
                "not a regular file"
            }
        ))),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok((false, None)),
        Err(error) => Err(error.into()),
    }
}

fn validate_id(id: &str) -> Result<(), ClientError> {
    if id.is_empty()
        || !id
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || byte == b'_' || byte == b'-')
    {
        return Err(ClientError::message("invalid repair backup id"));
    }
    Ok(())
}

fn remove_if_present(path: &Path) -> Result<(), ClientError> {
    match fs::remove_file(path) {
        Ok(()) => Ok(()),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(error) => Err(error.into()),
    }
}

#[cfg(unix)]
fn file_mode(path: &Path) -> Option<u32> {
    use std::os::unix::fs::PermissionsExt as _;
    fs::metadata(path)
        .ok()
        .map(|metadata| metadata.permissions().mode() & 0o7777)
}

#[cfg(not(unix))]
fn file_mode(_path: &Path) -> Option<u32> {
    None
}

#[cfg(unix)]
fn set_mode(path: &Path, mode: u32) -> Result<(), ClientError> {
    use std::os::unix::fs::PermissionsExt as _;
    fs::set_permissions(path, fs::Permissions::from_mode(mode))?;
    Ok(())
}

#[cfg(not(unix))]
fn set_mode(_path: &Path, _mode: u32) -> Result<(), ClientError> {
    Ok(())
}

fn set_optional_mode(path: &Path, mode: Option<u32>) -> Result<(), ClientError> {
    if let Some(mode) = mode {
        set_mode(path, mode)?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::clients::TokenSource;

    #[test]
    fn rollback_ids_are_opaque_names_not_paths() {
        assert!(validate_id("abc-DEF_123").is_ok());
        assert!(validate_id("../escape").is_err());
        assert!(validate_id("a/b").is_err());
        assert!(validate_id("").is_err());
    }

    fn credential() -> ManagedCredential {
        ManagedCredential {
            client: "claude".into(),
            source: TokenSource::Supplied,
            token_id: Some("record-id-not-a-secret".into()),
            label: None,
            issued_at: None,
            router: Some("http://router.test:8080".into()),
            principal_id: Some("primary".into()),
        }
    }

    #[test]
    fn repair_snapshot_is_private_secret_free_and_exactly_rollbackable() {
        let home = tempfile::tempdir().expect("home");
        let manager = ClientManager::isolated(home.path());
        let path = manager.config_path(ClientKind::ClaudeCode);
        fs::create_dir_all(path.parent().unwrap()).unwrap();
        let original = br#"{"helper":"preserved","env":{"ANTHROPIC_AUTH_TOKEN":"vendor-secret","ANTHROPIC_BASE_URL":"https://helper.invalid"}}"#;
        fs::write(&path, original).unwrap();
        set_mode(&path, 0o640).unwrap();

        let result = manager
            .apply_repair(
                ClientKind::ClaudeCode,
                "http://router.test:8080",
                "la_sk_router_secret",
                &credential(),
                &[],
            )
            .expect("repair");
        assert_eq!(result.after, OwnershipState::ManagedIntact);
        let id = result.backup_id.as_deref().expect("snapshot id");
        let root = manager.repair_root().join(id);
        let manifest = fs::read_to_string(root.join("manifest.json")).unwrap();
        assert!(!manifest.contains("vendor-secret"));
        assert!(!manifest.contains("la_sk_router_secret"));
        #[cfg(unix)]
        {
            assert_eq!(file_mode(&root), Some(0o700));
            for entry in fs::read_dir(&root).unwrap() {
                assert_eq!(file_mode(&entry.unwrap().path()), Some(0o600));
            }
        }

        manager
            .rollback_repair(ClientKind::ClaudeCode, id)
            .expect("rollback");
        assert_eq!(fs::read(&path).unwrap(), original);
        assert_eq!(file_mode(&path), Some(0o640));
        assert!(!manager.environment_path(ClientKind::ClaudeCode).exists());
        assert!(
            !manager
                .credential_metadata_path(ClientKind::ClaudeCode)
                .exists()
        );
    }

    #[test]
    fn rollback_refuses_a_post_repair_edit() {
        let home = tempfile::tempdir().expect("home");
        let manager = ClientManager::isolated(home.path());
        let result = manager
            .apply_repair(
                ClientKind::ClaudeCode,
                "http://router.test:8080",
                "la_sk_router_secret",
                &credential(),
                &[],
            )
            .expect("repair");
        fs::write(
            manager.config_path(ClientKind::ClaudeCode),
            b"user edited after repair",
        )
        .unwrap();
        let error = manager
            .rollback_repair(ClientKind::ClaudeCode, result.backup_id.as_deref().unwrap())
            .expect_err("must preserve later edits");
        assert!(error.to_string().contains("changed after repair"));
    }

    #[cfg(unix)]
    #[test]
    fn repair_refuses_symlink_targets() {
        use std::os::unix::fs::symlink;

        let home = tempfile::tempdir().expect("home");
        let manager = ClientManager::isolated(home.path());
        let outside = home.path().join("outside");
        fs::write(&outside, b"outside").unwrap();
        let path = manager.config_path(ClientKind::ClaudeCode);
        fs::create_dir_all(path.parent().unwrap()).unwrap();
        symlink(&outside, &path).unwrap();
        let error = manager
            .apply_repair(
                ClientKind::ClaudeCode,
                "http://router.test:8080",
                "la_sk_router_secret",
                &credential(),
                &[],
            )
            .expect_err("symlink must be refused");
        assert!(error.to_string().contains("symlink"));
        assert_eq!(fs::read(&outside).unwrap(), b"outside");
    }
}
