//! Unit tests for [`crate::token`].

use super::*;

fn test_manager() -> TokenManager {
    TokenManager::new("test-secret-for-unit-tests")
}

#[test]
fn test_issue_token_has_prefix() {
    let mgr = test_manager();
    let token = mgr.issue_token(24, "test").expect("should issue token");
    assert!(token.starts_with(TOKEN_PREFIX));
}

#[test]
fn test_validate_valid_token() {
    let mgr = test_manager();
    let token = mgr.issue_token(24, "my-label").expect("should issue");
    let claims = mgr.validate_token(&token).expect("should validate");
    assert_eq!(claims.label, "my-label");
    assert!(!claims.sub.is_empty());
}

#[test]
fn test_validate_wrong_prefix() {
    let mgr = test_manager();
    let result = mgr.validate_token("wrong_prefix_abc");
    assert!(matches!(result, Err(TokenError::InvalidPrefix)));
}

#[test]
fn test_validate_invalid_jwt() {
    let mgr = test_manager();
    let result = mgr.validate_token("la_sk_not-a-valid-jwt");
    assert!(matches!(result, Err(TokenError::Invalid(_))));
}

#[test]
fn test_revoke_token() {
    let mgr = test_manager();
    let token = mgr.issue_token(24, "revoke-me").expect("should issue");
    let claims = mgr.validate_token(&token).expect("should validate first");

    mgr.revoke_token(&claims.sub).expect("should revoke");
    mgr.revoke_token(&claims.sub)
        .expect("repeated revocation should stay idempotent");

    let result = mgr.validate_token(&token);
    assert!(matches!(result, Err(TokenError::Revoked)));
}

#[test]
fn test_revoke_unknown_token_reports_not_found() {
    let result = test_manager().revoke_token("missing-token-id");
    assert!(matches!(result, Err(TokenError::NotFound(id)) if id == "missing-token-id"));
}

#[test]
fn test_expired_token() {
    let mgr = test_manager();
    // Issue with 0 hours TTL — should expire immediately
    let token = mgr.issue_token(0, "expired").expect("should issue");
    // Token with exp == iat should be expired by the time we validate
    let result = mgr.validate_token(&token);
    // This might or might not be expired depending on clock resolution,
    // so we just verify it doesn't panic
    match result {
        Ok(_) | Err(TokenError::Expired) => {} // both acceptable
        Err(e) => panic!("Unexpected error: {e}"),
    }
}

#[test]
fn test_list_tokens_returns_records() {
    let mgr = test_manager();
    let _t1 = mgr.issue_token(1, "one").unwrap();
    let _t2 = mgr.issue_token(1, "two").unwrap();
    let list = mgr.list_tokens().unwrap();
    assert_eq!(list.len(), 2);
    let labels: Vec<_> = list.iter().map(|r| r.label.as_str()).collect();
    assert!(labels.contains(&"one"));
    assert!(labels.contains(&"two"));
}

#[test]
fn account_binding_is_available_during_request_routing() {
    let mgr = test_manager();
    let token = mgr.issue_token_for(1, "bound", Some("account-2")).unwrap();
    let claims = mgr.validate_token(&token).unwrap();

    assert_eq!(
        mgr.account_for(&claims.sub).unwrap().as_deref(),
        Some("account-2")
    );
}

#[test]
fn test_unlimited_token_never_hits_budget() {
    let mgr = test_manager();
    let token = mgr.issue_token(24, "unlimited").unwrap();
    let claims = mgr.validate_token(&token).unwrap();
    // No max_requests → every request is permitted.
    for _ in 0..1000 {
        mgr.enforce_request_budget(&claims.sub)
            .expect("unlimited token must never be limited");
    }
}

#[test]
fn test_request_budget_enforced() {
    let mgr = test_manager();
    let token = mgr
        .issue_token_full(24, "capped", None, Some(3))
        .expect("should issue capped token");
    let claims = mgr.validate_token(&token).unwrap();

    // First three requests are allowed and recorded.
    mgr.enforce_request_budget(&claims.sub).unwrap();
    mgr.enforce_request_budget(&claims.sub).unwrap();
    mgr.enforce_request_budget(&claims.sub).unwrap();

    // The fourth exceeds the budget.
    let r = mgr.enforce_request_budget(&claims.sub);
    assert!(matches!(r, Err(TokenError::LimitExceeded)));

    // Usage is persisted on the record.
    let rec = mgr
        .list_tokens()
        .unwrap()
        .into_iter()
        .find(|r| r.id == claims.sub)
        .unwrap();
    assert_eq!(rec.max_requests, Some(3));
    assert_eq!(rec.used_requests, 3);
}

