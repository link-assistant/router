use super::*;
use crate::client_policy::ClientProtocol;
use crate::model_catalog::CatalogRecord;
use serde_json::json;

fn record(account: &str, maximum: u32) -> CatalogRecord {
    CatalogRecord {
        provider: SubscriptionProvider::Claude, account: account.into(), canonical_id: "exact".into(),
        raw: json!({"thinking":{"supported":true,"min_budget_tokens":1024,"max_budget_tokens":maximum},
            "router_endpoint":"https://fixture.invalid/v1/models","router_source_url":"https://fixture.invalid/v1/models",
            "router_account":account,"router_protocols":["anthropic_messages"],"router_health_generation":"generation-a"}).as_object().unwrap().clone(),
        source_order: 0, fetched_at: chrono::Utc::now().timestamp(), health_generation: "generation-a".into(),
        protocols: std::iter::once(ClientProtocol::AnthropicMessages).collect(),
    }
}

fn apply(state: &AppState, account: &str, endpoint: &str) -> Value {
    let mut body = json!({"model":"exact","max_tokens":20000,"thinking":{"type":"enabled","budget_tokens":10000},
        "messages":[{"role":"assistant","content":[{"type":"thinking","signature":"unchanged"}]}]});
    apply_for_account(
        state,
        &mut body,
        "exact",
        SubscriptionProvider::Claude,
        account,
        endpoint,
        ThinkingProtocol::Anthropic,
        ThinkingProtocol::Anthropic,
        true,
    )
    .unwrap();
    assert_eq!(body["messages"][0]["content"][0]["signature"], "unchanged");
    body
}

#[test]
fn each_selected_account_uses_only_its_endpoint_and_generation() {
    let data = tempfile::tempdir().unwrap();
    let state = AppState::for_tests(data.path());
    for (account, maximum) in [("account-a", 8192), ("account-b", 2048)] {
        state.model_catalogs.record_records_for_account(
            SubscriptionProvider::Claude,
            account,
            Some(account.into()),
            vec![record(account, maximum)],
        );
        assert_eq!(
            apply(&state, account, "https://fixture.invalid")["thinking"]["budget_tokens"],
            maximum
        );
    }
    assert_eq!(
        apply(&state, "missing", "https://fixture.invalid")["thinking"]["budget_tokens"],
        10000
    );
    assert_eq!(
        apply(&state, "account-a", "https://other.invalid")["thinking"]["budget_tokens"],
        10000
    );
    let mut outdated_record = record("account-a", 8192);
    outdated_record.health_generation = "generation-b".into();
    state.model_catalogs.record_records_for_account(
        SubscriptionProvider::Claude,
        "account-a",
        Some("account-a".into()),
        vec![outdated_record],
    );
    assert_eq!(
        apply(&state, "account-a", "https://fixture.invalid")["thinking"]["budget_tokens"],
        10000
    );
    let mut outdated_record = record("account-a", 8192);
    outdated_record.fetched_at -= 3600;
    state.model_catalogs.record_records_for_account(
        SubscriptionProvider::Claude,
        "account-a",
        Some("account-a".into()),
        vec![outdated_record],
    );
    assert_eq!(
        apply(&state, "account-a", "https://fixture.invalid")["thinking"]["budget_tokens"],
        10000
    );
}
