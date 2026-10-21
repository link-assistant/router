//! Which credential store an import points at: followed, or copied.
//!
//! Split from `auth_import_tests.rs` to keep that file within the repository's
//! 1000-line limit. These all exercise `prepare_external_source`, the step that
//! decides whether Router installs a *reference* to the vendor client's own
//! credential file — one rotating chain with one refresher — or a copy that the
//! vendor client will eventually rotate past (issues #285, #574).

use super::*;

/// A writable vendor file yields a reference, which is what makes the vendor
/// client and the deployment one refresh chain with one refresher (issue #574).
#[test]
fn a_writable_vendor_file_is_followed_rather_than_copied() {
    let root = tempfile::tempdir().expect("root");
    let source_home = root.path().join("source");
    let destination_home = root.path().join("destination");
    std::fs::create_dir_all(&source_home).expect("source home");
    std::fs::create_dir_all(&destination_home).expect("destination home");
    let source = source_home.join("auth.json");
    std::fs::write(&source, candidate_document(SubscriptionProvider::Codex))
        .expect("source credential");
    let destination = SubscriptionReader::new(SubscriptionProvider::Codex, destination_home);

    let followed = prepare_external_source(
        SubscriptionProvider::Codex,
        link_assistant_router::platform_keychain::Origin::File,
        Some(&source),
        &destination,
    )
    .expect("a writable vendor file can be followed");

    assert_eq!(
        followed,
        std::fs::canonicalize(&source).expect("canonical source"),
        "the reference names the vendor's own file, so a rotation by either party \
         lands where the other reads"
    );
    // And the document Router would install carries no token of its own.
    let document = link_assistant_router::credential_source::follow_document(&source)
        .expect("a follow reference");
    assert_eq!(
        link_assistant_router::credential_source::describe_document(&document).as_str(),
        "following"
    );
}

/// `--follow` is a requirement, not a preference: where a reference is
/// impossible the import refuses and names the obstacle, instead of quietly
/// installing a copy that the vendor client will rotate past.
#[test]
fn follow_refuses_a_source_it_cannot_reference_instead_of_copying() {
    let root = tempfile::tempdir().expect("root");
    let destination = SubscriptionReader::new(SubscriptionProvider::Claude, root.path());

    // The keychain-only case: no writable file exists to point at.
    let error = prepare_external_source(
        SubscriptionProvider::Claude,
        link_assistant_router::platform_keychain::Origin::Keychain,
        None,
        &destination,
    )
    .expect_err("a keychain-only credential cannot be followed");

    // The refusal is a preflight one, so nothing has been written when it fires.
    assert!(error.contains("platform keychain"), "{error}");
    assert_eq!(error.phase, ImportPhase::Preflight);
    assert!(
        error.previous_credential_safe,
        "a refused follow leaves the existing credential untouched"
    );
}

#[test]
fn keychain_only_source_is_refused_before_validation() {
    let root = tempfile::tempdir().expect("root");
    let destination = SubscriptionReader::new(SubscriptionProvider::Claude, root.path());
    let error = prepare_external_source(
        SubscriptionProvider::Claude,
        link_assistant_router::platform_keychain::Origin::Keychain,
        None,
        &destination,
    )
    .expect_err("Keychain-only import");
    assert!(error.contains("platform keychain"), "{error}");
    assert!(error.contains("writable credential file"), "{error}");
}

#[cfg(unix)]
#[test]
fn aliased_source_and_destination_file_is_refused() {
    let root = tempfile::tempdir().expect("root");
    let source_home = root.path().join("source");
    let destination_home = root.path().join("destination");
    std::fs::create_dir_all(&source_home).expect("source home");
    std::fs::create_dir_all(&destination_home).expect("destination home");
    let source = source_home.join("auth.json");
    std::fs::write(&source, candidate_document(SubscriptionProvider::Codex))
        .expect("source credential");
    std::os::unix::fs::symlink(&source, destination_home.join("auth.json"))
        .expect("destination alias");
    let destination = SubscriptionReader::new(SubscriptionProvider::Codex, destination_home);

    let error = prepare_external_source(
        SubscriptionProvider::Codex,
        link_assistant_router::platform_keychain::Origin::File,
        Some(&source),
        &destination,
    )
    .expect_err("source/destination alias");
    assert!(error.contains("also a Router destination"), "{error}");
}

#[cfg(unix)]
#[test]
fn source_in_a_nonwritable_directory_is_refused_before_validation() {
    use std::os::unix::fs::PermissionsExt as _;

    let root = tempfile::tempdir().expect("root");
    let source_home = root.path().join("source");
    let destination_home = root.path().join("destination");
    std::fs::create_dir_all(&source_home).expect("source home");
    std::fs::create_dir_all(&destination_home).expect("destination home");
    let source = source_home.join("auth.json");
    std::fs::write(&source, candidate_document(SubscriptionProvider::Codex))
        .expect("source credential");
    std::fs::set_permissions(&source_home, std::fs::Permissions::from_mode(0o500))
        .expect("make source directory nonwritable");
    let destination = SubscriptionReader::new(SubscriptionProvider::Codex, destination_home);

    let result = prepare_external_source(
        SubscriptionProvider::Codex,
        link_assistant_router::platform_keychain::Origin::File,
        Some(&source),
        &destination,
    );
    std::fs::set_permissions(&source_home, std::fs::Permissions::from_mode(0o700))
        .expect("restore source permissions");
    let error = result.expect_err("nonwritable external source");
    assert!(error.contains("cannot be replaced atomically"), "{error}");
}
