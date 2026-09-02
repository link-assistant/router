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
        (entry.exposed_id.starts_with("claude") || entry.exposed_id.starts_with("anthropic"))
            && entry.owner == "z.ai"
            && entry.protocol == ClientProtocol::AnthropicMessages
            && entry.canonical_id.starts_with("glm-")
    }));
    assert!(claude.iter().all(|entry| entry.display_name.is_some()));

    let codex = registry_for_client(ClientKind::Codex, &["glm-5"]).unwrap();
    assert_eq!(codex[0].exposed_id, "z.ai/glm-5");
    assert_eq!(codex[0].canonical_id, "glm-5");
    assert_eq!(codex[0].protocol, ClientProtocol::OpenAIResponses);

    let opencode = registry_for_client(ClientKind::Opencode, &["glm-5"]).unwrap();
    assert_eq!(opencode[0].protocol, ClientProtocol::OpenAIChat);

    assert!(registry_for_client(ClientKind::Codex, &["glm-future-unreviewed"]).is_err());
}

#[test]
fn aliases_are_exact_and_never_prefix_stripped() {
    let registry = registry_for_client(ClientKind::ClaudeCode, &["glm-5"]).unwrap();
    assert_eq!(
        registry
            .iter()
            .find(|entry| entry.exposed_id == "claude-zai-glm-5")
            .unwrap()
            .canonical_id,
        "glm-5"
    );
    assert!(
        registry
            .iter()
            .all(|entry| entry.exposed_id != "claude-glm-unknown")
    );
}

#[test]
fn protocol_endpoints_are_fixed_to_coding_plan_roots() {
    assert_eq!(ANTHROPIC_BASE_PATH, "/api/anthropic");
    assert_eq!(CHAT_BASE_PATH, "/api/coding/paas/v4");
    assert_eq!(RESPONSES_BASE_PATH, "/api/v1");
}

