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

/// How long a refresh token this process just adopted is protected from being
/// spent again.
///
/// A refresh chain is single-use: spending a link yields the next one and
/// invalidates the one spent. When a rotation succeeds and the very next call
/// fails for a reason that is not about the credential, refreshing again
/// destroys a token that was known-good seconds earlier and gains nothing,
/// because no new information about the credential has arrived (issue #319).
pub(super) const ROTATION_GRACE_MS: i64 = 5 * 60 * 1_000;

#[derive(Debug)]
pub(super) struct RefreshAttempt {
    credential: [u8; 32],
    failure: Option<CachedFailure>,
    /// When this process last obtained this credential by refreshing, if it
    /// did. `None` means the credential was read from disk rather than minted
    /// here, so nothing is known about how recently it was rotated.
    rotated_at_ms: Option<i64>,
    /// Fingerprint of the credential this process minted, when it did.
    ///
    /// Kept beside `credential` rather than replacing it. `credential` must go
    /// on tracking the *stored* credential, or a second concurrent caller
    /// holding the same disk token would read the rotation as a change and
    /// refresh again — but the ladder writes the rotation to the very file the
    /// next request reads, so without this the router's own work is
    /// indistinguishable from a re-authentication (issue #319).
    rotated_to: Option<[u8; 32]>,
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
        let fingerprint = attempt_fingerprint(provider, credential);
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
                        rotated_at_ms: None,
                        rotated_to: None,
                    }))
                }),
        )
    }
}

impl RefreshAttempt {
    /// Reset state when this provider's durable credential identity changes.
    pub(super) fn reset_if_changed(
        &mut self,
        provider: SubscriptionProvider,
        credential: &SubscriptionToken,
    ) -> bool {
        let fingerprint = attempt_fingerprint(provider, credential);
        if self.credential == fingerprint {
            return false;
        }
        // The credential this process just minted, arriving back through the
        // file the ladder wrote it to. That is not a re-authentication, and
        // reading it as one cleared the guard seconds after it was armed and
        // dropped a cache that had just been filled (issue #319).
        if self.rotated_to == Some(fingerprint) {
            self.credential = fingerprint;
            return false;
        }
        self.credential = fingerprint;
        self.failure = None;
        // A credential nobody here minted: whatever this process rotated to is
        // no longer what is being used, so the grace period does not carry over.
        self.rotated_at_ms = None;
        self.rotated_to = None;
        true
    }

    /// Record that this process minted `credential` by refreshing.
    ///
    /// The fingerprint moves with it. The recovery ladder writes a rotation
    /// back to the very file `read_token` reads, so without this the next
    /// inbound request hands `get_fresh_for` a credential that differs from the
    /// one this attempt was keyed on, [`Self::reset_if_changed`] reads the
    /// router's own rotation as a re-authentication, and the guard is cleared
    /// seconds after it is armed (issue #319).
    pub(super) fn record_rotation(
        &mut self,
        provider: SubscriptionProvider,
        now_ms: i64,
        credential: &SubscriptionToken,
    ) {
        self.rotated_to = Some(attempt_fingerprint(provider, credential));
        self.rotated_at_ms = Some(now_ms);
    }

