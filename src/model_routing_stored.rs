use super::{AppState, HeaderMap, ModelRouteError, UpstreamProvider, Value, json};

pub(super) fn append_stored_provider_models(state: &AppState, catalog: &mut Value) {
    let Ok(providers) = state.provider_store.list() else {
        return;
    };
    let Some(data) = catalog.get_mut("data").and_then(Value::as_array_mut) else {
        return;
    };
    for provider in providers.iter().filter(|record| {
        record.enabled && record.kind != crate::providers::ProviderKind::ZaiCodingPlan
    }) {
        for model in &provider.models {
            if data
                .iter()
                .any(|entry| entry.get("id").and_then(Value::as_str) == Some(model.as_str()))
            {
                // The id is already listed by a subscription, so name this one
                // in its qualified form: both remain reachable, and the
                // unqualified id stays ambiguous rather than silently bound.
                data.push(json!({
                    "id": format!("{}/{}", provider.name, model),
                    "object": "model",
                    "owned_by": provider.name,
                }));
                continue;
            }
            data.push(json!({
                "id": model,
                "object": "model",
                "owned_by": provider.name,
            }));
        }
    }
}

/// Add only the healthy Coding Plan aliases authorized for this signed client.
pub(super) async fn append_zai_models(
    state: &AppState,
    claims: &crate::token::TokenClaims,
    headers: &HeaderMap,
    path: &str,
    catalog: &mut Value,
) {
    let Ok(Some(provider)) = crate::zai_coding_plan::resolve(state) else {
        return;
    };
    let Ok((_, registry, _)) =
        crate::zai_coding_plan::authorize_catalog(&provider, claims, headers, path)
    else {
        return;
    };
    if let Err(reason) = crate::zai_coding_plan::credential_healthy(&state.client, &provider).await
    {
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
                reasons.insert("z.ai".into(), Value::String(reason));
            }
        }
        return;
    }
    let Some(data) = catalog.get_mut("data").and_then(Value::as_array_mut) else {
        return;
    };
    for entry in registry {
        if data
            .iter()
            .any(|model| model.get("id").and_then(Value::as_str) == Some(&entry.exposed_id))
        {
            continue;
        }
        data.push(json!({
            "id": entry.exposed_id,
            "object": "model",
            "owned_by": entry.owner,
            "display_name": entry.display_name,
        }));
    }
}

/// The stored provider that declares `model`, when exactly one does.
///
/// Stored providers were reachable only by pinning `UPSTREAM_PROVIDER`, which
/// pins the *whole deployment* — so one router could serve vendor
/// subscriptions or a local OpenAI-compatible endpoint, never both (issue
/// #260). A provider that declares its models can now win a route in automatic
/// mode on the strength of that declaration.
///
/// `<provider>/<model>` names one explicitly, which is how an operator resolves
/// a collision that automatic routing refuses to guess at.
pub(super) fn stored_provider_for_model(
    state: &AppState,
    model: &str,
) -> Result<Option<crate::providers::ResolvedProvider>, ModelRouteError> {
    if let Some((name, bare)) = model.split_once('/')
        && state
            .provider_store
            .get(name)
            .is_ok_and(|provider| provider.is_some())
    {
        // An explicitly qualified name addresses one provider and must not
        // silently fall through to a subscription of the same model id.
        return match state.provider_store.resolve(name) {
            Ok(Some(provider)) if provider.declares(bare) => Ok(Some(provider)),
            Ok(Some(_)) => Err(ModelRouteError::NotFound(format!(
                "provider '{name}' does not advertise model '{bare}'"
            ))),
            _ => Ok(None),
        };
    }
    let Ok(providers) = state.provider_store.list() else {
        return Ok(None);
    };
    let mut declaring = providers
        .into_iter()
        .filter(|record| {
            record.enabled
                && if record.kind == crate::providers::ProviderKind::ZaiCodingPlan {
                    crate::zai_coding_plan::canonical_for_any_client(&record.models, model)
                        .is_some()
                } else {
                    record.models.iter().any(|id| id == model)
                }
        })
        .map(|record| record.name);
    let Some(first) = declaring.next() else {
        return Ok(None);
    };
    if let Some(second) = declaring.next() {
        // The same rule subscriptions already follow: an ambiguous unqualified
        // name is refused rather than resolved by declaration order.
        return Err(ModelRouteError::Ambiguous(format!(
            "model '{model}' is declared by multiple stored providers ({first}, {second}); name \
             one as '<provider>/{model}' to disambiguate"
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
    // A qualified name addressed the provider; the upstream only knows the
    // bare id, so forward what it will recognise.
    routed.bridge_model = Some(
        if provider.kind == crate::providers::ProviderKind::ZaiCodingPlan {
            crate::zai_coding_plan::canonical_for_any_client(&provider.models, model)
                .unwrap_or_else(|| model.to_string())
        } else {
            bare_model_id(model).to_string()
        },
    );
    routed
}

/// The model id an upstream will recognise, with any `<provider>/` prefix
/// removed.
#[must_use]
pub fn bare_model_id(model: &str) -> &str {
    model.split_once('/').map_or(model, |(_, bare)| bare)
}
