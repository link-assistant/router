//! Contract tests for the policy-gated z.ai GLM Coding Plan provider (#390).

use crate::client_policy::ClientProtocol;
use crate::clients::ClientKind;
use crate::zai_coding_plan::{
    ANTHROPIC_BASE_PATH, CHAT_BASE_PATH, RESPONSES_BASE_PATH, ZaiCodingPlanPolicy,
    registry_for_client,
};
use axum::body::Body;
use axum::http::{HeaderMap, HeaderValue, Request, StatusCode};
use http_body_util::BodyExt as _;
use std::fs;
use std::sync::{Arc, Mutex};

#[test]
fn provider_is_disabled_until_intermediary_risk_is_acknowledged() {
    let disabled = ZaiCodingPlanPolicy::new("subscriber-a", false, &[])
        .expect("a disabled policy remains valid");
    assert!(
        disabled
            .authorize(ClientKind::ClaudeCode, "subscriber-a")
            .is_err()
    );

    let enabled = ZaiCodingPlanPolicy::new("subscriber-a", true, &[])
        .expect("an acknowledged policy is valid");
    assert!(
        enabled
            .authorize(ClientKind::ClaudeCode, "subscriber-a")
            .is_ok()
    );
    assert!(enabled.authorize(ClientKind::Codex, "subscriber-a").is_ok());
    assert!(
        enabled
            .authorize(ClientKind::Opencode, "subscriber-a")
            .is_ok()
    );
}

#[test]
fn unsupported_client_acknowledgement_is_exact_and_revocable() {
    let denied = ZaiCodingPlanPolicy::new("subscriber-a", true, &[]).unwrap();
    assert!(
        denied
            .authorize(ClientKind::GeminiCli, "subscriber-a")
            .is_err()
    );

    let gemini = ZaiCodingPlanPolicy::new("subscriber-a", true, &["gemini".into()]).unwrap();
    assert!(
        gemini
            .authorize(ClientKind::GeminiCli, "subscriber-a")
            .is_ok()
    );
    assert!(
        gemini
            .authorize(ClientKind::GrokCli, "subscriber-a")
            .is_err()
    );
    assert!(
        gemini
            .authorize(ClientKind::QwenCode, "subscriber-a")
            .is_err()
    );
    assert!(gemini.authorize(ClientKind::Agent, "subscriber-a").is_err());
    assert!(
        gemini
            .authorize(ClientKind::Cursor, "subscriber-a")
            .is_err()
    );
}

#[test]
fn invalid_policy_and_registry_configuration_fails_closed() {
    assert!(ZaiCodingPlanPolicy::new("   ", true, &[]).is_err());
    assert!(ZaiCodingPlanPolicy::new("owner", true, &["unknown".into()]).is_err());
    assert!(ZaiCodingPlanPolicy::new("owner", true, &["claude".into()]).is_err());
    assert!(ZaiCodingPlanPolicy::new("owner", true, &["gemini-cli".into()]).is_err());

    for client in [ClientKind::Cursor, ClientKind::Agent] {
        assert!(registry_for_client(client, &["glm-5"]).is_err());
    }
}

#[test]
fn only_one_unsupported_zai_client_can_be_risk_accepted() {
    let error =
        ZaiCodingPlanPolicy::new("primary", true, &["gemini".to_string(), "qwen".to_string()])
            .expect_err("two unsupported client overrides must fail closed");
    assert!(error.contains("at most one"), "{error}");
}

fn resolved_zai_provider() -> crate::providers::ResolvedProvider {
    crate::providers::ResolvedProvider {
        name: "z-ai-personal".into(),
        kind: crate::providers::ProviderKind::ZaiCodingPlan,
        base_url: "http://127.0.0.1:9".into(),
        default_model: Some("glm-5".into()),
        models: vec!["glm-5".into()],
        supported_clients: vec!["claude".into(), "codex".into(), "opencode".into()],
        api_key: Some("zai-secret-key".into()),
        subscriber_id: Some("owner-a".into()),
        intermediary_risk_acknowledged: true,
        unsupported_clients: Vec::new(),
    }
}

fn claims(client: Option<&str>, principal: Option<&str>, scope: &str) -> crate::token::TokenClaims {
    crate::token::TokenClaims {
        sub: "token-id".into(),
        iat: 1,
        exp: i64::MAX,
        label: "z.ai test".into(),
        scope: scope.into(),
        github_repos: Vec::new(),
        client_kind: client.map(str::to_string),
        principal_id: principal.map(str::to_string),
    }
}

