//! The recovery ladder a token exchange climbs before declaring a credential dead.
//!
//! A rotated refresh token and a revoked one fail identically: the endpoint
//! answers `invalid_grant` to both. Concluding "revoked" from that answer alone
//! is what turns a routine rotation race — the vendor CLI, a second router, or
//! this router's own earlier refresh moved the chain forward — into a manual
//! re-authentication (issue #239).
//!
//! So before concluding anything, each exchange:
//!
//! 1. takes the credential's advisory lock, so read → refresh → write cannot
//!    interleave with another holder's;
//! 2. re-reads the store — the copy on disk may already be newer than the token
//!    we were handed, in which case no exchange is spent at all;
//! 3. exchanges the best link it has;
//! 4. on `invalid_grant`, re-reads the store *again* and retries once with a
//!    newer link, because the rotation may have landed while we were exchanging;
//! 5. persists a rotated link before the new access token is used, so the
//!    rotation survives a restart on every path, not just catalog polling;
//! 6. and only then reports failure — naming which of the two causes it is.
//!
//! Secrets are never logged. What *is* logged is the shape of the exchange —
//! method, URL, header names, body field names, response status and which
//! response fields came back — because these OAuth endpoints are undocumented
//! and an operator reproducing a working request needs the shape, not the
//! values.

use std::sync::Arc;
use std::time::Duration;

use super::{REFRESH_SKEW_MS, RefreshError, refresh_at};
use crate::credential_store::{CredentialStore, has_newer_refresh_link, is_same_link};
use crate::subscription::{SubscriptionProvider, SubscriptionToken};
use crate::vendor_cli_refresh::VendorCli;

/// How long to wait for another holder's read → refresh → write cycle.
///
/// Long enough to cover a token exchange over a slow link, short enough that a
/// stale holder reports a retryable storage failure instead of waiting forever.
const LOCK_TIMEOUT: Duration = Duration::from_secs(5);

/// Which rung of the ladder produced a usable credential.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(super) enum RecoveryRung {
    /// The credential store already held a usable token; no exchange spent.
    AdoptedStoredToken,
    /// The link we were handed was exchanged successfully.
    DirectExchange,
    /// Our link was rejected; a newer one from the store was exchanged instead.
    AdoptedRotatedLink,
    /// Every direct exchange was rejected; the vendor's own client rotated the
    /// chain and we adopted what it wrote.
    VendorCliRotation,
}

impl RecoveryRung {
    /// How this recovery happened, in the operator's terms.
    pub(super) const fn describe(self) -> &'static str {
        match self {
            Self::AdoptedStoredToken => {
                "adopted a newer credential from disk without spending an exchange"
            }
            Self::DirectExchange => "exchanged the stored refresh token",
            Self::AdoptedRotatedLink => {
                "the stored refresh token was rejected; adopted a newer one from disk and retried"
            }
            Self::VendorCliRotation => {
                "every direct exchange was rejected; the vendor client rotated the chain and its \
                 credential was adopted"
            }
        }
    }

    /// Whether this rung represents recovery from a failure worth reporting at
    /// `info`, as opposed to an ordinary refresh.
    pub(super) const fn is_recovery(self) -> bool {
        matches!(self, Self::AdoptedRotatedLink | Self::VendorCliRotation)
    }
}

/// A credential obtained by the ladder.
#[derive(Debug)]
pub(super) struct Recovered {
    /// The usable token.
    pub(super) token: SubscriptionToken,
    /// Which rung produced it.
    pub(super) rung: RecoveryRung,
}

/// A credential the ladder could not recover.
#[derive(Debug)]
pub(super) struct Rejected {
    /// The underlying endpoint failure, for classification (terminal, rate
    /// limited, retryable).
    pub(super) error: RefreshError,
    /// Operator-facing explanation that distinguishes a revoked credential from
    /// one that was rotated past.
    pub(super) message: String,
}

