//! An exhausted z.ai Coding Plan is a terminal, visible state (issue #657).

use super::*;

/// The exact body z.ai returned for an empty package, with HTTP 429.
const EXHAUSTED: &str = r#"{"error":{"code":"1113","message":"[1113][Insufficient balance or no resource package. Please recharge.][req-657]","type":"rate_limit_error"},"type":"error"}"#;
/// A genuine short-window z.ai rate limit.
const RATE_LIMITED: &str = r#"{"error":{"code":"1302","message":"[1302][High concurrency usage of this API, please reduce concurrency or contact customer service to increase limits][req-1302]","type":"rate_limit_error"},"type":"error"}"#;

/// A z.ai fake whose inference answer is switched by the test: `None` serves
/// a normal completion, `Some(body)` answers 429 with that body.
async fn switchable_upstream() -> (
    String,
    Arc<Mutex<Option<&'static str>>>,
    tokio::task::JoinHandle<()>,
) {
    let refusal = Arc::new(Mutex::new(Some(EXHAUSTED)));
    let answer = Arc::clone(&refusal);
    let app = axum::Router::new().fallback(move |request: Request<Body>| {
        let answer = Arc::clone(&answer);
        async move {
            let path = request.uri().path().to_string();
            let json = |status: StatusCode, body: &str| {
                axum::response::Response::builder()
                    .status(status)
                    .header("content-type", "application/json")
                    .body(Body::from(body.to_string()))
                    .unwrap()
            };
            if path == crate::zai_coding_plan::HEALTH_PATH {
                return json(StatusCode::OK, "{}");
            }
            if path == crate::zai_coding_plan::CATALOG_PATH {
                return json(
                    StatusCode::OK,
                    r#"{"object":"list","data":[{"id":"glm-5"},{"id":"glm-5.3"}]}"#,
                );
            }
            let refusal = *answer.lock().unwrap();
            refusal.map_or_else(
                || {
                    json(
                        StatusCode::OK,
                        r#"{"id":"msg_ok","type":"message","role":"assistant","model":"glm-5.3","content":[{"type":"text","text":"OK"}],"stop_reason":"end_turn","usage":{"input_tokens":1,"output_tokens":1}}"#,
                    )
                },
                |body| json(StatusCode::TOO_MANY_REQUESTS, body),
            )
        }
    });
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let base_url = format!("http://{}", listener.local_addr().unwrap());
    let handle = tokio::spawn(async move { axum::serve(listener, app).await.unwrap() });
    (base_url, refusal, handle)
}

async fn send(
    state: &crate::app_state::AppState,
    client: ClientKind,
    body: serde_json::Value,
) -> (StatusCode, HeaderMap, serde_json::Value) {
    let (path, protocol, surface) = if client == ClientKind::ClaudeCode {
        (
            "/api/services/anthropic/v1/messages",
            ClientProtocol::AnthropicMessages,
            crate::metrics::Surface::Anthropic,
        )
    } else {
        (
            "/api/services/openai/v1/chat/completions",
            ClientProtocol::OpenAIChat,
            crate::metrics::Surface::OpenAIChat,
        )
    };
    let response = crate::zai_coding_plan::forward(
        state,
        &client_headers(state, client, "owner-a"),
        body,
        path,
        protocol,
        surface,
    )
    .await;
    let status = response.status();
    let headers = response.headers().clone();
    let bytes = response.into_body().collect().await.unwrap().to_bytes();
    (
        status,
        headers,
        serde_json::from_slice(&bytes).unwrap_or(serde_json::Value::Null),
    )
}

fn messages(stream: bool) -> serde_json::Value {
    serde_json::json!({
        "model": "glm-5.3",
        "stream": stream,
        "max_tokens": 16,
        "messages": [{"role": "user", "content": "Reply with exactly OK."}]
    })
}

#[tokio::test]
async fn exhausted_plan_is_a_non_retryable_billing_error_for_every_request_shape() {
    let (base_url, _, handle) = switchable_upstream().await;
    let data = tempfile::tempdir().unwrap();
    let mut state = crate::model_routing::tests::auto_state(Vec::new(), data.path());
    install_provider(&mut state, &base_url, &[]);

    let mut thinking = messages(false);
    thinking["thinking"] = serde_json::json!({"type": "enabled", "budget_tokens": 1024});
    for body in [messages(false), messages(true), thinking] {
        let (status, headers, error) = send(&state, ClientKind::ClaudeCode, body.clone()).await;
        assert_eq!(status, StatusCode::PAYMENT_REQUIRED, "{body}: {error}");
        assert_eq!(headers.get("x-router-upstream-error-code").unwrap(), "1113");
        assert!(headers.get("retry-after").is_none());
        assert_eq!(error["type"], "error");
        assert_eq!(error["error"]["type"], "billing_error", "{error}");
        assert_eq!(error["error"]["upstream_code"], "1113");
        assert_eq!(error["error"]["upstream_request_id"], "req-657");
        let message = error["error"]["message"].as_str().unwrap();
        assert!(message.contains("Insufficient balance"), "{message}");
        assert!(message.contains("code 1113"), "{message}");
        assert!(!message.contains("zai-secret-key"), "{message}");
    }

    let (status, _, error) = send(&state, ClientKind::Codex, messages(false)).await;
    assert_eq!(status, StatusCode::PAYMENT_REQUIRED, "{error}");
    assert_eq!(error["error"]["type"], "insufficient_quota", "{error}");
    assert_eq!(error["error"]["code"], "insufficient_quota", "{error}");
    handle.abort();
}

