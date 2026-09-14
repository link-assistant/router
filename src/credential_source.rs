//! Whether a deployment *follows* a vendor credential home or holds a copy.
//!
//! A refresh token is not a value but a rotating series, and whoever redeems a
//! link invalidates it for every other holder. So two independent refreshers of
//! one credential is the bug: the vendor CLI rotates on its own cadence, a
//! deployment holding a copy rotates on its own, and whichever loses the race is
//! left with `invalid_grant` — indistinguishable, from the loser's side, from a
//! revocation (issue #574).
//!
//! ## What already exists
//!
//! Router's storage layer solved the mechanics before this module: a credential
//! document may carry a `_link_assistant_router.credential_source` pointer at
//! the vendor client's own file, and then
//! [`crate::subscription::SubscriptionReader`] reads *through* it under a lock
//! and writes a rotated token back to the vendor's file rather than to a private
//! copy. That is one chain with one refresher, reported as
//! [`crate::platform_keychain::Origin::AdoptedFile`], and `auth import` builds
//! such a reference by default.
//!
//! What was missing was the operator's view of it. Two stores, one possibly
//! stale, and no command that said which one was real: an operator could not
//! tell "following, current" from "a copy taken at time T", and a followed source
//! that had been removed surfaced as a path-bearing read error rather than as
//! "the home you were following is gone".
//!
//! This module answers that question from the pointer document alone, so it
//! still answers when the source is missing or unreadable — which is exactly the
//! case an operator most needs named.
//!
//! Secrets never appear here: the report carries states and paths only, and the
//! pointer document it reads holds no token at all.

use std::path::{Path, PathBuf};

use crate::subscription::{SubscriptionProvider, SubscriptionReader};

/// Key under which Router records its own metadata in a credential document.
///
/// Duplicated from `subscription::external` rather than shared, because that
/// module's copy is private to the parsing path and this one is only ever read.
const ROUTER_METADATA_KEY: &str = "_link_assistant_router";
const CREDENTIAL_SOURCE_KEY: &str = "credential_source";
const REFRESH_OWNER_KEY: &str = "refresh_owner";
const EXTERNAL_REFRESH_OWNER: &str = "external";

/// How a deployment holds one provider's credential.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum CredentialSource {
    /// Nothing is installed for this provider.
    Absent,
    /// Router's own credential file, which Router alone rotates.
    ///
    /// The ordinary case for a credential obtained by `auth claude` here: there
    /// is no second holder, so there is no chain to share.
    Owned,
    /// A reference to a vendor client's file that both processes advance.
    ///
    /// One chain, one refresher: whichever process refreshes writes the
    /// successor where the other will read it.
    Followed {
        /// The vendor file being followed.
        source: PathBuf,
        /// Whether that file is currently readable.
        ///
        /// A followed home that has been removed must be named as such: falling
        /// back to a stale copy is what makes a deployment drift into
        /// `invalid_grant` while the CLI beside it stays healthy.
        present: bool,
    },
    /// A credential owned elsewhere that Router must not rotate.
    ///
    /// Marked `refresh_owner: external` without identifying a writable source,
    /// so Router can read it but must never spend the refresh token.
    ExternallyOwned,
}