    /// How long ago this process rotated into the current credential.
    pub(super) const fn rotated_within(&self, now_ms: i64, window_ms: i64) -> Option<i64> {
        match self.rotated_at_ms {
            Some(rotated_at_ms) if now_ms.saturating_sub(rotated_at_ms) < window_ms => {
                Some(now_ms.saturating_sub(rotated_at_ms))
            }
            _ => None,
        }
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
    credential_fingerprint_with_expiry(token, true)
}

/// Identity used only by one process's refresh attempt state.
///
/// Codex writes access/refresh/account state but intentionally leaves its old
/// expiry representation in the credential document. Ignoring only that
/// provider's expiry keeps a self-minted rotation recognizable after its real
/// durable round trip. Durable recovery and rejection records continue to use
/// [`credential_fingerprint`], which remains exact across every token field.
fn attempt_fingerprint(provider: SubscriptionProvider, token: &SubscriptionToken) -> [u8; 32] {
    credential_fingerprint_with_expiry(token, provider != SubscriptionProvider::Codex)
}

fn credential_fingerprint_with_expiry(token: &SubscriptionToken, include_expiry: bool) -> [u8; 32] {
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
    if include_expiry {
        match token.expires_at_ms {
            Some(expiry) => {
                hasher.update([1]);
                hasher.update(expiry.to_le_bytes());
            }
            None => hasher.update([0]),
        }
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
        assert!(!state.reset_if_changed(SubscriptionProvider::Claude, &original));
        assert!(state.suppresses_attempt(20_000));
        assert!(state.reset_if_changed(SubscriptionProvider::Claude, &token("new-login")));
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

#[cfg(test)]
mod rotation_tests {
    use super::*;

    fn token(access: &str, refresh: &str) -> SubscriptionToken {
        SubscriptionToken {
            access_token: access.into(),
            refresh_token: Some(refresh.into()),
            expires_at_ms: Some(0),
            account_id: None,
            resource_url: None,
        }
    }

    /// The guard is a window, not a latch: it reports the age while it holds
    /// and nothing once it lapses (issue #319).
    #[test]
    fn the_rotation_window_reports_an_age_and_then_lapses() {
        let mut attempt = RefreshAttempt {
            credential: credential_fingerprint(&token("a", "r1")),
            failure: None,
            rotated_at_ms: None,
            rotated_to: None,
        };
        assert_eq!(attempt.rotated_within(1_000, ROTATION_GRACE_MS), None);

        attempt.record_rotation(SubscriptionProvider::Claude, 1_000, &token("b", "r2"));
        assert_eq!(attempt.rotated_within(1_000, ROTATION_GRACE_MS), Some(0));
        assert_eq!(
            attempt.rotated_within(61_000, ROTATION_GRACE_MS),
            Some(60_000),
            "still inside the five-minute window"
        );
        assert_eq!(
            attempt.rotated_within(1_000 + ROTATION_GRACE_MS, ROTATION_GRACE_MS),
            None,
            "the window is half-open, so it lapses exactly on the boundary"
        );
    }

    /// The credential this process minted, arriving back through the file the
    /// ladder wrote it to, is not a re-authentication.
    #[test]
    fn a_self_minted_credential_is_not_read_as_a_re_authentication() {
        let original = token("a", "r1");
        let rotated = token("b", "r2");
        let mut attempt = RefreshAttempt {
            credential: credential_fingerprint(&original),
            failure: None,
            rotated_at_ms: None,
            rotated_to: None,
        };
        attempt.record_rotation(SubscriptionProvider::Claude, 1_000, &rotated);

        assert!(
            !attempt.reset_if_changed(SubscriptionProvider::Claude, &rotated),
            "the router's own rotation must not clear its own guard"
        );
        assert_eq!(
            attempt.rotated_within(2_000, ROTATION_GRACE_MS),
            Some(1_000),
            "the guard still holds"
        );

        // A credential nobody here minted *is* a re-authentication.
        assert!(attempt.reset_if_changed(SubscriptionProvider::Claude, &token("c", "r3")));
        assert_eq!(attempt.rotated_within(2_000, ROTATION_GRACE_MS), None);
    }

    /// Codex's expiry is serialization loss, not credential identity. Every
    /// bearer, refresh-chain, account, and resource change remains an external
    /// replacement and must clear the old attempt state.
    #[test]
    fn codex_attempt_identity_ignores_only_expiry() {
        let original = SubscriptionToken {
            access_token: "access-a".into(),
            refresh_token: Some("refresh-a".into()),
            expires_at_ms: Some(10),
            account_id: Some("account-a".into()),
            resource_url: Some("resource-a".into()),
        };
        let attempt_for = || RefreshAttempt {
            credential: attempt_fingerprint(SubscriptionProvider::Codex, &original),
            failure: None,
            rotated_at_ms: Some(1),
            rotated_to: Some(attempt_fingerprint(SubscriptionProvider::Codex, &original)),
        };

        let mut lossy_expiry = original.clone();
        lossy_expiry.expires_at_ms = Some(1);
        assert!(
            !attempt_for().reset_if_changed(SubscriptionProvider::Codex, &lossy_expiry),
            "Codex expiry alone is not a new credential"
        );
        assert!(
            attempt_for().reset_if_changed(SubscriptionProvider::Claude, &lossy_expiry),
            "other providers retain exact expiry identity"
        );

        for replacement in [
            SubscriptionToken {
                access_token: "access-b".into(),
                ..original.clone()
            },
            SubscriptionToken {
                refresh_token: Some("refresh-b".into()),
                ..original.clone()
            },
            SubscriptionToken {
                account_id: Some("account-b".into()),
                ..original.clone()
            },
            SubscriptionToken {
                resource_url: Some("resource-b".into()),
                ..original.clone()
            },
        ] {
            assert!(
                attempt_for().reset_if_changed(SubscriptionProvider::Codex, &replacement),
                "a changed Codex bearer/refresh/account/resource must be a new credential"
            );
        }
    }
}
