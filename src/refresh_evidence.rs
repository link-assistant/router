//! What upstream responses say about a subscription's credential.
//!
//! Split from `refresh.rs` to stay inside the per-file line limit. This is the
//! evidence `/health/subscriptions`, `/metrics` and `model_routing` all read
//! (issues #318, #319).

use super::{CredentialEvidence, SubscriptionProvider, SubscriptionToken, TokenCache};

impl TokenCache {
    /// Record what an upstream status code says about `provider`'s credential.
    ///
    /// This is the evidence [`crate::model_routing::healthy_providers`] trusts
    /// over `expiresAt`: a served request proves the credential works even when
    /// its timestamp says otherwise, and only a 401/403 proves it does not.
    /// Every other status describes the request, not the credential.
    pub fn record_status(&self, provider: SubscriptionProvider, status: u16) {
        if status == 401 || status == 403 {
            self.record_credential_rejected(provider);
        } else if (200..300).contains(&status) {
            self.record_credential_working(provider);
        }
    }

    /// Record that an upstream rejected `provider`'s credential (401/403).
    pub fn record_credential_rejected(&self, provider: SubscriptionProvider) {
        self.record_evidence(provider, CredentialEvidence::Rejected);
    }

    /// Record that a refresh for `account` was refused for `credential` itself.
    ///
    /// The evidence recorded alongside this is per *provider*, which is right
    /// for routing a vendor away but wrong for reporting one account of a pool:
    /// several accounts share a provider, and one revoked chain must not make
    /// its healthy neighbours look revoked too (issue #245).
    pub fn record_refresh_refused(
        &self,
        provider: SubscriptionProvider,
        account: &str,
        credential: &SubscriptionToken,
    ) {
        self.rejections.record(provider, account, credential);
    }

    /// Persist refusals in `data_dir`, so a later process can read them.
    pub fn persist_rejections_in(&self, data_dir: &std::path::Path) {
        self.rejections.persist_in(data_dir);
    }

    /// Whether a refresh has already been refused for exactly this credential.
    ///
    /// `false` once the file on disk differs from the one that was refused: a
    /// rejection is a fact about one chain link, not about the account, so a
    /// credential rotated forward by another holder is reported as recoverable
    /// again with no restart (issue #239).
    #[must_use]
    pub fn refresh_was_refused(
        &self,
        provider: SubscriptionProvider,
        account: &str,
        credential: &SubscriptionToken,
    ) -> bool {
        self.rejections.was_refused(provider, account, credential)
    }

    /// The most recent upstream verdict for `provider`, if any call was made.
    #[must_use]
    pub fn evidence(&self, provider: SubscriptionProvider) -> Option<CredentialEvidence> {
        self.evidence
            .lock()
            .ok()
            .and_then(|guard| guard.get(&provider).copied())
    }

    /// The most recent refresh failure for `provider`, if the last attempt failed.
    #[must_use]
    pub fn last_refresh_error(&self, provider: SubscriptionProvider) -> Option<String> {
        self.refresh_errors
            .lock()
            .ok()
            .and_then(|guard| guard.get(&provider).cloned())
    }

    pub(super) fn record_evidence(
        &self,
        provider: SubscriptionProvider,
        evidence: CredentialEvidence,
    ) {
        if let Ok(mut guard) = self.evidence.lock() {
            guard.insert(provider, evidence);
        }
    }

    pub(super) fn record_refresh_error(&self, provider: SubscriptionProvider, error: &str) {
        if let Ok(mut guard) = self.refresh_errors.lock() {
            guard.insert(provider, error.to_string());
        }
    }

    /// Seed the cache with an already-refreshed token for `provider`/`account`.
    ///
    /// Used by callers that obtained a token outside [`Self::get_fresh_for`]
    /// (and by tests) so a subsequent lookup reuses it instead of exchanging
    /// the refresh token again.
    pub fn store_refreshed(
        &self,
        provider: SubscriptionProvider,
        account: &str,
        token: SubscriptionToken,
    ) {
        self.store_for(provider, account, token);
    }
}
