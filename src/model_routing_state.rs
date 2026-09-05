use serde_json::Value;

use super::{
    AppState, ModelRouteError, RoutedState, UpstreamProvider, route_stored_provider,
    route_subscription_model_for_providers, stored_provider_for_model,
};

pub async fn route_state_with_subscription(
    state: &AppState,
    body: &Value,
) -> Result<RoutedState, ModelRouteError> {
    route_state_with_subscription_for_providers(
        state,
        body,
        &crate::subscription::SubscriptionProvider::ALL,
    )
    .await
}

pub async fn route_state_with_subscription_for_providers(
    state: &AppState,
    body: &Value,
    entitled_providers: &[crate::subscription::SubscriptionProvider],
) -> Result<RoutedState, ModelRouteError> {
    route_state_with_subscription_for_client(state, body, entitled_providers, None, false).await
}

pub async fn route_state_with_subscription_for_client(
    state: &AppState,
    body: &Value,
    entitled_providers: &[crate::subscription::SubscriptionProvider],
    client: Option<crate::clients::ClientKind>,
    zai_authorized: bool,
) -> Result<RoutedState, ModelRouteError> {
    if state.upstream_provider != UpstreamProvider::Auto {
        if let Some(provider) = state.upstream_provider.subscription_provider() {
            return super::route_pinned_subscription(state, provider).await;
        }
        return Ok(RoutedState {
            state: state.clone(),
            subscription: None,
        });
    }
    let model = body
        .get("model")
        .and_then(Value::as_str)
        .filter(|model| !model.is_empty())
        .ok_or(ModelRouteError::ModelRequired)?;
    let visible_subscription = entitled_providers.iter().any(|provider| {
        state
            .model_catalogs
            .models(*provider)
            .iter()
            .any(|candidate| candidate == model)
    });
    let stored = stored_provider_for_model(state, model, client).await?;
    let zai = crate::zai_coding_plan::live_provider_for_model(state, model, client, zai_authorized)
        .await?;
    // Gonka is merged after existing compatible catalogs and therefore owns
    // only an otherwise-unclaimed canonical id. The same precedence keeps the
    // de-duplicated catalog and dispatch decisions consistent.
    let gonka = if visible_subscription || stored.is_some() || zai.is_some() {
        false
    } else if client.is_some_and(crate::gonka::supports_client) {
        match state.gonka.as_ref() {
            Some(gonka) => gonka
                .live_catalog(&state.client)
                .await
                .is_ok_and(|models| models.iter().any(|candidate| candidate.id == model)),
            None => false,
        }
    } else {
        false
    };
    let owner_count = usize::from(visible_subscription)
        + usize::from(stored.is_some())
        + usize::from(zai.is_some())
        + usize::from(gonka);
    if owner_count > 1 {
        return Err(ModelRouteError::Conflict(format!(
            "exact model id '{model}' is advertised by more than one healthy provider"
        )));
    }
    if visible_subscription {
        return route_subscription_model_for_providers(state, model, entitled_providers).await;
    }
    if let Some(stored) = stored.or(zai) {
        return Ok(RoutedState {
            state: route_stored_provider(state, &stored, model),
            subscription: None,
        });
    }
    if gonka {
        let mut routed = state.clone();
        routed.upstream_provider = UpstreamProvider::Gonka;
        return Ok(RoutedState {
            state: routed,
            subscription: None,
        });
    }
    route_subscription_model_for_providers(state, model, entitled_providers).await
}

/// Compatibility wrapper returning only the routed state.
pub async fn route_state(state: &AppState, body: &Value) -> Result<AppState, ModelRouteError> {
    route_state_with_subscription(state, body)
        .await
        .map(|routed| routed.state)
}
