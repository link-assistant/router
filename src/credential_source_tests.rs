//! Coverage for distinguishing a followed credential home from a copy (#574).
//!
//! The storage mechanics — one chain, one refresher, a rotation by either party
//! visible to the other — are pinned by `subscription_adopted_tests.rs`. What is
//! tested here is the operator's view of them: which store is real, and whether
//! a followed source is still there. An operator who cannot tell "following,
//! current" from "a copy taken at time T" has to infer it, and the inference is
//! wrong exactly when it matters.

use crate::credential_source::{CredentialSource, describe, describe_document, follow_document};
use crate::subscription::{SubscriptionProvider, SubscriptionReader};

/// A vendor home holding a credential, and a Router home following it.
fn following() -> (tempfile::TempDir, tempfile::TempDir, std::path::PathBuf) {
    let vendor = tempfile::tempdir().expect("vendor home");
    let router = tempfile::tempdir().expect("Router home");
    let source = vendor.path().join("auth.json");
    std::fs::write(
        &source,
        r#"{"auth_mode":"chatgpt","tokens":{"access_token":"a","refresh_token":"r"}}"#,
    )
    .expect("vendor credential");
    let reader = SubscriptionReader::new(SubscriptionProvider::Codex, router.path());
    let document = follow_document(&source).expect("a follow reference");
    reader.install_document(&document).expect("install");
    (vendor, router, source)
}

#[test]
fn a_followed_home_is_reported_as_followed_and_present() {
    let (_vendor, router, source) = following();
    let reader = SubscriptionReader::new(SubscriptionProvider::Codex, router.path());

    let held = describe(&reader);

    assert_eq!(
        held,
        CredentialSource::Followed {
            source: std::fs::canonicalize(&source).expect("canonical source"),
            present: true,
        }
    );
    assert_eq!(held.as_str(), "following");
    // Following does not mean Router stops refreshing: it writes the successor
    // into the vendor's own file, so there is still exactly one refresher.
    assert!(held.router_may_refresh());
}

#[test]
fn a_followed_source_that_was_removed_is_named_rather_than_silently_stale() {
    let (_vendor, router, source) = following();
    let reader = SubscriptionReader::new(SubscriptionProvider::Codex, router.path());
    std::fs::remove_file(&source).expect("the vendor home goes away");

    let held = describe(&reader);

    assert_eq!(held.as_str(), "source-gone");
    assert!(
        matches!(held, CredentialSource::Followed { present: false, .. }),
        "the report still knows it was following: {held:?}"
    );
    // The state that must never be silent: a deployment reporting itself healthy
    // while holding no usable credential is how #574's failure stays invisible
    // until it is total.
    assert!(!held.router_may_refresh());
    assert!(
        held.explain().contains("missing or unreadable"),
        "the explanation names the problem: {}",
        held.explain()
    );
}

