//! Merge-safe JSON configuration for OpenCode-shaped clients and Qwen Code.

use std::fs;
use std::path::Path;

use serde_json::{Value, json};

use super::{
    ClientError, ClientKind, ClientManager, OWNERSHIP_MARKER, ROUTER_PROVIDER, ROUTER_TOKEN_ENV,
    RouterModel, SetupResult, atomic_write, read_or_empty, unchanged, write_if_changed,
};

impl ClientManager {
    pub(super) fn setup_json_provider(
        &self,
        client: ClientKind,
        base_url: &str,
        models: &[RouterModel],
    ) -> Result<SetupResult, ClientError> {
        let path = self.config_path(client);
        let source = read_or_empty(&path)?;
        let mut document = parse_json_object(&path, &source)?;
        let marker = path
            .parent()
            .expect("client config always has a parent")
            .join(OWNERSHIP_MARKER);
        let marker_source = read_or_empty(&marker)?;
        let mut ownership = if marker_source.trim().is_empty() {
            None
        } else {
            Some(parse_json_object(&marker, &marker_source)?)
        };
        let previous_managed_ids = ownership
            .as_ref()
            .and_then(|marker| marker.get("managed_model_ids"))
            .and_then(Value::as_array)
            .map(|ids| ids.iter().filter_map(Value::as_str).collect::<Vec<_>>())
            .unwrap_or_default();
        let root = document
            .as_object_mut()
            .expect("parse_json_object always returns an object");
        let providers = root.entry("provider").or_insert_with(|| json!({}));
        let providers = providers.as_object_mut().ok_or_else(|| {
            ClientError::message(format!("{}.provider must be a JSON object", path.display()))
        })?;
        let previous = providers.get(ROUTER_PROVIDER).cloned();
        let managed =
            router_json_provider(base_url, models, previous.as_ref(), &previous_managed_ids)?;
        if providers.get(ROUTER_PROVIDER) == Some(&managed) {
            return Ok(unchanged(path));
        }
        providers.insert(ROUTER_PROVIDER.into(), managed.clone());
        let rendered = render_json(&document)?;
        let result = write_if_changed(&path, &source, &rendered)?;
        let managed_model_ids = models
            .iter()
            .map(|model| Value::String(model.id.clone()))
            .collect::<Vec<_>>();
        if let Some(ownership) = ownership.as_mut() {
            let ownership = ownership
                .as_object_mut()
                .expect("parse_json_object always returns an object");
            ownership.insert("managed_provider".into(), managed);
            ownership.insert("managed_model_ids".into(), Value::Array(managed_model_ids));
            write_json_marker(&marker, &Value::Object(ownership.clone()))?;
        } else {
            write_json_marker(
                &marker,
                &json!({
                    "had_previous_provider": previous.is_some(),
                    "previous_provider": previous,
                    "managed_provider": managed,
                    "managed_model_ids": managed_model_ids
                }),
            )?;
        }
        Ok(result)
    }

    pub(super) fn setup_qwen(
        &self,
        base_url: &str,
        catalog: &[RouterModel],
    ) -> Result<SetupResult, ClientError> {
        let path = self.config_path(ClientKind::QwenCode);
        let source = read_or_empty(&path)?;
        let mut document = parse_json_object(&path, &source)?;
        let marker = self.qwen_home.join(OWNERSHIP_MARKER);
        let marker_source = read_or_empty(&marker)?;
        let mut ownership = if marker_source.trim().is_empty() {
            None
        } else {
            Some(parse_json_object(&marker, &marker_source)?)
        };
        let models = qwen_models_mut(&mut document, &path)?;
        let position = models.iter().position(qwen_model_is_managed).or_else(|| {
            ownership
                .as_ref()
                .and_then(|marker| marker.get("managed_model"))
                .and_then(|previous| models.iter().position(|model| model == previous))
        });
        let selected_id = position
            .and_then(|position| models[position].get("id").and_then(Value::as_str))
            .filter(|id| catalog.iter().any(|model| model.id == *id))
            .map(str::to_string)
            .or_else(|| catalog.first().map(|model| model.id.clone()))
            .ok_or_else(|| {
                ClientError::message("router catalog contains no models from healthy subscriptions")
            })?;
        let managed = qwen_router_model(base_url, &selected_id);
        if models.contains(&managed) {
            return Ok(unchanged(path));
        }
        if let Some(position) = position {
            models[position] = managed.clone();
        } else {
            models.push(managed.clone());
        }
        let result = write_if_changed(&path, &source, &render_json(&document)?)?;
        if let Some(ownership) = ownership.as_mut() {
            ownership
                .as_object_mut()
                .expect("parse_json_object always returns an object")
                .insert("managed_model".into(), managed);
            write_json_marker(&marker, ownership)?;
        } else {
            write_json_marker(&marker, &json!({"managed_model": managed}))?;
        }
        Ok(result)
    }

