//! Model catalog and automatic subscription-provider routing.

use axum::body::Body;
use axum::extract::{Request, State};
use axum::http::{HeaderMap, StatusCode};
use axum::response::{IntoResponse, Response};
use serde_json::{Value, json};

use crate::app_state::AppState;
use crate::config::UpstreamProvider;
use crate::model_catalog::ModelCatalogCache;
use crate::subscription::{SubscriptionProvider, SubscriptionReader};

/// Failure to resolve a request model in automatic provider mode.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ModelRouteError {
    /// The request did not identify a model to route.
    ModelRequired,
    /// The requested model is unknown or its owning provider is unavailable.
    NotFound(String),
    /// More than one healthy subscription advertises an unqualified model id.
    Ambiguous(String),
}

impl std::fmt::Display for ModelRouteError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::ModelRequired => {
                formatter.write_str("model is required when UPSTREAM_PROVIDER=auto")
            }
            Self::NotFound(message) | Self::Ambiguous(message) => formatter.write_str(message),
        }
    }
}

/// Convert an automatic-routing failure into the public API error shape.
pub(crate) fn model_route_error_response(error: &ModelRouteError) -> Response {
    let (status, error_type) = match error {
        ModelRouteError::ModelRequired | ModelRouteError::Ambiguous(_) => {
            (StatusCode::BAD_REQUEST, "invalid_request_error")
        }
        ModelRouteError::NotFound(_) => (StatusCode::NOT_FOUND, "not_found_error"),
    };
    crate::proxy::error_response(status, error_type, &error.to_string())
}

pub(crate) fn model_not_found_response(model: &str) -> Response {
    model_route_error_response(&ModelRouteError::NotFound(format!(
        "model '{model}' is not available"
    )))
}

const fn provider_owner(provider: SubscriptionProvider) -> &'static str {
    match provider {
        SubscriptionProvider::Claude => "anthropic",
        SubscriptionProvider::Codex => "openai",
        SubscriptionProvider::Gemini => "google",
        SubscriptionProvider::Qwen => "qwen",
    }
}

fn provider_hint(model: &str) -> Option<SubscriptionProvider> {
    if model.starts_with("claude-") {
        Some(SubscriptionProvider::Claude)
    } else if model.starts_with("gpt-")
        || model.starts_with("codex-")
        || model
            .strip_prefix('o')
            .and_then(|suffix| suffix.chars().next())
            .is_some_and(|character| character.is_ascii_digit())
    {
        Some(SubscriptionProvider::Codex)
    } else if model.starts_with("gemini-") {
        Some(SubscriptionProvider::Gemini)
    } else if model.starts_with("qwen-") {
        Some(SubscriptionProvider::Qwen)
    } else {
        None
    }
}

fn providers_for_model(model: &str, catalogs: &ModelCatalogCache) -> Vec<SubscriptionProvider> {
    SubscriptionProvider::ALL
        .into_iter()
        .filter(|provider| catalogs.models(*provider).iter().any(|id| id == model))
        .collect()
}

/// Return the unambiguous provider whose last known live catalog owns a model id.
///
/// A vendor-shaped model id resolves to that vendor when multiple catalogs
/// contain it. An unqualified collision returns `None` instead of inheriting
/// [`SubscriptionProvider::ALL`] ordering as an accidental routing policy.
#[must_use]
pub fn provider_for_model(
    model: &str,
    catalogs: &ModelCatalogCache,
) -> Option<SubscriptionProvider> {
    let providers = providers_for_model(model, catalogs);
    if providers.len() == 1 {
        return providers.first().copied();
    }
    provider_hint(model).filter(|provider| providers.contains(provider))
}

/// Resolve a model only when the owning subscription is available.
pub fn available_provider_for_model(
    model: &str,
    available: &[SubscriptionProvider],
    catalogs: &ModelCatalogCache,
) -> Result<SubscriptionProvider, ModelRouteError> {
    let advertised = providers_for_model(model, catalogs);
    if advertised.is_empty() {
        return Err(ModelRouteError::NotFound(format!(
            "model '{model}' is not advertised by any subscription"
        )));
    }
    let provider = provider_hint(model)
        .filter(|provider| advertised.contains(provider))
        .or_else(|| {
            let healthy = advertised
                .iter()
                .copied()
                .filter(|provider| available.contains(provider))
                .collect::<Vec<_>>();
            (healthy.len() == 1).then(|| healthy[0])
        })
        .or_else(|| (advertised.len() == 1).then(|| advertised[0]))
        .ok_or_else(|| {
            let providers = advertised
                .iter()
                .map(ToString::to_string)
                .collect::<Vec<_>>()
                .join(", ");
            ModelRouteError::Ambiguous(format!(
                "model '{model}' is advertised by multiple subscriptions ({providers}); pin \
                 UPSTREAM_PROVIDER to disambiguate"
            ))
        })?;
    available
        .contains(&provider)
        .then_some(provider)
        .ok_or_else(|| {
            ModelRouteError::NotFound(format!(
                "model '{model}' has no healthy {provider} credential"
            ))
        })
}

