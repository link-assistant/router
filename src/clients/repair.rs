//! Transactional, edit-aware client configuration repair.

use std::fmt::Write as _;
use std::fs;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};
use sha2::{Digest as _, Sha256};

use super::{
    ClientConfigAnalysis, ClientError, ClientKind, ClientManager, ManagedCredential,
    OwnershipState, RouterModel, SetupResult,
};

#[cfg(test)]
thread_local! {
    static FAIL_AFTER_WRITE: std::cell::Cell<Option<&'static str>> = const { std::cell::Cell::new(None) };
}

#[cfg(test)]
fn transaction_checkpoint(stage: &'static str) -> Result<(), ClientError> {
    if FAIL_AFTER_WRITE.get() == Some(stage) {
        return Err(ClientError::message(format!(
            "injected transaction failure after {stage}"
        )));
    }
    Ok(())
}

#[cfg(not(test))]
#[inline]
#[allow(clippy::unnecessary_wraps)]
const fn transaction_checkpoint(_stage: &'static str) -> Result<(), ClientError> {
    Ok(())
}

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
    /// Whether the complete managed configuration already targets this public
    /// router origin. This check intentionally does not read or return the
    /// credential value, so callers can avoid minting a replacement before
    /// deciding that an identical setup is a no-op.
    pub(crate) fn managed_target_matches(
        &self,
        client: ClientKind,
        base_url: &str,
    ) -> Result<bool, ClientError> {
        if self.analyze(client)?.state != OwnershipState::ManagedIntact {
            return Ok(false);
        }
        let Some(metadata) = self.credential_metadata(client)? else {
            return Ok(false);
        };
        let Some(recorded) = metadata.router else {
            return Ok(false);
        };
        let requested = crate::managed_server::canonical_server_origin(base_url)
            .map_err(|error| ClientError::message(error.to_string()))?;
        let recorded = crate::managed_server::canonical_server_origin(&recorded)
            .map_err(|error| ClientError::message(error.to_string()))?;
        let current_hash = config_digest(&self.config_path(client))?;
        Ok(requested == recorded && metadata.config_sha256.as_deref() == Some(&current_hash))
    }

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
    #[allow(dead_code)]
    pub(crate) fn apply_repair(
        &self,
        client: ClientKind,
        base_url: &str,
        token: &str,
        credential: &ManagedCredential,
        models: &[RouterModel],
    ) -> Result<RepairResult, ClientError> {
        self.apply_repair_with_codex_backend(client, base_url, token, credential, models, None)
    }

    pub(crate) fn apply_repair_with_codex_backend(
        &self,
        client: ClientKind,
        base_url: &str,
        token: &str,
        credential: &ManagedCredential,
        models: &[RouterModel],
        codex_backend_base_url: Option<&str>,
    ) -> Result<RepairResult, ClientError> {
        crate::durable_file::with_exclusive_lock(&self.repair_lock_path(client), || {
            self.apply_repair_locked(
                client,
                base_url,
                token,
                credential,
                models,
                codex_backend_base_url,
            )
        })
    }

    /// Merge ordinary persistent setup as one transaction while preserving
    /// its permissive merge semantics and user-facing backup.
    #[allow(dead_code)]
    pub(crate) fn apply_setup_transaction(
        &self,
        client: ClientKind,
        base_url: &str,
        token: &str,
        credential: &ManagedCredential,
        models: &[RouterModel],
    ) -> Result<SetupResult, ClientError> {
        self.apply_setup_transaction_with_codex_backend(
            client, base_url, token, credential, models, None,
        )
    }

    pub(crate) fn apply_setup_transaction_with_codex_backend(
        &self,
        client: ClientKind,
        base_url: &str,
        token: &str,
        credential: &ManagedCredential,
        models: &[RouterModel],
        codex_backend_base_url: Option<&str>,
    ) -> Result<SetupResult, ClientError> {
        crate::durable_file::with_exclusive_lock(&self.repair_lock_path(client), || {
            let before = self.analyze(client)?;
            let snapshot = self.capture_snapshot(client, &before)?;
            let mut setup_backup = None;
            let result: Result<SetupResult, ClientError> = (|| {
                snapshot.verify_before()?;
                let setup = self.setup_with_codex_backend(
                    client,
                    base_url,
                    models,
                    codex_backend_base_url,
                )?;
                setup_backup.clone_from(&setup.backup);
                transaction_checkpoint("config")?;
                snapshot.verify_before_path(&self.environment_path(client))?;
                self.write_environment(client, base_url, token)?;
                transaction_checkpoint("environment")?;
                snapshot.verify_before_path(&self.credential_metadata_path(client))?;
                let mut credential = credential.clone();
                credential.config_sha256 = Some(config_digest(&self.config_path(client))?);
                self.write_credential_metadata(client, &credential)?;
                transaction_checkpoint("metadata")?;
                crate::client_global::update_post_configure_hash(
                    &self.config_path(client),
                    self.ownership_marker_path(client).as_deref(),
                )
                .map_err(|error| ClientError::message(error.to_string()))?;
                transaction_checkpoint("undo-state")?;
                Ok(setup)
            })();
            match result {
                Ok(setup) => {
                    if let Err(error) = fs::remove_dir_all(&snapshot.root) {
                        tracing::warn!(
                            path = %snapshot.root.display(),
                            %error,
                            "setup committed but its owner-only transaction snapshot remains"
                        );
                    }
                    Ok(setup)
                }
                Err(error) => {
                    let backup_error = setup_backup
                        .as_deref()
                        .map(remove_if_present)
                        .transpose()
                        .err();
                    let rollback_error = snapshot.restore(false).err();
                    let cleanup_error = fs::remove_dir_all(&snapshot.root).err();
                    let mut message = error.to_string();
                    if let Some(backup) = backup_error {
                        let _ = write!(message, "; setup-backup cleanup also failed: {backup}");
                    }
                    if let Some(rollback) = rollback_error {
                        let _ = write!(message, "; automatic rollback also failed: {rollback}");
                    }
                    if let Some(cleanup) = cleanup_error {
                        let _ = write!(message, "; snapshot cleanup also failed: {cleanup}");
                    }
                    Err(ClientError::message(message))
                }
            }
        })
    }

    /// Apply the reversible global client configuration and its credential
    /// files as one transaction. A failure after the public config write
    /// restores every prior byte and mode and removes the newly-created undo
    /// artifacts.
    #[allow(dead_code)]
    pub(crate) fn apply_configure_transaction(
        &self,
        client: ClientKind,
        base_url: &str,
        token: &str,
        credential: &ManagedCredential,
        models: &[RouterModel],
    ) -> Result<PathBuf, ClientError> {
        self.apply_configure_transaction_with_codex_backend(
            client, base_url, token, credential, models, None,
        )
    }

    pub(crate) fn apply_configure_transaction_with_codex_backend(
        &self,
        client: ClientKind,
        base_url: &str,
        token: &str,
        credential: &ManagedCredential,
        models: &[RouterModel],
        codex_backend_base_url: Option<&str>,
    ) -> Result<PathBuf, ClientError> {
        crate::durable_file::with_exclusive_lock(&self.repair_lock_path(client), || {
            let before = self.analyze(client)?;
            let snapshot = self.capture_snapshot(client, &before)?;
            let mut global_applied = false;
            let result: Result<PathBuf, ClientError> = (|| {
                snapshot.verify_before()?;
                let path = crate::client_global::apply_with_manager_and_codex_backend(
                    self,
                    client,
                    base_url,
                    models,
                    codex_backend_base_url,
                )
                .map_err(|error| ClientError::message(error.to_string()))?;
                global_applied = true;
                transaction_checkpoint("config")?;
                self.write_environment(client, base_url, token)?;
                transaction_checkpoint("environment")?;
                let mut credential = credential.clone();
                credential.config_sha256 = Some(config_digest(&self.config_path(client))?);
                self.write_credential_metadata(client, &credential)?;
                transaction_checkpoint("metadata")?;
                Ok(path)
            })();
            let path = match result {
                Ok(path) => path,
                Err(error) => {
                    let undo_error = global_applied
                        .then(|| crate::client_global::undo_with_manager(self, client))
                        .transpose()
                        .err();
                    let rollback_error = snapshot.restore(false).err();
                    let cleanup_error = fs::remove_dir_all(&snapshot.root).err();
                    let mut message = error.to_string();
                    if let Some(undo) = undo_error {
                        let _ = write!(message, "; global undo also failed: {undo}");
                    }
                    if let Some(rollback) = rollback_error {
                        let _ = write!(message, "; automatic rollback also failed: {rollback}");
                    }
                    if let Some(cleanup) = cleanup_error {
                        let _ = write!(message, "; snapshot cleanup also failed: {cleanup}");
                    }
                    return Err(ClientError::message(message));
                }
            };
            if let Err(error) = fs::remove_dir_all(&snapshot.root) {
                tracing::warn!(
                    path = %snapshot.root.display(),
                    %error,
                    "configuration committed but its owner-only transaction snapshot remains"
                );
            }
            Ok(path)
        })
    }

    fn apply_repair_locked(
        &self,
        client: ClientKind,
        base_url: &str,
        token: &str,
        credential: &ManagedCredential,
        models: &[RouterModel],
        codex_backend_base_url: Option<&str>,
    ) -> Result<RepairResult, ClientError> {
        let before = self.analyze(client)?;
        let same_credential = client.token_env().is_some_and(|key| {
            super::read_environment_value(&self.environment_path(client), key)
                .ok()
                .flatten()
                .as_deref()
                == Some(token)
        });
        let same_codex_backend = codex_backend_base_url.is_none_or(|expected| {
            client != ClientKind::Codex || self.codex_backend_matches(expected).unwrap_or(false)
        });
        if before.state == OwnershipState::ManagedIntact
            && self.managed_target_matches(client, base_url)?
            && same_credential
            && same_codex_backend
        {
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

        if client == ClientKind::Codex {
            self.validate_codex_catalog_constraint()?;
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
                snapshot.verify_before_path(&path)?;
                remove_if_present(&path)?;
            }
            snapshot.verify_before_path(&self.config_path(client))?;
            if client == ClientKind::Codex {
                self.remove_codex_catalog_constraint()?;
            }
            if let Some(path) = self.ownership_marker_path(client)
                && !before
                    .conflicts
                    .iter()
                    .any(|conflict| conflict == "ownership-marker:invalid")
            {
                snapshot.verify_before_path(&path)?;
            }
            let setup =
                self.setup_with_codex_backend(client, base_url, models, codex_backend_base_url)?;
            if let Some(path) = setup.backup.as_deref() {
                remove_if_present(path)?;
            }
            transaction_checkpoint("config")?;
            snapshot.verify_before_path(&self.environment_path(client))?;
            self.write_environment(client, base_url, token)?;
            transaction_checkpoint("environment")?;
            snapshot.verify_before_path(&self.credential_metadata_path(client))?;
            let mut credential = credential.clone();
            credential.config_sha256 = Some(config_digest(&self.config_path(client))?);
            self.write_credential_metadata(client, &credential)?;
            transaction_checkpoint("metadata")?;
            snapshot.verify_before_path(&crate::client_global::undo_state_path(
                &self.config_path(client),
            ))?;
            crate::client_global::update_post_configure_hash(
                &self.config_path(client),
                self.ownership_marker_path(client).as_deref(),
            )
            .map_err(|error| ClientError::message(error.to_string()))?;
            transaction_checkpoint("undo-state")?;
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
        crate::durable_file::with_exclusive_lock(&self.repair_lock_path(client), || {
            self.rollback_repair_locked(client, id)
        })
    }

    fn rollback_repair_locked(
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

    fn repair_lock_path(&self, client: ClientKind) -> PathBuf {
        self.config_home
            .join("link-assistant-router/clients")
            .join(format!("{}.repair.lock", client.canonical_name()))
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
        paths.extend(crate::client_global::transaction_paths(
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

    fn verify_before_path(&self, path: &Path) -> Result<(), ClientError> {
        let entry = self
            .manifest
            .entries
            .iter()
            .find(|entry| entry.path == path)
            .ok_or_else(|| {
                ClientError::message("repair path is outside the captured allow-list")
            })?;
        let current = current_state(path)?;
        if current.0 != entry.existed || current.1 != entry.before_sha256 {
            return Err(ClientError::message(format!(
                "{} changed immediately before replacement; retry repair",
                path.display()
            )));
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

fn config_digest(path: &Path) -> Result<String, ClientError> {
    match fs::read(path) {
        Ok(bytes) => Ok(hex::encode(Sha256::digest(bytes))),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
            Ok(hex::encode(Sha256::digest([])))
        }
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
#[path = "repair_tests.rs"]
mod tests;
