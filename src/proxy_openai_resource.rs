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
