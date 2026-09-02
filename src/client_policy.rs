//! Client-bound authorization for consumer subscription credentials.
//!
//! A compatible wire protocol is not permission to spend a consumer
//! subscription. This module keeps the reviewed client/provider matrix, exact
//! risk-accepted overrides, and real-client request evidence in one place so
//! discovery and dispatch cannot drift apart (issue #389).

use std::collections::HashSet;

use axum::http::HeaderMap;

use crate::clients::ClientKind;
use crate::subscription::SubscriptionProvider;

/// Client-facing protocol used by one request.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ClientProtocol {
    /// Authenticated model discovery before a client launches.
    Catalog,
    /// Anthropic Messages or token-counting surface.
    AnthropicMessages,
    /// OpenAI Chat Completions surface.
    OpenAIChat,
    /// OpenAI Responses surface.
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
        self.overrides
            .contains(&SubscriptionOverride { client, provider })
            .then_some(EntitlementDecision::Override)
            .unwrap_or(EntitlementDecision::Denied)
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
        return claimed == Some(client)
            && path_belongs_to_client(client, path)
            && credential_carrier_matches(client, headers);
    }
    match client {
        ClientKind::ClaudeCode => {
            { path.ends_with("/v1/messages") || path.ends_with("/v1/messages/count_tokens") }
                .then(|| {
                    header_present(headers, "x-api-key")
                        && header_present(headers, "anthropic-version")
                })
                .unwrap_or(false)
        }
        ClientKind::Codex => {
            path.contains("/v1/responses")
                && header_present(headers, "authorization")
                && (header_present(headers, "x-openai-internal-codex-responses-lite")
                    || header_present(headers, "x-codex-turn-metadata"))
        }
        ClientKind::GeminiCli => {
            path.contains("/api/gemini/")
                && header_present(headers, "x-goog-api-key")
                && (header_present(headers, "x-goog-api-client")
                    || header_present(headers, "x-gemini-api-privileged-user-id"))
        }
        ClientKind::QwenCode => {
            path.contains("/api/qwen/")
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
        ClientKind::Codex => path == "/api/codex/v1/models",
        ClientKind::GeminiCli => path == "/api/gemini/v1beta/models",
        ClientKind::QwenCode => path == "/api/qwen/v1/models",
        ClientKind::ClaudeCode | ClientKind::Opencode | ClientKind::GrokCli => path == "/v1/models",
        ClientKind::Cursor | ClientKind::Agent => false,
    }
}
