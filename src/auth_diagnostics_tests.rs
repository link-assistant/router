use super::*;

#[test]
fn every_rejection_has_its_own_reason_code() {
    let codes = [
        TokenError::InvalidPrefix,
        TokenError::Invalid("x".into()),
        TokenError::SignatureInvalid,
        TokenError::IssuerSecretUnset,
        TokenError::Expired(None),
        TokenError::Revoked,
        TokenError::MissingRecord,
        TokenError::BindingMismatch,
        TokenError::NotFound("id".into()),
        TokenError::InsufficientScope,
        TokenError::LimitExceeded(None),
        TokenError::TokenLimitExceeded(None),
        TokenError::RateLimitExceeded,
        TokenError::Storage("disk".into()),
    ]
    .iter()
    .map(TokenError::reason_code)
    .collect::<std::collections::BTreeSet<_>>();
    assert_eq!(codes.len(), 14, "reason codes must be distinct");
}

#[test]
fn recent_failures_are_bounded_and_hold_no_token_value() {
    let diagnostics = AuthDiagnostics::default();
    let token = "la_sk_secret-material-that-must-not-leak";
    for _ in 0..(RECENT_CAPACITY + 10) {
        diagnostics.record(reason::SIGNATURE_INVALID, Some(token));
    }
    let snapshot = diagnostics.snapshot();
    assert_eq!(snapshot.recent_failures.len(), RECENT_CAPACITY);
    assert_eq!(
        snapshot.failures_by_reason[reason::SIGNATURE_INVALID],
        (RECENT_CAPACITY + 10) as u64
    );
    let rendered = serde_json::to_string(&snapshot).unwrap() + &diagnostics.render_prometheus();
    assert!(!rendered.contains("secret-material"));
    assert!(rendered.contains("signature_invalid"));
}

#[test]
fn the_token_id_is_read_only_when_it_is_a_uuid() {
    let manager = crate::token::TokenManager::new("diagnostics-secret");
    let (token, id) = manager
        .issue_with_id(&crate::token::IssueRequest {
            ttl_hours: 1,
            label: "probe",
            ..crate::token::IssueRequest::default()
        })
        .unwrap();
    assert_eq!(unverified_subject(&token).as_deref(), Some(id.as_str()));
    assert_eq!(unverified_subject("la_sk_not.a.jwt"), None);
}
