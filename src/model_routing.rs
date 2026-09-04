//! Model catalog and automatic subscription-provider routing.

use axum::body::Body;
use axum::extract::{OriginalUri, Request, State};
use axum::http::{HeaderMap, StatusCode};
use axum::response::{IntoResponse, Response};
use serde_json::{Value, json};

use crate::app_state::AppState;
use crate::config::UpstreamProvider;
use crate::model_catalog::{CatalogRecord, ModelCatalogCache};
use crate::subscription::{SubscriptionProvider, SubscriptionReader};

/// Failure to resolve a request model in automatic provider mode.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ModelRouteError {
    /// The request did not identify a model to route.
    ModelRequired,
    /// The requested model is unknown or its owning provider is unavailable.
    NotFound(String),
    /// A live exact model id has more than one owning provider.
    Conflict(String),
}

#[path = "model_routing_snapshot.rs"]
pub(crate) mod snapshot;
#[cfg(test)]
pub(crate) use snapshot::route_subscription_model;
pub(crate) use snapshot::{
    RoutedState, ValidatedSubscription, route_pinned_subscription,
    route_subscription_model_for_providers,
};

#[path = "model_routing_catalog_snapshot.rs"]
mod catalog_snapshot;
pub(crate) use catalog_snapshot::ConfiguredCatalogSnapshot;

impl std::fmt::Display for ModelRouteError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::ModelRequired => {
                formatter.write_str("model is required when UPSTREAM_PROVIDER=auto")
            }
            Self::NotFound(message) | Self::Conflict(message) => formatter.write_str(message),
        }
    }
}