fn install_provider(state: &mut crate::app_state::AppState, base_url: &str, unsupported: &[&str]) {
    state
        .provider_store
        .upsert(crate::providers::ProviderUpsert {
            name: "z-ai-personal".into(),
            kind: Some("z.ai-coding-plan".into()),
            base_url: base_url.into(),
            default_model: Some("glm-5".into()),
            models: Some(vec!["glm-5".into()]),
            api_key: Some("zai-secret-key".into()),
            api_key_env: None,
            encrypted_api_key: None,
            enabled: Some(true),
            subscriber_id: Some("owner-a".into()),
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
        }
        ClientKind::Codex => {
            headers.insert(
                "authorization",
                HeaderValue::from_str(&format!("Bearer {token}")).unwrap(),
            );
            headers.insert("x-codex-turn-metadata", HeaderValue::from_static("fixture"));
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
    Arc<Mutex<Vec<(String, String, String)>>>,
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
            let body = request.into_body().collect().await.unwrap().to_bytes();
            recorded.lock().unwrap().push((
                path.clone(),
                authorization,
                String::from_utf8_lossy(&body).into_owned(),
            ));
            if path == crate::zai_coding_plan::HEALTH_PATH {
                (StatusCode::OK, "{}")
            } else {
                (StatusCode::OK, r#"{"id":"ok"}"#)
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
            "/v1/messages",
            "claude-zai-glm-5",
            "/api/anthropic/v1/messages",
            crate::metrics::Surface::Anthropic,
        ),
        (
            ClientKind::Codex,
            ClientProtocol::OpenAIResponses,
            "/v1/responses",
            "z.ai/glm-5",
            "/api/v1/responses",
            crate::metrics::Surface::OpenAIResponses,
        ),
        (
            ClientKind::Opencode,
            ClientProtocol::OpenAIChat,
            "/v1/chat/completions",
            "z.ai/glm-5",
            "/api/coding/paas/v4/chat/completions",
            crate::metrics::Surface::OpenAIChat,
        ),
    ];
    for (client, protocol, incoming, model, expected, surface) in cases {
        let (base_url, requests, handle) = recording_upstream().await;
        let data = tempfile::tempdir().unwrap();
        let mut state = crate::model_routing::tests::auto_state(Vec::new(), data.path());
        install_provider(&mut state, &base_url, &[]);
        let response = crate::zai_coding_plan::forward(
            &state,
            &client_headers(&state, client, "owner-a"),
            serde_json::json!({"model": model, "messages": [{"role":"user","content":"hi"}]}),
            incoming,
            protocol,
            surface,
        )
        .await;
        assert_eq!(response.status(), StatusCode::OK, "{client}");
        let requests = requests.lock().unwrap();
        assert_eq!(requests.len(), 2, "health then inference for {client}");
        assert_eq!(requests[0].0, crate::zai_coding_plan::HEALTH_PATH);
        assert_eq!(requests[0].1, "zai-secret-key", "health uses raw key");
        assert_eq!(requests[1].0, expected);
        assert_eq!(requests[1].1, "Bearer zai-secret-key");
        assert!(requests[1].2.contains(r#""model":"glm-5""#));
        assert!(!requests[1].2.contains(model));
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
        let response = crate::zai_coding_plan::forward(
            &state,
            &client_headers(&state, client, principal),
            serde_json::json!({"model":"z.ai/glm-5","messages":[]}),
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
async fn automatic_catalog_is_live_client_specific_and_routes_only_exact_aliases() {
    let (base_url, requests, handle) = recording_upstream().await;
    let data = tempfile::tempdir().unwrap();
    let mut state = crate::model_routing::tests::auto_state(Vec::new(), data.path());
    install_provider(&mut state, &base_url, &[]);
    state.upstream_provider = crate::config::UpstreamProvider::Auto;

    for (client, expected, forbidden) in [
        (ClientKind::ClaudeCode, "claude-zai-glm-5", "z.ai/glm-5"),
        (ClientKind::Codex, "z.ai/glm-5", "claude-zai-glm-5"),
        (ClientKind::Opencode, "z.ai/glm-5", "claude-zai-glm-5"),
    ] {
        let mut headers = client_headers(&state, client, "owner-a");
        headers.insert(
            "x-link-assistant-client",
            HeaderValue::from_str(client.canonical_name()).unwrap(),
        );
        let path = if client == ClientKind::Codex {
            "/api/codex/v1/models"
        } else {
            "/v1/models"
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
        assert!(body.contains(expected), "{client}: {body}");
        assert!(!body.contains(forbidden), "{client}: {body}");
        assert!(body.contains(r#""owned_by":"z.ai""#));
        assert!(body.contains("display_name"));
    }
    assert_eq!(
        requests.lock().unwrap().len(),
        3,
        "one free health check per catalog"
    );

    let routed =
        crate::model_routing::route_state(&state, &serde_json::json!({"model":"claude-zai-glm-5"}))
            .await
            .unwrap();
    assert_eq!(
        routed.upstream_provider,
        crate::config::UpstreamProvider::ZaiCodingPlan
    );
    assert_eq!(routed.bridge_model.as_deref(), Some("glm-5"));
    assert!(
        crate::model_routing::route_state(
            &state,
            &serde_json::json!({"model":"claude-zai-glm-unknown"}),
        )
        .await
        .is_err()
    );
    handle.abort();
}

#[tokio::test]
async fn rejected_health_returns_a_successful_empty_catalog_without_hiding_other_providers() {
    let requests = Arc::new(Mutex::new(Vec::<String>::new()));
    let recorded = Arc::clone(&requests);
    let app = axum::Router::new().fallback(move |request: Request<Body>| {
        let recorded = Arc::clone(&recorded);
        async move {
            recorded
                .lock()
                .unwrap()
                .push(request.uri().path().to_string());
            (StatusCode::UNAUTHORIZED, "rejected")
        }
    });
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let base_url = format!("http://{}", listener.local_addr().unwrap());
    let handle = tokio::spawn(async move { axum::serve(listener, app).await.unwrap() });
    let data = tempfile::tempdir().unwrap();
    let mut state = crate::model_routing::tests::auto_state(Vec::new(), data.path());
    install_provider(&mut state, &base_url, &[]);
    state
        .provider_store
        .upsert(crate::providers::ProviderUpsert {
            name: "ordinary-api".into(),
            kind: Some("openai-compatible".into()),
            base_url: "https://ordinary.example/v1".into(),
            default_model: None,
            models: Some(vec!["ordinary-model".into()]),
            api_key: None,
            api_key_env: None,
            encrypted_api_key: None,
            enabled: Some(true),
            subscriber_id: None,
            acknowledge_intermediary_risk: None,
            acknowledge_unsupported_clients: None,
        })
        .unwrap();
    state.upstream_provider = crate::config::UpstreamProvider::Auto;
    let mut headers = client_headers(&state, ClientKind::Codex, "owner-a");
    headers.insert("x-link-assistant-client", HeaderValue::from_static("codex"));
    let response = crate::model_routing::models(
        axum::extract::State(state),
        axum::extract::OriginalUri("/api/codex/v1/models".parse().unwrap()),
        headers,
    )
    .await;
    assert_eq!(response.status(), StatusCode::OK);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let body = String::from_utf8_lossy(&body);
    assert!(body.contains("ordinary-model"), "{body}");
    assert!(!body.contains("z.ai/glm-5"), "{body}");
    assert!(
        body.contains("z.ai"),
        "degraded provider remains diagnosable: {body}"
    );
    assert_eq!(requests.lock().unwrap().len(), 1);
    handle.abort();
}

#[tokio::test]
async fn one_unsupported_gemini_override_reuses_translation_and_revocation_is_immediate() {
    let (base_url, requests, handle) = recording_upstream().await;
    let data = tempfile::tempdir().unwrap();
    let mut state = crate::model_routing::tests::auto_state(Vec::new(), data.path());
    install_provider(&mut state, &base_url, &["gemini"]);
    state.upstream_provider = crate::config::UpstreamProvider::Auto;
    let headers = client_headers(&state, ClientKind::GeminiCli, "owner-a");
    let response = Box::pin(crate::gemini::forward_native_gemini(
        axum::extract::State(state.clone()),
        axum::extract::Path("v1beta/models/z.ai/glm-5:generateContent".to_string()),
        headers,
        Ok(axum::Json(serde_json::json!({
            "contents": [{"role":"user","parts":[{"text":"hi"}]}]
        }))),
    ))
    .await;
    assert_eq!(response.status(), StatusCode::OK);
    let recorded = requests.lock().unwrap().clone();
    assert_eq!(recorded.len(), 2);
    assert_eq!(recorded[1].0, "/api/coding/paas/v4/chat/completions");
    assert!(recorded[1].2.contains(r#""model":"glm-5""#));

    state
        .provider_store
        .upsert(crate::providers::ProviderUpsert {
            name: "z-ai-personal".into(),
            kind: Some("z.ai-coding-plan".into()),
            base_url,
            default_model: Some("glm-5".into()),
            models: Some(vec!["glm-5".into()]),
            api_key: Some("zai-secret-key".into()),
            api_key_env: None,
            encrypted_api_key: None,
            enabled: Some(true),
            subscriber_id: Some("owner-a".into()),
            acknowledge_intermediary_risk: Some(true),
            acknowledge_unsupported_clients: Some(Vec::new()),
        })
        .unwrap();
    let before = requests.lock().unwrap().len();
    let response = Box::pin(crate::gemini::forward_native_gemini(
        axum::extract::State(state.clone()),
        axum::extract::Path("v1beta/models/z.ai/glm-5:generateContent".to_string()),
        client_headers(&state, ClientKind::GeminiCli, "owner-a"),
        Ok(axum::Json(serde_json::json!({"contents": []}))),
    ))
    .await;
    assert_eq!(response.status(), StatusCode::FORBIDDEN);
    assert_eq!(
        requests.lock().unwrap().len(),
        before,
        "revocation is pre-upstream"
    );
    handle.abort();
}

#[tokio::test]
async fn streaming_tool_cycle_and_count_tokens_keep_the_exact_model_boundary() {
    let requests = Arc::new(Mutex::new(Vec::<(String, String)>::new()));
    let recorded = Arc::clone(&requests);
    let app = axum::Router::new().fallback(move |request: Request<Body>| {
        let recorded = Arc::clone(&recorded);
        async move {
            let path = request.uri().path().to_string();
            let body = request.into_body().collect().await.unwrap().to_bytes();
            recorded
                .lock()
                .unwrap()
                .push((path.clone(), String::from_utf8_lossy(&body).into_owned()));
            if path == crate::zai_coding_plan::HEALTH_PATH {
                return axum::response::Response::builder()
                    .status(StatusCode::OK)
                    .body(Body::from("{}"))
                    .unwrap();
            }
            axum::response::Response::builder()
                .status(StatusCode::OK)
                .header("content-type", "text/event-stream")
                .body(Body::from(
                    "data: {\"choices\":[{\"delta\":{\"tool_calls\":[{\"id\":\"call_1\",\"function\":{\"name\":\"lookup\",\"arguments\":\"{}\"}}]}}]}\n\ndata: [DONE]\n\n",
                ))
                .unwrap()
        }
    });
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let base_url = format!("http://{}", listener.local_addr().unwrap());
    let handle = tokio::spawn(async move { axum::serve(listener, app).await.unwrap() });
    let data = tempfile::tempdir().unwrap();
    let mut state = crate::model_routing::tests::auto_state(Vec::new(), data.path());
    install_provider(&mut state, &base_url, &[]);
    let headers = client_headers(&state, ClientKind::Opencode, "owner-a");
    let response = crate::zai_coding_plan::forward(
        &state,
        &headers,
        serde_json::json!({
            "model":"z.ai/glm-5",
            "stream":true,
            "messages":[{"role":"user","content":"look up"}],
            "tools":[{"type":"function","function":{"name":"lookup","parameters":{"type":"object"}}}]
        }),
        "/v1/chat/completions",
        ClientProtocol::OpenAIChat,
        crate::metrics::Surface::OpenAIChat,
    )
    .await;
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(
        response.headers().get("content-type").unwrap(),
        "text/event-stream"
    );
    let body = response.into_body().collect().await.unwrap().to_bytes();
    assert!(String::from_utf8_lossy(&body).contains("[DONE]"));
    let recorded = requests.lock().unwrap();
    assert_eq!(recorded.len(), 2);
    assert!(recorded[1].1.contains(r#""model":"glm-5""#));
    assert!(recorded[1].1.contains(r#""tools""#));
    drop(recorded);

    let claude_headers = client_headers(&state, ClientKind::ClaudeCode, "owner-a");
    let before = requests.lock().unwrap().len();
    let response = crate::zai_coding_plan::count_tokens(
        &state,
        &claude_headers,
        "/v1/messages/count_tokens",
        &serde_json::json!({
            "model":"claude-zai-glm-5",
            "messages":[{"role":"user","content":"hello"}]
        }),
    );
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(requests.lock().unwrap().len(), before, "counting is local");
    let ghost_response = crate::zai_coding_plan::count_tokens(
        &state,
        &claude_headers,
        "/v1/messages/count_tokens",
        &serde_json::json!({"model":"claude-sonnet-built-in","messages":[]}),
    );
    assert_eq!(ghost_response.status(), StatusCode::FORBIDDEN);
    assert_eq!(
        requests.lock().unwrap().len(),
        before,
        "ghost model is local denial"
    );
    handle.abort();
}
