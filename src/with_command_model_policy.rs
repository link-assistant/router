//! Exact model authority established before a wrapped client starts.

use serde_json::json;

use crate::cli::WithArgs;
use crate::clients::ClientKind;
use crate::managed_server::{ResolvedServer, RunCredential};
use crate::model_contract::{
    ModelAccessPolicy, ModelRouteScope, ModelSelectorKind, ModelTruthDescriptor,
};

use super::AnyError;

pub(super) struct ModelRequest {
    forwarded: Option<String>,
    requested_policy: ModelAccessPolicy,
}

pub(super) struct PreparedModel {
    pub credential: RunCredential,
    pub selected: Option<String>,
}

/// Parse every selector before a credential can be minted.
pub(super) fn request(args: &WithArgs) -> Result<ModelRequest, AnyError> {
    let forwarded = crate::client_launch::forwarded_model(&args.client_args)?;
    if let (Some(wrapper), Some(client)) = (args.model.as_deref(), forwarded.as_deref())
        && wrapper != client
    {
        return Err(format!(
            "conflicting model selectors: router --model names `{wrapper}` but the client arguments name `{client}`; no token was minted and no client was launched"
        )
        .into());
    }
    if (!args.allowed_models.is_empty() || args.allow_model_substitution)
        && args.model.is_none()
        && forwarded.is_none()
        && !args.pick_model
    {
        return Err("--allow-model and --allow-model-substitution widen an explicit model grant; use --model, a forwarded client model argument, or --pick-model first; no token was minted and no client was launched".into());
    }
    let mut allowed_models = args
        .model
        .iter()
        .cloned()
        .chain(forwarded.iter().cloned())
        .collect::<Vec<_>>();
    allowed_models.extend(args.allowed_models.iter().cloned());
    allowed_models.sort();
    allowed_models.dedup();
    let requested_policy = ModelAccessPolicy {
        allowed_models,
        allow_substitution: args.allow_model_substitution,
        substitution_source: args
            .allow_model_substitution
            .then(|| "router with --allow-model-substitution".to_string()),
    };
    requested_policy.validate().map_err(|error| {
        format!("invalid exact-model token policy: {error}; no token was minted and no client was launched")
    })?;
    Ok(ModelRequest {
        forwarded,
        requested_policy,
    })
}

pub(super) async fn prepare(
    args: &WithArgs,
    server: &ResolvedServer,
    label: &str,
    request: ModelRequest,
) -> Result<PreparedModel, AnyError> {
    let ModelRequest {
        forwarded,
        requested_policy,
    } = request;
    // A picker needs the full catalog only until it makes a choice. Its
    // bootstrap credential is revoked and replaced before client launch.
    let mut policy = if args.pick_model {
        ModelAccessPolicy::default()
    } else {
        requested_policy
    };
    let mut credential = crate::managed_server::prepare_run_credential_with_model_policy(
        server,
        args.client,
        label,
        args.run_ttl_hours,
        !args.fixed_run_ttl,
        &policy,
    )
    .await?;
    let selected = match resolve(args, forwarded.as_deref(), &credential) {
        Ok(selected) => selected,
        Err(error) => {
            cleanup_after_setup_failure(credential).await;
            return Err(error);
        }
    };
    if args.pick_model
        && let Some(selected) = selected.as_deref()
        && !policy
            .allowed_models
            .iter()
            .any(|allowed| allowed == selected)
    {
        let mut allowed_models = vec![selected.to_string()];
        allowed_models.extend(args.allowed_models.iter().cloned());
        allowed_models.sort();
        allowed_models.dedup();
        let pinned = ModelAccessPolicy {
            allowed_models,
            allow_substitution: args.allow_model_substitution,
            substitution_source: args
                .allow_model_substitution
                .then(|| "router with --allow-model-substitution".to_string()),
        };
        let replacement = crate::managed_server::prepare_run_credential_with_model_policy(
            server,
            args.client,
            label,
            args.run_ttl_hours,
            !args.fixed_run_ttl,
            &pinned,
        )
        .await;
        let replacement = match replacement {
            Ok(replacement) => replacement,
            Err(error) => {
                cleanup_after_setup_failure(credential).await;
                return Err(error);
            }
        };
        cleanup_after_setup_failure(credential).await;
        credential = replacement;
        policy = pinned;
    }
    if let Err(error) = validate_selection(args, selected.as_deref(), &credential, &policy) {
        cleanup_after_setup_failure(credential).await;
        return Err(error);
    }
    print_diagnostic(
        args,
        server,
        &credential,
        selected.as_deref(),
        forwarded.as_deref(),
        &policy,
    );
    Ok(PreparedModel {
        credential,
        selected,
    })
}

fn resolve(
    args: &WithArgs,
    forwarded: Option<&str>,
    credential: &RunCredential,
) -> Result<Option<String>, AnyError> {
    if let Some(model) = args.model.clone().or_else(|| forwarded.map(str::to_string)) {
        return Ok(Some(model));
    }
    if !args.pick_model {
        if crate::client_launch::requires_a_model(args.client) {
            return Err(format!(
                "{} requires an explicit model in its Router configuration; pass --model with an exact catalog id, or opt in to Router selection with --pick-model",
                args.client.display_name()
            )
            .into());
        }
        return Ok(None);
    }
    if let Some(model) = crate::clients::select_model(args.client, credential.models()) {
        let owners = args.client.integration().model_owners;
        eprintln!(
            "note: --pick-model chose `{model}`, the first {} model the router advertises; pass --model to choose another",
            if owners.is_empty() {
                "advertised".to_string()
            } else {
                owners.join(" or ")
            }
        );
        return Ok(Some(model.to_string()));
    }
    Err(crate::clients::model_unavailable(args.client, credential.models()).into())
}

