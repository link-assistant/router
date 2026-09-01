//! Where each subscription's credential lives, and who else can rotate it.
//!
//! Kept beside [`super::TokenCache`] rather than inside it because these are
//! bookkeeping, not policy: every path that can refresh a token registers what
//! it knows here, and the recovery ladder reads it back (issue #239).

use std::sync::Arc;

use super::{SubscriptionKey, TokenCache};
use crate::credential_recovery_store::RecoverableCredentialStore;
use crate::credential_store::CredentialStore;
use crate::subscription::{SubscriptionProvider, SubscriptionReader};
use crate::vendor_cli_refresh::VendorCli;

impl TokenCache {
    /// Load one credential from its authoritative registered store.
    ///
    /// Recovery-aware stores may reconcile a sidecar into the vendor's primary
    /// document while loading, so this operation takes the store's exact
    /// durable transaction lock. The guard is dropped before this method
    /// returns: callers must never carry it into an OAuth or catalog request.
    pub async fn load_authoritative(
        &self,
        provider: SubscriptionProvider,
        account: &str,
    ) -> Result<Option<crate::subscription::SubscriptionToken>, String> {
        let store = self
            .store_for_subscription(provider, account)
            .ok_or_else(|| format!("no durable {provider} credential store is registered"))?;
        let lock_path = store.lock_path().ok_or_else(|| {
            format!("no durable transaction lock is available for {provider} credentials")
        })?;
        let _guard = crate::durable_file::lock_exclusive_async(
            &lock_path,
            crate::credential_recovery_store::CREDENTIAL_LOCK_TIMEOUT,
        )
        .await
        .map_err(|error| {
            if error.kind() == std::io::ErrorKind::WouldBlock {
                format!("timed out waiting for the {provider} credential transaction lock")
            } else {
                format!("could not acquire the {provider} credential transaction lock")
            }
        })?;
        store
            .try_reload()
            .map_err(|_| format!("the {provider} credential store is unusable"))
    }

    /// Register where a subscription's credential lives.
    ///
    /// Every path that can refresh a token registers its store, so a rotation
    /// performed while serving a request is written back exactly as one
    /// performed by catalog polling is, and a rejection can be checked against
    /// the newest credential on disk before it is believed (issue #239).
    pub fn register_store(
        &self,
        provider: SubscriptionProvider,
        account: &str,
        store: Arc<dyn CredentialStore>,
    ) {
        if let Ok(mut guard) = self.stores.lock() {
            guard.insert(key(provider, account), store);
        }
    }

    /// Register a [`SubscriptionReader`] as the credential store for an account.
    pub fn register_reader(&self, account: &str, reader: &SubscriptionReader) {
        self.register_store_if_absent(reader.provider(), account, Arc::new(reader.clone()));
    }

    /// Register every reader under the same account name.
    pub fn register_readers(&self, account: &str, readers: &[SubscriptionReader]) {
        for reader in readers {
            self.register_reader(account, reader);
        }
    }

    /// Register every reader with data-directory-backed durable recovery.
    pub fn register_readers_in(
        &self,
        account: &str,
        readers: &[SubscriptionReader],
        data_dir: &std::path::Path,
    ) {
        for reader in readers {
            let primary: Arc<dyn CredentialStore> = Arc::new(reader.clone());
            let recoverable = Arc::new(RecoverableCredentialStore::new(
                reader.provider(),
                account,
                primary,
                data_dir,
            ));
            self.register_store(reader.provider(), account, recoverable);
        }
    }

    /// Construct a diagnostic cache with the same durable stores as serving.
    #[must_use]
    pub fn registered_for(readers: &[SubscriptionReader], data_dir: &std::path::Path) -> Self {
        let cache = Self::new();
        cache.register_readers_in(
            crate::credential_recovery_store::PRIMARY_ACCOUNT,
            readers,
            data_dir,
        );
        cache.persist_rejections_in(data_dir);
        cache
    }

