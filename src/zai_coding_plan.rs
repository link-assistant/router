//! Policy and exact model registry for the experimental z.ai GLM Coding Plan.
//!
//! Coding Plan is deliberately not treated as a generic OpenAI-compatible
//! credential. Its personal subscription is bound to one subscriber and to
//! named end-user tools; use through Router remains disabled until the
//! operator acknowledges the intermediary-proxy risk (issue #390).

use crate::client_policy::ClientProtocol;
use crate::clients::ClientKind;
use crate::providers::{CachedProviderCatalog, LiveProviderModel};
use crate::providers::{ProviderKind, ResolvedProvider};
use sha2::{Digest as _, Sha256};
use std::collections::HashSet;
use std::time::{Duration, Instant};

/// Documented base path for native Anthropic Messages traffic.
pub const ANTHROPIC_BASE_PATH: &str = "/api/anthropic";
/// Documented base path for `OpenAI Chat Completions` traffic.
pub const CHAT_BASE_PATH: &str = "/api/coding/paas/v4";
/// Documented base path for `OpenAI Responses` traffic.
pub const RESPONSES_BASE_PATH: &str = "/api/v1";
/// Documented, non-inference quota operation used for health checks.
pub const HEALTH_PATH: &str = "/api/monitor/usage/quota/limit";
/// Authenticated non-inference catalog used as the model source of truth.
pub const CATALOG_PATH: &str = "/api/anthropic/v1/models";

const CATALOG_TTL: Duration = Duration::from_secs(5 * 60);
const FAILED_REFRESH_RETRY: Duration = Duration::from_secs(15);

/// One exact client-visible model mapping.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RegistryEntry {
    pub exposed_id: String,
    pub canonical_id: String,
    pub owner: &'static str,
    pub display_name: Option<String>,
    pub protocol: ClientProtocol,
}

/// Runtime policy for one personal Coding Plan credential.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ZaiCodingPlanPolicy {
    subscriber_id: String,
    intermediary_risk_acknowledged: bool,
    unsupported_clients: Vec<ClientKind>,
}

impl ZaiCodingPlanPolicy {
    /// Build a fail-closed policy from persisted operator acknowledgements.
    pub fn new(
        subscriber_id: &str,
        intermediary_risk_acknowledged: bool,
        unsupported_clients: &[String],
    ) -> Result<Self, String> {
        let subscriber_id = subscriber_id.trim();
        if subscriber_id.is_empty() {
            return Err("z.ai Coding Plan requires one subscriber_id".into());
        }
        let mut parsed = Vec::new();
        for value in unsupported_clients {
            let client = ClientKind::from_str_opt(value).ok_or_else(|| {
                format!("unknown z.ai unsupported-client acknowledgement: {value}")
            })?;
            if !matches!(
                client,
                ClientKind::GeminiCli | ClientKind::GrokCli | ClientKind::QwenCode
            ) {
                return Err(format!(
                    "{} cannot be enabled for z.ai Coding Plan; only gemini, grok, or qwen may be individually risk-accepted",
                    client.canonical_name()
                ));
            }
            if value != client.canonical_name() {
                return Err(format!(
                    "z.ai unsupported-client acknowledgement must use canonical name '{}'",
                    client.canonical_name()
                ));
            }
            if !parsed.contains(&client) {
                parsed.push(client);
            }
        }
        if parsed.len() > 1 {
            return Err(
                "z.ai Coding Plan permits at most one risk-accepted unsupported client".into(),
            );
        }
        Ok(Self {
            subscriber_id: subscriber_id.to_string(),
            intermediary_risk_acknowledged,
            unsupported_clients: parsed,
        })
    }

