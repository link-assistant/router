//! Client-bound authorization for consumer subscription credentials.
//!
//! A compatible wire protocol is not permission to spend a consumer
//! subscription. This module keeps the reviewed client/provider matrix, exact
//! risk-accepted overrides, and real-client request evidence in one place so
//! discovery and dispatch cannot drift apart (issue #389).

use std::collections::HashSet;

use axum::http::HeaderMap;
use axum::http::StatusCode;
use axum::response::Response;

use crate::clients::ClientKind;
use crate::subscription::SubscriptionProvider;

/// Client-facing protocol used by one request.
#[derive(
    Clone, Copy, Debug, Eq, Hash, Ord, PartialEq, PartialOrd, serde::Deserialize, serde::Serialize,
)]
#[serde(rename_all = "snake_case")]
pub enum ClientProtocol {
    /// Authenticated model discovery before a client launches.
    Catalog,
    /// `Anthropic Messages` or token-counting surface.
    AnthropicMessages,
    /// `OpenAI Chat Completions` surface.
    OpenAIChat,
    /// `OpenAI Responses` surface.
    OpenAIResponses,
    /// Gemini's native `generateContent` surface.
    GeminiNative,
}

/// Why an entitlement matrix cell is usable.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum EntitlementDecision {
    /// The provider's documented native client.
    Native,
    /// One exact client/provider bridge was risk-accepted.
    Override,
    /// No reviewed entitlement exists.
    Denied,
}

/// Validate the signed binding, reviewed matrix cell, and request fixture
/// evidence as one indivisible authorization decision.
pub fn authorize_subscription(
    policy: &SubscriptionEntitlementPolicy,
    claims: &crate::token::TokenClaims,
    provider: SubscriptionProvider,
    protocol: ClientProtocol,
    path: &str,
    headers: &HeaderMap,
) -> Result<EntitlementDecision, String> {
    if claims.is_admin() {
        return Err("administrative credentials do not imply consumer-subscription access".into());
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
    if claims
        .principal_id
        .as_deref()
        .is_none_or(|principal| principal.trim().is_empty())
    {
        return Err("the token has no subscriber principal".into());
    }
    if !request_evidence(client, protocol, path, headers) {
        return Err(format!(
            "request evidence does not match the token's {} client binding",
            client.canonical_name()
        ));
    }
    match policy.decide(Some(client), provider, protocol) {
        EntitlementDecision::Denied => Err(format!(
            "{} is not entitled to use the {provider} consumer subscription",
            client.display_name()
        )),
        decision => Ok(decision),
    }
}

/// Apply the active deployment policy and render a stable pre-upstream denial.
pub fn enforce_subscription(
    state: &crate::app_state::AppState,
    headers: &HeaderMap,
    provider: SubscriptionProvider,
    protocol: ClientProtocol,
    path: &str,
) -> Result<EntitlementDecision, Response> {
    let claims = crate::proxy::authenticate_client(state, headers).map_err(|response| *response)?;
    enforce_subscription_for_claims(state, &claims, headers, provider, protocol, path)
}

/// Variant for catalog handlers that have already authenticated the caller.
pub fn enforce_subscription_for_claims(
    state: &crate::app_state::AppState,
    claims: &crate::token::TokenClaims,
    headers: &HeaderMap,
    provider: SubscriptionProvider,
    protocol: ClientProtocol,
    path: &str,
) -> Result<EntitlementDecision, Response> {
    let policy = state
        .provider_store
        .subscription_entitlement_policy()
        .map_err(|error| {
            crate::proxy::error_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                "api_error",
                &format!("could not read subscription entitlement policy: {error}"),
            )
        })?;
    authorize_subscription(&policy, claims, provider, protocol, path, headers).map_err(|message| {
        crate::proxy::error_response(StatusCode::FORBIDDEN, "permission_error", &message)
    })
}