#[test]
fn actual_token_spend_stops_only_the_exhausted_token() {
    let mgr = test_manager();
    let capped = mgr
        .issue(&IssueRequest {
            ttl_hours: 24,
            label: "capped",
            max_tokens: Some(5),
            ..IssueRequest::default()
        })
        .unwrap();
    let other = mgr.issue_token(24, "other").unwrap();
    let capped_id = mgr.validate_token(&capped).unwrap().sub;
    let other_id = mgr.validate_token(&other).unwrap().sub;

    mgr.enforce_request_budget(&capped_id).unwrap();
    mgr.record_token_usage(&capped_id, 5).unwrap();

    assert!(matches!(
        mgr.enforce_request_budget(&capped_id),
        Err(TokenError::TokenLimitExceeded)
    ));
    mgr.enforce_request_budget(&other_id)
        .expect("one token's spend must not affect another token");
}

#[test]
fn per_token_rate_limit_rejects_only_the_bursting_token() {
    let mgr = test_manager();
    let limited = mgr
        .issue(&IssueRequest {
            ttl_hours: 24,
            label: "limited",
            rate_limit_per_minute: Some(1),
            ..IssueRequest::default()
        })
        .unwrap();
    let other = mgr.issue_token(24, "other").unwrap();
    let limited_id = mgr.validate_token(&limited).unwrap().sub;
    let other_id = mgr.validate_token(&other).unwrap().sub;

    mgr.enforce_request_budget(&limited_id).unwrap();
    assert!(matches!(
        mgr.enforce_request_budget(&limited_id),
        Err(TokenError::RateLimitExceeded)
    ));
    mgr.enforce_request_budget(&other_id)
        .expect("rate windows must be isolated by token id");
}

#[test]
fn a_reservation_larger_than_the_remaining_budget_is_rejected() {
    let mgr = test_manager();
    let (_token, id) = mgr
        .issue_with_id(&IssueRequest {
            ttl_hours: 24,
            label: "capped",
            max_tokens: Some(100),
            ..IssueRequest::default()
        })
        .unwrap();

    // A request declaring more than the whole budget never dispatches.
    assert!(matches!(
        mgr.enforce_request_budget_reserving(&id, 101),
        Err(TokenError::TokenLimitExceeded)
    ));
    // ... and nothing was consumed by the rejected attempt.
    let record = mgr.store().get(&id).unwrap().unwrap();
    assert_eq!(record.reserved_tokens, 0);
    assert_eq!(record.used_requests, 0);
}

#[test]
fn reservations_accumulate_and_block_the_request_that_would_overshoot() {
    let mgr = test_manager();
    let (_token, id) = mgr
        .issue_with_id(&IssueRequest {
            ttl_hours: 24,
            label: "capped",
            max_tokens: Some(100),
            ..IssueRequest::default()
        })
        .unwrap();

    mgr.enforce_request_budget_reserving(&id, 60).unwrap();
    // 60 is already reserved, so a second 60-token request cannot fit.
    assert!(matches!(
        mgr.enforce_request_budget_reserving(&id, 60),
        Err(TokenError::TokenLimitExceeded)
    ));
    // A smaller one still fits in the remaining 40.
    mgr.enforce_request_budget_reserving(&id, 40).unwrap();
    assert_eq!(mgr.store().get(&id).unwrap().unwrap().reserved_tokens, 100);
}

#[test]
fn settling_releases_the_reservation_and_records_actual_usage() {
    let mgr = test_manager();
    let (_token, id) = mgr
        .issue_with_id(&IssueRequest {
            ttl_hours: 24,
            label: "capped",
            max_tokens: Some(100),
            ..IssueRequest::default()
        })
        .unwrap();

    mgr.enforce_request_budget_reserving(&id, 60).unwrap();
    mgr.settle_token_usage(&id, 60, 10).unwrap();

    let record = mgr.store().get(&id).unwrap().unwrap();
    assert_eq!(record.reserved_tokens, 0, "reservation must be released");
    assert_eq!(record.used_tokens, 10, "only real usage is billed");

    // The freed budget is available again.
    mgr.enforce_request_budget_reserving(&id, 80).unwrap();
}

