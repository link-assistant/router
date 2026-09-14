//! Coverage for recovering administrative access from a local store (#573).
//!
//! The property under test is the one the issue is about: an operator who holds
//! the store but lost the printed token gets administrative access back, and
//! everything else the deployment holds survives. The end-to-end proof that a
//! *running* server accepts the result lives in
//! `tests/admin_recovery_test.rs`, which drives the shipped binary.

use std::sync::Arc;

use crate::admin_recovery::{RECOVERED_ADMIN_LABEL, recover};
use crate::storage::{TokenStore, build_token_store};
use crate::token::{ADMIN_SCOPE, IssueRequest, TokenManager};

const SECRET: &str = "a-test-signing-secret-for-admin-recovery";

fn store() -> (TokenManager, Arc<dyn TokenStore>, tempfile::TempDir) {
    let data = tempfile::tempdir().expect("a temporary data directory");
    let store = build_token_store(crate::config::StoragePolicy::Text, data.path())
        .expect("a text token store");
    let manager = TokenManager::with_store(SECRET, Arc::clone(&store));
    (manager, store, data)
}

/// Mint the administrator a first boot would have printed and then "lose" it:
/// the value is dropped on the floor, exactly as an operator loses it, while
/// the store keeps its record.
fn lose_an_admin_token(manager: &TokenManager) -> String {
    let token = manager
        .issue_admin_token(24, "bootstrap-admin")
        .expect("a bootstrap admin token");
    crate::managed_server::token_subject(&token).expect("its subject")
}

#[test]
fn a_store_whose_printed_admin_token_was_lost_can_be_administered_again() {
    let (manager, store, _data) = store();
    let lost = lose_an_admin_token(&manager);

    let recovery = recover(&manager, &store, 24, RECOVERED_ADMIN_LABEL, false)
        .expect("recovery from a local store");

    // The replacement validates as an administrator on the ordinary path — the
    // same check the server performs on every request, so a deployment signed
    // with this secret accepts it without restarting.
    let claims = manager
        .validate_admin_token(&recovery.token)
        .expect("the recovered token validates as an admin credential");
    assert!(claims.is_admin(), "the recovered token carries admin scope");
    assert_eq!(claims.sub, recovery.token_id);
    assert_ne!(
        recovery.token_id, lost,
        "recovery mints a new credential rather than reprinting the lost one"
    );
}

#[test]
fn recovery_preserves_the_client_tokens_the_deployment_already_issued() {
    let (manager, store, _data) = store();
    lose_an_admin_token(&manager);
    let client = manager
        .issue_token(24, "a-client")
        .expect("a client token issued before recovery");

    recover(&manager, &store, 24, RECOVERED_ADMIN_LABEL, false).expect("recovery");

    // The whole objection to "destroy it and start over" is that it discards
    // these. A token minted before recovery must still authenticate after.
    let claims = manager
        .validate_token(&client)
        .expect("a client token minted before recovery still validates");
    assert!(
        !claims.is_admin(),
        "the client token is not promoted by recovery"
    );
}

#[test]
fn a_recovery_is_visible_in_the_store_afterwards() {
    let (manager, store, _data) = store();
    lose_an_admin_token(&manager);

    let recovery = recover(&manager, &store, 24, RECOVERED_ADMIN_LABEL, false).expect("recovery");

    // The store's own metadata is the audit trail: always written, and readable
    // with `tokens list` long after the fact.
    let record = store
        .get(&recovery.token_id)
        .expect("the store can be read")
        .expect("the recovered token has a record");
    assert_eq!(record.label, RECOVERED_ADMIN_LABEL);
    assert_eq!(record.scope, ADMIN_SCOPE);
    assert_ne!(
        record.label, "bootstrap-admin",
        "a recovery is distinguishable from a first boot"
    );
}

#[test]
fn recovery_reports_that_the_lost_administrator_is_still_live() {
    let (manager, store, _data) = store();
    lose_an_admin_token(&manager);

    let recovery = recover(&manager, &store, 24, RECOVERED_ADMIN_LABEL, false).expect("recovery");

    // Recovery alone *adds* an administrator. Whoever holds the lost token
    // still has access, and an operator who is not told that will not act on it.
    assert_eq!(recovery.retained_admins, 1);
    assert!(recovery.revoked.is_empty());
}

