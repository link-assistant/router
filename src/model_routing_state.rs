use serde_json::Value;

use super::{
    AppState, ModelRouteError, RoutedState, UpstreamProvider, route_stored_provider,
    route_subscription_model, stored_provider_for_model,
};

pub async fn route_state_with_subscription(
    state: &AppState,
    body: &Value,
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
    if let Some(stored) = stored_provider_for_model(state, model)? {
        return Ok(RoutedState {
            state: route_stored_provider(state, &stored, model),
            subscription: None,
        });
    }
    route_subscription_model(state, model).await
}

/// Compatibility wrapper returning only the routed state.
pub async fn route_state(state: &AppState, body: &Value) -> Result<AppState, ModelRouteError> {
    route_state_with_subscription(state, body)
        .await
        .map(|routed| routed.state)
}
