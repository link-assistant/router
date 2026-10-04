//! One account-filtered health/catalog view used by a complete model listing.

use std::collections::HashMap;

use serde_json::Value;

use crate::subscription::SubscriptionProvider;

use super::{ProviderHealthReport, ProviderHealthState};

pub struct ConfiguredCatalogSnapshot {
    pub(super) health: Vec<ProviderHealthReport>,
    pub(super) records: HashMap<SubscriptionProvider, Vec<crate::model_catalog::CatalogRecord>>,
}

impl ConfiguredCatalogSnapshot {
    pub fn health(&self) -> &[ProviderHealthReport] {
        &self.health
    }

    pub fn records(
        &self,
        provider: SubscriptionProvider,
    ) -> Vec<crate::model_catalog::CatalogRecord> {
        self.records.get(&provider).cloned().unwrap_or_default()
    }

    pub fn healthy_providers(&self) -> Vec<SubscriptionProvider> {
        self.health
            .iter()
            .filter(|entry| entry.state == ProviderHealthState::Healthy)
            .map(|entry| entry.provider)
            .collect()
    }
}

/// Add every configured-but-unusable subscription to `degraded_providers`.
///
/// Reported with a fixed public reason, so a client can distinguish degradation
/// without receiving a credential path or upstream response body (issue #318).
pub(super) fn merge_configured_degradation(health: &[ProviderHealthReport], catalog: &mut Value) {
    let mut degraded = catalog
        .get("degraded_providers")
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default();
    let mut starting = catalog
        .get("starting_providers")
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default();
    for entry in health
        .iter()
        .filter(|entry| entry.state == ProviderHealthState::Starting)
    {
        let name = Value::from(entry.provider.as_str());
        if !starting.contains(&name) {
            starting.push(name);
        }
    }
    let mut reasons = serde_json::Map::new();
    for entry in health.iter().filter(|entry| entry.is_degraded()) {
        let name = Value::from(entry.provider.as_str());
        if !degraded.contains(&name) {
            degraded.push(name);
        }
        // The summary, not the reason: service model catalogs answer client tokens,
        // and a credential path is not a client's business.
        if let Some(summary) = entry.summary {
            reasons.insert(entry.provider.as_str().to_string(), Value::from(summary));
        }
    }
    if let Some(object) = catalog.as_object_mut() {
        object.insert("degraded_providers".into(), Value::Array(degraded));
        object.insert("degraded_reasons".into(), Value::Object(reasons));
        object.insert("starting_providers".into(), Value::Array(starting));
    }
}