fn validate_selection(
    args: &WithArgs,
    selected: Option<&str>,
    credential: &RunCredential,
    policy: &ModelAccessPolicy,
) -> Result<(), AnyError> {
    if let Some(model) = selected
        && args.client == ClientKind::ClaudeCode
        && let Some(unavailable) =
            super::unavailable_native_claude_model(model, credential.models())
    {
        return Err(format!(
            "Claude model `{unavailable}` requires an Anthropic provider, but this client's authorized live catalog contains none; choose a visible exact model with --model or configure Anthropic"
        )
        .into());
    }
    for allowed in &policy.allowed_models {
        crate::managed_server::ensure_model_available(credential, args.client, allowed)?;
    }
    if let Some(model) = selected {
        crate::managed_server::ensure_model_available(credential, args.client, model)?;
    }
    Ok(())
}

fn print_diagnostic(
    args: &WithArgs,
    server: &ResolvedServer,
    credential: &RunCredential,
    selected: Option<&str>,
    forwarded: Option<&str>,
    policy: &ModelAccessPolicy,
) {
    eprintln!(
        "{}",
        launch_diagnostic(args, server, credential, selected, forwarded, policy)
    );
}

fn launch_diagnostic(
    args: &WithArgs,
    server: &ResolvedServer,
    credential: &RunCredential,
    selected: Option<&str>,
    forwarded: Option<&str>,
    policy: &ModelAccessPolicy,
) -> serde_json::Value {
    let advertised = selected.and_then(|selected| {
        credential.models().iter().find(|model| {
            model.id == selected
                || selected
                    .strip_suffix("[1m]")
                    .is_some_and(|base| model.id == base)
        })
    });
    let request_source = if args.model.is_some() {
        "with --model"
    } else if forwarded.is_some() {
        "forwarded client model argument"
    } else if args.pick_model {
        "with --pick-model"
    } else {
        "client configuration"
    };
    let evidence_scope = advertised
        .and_then(|model| model.capability_provenance.get("scope"))
        .and_then(serde_json::Value::as_object);
    let scoped_provider = evidence_scope
        .and_then(|scope| scope.get("provider"))
        .and_then(serde_json::Value::as_str);
    let scoped_account = evidence_scope
        .and_then(|scope| scope.get("account"))
        .and_then(serde_json::Value::as_str);
    let scoped_endpoint = evidence_scope
        .and_then(|scope| scope.get("endpoint"))
        .and_then(serde_json::Value::as_str);
    let scoped_protocols = evidence_scope
        .and_then(|scope| scope.get("protocols"))
        .cloned()
        .unwrap_or(serde_json::Value::Null);
    let capabilities = advertised
        .and_then(|model| model.capability_provenance.get("fields"))
        .and_then(serde_json::Value::as_object)
        .map(|fields| {
            fields
                .iter()
                .map(|(field, evidence)| {
                    (
                        field.clone(),
                        evidence
                            .get("value")
                            .cloned()
                            .unwrap_or(serde_json::Value::Null),
                    )
                })
                .collect::<serde_json::Map<_, _>>()
        })
        .map_or(serde_json::Value::Null, serde_json::Value::Object);
    let descriptor = ModelTruthDescriptor {
        requested_selector: selected.map(str::to_string),
        selector_kind: advertised.map_or(ModelSelectorKind::Unknown, |model| model.selector_kind),
        route: ModelRouteScope {
            provider: scoped_provider
                .or_else(|| advertised.map(|model| model.owned_by.as_str()))
                .map(str::to_string),
            account: scoped_account
                .or_else(|| Some(credential.principal_id()))
                .map(str::to_string),
            endpoint: scoped_endpoint.map(str::to_string),
            protocols: scoped_protocols
                .as_array()
                .into_iter()
                .flatten()
                .filter_map(serde_json::Value::as_str)
                .map(str::to_string)
                .collect(),
        },
        upstream_request_model: selected.map(str::to_string),
        upstream_served_model: None,
        capabilities,
        capability_provenance: advertised.map_or(serde_json::Value::Null, |model| {
            model.capability_provenance.clone()
        }),
        allow_substitution: policy.allow_substitution,
        substitution_source: policy.substitution_source.clone(),
    };
    json!({
        "router_model_launch": {
            "contract_version": 1,
            "model_descriptor": descriptor,
            "client": args.client.canonical_name(),
            "requested_model": selected,
            "request_source": request_source,
            "token_constraint": if policy.allowed_models.is_empty() {
                json!({"state": "unpinned"})
            } else {
                json!({"state": "exact", "allowed_models": policy.allowed_models})
            },
            "selector_kind": advertised.map(|model| model.selector_kind),
            "provider": scoped_provider.or_else(|| advertised.map(|model| model.owned_by.as_str())),
            "account": scoped_account.or_else(|| Some(credential.principal_id())),
            "provider_endpoint": scoped_endpoint,
            "protocols": scoped_protocols,
            "router_endpoint": server.base_url,
            "substitution_allowed": policy.allow_substitution,
            "switching_setting": (!args.allowed_models.is_empty()).then_some("with --allow-model"),
            "substitution_setting": policy.substitution_source,
        }
    })
}

pub(super) async fn cleanup_after_setup_failure(credential: RunCredential) {
    if let Err(error) = crate::managed_server::cleanup_run_credential(credential).await {
        eprintln!("warning: {error}; the short token TTL remains the cleanup backstop");
    }
}

#[cfg(test)]
#[path = "with_command_model_policy_tests.rs"]
mod tests;