fn live_model(id: &str) -> crate::providers::LiveProviderModel {
    crate::providers::LiveProviderModel {
        id: id.into(),
        raw: serde_json::json!({"id": id}).as_object().unwrap().clone(),
    }
}

#[test]
fn authorization_rejects_invalid_claim_shapes_provider_kinds_and_evidence() {
    let provider = resolved_zai_provider();
    let mut inference_headers = HeaderMap::new();
    inference_headers.insert("authorization", HeaderValue::from_static("Bearer redacted"));
    inference_headers.insert("x-codex-turn-metadata", HeaderValue::from_static("fixture"));
    let authorize = |claims: &crate::token::TokenClaims,
                     headers: &HeaderMap,
                     provider: &crate::providers::ResolvedProvider| {
        crate::zai_coding_plan::authorize_model(
            provider,
            &[live_model("glm-5")],
            claims,
            headers,
            ClientProtocol::OpenAIResponses,
            "/v1/responses",
            "glm-5",
        )
    };

    assert!(
        authorize(
            &claims(Some("codex"), Some("owner-a"), "admin"),
            &inference_headers,
            &provider
        )
        .is_err()
    );
    assert!(
        authorize(
            &claims(None, Some("owner-a"), ""),
            &inference_headers,
            &provider
        )
        .is_err()
    );
    assert!(
        authorize(
            &claims(Some("unknown"), Some("owner-a"), ""),
            &inference_headers,
            &provider
        )
        .is_err()
    );
    assert!(
        authorize(
            &claims(Some("claude-code"), Some("owner-a"), ""),
            &inference_headers,
            &provider
        )
        .is_err()
    );
    assert!(
        authorize(
            &claims(Some("codex"), None, ""),
            &inference_headers,
            &provider
        )
        .is_err()
    );
    assert!(
        authorize(
            &claims(Some("codex"), Some("owner-a"), ""),
            &HeaderMap::new(),
            &provider
        )
        .is_err()
    );

    let mut ordinary = provider.clone();
    ordinary.kind = crate::providers::ProviderKind::OpenAICompatible;
    assert!(
        authorize(
            &claims(Some("codex"), Some("owner-a"), ""),
            &inference_headers,
            &ordinary
        )
        .is_err()
    );

    assert!(
        crate::zai_coding_plan::authorize_catalog(
            &provider,
            &claims(Some("codex"), Some("owner-a"), ""),
            &HeaderMap::new(),
            "/api/services/codex/v1/models",
        )
        .is_err()
    );
}

#[test]
fn coding_plan_is_single_subscriber_only() {
    let policy = ZaiCodingPlanPolicy::new("subscriber-a", true, &[]).unwrap();
    let error = policy
        .authorize(ClientKind::Codex, "subscriber-b")
        .expect_err("another principal must fail closed");
    assert!(error.contains("subscriber"));
}

#[test]
fn registries_are_explicit_client_specific_and_canonical() {
    let claude = registry_for_client(ClientKind::ClaudeCode, &["glm-5", "glm-4.7"]).unwrap();
    assert!(claude.iter().all(|entry| {
        entry.exposed_id == entry.canonical_id
            && entry.owner == "z.ai"
            && entry.protocol == ClientProtocol::AnthropicMessages
            && entry.canonical_id.starts_with("glm-")
    }));
    assert!(claude.iter().all(|entry| entry.display_name.is_some()));

    let codex = registry_for_client(ClientKind::Codex, &["glm-5"]).unwrap();
    assert_eq!(codex[0].exposed_id, "glm-5");
    assert_eq!(codex[0].canonical_id, "glm-5");
    assert_eq!(codex[0].protocol, ClientProtocol::OpenAIResponses);

    let opencode = registry_for_client(ClientKind::Opencode, &["glm-5"]).unwrap();
    assert_eq!(opencode[0].protocol, ClientProtocol::OpenAIChat);

    let future = registry_for_client(ClientKind::Codex, &["future-saffron-91"]).unwrap();
    assert_eq!(future[0].exposed_id, "future-saffron-91");
    assert_eq!(future[0].canonical_id, "future-saffron-91");
}