/// Convert an automatic-routing failure into the public API error shape.
pub(crate) fn model_route_error_response(error: &ModelRouteError) -> Response {
    let (status, error_type) = match error {
        ModelRouteError::ModelRequired => (StatusCode::BAD_REQUEST, "invalid_request_error"),
        ModelRouteError::Conflict(_) => (StatusCode::CONFLICT, "invalid_provider_state"),
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

fn providers_for_model(model: &str, catalogs: &ModelCatalogCache) -> Vec<SubscriptionProvider> {
    SubscriptionProvider::ALL
        .into_iter()
        .filter(|provider| catalogs.models(*provider).iter().any(|id| id == model))
        .collect()
}

/// Preserve one exact live model id.
///
/// Provider-qualified strings were formerly interpreted as Router aliases.
/// They now remain ordinary exact ids and resolve only when a provider's live
/// catalog returned that exact string.
pub(crate) const fn subscription_model_identity(
    model: &str,
) -> (Option<SubscriptionProvider>, &str) {
    (None, model)
}

/// Return the unambiguous provider whose last known live catalog owns a model id.
///
/// An unqualified collision returns `None` instead of guessing ownership from
/// a familiar-looking name or [`SubscriptionProvider::ALL`] order.
#[must_use]
pub fn provider_for_model(
    model: &str,
    catalogs: &ModelCatalogCache,
) -> Option<SubscriptionProvider> {
    let providers = providers_for_model(model, catalogs);
    (providers.len() == 1).then(|| providers[0])
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
    if !catalogs.provider_is_degraded(provider) {
        return None;
    }
    let status = catalogs.status(provider);
    Some(match (status.discovered, status.last_error) {
        (true, _) => format!(
            "the {provider} catalog is retained for diagnostics but its credential is not usable"
        ),
        (false, Some(_)) => {
            format!("{provider} has never completed a live catalog discovery")
        }
        (false, None) => format!("no {provider} credential has been read yet"),
    })
}

/// Every credential state worth reporting for a model that nothing advertises.
///
/// Report each observed provider problem without inferring ownership from a
/// model's spelling. A future vendor can adopt any identifier shape, so names
/// carry no routing or diagnostic authority.
fn credential_states(_model: &str, catalogs: &ModelCatalogCache) -> Vec<String> {
    SubscriptionProvider::ALL
        .into_iter()
        .filter(|provider| catalogs.provider_has_observation(*provider))
        .filter_map(|provider| credential_state(provider, catalogs))
        .collect()
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
    let provider = (advertised.len() == 1)
        .then(|| advertised[0])
        .ok_or_else(|| {
            let providers = advertised
                .iter()
                .map(ToString::to_string)
                .collect::<Vec<_>>()
                .join(", ");
            ModelRouteError::Conflict(format!(
                "exact model id '{model}' is advertised by multiple subscriptions ({providers})"
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
    token_cache.register_readers(crate::credential_recovery_store::PRIMARY_ACCOUNT, readers);
    let checks = SubscriptionProvider::ALL
        .into_iter()
        .map(|provider| async move {
            readers
                .iter()
                .find(|reader| reader.provider() == provider)?;
            let token = token_cache
                .get_fresh_registered(
                    client,
                    provider,
                    crate::credential_recovery_store::PRIMARY_ACCOUNT,
                    now_ms,
                )
                .await
                .ok()?;
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
/// One answer, computed once, for every surface that reports health:
/// `/api/health`, `/api/services/*/v1/models` and `/api/management/metrics`
/// disagreed about a revoked subscription because
/// each derived its own view, and the only one that was truthful was an error
/// message a client saw after a request had already failed (issue #318).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ProviderHealth {
    /// The subscription this describes.
    pub provider: SubscriptionProvider,
    /// Whether it can serve a request now.
    pub healthy: bool,
    /// Operator-facing reason, when it cannot.
    ///
    /// May name a credential path, so it belongs in a log or behind an admin
    /// credential — never on an unauthenticated endpoint. OAuth response bodies
    /// are discarded before a reason reaches this report (issue #430).
    pub reason: Option<String>,
    /// The same verdict, safe to hand an unauthenticated caller.
    pub summary: Option<&'static str>,
}

/// Internal lifecycle report preserving explicit startup semantics without
/// changing the patch-release public [`ProviderHealth`] construction API.
#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) struct ProviderHealthReport {
    pub provider: SubscriptionProvider,
    pub state: ProviderHealthState,
    pub reason: Option<String>,
    pub summary: Option<&'static str>,
}

impl ProviderHealthReport {
    #[must_use]
    pub const fn is_degraded(&self) -> bool {
        matches!(self.state, ProviderHealthState::Degraded)
    }

    #[must_use]
    pub const fn is_serving(&self) -> bool {
        !self.is_degraded()
    }
}

/// Health for every subscription that is actually configured on this
/// deployment.
///
/// A provider whose reader finds no credential is not reported at all:
/// "claude was never configured here" and "claude is currently unavailable"
/// must not render identically, which is precisely the ambiguity that let a
/// dead subscription hide behind an absence (issue #318).
#[must_use]
pub fn configured_provider_health(
    readers: &[SubscriptionReader],
    token_cache: &crate::refresh::TokenCache,
    catalogs: &ModelCatalogCache,
) -> Vec<ProviderHealth> {
    SubscriptionProvider::ALL
        .into_iter()
        .filter(|provider| readers.iter().any(|reader| reader.provider() == *provider))
        .map(|provider| {
            let rejected = token_cache.evidence(provider)
                == Some(crate::refresh::CredentialEvidence::Rejected);
            let status = catalogs.status(provider);
            let reason =
                if rejected {
                    Some(token_cache.last_refresh_error(provider).unwrap_or_else(|| {
                        format!("the {provider} credential was rejected upstream")
                    }))
                } else if status.discovered && !status.credential_healthy {
                    credential_state(provider, catalogs)
                } else {
                    None
                };
            ProviderHealth {
                provider,
                healthy: reason.is_none(),
                reason,
                summary: rejected
                    .then_some("the credential was rejected upstream and needs re-authentication"),
            }
        })
        .collect()
}

fn account_health(
    provider: SubscriptionProvider,
    account: &str,
    credential: Result<Option<crate::subscription::SubscriptionToken>, String>,
    token_cache: &crate::refresh::TokenCache,
    catalogs: &ModelCatalogCache,
) -> Option<ProviderHealthReport> {
    let token = match credential {
        Ok(Some(token)) => token,
        Ok(None) => return None,
        Err(error) => {
            return Some(ProviderHealthReport {
                provider,
                state: ProviderHealthState::Degraded,
                reason: Some(error),
                summary: Some("the configured credential could not be read"),
            });
        }
    };
    let rejected = token_cache.evidence_for(provider, account)
        == Some(crate::refresh::CredentialEvidence::Rejected);
    let status = catalogs.status_for(provider, account);
    let account_matches = match (token.account_id.as_deref(), status.account.as_deref()) {
        (Some(current), Some(discovered)) => current == discovered,
        (None, None) => true,
        _ => false,
    };
    let (state, reason, summary) = if rejected {
        (
            ProviderHealthState::Degraded,
            Some(
                token_cache
                    .last_refresh_error_for(provider, account)
                    .unwrap_or_else(|| format!("the {provider} credential was rejected upstream")),
            ),
            Some("the credential was rejected upstream and needs re-authentication"),
        )
    } else if !account_matches {
        (ProviderHealthState::Starting, None, None)
    } else if status.discovered && !status.credential_healthy {
        (
            ProviderHealthState::Degraded,
            Some(format!("the {provider} catalog credential is not usable")),
            Some("the credential was rejected upstream and needs re-authentication"),
        )
    } else if status.discovered {
        (ProviderHealthState::Healthy, None, None)
    } else {
        (ProviderHealthState::Starting, None, None)
    };
    Some(ProviderHealthReport {
        provider,
        state,
        reason,
        summary,
    })
}

/// Recovery-aware lifecycle health for every configured provider.
async fn configured_account_health_report(state: &AppState) -> Vec<(String, ProviderHealthReport)> {
    let checks = SubscriptionProvider::ALL
        .into_iter()
        .map(|provider| async move {
            let accounts = state
                .account_router
                .as_ref()
                .filter(|router| router.provider() == provider)
                .map_or_else(
                    || {
                        state
                            .subscription_readers
                            .iter()
                            .find(|reader| reader.provider() == provider)
                            .map(|reader| {
                                state.subscription_cache.register_reader(
                                    crate::credential_recovery_store::PRIMARY_ACCOUNT,
                                    reader,
                                );
                                vec![crate::credential_recovery_store::PRIMARY_ACCOUNT.to_string()]
                            })
                            .unwrap_or_default()
                    },
                    |router| {
                        router
                            .subscription_readers()
                            .into_iter()
                            .map(|(account, _)| account)
                            .collect()
                    },
                );
            let mut reports = Vec::new();
            for account in accounts {
                let credential = state
                    .subscription_cache
                    .load_authoritative(provider, &account)
                    .await;
                if let Some(report) = account_health(
                    provider,
                    &account,
                    credential,
                    &state.subscription_cache,
                    &state.model_catalogs,
                ) {
                    reports.push((account, report));
                }
            }
            reports
        });
    futures_util::future::join_all(checks)
        .await
        .into_iter()
        .flatten()
        .collect()
}

fn aggregate_provider_health(
    accounts: &[(String, ProviderHealthReport)],
) -> Vec<ProviderHealthReport> {
    SubscriptionProvider::ALL
        .into_iter()
        .filter_map(|provider| {
            let reports = accounts
                .iter()
                .map(|(_, report)| report)
                .filter(|report| report.provider == provider)
                .collect::<Vec<_>>();
            if reports.is_empty() {
                return None;
            }
            let state = if reports
                .iter()
                .any(|report| report.state == ProviderHealthState::Healthy)
            {
                ProviderHealthState::Healthy
            } else if reports
                .iter()
                .any(|report| report.state == ProviderHealthState::Starting)
            {
                ProviderHealthState::Starting
            } else {
                ProviderHealthState::Degraded
            };
            let degraded = reports
                .iter()
                .find(|report| report.state == ProviderHealthState::Degraded);
            Some(ProviderHealthReport {
                provider,
                state,
                reason: degraded.and_then(|report| report.reason.clone()),
                summary: degraded.and_then(|report| report.summary),
            })
        })
        .collect()
}

/// Recovery-aware lifecycle health for every configured provider.
pub(crate) async fn configured_provider_health_report(
    state: &AppState,
) -> Vec<ProviderHealthReport> {
    aggregate_provider_health(&configured_account_health_report(state).await)
}

/// Resolve health and the corresponding account-filtered model union once.
pub(crate) async fn configured_catalog_snapshot(state: &AppState) -> ConfiguredCatalogSnapshot {
    let accounts = configured_account_health_report(state).await;
    let model_accounts = SubscriptionProvider::ALL
        .into_iter()
        .map(|provider| {
            let healthy_accounts = accounts
                .iter()
                .filter(|(_, report)| {
                    report.provider == provider && report.state == ProviderHealthState::Healthy
                })
                .map(|(account, _)| account.clone())
                .collect::<Vec<_>>();
            (provider, healthy_accounts)
        })
        .collect::<Vec<_>>();
    let models = model_accounts
        .iter()
        .map(|(provider, accounts)| {
            (
                *provider,
                state
                    .model_catalogs
                    .models_for_accounts(*provider, accounts),
            )
        })
        .collect();
    let records = model_accounts
        .iter()
        .map(|(provider, accounts)| {
            (
                *provider,
                state
                    .model_catalogs
                    .records_for_accounts(*provider, accounts),
            )
        })
        .collect();
    ConfiguredCatalogSnapshot {
        health: aggregate_provider_health(&accounts),
        models,
        records,
    }
}

/// `OpenAI` list-shape union for all supplied subscription providers.
#[must_use]
pub fn model_catalog(providers: &[SubscriptionProvider], catalogs: &ModelCatalogCache) -> Value {
    model_catalog_with(providers, catalogs, |provider| catalogs.records(provider))
}

fn model_catalog_with(
    providers: &[SubscriptionProvider],
    catalogs: &ModelCatalogCache,
    records: impl Fn(SubscriptionProvider) -> Vec<CatalogRecord>,
) -> Value {
    // A provider is degraded when it has never discovered a live catalog or its
    // credential has stopped working. There is no bundled fallback to fall back
    // to any more (issue #192), so this reports missing coverage rather than
    // stale coverage.
    let degraded = providers
        .iter()
        .filter(|provider| catalogs.provider_is_degraded(**provider))
        .map(|provider| provider.as_str())
        .collect::<Vec<_>>();
    let healthy_providers = providers
        .iter()
        .filter(|provider| !catalogs.provider_is_degraded(**provider))
        .map(|provider| provider.as_str())
        .collect::<Vec<_>>();
    let records = providers
        .iter()
        .flat_map(|provider| records(*provider))
        .collect::<Vec<_>>();
    let mut seen_provider_ids = std::collections::HashSet::new();
    let records = records
        .into_iter()
        .filter(|record| seen_provider_ids.insert((record.provider, record.canonical_id.clone())))
        .collect::<Vec<_>>();
    let mut counts = std::collections::HashMap::new();
    for record in &records {
        *counts.entry(record.canonical_id.clone()).or_insert(0_usize) += 1;
    }
    let mut conflicts = counts
        .iter()
        .filter(|(_, count)| **count > 1)
        .map(|(id, _)| id.clone())
        .collect::<Vec<_>>();
    conflicts.sort();
    let data = records
        .into_iter()
        .filter(|record| counts.get(&record.canonical_id).copied() == Some(1))
        .map(|record| {
            let exposed_id = record.canonical_id.clone();
            let mut projected = record.raw;
            projected.insert("id".into(), Value::String(exposed_id));
            projected.insert(
                "canonical_id".into(),
                Value::String(record.canonical_id.clone()),
            );
            projected.insert(
                "provider".into(),
                Value::String(record.provider.as_str().to_string()),
            );
            projected
                .entry("object")
                .or_insert_with(|| Value::String("model".into()));
            projected
                .entry("created")
                .or_insert_with(|| Value::from(record.fetched_at));
            projected
                .entry("owned_by")
                .or_insert_with(|| Value::String(provider_owner(record.provider).to_string()));
            Value::Object(projected)
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
        "catalog_conflicts": conflicts,
    })
}

fn catalog_conflict(catalog: &Value) -> Option<ModelRouteError> {
    let ids = catalog
        .get("catalog_conflicts")
        .and_then(Value::as_array)
        .filter(|ids| !ids.is_empty())?;
    Some(ModelRouteError::Conflict(format!(
        "exact model id collision across healthy providers: {}",
        ids.iter()
            .filter_map(Value::as_str)
            .collect::<Vec<_>>()
            .join(", ")
    )))
}

/// Model catalog for one pinned subscription, empty when its credential is not healthy.
#[must_use]
pub async fn pinned_model_catalog(state: &AppState, provider: SubscriptionProvider) -> Value {
    let snapshot = configured_catalog_snapshot(state).await;
    let health = snapshot
        .health()
        .iter()
        .filter(|entry| entry.provider == provider)
        .cloned()
        .collect::<Vec<_>>();
    let mut catalog = if health
        .first()
        .is_some_and(|entry| entry.state == ProviderHealthState::Healthy)
    {
        model_catalog_with(&[provider], &state.model_catalogs, |provider| {
            snapshot.records(provider)
        })
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
fn merge_configured_degradation(health: &[ProviderHealthReport], catalog: &mut Value) {
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
        // The summary, not the reason: service model catalogs answer client tokens,
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

fn principal_catalog_records(
    state: &AppState,
    provider: SubscriptionProvider,
    accounts: &[String],
) -> Vec<CatalogRecord> {
    if accounts.iter().any(|account| {
        state.subscription_cache.evidence_for(provider, account)
            == Some(crate::refresh::CredentialEvidence::Rejected)
    }) {
        Vec::new()
    } else {
        state
            .model_catalogs
            .records_for_accounts(provider, accounts)
    }
}

#[path = "model_routing_models.rs"]
mod models_handler;
pub use models_handler::{aggregate_models, models};

#[path = "model_routing_aggregate.rs"]
mod aggregate;

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
    route_anthropic_request_with_subscription_for_providers(
        state,
        request,
        &SubscriptionProvider::ALL,
    )
    .await
}

pub(crate) async fn route_anthropic_request_with_subscription_for_providers(
    state: &AppState,
    request: Request,
    entitled_providers: &[SubscriptionProvider],
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
        let claims = crate::proxy::authenticate_client(state, &parts.headers)
            .map_err(|response| *response)?;
        let client = crate::client_policy::bound_client(&claims)
            .map(|(client, _)| client)
            .map_err(|error| {
                crate::proxy::error_response(StatusCode::FORBIDDEN, "permission_error", &error)
            })?;
        route_state_with_subscription_for_client(
            state,
            &routing_body,
            entitled_providers,
            Some(client),
            crate::zai_coding_plan::authorize_automatic_discovery(
                state,
                &claims,
                &parts.headers,
                crate::client_policy::ClientProtocol::AnthropicMessages,
                &path,
            ),
        )
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
#[path = "model_routing_stored.rs"]
mod stored;
pub use stored::bare_model_id;
use stored::{
    append_stored_provider_models, append_zai_models, route_stored_provider,
    stored_provider_for_model,
};

#[path = "model_routing_state.rs"]
mod state_routing;
pub use state_routing::route_state;
#[allow(unused_imports)]
pub(crate) use state_routing::{
    route_state_with_subscription, route_state_with_subscription_for_client,
    route_state_with_subscription_for_providers,
};

#[cfg(test)]
#[path = "model_routing_health_tests.rs"]
mod health_tests;
#[cfg(test)]
#[path = "model_routing_pool_tests.rs"]
mod pool_tests;
#[cfg(test)]
#[path = "model_routing_recovery_tests.rs"]
mod recovery_tests;
#[cfg(test)]
#[path = "model_routing_snapshot_tests.rs"]
mod snapshot_tests;
#[cfg(test)]
#[path = "model_routing_tests.rs"]
pub(crate) mod tests;

#[cfg(test)]
#[path = "model_routing_evidence_tests.rs"]
mod evidence_tests;

#[cfg(test)]
#[path = "model_routing_provider_tests.rs"]
mod provider_tests;
