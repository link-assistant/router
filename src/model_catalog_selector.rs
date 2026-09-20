//! Evidence-backed selector semantics for exact live catalog records.

use super::{ModelCatalogCache, SubscriptionProvider};

impl ModelCatalogCache {
    /// Selector semantics proved by one healthy account's exact live record.
    ///
    /// No spelling heuristic is used. Missing, stale, or unfamiliar metadata
    /// remains `Unknown`, which served-identity validation treats as concrete.
    #[must_use]
    pub fn selector_kind_for(
        &self,
        provider: SubscriptionProvider,
        account: &str,
        model: &str,
    ) -> crate::model_contract::ModelSelectorKind {
        let status = self.status_for(provider, account);
        let records = status.routable_records();
        if let Some(record) = records.iter().find(|record| record.canonical_id == model) {
            return crate::model_contract::ModelSelectorKind::from_catalog_value(
                record.raw.get("selector_kind"),
            );
        }
        // Claude Code's documented context variant is a Router-recognized
        // client representation, not a provider-wide naming heuristic. It is
        // an operator alias only when this exact Claude account advertised the
        // exact base ID; another provider or a missing base remains unknown.
        if provider == SubscriptionProvider::Claude
            && let Some(base) = model.strip_suffix("[1m]").filter(|base| !base.is_empty())
            && records.iter().any(|record| record.canonical_id == base)
        {
            return crate::model_contract::ModelSelectorKind::OperatorAlias;
        }
        crate::model_contract::ModelSelectorKind::Unknown
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::model_catalog::CatalogRecord;

    #[test]
    fn selector_kind_requires_exact_live_catalog_metadata() {
        let cache = ModelCatalogCache::new();
        let fetched_at = chrono::Utc::now().timestamp();
        let records = [
            ("plain-auto-looking-name", serde_json::Map::new()),
            (
                "provider-selector",
                serde_json::json!({"selector_kind": "provider_dynamic_alias"})
                    .as_object()
                    .unwrap()
                    .clone(),
            ),
        ]
        .into_iter()
        .enumerate()
        .map(|(index, (id, raw))| CatalogRecord {
            provider: SubscriptionProvider::Codex,
            account: "provider-account".into(),
            canonical_id: id.into(),
            raw,
            source_order: index as u64,
            fetched_at,
            health_generation: "generation".into(),
            protocols: super::super::parse::provider_protocols(SubscriptionProvider::Codex),
        })
        .collect();
        cache.record_records_for_account(
            SubscriptionProvider::Codex,
            "router-account",
            Some("provider-account".into()),
            records,
        );

        assert_eq!(
            cache.selector_kind_for(
                SubscriptionProvider::Codex,
                "router-account",
                "plain-auto-looking-name"
            ),
            crate::model_contract::ModelSelectorKind::Unknown
        );
        assert_eq!(
            cache.selector_kind_for(
                SubscriptionProvider::Codex,
                "router-account",
                "provider-selector"
            ),
            crate::model_contract::ModelSelectorKind::ProviderDynamicAlias
        );

        let claude_records = std::iter::once(CatalogRecord {
            provider: SubscriptionProvider::Claude,
            account: "claude-account".into(),
            canonical_id: "claude-live".into(),
            raw: serde_json::Map::new(),
            source_order: 0,
            fetched_at,
            health_generation: "generation".into(),
            protocols: super::super::parse::provider_protocols(SubscriptionProvider::Claude),
        })
        .collect();
        cache.record_records_for_account(
            SubscriptionProvider::Claude,
            "claude-router-account",
            Some("claude-account".into()),
            claude_records,
        );
        assert_eq!(
            cache.selector_kind_for(
                SubscriptionProvider::Claude,
                "claude-router-account",
                "claude-live[1m]"
            ),
            crate::model_contract::ModelSelectorKind::OperatorAlias
        );
        assert_eq!(
            cache.selector_kind_for(
                SubscriptionProvider::Claude,
                "claude-router-account",
                "missing[1m]"
            ),
            crate::model_contract::ModelSelectorKind::Unknown
        );
    }
}