#[test]
fn exact_ids_are_preserved_and_router_aliases_are_never_invented() {
    let registry = registry_for_client(ClientKind::ClaudeCode, &["glm-5"]).unwrap();
    assert_eq!(registry.len(), 1);
    assert_eq!(registry[0].exposed_id, "glm-5");
    assert_eq!(registry[0].canonical_id, "glm-5");
    assert!(
        registry
            .iter()
            .all(|entry| !entry.exposed_id.contains("zai-"))
    );
}

#[test]
fn protocol_endpoints_are_fixed_to_coding_plan_roots() {
    assert_eq!(ANTHROPIC_BASE_PATH, "/api/anthropic");
    assert_eq!(CHAT_BASE_PATH, "/api/coding/paas/v4");
    assert_eq!(RESPONSES_BASE_PATH, "/api/v1");
}

fn install_provider(state: &mut crate::app_state::AppState, base_url: &str, unsupported: &[&str]) {
    install_provider_for_subscriber(state, base_url, unsupported, "owner-a");
}

fn install_provider_for_subscriber(
    state: &mut crate::app_state::AppState,
    base_url: &str,
    unsupported: &[&str],
    subscriber: &str,
) {
    state
        .provider_store
        .upsert(crate::providers::ProviderUpsert {
            name: "z-ai-personal".into(),
            kind: Some("z.ai-coding-plan".into()),
            base_url: base_url.into(),
            default_model: Some("glm-5".into()),
            models: Some(vec!["glm-5".into()]),
            supported_clients: None,
            api_key: Some("zai-secret-key".into()),
            api_key_env: None,
            encrypted_api_key: None,
            enabled: Some(true),
            subscriber_id: Some(subscriber.into()),
            acknowledge_intermediary_risk: Some(true),
            acknowledge_unsupported_clients: Some(
                unsupported
                    .iter()
                    .map(|value| (*value).to_string())
                    .collect(),
            ),
        })
        .unwrap();
    state.upstream_provider = crate::config::UpstreamProvider::ZaiCodingPlan;
    state.openai_compatible.provider_name = "z-ai-personal".into();
}

fn client_headers(
    state: &crate::app_state::AppState,
    client: ClientKind,
    principal: &str,
) -> HeaderMap {
    let token = crate::model_routing::tests::bound_client_token(state, client, Some(principal));
    let mut headers = HeaderMap::new();
    match client {
        ClientKind::ClaudeCode => {
            headers.insert("x-api-key", HeaderValue::from_str(&token).unwrap());
            headers.insert("anthropic-version", HeaderValue::from_static("2023-06-01"));
            headers.insert("user-agent", HeaderValue::from_static("claude-cli/2.1.259"));
        }
        ClientKind::Codex => {
            headers.insert(
                "authorization",
                HeaderValue::from_str(&format!("Bearer {token}")).unwrap(),
            );
            headers.insert("x-codex-turn-metadata", HeaderValue::from_static("fixture"));
            headers.insert("user-agent", HeaderValue::from_static("codex_exec/0.153.0"));
        }
        ClientKind::Opencode => {
            headers.insert(
                "authorization",
                HeaderValue::from_str(&format!("Bearer {token}")).unwrap(),
            );
            headers.insert("user-agent", HeaderValue::from_static("opencode/fixture"));
            headers.insert("x-session-id", HeaderValue::from_static("fixture"));
        }
        ClientKind::GeminiCli => {
            headers.insert("x-goog-api-key", HeaderValue::from_str(&token).unwrap());
            headers.insert(
                "x-goog-api-client",
                HeaderValue::from_static("gemini-cli/fixture"),
            );
        }
        ClientKind::GrokCli => {
            headers.insert(
                "authorization",
                HeaderValue::from_str(&format!("Bearer {token}")).unwrap(),
            );
            headers.insert("user-agent", HeaderValue::from_static("grok-cli/fixture"));
        }
        _ => unreachable!(),
    }
    headers
}

