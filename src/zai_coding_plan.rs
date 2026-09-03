//! Policy and exact model registry for the experimental z.ai GLM Coding Plan.
//!
//! Coding Plan is deliberately not treated as a generic OpenAI-compatible
//! credential. Its personal subscription is bound to one subscriber and to
//! named end-user tools; use through Router remains disabled until the
//! operator acknowledges the intermediary-proxy risk (issue #390).

use crate::client_policy::ClientProtocol;
use crate::clients::ClientKind;
use crate::providers::{ProviderKind, ResolvedProvider};

/// Documented base path for native Anthropic Messages traffic.
pub const ANTHROPIC_BASE_PATH: &str = "/api/anthropic";
/// Documented base path for `OpenAI Chat Completions` traffic.
pub const CHAT_BASE_PATH: &str = "/api/coding/paas/v4";
/// Documented base path for `OpenAI Responses` traffic.
pub const RESPONSES_BASE_PATH: &str = "/api/v1";
/// Documented, non-inference quota operation used for health checks.
pub const HEALTH_PATH: &str = "/api/monitor/usage/quota/limit";

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

/// Construct the exact registry for a recognized adapter.
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
        if client == ClientKind::ClaudeCode {
            for prefix in ["claude-zai-", "anthropic-zai-"] {
                registry.push(RegistryEntry {
                    exposed_id: format!("{prefix}{canonical}"),
                    canonical_id: canonical.to_string(),
                    owner: "z.ai",
                    display_name: Some(format!("z.ai Coding Plan — {canonical}")),
                    protocol,
                });
            }
        } else {
            registry.push(RegistryEntry {
                exposed_id: format!("z.ai/{canonical}"),
                canonical_id: canonical.to_string(),
                owner: "z.ai",
                display_name: Some(format!("z.ai Coding Plan — {canonical}")),
                protocol,
            });
        }
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
    if claims.is_admin() {
        return Err("administrative credentials cannot spend z.ai Coding Plan quota".into());
    }
    let client_name = claims
        .client_kind
        .as_deref()
        .ok_or("the token has no managed-client binding")?;
    let client = ClientKind::from_str_opt(client_name)
        .ok_or("the token contains an unknown managed-client binding")?;
    if client_name != client.canonical_name() {
        return Err("the token's managed-client binding is not canonical".into());
    }
    let principal = claims
        .principal_id
        .as_deref()
        .filter(|value| !value.trim().is_empty())
        .ok_or("the token has no subscriber principal")?;
    Ok((client, principal))
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

/// Authorize catalog discovery, returning the caller-specific exact registry.
pub fn authorize_catalog(
    provider: &ResolvedProvider,
    claims: &crate::token::TokenClaims,
    headers: &axum::http::HeaderMap,
    path: &str,
) -> Result<(ClientKind, Vec<RegistryEntry>, bool), String> {
    let (client, principal) = client_claims(claims)?;
    if !crate::client_policy::request_evidence(client, ClientProtocol::Catalog, path, headers) {
        return Err(format!(
            "request evidence does not match the token's {} client binding",
            client.canonical_name()
        ));
    }
    let policy = provider_policy(provider)?;
    policy.authorize(client, principal)?;
    let overridden = policy.is_unsupported_override(client);
    Ok((
        client,
        registry_for_client(client, &provider.models)?,
        overridden,
    ))
}

/// Authorize final dispatch and map the exact exposed id to its canonical id.
pub fn authorize_model(
    provider: &ResolvedProvider,
    claims: &crate::token::TokenClaims,
    headers: &axum::http::HeaderMap,
    protocol: ClientProtocol,
    path: &str,
    exposed_id: &str,
) -> Result<(ClientKind, RegistryEntry, bool), String> {
    let (client, principal) = client_claims(claims)?;
    if !crate::client_policy::request_evidence(client, protocol, path, headers) {
        return Err(format!(
            "request evidence does not match the token's {} client binding",
            client.canonical_name()
        ));
    }
    let policy = provider_policy(provider)?;
    policy.authorize(client, principal)?;
    let mapping = mapping_for_client(client, &provider.models, exposed_id, protocol)
        .ok_or_else(|| format!("model '{exposed_id}' is not permitted for {client}"))?;
    let overridden = policy.is_unsupported_override(client);
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
/// The same documented non-inference quota operation gates catalogs and
/// dispatch. Keeping the public health surfaces on that operation means a
/// rejected key cannot remain green merely because no client has refreshed its
/// model picker yet.
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
    Some(credential_healthy(&state.client, &provider).await.is_ok())
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
    let (_, mapping, _) = match authorize_model(
        &provider,
        &claims,
        headers,
        protocol,
        incoming_path,
        &exposed_id,
    ) {
        Ok(decision) => decision,
        Err(error) => return policy_error(surface, &error),
    };
    if let Err(error) = credential_healthy(&state.client, &provider).await {
        return unavailable_error(surface, &error);
    }
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
    if let Err(error) = authorize_model(
        &provider,
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
