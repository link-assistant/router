use super::{
    AppState, HeaderMap, IntoResponse, OriginalUri, Response, State, StatusCode,
    SubscriptionProvider, UpstreamProvider, append_stored_provider_models, append_zai_models,
    catalog_conflict, configured_catalog_snapshot, json, merge_configured_degradation,
    model_catalog_with, model_route_error_response, principal_catalog_records,
};

/// Canonical `GET /api/services/*/v1/models` catalogs across automatic or
/// explicitly pinned providers.
pub async fn models(
    State(state): State<AppState>,
    OriginalUri(uri): OriginalUri,
    headers: HeaderMap,
) -> Response {
    let claims = match crate::proxy::authenticate_client(&state, &headers) {
        Ok(claims) => claims,
        Err(response) => return *response,
    };
    let path = uri.path();
    let principal_accounts = claims.principal_id.clone().into_iter().collect::<Vec<_>>();

    let entitled = |provider| {
        crate::client_policy::enforce_subscription_for_claims(
            &state,
            &claims,
            &headers,
            provider,
            crate::client_policy::ClientProtocol::Catalog,
            path,
        )
    };

    let models = match state.upstream_provider {
        UpstreamProvider::Auto => {
            let snapshot = configured_catalog_snapshot(&state).await;
            let healthy = snapshot
                .healthy_providers()
                .into_iter()
                .filter(|provider| entitled(*provider).is_ok())
                .collect::<Vec<_>>();
            let mut catalog = model_catalog_with(&healthy, &state.model_catalogs, |provider| {
                principal_catalog_records(&state, provider, &principal_accounts)
            });
            // A revoked subscription is filtered out before `model_catalog`
            // ever sees it, so it could never reach `degraded_providers` and
            // simply vanished from `data`. Absence is not an alert: a monitor
            // cannot tell it from a provider that was never configured here
            // (issue #318).
            let visible_health = snapshot
                .health()
                .iter()
                .filter(|entry| entitled(entry.provider).is_ok())
                .cloned()
                .collect::<Vec<_>>();
            merge_configured_degradation(&visible_health, &mut catalog);
            if let Some(error) = catalog_conflict(&catalog) {
                return model_route_error_response(&error);
            }
            if let Err(error) =
                append_stored_provider_models(&state, &claims, &headers, path, &mut catalog).await
            {
                return model_route_error_response(&error);
            }
            if let Err(error) =
                append_zai_models(&state, &claims, &headers, path, &mut catalog).await
            {
                return model_route_error_response(&error);
            }
            catalog
        }
        UpstreamProvider::Anthropic => {
            if let Err(response) = entitled(SubscriptionProvider::Claude) {
                return response;
            }
            model_catalog_with(
                &[SubscriptionProvider::Claude],
                &state.model_catalogs,
                |provider| principal_catalog_records(&state, provider, &principal_accounts),
            )
        }
        UpstreamProvider::Gonka => state.gonka.as_ref().map_or_else(
            || crate::gonka::list_models(&crate::config::default_gonka_model()),
            |gonka| crate::gonka::list_models(&gonka.model),
        ),
        UpstreamProvider::Crater => crate::crater::list_models(),
        UpstreamProvider::Codex => {
            if let Err(response) = entitled(SubscriptionProvider::Codex) {
                return response;
            }
            model_catalog_with(
                &[SubscriptionProvider::Codex],
                &state.model_catalogs,
                |provider| principal_catalog_records(&state, provider, &principal_accounts),
            )
        }
        UpstreamProvider::Qwen => {
            if let Err(response) = entitled(SubscriptionProvider::Qwen) {
                return response;
            }
            model_catalog_with(
                &[SubscriptionProvider::Qwen],
                &state.model_catalogs,
                |provider| principal_catalog_records(&state, provider, &principal_accounts),
            )
        }
        UpstreamProvider::Gemini => {
            if let Err(response) = entitled(SubscriptionProvider::Gemini) {
                return response;
            }
            model_catalog_with(
                &[SubscriptionProvider::Gemini],
                &state.model_catalogs,
                |provider| principal_catalog_records(&state, provider, &principal_accounts),
            )
        }
        UpstreamProvider::OpenAICompatible => {
            let mut catalog = json!({"object": "list", "data": []});
            if let Err(error) =
                append_stored_provider_models(&state, &claims, &headers, path, &mut catalog).await
            {
                return model_route_error_response(&error);
            }
            catalog
        }
        UpstreamProvider::ZaiCodingPlan => {
            let mut catalog = json!({"object": "list", "data": []});
            if let Err(error) =
                append_zai_models(&state, &claims, &headers, path, &mut catalog).await
            {
                return model_route_error_response(&error);
            }
            catalog
        }
    };
    (StatusCode::OK, axum::Json(models)).into_response()
}

/// Client-scoped normalized union of every currently routable model.
pub async fn aggregate_models(
    State(state): State<AppState>,
    OriginalUri(uri): OriginalUri,
    headers: HeaderMap,
) -> Response {
    let claims = match crate::proxy::authenticate_client(&state, &headers) {
        Ok(claims) => claims,
        Err(response) => return *response,
    };
    let Ok((client, _)) = crate::client_policy::bound_client(&claims) else {
        return crate::proxy::error_response(
            StatusCode::FORBIDDEN,
            "permission_error",
            "the token has no supported managed-client binding",
        );
    };

    let path = uri.path();
    if !crate::client_policy::request_evidence(
        client,
        crate::client_policy::ClientProtocol::Catalog,
        path,
        &headers,
    ) {
        return crate::proxy::error_response(
            StatusCode::FORBIDDEN,
            "permission_error",
            "request evidence does not match the token's managed-client binding",
        );
    }

    // Reuse the same authorization, health, principal, configured-provider,
    // and exact-ID collision pipeline as the native OpenAI-shaped catalog.
    let response = models(State(state), OriginalUri(uri), headers).await;
    if response.status() != StatusCode::OK {
        return response;
    }
    let (parts, body) = response.into_parts();
    let bytes = match axum::body::to_bytes(body, 16 * 1024 * 1024).await {
        Ok(bytes) => bytes,
        Err(error) => {
            return crate::proxy::error_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                "api_error",
                &format!("could not read aggregate catalog: {error}"),
            );
        }
    };
    let catalog: serde_json::Value = match serde_json::from_slice(&bytes) {
        Ok(catalog) => catalog,
        Err(error) => {
            return crate::proxy::error_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                "api_error",
                &format!("could not normalize aggregate catalog: {error}"),
            );
        }
    };
    match super::aggregate::project_catalog(&catalog, client) {
        Ok(catalog) => (parts.status, axum::Json(catalog)).into_response(),
        Err(error) => model_route_error_response(&error),
    }
}