    /// Authorize exactly one signed client/principal pair.
    pub fn authorize(&self, client: ClientKind, principal_id: &str) -> Result<(), String> {
        if !self.intermediary_risk_acknowledged {
            return Err("z.ai Coding Plan intermediary-proxy risk is not acknowledged".into());
        }
        if principal_id != self.subscriber_id {
            return Err(
                "Router token principal does not match the z.ai Coding Plan subscriber".into(),
            );
        }
        if matches!(
            client,
            ClientKind::ClaudeCode | ClientKind::Codex | ClientKind::Opencode
        ) || self.unsupported_clients.contains(&client)
        {
            return Ok(());
        }
        Err(format!(
            "{} is not permitted to use z.ai Coding Plan",
            client.canonical_name()
        ))
    }

    #[must_use]
    pub fn is_unsupported_override(&self, client: ClientKind) -> bool {
        self.unsupported_clients.contains(&client)
    }
}

/// Construct an exact-id registry for a recognized adapter.
pub fn registry_for_client(
    client: ClientKind,
    configured_models: &[impl AsRef<str>],
) -> Result<Vec<RegistryEntry>, String> {
    let protocol = match client {
        ClientKind::ClaudeCode => ClientProtocol::AnthropicMessages,
        ClientKind::Codex => ClientProtocol::OpenAIResponses,
        ClientKind::Opencode | ClientKind::GrokCli | ClientKind::QwenCode => {
            ClientProtocol::OpenAIChat
        }
        ClientKind::GeminiCli => ClientProtocol::GeminiNative,
        ClientKind::Cursor | ClientKind::Agent => {
            return Err(format!(
                "{} has no z.ai Coding Plan adapter",
                client.canonical_name()
            ));
        }
    };
    let mut registry = Vec::new();
    for configured in configured_models {
        let canonical = configured.as_ref().trim();
        if canonical.is_empty() {
            return Err("z.ai Coding Plan model identifiers cannot be empty".into());
        }
        registry.push(RegistryEntry {
            exposed_id: canonical.to_string(),
            canonical_id: canonical.to_string(),
            owner: "z.ai",
            display_name: Some(format!("z.ai Coding Plan — {canonical}")),
            protocol,
        });
    }
    Ok(registry)
}

/// Find one mapping by exact exposed identity. No prefix is interpreted.
#[must_use]
pub fn mapping_for_client(
    client: ClientKind,
    models: &[String],
    exposed_id: &str,
    protocol: ClientProtocol,
) -> Option<RegistryEntry> {
    registry_for_client(client, models)
        .ok()?
        .into_iter()
        .find(|entry| entry.exposed_id == exposed_id && entry.protocol == protocol)
}

/// Whether any supported adapter registry contains this exact exposed id.
#[must_use]
pub fn canonical_for_any_client(models: &[String], exposed_id: &str) -> Option<String> {
    [
        ClientKind::ClaudeCode,
        ClientKind::Codex,
        ClientKind::Opencode,
        ClientKind::GeminiCli,
        ClientKind::GrokCli,
        ClientKind::QwenCode,
    ]
    .into_iter()
    .filter_map(|client| registry_for_client(client, models).ok())
    .flatten()
    .find(|entry| entry.exposed_id == exposed_id)
    .map(|entry| entry.canonical_id)
}

fn catalog_fingerprint(provider: &ResolvedProvider) -> String {
    let mut digest = Sha256::new();
    digest.update(provider.name.as_bytes());
    digest.update([0]);
    digest.update(provider.base_url.as_bytes());
    digest.update([0]);
    digest.update(provider.api_key.as_deref().unwrap_or_default().as_bytes());
    hex::encode(digest.finalize())
}

fn cache_failure(
    state: &crate::app_state::AppState,
    provider: &ResolvedProvider,
    fingerprint: String,
    detail: &str,
) -> Result<Vec<LiveProviderModel>, String> {
    tracing::warn!(provider = %provider.name, "z.ai catalog refresh failed: {detail}");
    let previous = state
        .provider_store
        .cached_provider_catalog(&provider.name)
        .ok()
        .flatten()
        .filter(|entry| entry.fingerprint == fingerprint);
    let _ = state.provider_store.cache_provider_catalog(
        &provider.name,
        CachedProviderCatalog {
            fingerprint,
            models: previous
                .as_ref()
                .map_or_else(Vec::new, |entry| entry.models.clone()),
            last_success: previous.and_then(|entry| entry.last_success),
            last_attempt: Instant::now(),
            error: Some("z.ai catalog refresh failed".into()),
        },
    );
    Err("z.ai catalog refresh failed".into())
}

