//! Machine-readable model-contract diagnostics.

use std::process::ExitCode;

use serde_json::{Value, json};

use crate::cli::{AuthTarget, ModelOp};
use crate::clients::ClientKind;
use crate::model_contract::{ModelRouteScope, ModelSelectorKind, ModelTruthDescriptor};

type AnyError = Box<dyn std::error::Error + Send + Sync>;

/// Run one model diagnostic without constructing server-only configuration.
pub async fn run(operation: &ModelOp) -> ExitCode {
    exit_code(run_inner(operation).await)
}

fn exit_code(result: Result<bool, AnyError>) -> ExitCode {
    match result {
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
    explain_at(id, client, &server).await
}

async fn explain_at(
    id: &str,
    client: ClientKind,
    server: &crate::managed_server::ResolvedServer,
) -> Result<bool, AnyError> {
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
    let (diagnostic, found) = diagnostic(id, client, &catalog);
    println!("{}", serde_json::to_string_pretty(&diagnostic)?);
    Ok(found)
}

fn diagnostic(id: &str, client: ClientKind, catalog: &Value) -> (Value, bool) {
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
    (diagnostic, found)
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
    use std::sync::{Arc, Mutex};

    use axum::{Router, http::HeaderMap, routing::get};

    use super::*;

    fn target() -> AuthTarget {
        AuthTarget {
            local: false,
            server: None,
            management_server: None,
            managed: false,
        }
    }

    async fn server(
        status: axum::http::StatusCode,
        body: String,
    ) -> (
        String,
        Arc<Mutex<Vec<HeaderMap>>>,
        tokio::task::JoinHandle<()>,
    ) {
        let requests = Arc::new(Mutex::new(Vec::new()));
        let recorded = Arc::clone(&requests);
        let app = Router::new().route(
            "/api/models",
            get(move |headers: HeaderMap| {
                let recorded = Arc::clone(&recorded);
                let body = body.clone();
                async move {
                    recorded.lock().expect("request record").push(headers);
                    (status, body)
                }
            }),
        );
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
            .await
            .expect("bind model catalog fixture");
        let address = listener.local_addr().expect("catalog fixture address");
        let task = tokio::spawn(async move {
            axum::serve(listener, app)
                .await
                .expect("serve model catalog fixture");
        });
        (format!("http://{address}"), requests, task)
    }

    #[test]
    fn missing_or_unrecognized_selector_metadata_stays_unknown() {
        assert_eq!(selector_kind(None), ("unknown", ModelSelectorKind::Unknown));
        let entry = json!({"selector_kind": "invented-from-name"});
        assert_eq!(
            selector_kind(Some(&entry)),
            ("invented-from-name", ModelSelectorKind::Unknown)
        );
    }

    #[test]
    fn selector_metadata_maps_only_explicit_contract_kinds() {
        for (label, expected) in [
            (
                "provider_dynamic_alias",
                ModelSelectorKind::ProviderDynamicAlias,
            ),
            (
                "provider_advertised_alias",
                ModelSelectorKind::ProviderDynamicAlias,
            ),
            ("operator_alias", ModelSelectorKind::OperatorAlias),
            ("concrete", ModelSelectorKind::Concrete),
            ("provider_advertised_exact_id", ModelSelectorKind::Concrete),
        ] {
            let entry = json!({"selector_kind": label});
            assert_eq!(selector_kind(Some(&entry)), (label, expected));
        }
    }

    #[test]
    fn unique_catalog_entry_produces_the_complete_truth_descriptor() {
        let catalog = json!({
            "data": [{
                "id": "provider/model-v1",
                "selector_kind": "provider_advertised_exact_id",
                "context_window": 200_000,
                "max_output_tokens": 16_384,
                "modalities": ["text"],
                "pricing": {"input": 1},
                "deprecation_date": null,
                "default_reasoning_level": "high",
                "supported_reasoning_levels": ["low", "high"],
                "client_capabilities": {"codex": {"supported": true}},
                "ignored": "not-a-capability",
                "capability_provenance": {
                    "scope": {
                        "provider": "provider",
                        "account": "account-1",
                        "endpoint": "https://provider.example/v1",
                        "protocols": ["openai-responses"]
                    },
                    "source": "provider-api"
                }
            }],
            "model_policy": {
                "allow_substitution": true,
                "substitution_source": "operator opt-in"
            },
            "healthy_providers": ["provider"],
            "degraded_providers": [],
            "degraded_reasons": {}
        });
        let (value, found) = diagnostic("provider/model-v1", ClientKind::Codex, &catalog);
        assert!(found);
        assert_eq!(value["routing"]["state"], "unique");
        assert_eq!(value["routing"]["candidate_count"], 1);
        assert_eq!(value["selector_kind"], "provider_advertised_exact_id");
        assert_eq!(value["model_descriptor"]["selector_kind"], "concrete");
        assert_eq!(
            value["model_descriptor"]["route"]["protocols"][0],
            "openai-responses"
        );
        assert_eq!(
            value["model_descriptor"]["capabilities"]["context_window"],
            200_000
        );
        assert!(
            value["model_descriptor"]["capabilities"]
                .get("ignored")
                .is_none()
        );
        assert_eq!(value["model_descriptor"]["allow_substitution"], true);
        assert_eq!(value["health"]["healthy_providers"][0], "provider");
    }

    #[test]
    fn ambiguous_conflicting_and_unknown_selectors_fail_closed() {
        let duplicate = json!({
            "data": [
                {"id": "same", "selector_kind": "concrete"},
                {"id": "same", "selector_kind": "operator_alias"}
            ]
        });
        let (value, found) = diagnostic("same", ClientKind::Agent, &duplicate);
        assert!(!found);
        assert_eq!(value["routing"]["state"], "conflict");
        assert_eq!(value["routing"]["candidate_count"], 2);
        assert!(value["model_descriptor"]["capabilities"].is_null());

        let conflicted = json!({
            "data": [],
            "catalog_conflict_candidates": [{"id": "same", "selector_kind": "concrete"}],
            "catalog_conflicts": ["same"]
        });
        let (value, found) = diagnostic("same", ClientKind::ClaudeCode, &conflicted);
        assert!(!found);
        assert_eq!(value["routing"]["state"], "conflict");
        assert_eq!(value["routing"]["catalog_conflicts"][0], "same");

        let (value, found) = diagnostic("missing", ClientKind::GeminiCli, &json!({}));
        assert!(!found);
        assert_eq!(value["routing"]["state"], "unknown");
        assert_eq!(value["route_scope"], Value::Null);
        assert_eq!(value["model_policy"], json!({}));
        assert_eq!(value["health"]["degraded_providers"], json!([]));
    }

    #[tokio::test]
    async fn catalog_fetch_uses_each_clients_native_authentication_header() {
        let body = json!({
            "data": [{"id": "model-v1", "selector_kind": "concrete"}]
        });
        let (url, requests, task) = server(axum::http::StatusCode::OK, body.to_string()).await;
        let router = crate::managed_server::ResolvedServer::at(
            url,
            Some("ordinary-token".to_string()),
            "test",
        );
        for client in [
            ClientKind::ClaudeCode,
            ClientKind::GeminiCli,
            ClientKind::Codex,
        ] {
            assert!(explain_at("model-v1", client, &router).await.unwrap());
        }
        let requests = requests.lock().expect("request record");
        assert_eq!(requests[0]["x-api-key"], "ordinary-token");
        assert_eq!(requests[1]["x-goog-api-key"], "ordinary-token");
        assert_eq!(requests[2]["authorization"], "Bearer ordinary-token");
        task.abort();
    }

    #[tokio::test]
    async fn catalog_fetch_reports_missing_tokens_http_errors_and_invalid_json() {
        let router = crate::managed_server::ResolvedServer::at("http://127.0.0.1:1", None, "test");
        assert!(
            explain_at("model-v1", ClientKind::Codex, &router)
                .await
                .unwrap_err()
                .to_string()
                .contains("no client token")
        );

        let (url, _, task) = server(
            axum::http::StatusCode::SERVICE_UNAVAILABLE,
            json!({"error": "catalog offline"}).to_string(),
        )
        .await;
        let router = crate::managed_server::ResolvedServer::at(
            url,
            Some("ordinary-token".to_string()),
            "test",
        );
        let error = explain_at("model-v1", ClientKind::Agent, &router)
            .await
            .unwrap_err()
            .to_string();
        assert!(error.contains("503 Service Unavailable"), "{error}");
        assert!(error.contains("catalog offline"), "{error}");
        task.abort();

        let (url, _, task) = server(axum::http::StatusCode::OK, "not-json".to_string()).await;
        let router = crate::managed_server::ResolvedServer::at(
            url,
            Some("ordinary-token".to_string()),
            "test",
        );
        assert!(
            explain_at("model-v1", ClientKind::Agent, &router)
                .await
                .is_err()
        );
        task.abort();
    }

    #[tokio::test]
    async fn empty_selector_fails_before_target_resolution() {
        let operation = ModelOp::Explain {
            id: String::new(),
            client: ClientKind::Agent,
            target: target(),
        };
        assert_ne!(run(&operation).await, ExitCode::SUCCESS);
    }

    #[test]
    fn command_status_distinguishes_unique_and_unresolved_models() {
        assert_eq!(exit_code(Ok(true)), ExitCode::SUCCESS);
        assert_eq!(exit_code(Ok(false)), ExitCode::from(1));
    }
}