    fn register_store_if_absent(
        &self,
        provider: SubscriptionProvider,
        account: &str,
        store: Arc<dyn CredentialStore>,
    ) {
        if let Ok(mut guard) = self.stores.lock() {
            guard.entry(key(provider, account)).or_insert(store);
        }
    }

    /// The registered credential store for a subscription, if any.
    #[must_use]
    pub fn store_for_subscription(
        &self,
        provider: SubscriptionProvider,
        account: &str,
    ) -> Option<Arc<dyn CredentialStore>> {
        let guard = self.stores.lock().ok()?;
        guard.get(&key(provider, account)).map(Arc::clone)
    }

    /// Allow the recovery ladder to ask a vendor client to rotate this
    /// subscription's credential once every direct exchange has been rejected.
    ///
    /// Registered only when an operator configured a CLI binary: running a
    /// vendor client is a side effect nobody should get by default.
    pub fn register_vendor_cli(&self, account: &str, cli: Arc<VendorCli>) {
        if let Ok(mut guard) = self.vendor_clis.lock() {
            guard.insert(key(cli.provider(), account), cli);
        }
    }

    /// The vendor client registered for a subscription, if any.
    #[must_use]
    pub fn vendor_cli_for(
        &self,
        provider: SubscriptionProvider,
        account: &str,
    ) -> Option<Arc<VendorCli>> {
        let guard = self.vendor_clis.lock().ok()?;
        guard.get(&key(provider, account)).map(Arc::clone)
    }
}

fn key(provider: SubscriptionProvider, account: &str) -> SubscriptionKey {
    (provider, account.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn raw_catalog_registration_does_not_replace_recoverable_registration() {
        let root = tempfile::tempdir().expect("temp root");
        let credential_home = root.path().join("codex-home");
        let data_dir = root.path().join("router-data");
        std::fs::create_dir_all(&credential_home).expect("credential home");
        let reader = SubscriptionReader::new(SubscriptionProvider::Codex, &credential_home);
        let readers = vec![reader.clone()];

        let cache = TokenCache::registered_for(&readers, &data_dir);
        let recovery_lock = cache
            .store_for_subscription(SubscriptionProvider::Codex, "primary")
            .and_then(|store| store.lock_path())
            .expect("recoverable store lock");

        cache.register_reader("primary", &reader);

        assert_eq!(
            cache
                .store_for_subscription(SubscriptionProvider::Codex, "primary")
                .and_then(|store| store.lock_path()),
            Some(recovery_lock.clone())
        );
        assert!(
            recovery_lock.starts_with(data_dir.join("refresh-recovery")),
            "the durable lock must live in router data, not the vendor home"
        );
    }

    #[test]
    fn durable_registration_upgrades_an_existing_raw_catalog_reader() {
        let root = tempfile::tempdir().expect("temp root");
        let credential_home = root.path().join("codex-home");
        let data_dir = root.path().join("router-data");
        std::fs::create_dir_all(&credential_home).expect("credential home");
        let reader = SubscriptionReader::new(SubscriptionProvider::Codex, &credential_home);
        let readers = vec![reader.clone()];
        let cache = TokenCache::new();

        cache.register_reader("primary", &reader);
        let raw_lock = cache
            .store_for_subscription(SubscriptionProvider::Codex, "primary")
            .and_then(|store| store.lock_path())
            .expect("raw reader lock");
        assert!(
            !raw_lock.starts_with(data_dir.join("refresh-recovery")),
            "the setup must begin with a bare reader"
        );

        cache.register_readers_in("primary", &readers, &data_dir);

        let durable_lock = cache
            .store_for_subscription(SubscriptionProvider::Codex, "primary")
            .and_then(|store| store.lock_path())
            .expect("recoverable store lock");
        assert!(
            durable_lock.starts_with(data_dir.join("refresh-recovery")),
            "durable registration left the raw store installed: {durable_lock:?}"
        );
    }
}
