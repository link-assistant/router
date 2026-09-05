//! Where a subscription credential lives, so every refresh path can re-read it,
//! lock it, and write a rotated refresh token back.
//!
//! Refresh-token rotation turns a credential file into shared mutable state.
//! The vendor CLI, another router process, and this process each hold a link in
//! the same chain, and only the newest link is redeemable — redeeming an older
//! one answers `invalid_grant`. A refresh whose result stays in memory
//! therefore loses more than an optimisation: it leaves a spent link on disk for
//! the next process start to replay, and it cannot tell a *revoked* credential
//! from one another holder has merely rotated past (issue #239).
//!
//! Abstracting the file behind a trait keeps [`crate::refresh`] free of any
//! particular vendor layout and lets tests drive the same recovery ladder
//! against an in-memory store.
//!
//! Secrets, account identifiers, credential paths, and path-bearing read errors
//! are never logged here. Refresh diagnostics name only the provider.

use std::path::{Path, PathBuf};

use crate::subscription::{SubscriptionReader, SubscriptionToken};

pub(crate) fn ensure_refreshable_origin(
    provider: crate::subscription::SubscriptionProvider,
    origin: crate::platform_keychain::Origin,
) -> Result<(), String> {
    match origin {
        crate::platform_keychain::Origin::File => Ok(()),
        crate::platform_keychain::Origin::ExternalFile => Err(format!(
            "refusing to spend the externally owned {provider} refresh token because Router cannot durably advance the owning vendor store"
        )),
        crate::platform_keychain::Origin::Keychain => Err(format!(
            "refusing to spend the authoritative {provider} platform-keychain refresh token because Router cannot durably advance that external store"
        )),
    }
}

/// Suffix of the sidecar lock file guarding a credential's read → refresh →
/// write cycle.
///
/// A sidecar rather than the credential file itself: locking the credential
/// would attach the lock to an inode that [`crate::durable_file`] replaces by
/// rename on every write, so two holders could each end up locking a different
/// file and believing they were alone.
const LOCK_SUFFIX: &str = ".router-refresh.lock";

/// A durable home for one subscription credential.
///
/// Implementors must be cheap to `reload`: the refresh path re-reads the store
/// whenever it is about to conclude something about a credential.
pub trait CredentialStore: std::fmt::Debug + Send + Sync {
    /// Re-read the credential as it exists *now*, or `None` when it cannot be
    /// read. A missing or malformed file is not an error here — the caller
    /// simply continues with the token it already has.
    fn reload(&self) -> Option<SubscriptionToken>;

    /// Fallible form of [`Self::reload`] for stores whose durable state can be
    /// present but unusable.
    ///
    /// Existing store implementations retain their source-compatible
    /// `reload` contract. Recovery-aware stores override this method so a
    /// corrupt sidecar cannot be confused with an absent one.
    fn try_reload(&self) -> Result<Option<SubscriptionToken>, String> {
        Ok(self.reload())
    }

    /// Refuse an exchange that this store cannot durably advance.
    ///
    /// The default applies to ordinary writable stores. Readers backed by an
    /// external authoritative store override it so the refresh token is never
    /// spent before a successor can be written where the owning client reads.
    fn prepare_refresh(&self, _token: &SubscriptionToken) -> Result<(), String> {
        Ok(())
    }

    /// Write a refreshed credential back, preserving vendor fields this crate
    /// does not model.
    ///
    /// # Errors
    ///
    /// Returns an operator-readable message when the write cannot land, such as
    /// on a read-only credential mount.
    fn persist(&self, token: &SubscriptionToken) -> Result<(), String>;

    /// Path of the advisory lock guarding this credential, when one applies.
    fn lock_path(&self) -> Option<PathBuf>;

    /// Where this credential lives, for logs and operator messages.
    fn describe(&self) -> String;
}

impl CredentialStore for SubscriptionReader {
    fn reload(&self) -> Option<SubscriptionToken> {
        match self.read_token() {
            Ok(token) => Some(token),
            Err(_error) => {
                tracing::debug!("could not re-read the {} credential", self.provider());
                None
            }
        }
    }

    fn try_reload(&self) -> Result<Option<SubscriptionToken>, String> {
        match self.read_token() {
            Ok(token) => Ok(Some(token)),
            Err(crate::subscription::SubscriptionError::NoCredentials(_)) => Ok(None),
            Err(_) => {
                tracing::debug!("could not re-read the {} credential", self.provider());
                Err(format!(
                    "the {} credential store is unusable",
                    self.provider()
                ))
            }
        }
    }

    fn persist(&self, token: &SubscriptionToken) -> Result<(), String> {
        if let Ok((_, origin)) = self.read_token_from() {
            ensure_refreshable_origin(self.provider(), origin)?;
        }
        self.write_token(token).map_err(|error| error.to_string())
    }

