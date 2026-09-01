//! Model catalog and automatic subscription-provider routing.

use axum::body::Body;
use axum::extract::{Request, State};
use axum::http::{HeaderMap, StatusCode};
use axum::response::{IntoResponse, Response};
use serde_json::{Value, json};

use crate::app_state::AppState;
use crate::config::UpstreamProvider;
use crate::model_catalog::ModelCatalogCache;
use crate::subscription::{SubscriptionError, SubscriptionProvider, SubscriptionReader};

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

#[path = "model_routing_snapshot.rs"]
pub(crate) mod snapshot;
pub(crate) use snapshot::{
    RoutedState, ValidatedSubscription, route_pinned_subscription, route_subscription_model,
};

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

/// Refuse a model the catalog does not hold, naming the ids that it does.
///
/// The same rule as [`available_provider_for_model`]: the component refusing
/// the request is holding the answer, and saying nothing turns a typo into a
/// dead end (issue #323).
pub(crate) fn model_not_found_response(model: &str, catalog: &[String]) -> Response {
    let detail = if catalog.is_empty() {
        String::new()
    } else {
        format!("; this deployment advertises: {}", advertised_list(catalog))
    };
    model_route_error_response(&ModelRouteError::NotFound(format!(
        "model '{model}' is not available{detail}"
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

/// Describe why a provider currently contributes nothing to the catalog.
///
/// An empty catalog is almost always a credential problem, so "not advertised
/// by any subscription" on its own reads like a typo in the model id and sends
/// operators looking in the wrong place (issue #239). `None` means the
/// provider is fine and some other reason applies.
fn credential_state(
    provider: SubscriptionProvider,
    catalogs: &ModelCatalogCache,
) -> Option<String> {
    let status = catalogs.status(provider);
    if !status.is_degraded() {
        return None;
    }
    Some(match (status.discovered, status.last_error) {
        (true, error) => format!(
            "the {provider} catalog is retained for diagnostics but its credential is not usable \
             ({})",
            error.unwrap_or_else(|| "the last refresh was rejected".to_string())
        ),
        (false, Some(error)) => {
            format!("{provider} has never completed a live catalog discovery ({error})")
        }
        (false, None) => format!("no {provider} credential has been read yet"),
    })
}

/// Every credential state worth reporting for a model that nothing advertises.
///
/// A vendor-shaped model id blames its own vendor; an unqualified one reports
/// each provider that has actually recorded a problem, and stays quiet about
/// providers that were simply never configured.
fn credential_states(model: &str, catalogs: &ModelCatalogCache) -> Vec<String> {
    provider_hint(model).map_or_else(
        || {
            SubscriptionProvider::ALL
                .into_iter()
                .filter(|provider| {
                    let status = catalogs.status(*provider);
                    status.discovered || status.last_error.is_some()
                })
                .filter_map(|provider| credential_state(provider, catalogs))
                .collect()
        },
        |provider| credential_state(provider, catalogs).into_iter().collect(),
    )
}

/// Resolve a model only when the owning subscription is available.
/// How many model ids a refusal names before it summarises instead.
///
/// Long enough to be the whole catalog on an ordinary deployment, short enough
/// that the message stays readable in a log line.
const ADVERTISED_IN_ERRORS: usize = 24;

/// The ids this deployment would have accepted, for a refusal to name.
///
/// Invents nothing and consults no table: this is the live catalog the router
/// already fetched, which is what keeps it inside the rule issue #192 set when
/// it deleted the bundled model list (issue #323).
fn advertised_detail(available: &[SubscriptionProvider], catalogs: &ModelCatalogCache) -> String {
    let mut ids = available
        .iter()
        .flat_map(|provider| catalogs.models(*provider))
        .collect::<Vec<_>>();
    ids.sort_unstable();
    ids.dedup();
    if ids.is_empty() {
        return String::new();
    }
    format!("; this deployment advertises: {}", advertised_list(&ids))
}

/// The ids, capped so one wrong name cannot produce an unbounded log line.
fn advertised_list(ids: &[String]) -> String {
    if ids.len() > ADVERTISED_IN_ERRORS {
        let shown = ids[..ADVERTISED_IN_ERRORS].join(", ");
        let rest = ids.len() - ADVERTISED_IN_ERRORS;
        return format!("{shown} and {rest} more");
    }
    ids.join(", ")
}

pub fn available_provider_for_model(
    model: &str,
    available: &[SubscriptionProvider],
    catalogs: &ModelCatalogCache,
) -> Result<SubscriptionProvider, ModelRouteError> {
    let advertised = providers_for_model(model, catalogs);
    if advertised.is_empty() {
        let causes = credential_states(model, catalogs);
        // Credential causes when there are any (issue #239), and otherwise the
        // catalog itself. With healthy credentials and a wrong id, `causes` is
        // empty and the bare sentence withheld the one fact that resolves the
        // error — held, at that moment, by the component refusing the request
        // (issue #323).
        let detail = if causes.is_empty() {
            advertised_detail(available, catalogs)
        } else {
            format!(": {}", causes.join("; "))
        };
        return Err(ModelRouteError::NotFound(format!(
            "model '{model}' is not advertised by any subscription{detail}"
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
            let cause = credential_state(provider, catalogs).unwrap_or_else(|| {
                format!(
                    "the last credential check found no usable {provider} credential (missing or \
                     rejected upstream)"
                )
            });
            ModelRouteError::NotFound(format!(
                "model '{model}' has no healthy {provider} credential: {cause}"
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

/// The lifecycle state of a configured subscription credential.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ProviderHealthState {
    /// The credential is readable, but no live catalog has completed yet.
    Starting,
    /// Live discovery succeeded and the credential remains usable.
    Healthy,
    /// The credential cannot be read or current evidence says it cannot serve.
    Degraded,
}

/// Whether a configured subscription can serve requests right now, and why not.
///
/// One answer, computed once, for every surface that reports health: `/health`,
/// `/v1/models` and `/metrics` disagreed about a revoked subscription because
/// each derived its own view, and the only one that was truthful was an error
/// message a client saw after a request had already failed (issue #318).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ProviderHealth {
    /// The subscription this describes.
    pub provider: SubscriptionProvider,
    /// The explicit credential and discovery state.
    pub state: ProviderHealthState,
    /// Operator-facing reason, when it cannot.
    ///
    /// May name a credential path or an upstream body, so it belongs in a log
    /// or behind an admin credential — never on an unauthenticated endpoint.
    pub reason: Option<String>,
    /// The same verdict, safe to hand an unauthenticated caller.
    pub summary: Option<&'static str>,
}

impl ProviderHealth {
    /// Whether this provider requires operator attention.
    #[must_use]
    pub const fn is_degraded(&self) -> bool {
        matches!(self.state, ProviderHealthState::Degraded)
    }

    /// Compatibility verdict for routing metrics: startup is non-paging.
    #[must_use]
    pub const fn is_serving(&self) -> bool {
        !self.is_degraded()
    }
}

/// Health for every subscription that is actually configured on this
/// deployment.
///
/// A provider whose reader finds no credential is not reported at all:
/// "claude was never configured here" and "claude died twelve hours ago" must
/// not render identically, which is precisely the ambiguity that let a dead
/// subscription hide behind an absence (issue #318).
#[must_use]
pub fn configured_provider_health(
    readers: &[SubscriptionReader],
    token_cache: &crate::refresh::TokenCache,
    catalogs: &ModelCatalogCache,
) -> Vec<ProviderHealth> {
    SubscriptionProvider::ALL
        .into_iter()
        .filter_map(|provider| {
            let reader = readers
                .iter()
                .find(|reader| reader.provider() == provider)?;
            let credential = match reader.read_token() {
                Ok(token) => Ok(token),
                Err(SubscriptionError::NoCredentials(_)) => return None,
                Err(error) => Err(error.to_string()),
            };
            let rejected = token_cache.evidence(provider)
                == Some(crate::refresh::CredentialEvidence::Rejected);
            let status = catalogs.status(provider);
            let account_matches = credential.as_ref().is_ok_and(|token| {
                match (token.account_id.as_deref(), status.account.as_deref()) {
                    (Some(current), Some(discovered)) => current == discovered,
                    // Some providers expose no stable account id. When both
                    // sides are anonymous, the discovery is the best evidence
                    // available and remains compatible. A one-sided identity
                    // is not enough to prove the catalog belongs to the
                    // current credential, so discovery must run again.
                    (None, None) => true,
                    _ => false,
                }
            });
            let (state, reason, summary) = if let Err(error) = credential {
                (
                    ProviderHealthState::Degraded,
                    Some(error),
                    Some("the configured credential could not be read"),
                )
            } else if rejected {
                (
                    ProviderHealthState::Degraded,
                    Some(token_cache.last_refresh_error(provider).unwrap_or_else(|| {
                        format!("the {provider} credential was rejected upstream")
                    })),
                    Some("the credential was rejected upstream and needs re-authentication"),
                )
            } else if !account_matches {
                // Provider-wide catalog evidence belongs to the credential
                // account that produced it. A newly readable known account is
                // starting until its own live discovery completes; retaining
                // the previous account's models would cross that boundary.
                (ProviderHealthState::Starting, None, None)
            } else if status.discovered && !status.credential_healthy {
                (
                    ProviderHealthState::Degraded,
                    credential_state(provider, catalogs),
                    Some("the credential was rejected upstream and needs re-authentication"),
                )
            } else if status.discovered && status.credential_healthy {
                (ProviderHealthState::Healthy, None, None)
            } else {
                // A provider that has not yet completed its first live
                // discovery is *starting*, not dead. Reporting it degraded
                // would fire a page on every cold start and on any transient
                // catalog-endpoint failure — an alert that cries wolf is the
                // same failure as one that never fires (issue #318).
                (ProviderHealthState::Starting, None, None)
            };
            Some(ProviderHealth {
                provider,
                state,
                reason,
                // A credential path, an account id or an endpoint body can all
                // reach `reason` through `last_refresh_error`. That is right
                // for an operator reading a log or an admin-gated listing, and
                // wrong for an endpoint a monitor polls without a credential,
                // so the public summary is derived rather than passed through
                // (issues #318, and the disclosure rule #300 set).
                summary,
            })
        })
        .collect()
}

/// Keep only providers whose readable credential owns their live catalog.
///
/// A readable token is enough to attempt first discovery, but an existing
/// catalog can advertise or route models only for the account that produced
/// it. Every model surface uses this boundary so listing and inference cannot
/// disagree after credential rotation.
#[must_use]
pub(crate) fn providers_with_healthy_catalogs(
    routable: Vec<SubscriptionProvider>,
    health: &[ProviderHealth],
) -> Vec<SubscriptionProvider> {
    routable
        .into_iter()
        .filter(|provider| {
            health.iter().any(|entry| {
                entry.provider == *provider && entry.state == ProviderHealthState::Healthy
            })
        })
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
        .filter(|provider| !catalogs.status(**provider).is_degraded())
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
    let routable = healthy_providers(
        &state.client,
        &state.subscription_readers,
        &state.subscription_cache,
        chrono::Utc::now().timestamp_millis(),
    )
    .await;
    let health = configured_provider_health(
        &state.subscription_readers,
        &state.subscription_cache,
        &state.model_catalogs,
    )
    .into_iter()
    .filter(|entry| entry.provider == provider)
    .collect::<Vec<_>>();
    let mut catalog = if routable.contains(&provider)
        && health
            .first()
            .is_some_and(|entry| entry.state == ProviderHealthState::Healthy)
    {
        model_catalog(&[provider], &state.model_catalogs)
    } else {
        model_catalog(&[], &state.model_catalogs)
    };
    merge_configured_degradation(&health, &mut catalog);
    catalog
}

/// Add every configured-but-unusable subscription to `degraded_providers`.
///
/// Reported with a fixed public reason, so a client can distinguish degradation
/// without receiving a credential path or upstream response body (issue #318).
fn merge_configured_degradation(health: &[ProviderHealth], catalog: &mut Value) {
    let mut degraded = catalog
        .get("degraded_providers")
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default();
    let mut reasons = serde_json::Map::new();
    for entry in health.iter().filter(|entry| entry.is_degraded()) {
        let name = Value::from(entry.provider.as_str());
        if !degraded.contains(&name) {
            degraded.push(name);
        }
        // The summary, not the reason: `/v1/models` answers any client token,
        // and a credential path is not a client's business.
        if let Some(summary) = entry.summary {
            reasons.insert(entry.provider.as_str().to_string(), Value::from(summary));
        }
    }
    if let Some(object) = catalog.as_object_mut() {
        object.insert("degraded_providers".into(), Value::Array(degraded));
        object.insert("degraded_reasons".into(), Value::Object(reasons));
    }
}

/// `GET /v1/models` across automatic or explicitly pinned providers.
pub async fn models(State(state): State<AppState>, headers: HeaderMap) -> Response {
    if let Err(response) = crate::proxy::authenticate_client(&state, &headers) {
        return *response;
    }

    let models = match state.upstream_provider {
        UpstreamProvider::Auto => {
            let routable = healthy_providers(
                &state.client,
                &state.subscription_readers,
                &state.subscription_cache,
                chrono::Utc::now().timestamp_millis(),
            )
            .await;
            let health = configured_provider_health(
                &state.subscription_readers,
                &state.subscription_cache,
                &state.model_catalogs,
            );
            let healthy = providers_with_healthy_catalogs(routable, &health);
            let mut catalog = model_catalog(&healthy, &state.model_catalogs);
            // A revoked subscription is filtered out before `model_catalog`
            // ever sees it, so it could never reach `degraded_providers` and
            // simply vanished from `data`. Absence is not an alert: a monitor
            // cannot tell it from a provider that was never configured here
            // (issue #318).
            merge_configured_degradation(&health, &mut catalog);
            append_stored_provider_models(&state, &mut catalog);
            catalog
        }
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
    route_anthropic_request_with_subscription(state, request)
        .await
        .map(|(routed, request)| (routed.state, request))
}

pub(crate) async fn route_anthropic_request_with_subscription(
    state: &AppState,
    request: Request,
) -> Result<(RoutedState, Request), Response> {
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
        route_state_with_subscription(state, &routing_body)
            .await
            .map_err(|error| model_route_error_response(&error))?
    } else {
        route_pinned_subscription(state, SubscriptionProvider::Claude)
            .await
            .map_err(|error| {
                crate::proxy::error_response(
                    StatusCode::BAD_REQUEST,
                    "invalid_request_error",
                    &error.to_string(),
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
/// Add every stored provider's declared models to an automatic catalog.
///
/// One token should reach every model the router can serve, so a stored
/// provider's declarations belong in the same listing as the discovered
/// subscription catalogs (issue #260). Declared models are stated by the
/// operator rather than discovered, so they are listed without disturbing the
/// `degraded_providers` reporting, which describes credential discovery.
fn append_stored_provider_models(state: &AppState, catalog: &mut Value) {
    let Ok(providers) = state.provider_store.list() else {
        return;
    };
    let Some(data) = catalog.get_mut("data").and_then(Value::as_array_mut) else {
        return;
    };
    for provider in providers.iter().filter(|record| record.enabled) {
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
fn stored_provider_for_model(
    state: &AppState,
    model: &str,
) -> Result<Option<crate::providers::ResolvedProvider>, ModelRouteError> {
    if let Some((name, bare)) = model.split_once('/') {
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
        .filter(|record| record.enabled && record.models.iter().any(|id| id == model))
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
fn route_stored_provider(
    state: &AppState,
    provider: &crate::providers::ResolvedProvider,
    model: &str,
) -> AppState {
    let mut routed = state.clone();
    routed.upstream_provider = UpstreamProvider::OpenAICompatible;
    routed
        .openai_compatible
        .provider_name
        .clone_from(&provider.name);
    // A qualified name addressed the provider; the upstream only knows the
    // bare id, so forward what it will recognise.
    routed.bridge_model = Some(bare_model_id(model).to_string());
    routed
}

/// The model id an upstream will recognise, with any `<provider>/` prefix
/// removed.
#[must_use]
pub fn bare_model_id(model: &str) -> &str {
    model.split_once('/').map_or(model, |(_, bare)| bare)
}

pub(crate) async fn route_state_with_subscription(
    state: &AppState,
    body: &Value,
) -> Result<RoutedState, ModelRouteError> {
    if state.upstream_provider != UpstreamProvider::Auto {
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
    // Stored providers are consulted first: a declared model is an explicit
    // operator statement, while a subscription catalog is discovered.
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

#[cfg(test)]
#[path = "model_routing_tests.rs"]
mod tests;

#[cfg(test)]
#[path = "model_routing_health_tests.rs"]
mod health_tests;

#[cfg(test)]
#[path = "model_routing_snapshot_tests.rs"]
mod snapshot_tests;

#[cfg(test)]
#[path = "model_routing_pool_tests.rs"]
mod pool_tests;

#[cfg(test)]
#[path = "model_routing_recovery_tests.rs"]
mod recovery_tests;