    pub(super) fn remove_json_provider(
        &self,
        client: ClientKind,
    ) -> Result<SetupResult, ClientError> {
        let path = self.config_path(client);
        let source = read_or_empty(&path)?;
        if source.trim().is_empty() {
            return Ok(unchanged(path));
        }
        let marker_path = path
            .parent()
            .expect("client config always has a parent")
            .join(OWNERSHIP_MARKER);
        let marker_source = read_or_empty(&marker_path)?;
        if marker_source.trim().is_empty() {
            return Ok(unchanged(path));
        }
        let marker: Value = serde_json::from_str(&marker_source)?;
        let managed = marker.get("managed_provider").ok_or_else(|| {
            ClientError::message(format!(
                "invalid ownership marker {}",
                marker_path.display()
            ))
        })?;
        let mut document = parse_json_object(&path, &source)?;
        let providers = document.get_mut("provider").and_then(Value::as_object_mut);
        let Some(providers) = providers else {
            fs::remove_file(marker_path)?;
            return Ok(unchanged(path));
        };
        if providers.get(ROUTER_PROVIDER) != Some(managed) {
            fs::remove_file(marker_path)?;
            return Ok(unchanged(path));
        }
        if marker
            .get("had_previous_provider")
            .and_then(Value::as_bool)
            .unwrap_or(false)
        {
            let previous = marker.get("previous_provider").cloned().ok_or_else(|| {
                ClientError::message(format!(
                    "invalid ownership marker {}",
                    marker_path.display()
                ))
            })?;
            providers.insert(ROUTER_PROVIDER.into(), previous);
        } else {
            providers.remove(ROUTER_PROVIDER);
        }
        let result = write_if_changed(&path, &source, &render_json(&document)?)?;
        fs::remove_file(marker_path)?;
        Ok(result)
    }

    pub(super) fn remove_qwen(&self) -> Result<SetupResult, ClientError> {
        let path = self.config_path(ClientKind::QwenCode);
        let source = read_or_empty(&path)?;
        if source.trim().is_empty() {
            return Ok(unchanged(path));
        }
        let marker_path = self.qwen_home.join(OWNERSHIP_MARKER);
        let marker_source = read_or_empty(&marker_path)?;
        if marker_source.trim().is_empty() {
            return Ok(unchanged(path));
        }
        let marker: Value = serde_json::from_str(&marker_source)?;
        let managed = marker.get("managed_model").cloned().ok_or_else(|| {
            ClientError::message(format!(
                "invalid ownership marker {}",
                marker_path.display()
            ))
        })?;
        let mut document = parse_json_object(&path, &source)?;
        let models = qwen_models_mut(&mut document, &path)?;
        let before = models.len();
        models.retain(|model| model != &managed);
        if models.len() == before {
            fs::remove_file(marker_path)?;
            return Ok(unchanged(path));
        }
        let result = write_if_changed(&path, &source, &render_json(&document)?)?;
        fs::remove_file(marker_path)?;
        Ok(result)
    }
}

fn parse_json_object(path: &Path, source: &str) -> Result<Value, ClientError> {
    let document = if source.trim().is_empty() {
        json!({})
    } else {
        serde_json::from_str(source).map_err(|error| {
            ClientError::message(format!("invalid JSON in {}: {error}", path.display()))
        })?
    };
    if !document.is_object() {
        return Err(ClientError::message(format!(
            "{} must contain a JSON object",
            path.display()
        )));
    }
    Ok(document)
}

fn render_json(document: &Value) -> Result<String, ClientError> {
    Ok(format!("{}\n", serde_json::to_string_pretty(document)?))
}

