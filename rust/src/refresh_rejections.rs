//! Which credentials a refresh has already been refused for, across restarts.
//!
//! The in-memory record answers this for a running router, but `accounts list`
//! is a separate short-lived process: it has performed no refresh, so it had
//! nothing to consult and reported a revoked chain as `refreshable` — the
//! contradiction issue #245 was filed about, in the very command it reproduced
//! with.
//!
//! Only a SHA-256 fingerprint of the credential is written, never the token.
//! That is also what makes the record expire correctly: once a holder rotates
//! the chain forward the file no longer matches, the verdict stops applying,
//! and the account reports recoverable again with no restart and no manual
//! step — the same "re-read the store before concluding" rule the refresh
//! ladder already follows (issue #239).

use std::collections::BTreeMap;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

use crate::subscription::{SubscriptionProvider, SubscriptionToken};

/// Hex-encoded fingerprint of a credential's contents.
///
/// The fingerprint, never the token: a file that outlives the process must not
/// carry a secret, and a hash is all the identity a "has this exact chain link
/// been refused?" question needs (issue #245).
fn fingerprint_hex(credential: &SubscriptionToken) -> String {
    crate::refresh::credential_fingerprint(credential)
        .iter()
        .fold(String::with_capacity(64), |mut out, byte| {
            use std::fmt::Write as _;
            let _ = write!(out, "{byte:02x}");
            out
        })
}

/// File name inside the router's data directory.
pub const REJECTIONS_FILE_NAME: &str = "refresh-rejections.lino";

/// Fingerprints of refused credentials, keyed by `<provider>/<account>`.
#[derive(Debug, Default, Clone, Deserialize, Serialize)]
struct RejectionFile {
    /// Hex-encoded SHA-256 of the credential that was refused.
    #[serde(default)]
    refused: BTreeMap<String, String>,
}

/// A durable record of terminal refresh refusals.
#[derive(Debug, Clone)]
pub struct RejectionStore {
    path: PathBuf,
}

impl RejectionStore {
    /// Open the store kept in `data_dir`.
    #[must_use]
    pub fn open(data_dir: &Path) -> Self {
        Self {
            path: data_dir.join(REJECTIONS_FILE_NAME),
        }
    }

    /// Record that a refresh was refused for exactly `credential`.
    ///
    /// A store that cannot be written is not an error worth failing a request
    /// over: the in-memory record still holds for this process, and the next
    /// write may succeed. It is logged rather than propagated.
    pub fn record(
        &self,
        provider: SubscriptionProvider,
        account: &str,
        credential: &SubscriptionToken,
    ) {
        let mut file = self.load();
        file.refused
            .insert(Self::key(provider, account), fingerprint_hex(credential));
        if let Err(error) = self.save(&file) {
            tracing::warn!(
                "could not record the refused {provider} credential for {account}: {error}"
            );
        }
    }

    /// Forget any refusal recorded for `account`, after a refresh succeeded.
    pub fn clear(&self, provider: SubscriptionProvider, account: &str) {
        let mut file = self.load();
        if file.refused.remove(&Self::key(provider, account)).is_none() {
            return;
        }
        if let Err(error) = self.save(&file) {
            tracing::warn!("could not clear the {provider} refusal for {account}: {error}");
        }
    }

    /// Whether a refresh has already been refused for exactly this credential.
    #[must_use]
    pub fn was_refused(
        &self,
        provider: SubscriptionProvider,
        account: &str,
        credential: &SubscriptionToken,
    ) -> bool {
        let fingerprint = fingerprint_hex(credential);
        self.load()
            .refused
            .get(&Self::key(provider, account))
            .is_some_and(|recorded| *recorded == fingerprint)
    }

