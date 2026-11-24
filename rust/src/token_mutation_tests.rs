//! Tests that pin [`crate::token`] behaviour the `Mutants` workflow found
//! unchecked: a mutation of each line below survived the rest of the suite.

use super::*;

fn test_manager() -> TokenManager {
    TokenManager::new("token-mutation-test-secret")
}

/// The TTL cap is the documented ten years, not merely "whatever the constant
/// says": the validation tests compare against the constant itself, so they
/// would accept any value for it.
#[test]
fn the_ttl_cap_is_ten_years_of_hours() {
    assert_eq!(MAX_TTL_HOURS, 87_600);
}

/// A wrapper-run credential is a real, verifiable token whose record is marked
/// ephemeral so that compaction can prune it once its run is over.
#[test]
fn an_ephemeral_token_validates_and_is_recorded_as_ephemeral() {
    let manager = test_manager();
    let token = manager
        .issue_ephemeral(&IssueRequest {
            ttl_hours: 1,
            label: "wrapper-run",
            ..IssueRequest::default()
        })
        .expect("issue an ephemeral token");
    assert!(token.starts_with(TOKEN_PREFIX), "{token}");

    let claims = manager
        .validate_token(&token)
        .expect("the ephemeral token validates");
    assert_eq!(claims.label, "wrapper-run");
    let record = manager
        .store()
        .get(&claims.sub)
        .unwrap()
        .expect("the ephemeral token has a record");
    assert!(record.ephemeral);
}

/// A rejected request says how much of which budget is spent (issue #355).
#[test]
fn a_spent_request_budget_reports_its_counts() {
    let manager = test_manager();
    let token = manager
        .issue_token_full(1, "capped-requests", None, Some(2))
        .unwrap();
    let id = manager.validate_token(&token).unwrap().sub;
    manager.enforce_request_budget(&id).unwrap();
    manager.enforce_request_budget(&id).unwrap();

    let error = manager.enforce_request_budget(&id).unwrap_err();
    assert!(
        matches!(
            error,
            TokenError::LimitExceeded(Some(BudgetFacts { used: 2, limit: 2 }))
        ),
        "{error:?}"
    );
}

#[test]
fn a_spent_token_budget_reports_its_counts() {
    let manager = test_manager();
    let token = manager
        .issue(&IssueRequest {
            ttl_hours: 1,
            label: "capped-tokens",
            max_tokens: Some(5),
            ..IssueRequest::default()
        })
        .unwrap();
    let id = manager.validate_token(&token).unwrap().sub;
    manager.enforce_request_budget(&id).unwrap();
    manager.record_token_usage(&id, 7).unwrap();

    let error = manager.enforce_request_budget(&id).unwrap_err();
    assert!(
        matches!(
            error,
            TokenError::TokenLimitExceeded(Some(BudgetFacts { used: 7, limit: 5 }))
        ),
        "{error:?}"
    );
}

/// Rotation applies the TTL it was asked for instead of carrying the old one.
#[test]
fn rotating_a_token_applies_the_requested_ttl() {
    let manager = test_manager();
    let token = manager
        .issue(&IssueRequest {
            ttl_hours: 1,
            label: "short-lived",
            ..IssueRequest::default()
        })
        .unwrap();
    let id = manager.validate_token(&token).unwrap().sub;

    let rotated = manager.rotate_token(&id, 48, "").unwrap();
    let sub = manager.validate_token(&rotated).unwrap().sub;
    let record = manager.store().get(&sub).unwrap().unwrap();
    assert!(
        record.expires_at - record.issued_at >= 47 * 3600,
        "{record:?}"
    );
}

/// An admin token whose expiry is this very second has already expired, so
/// a first-visitor claim neither revokes nor reports it again.
#[test]
fn an_admin_token_expiring_this_second_is_not_revoked_again() {
    let manager = test_manager();
    let admin = |label| {
        let request = IssueRequest {
            ttl_hours: 1,
            label,
            scope: ADMIN_SCOPE,
            ..IssueRequest::default()
        };
        let token = manager.issue(&request).unwrap();
        manager.validate_token(&token).unwrap().sub
    };
    let (expiring, live, kept) = (admin("expiring"), admin("live"), admin("kept"));
    let expires_at = manager.store().get(&expiring).unwrap().unwrap().expires_at;
    let mut live_record = manager.store().get(&live).unwrap().unwrap();
    live_record.expires_at = expires_at + 60;
    manager.store().put(live_record).unwrap();

    let context = crate::operation_context::OperationContext {
        now: chrono::DateTime::from_timestamp(expires_at, 0),
        ..crate::operation_context::OperationContext::default()
    };
    let revoked = context.scope(|| manager.revoke_other_admin_tokens(&kept));
    assert_eq!(revoked.unwrap(), vec![live]);
}

