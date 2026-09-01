//! One account-filtered health/catalog view used by a complete model listing.

use std::collections::HashMap;

use crate::subscription::SubscriptionProvider;

use super::{ProviderHealthReport, ProviderHealthState};

pub struct ConfiguredCatalogSnapshot {
    pub(super) health: Vec<ProviderHealthReport>,
    pub(super) models: HashMap<SubscriptionProvider, Vec<String>>,
}

impl ConfiguredCatalogSnapshot {
    pub fn health(&self) -> &[ProviderHealthReport] {
        &self.health
    }

    pub fn models(&self, provider: SubscriptionProvider) -> Vec<String> {
        self.models.get(&provider).cloned().unwrap_or_default()
    }

    pub fn healthy_providers(&self) -> Vec<SubscriptionProvider> {
        self.health
            .iter()
            .filter(|entry| entry.state == ProviderHealthState::Healthy)
            .map(|entry| entry.provider)
            .collect()
    }
}