/// Readers whose credential can plausibly serve a request, refreshing an
/// expired on-disk token into the shared in-memory cache when possible.
///
/// `expiresAt` is treated as a *hint*, not a verdict, so a stamped-expired
/// credential remains available until an upstream call supplies stronger
/// evidence. A 401/403 from inference or live catalog discovery removes the
/// provider regardless of its local expiry timestamp.
pub async fn healthy_providers(
    client: &reqwest::Client,
    readers: &[SubscriptionReader],
    token_cache: &crate::refresh::TokenCache,
    now_ms: i64,
) -> Vec<SubscriptionProvider> {
    let checks = SubscriptionProvider::ALL
        .into_iter()
        .map(|provider| async move {
            let reader = readers
                .iter()
                .find(|reader| reader.provider() == provider)?;
            let disk_token = reader.read_token().ok()?;
            let token = token_cache
                .get_fresh(client, provider, disk_token, now_ms)
                .await;
            if token_cache.evidence(provider) == Some(crate::refresh::CredentialEvidence::Rejected)
            {
                tracing::debug!("{provider} credential was rejected upstream; not routable");
                return None;
            }
            if !token.is_expired(now_ms) {
                return Some(provider);
            }
            tracing::debug!(
                "{provider} credential is stamped expired and could not be refreshed; keeping it \
                 routable until an upstream rejects it"
            );
            Some(provider)
        });
    futures_util::future::join_all(checks)
        .await
        .into_iter()
        .flatten()
        .collect()
}

/// `OpenAI` list-shape union for all supplied subscription providers.
#[must_use]
pub fn model_catalog(providers: &[SubscriptionProvider], catalogs: &ModelCatalogCache) -> Value {
    let now = chrono::Utc::now().timestamp();
    // A provider is degraded when it has never discovered a live catalog or its
    // credential has stopped working. There is no bundled fallback to fall back
    // to any more (issue #192), so this reports missing coverage rather than
    // stale coverage.
    let degraded = providers
        .iter()
        .filter(|provider| catalogs.status(**provider).is_degraded())
        .map(|provider| provider.as_str())
        .collect::<Vec<_>>();
    let healthy_providers = providers
        .iter()
        .map(|provider| provider.as_str())
        .collect::<Vec<_>>();
    let data = providers
        .iter()
        .flat_map(|provider| {
            let owner = provider_owner(*provider);
            catalogs.models(*provider).into_iter().map(move |id| {
                json!({
                    "id": id,
                    "object": "model",
                    "created": now,
                    "owned_by": owner,
                })
            })
        })
        .collect::<Vec<_>>();
    json!({
        "object": "list",
        "data": data,
        // Retained for compatibility with clients that read it; the router no
        // longer ships a fallback catalog, so it is always false.
        "using_fallback": false,
        "degraded_providers": degraded,
        "healthy_providers": healthy_providers,
    })
}

/// Model catalog for one pinned subscription, empty when its credential is not healthy.
#[must_use]
pub async fn pinned_model_catalog(state: &AppState, provider: SubscriptionProvider) -> Value {
    let healthy = healthy_providers(
        &state.client,
        &state.subscription_readers,
        &state.subscription_cache,
        chrono::Utc::now().timestamp_millis(),
    )
    .await;
    if healthy.contains(&provider) {
        model_catalog(&[provider], &state.model_catalogs)
    } else {
        model_catalog(&[], &state.model_catalogs)
    }
}

/// `GET /v1/models` across automatic or explicitly pinned providers.
pub async fn models(State(state): State<AppState>, headers: HeaderMap) -> Response {
    if let Err(response) = crate::proxy::authenticate_client(&state, &headers) {
        return *response;
    }

    let models = match state.upstream_provider {
        UpstreamProvider::Auto => model_catalog(
            &healthy_providers(
                &state.client,
                &state.subscription_readers,
                &state.subscription_cache,
                chrono::Utc::now().timestamp_millis(),
            )
            .await,
            &state.model_catalogs,
        ),
        UpstreamProvider::Anthropic => {
            pinned_model_catalog(&state, SubscriptionProvider::Claude).await
        }
        UpstreamProvider::Gonka => state.gonka.as_ref().map_or_else(
            || crate::gonka::list_models(&crate::config::default_gonka_model()),
            |gonka| crate::gonka::list_models(&gonka.model),
        ),
        UpstreamProvider::Crater => crate::crater::list_models(),
        UpstreamProvider::Codex => pinned_model_catalog(&state, SubscriptionProvider::Codex).await,
        UpstreamProvider::Qwen => pinned_model_catalog(&state, SubscriptionProvider::Qwen).await,
        UpstreamProvider::Gemini => {
            pinned_model_catalog(&state, SubscriptionProvider::Gemini).await
        }
        UpstreamProvider::OpenAICompatible => {
            crate::provider_proxy::openai_compatible_models(&state)
        }
    };
    (StatusCode::OK, axum::Json(models)).into_response()
}