/// A signed token that names only a principal, or only a client kind, still
/// needs its record: either binding alone refuses a token without one.
#[test]
fn a_token_with_one_binding_and_no_record_is_refused() {
    let manager = test_manager();
    let token = manager
        .issue(&IssueRequest {
            ttl_hours: 1,
            label: "bound",
            client_kind: Some("codex"),
            principal_id: Some("primary"),
            ..IssueRequest::default()
        })
        .unwrap();
    let bound = manager.validate_token(&token).unwrap();
    assert!(manager.store().delete(&bound.sub).unwrap());

    let key = EncodingKey::from_secret(b"token-mutation-test-secret");
    for keep_client_kind in [true, false] {
        let mut claims = bound.clone();
        if keep_client_kind {
            claims.principal_id = None;
        } else {
            claims.client_kind = None;
        }
        let jwt = encode(&Header::default(), &claims, &key).unwrap();
        let error = manager
            .validate_token(&format!("{TOKEN_PREFIX}{jwt}"))
            .unwrap_err();
        assert!(matches!(error, TokenError::MissingRecord), "{error:?}");
    }
}

/// Run `operation` as if the clock read `secs` seconds after the epoch.
fn at<T>(secs: i64, operation: impl FnOnce() -> T) -> T {
    let context = crate::operation_context::OperationContext {
        now: chrono::DateTime::from_timestamp(secs, 0),
        ..crate::operation_context::OperationContext::default()
    };
    context.scope(operation)
}

/// An admin token whose expiry is this very second is no longer a way in, so
/// boot mints a bootstrap credential instead of relying on it.
#[test]
fn an_admin_token_expiring_this_second_is_not_active() {
    let manager = test_manager();
    let request = IssueRequest {
        ttl_hours: 1,
        label: "admin",
        scope: ADMIN_SCOPE,
        ..IssueRequest::default()
    };
    let token = manager.issue(&request).unwrap();
    let id = manager.validate_token(&token).unwrap().sub;
    let expires_at = manager.store().get(&id).unwrap().unwrap().expires_at;

    let has_admin = |secs| at(secs, || manager.has_active_admin_token()).unwrap();
    assert!(has_admin(expires_at - 1));
    assert!(!has_admin(expires_at));
}

/// A rotation without a TTL keeps the whole hours the old token had left.
#[test]
fn rotating_without_a_ttl_keeps_the_remaining_whole_hours() {
    let manager = test_manager();
    let issued_at = chrono::Utc::now().timestamp();
    let request = IssueRequest {
        ttl_hours: 48,
        label: "rotated",
        ..IssueRequest::default()
    };
    let token = at(issued_at, || manager.issue(&request)).unwrap();
    let id = manager.validate_token(&token).unwrap().sub;

    // Half an hour later, 47.5 hours remain: the replacement gets 47.
    let overrides = RotateOverrides::default();
    let rotate = || manager.rotate_token_with(&id, &overrides);
    let rotated = at(issued_at + 1800, rotate).unwrap();
    let sub = manager.validate_token(&rotated).unwrap().sub;
    let record = manager.store().get(&sub).unwrap().unwrap();
    let ttl = record.expires_at - record.issued_at;
    assert_eq!(ttl, 47 * 3600, "{record:?}");
}

/// A store whose revocation reports that nothing changed, as a concurrent
/// writer or a lost update could, while the record stays live.
struct StuckRevokeStore(MemoryTokenStore);

impl TokenStore for StuckRevokeStore {
    fn list(&self) -> Result<Vec<TokenRecord>, StorageError> {
        self.0.list()
    }
    fn get(&self, id: &str) -> Result<Option<TokenRecord>, StorageError> {
        self.0.get(id)
    }
    fn put(&self, record: TokenRecord) -> Result<(), StorageError> {
        self.0.put(record)
    }
    fn delete(&self, id: &str) -> Result<bool, StorageError> {
        self.0.delete(id)
    }
    fn revoke(&self, _: &str) -> Result<bool, StorageError> {
        Ok(false)
    }
}

/// Revocation is idempotent only for a record that really is revoked: a
/// revoke that left the token live is reported, not passed off as done.
#[test]
fn a_revoke_that_leaves_the_token_live_is_an_error() {
    let store = Arc::new(StuckRevokeStore(MemoryTokenStore::new()));
    let manager = TokenManager::with_store("token-mutation-test-secret", store);
    let token = manager.issue_token(1, "stuck").unwrap();
    let id = manager.validate_token(&token).unwrap().sub;

    let error = manager.revoke_token(&id).unwrap_err();
    let TokenError::Storage(message) = &error else {
        panic!("{error:?}");
    };
    assert!(message.contains("could not be revoked"), "{message}");
    assert!(!manager.store().get(&id).unwrap().unwrap().revoked);
}
