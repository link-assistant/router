use super::{AppState, HeaderMap, Response, StatusCode, UpstreamProvider};

/// Resolve only the model alias owned by this `OpenAI` request route.
pub(super) fn canonical_openai_model<'a>(
    provider: UpstreamProvider,
    has_subscription: bool,
    routed_stored_model: Option<&'a str>,
    requested: &'a str,
) -> &'a str {
    if has_subscription {
        return crate::model_routing::subscription_model_identity(requested).1;
    }
    if provider == UpstreamProvider::OpenAICompatible {
        return routed_stored_model.unwrap_or(requested);
    }
    requested
}

pub(crate) async fn route_openai_request(
    state: &AppState,
    headers: &HeaderMap,
    body: &serde_json::Value,
    protocol: crate::client_policy::ClientProtocol,
    path: &str,
) -> Result<crate::model_routing::RoutedState, Response> {
    if state.upstream_provider != UpstreamProvider::Auto {
        return crate::model_routing::route_state_with_subscription(state, body)
            .await
            .map_err(|error| crate::model_routing::model_route_error_response(&error));
    }
    let claims = crate::proxy::authenticate_client(state, headers).map_err(|response| *response)?;
    let client = crate::client_policy::bound_client(&claims)
        .map(|(client, _)| client)
        .map_err(|error| {
            crate::proxy::error_response(StatusCode::FORBIDDEN, "permission_error", &error)
        })?;
    if !crate::client_policy::request_evidence(client, protocol, path, headers) {
        return Err(crate::proxy::error_response(
            StatusCode::FORBIDDEN,
            "permission_error",
            &format!(
                "request evidence does not match the token's {} client binding",
                client.canonical_name()
            ),
        ));
    }
    let entitled = crate::client_policy::entitled_subscription_providers_for_claims(
        state, &claims, headers, protocol, path,
    )?;
    crate::model_routing::route_state_with_subscription_for_client(
        state,
        body,
        &entitled,
        Some(client),
        crate::zai_coding_plan::authorize_automatic_discovery(
            state, &claims, headers, protocol, path,
        ),
    )
    .await
    .map_err(|error| crate::model_routing::model_route_error_response(&error))
}

pub(crate) fn rewrite_routed_model(
    body: &mut serde_json::Value,
    state: &AppState,
    subscription: Option<&crate::model_routing::ValidatedSubscription>,
) {
    let Some(requested) = body
        .get("model")
        .and_then(serde_json::Value::as_str)
        .map(str::to_string)
    else {
        return;
    };
    let canonical = canonical_openai_model(
        state.upstream_provider,
        subscription.is_some(),
        state.bridge_model.as_deref(),
        &requested,
    );
    if !canonical.is_empty() && canonical != requested {
        body["model"] = serde_json::Value::String(canonical.to_string());
    }
}

pub(super) fn state_for_previous_response(
    state: &AppState,
    headers: &HeaderMap,
    namespace: crate::response_affinity::ResponseNamespace,
    body: &serde_json::Value,
) -> Result<AppState, Response> {
    let Some(previous) = body.get("previous_response_id") else {
        return Ok(state.clone());
    };
    let Some(previous) = previous.as_str().filter(|id| !id.is_empty()) else {
        return Err(crate::api_error::error_response_for_surface(
            crate::metrics::Surface::OpenAIResponses,
            StatusCode::BAD_REQUEST,
            "invalid_request_error",
            "previous_response_id must be a non-empty string",
        ));
    };
    let claims = crate::proxy::authenticate_client_error(state, headers)
        .map_err(|error| error.render(crate::api_error::ApiDialect::OpenAi))?;
    let owner = crate::response_affinity::ResponseOwner::from_claims(&claims).map_err(|error| {
        crate::api_error::error_response_for_surface(
            crate::metrics::Surface::OpenAIResponses,
            StatusCode::FORBIDDEN,
            "permission_error",
            &error,
        )
    })?;
    let affinity = state
        .provider_store
        .response_affinities()
        .lookup(namespace, previous, &owner)
        .map_err(|error| {
            crate::api_error::error_response_for_surface(
                crate::metrics::Surface::OpenAIResponses,
                StatusCode::SERVICE_UNAVAILABLE,
                "api_error",
                &format!("response affinity is unavailable: {error}"),
            )
        })?;
    let Some(affinity) = affinity else {
        // Existing native clients can hold provider-created continuation IDs
        // from before Router began recording affinity. Preserve that request
        // path; every ID Router does know remains owner-scoped and pinned.
        return Ok(state.clone());
    };
    if let crate::response_affinity::AffinityDestination::Subscription { account, .. } =
        &affinity.destination
    {
        let pin = state
            .token_manager
            .account_for(&claims.sub)
            .map_err(|error| {
                crate::api_error::error_response_for_surface(
                    crate::metrics::Surface::OpenAIResponses,
                    StatusCode::SERVICE_UNAVAILABLE,
                    "api_error",
                    &format!("failed to resolve account binding: {error}"),
                )
            })?;
        if pin
            .as_deref()
            .unwrap_or(crate::credential_recovery_store::PRIMARY_ACCOUNT)
            != account
        {
            return Err(crate::responses_lifecycle::response_not_found());
        }
    }
    crate::resource_capture::pin_state(state, &affinity)
}

pub(super) async fn capture_created_resource(
    state: &AppState,
    capture: Option<crate::resource_capture::CaptureContext>,
    response: Response,
) -> Response {
    match capture {
        Some(capture) => crate::resource_capture::capture(state, capture, response).await,
        None => response,
    }
}
