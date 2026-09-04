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
    let owner_count = usize::from(visible_subscription)
        + usize::from(stored.is_some())
        + usize::from(zai.is_some());
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
    route_subscription_model_for_providers(state, model, entitled_providers).await
}

/// Compatibility wrapper returning only the routed state.
pub async fn route_state(state: &AppState, body: &Value) -> Result<AppState, ModelRouteError> {
    route_state_with_subscription(state, body)
        .await
        .map(|routed| routed.state)
}