/// Consume an automatic Anthropic-surface request and return its concrete state.
pub async fn route_anthropic_request(
    state: &AppState,
    request: Request,
) -> Result<(AppState, Request), Response> {
    let path = request.uri().path().to_string();
    let (parts, body) = request.into_parts();
    let body_bytes = axum::body::to_bytes(body, state.max_proxy_request_bytes)
        .await
        .map_err(|error| {
            crate::proxy::error_response(
                StatusCode::PAYLOAD_TOO_LARGE,
                "invalid_request_error",
                &format!(
                    "request body exceeds the {} byte proxy limit: {error}",
                    state.max_proxy_request_bytes
                ),
            )
        })?;
    let routing_body = serde_json::from_slice(&body_bytes).map_err(|error| {
        crate::proxy::error_response(
            StatusCode::BAD_REQUEST,
            "invalid_request_error",
            &format!("Failed to parse request body as JSON: {error}"),
        )
    })?;
    let routed = if path.ends_with("/messages") || path.ends_with("/messages/count_tokens") {
        route_state(state, &routing_body)
            .await
            .map_err(|error| model_route_error_response(&error))?
    } else {
        route_provider(state, SubscriptionProvider::Claude)
            .await
            .map_err(|error| {
                crate::proxy::error_response(
                    StatusCode::BAD_REQUEST,
                    "invalid_request_error",
                    &error,
                )
            })?
    };
    Ok((routed, Request::from_parts(parts, Body::from(body_bytes))))
}

/// Resolve one provider only when its credential is currently healthy.
pub async fn route_provider(
    state: &AppState,
    provider: SubscriptionProvider,
) -> Result<AppState, String> {
    let healthy = healthy_providers(
        &state.client,
        &state.subscription_readers,
        &state.subscription_cache,
        chrono::Utc::now().timestamp_millis(),
    )
    .await;
    let reader = state
        .subscription_readers
        .iter()
        .find(|reader| reader.provider() == provider)
        .filter(|_| healthy.contains(&provider))
        .cloned()
        .ok_or_else(|| format!("no healthy {provider} credential is available"))?;

    let mut routed = state.clone();
    routed.upstream_provider = match provider {
        SubscriptionProvider::Claude => UpstreamProvider::Anthropic,
        SubscriptionProvider::Codex => UpstreamProvider::Codex,
        SubscriptionProvider::Gemini => UpstreamProvider::Gemini,
        SubscriptionProvider::Qwen => UpstreamProvider::Qwen,
    };
    if provider != SubscriptionProvider::Claude {
        routed.account_router = None;
        routed.subscription_reader = Some(reader);
    }
    Ok(routed)
}

/// Resolve an automatic state to the healthy subscription serving `model`.
pub async fn route_state(state: &AppState, body: &Value) -> Result<AppState, ModelRouteError> {
    if state.upstream_provider != UpstreamProvider::Auto {
        return Ok(state.clone());
    }
    let model = body
        .get("model")
        .and_then(Value::as_str)
        .filter(|model| !model.is_empty())
        .ok_or(ModelRouteError::ModelRequired)?;
    let provider = available_provider_for_model(
        model,
        &healthy_providers(
            &state.client,
            &state.subscription_readers,
            &state.subscription_cache,
            chrono::Utc::now().timestamp_millis(),
        )
        .await,
        &state.model_catalogs,
    )?;
    let mut routed = route_provider(state, provider).await.map_err(|_| {
        ModelRouteError::NotFound(format!(
            "model '{model}' has no healthy {provider} credential"
        ))
    })?;
    if provider != SubscriptionProvider::Claude {
        // The Anthropic bridge normally substitutes its provider default
        // because pinned clients name Claude models. Auto mode selected this
        // provider from the requested model itself, so preserve that exact id.
        routed.bridge_model = Some(model.to_string());
    }
    Ok(routed)
}

#[cfg(test)]
#[path = "model_routing_tests.rs"]
mod tests;
