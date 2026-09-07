use axum::body::Body;
use axum::extract::{OriginalUri, State};
use axum::http::{HeaderMap, Request, StatusCode};

use crate::client_policy::{
    ClientProtocol, EntitlementDecision, SubscriptionEntitlementPolicy, authorize_subscription,
    request_evidence,
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
    claude.insert("user-agent", "claude-cli/2.1.259".parse().unwrap());
    assert!(request_evidence(
        ClientKind::ClaudeCode,
        ClientProtocol::AnthropicMessages,
        "/v1/messages",
        &claude
    ));

    let mut codex = HeaderMap::new();
    codex.insert("authorization", "Bearer redacted".parse().unwrap());
    codex.insert("user-agent", "codex_exec/0.153.0".parse().unwrap());
    codex.insert(
        "x-openai-internal-codex-responses-lite",
        "true".parse().unwrap(),
    );
    assert!(request_evidence(
        ClientKind::Codex,
        ClientProtocol::OpenAIResponses,
        "/api/services/codex/v1/responses",
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
fn every_supported_doctor_probe_matches_policy_without_forging_client_identity() {
    let mut native = HeaderMap::new();
    native.insert("authorization", "Bearer redacted".parse().unwrap());
    native.insert("anthropic-version", "2023-06-01".parse().unwrap());
    native.insert("user-agent", "claude-cli/2.1.259".parse().unwrap());
    assert!(request_evidence(
        ClientKind::ClaudeCode,
        ClientProtocol::AnthropicMessages,
        "/api/services/anthropic/v1/messages",
        &native,
    ));
    assert!(request_evidence(
        ClientKind::ClaudeCode,
        ClientProtocol::Catalog,
        "/api/services/anthropic/v1/models",
        &native,
    ));

    let cases = [
        (
            ClientKind::ClaudeCode,
            ClientProtocol::AnthropicMessages,
            "/api/services/anthropic/v1/messages",
        ),
        (
            ClientKind::Codex,
            ClientProtocol::OpenAIResponses,
            "/api/services/codex/v1/responses",
        ),
        (
            ClientKind::QwenCode,
            ClientProtocol::OpenAIChat,
            "/api/services/qwen/v1/chat/completions",
        ),
        (
            ClientKind::Opencode,
            ClientProtocol::OpenAIChat,
            "/api/services/openai/v1/chat/completions",
        ),
        (
            ClientKind::GrokCli,
            ClientProtocol::OpenAIChat,
            "/api/services/openai/v1/chat/completions",
        ),
        (
            ClientKind::Agent,
            ClientProtocol::OpenAIChat,
            "/api/services/openai/v1/chat/completions",
        ),
    ];
    for (client, protocol, path) in cases {
        let mut doctor = crate::clients::doctor::probe_headers(client, "redacted").unwrap();
        assert!(
            request_evidence(client, protocol, path, &doctor),
            "{client}"
        );
        for fingerprint in ["user-agent", "x-stainless-package-version", "x-session-id"] {
            assert!(!doctor.contains_key(fingerprint), "{client}: {fingerprint}");
        }

        let provider = crate::proxy::native_request_headers(&doctor, "upstream-secret");
        assert!(
            !provider.contains_key(crate::clients::doctor::DOCTOR_EVIDENCE_HEADER),
            "{client}: doctor marker leaked upstream"
        );
        assert!(!provider.values().any(|value| value == "router-doctor"));

        doctor.insert(
            crate::clients::doctor::DOCTOR_EVIDENCE_HEADER,
            "reachability-other".parse().unwrap(),
        );
        assert!(
            !request_evidence(client, protocol, path, &doctor),
            "{client}"
        );
    }
}

#[test]
fn catalog_probe_evidence_is_client_specific_and_not_authority_by_itself() {
    let mut headers = HeaderMap::new();
    headers.insert("authorization", "Bearer redacted".parse().unwrap());
    headers.insert("user-agent", "codex_exec/0.153.0".parse().unwrap());
    assert!(request_evidence(
        ClientKind::Codex,
        ClientProtocol::Catalog,
        "/api/services/codex/v1/models",
        &headers
    ));
    headers.insert("x-link-assistant-client", "claude".parse().unwrap());
    assert!(!request_evidence(
        ClientKind::Codex,
        ClientProtocol::Catalog,
        "/api/services/codex/v1/models",
        &headers
    ));
    assert!(!request_evidence(
        ClientKind::ClaudeCode,
        ClientProtocol::Catalog,
        "/api/services/codex/v1/models",
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
    headers.insert("user-agent", "codex_exec/0.153.0".parse().unwrap());
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
            "/api/services/codex/v1/responses",
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
            "/api/services/codex/v1/responses",
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

#[test]
fn invalid_canonical_principal_and_matrix_claims_fail_independently() {
    let policy = SubscriptionEntitlementPolicy::default();
    let mut claude_headers = HeaderMap::new();
    claude_headers.insert("x-api-key", "redacted".parse().unwrap());
    claude_headers.insert("anthropic-version", "2023-06-01".parse().unwrap());

    assert!(
        authorize_subscription(
            &policy,
            &bound_claims("claude-code"),
            SubscriptionProvider::Claude,
            ClientProtocol::AnthropicMessages,
            "/v1/messages",
            &claude_headers,
        )
        .is_err()
    );
    let mut no_principal = bound_claims("claude");
    no_principal.principal_id = Some(" ".into());
    assert!(
        authorize_subscription(
            &policy,
            &no_principal,
            SubscriptionProvider::Claude,
            ClientProtocol::AnthropicMessages,
            "/v1/messages",
            &claude_headers,
        )
        .is_err()
    );

    let mut opencode_headers = HeaderMap::new();
    opencode_headers.insert("authorization", "Bearer redacted".parse().unwrap());
    opencode_headers.insert("user-agent", "opencode/fixture".parse().unwrap());
    opencode_headers.insert("x-session-id", "fixture".parse().unwrap());
    assert!(
        authorize_subscription(
            &policy,
            &bound_claims("opencode"),
            SubscriptionProvider::Claude,
            ClientProtocol::OpenAIChat,
            "/v1/chat/completions",
            &opencode_headers,
        )
        .is_err()
    );
}

#[test]
fn every_supported_evidence_variant_is_explicit() {
    let mut gemini = HeaderMap::new();
    gemini.insert("x-goog-api-key", "redacted".parse().unwrap());
    gemini.insert(
        "x-gemini-api-privileged-user-id",
        "fixture".parse().unwrap(),
    );
    assert!(request_evidence(
        ClientKind::GeminiCli,
        ClientProtocol::GeminiNative,
        "/api/services/gemini/v1beta/models/gemini:generateContent",
        &gemini,
    ));

    let mut qwen = HeaderMap::new();
    qwen.insert("authorization", "Bearer redacted".parse().unwrap());
    qwen.insert("x-stainless-package-version", "1.0".parse().unwrap());
    assert!(request_evidence(
        ClientKind::QwenCode,
        ClientProtocol::OpenAIChat,
        "/api/services/qwen/v1/chat/completions",
        &qwen,
    ));
    qwen.insert("x-link-assistant-client", "qwen".parse().unwrap());
    assert!(request_evidence(
        ClientKind::QwenCode,
        ClientProtocol::Catalog,
        "/api/services/qwen/v1/models",
        &qwen,
    ));

    let mut grok = HeaderMap::new();
    grok.insert("authorization", "Bearer redacted".parse().unwrap());
    grok.insert("user-agent", "Grok CLI fixture".parse().unwrap());
    assert!(request_evidence(
        ClientKind::GrokCli,
        ClientProtocol::OpenAIChat,
        "/v1/chat/completions",
        &grok,
    ));
    assert!(!request_evidence(
        ClientKind::Cursor,
        ClientProtocol::Catalog,
        "/api/services/openai/v1/models",
        &HeaderMap::new(),
    ));
}

#[tokio::test]
async fn unbound_tokens_are_denied_before_an_anthropic_upstream_can_be_contacted() {
    let data = tempfile::tempdir().unwrap();
    let mut state = crate::app_state::AppState::for_tests(data.path());
    state.upstream_provider = crate::config::UpstreamProvider::Anthropic;
    state.upstream_base_url = "http://127.0.0.1:9".into();
    let token = state.token_manager.issue_token(1, "legacy token").unwrap();
    let request = Request::builder()
        .method("POST")
        .uri("/v1/messages")
        .header("x-api-key", token)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .body(Body::from(
            r#"{"model":"claude-live","max_tokens":16,"messages":[{"role":"user","content":"hi"}]}"#,
        ))
        .unwrap();

    let response = crate::proxy::proxy_handler(State(state), request).await;

    assert_eq!(response.status(), StatusCode::FORBIDDEN);
}

#[tokio::test]
async fn pinned_catalog_returns_forbidden_for_an_unbound_token() {
    let data = tempfile::tempdir().unwrap();
    let mut state = crate::app_state::AppState::for_tests(data.path());
    state.upstream_provider = crate::config::UpstreamProvider::Anthropic;
    let token = state.token_manager.issue_token(1, "legacy token").unwrap();
    let mut headers = HeaderMap::new();
    headers.insert("x-api-key", token.parse().unwrap());
    headers.insert("x-link-assistant-client", "claude".parse().unwrap());

    let response = crate::model_routing::models(
        State(state),
        OriginalUri("/api/services/anthropic/v1/models".parse().unwrap()),
        headers,
    )
    .await;

    assert_eq!(response.status(), StatusCode::FORBIDDEN);
}
