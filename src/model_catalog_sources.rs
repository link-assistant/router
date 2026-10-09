//! Operator model definitions, separate from authenticated account inventory.

use std::collections::BTreeMap;
use std::sync::{LazyLock, OnceLock, RwLock};
use std::time::Duration;

use serde::{Deserialize, Serialize};
use serde_json::Value;
use tokio::time::Instant;

use crate::model_contract::{ModelSelectorKind, ModelTruthDescriptor};

#[path = "model_catalog_sources_config.rs"]
mod config;
pub use config::{CatalogSourcesConfig, DEFAULT_REFRESH_SECS, local_model};
#[path = "model_catalog_sources_fetch.rs"]
mod fetch;
#[path = "model_catalog_sources_projection.rs"]
mod projection;
pub use projection::ModelDefinitionsResponse;
pub(crate) use projection::model_definitions;

/// Maximum bytes read from one catalog, including files and streaming HTTP bodies.
pub const MAX_DOCUMENT_BYTES: usize = 1024 * 1024;
/// Maximum definitions in a single document.
pub const MAX_MODELS: usize = 4096;

/// Versioned source document using Router's canonical model-truth descriptors.
#[derive(Clone, Debug, Deserialize, Serialize, schemars::JsonSchema)]
#[serde(deny_unknown_fields)]
pub struct ModelCatalogDocument {
    /// Document format version. Only version 1 is supported.
    #[schemars(range(min = 1, max = 1))]
    pub version: u32,
    /// Exact provider-scoped definitions. These do not grant credential access.
    #[schemars(length(max = 4096))]
    pub models: Vec<ModelTruthDescriptor>,
}

/// JSON Schema shared by source validation and the published contract.
#[must_use]
pub fn document_schema() -> Value {
    let mut schema = serde_json::to_value(schemars::schema_for!(ModelCatalogDocument))
        .expect("catalog schema serializes");
    schema["$id"] = Value::String("link-assistant-router/model-catalog/v1".into());
    // Model truth structs also describe observations. Source documents must
    // reject unknown fields rather than silently dropping policy-like input.
    if let Some(definitions) = schema.get_mut("$defs").and_then(Value::as_object_mut) {
        for definition in definitions.values_mut() {
            if definition.get("type").and_then(Value::as_str) == Some("object") {
                definition["additionalProperties"] = Value::Bool(false);
            }
        }
        if let Some(descriptor) = definitions.get_mut("ModelTruthDescriptor") {
            let properties = &mut descriptor["properties"];
            for name in ["requested_selector", "upstream_request_model"] {
                properties[name] = serde_json::json!({"type":"string", "minLength":1});
            }
            for name in [
                "upstream_served_model",
                "capability_provenance",
                "substitution_source",
            ] {
                properties[name] = serde_json::json!({"type":"null"});
            }
            properties["selector_kind"] =
                serde_json::json!({"enum":["concrete", "operator_alias"]});
            properties["capabilities"] = serde_json::json!({"type":["object", "null"]});
            properties["allow_substitution"] = serde_json::json!({"const":false});
            let required = descriptor["required"]
                .as_array_mut()
                .expect("descriptor has required fields");
            for name in ["requested_selector", "upstream_request_model"] {
                required.push(Value::String(name.into()));
            }
        }
        if let Some(scope) = definitions.get_mut("ModelRouteScope") {
            scope["properties"]["provider"] = serde_json::json!({"type":"string", "minLength":1});
            for name in ["account", "endpoint"] {
                scope["properties"][name] = serde_json::json!({"type":"null"});
            }
            scope["properties"]["protocols"] = serde_json::json!({"type":"array", "maxItems":0});
            scope["required"]
                .as_array_mut()
                .expect("scope has required fields")
                .push(Value::String("provider".into()));
        }
    }
    schema
}

static VALIDATOR: LazyLock<jsonschema::Validator> = LazyLock::new(|| {
    jsonschema::draft202012::new(&document_schema()).expect("catalog schema is valid")
});

/// Validate an entire document before accepting any of its entries.
pub fn parse_document(bytes: &[u8]) -> Result<ModelCatalogDocument, String> {
    if bytes.len() > MAX_DOCUMENT_BYTES {
        return Err("model catalog exceeds the 1 MiB size limit".into());
    }
    let value: Value = serde_json::from_slice(bytes).map_err(|error| error.to_string())?;
    VALIDATOR
        .validate(&value)
        .map_err(|error| error.to_string())?;
    let mut document: ModelCatalogDocument =
        serde_json::from_value(value).map_err(|error| error.to_string())?;
    let mut seen = std::collections::BTreeSet::new();
    for definition in &mut document.models {
        validate_definition(definition)?;
        let key = (
            definition.route.provider.clone(),
            definition.requested_selector.clone(),
        );
        if !seen.insert(key) {
            return Err("duplicate provider/model definition in one source".into());
        }
    }
    Ok(document)
}