fn router_json_provider(
    base_url: &str,
    catalog: &[RouterModel],
    existing: Option<&Value>,
    previous_managed_ids: &[&str],
) -> Result<Value, ClientError> {
    if catalog.is_empty() {
        return Err(ClientError::message(
            "router catalog contains no models from healthy subscriptions",
        ));
    }
    let mut provider = existing.cloned().unwrap_or_else(|| json!({}));
    let provider = provider
        .as_object_mut()
        .ok_or_else(|| ClientError::message("provider.link-assistant must be a JSON object"))?;
    provider.insert("npm".into(), json!("@ai-sdk/openai-compatible"));
    provider.insert("name".into(), json!("Link.Assistant.Router"));
    provider.insert(
        "options".into(),
        json!({
            "baseURL": format!("{base_url}/v1"),
            "apiKey": format!("{{env:{ROUTER_TOKEN_ENV}}}")
        }),
    );
    let configured_models = provider.entry("models").or_insert_with(|| json!({}));
    let configured_models = configured_models.as_object_mut().ok_or_else(|| {
        ClientError::message("provider.link-assistant.models must be a JSON object")
    })?;
    for previous_id in previous_managed_ids {
        if !catalog.iter().any(|model| model.id == *previous_id) {
            configured_models.remove(*previous_id);
        }
    }
    for model in catalog {
        configured_models
            .entry(model.id.clone())
            .or_insert_with(|| json!({"name": format!("Router ({})", model.id)}));
    }
    Ok(Value::Object(provider.clone()))
}

fn qwen_router_model(base_url: &str, model: &str) -> Value {
    json!({
        "id": model,
        "name": "Link.Assistant.Router",
        "baseUrl": format!("{base_url}/v1"),
        "envKey": ROUTER_TOKEN_ENV
    })
}

fn qwen_model_is_managed(model: &Value) -> bool {
    model.get("envKey").and_then(Value::as_str) == Some(ROUTER_TOKEN_ENV)
        && model
            .get("name")
            .and_then(Value::as_str)
            .is_some_and(|name| name.starts_with("Link.Assistant.Router"))
}

fn qwen_models_mut<'a>(
    document: &'a mut Value,
    path: &Path,
) -> Result<&'a mut Vec<Value>, ClientError> {
    let root = document
        .as_object_mut()
        .expect("parse_json_object always returns an object");
    let providers = root.entry("modelProviders").or_insert_with(|| json!({}));
    let providers = providers.as_object_mut().ok_or_else(|| {
        ClientError::message(format!(
            "{}.modelProviders must be a JSON object",
            path.display()
        ))
    })?;
    let openai = providers.entry("openai").or_insert_with(|| json!([]));
    if openai.is_array() {
        return Ok(openai
            .as_array_mut()
            .expect("array value checked immediately above"));
    }
    openai
        .as_object_mut()
        .and_then(|provider| provider.get_mut("models"))
        .and_then(Value::as_array_mut)
        .ok_or_else(|| {
            ClientError::message(format!(
                "{}.modelProviders.openai must be an array (or a legacy object with a models array)",
                path.display()
            ))
        })
}

fn write_json_marker(path: &Path, marker: &Value) -> Result<(), ClientError> {
    let parent = path
        .parent()
        .ok_or_else(|| ClientError::message("missing marker parent"))?;
    fs::create_dir_all(parent)?;
    atomic_write(path, render_json(marker)?.as_bytes())
}

pub(super) fn read_json_provider_base_url(path: &Path) -> Result<Option<String>, ClientError> {
    let source = read_or_empty(path)?;
    if source.trim().is_empty() {
        return Ok(None);
    }
    let document = parse_json_object(path, &source)?;
    let provider = document
        .get("provider")
        .and_then(|providers| providers.get(ROUTER_PROVIDER));
    let Some(provider) = provider else {
        return Ok(None);
    };
    let configured = provider.get("npm").and_then(Value::as_str)
        == Some("@ai-sdk/openai-compatible")
        && provider
            .get("options")
            .and_then(|options| options.get("apiKey"))
            .and_then(Value::as_str)
            == Some("{env:LINK_ASSISTANT_TOKEN}");
    Ok(configured
        .then(|| {
            provider
                .get("options")
                .and_then(|options| options.get("baseURL"))
                .and_then(Value::as_str)
                .map(str::to_string)
        })
        .flatten())
}

pub(super) fn read_qwen_base_url(path: &Path) -> Result<Option<String>, ClientError> {
    let source = read_or_empty(path)?;
    if source.trim().is_empty() {
        return Ok(None);
    }
    let mut document = parse_json_object(path, &source)?;
    let models = qwen_models_mut(&mut document, path)?;
    Ok(models.iter().find_map(|model| {
        qwen_model_is_managed(model)
            .then(|| {
                model
                    .get("baseUrl")
                    .and_then(Value::as_str)
                    .map(str::to_string)
            })
            .flatten()
    }))
}
