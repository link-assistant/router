//! Transactional, edit-aware client configuration repair.

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
fn transaction_checkpoint(_stage: &'static str) -> Result<(), ClientError> {
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
    pub(crate) fn apply_repair(
        &self,
        client: ClientKind,
        base_url: &str,
        token: &str,
        credential: &ManagedCredential,
        models: &[RouterModel],
    ) -> Result<RepairResult, ClientError> {
        crate::durable_file::with_exclusive_lock(&self.repair_lock_path(client), || {
            self.apply_repair_locked(client, base_url, token, credential, models)
        })
    }

    /// Merge ordinary persistent setup as one transaction while preserving
    /// its permissive merge semantics and user-facing backup.
    pub(crate) fn apply_setup_transaction(
        &self,
        client: ClientKind,
        base_url: &str,
        token: &str,
        credential: &ManagedCredential,
        models: &[RouterModel],
    ) -> Result<SetupResult, ClientError> {
        crate::durable_file::with_exclusive_lock(&self.repair_lock_path(client), || {
            let before = self.analyze(client)?;
            let snapshot = self.capture_snapshot(client, &before)?;
            let mut setup_backup = None;
            let result: Result<SetupResult, ClientError> = (|| {
                snapshot.verify_before()?;
                let setup = self.setup(client, base_url, models)?;
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
                        message.push_str(&format!("; setup-backup cleanup also failed: {backup}"));
                    }
                    if let Some(rollback) = rollback_error {
                        message.push_str(&format!("; automatic rollback also failed: {rollback}"));
                    }
                    if let Some(cleanup) = cleanup_error {
                        message.push_str(&format!("; snapshot cleanup also failed: {cleanup}"));
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
    pub(crate) fn apply_configure_transaction(
        &self,
        client: ClientKind,
        base_url: &str,
        token: &str,
        credential: &ManagedCredential,
        models: &[RouterModel],
    ) -> Result<PathBuf, ClientError> {
        crate::durable_file::with_exclusive_lock(&self.repair_lock_path(client), || {
            let before = self.analyze(client)?;
            let snapshot = self.capture_snapshot(client, &before)?;
            let mut global_applied = false;
            let result: Result<PathBuf, ClientError> = (|| {
                snapshot.verify_before()?;
                let path = crate::client_global::apply_with_manager(self, client, base_url, models)
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
                        message.push_str(&format!("; global undo also failed: {undo}"));
                    }
                    if let Some(rollback) = rollback_error {
                        message.push_str(&format!("; automatic rollback also failed: {rollback}"));
                    }
                    if let Some(cleanup) = cleanup_error {
                        message.push_str(&format!("; snapshot cleanup also failed: {cleanup}"));
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
    ) -> Result<RepairResult, ClientError> {
        let before = self.analyze(client)?;
        let same_credential = client.token_env().is_some_and(|key| {
            super::read_environment_value(&self.environment_path(client), key)
                .ok()
                .flatten()
                .as_deref()
                == Some(token)
        });
        if before.state == OwnershipState::ManagedIntact
            && self.managed_target_matches(client, base_url)?
            && same_credential
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
            if let Some(path) = self.ownership_marker_path(client)
                && !before
                    .conflicts
                    .iter()
                    .any(|conflict| conflict == "ownership-marker:invalid")
            {
                snapshot.verify_before_path(&path)?;
            }
            let setup = self.setup(client, base_url, models)?;
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

    #[test]
    fn every_setup_write_is_rolled_back_for_every_supported_client() {
        let clients = [
            ClientKind::Codex,
            ClientKind::ClaudeCode,
            ClientKind::GrokCli,
            ClientKind::Opencode,
            ClientKind::QwenCode,
            ClientKind::Agent,
        ];
        for client in clients {
            for stage in ["config", "environment", "metadata", "undo-state"] {
                let home = tempfile::tempdir().expect("home");
                let manager = ClientManager::isolated(home.path());
                let credential = ManagedCredential {
                    client: client.to_string(),
                    source: TokenSource::Minted,
                    token_id: Some("candidate-id".into()),
                    label: Some(format!("client-{client}")),
                    issued_at: Some(1),
                    router: Some("http://router.test:8080".into()),
                    principal_id: Some("primary".into()),
                    config_sha256: None,
                };
                FAIL_AFTER_WRITE.set(Some(stage));
                let result = manager.apply_repair(
                    client,
                    "http://router.test:8080",
                    "la_sk_candidate",
                    &credential,
                    &[RouterModel {
                        id: "future-model".into(),
                        owned_by: "future-provider".into(),
                    }],
                );
                FAIL_AFTER_WRITE.set(None);
                let error = result.expect_err("the injected write must fail");
                assert!(
                    error.to_string().contains(stage),
                    "{client}/{stage}: {error}"
                );
                for path in manager.repair_paths(client) {
                    assert!(
                        !path.exists(),
                        "{client}/{stage} left a transaction target at {}",
                        path.display()
                    );
                }
            }
        }
    }

    #[test]
    fn every_configure_write_is_rolled_back_for_every_file_configurable_client() {
        let clients = [
            ClientKind::Codex,
            ClientKind::ClaudeCode,
            ClientKind::Opencode,
            ClientKind::QwenCode,
            ClientKind::Agent,
        ];
        for client in clients {
            for stage in ["config", "environment", "metadata"] {
                let home = tempfile::tempdir().expect("home");
                let manager = ClientManager::isolated(home.path());
                let credential = ManagedCredential {
                    client: client.to_string(),
                    source: TokenSource::Minted,
                    token_id: Some("candidate-id".into()),
                    label: Some(format!("configure-{client}")),
                    issued_at: Some(1),
                    router: Some("http://router.test:8080".into()),
                    principal_id: Some("primary".into()),
                    config_sha256: None,
                };
                FAIL_AFTER_WRITE.set(Some(stage));
                let result = manager.apply_configure_transaction(
                    client,
                    "http://router.test:8080",
                    "la_sk_candidate",
                    &credential,
                    &[RouterModel {
                        id: "future-model".into(),
                        owned_by: "future-provider".into(),
                    }],
                );
                FAIL_AFTER_WRITE.set(None);
                let error = result.expect_err("the injected write must fail");
                assert!(
                    error.to_string().contains(stage),
                    "{client}/{stage}: {error}"
                );
                for path in manager.repair_paths(client) {
                    assert!(
                        !path.exists(),
                        "{client}/{stage} left a transaction target at {}",
                        path.display()
                    );
                }
            }
        }
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
            config_sha256: None,
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
        #[cfg(unix)]
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

    #[test]
    fn repair_lock_covers_analysis_and_preserves_a_waiting_user_edit() {
        let home = tempfile::tempdir().expect("home");
        let path = home.path().join(".claude/settings.json");
        fs::create_dir_all(path.parent().unwrap()).unwrap();
        fs::write(&path, br#"{"theme":"before"}"#).unwrap();

        let manager = ClientManager::isolated(home.path());
        let lock_path = manager.repair_lock_path(ClientKind::ClaudeCode);
        fs::create_dir_all(lock_path.parent().unwrap()).unwrap();
        let held = fs::OpenOptions::new()
            .read(true)
            .write(true)
            .create(true)
            .truncate(false)
            .open(&lock_path)
            .unwrap();
        held.lock().unwrap();

        let repair_home = home.path().to_path_buf();
        let (sent, received) = std::sync::mpsc::channel();
        let worker = std::thread::spawn(move || {
            let manager = ClientManager::isolated(&repair_home);
            let result = manager.apply_repair(
                ClientKind::ClaudeCode,
                "http://router.test:8080",
                "la_sk_router_secret",
                &credential(),
                &[],
            );
            sent.send(result).unwrap();
        });

        std::thread::sleep(std::time::Duration::from_millis(50));
        assert!(
            received.try_recv().is_err(),
            "repair ignored its client lock"
        );
        fs::write(&path, br#"{"theme":"edited-while-waiting"}"#).unwrap();
        drop(held);

        let result = received
            .recv_timeout(std::time::Duration::from_secs(5))
            .expect("repair completed after lock release")
            .expect("repair succeeded");
        worker.join().unwrap();
        manager
            .rollback_repair(ClientKind::ClaudeCode, result.backup_id.as_deref().unwrap())
            .expect("rollback latest pre-repair bytes");
        assert_eq!(
            fs::read(&path).unwrap(),
            br#"{"theme":"edited-while-waiting"}"#
        );
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
