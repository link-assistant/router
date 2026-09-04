use super::{AppState, HeaderMap, ModelRouteError, UpstreamProvider, Value, json};

pub(super) fn append_stored_provider_models(
    state: &AppState,
    claims: &crate::token::TokenClaims,
    headers: &HeaderMap,
    path: &str,
    catalog: &mut Value,
) -> Result<(), ModelRouteError> {
    let Ok((client, _)) = crate::client_policy::bound_client(claims) else {
        return Ok(());
    };
    if !crate::client_policy::request_evidence(
        client,
        crate::client_policy::ClientProtocol::Catalog,
        path,
        headers,
    ) {
        return Ok(());
    }
    let Ok(providers) = state.provider_store.list() else {
        return Ok(());
    };
    let Some(data) = catalog.get_mut("data").and_then(Value::as_array_mut) else {
        return Ok(());
    };
    for provider in providers.iter().filter(|record| {
        record.enabled
            && record.kind != crate::providers::ProviderKind::ZaiCodingPlan
            && (state.upstream_provider == UpstreamProvider::Auto
                || record.name == state.openai_compatible.provider_name)
            && record
                .effective_supported_clients()
                .iter()
                .any(|supported| supported == client.canonical_name())
    }) {
        for model in &provider.models {
            if data
                .iter()
                .any(|entry| entry.get("id").and_then(Value::as_str) == Some(model.as_str()))
            {
                return Err(ModelRouteError::Conflict(format!(
                    "exact model id '{model}' is advertised by more than one healthy provider"
                )));
            }
            data.push(json!({
                "id": model,
                "object": "model",
                "owned_by": provider.name,
            }));
        }
    }
    Ok(())
}

/// Add only the healthy Coding Plan aliases authorized for this signed client.
pub(super) async fn append_zai_models(
    state: &AppState,
    claims: &crate::token::TokenClaims,
    headers: &HeaderMap,
    path: &str,
    catalog: &mut Value,
) -> Result<(), ModelRouteError> {
    let Ok(Some(provider)) = crate::zai_coding_plan::resolve(state) else {
        return Ok(());
    };
    let Ok((client, _)) =
        crate::zai_coding_plan::authorize_catalog(&provider, claims, headers, path)
    else {
        return Ok(());
    };
    let live_models = match crate::zai_coding_plan::live_catalog(state, &provider).await {
        Ok(models) => models,
        Err(_) => {
            if let Some(object) = catalog.as_object_mut() {
                let degraded = object
                    .entry("degraded_providers")
                    .or_insert_with(|| Value::Array(Vec::new()));
                if let Some(entries) = degraded.as_array_mut()
                    && !entries.iter().any(|entry| entry == "z.ai")
                {
                    entries.push(Value::String("z.ai".into()));
                }
                let reasons = object
                    .entry("degraded_reasons")
                    .or_insert_with(|| Value::Object(serde_json::Map::new()));
                if let Some(reasons) = reasons.as_object_mut() {
                    reasons.insert(
                        "z.ai".into(),
                        Value::String("live z.ai catalog refresh failed".into()),
                    );
                }
            }
            return Ok(());
        }
    };
    let registry = crate::zai_coding_plan::live_registry_for_client(client, &live_models)
        .map_err(ModelRouteError::NotFound)?;
    let Some(data) = catalog.get_mut("data").and_then(Value::as_array_mut) else {
        return Ok(());
    };
    for (entry, live) in registry.into_iter().zip(live_models) {
        if data
            .iter()
            .any(|model| model.get("id").and_then(Value::as_str) == Some(&entry.exposed_id))
        {
            return Err(ModelRouteError::Conflict(format!(
                "exact model id '{}' is advertised by more than one healthy provider",
                entry.exposed_id
            )));
        }
        let mut projected = live.raw;
        projected.insert("id".into(), Value::String(entry.exposed_id));
        projected
            .entry("object")
            .or_insert_with(|| Value::String("model".into()));
        projected
            .entry("owned_by")
            .or_insert_with(|| Value::String(entry.owner.into()));
        data.push(Value::Object(projected));
    }
    if let Some(healthy) = catalog
        .get_mut("healthy_providers")
        .and_then(Value::as_array_mut)
        && !healthy.iter().any(|entry| entry == "z.ai")
    {
        healthy.push(Value::String("z.ai".into()));
    }
    Ok(())
}

/// The stored provider that declares `model`, when exactly one does.
///
/// Stored providers were reachable only by pinning `UPSTREAM_PROVIDER`, which
/// pins the *whole deployment* — so one router could serve vendor
/// subscriptions or a local OpenAI-compatible endpoint, never both (issue
/// #260). A provider that declares its models can now win a route in automatic
/// mode on the strength of that declaration.
///
pub(super) fn stored_provider_for_model(
    state: &AppState,
    model: &str,
    client: Option<crate::clients::ClientKind>,
) -> Result<Option<crate::providers::ResolvedProvider>, ModelRouteError> {
    let Ok(providers) = state.provider_store.list() else {
        return Ok(None);
    };
    let mut declaring = providers
        .into_iter()
        .filter(|record| {
            record.enabled
                && record.kind != crate::providers::ProviderKind::ZaiCodingPlan
                && record.models.iter().any(|id| id == model)
                && client.is_none_or(|client| {
                    record
                        .effective_supported_clients()
                        .iter()
                        .any(|supported| supported == client.canonical_name())
                })
        })
        .map(|record| record.name);
    let Some(first) = declaring.next() else {
        return Ok(None);
    };
    if let Some(second) = declaring.next() {
        // The same rule subscriptions already follow: an ambiguous unqualified
        // name is refused rather than resolved by declaration order.
        return Err(ModelRouteError::Conflict(format!(
            "exact model id '{model}' is declared by multiple stored providers ({first}, {second})"
        )));
    }
    Ok(state.provider_store.resolve(&first).ok().flatten())
}

/// Point `state` at a stored provider for this request only.
pub(super) fn route_stored_provider(
    state: &AppState,
    provider: &crate::providers::ResolvedProvider,
    model: &str,
) -> AppState {
    let mut routed = state.clone();
    routed.upstream_provider = if provider.kind == crate::providers::ProviderKind::ZaiCodingPlan {
        UpstreamProvider::ZaiCodingPlan
    } else {
        UpstreamProvider::OpenAICompatible
    };
    routed
        .openai_compatible
        .provider_name
        .clone_from(&provider.name);
    routed.bridge_model = Some(model.to_string());
    routed
}

/// Preserve the exact model id returned by the provider catalog.
#[must_use]
pub fn bare_model_id(model: &str) -> &str {
    model
}