/// Subscription providers that may participate in model selection for this
/// already-authenticated request.
///
/// The final dispatch check remains mandatory. This earlier projection only
/// keeps a provider hidden from the client's catalog from influencing
/// ambiguity or automatic owner selection.
pub fn entitled_subscription_providers_for_claims(
    state: &crate::app_state::AppState,
    claims: &crate::token::TokenClaims,
    headers: &HeaderMap,
    protocol: ClientProtocol,
    path: &str,
) -> Result<Vec<SubscriptionProvider>, Response> {
    let policy = state
        .provider_store
        .subscription_entitlement_policy()
        .map_err(|error| {
            crate::proxy::error_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                "api_error",
                &format!("could not read subscription entitlement policy: {error}"),
            )
        })?;
    Ok(SubscriptionProvider::ALL
        .into_iter()
        .filter(|provider| {
            authorize_subscription(&policy, claims, *provider, protocol, path, headers).is_ok()
        })
        .collect())
}

/// One exact risk-accepted bridge cell.
#[derive(Clone, Copy, Debug, Eq, Hash, PartialEq)]
pub struct SubscriptionOverride {
    pub client: ClientKind,
    pub provider: SubscriptionProvider,
}

impl std::fmt::Display for SubscriptionOverride {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(formatter, "{}:{}", self.client, self.provider)
    }
}

/// Reviewed consumer-subscription entitlement policy.
#[derive(Clone, Debug, Default, Eq, PartialEq)]
pub struct SubscriptionEntitlementPolicy {
    overrides: HashSet<SubscriptionOverride>,
}

impl SubscriptionEntitlementPolicy {
    /// Parse exact `client:provider` overrides.
    ///
    /// Wildcards, unidentified/generic clients, and providers whose native
    /// consumer terms have not yet been recorded are rejected rather than
    /// retained as dormant future authority.
    pub fn parse<I, S>(values: I) -> Result<Self, String>
    where
        I: IntoIterator<Item = S>,
        S: AsRef<str>,
    {
        let mut overrides = HashSet::new();
        for value in values {
            let value = value.as_ref();
            let (client, provider) = value.split_once(':').ok_or_else(|| {
                format!("subscription bridge override must be CLIENT:PROVIDER; got '{value}'")
            })?;
            if client.contains('*') || provider.contains('*') {
                return Err("subscription bridge overrides cannot contain wildcards".to_string());
            }
            let client = ClientKind::from_str_opt(client)
                .ok_or_else(|| format!("unknown Router client in override '{value}'"))?;
            let provider = SubscriptionProvider::from_str_opt(provider)
                .ok_or_else(|| format!("unknown subscription provider in override '{value}'"))?;
            if matches!(client, ClientKind::Agent | ClientKind::Cursor) {
                return Err(format!(
                    "{client} has no fixture-tested subscription adapter and cannot be overridden"
                ));
            }
            if matches!(
                provider,
                SubscriptionProvider::Gemini | SubscriptionProvider::Qwen
            ) {
                return Err(format!(
                    "{provider} consumer-subscription terms are pending review; no override may enable it"
                ));
            }
            overrides.insert(SubscriptionOverride { client, provider });
        }
        Ok(Self { overrides })
    }

    /// Decide one client/provider/protocol cell without consulting model names.
    #[must_use]
    pub fn decide(
        &self,
        client: Option<ClientKind>,
        provider: SubscriptionProvider,
        protocol: ClientProtocol,
    ) -> EntitlementDecision {
        let Some(client) = client else {
            return EntitlementDecision::Denied;
        };
        if !protocol_matches_client(client, protocol) {
            return EntitlementDecision::Denied;
        }
        if matches!(
            (client, provider),
            (ClientKind::ClaudeCode, SubscriptionProvider::Claude)
                | (ClientKind::Codex, SubscriptionProvider::Codex)
        ) {
            return EntitlementDecision::Native;
        }
        if self
            .overrides
            .contains(&SubscriptionOverride { client, provider })
        {
            EntitlementDecision::Override
        } else {
            EntitlementDecision::Denied
        }
    }

    /// Sorted exact overrides for warnings and administrative diagnostics.
    #[must_use]
    pub fn overrides(&self) -> Vec<SubscriptionOverride> {
        let mut values = self.overrides.iter().copied().collect::<Vec<_>>();
        values.sort_by_key(ToString::to_string);
        values
    }
}