async fn recording_upstream() -> (
    String,
    Arc<Mutex<Vec<(String, String, String, HeaderMap)>>>,
    tokio::task::JoinHandle<()>,
) {
    let requests = Arc::new(Mutex::new(Vec::new()));
    let recorded = Arc::clone(&requests);
    let app = axum::Router::new().fallback(move |request: Request<Body>| {
        let recorded = Arc::clone(&recorded);
        async move {
            let path = request.uri().path().to_string();
            let authorization = request
                .headers()
                .get("authorization")
                .and_then(|value| value.to_str().ok())
                .unwrap_or_default()
                .to_string();
            let headers = request.headers().clone();
            let body = request.into_body().collect().await.unwrap().to_bytes();
            recorded.lock().unwrap().push((
                path.clone(),
                authorization,
                String::from_utf8_lossy(&body).into_owned(),
                headers,
            ));
            if path == crate::zai_coding_plan::HEALTH_PATH {
                (StatusCode::OK, "{}")
            } else if path == crate::zai_coding_plan::CATALOG_PATH {
                (
                    StatusCode::OK,
                    r#"{"object":"list","data":[{"id":"glm-5","display_name":"GLM 5"},{"id":"future-saffron-91","display_name":"Future Saffron"}]}"#,
                )
            } else {
                (StatusCode::OK, r#"{"id":"ok","model":"glm-5"}"#)
            }
        }
    });
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let base_url = format!("http://{}", listener.local_addr().unwrap());
    let handle = tokio::spawn(async move { axum::serve(listener, app).await.unwrap() });
    (base_url, requests, handle)
}

#[tokio::test]
async fn each_native_protocol_uses_only_its_fixed_endpoint_and_canonical_model() {
    let cases = [
        (
            ClientKind::ClaudeCode,
            ClientProtocol::AnthropicMessages,
            "/api/services/anthropic/v1/messages",
            "glm-5",
            "/api/anthropic/v1/messages",
            crate::metrics::Surface::Anthropic,
        ),
        (
            ClientKind::Codex,
            ClientProtocol::OpenAIResponses,
            "/api/services/codex/v1/responses",
            "glm-5",
            "/api/v1/responses",
            crate::metrics::Surface::OpenAIResponses,
        ),
        (
            ClientKind::Opencode,
            ClientProtocol::OpenAIChat,
            "/api/services/openai/v1/chat/completions",
            "glm-5",
            "/api/coding/paas/v4/chat/completions",
            crate::metrics::Surface::OpenAIChat,
        ),
    ];
    for (client, protocol, incoming, model, expected, surface) in cases {
        let (base_url, requests, handle) = recording_upstream().await;
        let data = tempfile::tempdir().unwrap();
        let mut state = crate::model_routing::tests::auto_state(Vec::new(), data.path());
        install_provider(&mut state, &base_url, &[]);
        let request_body =
            serde_json::json!({"model": model, "messages": [{"role":"user","content":"hi"}]});
        let response = crate::zai_coding_plan::forward(
            &state,
            &client_headers(&state, client, "owner-a"),
            request_body.clone(),
            incoming,
            protocol,
            surface,
        )
        .await;
        assert_eq!(response.status(), StatusCode::OK, "{client}");
        assert!(
            response
                .headers()
                .get(crate::output_limit::UPSTREAM_MODEL_HEADER)
                .is_none()
        );
        let response_body = response.into_body().collect().await.unwrap().to_bytes();
        assert_eq!(response_body.as_ref(), br#"{"id":"ok","model":"glm-5"}"#);
        let response_body: serde_json::Value = serde_json::from_slice(&response_body).unwrap();
        assert_eq!(response_body["model"], model);
        assert!(
            response_body
                .get(crate::output_limit::UPSTREAM_MODEL_FIELD)
                .is_none()
        );
        let requests = requests.lock().unwrap();
        assert_eq!(requests.len(), 2, "catalog then inference for {client}");
        assert_eq!(requests[0].0, crate::zai_coding_plan::CATALOG_PATH);
        assert_eq!(requests[0].1, "Bearer zai-secret-key");
        assert_eq!(requests[1].0, expected);
        assert_eq!(requests[1].1, "Bearer zai-secret-key");
        assert_eq!(
            serde_json::from_str::<serde_json::Value>(&requests[1].2).unwrap(),
            request_body
        );
        let forwarded = &requests[1].3;
        match client {
            ClientKind::ClaudeCode => {
                assert_eq!(forwarded["user-agent"], "claude-cli/2.1.259");
                assert_eq!(forwarded["anthropic-version"], "2023-06-01");
            }
            ClientKind::Codex => {
                assert_eq!(forwarded["user-agent"], "codex_exec/0.153.0");
                assert_eq!(forwarded["x-codex-turn-metadata"], "fixture");
            }
            ClientKind::Opencode => {
                assert_eq!(forwarded["user-agent"], "opencode/fixture");
                assert_eq!(forwarded["x-session-id"], "fixture");
            }
            _ => unreachable!(),
        }
        assert!(
            forwarded
                .keys()
                .all(|name| !name.as_str().starts_with("x-router-")
                    && !name.as_str().starts_with("x-link-assistant-"))
        );
        drop(requests);
        handle.abort();
    }
}

#[tokio::test]
async fn denied_principal_and_unacknowledged_client_make_zero_upstream_requests() {
    for (client, principal, unsupported) in [
        (ClientKind::Codex, "owner-b", Vec::<&str>::new()),
        (ClientKind::GrokCli, "owner-a", Vec::<&str>::new()),
    ] {
        let (base_url, requests, handle) = recording_upstream().await;
        let data = tempfile::tempdir().unwrap();
        let mut state = crate::model_routing::tests::auto_state(Vec::new(), data.path());
        install_provider(&mut state, &base_url, &unsupported);
        state.upstream_provider = crate::config::UpstreamProvider::Auto;
        let protocol = if client == ClientKind::Codex {
            ClientProtocol::OpenAIResponses
        } else {
            ClientProtocol::OpenAIChat
        };
        let path = if client == ClientKind::Codex {
            "/v1/responses"
        } else {
            "/v1/chat/completions"
        };
        let automatic_path = if client == ClientKind::Codex {
            "/api/services/codex/v1/responses"
        } else {
            "/api/services/openai/v1/chat/completions"
        };
        let headers = client_headers(&state, client, principal);
        let claims = crate::proxy::authenticate_client(&state, &headers).unwrap();
        let authorized = crate::zai_coding_plan::authorize_automatic_discovery(
            &state,
            &claims,
            &headers,
            protocol,
            automatic_path,
        );
        assert!(!authorized);
        assert!(
            crate::model_routing::route_state_with_subscription_for_client(
                &state,
                &serde_json::json!({"model":"glm-5"}),
                &crate::subscription::SubscriptionProvider::ALL,
                Some(client),
                authorized,
            )
            .await
            .is_err()
        );
        assert!(
            requests.lock().unwrap().is_empty(),
            "automatic discovery must fail locally before catalog access"
        );
        let response = crate::zai_coding_plan::forward(
            &state,
            &headers,
            serde_json::json!({"model":"glm-5","messages":[]}),
            path,
            protocol,
            crate::metrics::Surface::OpenAIResponses,
        )
        .await;
        assert_eq!(response.status(), StatusCode::FORBIDDEN);
        assert!(requests.lock().unwrap().is_empty());
        handle.abort();
    }
}

#[tokio::test]
async fn local_input_authentication_and_health_failures_are_stable() {
    let data = tempfile::tempdir().unwrap();
    let mut state = crate::model_routing::tests::auto_state(Vec::new(), data.path());
    let headers = client_headers(&state, ClientKind::Codex, "owner-a");
    let surface = crate::metrics::Surface::OpenAIResponses;

    let unauthenticated = crate::zai_coding_plan::forward(
        &state,
        &HeaderMap::new(),
        serde_json::json!({"model":"glm-5","input":"hi"}),
        "/v1/responses",
        ClientProtocol::OpenAIResponses,
        surface,
    )
    .await;
    assert_eq!(unauthenticated.status(), StatusCode::UNAUTHORIZED);

    let missing_model = crate::zai_coding_plan::forward(
        &state,
        &headers,
        serde_json::json!({"input":"hi"}),
        "/v1/responses",
        ClientProtocol::OpenAIResponses,
        surface,
    )
    .await;
    assert_eq!(missing_model.status(), StatusCode::BAD_REQUEST);

    let unavailable = crate::zai_coding_plan::forward(
        &state,
        &headers,
        serde_json::json!({"model":"glm-5","input":"hi"}),
        "/v1/responses",
        ClientProtocol::OpenAIResponses,
        surface,
    )
    .await;
    assert_eq!(unavailable.status(), StatusCode::SERVICE_UNAVAILABLE);

    let unauthenticated_count = crate::zai_coding_plan::count_tokens(
        &state,
        &HeaderMap::new(),
        "/v1/messages/count_tokens",
        &serde_json::json!({"model":"glm-5"}),
    );
    assert_eq!(unauthenticated_count.status(), StatusCode::UNAUTHORIZED);

    let claude_headers = client_headers(&state, ClientKind::ClaudeCode, "owner-a");
    let missing_count_model = crate::zai_coding_plan::count_tokens(
        &state,
        &claude_headers,
        "/v1/messages/count_tokens",
        &serde_json::json!({"messages":[]}),
    );
    assert_eq!(missing_count_model.status(), StatusCode::BAD_REQUEST);
    let unavailable_count = crate::zai_coding_plan::count_tokens(
        &state,
        &claude_headers,
        "/v1/messages/count_tokens",
        &serde_json::json!({"model":"glm-5","messages":[]}),
    );
    assert_eq!(unavailable_count.status(), StatusCode::SERVICE_UNAVAILABLE);

    install_provider(&mut state, "http://127.0.0.1:9", &[]);
    let unhealthy = crate::zai_coding_plan::forward(
        &state,
        &headers,
        serde_json::json!({"model":"glm-5","input":"hi"}),
        "/v1/responses",
        ClientProtocol::OpenAIResponses,
        surface,
    )
    .await;
    assert_eq!(unhealthy.status(), StatusCode::SERVICE_UNAVAILABLE);

    let mut missing_key = resolved_zai_provider();
    missing_key.api_key = None;
    assert!(
        crate::zai_coding_plan::credential_healthy(&state.client, &missing_key)
            .await
            .is_err()
    );
}

#[tokio::test]
async fn automatic_catalog_is_live_client_specific_and_routes_only_exact_ids() {
    let (base_url, requests, handle) = recording_upstream().await;
    let data = tempfile::tempdir().unwrap();
    let mut state = crate::model_routing::tests::auto_state(Vec::new(), data.path());
    install_provider_for_subscriber(&mut state, &base_url, &[], "primary");
    state
        .provider_store
        .upsert(crate::providers::ProviderUpsert {
            name: "z-ai-personal".into(),
            kind: Some("z.ai-coding-plan".into()),
            base_url: base_url.clone(),
            default_model: Some("future-saffron-91".into()),
            models: Some(vec!["future-saffron-91".into()]),
            supported_clients: None,
            api_key: Some("zai-secret-key".into()),
            api_key_env: None,
            encrypted_api_key: None,
            enabled: Some(true),
            subscriber_id: Some("owner-a".into()),
            acknowledge_intermediary_risk: Some(true),
            acknowledge_unsupported_clients: Some(Vec::new()),
        })
        .unwrap();
    state.upstream_provider = crate::config::UpstreamProvider::Auto;

    for client in [
        ClientKind::ClaudeCode,
        ClientKind::Codex,
        ClientKind::Opencode,
    ] {
        let headers = client_headers(&state, client, "owner-a");
        let path = match client {
            ClientKind::Codex => "/api/services/codex/v1/models",
            ClientKind::ClaudeCode => "/api/services/anthropic/v1/models",
            _ => "/api/services/openai/v1/models",
        };
        let response = crate::model_routing::models(
            axum::extract::State(state.clone()),
            axum::extract::OriginalUri(path.parse().unwrap()),
            headers,
        )
        .await;
        assert_eq!(response.status(), StatusCode::OK);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let body = String::from_utf8_lossy(&body);
        assert!(body.contains("future-saffron-91"), "{client}: {body}");
        assert!(!body.contains("claude-zai-"), "{client}: {body}");
        assert!(!body.contains("z.ai/future"), "{client}: {body}");
        assert!(body.contains(r#""owned_by":"z.ai""#));
        assert!(body.contains("display_name"));
    }
    assert_eq!(
        requests.lock().unwrap().len(),
        1,
        "the non-inference live catalog is shared until its refresh deadline"
    );

    let routed = crate::model_routing::route_state_with_subscription_for_client(
        &state,
        &serde_json::json!({"model":"future-saffron-91"}),
        &crate::subscription::SubscriptionProvider::ALL,
        Some(ClientKind::Opencode),
        true,
    )
    .await
    .unwrap();
    assert_eq!(
        routed.state.upstream_provider,
        crate::config::UpstreamProvider::ZaiCodingPlan
    );
    assert_eq!(
        routed.state.bridge_model.as_deref(),
        Some("future-saffron-91")
    );
    assert!(
        crate::model_routing::route_state_with_subscription_for_client(
            &state,
            &serde_json::json!({"model":"glm-unknown"}),
            &crate::subscription::SubscriptionProvider::ALL,
            Some(ClientKind::Opencode),
            true,
        )
        .await
        .is_err()
    );
    handle.abort();
}

#[path = "zai_coding_plan_catalog_tests.rs"]
mod catalog_tests;
