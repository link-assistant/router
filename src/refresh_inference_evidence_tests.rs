//! Credential-generation semantics for inference verdicts.

use super::*;

fn token(access: &str, refresh: &str, expiry: i64, account: &str) -> SubscriptionToken {
    SubscriptionToken {
        access_token: access.into(),
        refresh_token: Some(refresh.into()),
        expires_at_ms: Some(expiry),
        account_id: Some(account.into()),
        resource_url: None,
    }
}

/// Upstream verdicts, not timestamps, decide whether a credential is dead.
#[test]
fn credential_evidence_records_the_latest_upstream_verdict() {
    let cache = TokenCache::new();
    assert!(cache.evidence(SubscriptionProvider::Claude).is_none());
    cache.record_credential_rejected(SubscriptionProvider::Claude);
    assert_eq!(
        cache.evidence(SubscriptionProvider::Claude),
        Some(CredentialEvidence::Rejected)
    );
    cache.record_credential_working(SubscriptionProvider::Claude);
    assert_eq!(
        cache.evidence(SubscriptionProvider::Claude),
        Some(CredentialEvidence::Working)
    );
}

/// Only authentication status codes are credential verdicts.
#[test]
fn upstream_status_marks_only_authentication_failures_as_rejected() {
    for status in [401, 403] {
        let cache = TokenCache::new();
        cache.record_status(SubscriptionProvider::Claude, status);
        assert_eq!(
            cache.evidence(SubscriptionProvider::Claude),
            Some(CredentialEvidence::Rejected),
            "{status} must reject"
        );
    }
    for status in [200, 201, 299] {
        let cache = TokenCache::new();
        cache.record_status(SubscriptionProvider::Claude, status);
        assert_eq!(
            cache.evidence(SubscriptionProvider::Claude),
            Some(CredentialEvidence::Working),
            "{status} must prove the credential works"
        );
    }
    for status in [400, 404, 429, 500, 502, 503] {
        let cache = TokenCache::new();
        cache.record_status(SubscriptionProvider::Claude, status);
        assert_eq!(
            cache.evidence(SubscriptionProvider::Claude),
            None,
            "{status} must leave the credential verdict untouched"
        );
    }
}

#[test]
fn credential_evidence_is_scoped_to_the_stable_router_account_name() {
    let cache = TokenCache::new();
    cache.record_status_for(SubscriptionProvider::Codex, "account-1", 401);
    assert_eq!(cache.evidence(SubscriptionProvider::Codex), None);
    assert_eq!(
        cache.evidence_for(SubscriptionProvider::Codex, "account-1"),
        Some(CredentialEvidence::Rejected)
    );
    cache.record_credential_working_for(SubscriptionProvider::Codex, "primary");
    assert_eq!(
        cache.evidence_for(SubscriptionProvider::Codex, "account-1"),
        Some(CredentialEvidence::Rejected),
        "a healthy neighbour must not erase the rejected account's evidence"
    );
}

/// Once an authoritative load observes a new generation, neither a delayed
/// failure nor a delayed success from the old bearer may overwrite it.
#[tokio::test]
async fn late_inference_verdicts_cannot_overwrite_an_authoritative_replacement() {
    let cache = TokenCache::new();
    let provider = SubscriptionProvider::Codex;
    let account = "primary";
    let credential_a = token("access-a", "refresh-a", 10, "account-a");
    let credential_b = token("access-b", "refresh-b", 20, "account-b");

    cache
        .reconcile_authoritative_credential(provider, account, &credential_a)
        .await;
    cache
        .reconcile_authoritative_credential(provider, account, &credential_b)
        .await;
    cache
        .record_status_for_credential(provider, account, &credential_b, 200)
        .await;
    cache
        .record_status_for_credential(provider, account, &credential_a, 401)
        .await;
    assert_eq!(
        cache.evidence_for(provider, account),
        Some(CredentialEvidence::Working),
        "a delayed rejection from A must not poison replacement B"
    );

    cache
        .record_status_for_credential(provider, account, &credential_b, 403)
        .await;
    cache
        .record_status_for_credential(provider, account, &credential_a, 204)
        .await;
    assert_eq!(
        cache.evidence_for(provider, account),
        Some(CredentialEvidence::Rejected),
        "a delayed success from A must not erase replacement B's rejection"
    );

    let mut lossy_codex_b = credential_b.clone();
    lossy_codex_b.expires_at_ms = Some(1);
    cache
        .record_status_for_credential(provider, account, &lossy_codex_b, 200)
        .await;
    assert_eq!(
        cache.evidence_for(provider, account),
        Some(CredentialEvidence::Working),
        "Codex expiry-only serialization loss is still generation B"
    );

    let replacement_after_response = TokenCache::new();
    replacement_after_response
        .reconcile_authoritative_credential(provider, account, &credential_a)
        .await;
    replacement_after_response
        .record_status_for_credential(provider, account, &credential_a, 401)
        .await;
    assert_eq!(
        replacement_after_response.evidence_for(provider, account),
        Some(CredentialEvidence::Rejected)
    );
    replacement_after_response
        .reconcile_authoritative_credential(provider, account, &credential_b)
        .await;
    assert_eq!(
        replacement_after_response.evidence_for(provider, account),
        None,
        "a later authoritative B reconciliation must clear A's earlier verdict"
    );
}
