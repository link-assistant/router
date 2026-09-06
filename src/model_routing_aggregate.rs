//! Deliberately small, provider-neutral model catalogue projection.

use std::collections::HashSet;

use serde_json::{Map, Value, json};

use crate::clients::ClientKind;
use crate::model_routing::ModelRouteError;

pub(super) fn project_catalog(
    catalog: &Value,
    _client: ClientKind,
) -> Result<Value, ModelRouteError> {
    let entries = catalog
        .get("data")
        .and_then(Value::as_array)
        .ok_or_else(|| ModelRouteError::NotFound("model catalog has no data array".into()))?;
    let mut seen = HashSet::new();
    let mut data = Vec::with_capacity(entries.len());
    for entry in entries {
        let Some(raw) = entry.as_object() else {
            continue;
        };
        let Some(id) = raw.get("id").and_then(Value::as_str) else {
            continue;
        };
        if !seen.insert(id.to_string()) {
            return Err(ModelRouteError::Conflict(format!(
                "exact model id collision across healthy providers: {id}"
            )));
        }
        data.push(Value::Object(project_model(raw, id)));
    }
    data.sort_by(|left, right| {
        left.get("id")
            .and_then(Value::as_str)
            .cmp(&right.get("id").and_then(Value::as_str))
    });
    Ok(json!({"object": "list", "data": data}))
}

fn project_model(raw: &Map<String, Value>, id: &str) -> Map<String, Value> {
    let service = service(raw);
    let owner = raw
        .get("owned_by")
        .and_then(Value::as_str)
        .filter(|owner| !owner.is_empty())
        .unwrap_or(service);
    let mut projected = Map::from_iter([
        ("id".into(), Value::String(id.to_string())),
        ("service".into(), Value::String(service.to_string())),
        ("owned_by".into(), Value::String(owner.to_string())),
    ]);

    copy_first_number(
        raw,
        &mut projected,
        "context_window",
        &[
            "context_window",
            "max_input_tokens",
            "inputTokenLimit",
            "input_token_limit",
            "context_length",
        ],
    );
    copy_first_number(
        raw,
        &mut projected,
        "max_output_tokens",
        &[
            "max_output_tokens",
            "max_tokens",
            "outputTokenLimit",
            "output_token_limit",
        ],
    );
    if let Some(modalities) = normalized_modalities(raw) {
        projected.insert("modalities".into(), modalities);
    }
    if let Some(pricing) = normalized_pricing(raw) {
        projected.insert("pricing".into(), pricing);
    }
    if let Some(value) = ["deprecation_date", "deprecationDate"]
        .into_iter()
        .find_map(|key| raw.get(key))
        .filter(|value| value.is_string() || value.is_null())
    {
        projected.insert("deprecation_date".into(), value.clone());
    }
    if let Some(value) = raw
        .get("default_reasoning_level")
        .filter(|value| value.is_string())
    {
        projected.insert("default_reasoning_level".into(), value.clone());
    }
    if let Some(levels) = normalized_reasoning_levels(raw) {
        projected.insert("supported_reasoning_levels".into(), levels);
    }
    if projected.len() > 3 {
        projected.insert(
            "metadata_source".into(),
            Value::String(format!("provider:{owner}")),
        );
        if let Some(fetched) = raw
            .get("router_fetched_at")
            .filter(|value| value.is_number())
        {
            projected.insert("metadata_fetched_at".into(), fetched.clone());
        }
        if let Some(created) = raw.get("created").filter(|value| value.is_number()) {
            projected.insert("provider_created_at".into(), created.clone());
        }
    }
    projected
}

