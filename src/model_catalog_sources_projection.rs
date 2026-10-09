//! Apply operator definitions only to an already authorized live inventory.
use super::ModelCatalogSources;
use crate::model_contract::{ModelRouteScope, ModelTruthDescriptor};
use crate::providers::LiveProviderModel;
use axum::extract::{Path, State};
use axum::response::{IntoResponse, Response};
use serde_json::{Value, json};

impl ModelCatalogSources {
    /// Apply provider-scoped definitions while retaining all unmodified live records.
    pub(crate) fn overlay(
        &self,
        provider: &str,
        mut live: Vec<LiveProviderModel>,
    ) -> Vec<LiveProviderModel> {
        // These fields carry Router's mapping authority, never vendor input.
        for model in &mut live {
            model.raw.remove("router_upstream_model");
            model.raw.remove("router_model_definition");
        }
        let definitions = self.definitions(provider);
        if definitions.is_empty() {
            return live;
        }
        let mut effective = live.clone();
        for mut definition in definitions {
            let id = definition
                .requested_selector
                .as_deref()
                .expect("validated id");
            let upstream = definition
                .upstream_request_model
                .as_deref()
                .expect("validated upstream");
            let Some(target) = live.iter().find(|model| model.id == upstream) else {
                continue;
            };
            let alias = id != upstream;
            // An alias must not silently replace a separately advertised live id.
            if alias && live.iter().any(|model| model.id == id) {
                continue;
            }
            definition.capability_provenance =
                json!({"source_kind":"operator_override", "router_version":crate::VERSION});
            let mut raw = if alias {
                serde_json::Map::new()
            } else {
                target.raw.clone()
            };
            if alias {
                for key in ["router_account", "router_endpoint", "router_protocols"] {
                    if let Some(value) = target.raw.get(key) {
                        raw.insert(key.into(), value.clone());
                    }
                }
            }
            raw.insert("id".into(), Value::String(id.to_string()));
            raw.insert("selector_kind".into(), json!(definition.selector_kind));
            raw.insert(
                "router_upstream_model".into(),
                Value::String(upstream.to_string()),
            );
            raw.insert(
                "router_model_definition".into(),
                serde_json::to_value(&definition).expect("truth serializes"),
            );
            let model = LiveProviderModel {
                id: id.to_string(),
                raw,
            };
            if let Some(existing) = effective.iter_mut().find(|model| model.id == id) {
                *existing = model;
            } else {
                effective.push(model);
            }
        }
        effective
    }

    pub(crate) fn annotate_subscription(
        &self,
        records: &mut [crate::model_catalog::CatalogRecord],
    ) {
        let mut providers = std::collections::HashMap::new();
        for record in records {
            record.raw.remove("router_model_definition");
            // Subscription overlays are exact-id only. They never populate the
            // cache's routable IDs or authenticate a missing account.
            let definitions = providers.entry(record.provider).or_insert_with(|| {
                self.definitions(record.provider.as_str())
                    .into_iter()
                    .map(|model| {
                        (
                            model.requested_selector.clone().expect("validated id"),
                            model,
                        )
                    })
                    .collect::<std::collections::BTreeMap<_, _>>()
            });
            if let Some(mut definition) = definitions.get(&record.canonical_id).cloned() {
                definition.capability_provenance =
                    json!({"source_kind":"operator_override", "router_version":crate::VERSION});
                record.raw.insert(
                    "router_model_definition".into(),
                    serde_json::to_value(definition).expect("truth serializes"),
                );
            }
        }
    }
}

/// Effective provider-scoped catalog for the existing admin-only management boundary.
#[derive(Clone, Debug, serde::Deserialize, serde::Serialize, schemars::JsonSchema)]
#[serde(deny_unknown_fields)]
pub struct ModelDefinitionsResponse {
    /// Canonical subscription service or configured provider name.
    pub channel: String,
    /// Current live definitions after eligible operator overlays.
    pub models: Vec<ModelTruthDescriptor>,
}

pub async fn model_definitions(
    State(state): State<crate::app_state::AppState>,
    Path(channel): Path<String>,
) -> Response {
    let channel = super::config::canonical_provider(&channel);
    let sources = state.model_catalogs.sources();
    let models = if let Some(provider) = super::config::subscription_provider(&channel) {
        let mut records = state.model_catalogs.records(provider);
        sources.annotate_subscription(&mut records);
        records
            .into_iter()
            .map(|record| {
                let mut definition = truth(&record.canonical_id, &channel, &record.raw);
                definition.route.account = Some(record.account);
                definition.route.protocols = serde_json::from_value(json!(record.protocols))
                    .expect("protocols serialize as strings");
                definition
            })
            .collect()
    } else {
        let provider = match state.provider_store.resolve(&channel) {
            Ok(Some(provider))
                if matches!(
                    provider.kind,
                    crate::providers::ProviderKind::OpenAICompatible
                        | crate::providers::ProviderKind::Lefine
                ) =>
            {
                provider
            }
            Ok(_) => {
                return crate::proxy::error_response(
                    http::StatusCode::NOT_FOUND,
                    "not_found_error",
                    "unknown model catalog channel",
                );
            }
            Err(_) => {
                return crate::proxy::error_response(
                    http::StatusCode::INTERNAL_SERVER_ERROR,
                    "api_error",
                    "provider catalog unavailable",
                );
            }
        };
        match crate::provider_proxy::live_openai_compatible_catalog(&state, &provider).await {
            Ok(models) => models
                .into_iter()
                .map(|model| truth(&model.id, &channel, &model.raw))
                .collect(),
            Err(_) => {
                return crate::proxy::error_response(
                    http::StatusCode::SERVICE_UNAVAILABLE,
                    "api_error",
                    "live model catalog unavailable",
                );
            }
        }
    };
    axum::Json(ModelDefinitionsResponse { channel, models }).into_response()
}

fn truth(id: &str, provider: &str, raw: &serde_json::Map<String, Value>) -> ModelTruthDescriptor {
    let mut definition = raw
        .get("router_model_definition")
        .cloned()
        .and_then(|value| serde_json::from_value(value).ok())
        .unwrap_or_else(|| ModelTruthDescriptor {
            requested_selector: Some(id.to_string()),
            upstream_request_model: Some(id.to_string()),
            selector_kind: crate::model_contract::ModelSelectorKind::from_catalog_value(
                raw.get("selector_kind"),
            ),
            ..ModelTruthDescriptor::default()
        });
    definition.route = ModelRouteScope {
        provider: Some(provider.to_string()),
        account: raw
            .get("router_account")
            .and_then(Value::as_str)
            .map(str::to_string),
        endpoint: raw
            .get("router_endpoint")
            .and_then(Value::as_str)
            .map(str::to_string),
        protocols: raw
            .get("router_protocols")
            .and_then(Value::as_array)
            .map(|values| {
                values
                    .iter()
                    .filter_map(Value::as_str)
                    .map(str::to_string)
                    .collect()
            })
            .unwrap_or_default(),
    };
    definition
}