#[test]
fn settling_records_usage_that_exceeded_its_reservation() {
    let mgr = test_manager();
    let (_token, id) = mgr
        .issue_with_id(&IssueRequest {
            ttl_hours: 24,
            label: "capped",
            max_tokens: Some(100),
            ..IssueRequest::default()
        })
        .unwrap();

    mgr.enforce_request_budget_reserving(&id, 50).unwrap();
    // The provider reported more than the caller declared. The total must
    // stay truthful even though it now exceeds the cap.
    mgr.settle_token_usage(&id, 50, 130).unwrap();

    let record = mgr.store().get(&id).unwrap().unwrap();
    assert_eq!(record.reserved_tokens, 0);
    assert_eq!(record.used_tokens, 130);
    // An exhausted budget rejects the next request outright.
    assert!(matches!(
        mgr.enforce_request_budget_reserving(&id, 1),
        Err(TokenError::TokenLimitExceeded)
    ));
}

#[test]
fn settling_a_cancelled_request_returns_the_whole_reservation() {
    let mgr = test_manager();
    let (_token, id) = mgr
        .issue_with_id(&IssueRequest {
            ttl_hours: 24,
            label: "capped",
            max_tokens: Some(100),
            ..IssueRequest::default()
        })
        .unwrap();

    mgr.enforce_request_budget_reserving(&id, 90).unwrap();
    // A cancelled request reports no usage at all.
    mgr.settle_token_usage(&id, 90, 0).unwrap();

    let record = mgr.store().get(&id).unwrap().unwrap();
    assert_eq!(record.reserved_tokens, 0);
    assert_eq!(record.used_tokens, 0);
}

#[test]
fn stale_reservations_are_released_at_startup() {
    let mgr = test_manager();
    let (_token, id) = mgr
        .issue_with_id(&IssueRequest {
            ttl_hours: 24,
            label: "capped",
            max_tokens: Some(100),
            ..IssueRequest::default()
        })
        .unwrap();

    // A request that never settled -- the process died mid-flight.
    mgr.enforce_request_budget_reserving(&id, 100).unwrap();
    assert!(matches!(
        mgr.enforce_request_budget_reserving(&id, 1),
        Err(TokenError::TokenLimitExceeded)
    ));

    assert_eq!(mgr.release_stale_reservations().unwrap(), 1);
    assert_eq!(mgr.store().get(&id).unwrap().unwrap().reserved_tokens, 0);
    // The budget is usable again after recovery.
    mgr.enforce_request_budget_reserving(&id, 100).unwrap();
}

#[test]
fn an_uncapped_token_ignores_reservations_entirely() {
    let mgr = test_manager();
    let (_token, id) = mgr
        .issue_with_id(&IssueRequest {
            ttl_hours: 24,
            label: "uncapped",
            ..IssueRequest::default()
        })
        .unwrap();

    // No max_tokens means no spend gate, however large the declared budget.
    mgr.enforce_request_budget_reserving(&id, u64::MAX).unwrap();
    mgr.enforce_request_budget_reserving(&id, u64::MAX).unwrap();
}

#[test]
fn test_budget_for_unknown_token_is_permitted() {
    // A token id with no stored record (e.g. memory store cleared) is not
    // budget-limited — validation, not budgeting, is the gate there.
    let mgr = test_manager();
    mgr.enforce_request_budget("no-such-id").unwrap();
}

#[test]
fn test_persistent_store_roundtrip() {
    use crate::storage::TextTokenStore;
    let dir = tempfile::tempdir().unwrap();
    let store: Arc<dyn TokenStore> =
        Arc::new(TextTokenStore::open(dir.path().join("t.lino")).unwrap());
    let mgr = TokenManager::with_store("k", Arc::clone(&store));
    let tok = mgr.issue_token(1, "persisted").unwrap();
    let claims = mgr.validate_token(&tok).unwrap();

    // re-open the same store with a fresh manager
    let store2: Arc<dyn TokenStore> =
        Arc::new(TextTokenStore::open(dir.path().join("t.lino")).unwrap());
    let mgr2 = TokenManager::with_store("k", store2);
    // record should still be there
    assert_eq!(mgr2.list_tokens().unwrap().len(), 1);
    // revocation persists
    mgr2.revoke_token(&claims.sub).unwrap();
    let store3: Arc<dyn TokenStore> =
        Arc::new(TextTokenStore::open(dir.path().join("t.lino")).unwrap());
    let mgr3 = TokenManager::with_store("k", store3);
    let r = mgr3.validate_token(&tok);
    assert!(matches!(r, Err(TokenError::Revoked)));
}