#[test]
fn a_copy_is_reported_as_a_copy() {
    let router = tempfile::tempdir().expect("Router home");
    let reader = SubscriptionReader::new(SubscriptionProvider::Codex, router.path());
    reader
        .install_document(r#"{"tokens":{"access_token":"a","refresh_token":"r"}}"#)
        .expect("install a plain credential");

    let held = describe(&reader);

    assert_eq!(held, CredentialSource::Owned);
    assert_eq!(held.as_str(), "copy");
    assert!(held.router_may_refresh());
    // The drift warning is the point of telling them apart at all.
    assert!(
        held.explain().contains("different chain"),
        "a copy explains its risk: {}",
        held.explain()
    );
}

#[test]
fn an_empty_home_is_absent_rather_than_a_copy_of_nothing() {
    let router = tempfile::tempdir().expect("Router home");
    let reader = SubscriptionReader::new(SubscriptionProvider::Codex, router.path());

    assert_eq!(describe(&reader), CredentialSource::Absent);
    assert!(!CredentialSource::Absent.router_may_refresh());
}

#[test]
fn an_externally_owned_credential_is_not_rotated_by_router() {
    let document = crate::subscription::mark_external_refresh_owner(
        r#"{"tokens":{"access_token":"a","refresh_token":"r"}}"#,
    )
    .expect("mark external ownership");

    let held = describe_document(&document);

    assert_eq!(held, CredentialSource::ExternallyOwned);
    assert_eq!(held.as_str(), "external");
    // Reading is fine; spending the refresh token is not, because Router cannot
    // durably advance the store the owning client reads.
    assert!(!held.router_may_refresh());
}

#[test]
fn an_unparsable_document_is_not_claimed_to_be_followed() {
    // Conservative on purpose: reporting a sharing guarantee that the document
    // does not establish would be worse than reporting a copy.
    assert_eq!(
        describe_document("not json at all"),
        CredentialSource::Owned
    );
}

#[test]
fn a_follow_reference_holds_no_credential_of_its_own() {
    let (_vendor, router, _source) = following();
    let reader = SubscriptionReader::new(SubscriptionProvider::Codex, router.path());
    let installed = reader
        .credential_paths()
        .into_iter()
        .find(|path| path.is_file())
        .expect("an installed document");
    let document = std::fs::read_to_string(installed).expect("read the reference");

    // If the reference carried a copy of the token, it would be a copy: the
    // whole point is that every read resolves the pointer, so a rotation by the
    // vendor client is seen without a re-import.
    assert!(
        !document.contains("refresh_token"),
        "the reference carries no refresh token: {document}"
    );
    assert!(
        !document.contains("access_token"),
        "the reference carries no access token either: {document}"
    );
    assert!(
        document.contains("credential_source"),
        "it carries a pointer instead: {document}"
    );
}

#[test]
fn the_status_report_covers_every_provider_it_is_given() {
    let (_vendor, router, _source) = following();
    let empty = tempfile::tempdir().expect("an empty home");
    let readers = vec![
        SubscriptionReader::new(SubscriptionProvider::Codex, router.path()),
        SubscriptionReader::new(SubscriptionProvider::Claude, empty.path()),
    ];

    let reported = crate::credential_source::report(&readers);

    // One row per provider, in the order given: `auth status` joins these to the
    // acceptance rows by provider, so a missing entry would silently print the
    // default "copy" for a followed credential.
    assert_eq!(reported.len(), 2);
    assert_eq!(reported[0].provider, SubscriptionProvider::Codex);
    assert_eq!(reported[0].source.as_str(), "following");
    assert_eq!(reported[1].provider, SubscriptionProvider::Claude);
    assert_eq!(reported[1].source.as_str(), "absent");
}

#[test]
fn every_holding_explains_itself_without_naming_a_secret() {
    let (_vendor, router, source) = following();
    let reader = SubscriptionReader::new(SubscriptionProvider::Codex, router.path());

    // The vendor document holds `r` as its refresh token; no explanation may
    // carry a credential, only paths and states.
    for holding in [
        describe(&reader),
        CredentialSource::Absent,
        CredentialSource::Owned,
        CredentialSource::ExternallyOwned,
        CredentialSource::Followed {
            source,
            present: false,
        },
    ] {
        let explanation = holding.explain();
        assert!(
            !explanation.is_empty(),
            "{holding:?} explains itself to an operator"
        );
        assert!(
            !explanation.contains("refresh_token") && !explanation.contains("access_token"),
            "{holding:?}: {explanation}"
        );
    }
}

#[test]
fn a_rotation_by_the_vendor_client_is_visible_without_reimporting() {
    let (_vendor, router, source) = following();
    let reader = SubscriptionReader::new(SubscriptionProvider::Codex, router.path());

    // The vendor CLI refreshes on its own cadence and writes a new chain link.
    std::fs::write(
        &source,
        r#"{"auth_mode":"chatgpt","tokens":{"access_token":"a2","refresh_token":"r2"}}"#,
    )
    .expect("the vendor client rotates");

    let (token, origin) = reader
        .read_token_from()
        .expect("read through the reference");
    assert_eq!(origin, crate::platform_keychain::Origin::AdoptedFile);
    assert_eq!(
        token.refresh_token.as_deref(),
        Some("r2"),
        "the deployment sees the rotated link with no re-import and no restart"
    );
    assert_eq!(describe(&reader).as_str(), "following");
}