fn normalized_reasoning_levels(raw: &Map<String, Value>) -> Option<Value> {
    let levels = raw.get("supported_reasoning_levels")?.as_array()?;
    let normalized = levels
        .iter()
        .filter_map(Value::as_object)
        .filter_map(|level| {
            let effort = level.get("effort")?.as_str()?;
            let mut value = Map::from_iter([("effort".into(), Value::String(effort.to_string()))]);
            if let Some(description) = level.get("description").and_then(Value::as_str) {
                value.insert("description".into(), Value::String(description.to_string()));
            }
            Some(Value::Object(value))
        })
        .collect::<Vec<_>>();
    (!normalized.is_empty()).then_some(Value::Array(normalized))
}

fn service(raw: &Map<String, Value>) -> &str {
    match raw.get("provider").and_then(Value::as_str) {
        Some("claude") => "anthropic",
        Some("codex") => "codex",
        Some("gemini") => "gemini",
        Some("qwen") => "qwen",
        _ => raw
            .get("owned_by")
            .and_then(Value::as_str)
            .filter(|owner| !owner.is_empty())
            .unwrap_or("openai"),
    }
}

fn copy_first_number(
    raw: &Map<String, Value>,
    target: &mut Map<String, Value>,
    target_key: &str,
    source_keys: &[&str],
) {
    if let Some(value) = source_keys
        .iter()
        .find_map(|key| raw.get(*key))
        .filter(|value| value.is_number())
    {
        target.insert(target_key.to_string(), value.clone());
    }
}

fn normalized_modalities(raw: &Map<String, Value>) -> Option<Value> {
    if let Some(modalities) = raw.get("modalities").and_then(Value::as_object) {
        let mut normalized = Map::new();
        for key in ["input", "output"] {
            if let Some(values) = string_array(modalities.get(key)) {
                normalized.insert(key.into(), values);
            }
        }
        if !normalized.is_empty() {
            return Some(Value::Object(normalized));
        }
    }
    let mut normalized = Map::new();
    for (target, sources) in [
        ("input", ["input_modalities", "supported_input_modalities"]),
        (
            "output",
            ["output_modalities", "supported_output_modalities"],
        ),
    ] {
        if let Some(values) = sources
            .into_iter()
            .find_map(|source| string_array(raw.get(source)))
        {
            normalized.insert(target.into(), values);
        }
    }
    (!normalized.is_empty()).then_some(Value::Object(normalized))
}

fn string_array(value: Option<&Value>) -> Option<Value> {
    let values = value?.as_array()?;
    values
        .iter()
        .all(Value::is_string)
        .then(|| Value::Array(values.clone()))
}