    fn prepare_refresh(&self, _token: &SubscriptionToken) -> Result<(), String> {
        self.read_token_from().map_or(Ok(()), |(_, origin)| {
            ensure_refreshable_origin(self.provider(), origin)
        })
    }

    fn lock_path(&self) -> Option<PathBuf> {
        // Lock beside the file that would actually be rewritten, falling back to
        // the most specific candidate so two holders agree on a path even before
        // either has created the credential.
        let credential = self
            .discover_credential_path()
            .or_else(|| self.credential_paths().into_iter().next())?;
        Some(lock_path_for(&credential))
    }

    fn describe(&self) -> String {
        self.discover_credential_path()
            .unwrap_or_else(|| self.home().to_path_buf())
            .display()
            .to_string()
    }
}

/// Sidecar lock path for a credential file.
#[must_use]
pub fn lock_path_for(credential: &Path) -> PathBuf {
    let mut name = credential.file_name().map_or_else(
        || String::from("credential"),
        |n| n.to_string_lossy().into(),
    );
    name.push_str(LOCK_SUFFIX);
    credential.with_file_name(name)
}

/// Whether two credentials are the same chain link.
///
/// Compares only the fields a refresh can change. Routing metadata
/// (`account_id`, `resource_url`) is deliberately excluded: a vendor CLI
/// rewriting the file may reorder or re-derive it without the token itself
/// having moved.
#[must_use]
pub fn is_same_link(a: &SubscriptionToken, b: &SubscriptionToken) -> bool {
    a.access_token == b.access_token
        && a.refresh_token == b.refresh_token
        && a.expires_at_ms == b.expires_at_ms
}

/// Whether `candidate` carries a refresh token different from `current`'s.
///
/// A newer *refresh* link is the only thing worth spending another exchange on:
/// the same link would be rejected exactly as it just was.
#[must_use]
pub fn has_newer_refresh_link(current: &SubscriptionToken, candidate: &SubscriptionToken) -> bool {
    candidate
        .refresh_token
        .as_deref()
        .is_some_and(|link| !link.is_empty() && Some(link) != current.refresh_token.as_deref())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::subscription::SubscriptionProvider;

    fn token(access: &str, refresh: Option<&str>) -> SubscriptionToken {
        SubscriptionToken {
            access_token: access.into(),
            refresh_token: refresh.map(Into::into),
            expires_at_ms: Some(1),
            account_id: None,
            resource_url: None,
        }
    }

    #[test]
    fn a_reader_round_trips_through_the_store_trait() {
        let dir = tempfile::tempdir().expect("temp dir");
        std::fs::write(
            dir.path().join("auth.json"),
            r#"{"tokens":{"access_token":"a","refresh_token":"r"}}"#,
        )
        .expect("seed");
        let reader = SubscriptionReader::new(SubscriptionProvider::Codex, dir.path());
        let store: &dyn CredentialStore = &reader;

        let loaded = store.reload().expect("reload");
        assert_eq!(loaded.refresh_token.as_deref(), Some("r"));
        store.persist(&token("a2", Some("r2"))).expect("persist");
        assert_eq!(
            store.reload().expect("reload").refresh_token.as_deref(),
            Some("r2")
        );
        // The lock is a sidecar, never the credential file itself.
        let lock = store.lock_path().expect("lock path");
        assert_ne!(lock, dir.path().join("auth.json"));
        assert!(lock.to_string_lossy().ends_with(LOCK_SUFFIX), "{lock:?}");
        assert!(store.describe().contains("auth.json"));
    }

    /// A store with nothing readable must report `None` rather than panic, so a
    /// missing credential is just "nothing newer to adopt".
    #[test]
    fn an_unreadable_store_reloads_to_nothing() {
        let dir = tempfile::tempdir().expect("temp dir");
        let reader = SubscriptionReader::new(SubscriptionProvider::Codex, dir.path());
        assert!(CredentialStore::reload(&reader).is_none());
        assert!(CredentialStore::lock_path(&reader).is_some());
    }

    #[test]
    fn link_comparison_ignores_routing_metadata() {
        let mut other = token("a", Some("r"));
        other.account_id = Some("acct".into());
        assert!(is_same_link(&token("a", Some("r")), &other));
        assert!(!is_same_link(
            &token("a", Some("r")),
            &token("a2", Some("r"))
        ));

        assert!(has_newer_refresh_link(
            &token("a", Some("r")),
            &token("a", Some("r2"))
        ));
        assert!(!has_newer_refresh_link(
            &token("a", Some("r")),
            &token("a", Some("r"))
        ));
        // A store that lost its refresh token has nothing newer to offer.
        assert!(!has_newer_refresh_link(
            &token("a", Some("r")),
            &token("a", None)
        ));
    }
}
