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
            append_gonka_models(&state, &claims, &headers, path, &mut catalog).await;
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
        UpstreamProvider::Gonka => {
            let Some(gonka) = state.gonka.as_ref() else {
                return crate::proxy::error_response(
                    StatusCode::SERVICE_UNAVAILABLE,
                    "api_error",
                    crate::gonka::MISSING_API_KEY_MESSAGE,
                );
            };
            match gonka.live_catalog(&state.client).await {
                Ok(models) => crate::gonka::catalog_json(models),
                Err(error) => {
                    return crate::proxy::error_response(
                        StatusCode::SERVICE_UNAVAILABLE,
                        "api_error",
                        &error,
                    );
                }
            }
        }
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

async fn append_gonka_models(
    state: &AppState,
    claims: &crate::token::TokenClaims,
    headers: &HeaderMap,
    path: &str,
    catalog: &mut serde_json::Value,
) {
    let Ok((client, _)) = crate::client_policy::bound_client(claims) else {
        return;
    };
    if !crate::gonka::supports_client(client)
        || !crate::client_policy::request_evidence(
            client,
            crate::client_policy::ClientProtocol::Catalog,
            path,
            headers,
        )
    {
        return;
    }
    let Some(gonka) = state.gonka.as_ref() else {
        return;
    };
    let models = match gonka.live_catalog(&state.client).await {
        Ok(models) => models,
        Err(_) => {
            catalog_status(catalog, "gonka", false);
            return;
        }
    };
    crate::gonka::merge_catalog(catalog, models);
    catalog_status(catalog, "gonka", true);
}

fn catalog_status(catalog: &mut serde_json::Value, provider: &str, healthy: bool) {
    let Some(object) = catalog.as_object_mut() else {
        return;
    };
    let field = if healthy {
        "healthy_providers"
    } else {
        "degraded_providers"
    };
    let entries = object
        .entry(field)
        .or_insert_with(|| serde_json::Value::Array(Vec::new()));
    if let Some(entries) = entries.as_array_mut()
        && !entries.iter().any(|entry| entry == provider)
    {
        entries.push(serde_json::Value::String(provider.to_string()));
    }
    if !healthy {
        let reasons = object
            .entry("degraded_reasons")
            .or_insert_with(|| serde_json::Value::Object(serde_json::Map::new()));
        if let Some(reasons) = reasons.as_object_mut() {
            reasons.insert(
                provider.to_string(),
                serde_json::Value::String("live Gonka catalog refresh failed".into()),
            );
        }
    }
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