#[test]
fn test_admin_scope_is_carried_by_claims_and_records() {
    let mgr = test_manager();
    let token = mgr.issue_admin_token(1, "ops").expect("should issue");
    let claims = mgr.validate_token(&token).expect("should validate");
    assert!(claims.is_admin());
    assert_eq!(claims.scope, ADMIN_SCOPE);

    let records = mgr.list_tokens().expect("should list");
    assert_eq!(records.len(), 1);
    assert_eq!(records[0].scope, ADMIN_SCOPE);
}

#[test]
fn test_client_tokens_carry_no_scope() {
    let mgr = test_manager();
    let token = mgr.issue_token(1, "client").expect("should issue");
    let claims = mgr.validate_token(&token).expect("should validate");
    assert!(!claims.is_admin());
    assert!(claims.scope.is_empty());
    assert!(matches!(
        mgr.validate_admin_token(&token),
        Err(TokenError::InsufficientScope)
    ));
}

#[test]
fn test_has_active_admin_token_tracks_revocation_and_expiry() {
    let mgr = test_manager();
    assert!(!mgr.has_active_admin_token().expect("should query"));

    mgr.issue_token(1, "client").expect("should issue");
    assert!(
        !mgr.has_active_admin_token().expect("should query"),
        "client tokens must not satisfy the admin-credential check"
    );

    mgr.issue(&IssueRequest {
        ttl_hours: -1,
        label: "stale",
        scope: ADMIN_SCOPE,
        ..IssueRequest::default()
    })
    .expect("should issue");
    assert!(
        !mgr.has_active_admin_token().expect("should query"),
        "expired admin tokens must not count"
    );

    let token = mgr.issue_admin_token(1, "ops").expect("should issue");
    assert!(mgr.has_active_admin_token().expect("should query"));

    let claims = mgr.validate_token(&token).expect("should validate");
    mgr.revoke_token(&claims.sub).expect("should revoke");
    assert!(!mgr.has_active_admin_token().expect("should query"));
}

#[test]
fn test_rotate_admin_token_issues_a_replacement_and_revokes_the_old_one() {
    let mgr = test_manager();
    let old = mgr.issue_admin_token(1, "ops").expect("should issue");
    let old_claims = mgr.validate_token(&old).expect("should validate");

    let new = mgr
        .rotate_admin_token(&old_claims.sub, 2, "ops-rotated")
        .expect("should rotate");

    let new_claims = mgr.validate_admin_token(&new).expect("should validate");
    assert_eq!(new_claims.label, "ops-rotated");
    assert_ne!(new_claims.sub, old_claims.sub);
    assert!(matches!(mgr.validate_token(&old), Err(TokenError::Revoked)));
    assert!(mgr.has_active_admin_token().expect("should query"));
}

#[test]
fn test_rotate_admin_token_rejects_an_unknown_subject() {
    let mgr = test_manager();
    let live = mgr.issue_admin_token(1, "ops").expect("should issue");

    assert!(mgr.rotate_admin_token("not-an-id", 1, "typo").is_err());
    // The existing credential must survive a failed rotation, and no
    // replacement may have been handed out.
    assert!(mgr.validate_admin_token(&live).is_ok());
    assert_eq!(mgr.list_tokens().expect("should list").len(), 1);
}

#[test]
fn ordinary_token_rotation_preserves_its_controls_and_revokes_the_old_token() {
    let mgr = test_manager();
    let old = mgr
        .issue(&IssueRequest {
            ttl_hours: 1,
            label: "worker",
            account: Some("account-2"),
            max_requests: Some(10),
            max_tokens: Some(1_000),
            rate_limit_per_minute: Some(3),
            scope: "",
            github_repos: Vec::new(),
        })
        .unwrap();
    let old_claims = mgr.validate_token(&old).unwrap();

    let new = mgr.rotate_token(&old_claims.sub, 2, "").unwrap();
    let new_claims = mgr.validate_token(&new).unwrap();
    let record = mgr.store().get(&new_claims.sub).unwrap().unwrap();

    assert_eq!(record.label, "worker");
    assert_eq!(record.account.as_deref(), Some("account-2"));
    assert_eq!(record.max_requests, Some(10));
    assert_eq!(record.max_tokens, Some(1_000));
    assert_eq!(record.rate_limit_per_minute, Some(3));
    assert!(matches!(mgr.validate_token(&old), Err(TokenError::Revoked)));
}