    /// Read on every call rather than cached: a running router writes this file
    /// while the CLI reads it, and a cached copy would answer with what was
    /// true when the process started — the staleness this store exists to end.
    fn load(&self) -> RejectionFile {
        std::fs::read_to_string(&self.path)
            .ok()
            .and_then(|raw| crate::lino_json::decode::<RejectionFile>(&raw).ok())
            .unwrap_or_default()
    }

    fn save(&self, file: &RejectionFile) -> Result<(), Box<dyn std::error::Error>> {
        if let Some(parent) = self.path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        let encoded = crate::lino_json::encode(file)?;
        let temporary = self
            .path
            .with_extension(format!("tmp-{}", uuid::Uuid::new_v4()));
        // Owner-only, like every sibling in the data directory. This file
        // carries fingerprints rather than secrets, but a record of which
        // accounts are dead is still an operator's business alone, and a file
        // whose permissions differ from its neighbours invites the question of
        // why.
        let mut options = std::fs::OpenOptions::new();
        options.write(true).create_new(true);
        #[cfg(unix)]
        {
            use std::os::unix::fs::OpenOptionsExt as _;
            options.mode(0o600);
        }
        {
            use std::io::Write as _;
            let mut handle = options.open(&temporary)?;
            handle.write_all(encoded.as_bytes())?;
            handle.write_all(b"\n")?;
            handle.sync_all()?;
        }
        std::fs::rename(&temporary, &self.path)?;
        Ok(())
    }

    fn key(provider: SubscriptionProvider, account: &str) -> String {
        format!("{provider}/{account}")
    }
}

/// In-memory refusals plus their durable mirror.
///
/// One type so callers cannot consult one and forget the other: the running
/// router needs the fast in-process answer, and `accounts list` — a separate
/// short-lived process — needs the recorded one (issue #245).
#[derive(Debug, Default)]
pub struct RejectionRecord {
    remembered:
        std::sync::Mutex<std::collections::HashMap<(SubscriptionProvider, String), [u8; 32]>>,
    durable: std::sync::Mutex<Option<RejectionStore>>,
}

impl RejectionRecord {
    /// Mirror refusals into `data_dir` so a later process can read them.
    pub fn persist_in(&self, data_dir: &Path) {
        if let Ok(mut guard) = self.durable.lock() {
            *guard = Some(RejectionStore::open(data_dir));
        }
    }

    /// Record that a refresh was refused for exactly `credential`.
    pub fn record(
        &self,
        provider: SubscriptionProvider,
        account: &str,
        credential: &SubscriptionToken,
    ) {
        if let Ok(mut guard) = self.remembered.lock() {
            guard.insert(
                (provider, account.to_string()),
                crate::refresh::credential_fingerprint(credential),
            );
        }
        if let Some(store) = self.store() {
            store.record(provider, account, credential);
        }
    }

    /// Forget any refusal for `account`, after a refresh succeeded.
    pub fn clear(&self, provider: SubscriptionProvider, account: &str) {
        if let Ok(mut guard) = self.remembered.lock() {
            guard.remove(&(provider, account.to_string()));
        }
        if let Some(store) = self.store() {
            store.clear(provider, account);
        }
    }

    /// Whether a refresh was already refused for exactly this credential.
    #[must_use]
    pub fn was_refused(
        &self,
        provider: SubscriptionProvider,
        account: &str,
        credential: &SubscriptionToken,
    ) -> bool {
        let fingerprint = crate::refresh::credential_fingerprint(credential);
        let remembered = self
            .remembered
            .lock()
            .ok()
            .and_then(|guard| {
                guard
                    .get(&(provider, account.to_string()))
                    .map(|refused| *refused == fingerprint)
            })
            .unwrap_or(false);
        remembered
            || self
                .store()
                .is_some_and(|store| store.was_refused(provider, account, credential))
    }

    fn store(&self) -> Option<RejectionStore> {
        self.durable.lock().ok().and_then(|guard| guard.clone())
    }
}

#[cfg(test)]
#[path = "refresh_rejections_tests.rs"]
mod tests;