fn validate_definition(definition: &mut ModelTruthDescriptor) -> Result<(), String> {
    let id = definition.requested_selector.as_deref().unwrap_or_default();
    let upstream = definition
        .upstream_request_model
        .as_deref()
        .unwrap_or_default();
    let provider = definition.route.provider.as_deref().unwrap_or_default();
    if [id, upstream, provider].iter().any(|value| {
        value.trim().is_empty() || value.trim() != *value || value.chars().any(char::is_control)
    }) {
        return Err("selector, upstream model and provider must be non-empty exact strings".into());
    }
    if definition.upstream_served_model.is_some()
        || definition.allow_substitution
        || definition.substitution_source.is_some()
        || definition.route.account.is_some()
        || definition.route.endpoint.is_some()
        || !definition.route.protocols.is_empty()
    {
        return Err("catalog definitions cannot assert served identity, account, endpoint, protocols or substitution authority".into());
    }
    if !definition.capabilities.is_null() && !definition.capabilities.is_object() {
        return Err("catalog capabilities must be an object or null".into());
    }
    if !definition.capability_provenance.is_null() {
        return Err(
            "catalog provenance is assigned by Router; source provenance must be null".into(),
        );
    }
    let expected = if id == upstream {
        ModelSelectorKind::Concrete
    } else {
        ModelSelectorKind::OperatorAlias
    };
    if definition.selector_kind != expected {
        return Err(
            "selector_kind must be concrete for an exact id or operator_alias for a mapping".into(),
        );
    }
    let provider = config::canonical_provider(provider);
    if config::subscription_provider(&provider).is_some() && id != upstream {
        return Err("subscription definitions must preserve the exact live model id".into());
    }
    definition.route.provider = Some(provider);
    Ok(())
}

#[derive(Clone, Debug)]
struct SourceSnapshot {
    models: Vec<ModelTruthDescriptor>,
    failing: bool,
}

#[derive(Default)]
struct Snapshot {
    sources: Vec<SourceSnapshot>,
}

/// Instance-scoped definitions with atomic refresh and last-good retention.
#[derive(Default)]
pub struct ModelCatalogSources {
    config: OnceLock<CatalogSourcesConfig>,
    snapshot: RwLock<Snapshot>,
    // Unwinding can only leave an attempted timestamp, never a partially
    // validated definition. Preserve the public catalog cache's unwind traits.
    last_attempt: std::panic::AssertUnwindSafe<tokio::sync::Mutex<Option<Instant>>>,
}

impl ModelCatalogSources {
    /// Install configuration once before serving requests.
    pub fn configure(&self, mut config: CatalogSourcesConfig) -> Result<(), String> {
        config.validate()?;
        for definition in &mut config.local_models {
            validate_definition(definition)?;
        }
        self.config
            .set(config)
            .map_err(|_| "catalog sources already configured".into())
    }

    /// Merge sources in declaration order, then local entries, by provider and exact id.
    #[must_use]
    pub fn definitions(&self, provider: &str) -> Vec<ModelTruthDescriptor> {
        let provider = config::canonical_provider(provider);
        let snapshot = self
            .snapshot
            .read()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        let mut models = BTreeMap::new();
        for definition in snapshot
            .sources
            .iter()
            .flat_map(|source| &source.models)
            .chain(
                self.config
                    .get()
                    .into_iter()
                    .flat_map(|config| &config.local_models),
            )
        {
            if definition.route.provider.as_deref() == Some(provider.as_str()) {
                models.insert(definition.requested_selector.clone(), definition.clone());
            }
        }
        drop(snapshot);
        models.into_values().collect()
    }

    /// Fetch due sources using monotonic time, keeping each failed source's last good snapshot.
    pub async fn refresh(&self) {
        self.refresh_at(Instant::now()).await;
    }

    // Hold the refresh mutex through fetch and publication so a concurrent,
    // slower generation cannot overwrite a newer successful snapshot.
    #[allow(clippy::significant_drop_tightening)]
    pub(crate) async fn refresh_at(&self, now: Instant) {
        let Some(config) = self
            .config
            .get()
            .filter(|config| !config.sources.is_empty())
        else {
            return;
        };
        let mut last_attempt = self.last_attempt.lock().await;
        if last_attempt.is_some_and(|last| now.saturating_duration_since(last) < config.interval())
        {
            return;
        }
        *last_attempt = Some(now);
        let results =
            futures_util::future::join_all(config.sources.iter().map(|source| async move {
                tokio::time::timeout(Duration::from_secs(15), fetch::load(source))
                    .await
                    .map_err(|_| "catalog fetch exceeded 15 seconds".to_string())?
            }))
            .await;
        let mut snapshot = self
            .snapshot
            .write()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        snapshot
            .sources
            .resize_with(config.sources.len(), || SourceSnapshot {
                models: Vec::new(),
                failing: false,
            });
        for (index, result) in results.into_iter().enumerate() {
            let source = &mut snapshot.sources[index];
            match result {
                Ok(document) => {
                    source.models = document.models;
                    source.failing = false;
                    tracing::debug!(
                        source_index = index,
                        definitions = source.models.len(),
                        "model catalog source refreshed"
                    );
                }
                Err(error) => {
                    if !source.failing {
                        // URLs may contain credentials or query secrets: log only their index.
                        tracing::warn!(
                            source_index = index,
                            "model catalog source failed; retaining last good definitions: {error}"
                        );
                    }
                    source.failing = true;
                }
            }
        }
    }

    /// Load sources before readiness, then refresh until the returned task is aborted.
    pub async fn start(self: std::sync::Arc<Self>) -> Option<tokio::task::JoinHandle<()>> {
        let config = self.config.get()?;
        if config.sources.is_empty() {
            return None;
        }
        let interval = config.interval();
        self.refresh().await;
        Some(tokio::spawn(async move {
            loop {
                tokio::time::sleep(interval).await;
                self.refresh().await;
            }
        }))
    }
}

#[cfg(test)]
#[path = "model_catalog_sources_tests.rs"]
mod tests;

#[cfg(test)]
#[path = "model_catalog_sources_routing_tests.rs"]
mod routing_tests;
