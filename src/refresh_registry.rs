//! Where each subscription's credential lives, and who else can rotate it.
//!
//! Kept beside [`super::TokenCache`] rather than inside it because these are
//! bookkeeping, not policy: every path that can refresh a token registers what
//! it knows here, and the recovery ladder reads it back (issue #239).

use std::sync::Arc;

use super::{SubscriptionKey, TokenCache};
use crate::credential_store::CredentialStore;
use crate::subscription::{SubscriptionProvider, SubscriptionReader};
use crate::vendor_cli_refresh::VendorCli;

impl TokenCache {
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
        self.register_store(reader.provider(), account, Arc::new(reader.clone()));
    }

    /// Register every reader under the same account name.
    pub fn register_readers(&self, account: &str, readers: &[SubscriptionReader]) {
        for reader in readers {
            self.register_reader(account, reader);
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
