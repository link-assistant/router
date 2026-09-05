//! Lefine's persisted `OpenAI` Chat Completions provider contract.

use std::collections::HashSet;

use crate::providers::{LiveProviderModel, ProviderKind, ResolvedProvider};

pub const BASE_URL: &str = "https://lefine.pro/v1";
pub const COMPATIBLE_CLIENTS: [&str; 3] = ["grok", "opencode", "qwen"];
const MAX_CATALOG_BODY: usize = 1024 * 1024;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum CatalogFailureKind {
    CredentialRejected,
    RateLimited,
    Unavailable,
}

#[derive(Debug)]
pub struct CatalogFailure {
    kind: CatalogFailureKind,
    message: &'static str,
}

impl CatalogFailure {
    const fn new(kind: CatalogFailureKind, message: &'static str) -> Self {
        Self { kind, message }
    }

    #[must_use]
    pub const fn kind(&self) -> CatalogFailureKind {
        self.kind
    }
}

impl std::fmt::Display for CatalogFailure {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formatter.write_str(self.message)
    }
}

impl std::error::Error for CatalogFailure {}

/// Positively validate a Lefine key and return its exact live model catalog.
pub(crate) async fn fetch_catalog(
    client: &reqwest::Client,
    provider: &ResolvedProvider,
) -> Result<Vec<LiveProviderModel>, CatalogFailure> {
    if provider.kind != ProviderKind::Lefine {
        return Err(CatalogFailure::new(
            CatalogFailureKind::Unavailable,
            "provider does not use the Lefine catalog contract",
        ));
    }
    let key = provider
        .api_key
        .as_deref()
        .filter(|value| !value.is_empty())
        .ok_or_else(|| {
            CatalogFailure::new(
                CatalogFailureKind::CredentialRejected,
                "Lefine API key is unavailable",
            )
        })?;
    let response = client
        .get(catalog_url(&provider.base_url))
        .bearer_auth(key)
        .send()
        .await
        .map_err(|_| unavailable("Lefine model catalog could not be verified"))?;
    let status = response.status();
    if matches!(
        status,
        reqwest::StatusCode::UNAUTHORIZED | reqwest::StatusCode::FORBIDDEN
    ) {
        return Err(CatalogFailure::new(
            CatalogFailureKind::CredentialRejected,
            "Lefine API key was rejected",
        ));
    }
    if status == reqwest::StatusCode::TOO_MANY_REQUESTS {
        return Err(CatalogFailure::new(
            CatalogFailureKind::RateLimited,
            "Lefine model catalog was rate limited",
        ));
    }
    if !status.is_success() {
        return Err(unavailable("Lefine model catalog is unavailable"));
    }
    if response
        .content_length()
        .is_some_and(|length| length > MAX_CATALOG_BODY as u64)
    {
        return Err(unavailable(
            "Lefine model catalog exceeded the response limit",
        ));
    }
    let bytes = response
        .bytes()
        .await
        .map_err(|_| unavailable("Lefine model catalog could not be read"))?;
    if bytes.len() > MAX_CATALOG_BODY {
        return Err(unavailable(
            "Lefine model catalog exceeded the response limit",
        ));
    }
    let payload: serde_json::Value = serde_json::from_slice(&bytes)
        .map_err(|_| unavailable("Lefine model catalog response was malformed"))?;
    if let Some(error) = payload.get("error") {
        return Err(body_error(error));
    }
    let entries = payload
        .get("data")
        .and_then(serde_json::Value::as_array)
        .filter(|entries| !entries.is_empty())
        .ok_or_else(|| unavailable("Lefine model catalog contained no models"))?;
    exact_models(entries)
}

/// Operator-configured exact IDs used only while live discovery is unavailable.
pub(crate) fn configured_catalog(
    provider: &ResolvedProvider,
) -> Result<Vec<LiveProviderModel>, CatalogFailure> {
    if provider.models.is_empty() {
        return Err(unavailable(
            "Lefine live catalog is unavailable and no exact fallback models are configured",
        ));
    }
    Ok(provider
        .models
        .iter()
        .map(|id| LiveProviderModel {
            id: id.clone(),
            raw: serde_json::Map::from_iter([
                ("id".into(), serde_json::Value::String(id.clone())),
                ("object".into(), serde_json::Value::String("model".into())),
                (
                    "catalog_source".into(),
                    serde_json::Value::String("configured_fallback".into()),
                ),
            ]),
        })
        .collect())
}

fn exact_models(entries: &[serde_json::Value]) -> Result<Vec<LiveProviderModel>, CatalogFailure> {
    let mut seen = HashSet::new();
    let mut models = Vec::new();
    for entry in entries {
        let raw = entry
            .as_object()
            .cloned()
            .ok_or_else(|| unavailable("Lefine catalog contained an invalid model record"))?;
        let id = raw
            .get("id")
            .and_then(serde_json::Value::as_str)
            .filter(|id| !id.is_empty() && *id == id.trim())
            .ok_or_else(|| unavailable("Lefine catalog contained an invalid exact model id"))?;
        if seen.insert(id.to_string()) {
            models.push(LiveProviderModel {
                id: id.to_string(),
                raw,
            });
        }
    }
    Ok(models)
}

fn body_error(error: &serde_json::Value) -> CatalogFailure {
    let field = |name: &str| {
        error.get(name).map_or_else(String::new, |value| {
            value
                .as_str()
                .map_or_else(|| value.to_string(), str::to_string)
        })
    };
    let description = error
        .as_str()
        .map_or_else(
            || [field("code"), field("type"), field("message")].join(" "),
            str::to_string,
        )
        .to_ascii_lowercase();
    let kind = if description.contains("api_key")
        || description.contains("api key")
        || description.contains("auth")
        || description.split_whitespace().any(|value| value == "401")
    {
        CatalogFailureKind::CredentialRejected
    } else if description.contains("rate")
        || description.split_whitespace().any(|value| value == "429")
    {
        CatalogFailureKind::RateLimited
    } else {
        CatalogFailureKind::Unavailable
    };
    CatalogFailure::new(kind, "Lefine model catalog returned an error")
}

fn catalog_url(base_url: &str) -> String {
    let base = base_url.trim_end_matches('/');
    if base.ends_with("/v1") {
        format!("{base}/models")
    } else {
        format!("{base}/v1/models")
    }
}

const fn unavailable(message: &'static str) -> CatalogFailure {
    CatalogFailure::new(CatalogFailureKind::Unavailable, message)
}

#[cfg(test)]
#[path = "lefine_tests.rs"]
mod tests;
