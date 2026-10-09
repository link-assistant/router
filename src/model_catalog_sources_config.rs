//! Source configuration and the compact local definition grammar.
use crate::model_contract::{ModelRouteScope, ModelSelectorKind, ModelTruthDescriptor};
use std::time::Duration;

/// Three hours between source refresh attempts by default.
pub const DEFAULT_REFRESH_SECS: u64 = 10_800;

/// Operator definitions configuration. Defaults preserve live catalogs exactly.
#[derive(Clone, Debug)]
pub struct CatalogSourcesConfig {
    /// Comma-separated CLI/environment values in precedence order.
    pub sources: Vec<String>,
    /// Positive refresh interval in seconds (maximum one year).
    pub refresh_secs: u64,
    /// Explicit local definitions, applied after all sources.
    pub local_models: Vec<ModelTruthDescriptor>,
}

impl Default for CatalogSourcesConfig {
    fn default() -> Self {
        Self {
            sources: Vec::new(),
            refresh_secs: DEFAULT_REFRESH_SECS,
            local_models: Vec::new(),
        }
    }
}

impl CatalogSourcesConfig {
    /// Read source settings through the scoped environment without global mutation.
    pub fn from_env() -> Result<Self, String> {
        let sources = crate::operation_context::var("MODEL_CATALOG_SOURCES").unwrap_or_default();
        let refresh_secs = crate::operation_context::var("MODEL_CATALOG_REFRESH_SECS").map_or(
            Ok(DEFAULT_REFRESH_SECS),
            |raw| {
                raw.parse().map_err(|_| {
                    "MODEL_CATALOG_REFRESH_SECS must be a positive integer".to_string()
                })
            },
        )?;
        let config = Self {
            sources: sources
                .split(',')
                .map(str::trim)
                .filter(|source| !source.is_empty())
                .map(str::to_string)
                .collect(),
            refresh_secs,
            local_models: Vec::new(),
        };
        config.validate()?;
        Ok(config)
    }

    /// Reject unbounded polling or source counts and invalid local definitions.
    pub fn validate(&self) -> Result<(), String> {
        if self.refresh_secs == 0 || self.refresh_secs > 31_536_000 {
            return Err("MODEL_CATALOG_REFRESH_SECS must be between 1 and 31536000".into());
        }
        if self.sources.len() > 32 || self.local_models.len() > super::MAX_MODELS {
            return Err("at most 32 sources and 4096 local model entries are supported".into());
        }
        for model in &self.local_models {
            super::validate_definition(&mut model.clone())?;
        }
        Ok(())
    }

    pub(super) const fn interval(&self) -> Duration {
        Duration::from_secs(self.refresh_secs)
    }
}

/// Parse `name=provider:upstream`, preserving colons inside the upstream id.
pub fn local_model(value: &str) -> Result<ModelTruthDescriptor, String> {
    let (id, target) = value
        .split_once('=')
        .ok_or("local model must use name=provider:upstream")?;
    let (provider, upstream) = target
        .split_once(':')
        .ok_or("local model must use name=provider:upstream")?;
    let mut definition = ModelTruthDescriptor {
        requested_selector: Some(id.to_string()),
        selector_kind: if id == upstream {
            ModelSelectorKind::Concrete
        } else {
            ModelSelectorKind::OperatorAlias
        },
        route: ModelRouteScope {
            provider: Some(provider.to_string()),
            ..ModelRouteScope::default()
        },
        upstream_request_model: Some(upstream.to_string()),
        ..ModelTruthDescriptor::default()
    };
    super::validate_definition(&mut definition)?;
    Ok(definition)
}

pub(super) fn canonical_provider(provider: &str) -> String {
    match provider {
        "claude" => "anthropic",
        "chatgpt" | "openai-codex" => "codex",
        "google" => "gemini",
        "qwen-code" => "qwen",
        other => other,
    }
    .to_string()
}

pub(super) fn subscription_provider(
    provider: &str,
) -> Option<crate::subscription::SubscriptionProvider> {
    use crate::subscription::SubscriptionProvider as S;
    match provider {
        "anthropic" => Some(S::Claude),
        "codex" => Some(S::Codex),
        "gemini" => Some(S::Gemini),
        "qwen" => Some(S::Qwen),
        _ => None,
    }
}
