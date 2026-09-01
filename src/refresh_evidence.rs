//! What upstream responses say about a subscription's credential.
//!
//! Split from `refresh.rs` to stay inside the per-file line limit. This is the
//! evidence `/health/subscriptions`, `/metrics` and `model_routing` all read
//! (issues #318, #319).

use super::{CredentialEvidence, SubscriptionProvider, SubscriptionToken, TokenCache};

impl TokenCache {
    /// Announce a terminal credential failure once, at `ERROR`.
    ///
    /// A router that cannot serve a configured subscription, and cannot fix it
    /// without a human in a browser, is in an error state by any definition.
    /// Logged at `WARN` it sat below every ordinary `level>=ERROR` pipeline,
    /// so a twelve-hour outage produced a log with zero errors in it, and the
    /// one meaningful line was buried under 146 repetitions of its consequence
    /// (issue #321).
    ///
    /// Repeats are suppressed until the provider recovers, because the
    /// condition is already known and restating it hides new events.
    pub(super) fn log_terminal_once_for(
        &self,
        provider: SubscriptionProvider,
        account: &str,
        message: &str,
    ) {
        let first = self.take_terminal_announcement_for(provider, account);
        let diagnostic =
            super::refresh_recovery::terminal_failure_diagnostic(provider, message, first);
        if first {
            tracing::error!("{diagnostic}");
        } else {
            tracing::debug!("{diagnostic}");
        }
    }

    /// Claim the right to announce this provider's terminal failure.
    ///
    /// True exactly once per outage, so the transition is reported and its
    /// restatements are not.
    #[cfg(test)]
    pub(super) fn take_terminal_announcement(&self, provider: SubscriptionProvider) -> bool {
        self.take_terminal_announcement_for(
            provider,
            crate::credential_recovery_store::PRIMARY_ACCOUNT,
        )
    }

    pub(super) fn take_terminal_announcement_for(
        &self,
        provider: SubscriptionProvider,
        account: &str,
    ) -> bool {
        self.announced_terminal
            .lock()
            .is_ok_and(|mut guard| guard.insert((provider, account.to_string())))
    }

    /// Forget that a provider's terminal failure was announced, so a later one
    /// is reported again.
    pub(super) fn clear_terminal_announcement_for(
        &self,
        provider: SubscriptionProvider,
        account: &str,
    ) {
        if let Ok(mut guard) = self.announced_terminal.lock() {
            guard.remove(&(provider, account.to_string()));
        }
    }

    /// Record what an upstream status code says about `provider`'s credential.
    ///
    /// This is the evidence [`crate::model_routing::healthy_providers`] trusts
    /// over `expiresAt`: a served request proves the credential works even when
    /// its timestamp says otherwise, and only a 401/403 proves it does not.
    /// Every other status describes the request, not the credential.
    pub fn record_status(&self, provider: SubscriptionProvider, status: u16) {
        self.record_status_for(
            provider,
            crate::credential_recovery_store::PRIMARY_ACCOUNT,
            status,
        );
    }

    /// Record one upstream verdict for one stable router account.
    pub fn record_status_for(&self, provider: SubscriptionProvider, account: &str, status: u16) {
        if status == 401 || status == 403 {
            self.record_credential_rejected_for(provider, account);
            // The third producer of the same state, and the one that was
            // silent. A credential rejected while serving a request makes the
            // provider unusable exactly as a rejected refresh does (#321).
            self.announce_unusable_for(
                provider,
                account,
                &format!("an upstream request was refused with HTTP {status}"),
            );
        } else if (200..300).contains(&status) {
            self.record_credential_working_for(provider, account);
        }
    }

    /// Record an inference verdict only while it still describes the current
    /// credential generation for this stable router account.
    ///
    /// Selection and the upstream call happen before this method. The only
    /// guard acquired here is the per-account refresh-attempt mutex, after the
    /// network response exists; no durable credential/store lock or network
    /// operation overlaps it. Reconciliation uses the same mutex, so either an
    /// old response commits first and replacement clears it, or replacement
    /// wins first and the stale response is ignored atomically.
    pub(crate) async fn record_status_for_credential(
        &self,
        provider: SubscriptionProvider,
        account: &str,
        credential: &SubscriptionToken,
        status: u16,
    ) {
        let attempt = self
            .attempts
            .for_subscription(provider, account, credential);
        let attempt = attempt.lock().await;
        if attempt.matches_current(provider, credential) {
            self.record_status_for(provider, account, status);
        }
    }

    /// Record that an upstream rejected `provider`'s credential (401/403).
    /// Announce that a provider became unusable, whichever path discovered it.
    ///
    /// `Rejected` is the single state that drives `/health/subscriptions` to
    /// 503, the `/metrics` gauge to 0, and removal from routing. It was set
    /// from three places at three severities — once at `ERROR`, once at
    /// `WARN`, and once silently — so a subscription revoked between refresh
    /// ticks produced a 503 with no error line anywhere, which is the outage
    /// shape issue #321 exists to prevent.
    pub(crate) fn announce_unusable_for(
        &self,
        provider: SubscriptionProvider,
        account: &str,
        reason: &str,
    ) {
        self.log_terminal_once_for(provider, account, reason);
    }

    pub fn record_credential_rejected(&self, provider: SubscriptionProvider) {
        self.record_credential_rejected_for(
            provider,
            crate::credential_recovery_store::PRIMARY_ACCOUNT,
        );
    }

    /// Record a rejected credential for one stable router account.
    pub fn record_credential_rejected_for(&self, provider: SubscriptionProvider, account: &str) {
        self.record_evidence_for(provider, account, CredentialEvidence::Rejected);
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
        self.evidence_for(provider, crate::credential_recovery_store::PRIMARY_ACCOUNT)
    }

    /// The most recent upstream verdict for one stable router account.
    #[must_use]
    pub fn evidence_for(
        &self,
        provider: SubscriptionProvider,
        account: &str,
    ) -> Option<CredentialEvidence> {
        self.evidence
            .lock()
            .ok()
            .and_then(|guard| guard.get(&(provider, account.to_string())).copied())
    }

    /// The most recent refresh failure for `provider`, if the last attempt failed.
    #[must_use]
    pub fn last_refresh_error(&self, provider: SubscriptionProvider) -> Option<String> {
        self.last_refresh_error_for(provider, crate::credential_recovery_store::PRIMARY_ACCOUNT)
    }

    /// The most recent refresh failure for one stable router account.
    #[must_use]
    pub fn last_refresh_error_for(
        &self,
        provider: SubscriptionProvider,
        account: &str,
    ) -> Option<String> {
        self.refresh_errors
            .lock()
            .ok()
            .and_then(|guard| guard.get(&(provider, account.to_string())).cloned())
    }

    pub(super) fn record_evidence_for(
        &self,
        provider: SubscriptionProvider,
        account: &str,
        evidence: CredentialEvidence,
    ) {
        if let Ok(mut guard) = self.evidence.lock() {
            guard.insert((provider, account.to_string()), evidence);
        }
    }

    #[cfg(test)]
    pub(super) fn record_refresh_error(&self, provider: SubscriptionProvider, error: &str) {
        self.record_refresh_error_for(
            provider,
            crate::credential_recovery_store::PRIMARY_ACCOUNT,
            error,
        );
    }

    pub(super) fn record_refresh_error_for(
        &self,
        provider: SubscriptionProvider,
        account: &str,
        error: &str,
    ) {
        if let Ok(mut guard) = self.refresh_errors.lock() {
            guard.insert((provider, account.to_string()), error.to_string());
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