#[test]
fn test_constant_time_eq_matches_string_equality() {
    assert!(constant_time_eq("", ""));
    assert!(constant_time_eq("s3cret", "s3cret"));
    assert!(!constant_time_eq("s3cret", "s3crev"));
    // Length differences must not short-circuit into a match.
    assert!(!constant_time_eq("s3cret", "s3cre"));
    assert!(!constant_time_eq("s3cre", "s3cret"));
}

/// The shared bounds accept every reasonable request and reject the ones that
/// would mint an unusable or unbounded credential (issue #194).
#[test]
fn issue_request_validation_covers_every_constraint() {
    let base = IssueRequest {
        ttl_hours: 24,
        label: "ok",
        ..IssueRequest::default()
    };
    assert!(base.validate().is_ok());

    // TTL must be positive and bounded.
    for ttl in [0, -1, MAX_TTL_HOURS + 1] {
        let request = IssueRequest {
            ttl_hours: ttl,
            ..base.clone()
        };
        assert!(request.validate().is_err(), "ttl {ttl} must be rejected");
    }
    assert!(
        IssueRequest {
            ttl_hours: MAX_TTL_HOURS,
            ..base.clone()
        }
        .validate()
        .is_ok(),
        "the maximum TTL itself is allowed"
    );

    // Zero-valued caps mint a credential that can never serve a request.
    for request in [
        IssueRequest {
            max_requests: Some(0),
            ..base.clone()
        },
        IssueRequest {
            max_tokens: Some(0),
            ..base.clone()
        },
        IssueRequest {
            rate_limit_per_minute: Some(0),
            ..base.clone()
        },
    ] {
        let error = request.validate().expect_err("zero caps are rejected");
        assert!(error.contains("greater than zero"), "{error}");
    }

    // Scope must be empty (client) or the admin scope.
    assert!(
        IssueRequest {
            scope: "superuser",
            ..base.clone()
        }
        .validate()
        .is_err()
    );
    assert!(
        IssueRequest {
            scope: ADMIN_SCOPE,
            ..base
        }
        .validate()
        .is_ok()
    );
}

/// Rotation preserves the stored constraints and lifetime unless overridden.
#[test]
fn rotate_preserves_constraints_and_remaining_lifetime() {
    let mgr = test_manager();
    let (_token, id) = mgr
        .issue_with_id(&IssueRequest {
            ttl_hours: 48,
            label: "original",
            max_requests: Some(3),
            max_tokens: Some(500),
            rate_limit_per_minute: Some(2),
            account: Some("primary"),
            ..IssueRequest::default()
        })
        .expect("issue");

    let replacement = mgr
        .rotate_token_with(&id, &RotateOverrides::default())
        .expect("rotate");
    assert!(replacement.starts_with(TOKEN_PREFIX));

    let records = mgr.list_tokens().expect("list");
    assert!(
        records
            .iter()
            .find(|record| record.id == id)
            .expect("old record")
            .revoked,
        "the previous value is revoked"
    );
    let new = records
        .iter()
        .find(|record| !record.revoked)
        .expect("replacement");
    assert_eq!(new.label, "original", "the label carries over");
    assert_eq!(new.max_requests, Some(3));
    assert_eq!(new.max_tokens, Some(500));
    assert_eq!(new.rate_limit_per_minute, Some(2));
    assert_eq!(new.account.as_deref(), Some("primary"));
    // The remaining lifetime is preserved rather than silently extended.
    assert!(new.expires_at <= chrono::Utc::now().timestamp() + 48 * 3600);
}

#[test]
fn rotate_rejects_an_unknown_id_and_invalid_overrides() {
    let mgr = test_manager();
    assert!(matches!(
        mgr.rotate_token_with("no-such-id", &RotateOverrides::default()),
        Err(TokenError::Invalid(_))
    ));

    let (_token, id) = mgr
        .issue_with_id(&IssueRequest {
            ttl_hours: 24,
            label: "target",
            ..IssueRequest::default()
        })
        .expect("issue");
    // An override that would produce an unusable credential is refused, and
    // the existing token keeps working.
    assert!(matches!(
        mgr.rotate_token_with(
            &id,
            &RotateOverrides {
                max_tokens: Some(0),
                ..RotateOverrides::default()
            }
        ),
        Err(TokenError::Invalid(_))
    ));
    assert!(
        !mgr.store().get(&id).expect("get").expect("record").revoked,
        "a failed rotation must not revoke the original"
    );
}