/// Everything one token exchange needs besides the credential itself.
///
/// Grouped rather than passed as a parameter list because every rung of the
/// ladder needs all of it.
#[derive(Debug, Clone, Copy)]
pub(super) struct Exchange<'a> {
    /// HTTP client to exchange with.
    pub(super) client: &'a reqwest::Client,
    /// Token endpoint, overridable so tests exercise the real request shape.
    pub(super) token_url: &'a str,
    /// Subscription provider being refreshed.
    pub(super) provider: SubscriptionProvider,
    /// Wall clock in epoch milliseconds.
    pub(super) now_ms: i64,
    /// Why the ladder is climbing.
    pub(super) mode: RecoveryMode,
}

/// Why the ladder is climbing: proactively, or after an upstream said `401`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(super) enum RecoveryMode {
    /// The token is at or near its stated expiry.
    Proactive,
    /// An upstream rejected the token regardless of its stated expiry, so only
    /// a *different* access token counts as progress.
    AfterRejection,
}

/// The links this exchange has already spent.
///
/// Both are needed once the ladder reaches the vendor client: `base` says which
/// access token was rejected, `newest` says which chain link the store held
/// before the client ran, so a client that changed nothing can be told from one
/// that rotated.
#[derive(Debug, Clone, Copy)]
struct Tried<'a> {
    /// The credential the caller handed us.
    base: &'a SubscriptionToken,
    /// The newest link we found before giving up on direct exchanges.
    newest: &'a SubscriptionToken,
}

/// Whether a credential found in the store can be used as-is.
fn is_usable(
    candidate: &SubscriptionToken,
    base: &SubscriptionToken,
    mode: RecoveryMode,
    now_ms: i64,
) -> bool {
    match mode {
        // Adopt only a token that still has life left, using the same skew the
        // proactive path applies so we do not adopt one we would refresh again
        // on the very next call.
        RecoveryMode::Proactive => !candidate.is_expired(now_ms.saturating_add(REFRESH_SKEW_MS)),
        // The rejected access token is not usable no matter what its timestamp
        // claims; replaying it would just repeat the 401.
        RecoveryMode::AfterRejection => {
            candidate.access_token != base.access_token && !candidate.is_expired(now_ms)
        }
    }
}

fn storage_rejection(message: impl Into<String>) -> Rejected {
    let error = RefreshError::Storage(message.into());
    let message = error.to_string();
    Rejected { error, message }
}

/// Take the credential's advisory lock or reject the transaction.
async fn acquire_lock(
    store: &Arc<dyn CredentialStore>,
    provider: SubscriptionProvider,
) -> Result<crate::durable_file::FileLockGuard, Rejected> {
    let path = store.lock_path().ok_or_else(|| {
        storage_rejection(format!(
            "the registered {provider} credential store has no durable lock path"
        ))
    })?;
    crate::durable_file::lock_exclusive_async(&path, LOCK_TIMEOUT)
        .await
        .map_err(|error| {
            let action = if error.kind() == std::io::ErrorKind::WouldBlock {
                "timed out waiting for"
            } else {
                "could not acquire"
            };
            storage_rejection(format!("{action} the durable {provider} credential lock"))
        })
}

/// Write a rotated refresh token back before its access token is used.
///
/// Only a genuinely rotated link is written, so an unchanged credential on a
/// read-only mount stays silent. A failed write rejects the transaction so the
/// fresh chain link cannot escape into memory without a durable replacement.
fn persist_rotation(
    store: &Arc<dyn CredentialStore>,
    baseline: &SubscriptionToken,
    fresh: &SubscriptionToken,
    provider: SubscriptionProvider,
) -> Result<(), Rejected> {
    if !has_newer_refresh_link(baseline, fresh) {
        return Ok(());
    }
    if store.persist(fresh).is_err() {
        return Err(storage_rejection(format!(
            "could not durably persist the rotated {provider} credential; the registered \
             primary and recovery storage did not accept it"
        )));
    }
    tracing::info!("persisted a rotated {provider} refresh token");
    Ok(())
}

/// What the endpoint actually answered.
///
/// [`RefreshError`]'s own `Display` appends generic "waiting will not help"
/// advice to every `invalid_grant`, which is exactly the sentence issue #239
/// calls misleading for a rotated token. By the time the ladder builds a
/// terminal message it has established which advice applies, so it quotes the
/// endpoint and gives the advice itself.
fn endpoint_answer(error: &RefreshError) -> String {
    match error {
        RefreshError::Status(code, body, _) => format!("the endpoint answered HTTP {code}: {body}"),
        other => other.to_string(),
    }
}

