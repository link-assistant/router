//! Project only live, account-owned model records into operator-visible spellings.
use crate::app_state::AppState;
use crate::model_catalog::CatalogRecord;
use crate::subscription::SubscriptionProvider;
use serde_json::Value;

pub fn project(
    state: &AppState,
    provider: SubscriptionProvider,
    records: Vec<CatalogRecord>,
) -> Vec<CatalogRecord> {
    let Some(router) = state
        .account_router
        .as_ref()
        .filter(|r| r.provider() == provider)
    else {
        return records;
    };
    records
        .into_iter()
        .flat_map(|record| {
            let Ok(policy) = router.routing_policy(&record.account) else {
                return Vec::new();
            };
            policy
                .visible_models(&record.canonical_id, router.force_model_prefix())
                .into_iter()
                .filter(|id| {
                    // Publish a spelling only when this account resolves it
                    // to the same native record; aliases can shadow records.
                    router.upstream_model(&record.account, id).as_deref()
                        == Some(record.canonical_id.as_str())
                })
                .map(|id| {
                    let mut projected = record.clone();
                    if id != record.canonical_id {
                        projected.raw.insert(
                            "_router_policy_upstream".into(),
                            Value::String(record.canonical_id.clone()),
                        );
                        projected.raw.insert(
                            "selector_kind".into(),
                            Value::String("operator_alias".into()),
                        );
                    }
                    projected.canonical_id = id;
                    projected
                })
                .collect::<Vec<_>>()
        })
        .collect()
}

/// Durable grants always refer to the vendor identity, including projected catalogs.
pub fn native_id(record: &CatalogRecord) -> &str {
    record
        .raw
        .get("_router_policy_upstream")
        .and_then(Value::as_str)
        .unwrap_or(&record.canonical_id)
}

pub fn permitted(
    policy: &crate::model_contract::ModelAccessPolicy,
    provider: SubscriptionProvider,
    native: &str,
) -> bool {
    policy.permits(native)
        || (provider == SubscriptionProvider::Gemini
            && native
                .strip_prefix("models/")
                .is_some_and(|id| policy.permits(id)))
}