/// Fetch the exact current z.ai catalog without calling an inference endpoint.
pub(crate) async fn live_catalog(
    state: &crate::app_state::AppState,
    provider: &ResolvedProvider,
) -> Result<Vec<LiveProviderModel>, String> {
    let fingerprint = catalog_fingerprint(provider);
    if let Some(cached) = state
        .provider_store
        .cached_provider_catalog(&provider.name)
        .map_err(|error| error.to_string())?
        .filter(|entry| entry.fingerprint == fingerprint)
    {
        if cached.error.is_none()
            && cached
                .last_success
                .is_some_and(|at| at.elapsed() < CATALOG_TTL)
        {
            return Ok(cached.models);
        }
        if cached.error.is_some() && cached.last_attempt.elapsed() < FAILED_REFRESH_RETRY {
            return Err("z.ai catalog refresh failed".into());
        }
    }

    let key = provider
        .api_key
        .as_deref()
        .filter(|value| !value.is_empty())
        .ok_or("z.ai Coding Plan API key is unavailable")?;
    let response = match state
        .client
        .get(format!(
            "{}{}",
            provider.base_url.trim_end_matches('/'),
            CATALOG_PATH
        ))
        .bearer_auth(key)
        .send()
        .await
    {
        Ok(response) => response,
        Err(error) => {
            return cache_failure(state, provider, fingerprint, &error.to_string());
        }
    };
    if !response.status().is_success() {
        return cache_failure(
            state,
            provider,
            fingerprint,
            &format!("non-inference endpoint returned {}", response.status()),
        );
    }
    let payload = match response.json::<serde_json::Value>().await {
        Ok(payload) => payload,
        Err(error) => {
            return cache_failure(state, provider, fingerprint, &error.to_string());
        }
    };
    let Some(entries) = payload.get("data").and_then(serde_json::Value::as_array) else {
        return cache_failure(state, provider, fingerprint, "response has no data array");
    };
    let mut seen = HashSet::new();
    let mut models = Vec::with_capacity(entries.len());
    for entry in entries {
        let Some(raw) = entry.as_object().cloned() else {
            return cache_failure(
                state,
                provider,
                fingerprint,
                "model record is not an object",
            );
        };
        let Some(id) = raw
            .get("id")
            .and_then(serde_json::Value::as_str)
            .map(str::trim)
            .filter(|id| !id.is_empty())
        else {
            return cache_failure(state, provider, fingerprint, "model record has no exact id");
        };
        if !seen.insert(id.to_string()) {
            return cache_failure(
                state,
                provider,
                fingerprint,
                &format!("duplicate exact model id '{id}'"),
            );
        }
        models.push(LiveProviderModel {
            id: id.to_string(),
            raw,
        });
    }
    let now = Instant::now();
    state
        .provider_store
        .cache_provider_catalog(
            &provider.name,
            CachedProviderCatalog {
                fingerprint,
                models: models.clone(),
                last_success: Some(now),
                last_attempt: now,
                error: None,
            },
        )
        .map_err(|error| error.to_string())?;
    Ok(models)
}

pub(crate) fn live_registry_for_client(
    client: ClientKind,
    models: &[LiveProviderModel],
) -> Result<Vec<RegistryEntry>, String> {
    let mut registry = registry_for_client(
        client,
        &models.iter().map(|model| &model.id).collect::<Vec<_>>(),
    )?;
    for (entry, model) in registry.iter_mut().zip(models) {
        entry.display_name = model
            .raw
            .get("display_name")
            .or_else(|| model.raw.get("name"))
            .and_then(serde_json::Value::as_str)
            .map(str::to_string);
    }
    Ok(registry)
}

