//! Merge-safe JSON configuration for OpenCode-shaped clients and Qwen Code.

use std::fs;
use std::path::Path;

use serde_json::{Value, json};

use super::{
    ClientError, ClientKind, ClientManager, OWNERSHIP_MARKER, ROUTER_PROVIDER, ROUTER_TOKEN_ENV,
    SetupResult, atomic_write, read_or_empty, unchanged, write_if_changed,
};

impl ClientManager {
    pub(super) fn setup_json_provider(
        &self,
        client: ClientKind,
        base_url: &str,
    ) -> Result<SetupResult, ClientError> {
        let path = self.config_path(client);
        let source = read_or_empty(&path)?;
        let mut document = parse_json_object(&path, &source)?;
        let root = document
            .as_object_mut()
            .expect("parse_json_object always returns an object");
        let providers = root.entry("provider").or_insert_with(|| json!({}));
        let providers = providers.as_object_mut().ok_or_else(|| {
            ClientError::message(format!("{}.provider must be a JSON object", path.display()))
        })?;
        let managed = router_json_provider(base_url);
        if providers.get(ROUTER_PROVIDER) == Some(&managed) {
            return Ok(unchanged(path));
        }
        let previous = providers.insert(ROUTER_PROVIDER.into(), managed.clone());
        let rendered = render_json(&document)?;
        let result = write_if_changed(&path, &source, &rendered)?;
        let marker = path
            .parent()
            .expect("client config always has a parent")
            .join(OWNERSHIP_MARKER);
        if marker.exists() {
            let marker_source = read_or_empty(&marker)?;
            let mut ownership = parse_json_object(&marker, &marker_source)?;
            ownership
                .as_object_mut()
                .expect("parse_json_object always returns an object")
                .insert("managed_provider".into(), managed);
            write_json_marker(&marker, &ownership)?;
        } else {
            write_json_marker(
                &marker,
                &json!({
                    "had_previous_provider": previous.is_some(),
                    "previous_provider": previous,
                    "managed_provider": managed
                }),
            )?;
        }
        Ok(result)
    }

    pub(super) fn setup_qwen(&self, base_url: &str) -> Result<SetupResult, ClientError> {
        let path = self.config_path(ClientKind::QwenCode);
        let source = read_or_empty(&path)?;
        let mut document = parse_json_object(&path, &source)?;
        let managed = qwen_router_model(base_url);
        let marker = self.qwen_home.join(OWNERSHIP_MARKER);
        let marker_source = read_or_empty(&marker)?;
        let mut ownership = if marker_source.trim().is_empty() {
            None
        } else {
            Some(parse_json_object(&marker, &marker_source)?)
        };
        let models = qwen_models_mut(&mut document, &path)?;
        if models.contains(&managed) {
            return Ok(unchanged(path));
        }
        let previous_managed = ownership
            .as_ref()
            .and_then(|marker| marker.get("managed_model"));
        if let Some(position) =
            previous_managed.and_then(|previous| models.iter().position(|model| model == previous))
        {
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

fn router_json_provider(base_url: &str) -> Value {
    json!({
        "npm": "@ai-sdk/openai-compatible",
        "name": "Link.Assistant.Router",
        "options": {
            "baseURL": format!("{base_url}/v1"),
            "apiKey": format!("{{env:{ROUTER_TOKEN_ENV}}}")
        },
        "models": {
            "claude-sonnet-4-5-20250929": {
                "name": "Router (Claude Sonnet 4.5)"
            }
        }
    })
}

fn qwen_router_model(base_url: &str) -> Value {
    json!({
        "id": "claude-sonnet-4-5-20250929",
        "name": "Link.Assistant.Router (Claude Sonnet 4.5)",
        "baseUrl": format!("{base_url}/v1"),
        "envKey": ROUTER_TOKEN_ENV
    })
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
        (model.get("id").and_then(Value::as_str) == Some("claude-sonnet-4-5-20250929")
            && model.get("envKey").and_then(Value::as_str) == Some(ROUTER_TOKEN_ENV))
        .then(|| {
            model
                .get("baseUrl")
                .and_then(Value::as_str)
                .map(str::to_string)
        })
        .flatten()
    }))
}