fn normalized_pricing(raw: &Map<String, Value>) -> Option<Value> {
    let source = raw.get("pricing").and_then(Value::as_object).unwrap_or(raw);
    let mut pricing = Map::new();
    for key in ["input_per_mtok", "output_per_mtok", "currency"] {
        if let Some(value) = source
            .get(key)
            .filter(|value| value.is_string() || value.is_number())
        {
            pricing.insert(key.into(), value.clone());
        }
    }
    (!pricing.is_empty()).then_some(Value::Object(pricing))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn exact_ids_and_provider_metadata_are_normalized_without_guessing() {
        let catalog = json!({"data": [
            {
                "id": "claude-live",
                "provider": "claude",
                "max_input_tokens": 200_000,
                "max_tokens": 64000,
                "modalities": {"input": ["text", "image"], "output": ["text"]},
                "pricing": {"input_per_mtok": "5", "output_per_mtok": "25", "currency": "USD"}
            },
            {
                "id": "models/gemini-live",
                "name": "models/gemini-live",
                "provider": "gemini",
                "owned_by": "google",
                "created": 1,
                "router_fetched_at": 2_000_000_000,
                "inputTokenLimit": 1_000_000,
                "outputTokenLimit": 65536
            },
            {"id": "metadata-absent", "owned_by": "configured-provider"},
            {"id": "z-ai-live", "owned_by": "z.ai", "max_tokens": 4096},
            {"id": "lefine-live", "owned_by": "lefine", "max_tokens": 8192}
        ]});
        let projected = project_catalog(&catalog, ClientKind::ClaudeCode).unwrap();
        let entries = projected["data"].as_array().unwrap();
        let claude = entries
            .iter()
            .find(|entry| entry["id"] == "claude-live")
            .unwrap();
        let gemini = entries
            .iter()
            .find(|entry| entry["id"] == "models/gemini-live")
            .unwrap();
        let absent = entries
            .iter()
            .find(|entry| entry["id"] == "metadata-absent")
            .unwrap();
        assert_eq!(claude["service"], "anthropic");
        assert_eq!(claude["owned_by"], "anthropic");
        assert_eq!(claude["context_window"], 200_000);
        assert!(gemini.get("native_id").is_none());
        assert_eq!(gemini["owned_by"], "google");
        assert_eq!(gemini["max_output_tokens"], 65536);
        assert_eq!(gemini["provider_created_at"], 1);
        assert_eq!(gemini["metadata_fetched_at"], 2_000_000_000_i64);
        assert_ne!(gemini["metadata_fetched_at"], gemini["provider_created_at"]);
        assert!(absent.get("context_window").is_none());
        assert!(absent.get("pricing").is_none());
        let z_ai = entries
            .iter()
            .find(|entry| entry["id"] == "z-ai-live")
            .unwrap();
        let lefine = entries
            .iter()
            .find(|entry| entry["id"] == "lefine-live")
            .unwrap();
        assert_eq!(z_ai["owned_by"], "z.ai");
        assert_eq!(z_ai["service"], "z.ai");
        assert_eq!(z_ai["metadata_source"], "provider:z.ai");
        assert_eq!(lefine["owned_by"], "lefine");
        assert_eq!(lefine["service"], "lefine");
        assert_eq!(lefine["metadata_source"], "provider:lefine");
    }

    #[test]
    fn provider_ownership_never_changes_with_the_requesting_client() {
        let catalog = json!({"data": [
            {"id": "z-ai-live", "owned_by": "z.ai"},
            {"id": "lefine-live", "owned_by": "lefine"}
        ]});
        for client in [
            ClientKind::ClaudeCode,
            ClientKind::Codex,
            ClientKind::GeminiCli,
            ClientKind::QwenCode,
            ClientKind::GrokCli,
            ClientKind::Opencode,
            ClientKind::Cursor,
            ClientKind::Agent,
        ] {
            let projected = project_catalog(&catalog, client).unwrap();
            let entries = projected["data"].as_array().unwrap();
            assert_eq!(entries[0]["service"], "lefine", "{client:?}");
            assert_eq!(entries[1]["service"], "z.ai", "{client:?}");
        }
    }

    #[test]
    fn duplicate_exact_ids_fail_instead_of_choosing_an_owner() {
        let catalog = json!({"data": [
            {"id": "same", "provider": "claude"},
            {"id": "same", "provider": "codex"}
        ]});
        assert!(matches!(
            project_catalog(&catalog, ClientKind::ClaudeCode),
            Err(ModelRouteError::Conflict(_))
        ));
    }

    #[test]
    fn exact_gemini_id_survives_discovery_projection_and_code_assist_envelope() {
        let catalogs = crate::model_catalog::ModelCatalogCache::new();
        catalogs.record_success(
            crate::subscription::SubscriptionProvider::Gemini,
            vec!["models/gemini-live-exact".into()],
        );

        let discovered = crate::model_routing::model_catalog(
            &[crate::subscription::SubscriptionProvider::Gemini],
            &catalogs,
        );
        let projected = project_catalog(&discovered, ClientKind::GeminiCli).unwrap();
        let id = projected["data"][0]["id"].as_str().unwrap();
        assert_eq!(id, "models/gemini-live-exact");

        let envelope = crate::gemini::code_assist_envelope(id, &json!({"contents": []}));
        assert_eq!(envelope["model"], "gemini-live-exact");
    }
}