/// Explain a terminal rejection in terms of the two causes it can have.
///
/// "Waiting will not help, re-authenticate" is only true once we have checked
/// that nobody else moved the chain forward. Saying which check was made, and
/// what it found, is the difference between an actionable message and a
/// misleading one (issue #239).
fn terminal_message(
    provider: SubscriptionProvider,
    error: &RefreshError,
    store: Option<&Arc<dyn CredentialStore>>,
    retried_with_newer_link: bool,
) -> String {
    if !error.is_invalid_grant() {
        return error.to_string();
    }
    if store.is_none() {
        return error.to_string();
    }
    if retried_with_newer_link {
        return format!(
            "refresh token is no longer valid (invalid_grant): a newer refresh token found in \
             the registered {provider} credential store was rejected as well, so the whole token \
             family has been revoked — re-authenticate this subscription with \
             `link-assistant-router auth {provider}` ({})",
            endpoint_answer(error)
        );
    }
    format!(
        "refresh token is no longer valid (invalid_grant): the registered {provider} credential \
         store still holds the same refresh token that was just rejected, so it was revoked or \
         already spent elsewhere rather than rotated past — re-authenticate this subscription \
         with `link-assistant-router auth {provider}` ({})",
        endpoint_answer(error)
    )
}

/// Exchange a refresh token, re-reading and re-trying before concluding the
/// credential is dead. See the module documentation for the ladder.
pub(super) async fn exchange_with_recovery(
    exchange: &Exchange<'_>,
    store: Option<&Arc<dyn CredentialStore>>,
    vendor_cli: Option<&Arc<VendorCli>>,
    base: &SubscriptionToken,
) -> Result<Recovered, Rejected> {
    let &Exchange {
        client,
        token_url,
        provider,
        now_ms,
        mode,
    } = exchange;
    let store = store.ok_or_else(|| {
        storage_rejection(format!(
            "a durable credential store is not registered for {provider}"
        ))
    })?;
    // Held for the whole read → refresh → write cycle so the router never races
    // with another holder and never writes a link older than the one on disk.
    let _lock = acquire_lock(store, provider).await?;

    // Rung 1: the store may already be ahead of the token we were handed.
    let stored = store.reload().ok_or_else(|| {
        storage_rejection(format!(
            "could not re-read the registered {provider} credential while holding its lock"
        ))
    })?;
    let mut candidate = base.clone();
    let mut from_store = false;
    if !is_same_link(&stored, base) {
        if is_usable(&stored, base, mode, now_ms) {
            tracing::info!(
                "{provider} credential recovery: {}",
                RecoveryRung::AdoptedStoredToken.describe()
            );
            return Ok(Recovered {
                token: stored,
                rung: RecoveryRung::AdoptedStoredToken,
            });
        }
        if has_newer_refresh_link(base, &stored) {
            candidate = stored.clone();
            from_store = true;
        }
    }
    let baseline = stored;

    // Rung 2: exchange the newest link we hold.
    let error = match refresh_at(client, token_url, provider, &candidate, now_ms).await {
        Ok(fresh) => {
            persist_rotation(store, &baseline, &fresh, provider)?;
            let rung = if from_store {
                RecoveryRung::AdoptedRotatedLink
            } else {
                RecoveryRung::DirectExchange
            };
            if rung.is_recovery() {
                tracing::info!("{provider} credential recovery: {}", rung.describe());
            }
            return Ok(Recovered { token: fresh, rung });
        }
        Err(error) => error,
    };
    if !error.is_invalid_grant() {
        return Err(Rejected {
            message: error.to_string(),
            error,
        });
    }

    // Rung 3: the rotation may have landed on disk while we were exchanging.
    // This is the single check that turns the common case from a mandatory
    // re-login back into a retry.
    let reread = store.reload().ok_or_else(|| {
        storage_rejection(format!(
            "could not re-read the registered {provider} credential after the endpoint rejected it"
        ))
    })?;
    if has_newer_refresh_link(&candidate, &reread) {
        tracing::info!(
            "{provider} rejected a refresh token that the registered credential store has \
             already rotated past; retrying once with the newer one"
        );
        match refresh_at(client, token_url, provider, &reread, now_ms).await {
            Ok(fresh) => {
                persist_rotation(store, &reread, &fresh, provider)?;
                tracing::info!(
                    "{provider} credential recovery: {}",
                    RecoveryRung::AdoptedRotatedLink.describe()
                );
                return Ok(Recovered {
                    token: fresh,
                    rung: RecoveryRung::AdoptedRotatedLink,
                });
            }
            Err(second) => {
                return vendor_cli_or_reject(
                    exchange,
                    store,
                    vendor_cli,
                    second,
                    Tried {
                        base,
                        newest: &reread,
                    },
                    true,
                )
                .await;
            }
        }
    }
    // No newer link, but the store's access token itself may still be usable —
    // another holder refreshed and our own refresh token is simply spent.
    if is_usable(&reread, base, mode, now_ms) {
        tracing::info!(
            "{provider} credential recovery: {}",
            RecoveryRung::AdoptedStoredToken.describe()
        );
        return Ok(Recovered {
            token: reread,
            rung: RecoveryRung::AdoptedStoredToken,
        });
    }
    vendor_cli_or_reject(
        exchange,
        store,
        vendor_cli,
        error,
        Tried {
            base,
            newest: &candidate,
        },
        false,
    )
    .await
}

