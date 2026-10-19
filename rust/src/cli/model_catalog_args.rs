//! Operator catalog sources and exact local definitions.
use crate::model_catalog_sources::{CatalogSourcesConfig, DEFAULT_REFRESH_SECS, local_model};

/// Model definitions configuration, independent of credential grants.
#[derive(clap::Args, Debug, Clone)]
pub struct ModelCatalogArgs {
    /// JSON files or HTTP(S) URLs in precedence order; later sources win.
    #[arg(
        long = "model-catalog-sources",
        env = "MODEL_CATALOG_SOURCES",
        value_delimiter = ',',
        global = true,
        hide_env_values = true
    )]
    pub sources: Vec<String>,
    /// Seconds between catalog refresh attempts (default: three hours).
    #[arg(long = "model-catalog-refresh-secs", env = "MODEL_CATALOG_REFRESH_SECS", default_value_t = DEFAULT_REFRESH_SECS, global = true)]
    pub refresh_secs: u64,
    /// Highest-precedence local definition: name=provider:upstream; repeatable.
    #[arg(long = "local-model", global = true, value_parser = local_model)]
    pub local_models: Vec<crate::model_contract::ModelTruthDescriptor>,
}

impl Default for ModelCatalogArgs {
    fn default() -> Self {
        Self {
            sources: Vec::new(),
            refresh_secs: DEFAULT_REFRESH_SECS,
            local_models: Vec::new(),
        }
    }
}

impl ModelCatalogArgs {
    /// Validate source limits and resolve explicit CLI/environment configuration.
    pub fn config(&self) -> Result<CatalogSourcesConfig, String> {
        let config = CatalogSourcesConfig {
            sources: self
                .sources
                .iter()
                .map(|source| source.trim())
                .filter(|source| !source.is_empty())
                .map(str::to_string)
                .collect(),
            refresh_secs: self.refresh_secs,
            local_models: self.local_models.clone(),
        };
        config.validate()?;
        Ok(config)
    }
}
