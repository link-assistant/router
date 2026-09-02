use axum::http::HeaderMap;

use crate::client_policy::{
    ClientProtocol, EntitlementDecision, SubscriptionEntitlementPolicy, request_evidence,
};
use crate::clients::ClientKind;
use crate::subscription::SubscriptionProvider;

#[test]
fn every_subscription_provider_has_an_explicit_safe_default() {
    let policy = SubscriptionEntitlementPolicy::default();
    let rows = [
        (
            ClientKind::ClaudeCode,
            SubscriptionProvider::Claude,
            ClientProtocol::AnthropicMessages,
            true,
        ),
        (
            ClientKind::Codex,
            SubscriptionProvider::Codex,
            ClientProtocol::OpenAIResponses,
            true,
        ),
        (
            ClientKind::GeminiCli,
            SubscriptionProvider::Gemini,
            ClientProtocol::GeminiNative,
            false,
        ),
        (
            ClientKind::QwenCode,
            SubscriptionProvider::Qwen,
            ClientProtocol::OpenAIChat,
            false,
        ),
    ];

    assert_eq!(SubscriptionProvider::ALL.len(), rows.len());
    for (client, provider, protocol, allowed) in rows {
        assert_eq!(
            policy.decide(Some(client), provider, protocol),
            if allowed {
                EntitlementDecision::Native
            } else {
                EntitlementDecision::Denied
            },
            "{client}:{provider}"
        );
    }
}

#[test]
fn no_other_client_provider_pair_is_implicitly_allowed() {
    let policy = SubscriptionEntitlementPolicy::default();
    for client in ClientKind::ALL {
        for provider in SubscriptionProvider::ALL {
            let native = matches!(
                (client, provider),
                (ClientKind::ClaudeCode, SubscriptionProvider::Claude)
                    | (ClientKind::Codex, SubscriptionProvider::Codex)
            );
            let protocol = match client {
                ClientKind::ClaudeCode => ClientProtocol::AnthropicMessages,
                ClientKind::Codex => ClientProtocol::OpenAIResponses,
                ClientKind::GeminiCli => ClientProtocol::GeminiNative,
                _ => ClientProtocol::OpenAIChat,
            };
            assert_eq!(
                policy.decide(Some(client), provider, protocol),
                if native {
                    EntitlementDecision::Native
                } else {
                    EntitlementDecision::Denied
                },
                "{client}:{provider}"
            );
        }
    }
    assert_eq!(
        policy.decide(
            None,
            SubscriptionProvider::Claude,
            ClientProtocol::AnthropicMessages
        ),
        EntitlementDecision::Denied
    );
}

#[test]
fn one_exact_override_changes_only_one_matrix_cell() {
    let policy = SubscriptionEntitlementPolicy::parse(["codex:claude"]).expect("valid policy");
    assert_eq!(
        policy.decide(
            Some(ClientKind::Codex),
            SubscriptionProvider::Claude,
            ClientProtocol::OpenAIResponses
        ),
        EntitlementDecision::Override
    );
    assert_eq!(
        policy.decide(
            Some(ClientKind::ClaudeCode),
            SubscriptionProvider::Codex,
            ClientProtocol::AnthropicMessages
        ),
        EntitlementDecision::Denied
    );
    assert_eq!(
        policy.decide(
            Some(ClientKind::Opencode),
            SubscriptionProvider::Claude,
            ClientProtocol::OpenAIChat
        ),
        EntitlementDecision::Denied
    );
}

#[test]
fn malformed_wildcard_generic_and_pending_terms_overrides_are_refused() {
    for value in [
        "*:*",
        "codex",
        "agent:claude",
        "gemini:gemini",
        "qwen:qwen",
        "unknown:claude",
        "codex:unknown",
    ] {
        assert!(
            SubscriptionEntitlementPolicy::parse([value]).is_err(),
            "accepted {value}"
        );
    }
}

#[test]
fn request_evidence_requires_protocol_carrier_and_fixture_headers() {
    let mut claude = HeaderMap::new();
    claude.insert("x-api-key", "redacted".parse().unwrap());
    claude.insert("anthropic-version", "2023-06-01".parse().unwrap());
    assert!(request_evidence(
        ClientKind::ClaudeCode,
        ClientProtocol::AnthropicMessages,
        "/v1/messages",
        &claude
    ));

    let mut codex = HeaderMap::new();
    codex.insert("authorization", "Bearer redacted".parse().unwrap());
    codex.insert(
        "x-openai-internal-codex-responses-lite",
        "true".parse().unwrap(),
    );
    assert!(request_evidence(
        ClientKind::Codex,
        ClientProtocol::OpenAIResponses,
        "/api/codex/v1/responses",
        &codex
    ));

    let mut spoofed = HeaderMap::new();
    spoofed.insert("authorization", "Bearer redacted".parse().unwrap());
    spoofed.insert("user-agent", "codex_exec/999".parse().unwrap());
    assert!(!request_evidence(
        ClientKind::Codex,
        ClientProtocol::OpenAIResponses,
        "/v1/responses",
        &spoofed
    ));
}

#[test]
fn catalog_probe_evidence_is_client_specific_and_not_authority_by_itself() {
    let mut headers = HeaderMap::new();
    headers.insert("authorization", "Bearer redacted".parse().unwrap());
    headers.insert("x-link-assistant-client", "codex".parse().unwrap());
    assert!(request_evidence(
        ClientKind::Codex,
        ClientProtocol::Catalog,
        "/api/codex/v1/models",
        &headers
    ));
    assert!(!request_evidence(
        ClientKind::ClaudeCode,
        ClientProtocol::Catalog,
        "/api/codex/v1/models",
        &headers
    ));
}

fn bound_claims(client: &str) -> crate::token::TokenClaims {
    crate::token::TokenClaims {
        sub: "token-id".into(),
        iat: 1,
        exp: i64::MAX,
        label: "managed".into(),
        scope: String::new(),
        github_repos: Vec::new(),
        client_kind: Some(client.into()),
        principal_id: Some("primary".into()),
    }
}

#[test]
fn signed_binding_and_fixture_evidence_are_both_required() {
    let policy = SubscriptionEntitlementPolicy::default();
    let mut headers = HeaderMap::new();
    headers.insert("authorization", "Bearer redacted".parse().unwrap());
    headers.insert(
        "x-openai-internal-codex-responses-lite",
        "true".parse().unwrap(),
    );
    assert_eq!(
        authorize_subscription(
            &policy,
            &bound_claims("codex"),
            SubscriptionProvider::Codex,
            ClientProtocol::OpenAIResponses,
            "/api/codex/v1/responses",
            &headers,
        ),
        Ok(EntitlementDecision::Native)
    );

    let mut unbound = bound_claims("codex");
    unbound.client_kind = None;
    unbound.principal_id = None;
    assert!(
        authorize_subscription(
            &policy,
            &unbound,
            SubscriptionProvider::Codex,
            ClientProtocol::OpenAIResponses,
            "/api/codex/v1/responses",
            &headers,
        )
        .is_err()
    );
}

#[test]
fn a_bound_token_cannot_change_clients_with_request_headers() {
    let policy = SubscriptionEntitlementPolicy::default();
    let mut headers = HeaderMap::new();
    headers.insert("x-api-key", "redacted".parse().unwrap());
    headers.insert("anthropic-version", "2023-06-01".parse().unwrap());
    assert!(
        authorize_subscription(
            &policy,
            &bound_claims("codex"),
            SubscriptionProvider::Claude,
            ClientProtocol::AnthropicMessages,
            "/v1/messages",
            &headers,
        )
        .is_err()
    );
}