/// Ask the vendor's own client to rotate the chain before giving up.
///
/// This is the last rung: every direct exchange has been rejected, and the only
/// remaining difference between us and a working client is what the client
/// itself can do. If it leaves a newer credential behind, that credential — or
/// one exchange spent on it — recovers the subscription without an operator
/// touching anything (issue #239).
async fn vendor_cli_or_reject(
    exchange: &Exchange<'_>,
    store: &Arc<dyn CredentialStore>,
    vendor_cli: Option<&Arc<VendorCli>>,
    error: RefreshError,
    tried: Tried<'_>,
    retried_with_newer_link: bool,
) -> Result<Recovered, Rejected> {
    let &Exchange {
        client,
        token_url,
        provider,
        now_ms,
        mode,
    } = exchange;
    let reject = |error: RefreshError| Rejected {
        message: terminal_message(provider, &error, Some(store), retried_with_newer_link),
        error,
    };
    let Some(cli) = vendor_cli else {
        return Err(reject(error));
    };
    // Record our own request shape next to the client's, so that if the vendor
    // client succeeds where we failed, the difference between the two exchanges
    // is readable straight from the journal (issue #239).
    tracing::info!(
        "{provider} credential recovery: the exchange the router sent and that was rejected was {}",
        crate::refresh::direct_exchange_shape(provider)
    );
    let Some(rotated) = cli.rotate(store.as_ref(), tried.newest).await else {
        return Err(reject(error));
    };
    // The client normally leaves a usable access token behind, in which case no
    // exchange of our own is needed at all.
    if is_usable(&rotated, tried.base, mode, now_ms) {
        tracing::info!(
            "{provider} credential recovery: {}",
            RecoveryRung::VendorCliRotation.describe()
        );
        return Ok(Recovered {
            token: rotated,
            rung: RecoveryRung::VendorCliRotation,
        });
    }
    if !has_newer_refresh_link(tried.newest, &rotated) {
        return Err(reject(error));
    }
    match refresh_at(client, token_url, provider, &rotated, now_ms).await {
        Ok(fresh) => {
            persist_rotation(store, &rotated, &fresh, provider)?;
            tracing::info!(
                "{provider} credential recovery: {}",
                RecoveryRung::VendorCliRotation.describe()
            );
            Ok(Recovered {
                token: fresh,
                rung: RecoveryRung::VendorCliRotation,
            })
        }
        Err(second) => Err(reject(second)),
    }
}

#[cfg(test)]
#[path = "refresh_recovery_tests.rs"]
mod tests;