/// Resolve one exact current z.ai id for automatic routing.
pub(crate) async fn live_provider_for_model(
    state: &crate::app_state::AppState,
    model: &str,
    client: Option<ClientKind>,
    authorized: bool,
) -> Result<Option<ResolvedProvider>, crate::model_routing::ModelRouteError> {
    if !authorized {
        return Ok(None);
    }
    let provider = resolve(state).map_err(crate::model_routing::ModelRouteError::NotFound)?;
    let Some(provider) = provider else {
        return Ok(None);
    };
    if client.is_some_and(|client| !provider.supports_client(client)) {
        return Ok(None);
    }
    let Ok(models) = live_catalog(state, &provider).await else {
        return Ok(None);
    };
    Ok(models
        .iter()
        .any(|candidate| candidate.id == model)
        .then_some(provider))
}

/// Decide whether an automatic request may consult the z.ai catalog.
///
/// This is intentionally local-only: subscriber, client, protocol, and real
/// request evidence are checked before catalog discovery can contact z.ai.
pub(crate) fn authorize_automatic_discovery(
    state: &crate::app_state::AppState,
    claims: &crate::token::TokenClaims,
    headers: &axum::http::HeaderMap,
    protocol: ClientProtocol,
    path: &str,
) -> bool {
    resolve(state).ok().flatten().is_some_and(|provider| {
        authorize_client_request(&provider, claims, headers, protocol, path).is_ok()
    })
}

/// Resolve the selected enabled Coding Plan provider from runtime state.
pub fn resolve(state: &crate::app_state::AppState) -> Result<Option<ResolvedProvider>, String> {
    let providers = state
        .provider_store
        .list()
        .map_err(|error| error.to_string())?;
    let mut enabled = providers
        .into_iter()
        .filter(|record| record.enabled && record.kind == ProviderKind::ZaiCodingPlan);
    let Some(record) = enabled.next() else {
        return Ok(None);
    };
    if enabled.next().is_some() {
        return Err("multiple personal z.ai Coding Plan credentials are enabled".into());
    }
    state
        .provider_store
        .resolve(&record.name)
        .map_err(|error| error.to_string())
}

fn client_claims(claims: &crate::token::TokenClaims) -> Result<(ClientKind, &str), String> {
    crate::client_policy::bound_client(claims)
}

fn provider_policy(provider: &ResolvedProvider) -> Result<ZaiCodingPlanPolicy, String> {
    if provider.kind != ProviderKind::ZaiCodingPlan {
        return Err("selected credential is not z.ai Coding Plan".into());
    }
    ZaiCodingPlanPolicy::new(
        provider
            .subscriber_id
            .as_deref()
            .ok_or("z.ai Coding Plan has no subscriber")?,
        provider.intermediary_risk_acknowledged,
        &provider.unsupported_clients,
    )
}

fn authorize_client_request<'a>(
    provider: &ResolvedProvider,
    claims: &'a crate::token::TokenClaims,
    headers: &axum::http::HeaderMap,
    protocol: ClientProtocol,
    path: &str,
) -> Result<(ClientKind, &'a str, bool), String> {
    let (client, principal) = client_claims(claims)?;
    if !crate::client_policy::request_evidence(client, protocol, path, headers) {
        return Err(format!(
            "request evidence does not match the token's {} client binding",
            client.canonical_name()
        ));
    }
    let policy = provider_policy(provider)?;
    policy.authorize(client, principal)?;
    let overridden = policy.is_unsupported_override(client);
    Ok((client, principal, overridden))
}

/// Authorize catalog discovery, returning the caller-specific exact registry.
pub fn authorize_catalog(
    provider: &ResolvedProvider,
    claims: &crate::token::TokenClaims,
    headers: &axum::http::HeaderMap,
    path: &str,
) -> Result<(ClientKind, bool), String> {
    let (client, _, overridden) =
        authorize_client_request(provider, claims, headers, ClientProtocol::Catalog, path)?;
    Ok((client, overridden))
}

