//! Deliberately small, provider-neutral model catalogue projection.

use std::collections::HashSet;

use serde_json::{Map, Value, json};

use crate::clients::ClientKind;
use crate::model_routing::ModelRouteError;

pub(super) fn project_catalog(
    catalog: &Value,
    client: ClientKind,
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
        data.push(Value::Object(project_model(raw, id, client)));
    }
    data.sort_by(|left, right| {
        left.get("id")
            .and_then(Value::as_str)
            .cmp(&right.get("id").and_then(Value::as_str))
    });
    Ok(json!({"object": "list", "data": data}))
}

fn project_model(raw: &Map<String, Value>, id: &str, client: ClientKind) -> Map<String, Value> {
    let service = service(raw, client);
    let native_id = raw
        .get("name")
        .and_then(Value::as_str)
        .filter(|name| name.starts_with("models/"))
        .or_else(|| raw.get("slug").and_then(Value::as_str))
        .or_else(|| raw.get("id").and_then(Value::as_str))
        .unwrap_or(id);
    let mut projected = Map::from_iter([
        ("id".into(), Value::String(id.to_string())),
        ("service".into(), Value::String(service.to_string())),
        ("native_id".into(), Value::String(native_id.to_string())),
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
    if projected.len() > 3 {
        projected.insert(
            "metadata_source".into(),
            Value::String(format!("provider:{service}")),
        );
        if let Some(fetched) = raw.get("created").filter(|value| value.is_number()) {
            projected.insert("metadata_fetched_at".into(), fetched.clone());
        }
    }
    projected
}

fn service(raw: &Map<String, Value>, client: ClientKind) -> &'static str {
    match raw.get("provider").and_then(Value::as_str) {
        Some("claude") => "anthropic",
        Some("codex") => "codex",
        Some("gemini") => "gemini",
        Some("qwen") => "qwen",
        _ if raw.get("owned_by").and_then(Value::as_str) == Some("z.ai") => client_service(client),
        _ => "openai",
    }
}

const fn client_service(client: ClientKind) -> &'static str {
    match client {
        ClientKind::ClaudeCode => "anthropic",
        ClientKind::Codex => "codex",
        ClientKind::GeminiCli => "gemini",
        ClientKind::QwenCode => "qwen",
        ClientKind::GrokCli | ClientKind::Opencode | ClientKind::Cursor | ClientKind::Agent => {
            "openai"
        }
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
                "max_input_tokens": 200000,
                "max_tokens": 64000,
                "modalities": {"input": ["text", "image"], "output": ["text"]},
                "pricing": {"input_per_mtok": "5", "output_per_mtok": "25", "currency": "USD"}
            },
            {
                "id": "gemini-live",
                "name": "models/gemini-live",
                "provider": "gemini",
                "inputTokenLimit": 1000000,
                "outputTokenLimit": 65536
            },
            {"id": "metadata-absent", "owned_by": "configured-provider"}
        ]});
        let projected = project_catalog(&catalog, ClientKind::ClaudeCode).unwrap();
        assert_eq!(projected["data"][0]["service"], "anthropic");
        assert_eq!(projected["data"][0]["context_window"], 200000);
        assert_eq!(projected["data"][1]["native_id"], "models/gemini-live");
        assert_eq!(projected["data"][1]["max_output_tokens"], 65536);
        assert!(projected["data"][2].get("context_window").is_none());
        assert!(projected["data"][2].get("pricing").is_none());
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
}
