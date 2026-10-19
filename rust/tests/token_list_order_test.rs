//! Regression coverage for issue #618: `tokens list` has one stable order.
//!
//! Every token store keeps its records in a `HashMap`, whose iteration order
//! is seeded per process. Two `router tokens list --json` runs over the same
//! store therefore printed the same records in different orders, and the
//! rolling-update test's byte comparison of the old backend's list with its
//! successor's failed although nothing had changed.

use link_assistant_router::token::TokenManager;

#[test]
fn listing_tokens_orders_them_by_issue_time_then_id() {
    let manager = TokenManager::new("token-list-order-secret");
    // Enough records that a per-process hash order matching the sorted one
    // by chance is not a realistic outcome.
    for index in 0..24 {
        manager
            .issue_token(24, &format!("token-{index}"))
            .expect("issue");
    }

    let listed = manager.list_tokens().expect("list");
    let order: Vec<(i64, String)> = listed
        .iter()
        .map(|record| (record.issued_at, record.id.clone()))
        .collect();
    let mut sorted = order.clone();
    sorted.sort();
    assert_eq!(order.len(), 24);
    assert_eq!(order, sorted, "tokens are listed in hash order");

    // A second read, like a second process, gives the same answer.
    let again: Vec<String> = manager
        .list_tokens()
        .expect("list")
        .into_iter()
        .map(|record| record.id)
        .collect();
    let first: Vec<String> = listed.into_iter().map(|record| record.id).collect();
    assert_eq!(again, first);
}