#[test]
fn revoking_others_retires_the_lost_administrator() {
    let (manager, store, _data) = store();
    let lost = lose_an_admin_token(&manager);

    let recovery = recover(&manager, &store, 24, "after-compromise", true).expect("recovery");

    assert_eq!(recovery.revoked, vec![lost.clone()]);
    assert_eq!(recovery.retained_admins, 0);
    let lost_record = store
        .get(&lost)
        .expect("the store can be read")
        .expect("the lost token still has a record");
    assert!(lost_record.revoked, "the lost administrator is revoked");
    // The replacement is not caught by its own sweep.
    manager
        .validate_admin_token(&recovery.token)
        .expect("the replacement survives --revoke-others");
}

#[test]
fn revoking_others_leaves_client_tokens_alone() {
    let (manager, store, _data) = store();
    lose_an_admin_token(&manager);
    let client = manager
        .issue_token(24, "a-client")
        .expect("a client token issued before recovery");

    recover(&manager, &store, 24, "after-compromise", true).expect("recovery");

    // `--revoke-others` is about administrators. Sweeping client credentials
    // with them would make recovery as destructive as the remedy it replaces.
    manager
        .validate_token(&client)
        .expect("a client token survives --revoke-others");
}

#[test]
fn an_expired_or_revoked_administrator_is_not_counted_as_retained() {
    let (manager, store, _data) = store();
    // An admin token that has already expired leaves nobody in control, so it
    // must not be reported as a live administrator still holding access.
    let expired = manager
        .issue(&IssueRequest {
            ttl_hours: -1,
            label: "long-expired-admin",
            account: None,
            max_requests: None,
            max_tokens: None,
            rate_limit_per_minute: None,
            scope: ADMIN_SCOPE,
            github_repos: Vec::new(),
            sliding_window_seconds: None,
            client_kind: None,
            principal_id: None,
        })
        .expect("an expired admin token");
    let expired_id = crate::managed_server::token_subject(&expired).expect("its subject");

    let recovery = recover(&manager, &store, 24, RECOVERED_ADMIN_LABEL, false).expect("recovery");

    assert_eq!(
        recovery.retained_admins, 0,
        "an expired administrator holds no access"
    );
    assert!(
        store
            .get(&expired_id)
            .expect("the store can be read")
            .is_some(),
        "the expired record is left in place rather than tidied away"
    );
}

#[test]
fn a_store_with_no_administrator_at_all_can_still_be_recovered() {
    let (manager, store, _data) = store();

    // The `--allow-anonymous-admin` and `TOKEN_ADMIN_KEY` deployments never
    // mint a bootstrap administrator, so recovery must not require one to
    // already exist.
    let recovery = recover(&manager, &store, 24, RECOVERED_ADMIN_LABEL, false)
        .expect("recovery against a store holding no administrator");

    assert_eq!(recovery.retained_admins, 0);
    manager
        .validate_admin_token(&recovery.token)
        .expect("the first administrator of this store validates");
}

#[test]
fn a_non_positive_lifetime_is_refused_rather_than_minting_a_dead_token() {
    let (manager, store, _data) = store();

    let error = recover(&manager, &store, 0, RECOVERED_ADMIN_LABEL, false)
        .expect_err("a zero lifetime is refused");

    assert!(
        error.contains("positive lifetime"),
        "the refusal explains itself: {error}"
    );
    assert!(
        store.list().expect("the store can be read").is_empty(),
        "a refused recovery mints nothing"
    );
}

#[test]
fn a_token_recovered_from_one_store_is_rejected_by_a_deployment_with_another_secret() {
    let (manager, store, _data) = store();
    let recovery = recover(&manager, &store, 24, RECOVERED_ADMIN_LABEL, false).expect("recovery");

    // Recovery is only meaningful because it signs with *this* deployment's
    // secret. A different deployment must refuse the result, or "recovery"
    // would be a way into somebody else's router.
    let elsewhere = TokenManager::new("a-different-deployments-signing-secret");
    assert!(
        elsewhere.validate_admin_token(&recovery.token).is_err(),
        "a foreign deployment rejects a token recovered from this store"
    );
}

#[test]
fn the_refusal_to_recover_over_http_names_the_selected_deployment() {
    let server = crate::managed_server::ResolvedServer::at(
        "https://router.example:8443",
        Some("la_sk_example".to_string()),
        "test",
    );

    let refusal = crate::admin_recovery::refusal(&server);

    // "Not from here" alone leaves the operator guessing; the message has to
    // name the deployment it would have acted on and how to act on it.
    assert!(
        refusal.contains("https://router.example:8443"),
        "the refusal names the target: {refusal}"
    );
    assert!(
        refusal.contains("docker exec"),
        "the refusal says how to run it on the deployment: {refusal}"
    );
}
