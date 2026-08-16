//! Unit tests for the admin claim state machine ([`crate::admin`]).

use crate::admin::*;

fn claim() -> AdminClaim {
    AdminClaim::in_memory(None, Duration::from_secs(120))
}

#[test]
fn unclaimed_by_default() {
    let admin = claim();
    assert!(!admin.is_claimed());
    assert!(admin.status().bootstrap_open);
}

#[test]
fn candidate_alone_does_not_authorise() {
    let admin = claim();
    let candidate = admin.begin().expect("mint");
    assert!(!admin.verify(&candidate.token));
    assert!(!admin.is_claimed());
    assert!(admin.status().bootstrap_open);
}

#[test]
fn confirm_activates_and_closes_bootstrap() {
    let admin = claim();
    let candidate = admin.begin().expect("mint");
    admin
        .confirm(&candidate.claim_id, &candidate.token)
        .expect("confirm");
    assert!(admin.verify(&candidate.token));
    assert!(admin.is_claimed());
    assert!(!admin.status().bootstrap_open);
    assert_eq!(admin.begin().unwrap_err(), ClaimError::AlreadyClaimed);
}

#[test]
fn unconfirmed_mint_is_always_recoverable() {
    let admin = claim();
    let abandoned = admin.begin().expect("first mint");
    let second = admin.begin().expect("second mint stays allowed");
    // The abandoned candidate was discarded — only one outstanding.
    assert_eq!(
        admin.confirm(&abandoned.claim_id, &abandoned.token),
        Err(ClaimError::ClaimIdMismatch)
    );
    admin
        .confirm(&second.claim_id, &second.token)
        .expect("second confirms");
    assert!(admin.verify(&second.token));
}

#[test]
fn expired_candidate_leaves_system_unclaimed() {
    let admin = AdminClaim::in_memory(None, Duration::from_secs(0));
    let candidate = admin.begin().expect("mint");
    assert_eq!(
        admin.confirm(&candidate.claim_id, &candidate.token),
        Err(ClaimError::NoCandidate)
    );
    assert!(!admin.is_claimed());
    assert!(admin.status().bootstrap_open);
}

#[test]
fn wrong_token_is_rejected() {
    let admin = claim();
    let candidate = admin.begin().expect("mint");
    assert_eq!(
        admin.confirm(&candidate.claim_id, "la_admin_nope"),
        Err(ClaimError::TokenMismatch)
    );
    assert!(!admin.is_claimed());
}

#[test]
fn environment_key_disables_bootstrap() {
    let admin = AdminClaim::in_memory(Some("env-key".into()), Duration::from_secs(60));
    assert!(admin.is_claimed());
    assert!(admin.verify("env-key"));
    assert!(!admin.verify("other"));
    assert_eq!(
        admin.begin().unwrap_err(),
        ClaimError::ProvisionedByEnvironment
    );
}

#[test]
fn rotate_replaces_the_credential() {
    let admin = claim();
    let candidate = admin.begin().expect("mint");
    admin
        .confirm(&candidate.claim_id, &candidate.token)
        .expect("confirm");
    let replacement = admin.rotate().expect("rotate");
    assert!(admin.verify(&replacement));
    assert!(!admin.verify(&candidate.token));
}

#[test]
fn rotate_requires_an_existing_claim() {
    assert_eq!(claim().rotate().unwrap_err(), ClaimError::NoCandidate);
}

#[test]
fn claim_survives_restart() {
    let dir = tempfile::tempdir().expect("tempdir");
    let ttl = Duration::from_secs(60);
    let admin = AdminClaim::load(None, dir.path(), ttl);
    let candidate = admin.begin().expect("mint");
    admin
        .confirm(&candidate.claim_id, &candidate.token)
        .expect("confirm");

    let reloaded = AdminClaim::load(None, dir.path(), ttl);
    assert!(reloaded.is_claimed());
    assert!(reloaded.verify(&candidate.token));
    assert_eq!(reloaded.begin().unwrap_err(), ClaimError::AlreadyClaimed);
}

#[test]
fn independently_loaded_claims_have_one_cross_process_winner() {
    let dir = tempfile::tempdir().expect("tempdir");
    let ttl = Duration::from_secs(60);
    let first = AdminClaim::load(None, dir.path(), ttl);
    let second = AdminClaim::load(None, dir.path(), ttl);
    let first_candidate = first.begin().expect("first candidate");
    let second_candidate = second.begin().expect("second candidate");

    first
        .confirm(&first_candidate.claim_id, &first_candidate.token)
        .expect("first process claims");
    assert_eq!(
        second.confirm(&second_candidate.claim_id, &second_candidate.token),
        Err(ClaimError::AlreadyClaimed)
    );
    assert!(second.verify(&first_candidate.token));
    assert!(!second.verify(&second_candidate.token));
}

#[test]
fn mint_never_persists_anything() {
    let dir = tempfile::tempdir().expect("tempdir");
    let ttl = Duration::from_secs(60);
    let admin = AdminClaim::load(None, dir.path(), ttl);
    let _candidate = admin.begin().expect("mint");
    assert!(!dir.path().join(CLAIM_FILE_NAME).exists());
    assert!(!AdminClaim::load(None, dir.path(), ttl).is_claimed());
}
