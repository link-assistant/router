use std::collections::HashSet;

use axum::http::StatusCode;
use serde_json::{Map, Value, json};

const MAX_ANTHROPIC_PAGE: usize = 1_000;
const DEFAULT_ANTHROPIC_PAGE: usize = 20;

pub(super) fn project(
    path: &str,
    query: Option<&str>,
    catalog: &Value,
) -> Result<Option<Value>, NativeCatalogError> {
    let data = catalog
        .get("data")
        .and_then(Value::as_array)
        .ok_or_else(|| NativeCatalogError::internal("model catalog has no data array"))?;
    if path == "/api/services/anthropic/v1/models" {
        return anthropic(data, query).map(Some);
    }
    if matches!(
        path,
        "/api/services/openai/v1/models"
            | "/api/services/codex/v1/models"
            | "/api/services/qwen/v1/models"
    ) {
        return Ok(Some(openai(data)?));
    }
    Ok(None)
}

fn anthropic(data: &[Value], query: Option<&str>) -> Result<Value, NativeCatalogError> {
    let models = deduplicated(data, anthropic_model)?;
    let page = AnthropicPage::parse(query, &models)?;
    let visible = models[page.start..page.end].to_vec();
    let first_id = visible.first().and_then(|model| model.get("id")).cloned();
    let last_id = visible.last().and_then(|model| model.get("id")).cloned();
    Ok(json!({
        "data": visible,
        "first_id": first_id,
        "has_more": page.has_more,
        "last_id": last_id,
    }))
}

fn openai(data: &[Value]) -> Result<Value, NativeCatalogError> {
    Ok(json!({
        "object": "list",
        "data": deduplicated(data, openai_model)?,
    }))
}

fn deduplicated(
    data: &[Value],
    project: fn(&Map<String, Value>, &str) -> Map<String, Value>,
) -> Result<Vec<Value>, NativeCatalogError> {
    let mut seen = HashSet::new();
    let mut models = Vec::with_capacity(data.len());
    for value in data {
        let Some(raw) = value.as_object() else {
            continue;
        };
        let Some(id) = raw.get("id").and_then(Value::as_str) else {
            continue;
        };
        if id.is_empty() {
            continue;
        }
        if !seen.insert(id.to_string()) {
            return Err(NativeCatalogError::conflict(format!(
                "exact model id '{id}' is advertised more than once"
            )));
        }
        models.push(Value::Object(project(raw, id)));
    }
    Ok(models)
}

fn anthropic_model(raw: &Map<String, Value>, id: &str) -> Map<String, Value> {
    let mut model = Map::from_iter([
        ("id".into(), Value::String(id.to_string())),
        ("type".into(), Value::String("model".into())),
    ]);
    copy_string(raw, &mut model, "display_name");
    copy_string(raw, &mut model, "created_at");
    copy_number(raw, &mut model, "max_input_tokens");
    copy_number(raw, &mut model, "max_tokens");
    if let Some(capabilities) = raw.get("capabilities").and_then(Value::as_object) {
        model.insert("capabilities".into(), Value::Object(capabilities.clone()));
    }
    model
}

fn openai_model(raw: &Map<String, Value>, id: &str) -> Map<String, Value> {
    let mut model = Map::from_iter([
        ("id".into(), Value::String(id.to_string())),
        ("object".into(), Value::String("model".into())),
    ]);
    copy_number(raw, &mut model, "created");
    model
}

fn copy_string(source: &Map<String, Value>, target: &mut Map<String, Value>, key: &str) {
    if let Some(value) = source.get(key).filter(|value| value.is_string()) {
        target.insert(key.to_string(), value.clone());
    }
}

fn copy_number(source: &Map<String, Value>, target: &mut Map<String, Value>, key: &str) {
    if let Some(value) = source.get(key).filter(|value| value.is_number()) {
        target.insert(key.to_string(), value.clone());
    }
}

struct AnthropicPage {
    start: usize,
    end: usize,
    has_more: bool,
}

impl AnthropicPage {
    fn parse(query: Option<&str>, models: &[Value]) -> Result<Self, NativeCatalogError> {
        let mut after_id = None;
        let mut before_id = None;
        let mut limit = None;
        for (key, value) in url::form_urlencoded::parse(query.unwrap_or_default().as_bytes()) {
            match key.as_ref() {
                "after_id" => set_once(&mut after_id, value.into_owned(), "after_id")?,
                "before_id" => set_once(&mut before_id, value.into_owned(), "before_id")?,
                "limit" => set_once(&mut limit, value.into_owned(), "limit")?,
                _ => {}
            }
        }
        if after_id.is_some() && before_id.is_some() {
            return Err(NativeCatalogError::invalid(
                "after_id and before_id cannot be used together",
            ));
        }
        let limit = limit.map_or(Ok(DEFAULT_ANTHROPIC_PAGE), |limit| {
            limit
                .parse::<usize>()
                .ok()
                .filter(|limit| (1..=MAX_ANTHROPIC_PAGE).contains(limit))
                .ok_or_else(|| NativeCatalogError::invalid("limit must be between 1 and 1000"))
        })?;
        let id_at = |wanted: &str| {
            if wanted.is_empty() {
                return None;
            }
            models
                .iter()
                .position(|model| model.get("id").and_then(Value::as_str) == Some(wanted))
        };
        if let Some(before) = before_id {
            let cursor = id_at(&before).ok_or_else(|| {
                NativeCatalogError::invalid(format!("before_id cursor '{before}' was not found"))
            })?;
            let start = cursor.saturating_sub(limit);
            return Ok(Self {
                start,
                end: cursor,
                has_more: start > 0,
            });
        }
        let start = after_id.map_or(Ok(0), |after| {
            id_at(&after).map(|cursor| cursor + 1).ok_or_else(|| {
                NativeCatalogError::invalid(format!("after_id cursor '{after}' was not found"))
            })
        })?;
        let end = start.saturating_add(limit).min(models.len());
        Ok(Self {
            start,
            end,
            has_more: end < models.len(),
        })
    }
}

fn set_once(
    target: &mut Option<String>,
    value: String,
    name: &str,
) -> Result<(), NativeCatalogError> {
    if target.replace(value).is_some() {
        return Err(NativeCatalogError::invalid(format!(
            "{name} may be supplied only once"
        )));
    }
    Ok(())
}

#[derive(Debug)]
pub(super) struct NativeCatalogError {
    pub status: StatusCode,
    pub error_type: &'static str,
    pub message: String,
}

impl NativeCatalogError {
    fn invalid(message: impl Into<String>) -> Self {
        Self {
            status: StatusCode::BAD_REQUEST,
            error_type: "invalid_request_error",
            message: message.into(),
        }
    }

    fn conflict(message: impl Into<String>) -> Self {
        Self {
            status: StatusCode::CONFLICT,
            error_type: "invalid_provider_state",
            message: message.into(),
        }
    }

    fn internal(message: impl Into<String>) -> Self {
        Self {
            status: StatusCode::INTERNAL_SERVER_ERROR,
            error_type: "api_error",
            message: message.into(),
        }
    }
}

#[cfg(test)]
#[path = "model_routing_native_catalog_tests.rs"]
mod tests;