/// Authorize final dispatch and map the exact exposed id to its canonical id.
pub(crate) fn authorize_model(
    provider: &ResolvedProvider,
    live_models: &[LiveProviderModel],
    claims: &crate::token::TokenClaims,
    headers: &axum::http::HeaderMap,
    protocol: ClientProtocol,
    path: &str,
    exposed_id: &str,
) -> Result<(ClientKind, RegistryEntry, bool), String> {
    let (client, _, overridden) =
        authorize_client_request(provider, claims, headers, protocol, path)?;
    let mapping = live_registry_for_client(client, live_models)?
        .into_iter()
        .find(|entry| entry.exposed_id == exposed_id && entry.protocol == protocol)
        .ok_or_else(|| format!("model '{exposed_id}' is not permitted for {client}"))?;
    Ok((client, mapping, overridden))
}

/// Check the documented quota endpoint without consuming inference tokens.
pub async fn credential_healthy(
    client: &reqwest::Client,
    provider: &ResolvedProvider,
) -> Result<(), String> {
    let key = provider
        .api_key
        .as_deref()
        .filter(|value| !value.is_empty())
        .ok_or("z.ai Coding Plan API key is unavailable")?;
    let response = client
        .get(format!(
            "{}{}",
            provider.base_url.trim_end_matches('/'),
            HEALTH_PATH
        ))
        .header("authorization", key)
        .send()
        .await
        .map_err(|error| format!("z.ai Coding Plan health check failed: {error}"))?;
    if response.status().is_success() {
        Ok(())
    } else {
        Err(format!(
            "z.ai Coding Plan credential rejected by non-inference health check ({})",
            response.status()
        ))
    }
}

/// Live health for the enabled personal Coding Plan credential, when present.
///
/// The same authenticated non-inference live catalog gates catalogs and
/// dispatch, so every health surface reports the routing source of truth.
pub(crate) async fn configured_health(state: &crate::app_state::AppState) -> Option<bool> {
    let configured = match state.provider_store.list() {
        Ok(providers) => providers
            .iter()
            .any(|record| record.enabled && record.kind == ProviderKind::ZaiCodingPlan),
        Err(_) => {
            return (state.upstream_provider == crate::config::UpstreamProvider::ZaiCodingPlan)
                .then_some(false);
        }
    };
    if !configured {
        return None;
    }
    let Ok(Some(provider)) = resolve(state) else {
        return Some(false);
    };
    Some(live_catalog(state, &provider).await.is_ok())
}

fn policy_error(surface: crate::metrics::Surface, message: &str) -> axum::response::Response {
    crate::api_error::error_response_for_surface(
        surface,
        axum::http::StatusCode::FORBIDDEN,
        "permission_error",
        message,
    )
}

fn unavailable_error(surface: crate::metrics::Surface, message: &str) -> axum::response::Response {
    crate::api_error::error_response_for_surface(
        surface,
        axum::http::StatusCode::SERVICE_UNAVAILABLE,
        "api_error",
        message,
    )
}