#[tokio::test]
async fn exhaustion_is_recorded_reported_and_cleared_when_z_ai_serves_again() {
    let (base_url, refusal, handle) = switchable_upstream().await;
    let data = tempfile::tempdir().unwrap();
    let mut state = crate::model_routing::tests::auto_state(Vec::new(), data.path());
    install_provider(&mut state, &base_url, &[]);
    assert!(state.provider_store.exhaustion("z-ai-personal").is_none());

    let (status, _, _) = send(&state, ClientKind::ClaudeCode, messages(false)).await;
    assert_eq!(status, StatusCode::PAYMENT_REQUIRED);
    let recorded = state.provider_store.exhaustion("z-ai-personal").unwrap();
    assert_eq!(recorded.code, 1113);
    assert_eq!(recorded.request_id.as_deref(), Some("req-657"));

    assert_eq!(
        crate::zai_coding_plan::configured_health(&state).await,
        Some(false),
        "a reachable but exhausted plan is not healthy"
    );
    let health =
        crate::subscription_health::subscription_health(axum::extract::State(state.clone())).await;
    let health = axum::response::IntoResponse::into_response(health);
    let bytes = health.into_body().collect().await.unwrap().to_bytes();
    let report: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
    let degraded = &report["degraded_providers"][0];
    assert_eq!(degraded["provider"], "z.ai", "{report}");
    assert_eq!(degraded["state"], "exhausted", "{report}");
    assert_eq!(degraded["upstream_code"], "1113", "{report}");
    assert!(
        degraded["reason"]
            .as_str()
            .unwrap()
            .contains("Insufficient balance"),
        "{report}"
    );

    *refusal.lock().unwrap() = None;
    let (status, _, _) = send(&state, ClientKind::ClaudeCode, messages(false)).await;
    assert_eq!(status, StatusCode::OK);
    assert!(
        state.provider_store.exhaustion("z-ai-personal").is_none(),
        "a served request proves the plan has quota again"
    );
    assert_eq!(
        crate::zai_coding_plan::configured_health(&state).await,
        Some(true)
    );
    handle.abort();
}

#[tokio::test]
async fn a_genuine_rate_limit_is_relayed_unchanged_and_not_recorded() {
    let (base_url, refusal, handle) = switchable_upstream().await;
    *refusal.lock().unwrap() = Some(RATE_LIMITED);
    let data = tempfile::tempdir().unwrap();
    let mut state = crate::model_routing::tests::auto_state(Vec::new(), data.path());
    install_provider(&mut state, &base_url, &[]);

    let (status, _, error) = send(&state, ClientKind::ClaudeCode, messages(false)).await;
    assert_eq!(status, StatusCode::TOO_MANY_REQUESTS);
    assert_eq!(
        error,
        serde_json::from_str::<serde_json::Value>(RATE_LIMITED).unwrap()
    );
    assert!(state.provider_store.exhaustion("z-ai-personal").is_none());
    handle.abort();
}

#[tokio::test]
async fn an_exhausted_plan_keeps_its_rows_listed_but_marked_unavailable() {
    let (base_url, _, handle) = switchable_upstream().await;
    let data = tempfile::tempdir().unwrap();
    let mut state = crate::model_routing::tests::auto_state(Vec::new(), data.path());
    install_provider(&mut state, &base_url, &[]);
    state.upstream_provider = crate::config::UpstreamProvider::Auto;
    state.provider_store.record_exhaustion(
        "z-ai-personal",
        crate::zai_upstream_error::classify(EXHAUSTED.as_bytes()).unwrap(),
    );

    let response = crate::model_routing::models(
        axum::extract::State(state.clone()),
        axum::extract::OriginalUri("/api/models".parse().unwrap()),
        client_headers(&state, ClientKind::ClaudeCode, "owner-a"),
    )
    .await;
    assert_eq!(response.status(), StatusCode::OK);
    let bytes = response.into_body().collect().await.unwrap().to_bytes();
    let catalog: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
    let rows = catalog["data"].as_array().unwrap();
    let glm = rows
        .iter()
        .find(|row| row["id"] == "glm-5.3")
        .unwrap_or_else(|| panic!("an exhausted plan's models stay listed: {catalog}"));
    assert_eq!(glm["router_available"], false, "{catalog}");
    assert!(
        glm["router_unavailable_reason"]
            .as_str()
            .unwrap()
            .contains("code 1113"),
        "{catalog}"
    );
    handle.abort();
}

#[tokio::test]
async fn a_listed_model_without_client_evidence_is_forbidden_not_unknown() {
    let (base_url, _, handle) = switchable_upstream().await;
    let data = tempfile::tempdir().unwrap();
    let mut state = crate::model_routing::tests::auto_state(Vec::new(), data.path());
    install_provider(&mut state, &base_url, &[]);
    state.upstream_provider = crate::config::UpstreamProvider::Auto;
    let provider = crate::zai_coding_plan::resolve(&state).unwrap().unwrap();
    crate::zai_coding_plan::live_catalog(&state, &provider)
        .await
        .unwrap();

    let route = |model: &'static str| {
        let state = state.clone();
        async move {
            crate::model_routing::route_state_with_subscription_for_client(
                &state,
                &serde_json::json!({ "model": model }),
                &crate::subscription::SubscriptionProvider::ALL,
                Some(ClientKind::ClaudeCode),
                false,
            )
            .await
        }
    };
    let Err(crate::model_routing::ModelRouteError::Forbidden(message)) = route("glm-5.3").await
    else {
        panic!("a model the token's catalog lists must not be reported as unknown");
    };
    assert!(message.contains("glm-5.3"), "{message}");
    assert!(message.contains("claude"), "{message}");
    assert!(
        matches!(
            route("glm-unknown").await,
            Err(crate::model_routing::ModelRouteError::NotFound(_))
        ),
        "a model nobody lists stays a 404"
    );
    handle.abort();
}
