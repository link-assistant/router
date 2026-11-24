//! Unit tests for the durable refusal store ([`crate::refresh_rejections`]).

use super::*;

fn token(refresh: &str) -> SubscriptionToken {
    SubscriptionToken {
        access_token: "access".into(),
        refresh_token: Some(refresh.into()),
        expires_at_ms: Some(1_600_000_000_000),
        account_id: None,
        resource_url: None,
    }
}

fn store() -> (RejectionStore, tempfile::TempDir) {
    let dir = tempfile::tempdir().expect("data dir");
    (RejectionStore::open(dir.path()), dir)
}

/// A refusal must survive the process that recorded it: `accounts list` runs as
/// its own short-lived process and would otherwise have nothing to consult.
#[test]
fn a_recorded_refusal_is_readable_by_another_reader() {
    let (writer, dir) = store();
    let credential = token("revoked");
    writer.record(SubscriptionProvider::Claude, "primary", &credential);

    let reader = RejectionStore::open(dir.path());
    assert!(reader.was_refused(SubscriptionProvider::Claude, "primary", &credential));
}

/// A refusal is a fact about one chain link. Once the credential differs, it no
/// longer applies — this is what lets a rotated chain recover with no restart.
#[test]
fn a_rotated_credential_is_not_covered_by_an_earlier_refusal() {
    let (store, _dir) = store();
    store.record(SubscriptionProvider::Claude, "primary", &token("revoked"));

    assert!(!store.was_refused(SubscriptionProvider::Claude, "primary", &token("rotated")));
}

/// Accounts share a provider but never a credential, so a refusal recorded for
/// one must not answer for another.
#[test]
fn a_refusal_is_scoped_to_one_account() {
    let (store, _dir) = store();
    let credential = token("revoked");
    store.record(SubscriptionProvider::Claude, "primary", &credential);

    assert!(!store.was_refused(SubscriptionProvider::Claude, "account-1", &credential));
}

/// A successful refresh settles the question; the record must not outlive it.
#[test]
fn clearing_a_refusal_forgets_it() {
    let (store, _dir) = store();
    let credential = token("revoked");
    store.record(SubscriptionProvider::Claude, "primary", &credential);
    store.clear(SubscriptionProvider::Claude, "primary");

    assert!(!store.was_refused(SubscriptionProvider::Claude, "primary", &credential));
}

/// The file must carry a fingerprint, never the credential it describes.
#[test]
fn the_stored_record_contains_no_secret() {
    let (store, dir) = store();
    store.record(
        SubscriptionProvider::Claude,
        "primary",
        &token("super-secret-refresh-token"),
    );

    let raw = std::fs::read_to_string(dir.path().join(REJECTIONS_FILE_NAME)).expect("read");
    assert!(!raw.contains("super-secret-refresh-token"), "{raw}");
    assert!(!raw.contains("access"), "{raw}");
}

/// A missing store simply means "nothing refused yet" — a router must start.
#[test]
fn an_absent_store_reports_nothing_refused() {
    let dir = tempfile::tempdir().expect("data dir");
    let store = RejectionStore::open(&dir.path().join("does-not-exist"));

    assert!(!store.was_refused(SubscriptionProvider::Claude, "primary", &token("any")));
}

/// The record sits beside the token store, so it is owner-only like its
/// neighbours: which accounts are dead is an operator's business alone.
#[cfg(unix)]
#[test]
fn the_store_is_owner_only() {
    use std::os::unix::fs::PermissionsExt as _;

    let (store, dir) = store();
    store.record(SubscriptionProvider::Claude, "primary", &token("revoked"));

    let mode = std::fs::metadata(dir.path().join(REJECTIONS_FILE_NAME))
        .expect("metadata")
        .permissions()
        .mode();
    assert_eq!(mode & 0o777, 0o600, "mode was {:o}", mode & 0o777);
}
