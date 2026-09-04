//! Boot-time OpenAI-compatible provider configuration.

use crate::providers::{ProviderKind, ProviderUpsert, ResolvedProvider};

/// Runtime provider config supplied by CLI/env/.lenv.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct OpenAICompatibleConfig {
    pub provider_name: String,
    pub base_url: String,
    pub api_key: Option<String>,
    pub api_key_env: Option<String>,
    pub default_model: Option<String>,
    pub models: Vec<String>,
    pub supported_clients: Vec<String>,
}

impl OpenAICompatibleConfig {
    /// Convert this boot config to a resolved provider without writing it.
    #[must_use]
    pub fn resolve(&self) -> ResolvedProvider {
        let api_key = self.api_key.clone().or_else(|| {
            self.api_key_env
                .as_deref()
                .and_then(|name| std::env::var(name).ok())
                .filter(|value| !value.is_empty())
        });
        ResolvedProvider {
            name: self.provider_name.clone(),
            kind: ProviderKind::OpenAICompatible,
            base_url: self.base_url.trim_end_matches('/').to_string(),
            default_model: self.default_model.clone(),
            models: self.models.clone(),
            supported_clients: self.supported_clients.clone(),
            api_key,
            subscriber_id: None,
            intermediary_risk_acknowledged: false,
            unsupported_clients: Vec::new(),
        }
    }

    /// Convert this config into an upsert record for persistent import.
    #[must_use]
    pub fn as_upsert(&self) -> ProviderUpsert {
        ProviderUpsert {
            name: self.provider_name.clone(),
            kind: Some(ProviderKind::OpenAICompatible.as_str().to_string()),
            base_url: self.base_url.clone(),
            default_model: self.default_model.clone(),
            models: Some(self.models.clone()),
            supported_clients: Some(self.supported_clients.clone()),
            api_key: self.api_key.clone(),
            api_key_env: self.api_key_env.clone(),
            encrypted_api_key: None,
            enabled: Some(true),
            subscriber_id: None,
            acknowledge_intermediary_risk: None,
            acknowledge_unsupported_clients: None,
            if_absent: false,
        }
    }
}
