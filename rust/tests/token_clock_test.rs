//! Token security decisions and diagnostics use the operation's injected clock.
use link_assistant_router::{
    operation_context::OperationContext,
    token::{ExpiryFacts, IssueRequest, TokenError, TokenManager},
};

const ISSUED: i64 = 1_600_000_000;
const NOW: i64 = 1_800_000_000;

fn clock(timestamp: i64) -> OperationContext {
    let mut context = OperationContext::default();
    context.now = chrono::DateTime::from_timestamp(timestamp, 0);
    context
}

fn aged_token(manager: &TokenManager, sliding: bool) -> String {
    // The signed expiry is in 2020, beyond the decoder's real-clock leeway.
    // The durable record's sliding boundary is then set against injected time.
    clock(ISSUED).scope(|| {
        manager
            .issue(&IssueRequest {
                ttl_hours: 1,
                label: "clock-fixture",
                sliding_window_seconds: sliding.then_some(3600),
                ..IssueRequest::default()
            })
            .unwrap()
    })
}

#[test]
fn a_sliding_record_expiring_exactly_now_is_rejected_with_original_facts() {
    let manager = TokenManager::new("clock-test-issuer-secret");
    let token = aged_token(&manager, true);
    let mut record = manager.list_tokens().unwrap().remove(0);
    record.expires_at = NOW;
    manager.store().put(record).unwrap();
    let error = clock(NOW)
        .scope(|| manager.validate_token(&token))
        .unwrap_err();
    let TokenError::Expired(facts) = error else {
        panic!("expected an expiry, got {error}");
    };
    assert_eq!(
        facts,
        Some(ExpiryFacts {
            issued_at: ISSUED,
            expires_at: ISSUED + 3600,
            ago_seconds: NOW - ISSUED - 3600,
        })
    );
}

#[test]
fn a_sliding_record_one_second_past_now_is_live_until_revoked() {
    let manager = TokenManager::new("clock-test-issuer-secret");
    let token = aged_token(&manager, true);
    let mut record = manager.list_tokens().unwrap().remove(0);
    let id = record.id.clone();
    record.expires_at = NOW + 1;
    manager.store().put(record).unwrap();
    let claims = clock(NOW).scope(|| manager.validate_token(&token)).unwrap();
    assert_eq!(claims.sub, id);
    manager.revoke_token(&id).unwrap();
    assert!(clock(NOW).scope(|| manager.validate_token(&token)).is_err());
}

#[test]
fn fixed_expiry_facts_preserve_injected_elapsed_time() {
    let manager = TokenManager::new("clock-test-issuer-secret");
    let token = aged_token(&manager, false);
    let error = clock(NOW)
        .scope(|| manager.validate_token(&token))
        .unwrap_err();
    let TokenError::Expired(Some(facts)) = error else {
        panic!("expired credentials must retain their diagnostic facts");
    };
    assert_eq!(facts.issued_at, ISSUED);
    assert_eq!(facts.expires_at, ISSUED + 3600);
    assert_eq!(facts.ago_seconds, NOW - facts.expires_at);
}

#[test]
fn signed_expiry_uses_injected_time_including_the_decoders_leeway() {
    let manager = TokenManager::new("clock-test-issuer-secret");
    let token = aged_token(&manager, false);
    clock(ISSUED + 1)
        .scope(|| manager.validate_token(&token))
        .expect("a signature valid at the injected time must be accepted");
    let leeway = i64::try_from(jsonwebtoken::Validation::default().leeway).unwrap();
    clock(ISSUED + 3600 + leeway)
        .scope(|| manager.validate_token(&token))
        .expect("retain the native decoder's inclusive leeway boundary");
    let error = clock(ISSUED + 3600 + leeway + 1)
        .scope(|| manager.validate_token(&token))
        .unwrap_err();
    assert!(matches!(error, TokenError::Expired(Some(_))));
    let wrong_issuer = TokenManager::new("different-clock-test-issuer-secret");
    let error = clock(ISSUED + 1)
        .scope(|| wrong_issuer.validate_token(&token))
        .unwrap_err();
    assert!(matches!(error, TokenError::SignatureInvalid));
}
