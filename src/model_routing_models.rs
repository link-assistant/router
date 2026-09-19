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
    let diagnostics = headers
        .get("x-link-assistant-model-diagnostics")
        .and_then(|value| value.to_str().ok())
        == Some("1");
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

    let mut models = match state.upstream_provider {
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
    let policy = match crate::proxy::model_policy_for_claims(&state, &claims) {
        Ok(policy) => policy,
        Err(error) => {
            return crate::proxy::error_response(
                StatusCode::SERVICE_UNAVAILABLE,
                "model_policy_unavailable",
                &format!("could not read the credential model policy: {error}"),
            );
        }
    };
    apply_model_policy(&mut models, &policy);
    if !diagnostics && let Some(error) = catalog_conflict(&models) {
        return model_route_error_response(&error);
    }
    match super::native_catalog::project(path, uri.query(), &models) {
        Ok(Some(native)) => (StatusCode::OK, axum::Json(native)).into_response(),
        Ok(None) => (StatusCode::OK, axum::Json(models)).into_response(),
        Err(error) => crate::api_error::PresentedError {
            status: error.status,
            error_type: error.error_type,
            message: &error.message,
        }
        .render(crate::api_error::dialect_for_path(path)),
    }
}

/// Make discovery obey the same durable authority as inference. A pinned
/// credential must never learn about (and then let a client auto-select) a
/// model it cannot request. The Claude `[1m]` spelling is retained only when
/// its exact Anthropic base was live; the exposed id is changed to the exact
/// selector authorized by the token.
fn apply_model_policy(
    catalog: &mut serde_json::Value,
    policy: &crate::model_contract::ModelAccessPolicy,
) {
    let Some(object) = catalog.as_object_mut() else {
        return;
    };
    object.insert(
        "model_policy".into(),
        serde_json::to_value(policy).unwrap_or_else(|_| json!({})),
    );
    if policy.allowed_models.is_empty() {
        return;
    }
    let available = object
        .get("data")
        .and_then(serde_json::Value::as_array)
        .cloned()
        .unwrap_or_default();
    if let Some(candidates) = object
        .get_mut("catalog_conflict_candidates")
        .and_then(serde_json::Value::as_array_mut)
    {
        candidates.retain(|entry| {
            entry
                .get("id")
                .and_then(serde_json::Value::as_str)
                .is_some_and(|id| policy.allowed_models.iter().any(|allowed| allowed == id))
        });
    }
    if let Some(conflicts) = object
        .get_mut("catalog_conflicts")
        .and_then(serde_json::Value::as_array_mut)
    {
        conflicts.retain(|entry| {
            entry
                .as_str()
                .is_some_and(|id| policy.allowed_models.iter().any(|allowed| allowed == id))
        });
    }
    let mut visible = Vec::new();
    for allowed in &policy.allowed_models {
        if let Some(exact) = available.iter().find(|entry| entry["id"] == *allowed) {
            visible.push(exact.clone());
            continue;
        }
        let Some(base) = allowed.strip_suffix("[1m]") else {
            continue;
        };
        let Some(mut variant) = available
            .iter()
            .find(|entry| entry["id"] == base && entry["owned_by"].as_str() == Some("anthropic"))
            .cloned()
        else {
            continue;
        };
        if let Some(entry) = variant.as_object_mut() {
            entry.insert("id".into(), serde_json::Value::String(allowed.clone()));
            entry.insert(
                "selector_kind".into(),
                serde_json::Value::String("operator_alias".into()),
            );
            entry.insert(
                "variant_of".into(),
                serde_json::Value::String(base.to_string()),
            );
        }
        visible.push(variant);
    }
    object.insert("data".into(), serde_json::Value::Array(visible));
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
    let Ok(models) = gonka.live_catalog(&state.client).await else {
        catalog_status(catalog, "gonka", false);
        return;
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

#[cfg(test)]
mod model_policy_tests {
    use super::*;

    #[test]
    fn pinned_catalog_contains_only_exact_authorized_selectors() {
        let mut catalog = json!({"object":"list","data":[
            {"id":"model-a","owned_by":"openai"},
            {"id":"model-b","owned_by":"openai"}
        ]});
        let policy = crate::model_contract::ModelAccessPolicy::exact("model-b");
        apply_model_policy(&mut catalog, &policy);
        assert_eq!(
            catalog["data"],
            json!([{"id":"model-b","owned_by":"openai"}])
        );
        assert_eq!(
            catalog["model_policy"]["allowed_models"],
            json!(["model-b"])
        );
    }

    #[test]
    fn anthropic_context_variant_is_exposed_as_the_authorized_selector() {
        let mut catalog = json!({"object":"list","data":[
            {"id":"claude-live","owned_by":"anthropic"},
            {"id":"compatible","owned_by":"other"}
        ]});
        let policy = crate::model_contract::ModelAccessPolicy::exact("claude-live[1m]");
        apply_model_policy(&mut catalog, &policy);
        assert_eq!(catalog["data"][0]["id"], "claude-live[1m]");
        assert_eq!(catalog["data"][0]["variant_of"], "claude-live");
        assert_eq!(catalog["data"][0]["selector_kind"], "operator_alias");
        let projected: crate::clients::RouterModel =
            serde_json::from_value(catalog["data"][0].clone()).unwrap();
        assert_eq!(
            projected.selector_kind,
            crate::model_contract::ModelSelectorKind::OperatorAlias
        );
    }
}
