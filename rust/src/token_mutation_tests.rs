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