/// Whether a protocol is native to the claimed Router adapter.
#[must_use]
pub const fn protocol_matches_client(client: ClientKind, protocol: ClientProtocol) -> bool {
    match protocol {
        ClientProtocol::Catalog => !matches!(client, ClientKind::Cursor | ClientKind::Agent),
        ClientProtocol::AnthropicMessages => matches!(client, ClientKind::ClaudeCode),
        ClientProtocol::OpenAIResponses => matches!(client, ClientKind::Codex),
        ClientProtocol::OpenAIChat => matches!(
            client,
            ClientKind::Opencode | ClientKind::GrokCli | ClientKind::QwenCode
        ),
        ClientProtocol::GeminiNative => matches!(client, ClientKind::GeminiCli),
    }
}

fn header_present(headers: &HeaderMap, name: &str) -> bool {
    headers
        .get(name)
        .and_then(|value| value.to_str().ok())
        .is_some_and(|value| !value.is_empty())
}

fn header_starts_with(headers: &HeaderMap, name: &str, prefix: &str) -> bool {
    headers
        .get(name)
        .and_then(|value| value.to_str().ok())
        .is_some_and(|value| value.to_ascii_lowercase().starts_with(prefix))
}

/// Match the stable request evidence recorded in `tests/fixtures/clients`.
///
/// This is defense against accidental/unsupported routing, not cryptographic
/// process attestation. The signed client claim remains the authority; these
/// caller-controlled headers cannot grant anything without it.
#[must_use]
pub fn request_evidence(
    client: ClientKind,
    protocol: ClientProtocol,
    path: &str,
    headers: &HeaderMap,
) -> bool {
    if !protocol_matches_client(client, protocol) {
        return false;
    }
    if protocol == ClientProtocol::Catalog {
        let claimed = headers
            .get("x-link-assistant-client")
            .and_then(|value| value.to_str().ok())
            .and_then(ClientKind::from_str_opt);
        return claimed.is_none_or(|claimed| claimed == client)
            && path_belongs_to_client(client, path)
            && credential_carrier_matches(client, headers);
    }
    match client {
        ClientKind::ClaudeCode => {
            (path.ends_with("/v1/messages") || path.ends_with("/v1/messages/count_tokens"))
                && header_present(headers, "x-api-key")
                && header_present(headers, "anthropic-version")
        }
        ClientKind::Codex => {
            path.contains("/v1/responses")
                && header_present(headers, "authorization")
                && (header_present(headers, "x-openai-internal-codex-responses-lite")
                    || header_present(headers, "x-codex-turn-metadata"))
        }
        ClientKind::GeminiCli => {
            path.contains("/api/services/gemini/")
                && header_present(headers, "x-goog-api-key")
                && (header_present(headers, "x-goog-api-client")
                    || header_present(headers, "x-gemini-api-privileged-user-id"))
        }
        ClientKind::QwenCode => {
            path.ends_with("/v1/chat/completions")
                && header_present(headers, "authorization")
                && header_present(headers, "x-stainless-package-version")
        }
        ClientKind::Opencode => {
            header_present(headers, "authorization")
                && header_starts_with(headers, "user-agent", "opencode/")
                && header_present(headers, "x-session-id")
        }
        ClientKind::GrokCli => {
            header_present(headers, "authorization")
                && header_starts_with(headers, "user-agent", "grok")
        }
        ClientKind::Cursor | ClientKind::Agent => false,
    }
}

fn credential_carrier_matches(client: ClientKind, headers: &HeaderMap) -> bool {
    match client {
        ClientKind::ClaudeCode => header_present(headers, "x-api-key"),
        ClientKind::GeminiCli => header_present(headers, "x-goog-api-key"),
        _ => header_present(headers, "authorization"),
    }
}

fn path_belongs_to_client(client: ClientKind, path: &str) -> bool {
    match client {
        ClientKind::Codex => path == "/api/services/codex/v1/models",
        ClientKind::GeminiCli => {
            path == "/api/services/gemini/v1beta/models"
                || path.starts_with("/api/services/gemini/v1beta/models/")
        }
        ClientKind::QwenCode => path == "/api/services/qwen/v1/models",
        ClientKind::ClaudeCode => path == "/api/services/anthropic/v1/models",
        ClientKind::Opencode | ClientKind::GrokCli => path == "/api/services/openai/v1/models",
        ClientKind::Cursor | ClientKind::Agent => false,
    }
}