/// Enforce Coding Plan policy immediately before forwarding one request.
pub async fn forward(
    state: &crate::app_state::AppState,
    headers: &axum::http::HeaderMap,
    mut body: serde_json::Value,
    incoming_path: &str,
    protocol: ClientProtocol,
    surface: crate::metrics::Surface,
) -> axum::response::Response {
    let claims = match crate::proxy::authenticate_client(state, headers) {
        Ok(claims) => claims,
        Err(response) => return *response,
    };
    let Some(exposed_id) = body
        .get("model")
        .and_then(serde_json::Value::as_str)
        .map(str::to_string)
    else {
        return crate::api_error::error_response_for_surface(
            surface,
            axum::http::StatusCode::BAD_REQUEST,
            "invalid_request_error",
            "model is required for z.ai Coding Plan",
        );
    };
    let provider = match resolve(state) {
        Ok(Some(provider)) => provider,
        Ok(None) => return unavailable_error(surface, "z.ai Coding Plan is not enabled"),
        Err(error) => return unavailable_error(surface, &error),
    };
    if let Err(error) =
        authorize_client_request(&provider, &claims, headers, protocol, incoming_path)
    {
        return policy_error(surface, &error);
    }
    let live_models = match live_catalog(state, &provider).await {
        Ok(models) => models,
        Err(error) => return unavailable_error(surface, &error),
    };
    let (_, mapping, _) = match authorize_model(
        &provider,
        &live_models,
        &claims,
        headers,
        protocol,
        incoming_path,
        &exposed_id,
    ) {
        Ok(decision) => decision,
        Err(error) => return policy_error(surface, &error),
    };
    let routing_body = body.clone();
    body["model"] = serde_json::Value::String(mapping.canonical_id);
    let upstream_path = match protocol {
        ClientProtocol::AnthropicMessages => {
            format!("{ANTHROPIC_BASE_PATH}/v1/messages")
        }
        ClientProtocol::OpenAIChat | ClientProtocol::GeminiNative => {
            format!("{CHAT_BASE_PATH}/chat/completions")
        }
        ClientProtocol::OpenAIResponses => format!("{RESPONSES_BASE_PATH}/responses"),
        ClientProtocol::Catalog => {
            return policy_error(surface, "z.ai Coding Plan protocol adapter is unavailable");
        }
    };
    crate::provider_proxy::forward_provider_at_routed(
        state,
        headers,
        body,
        &routing_body,
        crate::provider_proxy::ProviderForwardOptions {
            path: incoming_path,
            upstream_path: &upstream_path,
            surface,
            copy_anthropic_headers: protocol == ClientProtocol::AnthropicMessages,
            protocol,
            native_protocol: !matches!(
                protocol,
                ClientProtocol::GeminiNative | ClientProtocol::Catalog
            ),
        },
    )
    .await
}

/// Answer Anthropic token counting locally after the same exact authorization.
pub fn count_tokens(
    state: &crate::app_state::AppState,
    headers: &axum::http::HeaderMap,
    path: &str,
    body: &serde_json::Value,
) -> axum::response::Response {
    use axum::response::IntoResponse as _;

    let claims = match crate::proxy::authenticate_client(state, headers) {
        Ok(claims) => claims,
        Err(response) => return *response,
    };
    let Some(model) = body.get("model").and_then(serde_json::Value::as_str) else {
        return crate::api_error::error_response(
            axum::http::StatusCode::BAD_REQUEST,
            "invalid_request_error",
            "model is required for z.ai Coding Plan",
        );
    };
    let provider = match resolve(state) {
        Ok(Some(provider)) => provider,
        Ok(None) => {
            return unavailable_error(
                crate::metrics::Surface::Anthropic,
                "z.ai Coding Plan is not enabled",
            );
        }
        Err(error) => return unavailable_error(crate::metrics::Surface::Anthropic, &error),
    };
    let Some(live_models) = state
        .provider_store
        .cached_provider_catalog(&provider.name)
        .ok()
        .flatten()
        .filter(|cached| {
            cached.fingerprint == catalog_fingerprint(&provider)
                && cached.error.is_none()
                && cached
                    .last_success
                    .is_some_and(|at| at.elapsed() < CATALOG_TTL)
        })
        .map(|cached| cached.models)
    else {
        return unavailable_error(
            crate::metrics::Surface::Anthropic,
            "z.ai model catalog must be refreshed before token counting",
        );
    };
    if let Err(error) = authorize_model(
        &provider,
        &live_models,
        &claims,
        headers,
        ClientProtocol::AnthropicMessages,
        path,
        model,
    ) {
        return policy_error(crate::metrics::Surface::Anthropic, &error);
    }
    crate::audit::record_authorised_request(
        state,
        &claims,
        crate::metrics::Surface::Anthropic,
        path,
        Some(body),
    );
    (
        axum::http::StatusCode::OK,
        axum::Json(serde_json::json!({
            "input_tokens": crate::anthropic_bridge::count_tokens_estimate(body)
        })),
    )
        .into_response()
}
