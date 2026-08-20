//! Per-subscription refresh suppression, backoff, and single-flight state.

use std::collections::HashMap;
use std::sync::{Arc, Mutex};

use sha2::{Digest, Sha256};

use crate::subscription::{SubscriptionProvider, SubscriptionToken};

const INITIAL_BACKOFF_MS: i64 = 1_000;
const MAX_BACKOFF_MS: i64 = 5 * 60 * 1_000;
type SubscriptionKey = (SubscriptionProvider, String);
type AttemptLock = Arc<tokio::sync::Mutex<RefreshAttempt>>;

#[derive(Debug, Default)]
pub(super) struct RefreshAttempts {
    inner: Mutex<HashMap<SubscriptionKey, AttemptLock>>,
}

#[derive(Debug)]
pub(super) struct RefreshAttempt {
    credential: [u8; 32],
    failure: Option<CachedFailure>,
}

#[derive(Debug, Clone, Copy)]
enum CachedFailure {
    Terminal,
    Transient { failures: u32, retry_at_ms: i64 },
}

impl RefreshAttempts {
    pub(super) fn for_subscription(
        &self,
        provider: SubscriptionProvider,
        account: &str,
        credential: &SubscriptionToken,
    ) -> AttemptLock {
        let fingerprint = credential_fingerprint(credential);
        let mut guard = self
            .inner
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        Arc::clone(
            guard
                .entry((provider, account.to_string()))
                .or_insert_with(|| {
                    Arc::new(tokio::sync::Mutex::new(RefreshAttempt {
                        credential: fingerprint,
                        failure: None,
                    }))
                }),
        )
    }
}

impl RefreshAttempt {
    /// Reset state when any credential-file field changes.
    pub(super) fn reset_if_changed(&mut self, credential: &SubscriptionToken) -> bool {
        let fingerprint = credential_fingerprint(credential);
        if self.credential == fingerprint {
            return false;
        }
        self.credential = fingerprint;
        self.failure = None;
        true
    }

    pub(super) const fn suppresses_attempt(&self, now_ms: i64) -> bool {
        match self.failure {
            Some(CachedFailure::Terminal) => true,
            Some(CachedFailure::Transient { retry_at_ms, .. }) => now_ms < retry_at_ms,
            None => false,
        }
    }

    pub(super) const fn record_success(&mut self) {
        self.failure = None;
    }

    pub(super) const fn record_terminal_failure(&mut self) {
        self.failure = Some(CachedFailure::Terminal);
    }

    /// Record a retryable failure, waiting at least `retry_after_ms` when the
    /// endpoint named its own delay.
    ///
    /// The larger of the two wins: our backoff must not undercut a `Retry-After`
    /// the vendor asked for, and a small `Retry-After` must not reset a backoff
    /// that repeated failures have already grown (issue #203).
    pub(super) fn record_transient_failure_after(
        &mut self,
        now_ms: i64,
        retry_after_ms: Option<i64>,
    ) {
        let failures = match self.failure {
            Some(CachedFailure::Transient { failures, .. }) => failures.saturating_add(1),
            _ => 1,
        };
        let shift = failures.saturating_sub(1).min(18);
        let delay = INITIAL_BACKOFF_MS
            .saturating_mul(1_i64 << shift)
            .min(MAX_BACKOFF_MS)
            .max(retry_after_ms.unwrap_or(0));
        self.failure = Some(CachedFailure::Transient {
            failures,
            retry_at_ms: now_ms.saturating_add(delay),
        });
    }
}

/// Identify every credential-file change without retaining another plaintext
/// copy of its secrets in failure state.
/// A stable identity for one credential's contents, without storing it.
///
/// Shared with the rejection registry so a verdict reached about one chain link
/// is discarded the moment the file on disk holds a different one (issue #245).
pub(super) fn credential_fingerprint(token: &SubscriptionToken) -> [u8; 32] {
    fn hash_field(hasher: &mut Sha256, value: Option<&str>) {
        match value {
            Some(value) => {
                hasher.update([1]);
                hasher.update(value.len().to_le_bytes());
                hasher.update(value.as_bytes());
            }
            None => hasher.update([0]),
        }
    }

    let mut hasher = Sha256::new();
    hash_field(&mut hasher, Some(&token.access_token));
    hash_field(&mut hasher, token.refresh_token.as_deref());
    match token.expires_at_ms {
        Some(expiry) => {
            hasher.update([1]);
            hasher.update(expiry.to_le_bytes());
        }
        None => hasher.update([0]),
    }
    hash_field(&mut hasher, token.account_id.as_deref());
    hash_field(&mut hasher, token.resource_url.as_deref());
    hasher.finalize().into()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn token(refresh: &str) -> SubscriptionToken {
        SubscriptionToken {
            access_token: "expired".into(),
            refresh_token: Some(refresh.into()),
            expires_at_ms: Some(1),
            account_id: None,
            resource_url: None,
        }
    }

    #[tokio::test]
    async fn terminal_failure_is_rearmed_only_by_changed_credentials() {
        let attempts = RefreshAttempts::default();
        let original = token("revoked");
        let attempt = attempts.for_subscription(SubscriptionProvider::Claude, "primary", &original);
        let mut state = attempt.lock().await;
        state.record_terminal_failure();
        assert!(state.suppresses_attempt(10_000));
        assert!(!state.reset_if_changed(&original));
        assert!(state.suppresses_attempt(20_000));
        assert!(state.reset_if_changed(&token("new-login")));
        assert!(!state.suppresses_attempt(20_000));
        drop(state);
    }

    #[tokio::test]
    async fn transient_failures_back_off_exponentially_with_a_ceiling() {
        let attempts = RefreshAttempts::default();
        let attempt =
            attempts.for_subscription(SubscriptionProvider::Claude, "primary", &token("transient"));
        let mut state = attempt.lock().await;
        state.record_transient_failure_after(10_000, None);
        assert!(state.suppresses_attempt(10_999));
        assert!(!state.suppresses_attempt(11_000));
        state.record_transient_failure_after(11_000, None);
        assert!(state.suppresses_attempt(12_999));
        assert!(!state.suppresses_attempt(13_000));
        for _ in 0..30 {
            state.record_transient_failure_after(20_000, None);
        }
        assert!(state.suppresses_attempt(319_999));
        assert!(!state.suppresses_attempt(320_000));
        drop(state);
    }
}