impl CredentialSource {
    /// Stable spelling for tables, JSON and assertions.
    #[must_use]
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::Absent => "absent",
            Self::Owned => "copy",
            Self::Followed { present: true, .. } => "following",
            Self::Followed { present: false, .. } => "source-gone",
            Self::ExternallyOwned => "external",
        }
    }

    /// Whether this deployment is the party that rotates the credential.
    ///
    /// The property the issue turns on. A followed credential *is* rotated by
    /// Router — it writes the successor into the vendor's own file, so there is
    /// still exactly one refresher of one chain.
    #[must_use]
    pub const fn router_may_refresh(&self) -> bool {
        matches!(self, Self::Owned | Self::Followed { present: true, .. })
    }

    /// One sentence an operator can act on.
    #[must_use]
    pub fn explain(&self) -> String {
        match self {
            Self::Absent => "no credential installed".to_string(),
            Self::Owned => "a copy Router owns and rotates; a vendor client logged in elsewhere \
                 holds a different chain and the two can spend each other's tokens"
                .to_string(),
            Self::Followed {
                source,
                present: true,
            } => format!(
                "following {}; Router and the vendor client advance one chain, so a rotation by \
                 either is seen by the other",
                source.display()
            ),
            Self::Followed {
                source,
                present: false,
            } => format!(
                "following {}, which is missing or unreadable; this deployment has no usable \
                 credential for the provider rather than a stale copy of one — restore that home, \
                 or re-import to take a copy",
                source.display()
            ),
            Self::ExternallyOwned => {
                "owned externally and readable but not rotatable by Router; the owning client \
                 must refresh it"
                    .to_string()
            }
        }
    }
}

/// One provider's holding, for `auth status`.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SourceReport {
    pub provider: SubscriptionProvider,
    pub source: CredentialSource,
}

/// Describe how `reader`'s home holds its credential.
///
/// Reads the document Router installed, *not* the credential it may point at, so
/// a followed source that has vanished is still described as a followed source.
#[must_use]
pub fn describe(reader: &SubscriptionReader) -> CredentialSource {
    let Some(document) = first_readable_document(reader) else {
        return CredentialSource::Absent;
    };
    describe_document(&document)
}

/// Describe a credential document's ownership without touching the filesystem,
/// except to decide whether a referenced source is presently readable.
#[must_use]
pub fn describe_document(document: &str) -> CredentialSource {
    let Ok(value) = serde_json::from_str::<serde_json::Value>(document) else {
        // Unparsable is not "absent": something is installed, Router simply
        // cannot read it. Owned is the conservative report — it never claims a
        // sharing guarantee this document does not establish.
        return CredentialSource::Owned;
    };
    if let Some(source) = pointer_at(&value, CREDENTIAL_SOURCE_KEY) {
        let present = source.is_file();
        return CredentialSource::Followed { source, present };
    }
    if value
        .pointer(&format!("/{ROUTER_METADATA_KEY}/{REFRESH_OWNER_KEY}"))
        .and_then(serde_json::Value::as_str)
        == Some(EXTERNAL_REFRESH_OWNER)
    {
        return CredentialSource::ExternallyOwned;
    }
    CredentialSource::Owned
}

/// The `credential_source` path recorded in a document, if any.
fn pointer_at(value: &serde_json::Value, key: &str) -> Option<PathBuf> {
    value
        .pointer(&format!("/{ROUTER_METADATA_KEY}/{key}"))
        .and_then(serde_json::Value::as_str)
        .filter(|path| !path.is_empty())
        .map(PathBuf::from)
}

/// The first credential document present in this home.
fn first_readable_document(reader: &SubscriptionReader) -> Option<String> {
    reader
        .credential_paths()
        .into_iter()
        .find(|path| path.is_file())
        .and_then(|path| std::fs::read_to_string(path).ok())
}

/// Build a reference document that follows `source`.
///
/// `auth import --follow` installs this instead of a copy. The document holds no
/// token: every read resolves the pointer, which is what makes a rotation by the
/// vendor client visible without a re-import or a restart.
pub fn follow_document(source: &Path) -> Result<String, String> {
    // The receipt id records which operation installed the reference, matching
    // what import writes, so the two documents are the same shape.
    crate::subscription::reference_external_credential(source, "follow")
}

/// Report every provider's holding, for the status table.
#[must_use]
pub fn report(readers: &[SubscriptionReader]) -> Vec<SourceReport> {
    readers
        .iter()
        .map(|reader| SourceReport {
            provider: reader.provider(),
            source: describe(reader),
        })
        .collect()
}
