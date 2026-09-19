//! Machine-readable model-contract diagnostics.

use std::process::ExitCode;

use serde_json::{Value, json};

use crate::cli::{AuthTarget, ModelOp};
use crate::clients::ClientKind;
use crate::model_contract::{ModelRouteScope, ModelSelectorKind, ModelTruthDescriptor};

type AnyError = Box<dyn std::error::Error + Send + Sync>;

/// Run one model diagnostic without constructing server-only configuration.
pub async fn run(operation: &ModelOp) -> ExitCode {
    match run_inner(operation).await {
        Ok(found) => {
            if found {
                ExitCode::SUCCESS
            } else {
                ExitCode::from(1)
            }
        }
        Err(error) => {
            eprintln!("error: {error}");
            ExitCode::from(1)
        }
    }
}

async fn run_inner(operation: &ModelOp) -> Result<bool, AnyError> {
    match operation {
        ModelOp::Explain { id, client, target } => explain(id, *client, target).await,
    }
}

async fn explain(id: &str, client: ClientKind, target: &AuthTarget) -> Result<bool, AnyError> {
    if id.is_empty() {
        return Err("model selector must not be empty".into());
    }
    let server = resolve_target(target).await?;
    let token = server.token.as_deref().ok_or(
        "the selected router has no client token; select one with `router server use --token ...`",
    )?;
    let url = format!("{}/api/models", server.base_url.trim_end_matches('/'));
    let request = server
        .inference_client()?
        .get(&url)
        .header("x-link-assistant-model-diagnostics", "1")
        .header("x-link-assistant-client", client.canonical_name());
    let request = match client {
        ClientKind::ClaudeCode => request.header("x-api-key", token),
        ClientKind::GeminiCli => request.header("x-goog-api-key", token),
        _ => request.bearer_auth(token),
    };
    let response = request.send().await?;
    let status = response.status();
    let text = response.text().await.unwrap_or_default();
    if !status.is_success() {
        return Err(format!("router model catalog failed at {url} ({status}): {text}").into());
    }
    let catalog: Value = serde_json::from_str(&text)?;
    let mut matches = catalog
        .get("data")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter(|entry| entry.get("id").and_then(Value::as_str) == Some(id))
        .cloned()
        .collect::<Vec<_>>();
    matches.extend(
        catalog
            .get("catalog_conflict_candidates")
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
            .filter(|entry| entry.get("id").and_then(Value::as_str) == Some(id))
            .cloned(),
    );
    let catalog_conflicts = catalog
        .get("catalog_conflicts")
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default();
    let conflicted = catalog_conflicts
        .iter()
        .any(|candidate| candidate.as_str() == Some(id));
    let found = matches.len() == 1 && !conflicted;
    let entry = found.then(|| &matches[0]);
    let scope = entry
        .and_then(|value| value.pointer("/capability_provenance/scope"))
        .cloned()
        .unwrap_or(Value::Null);
    let (selector_kind, descriptor_selector_kind) = selector_kind(entry);
    let routing_state = if conflicted {
        "conflict"
    } else {
        match matches.len() {
            0 => "unknown",
            1 => "unique",
            _ => "conflict",
        }
    };
    let provenance = entry
        .and_then(|value| value.get("capability_provenance"))
        .cloned()
        .unwrap_or(Value::Null);
    let route_scope = provenance.get("scope").cloned().unwrap_or(Value::Null);
    let descriptor = ModelTruthDescriptor {
        requested_selector: Some(id.to_string()),
        selector_kind: descriptor_selector_kind,
        route: ModelRouteScope {
            provider: route_scope
                .get("provider")
                .and_then(Value::as_str)
                .map(str::to_string),
            account: route_scope
                .get("account")
                .and_then(Value::as_str)
                .map(str::to_string),
            endpoint: route_scope
                .get("endpoint")
                .and_then(Value::as_str)
                .map(str::to_string),
            protocols: route_scope
                .get("protocols")
                .and_then(Value::as_array)
                .into_iter()
                .flatten()
                .filter_map(Value::as_str)
                .map(str::to_string)
                .collect(),
        },
        upstream_request_model: found.then(|| id.to_string()),
        upstream_served_model: None,
        capabilities: effective_capabilities(entry),
        capability_provenance: provenance.clone(),
        allow_substitution: catalog
            .pointer("/model_policy/allow_substitution")
            .and_then(Value::as_bool)
            .unwrap_or(false),
        substitution_source: catalog
            .pointer("/model_policy/substitution_source")
            .and_then(Value::as_str)
            .map(str::to_string),
    };
    let diagnostic = json!({
        "contract_version": 1,
        "model_descriptor": descriptor,
        "requested_selector": id,
        "selector_kind": selector_kind,
        "served_identity": null,
        "client_representation": {
            "client": client.canonical_name(),
            "advertisements": matches,
        },
        "route_scope": scope,
        "capability_provenance": provenance,
        "model_policy": catalog.get("model_policy").cloned().unwrap_or_else(|| json!({})),
        "health": {
            "healthy_providers": catalog.get("healthy_providers").cloned().unwrap_or_else(|| json!([])),
            "degraded_providers": catalog.get("degraded_providers").cloned().unwrap_or_else(|| json!([])),
            "degraded_reasons": catalog.get("degraded_reasons").cloned().unwrap_or_else(|| json!({})),
        },
        "routing": {
            "state": routing_state,
            "candidate_count": matches.len(),
            "catalog_conflicts": catalog_conflicts,
        },
    });
    println!("{}", serde_json::to_string_pretty(&diagnostic)?);
    Ok(found)
}

fn selector_kind(entry: Option<&Value>) -> (&str, ModelSelectorKind) {
    let label = entry
        .and_then(|value| value.get("selector_kind"))
        .and_then(Value::as_str)
        .unwrap_or("unknown");
    let kind = match label {
        "provider_dynamic_alias" | "provider_advertised_alias" => {
            ModelSelectorKind::ProviderDynamicAlias
        }
        "operator_alias" => ModelSelectorKind::OperatorAlias,
        "concrete" | "provider_advertised_exact_id" => ModelSelectorKind::Concrete,
        _ => ModelSelectorKind::Unknown,
    };
    (label, kind)
}

fn effective_capabilities(entry: Option<&Value>) -> Value {
    const FIELDS: [&str; 8] = [
        "context_window",
        "max_output_tokens",
        "modalities",
        "pricing",
        "deprecation_date",
        "default_reasoning_level",
        "supported_reasoning_levels",
        "client_capabilities",
    ];
    let Some(entry) = entry.and_then(Value::as_object) else {
        return Value::Null;
    };
    let capabilities = FIELDS
        .into_iter()
        .filter_map(|field| entry.get(field).cloned().map(|value| (field.into(), value)))
        .collect::<serde_json::Map<_, _>>();
    Value::Object(capabilities)
}

async fn resolve_target(
    target: &AuthTarget,
) -> Result<crate::managed_server::ResolvedServer, AnyError> {
    if target.local {
        return crate::managed_server::discovered_local_router()
            .await
            .ok_or_else(|| "no router is listening on this machine".into());
    }
    crate::managed_server::resolve(
        target.server.as_deref(),
        target.management_server.as_deref(),
        None,
        None,
        target.managed,
    )
    .await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn missing_or_unrecognized_selector_metadata_stays_unknown() {
        assert_eq!(selector_kind(None), ("unknown", ModelSelectorKind::Unknown));
        let entry = json!({"selector_kind": "invented-from-name"});
        assert_eq!(
            selector_kind(Some(&entry)),
            ("invented-from-name", ModelSelectorKind::Unknown)
        );
    }
}
