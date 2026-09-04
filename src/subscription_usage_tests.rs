use super::*;
use axum::body::Body;
use axum::extract::Request as AxumRequest;
use axum::http::Request;
use axum::routing::get;
use http_body_util::BodyExt as _;
use serde_json::json;
use std::sync::Arc;
use tower::ServiceExt as _;

#[test]
fn anthropic_fields_are_normalized_and_missing_values_stay_absent() {
    let windows = anthropic_windows(&json!({
        "five_hour": {"utilization": 25.5, "resets_at": "2030-01-01T00:00:00Z"},
        "seven_day": {"utilization": 50.0}
    }));
    assert_eq!(windows.len(), 2);
    assert_eq!(windows[0].remaining_percentage, Some(74.5));
    assert!(windows[1].resets_at.is_none());

    let mut usage = empty_usage(UsageProvider::Anthropic);
    apply_anthropic_profile(
        &mut usage,
        &json!({"organization": {
            "subscription_status": "active",
            "subscription_created_at": "2029-01-01T00:00:00Z",
            "claude_code_trial_ends_at": "2029-02-01T00:00:00Z"
        }}),
    );
    assert_eq!(usage.status, "active");
    assert!(usage.subscription_end.is_none());
}

#[test]
fn openai_normalizer_drops_personal_fields_and_keeps_limits() {
    let token = SubscriptionToken {
        access_token: "not-a-jwt".into(),
        refresh_token: Some("never-serialize-this".into()),
        expires_at_ms: None,
        account_id: Some("private-account".into()),
        resource_url: None,
    };
    let usage = normalize_openai(
        &json!({
            "email": "private@example.test",
            "account_id": "private-account",
            "plan_type": "pro",
            "rate_limit": {"primary_window": {
                "used_percent": 6.0,
                "limit_window_seconds": 18000,
                "reset_at": 1_778_631_148
            }},
            "additional_rate_limits": [{"limit_name": "review", "rate_limit": {
                "secondary_window": {"used_percent": 22.0}
            }}],
            "credits": {"balance": "10", "unlimited": false}
        }),
        &token,
    );
    let rendered = serde_json::to_string(&usage).unwrap();
    assert_eq!(usage.windows[0].remaining_percentage, Some(94.0));
    assert_eq!(usage.additional_limits[0].name, "review");
    for secret in [
        "private@example.test",
        "private-account",
        "never-serialize-this",
    ] {
        assert!(!rendered.contains(secret), "{rendered}");
    }
}

#[test]
fn zai_http_200_error_bodies_are_not_treated_as_healthy() {
    for payload in [
        json!({"success": false, "code": 1001}),
        json!({"success": false, "code": 401}),
    ] {
        assert!(matches!(
            zai_payload(payload),
            Err(VendorResponse::AuthenticationRejected)
        ));
    }
    let healthy = zai_payload(json!({"success": true, "code": 200, "data": {
        "limits": [{"type": "TOKENS_LIMIT", "percentage": 12.0}]
    }}))
    .unwrap();
    let usage = normalize_zai(&healthy, false);
    assert_eq!(usage.windows[0].remaining_percentage, Some(88.0));
}

#[tokio::test]
async fn vendor_http_failures_are_typed_without_echoing_bodies() {
    async fn ok() -> impl IntoResponse {
        axum::Json(json!({"five_hour": {"utilization": 1}}))
    }
    async fn unauthorized() -> impl IntoResponse {
        (StatusCode::UNAUTHORIZED, "private-body")
    }
    async fn limited() -> impl IntoResponse {
        (
            StatusCode::TOO_MANY_REQUESTS,
            [("retry-after", "45")],
            "private-body",
        )
    }
    async fn malformed() -> impl IntoResponse {
        (StatusCode::OK, "not-json")
    }
    let app = axum::Router::new()
        .route("/ok", get(ok))
        .route("/unauthorized", get(unauthorized))
        .route("/limited", get(limited))
        .route("/malformed", get(malformed));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let address = listener.local_addr().unwrap();
    let server = tokio::spawn(async move { axum::serve(listener, app).await.unwrap() });
    let client = reqwest::Client::new();
    assert!(matches!(
        send_json(client.get(format!("http://{address}/ok"))).await,
        VendorResponse::Json(_)
    ));
    assert!(matches!(
        send_json(client.get(format!("http://{address}/unauthorized"))).await,
        VendorResponse::AuthenticationRejected
    ));
    assert!(matches!(
        send_json(client.get(format!("http://{address}/limited"))).await,
        VendorResponse::RateLimited(Some(45))
    ));
    assert!(matches!(
        send_json(client.get(format!("http://{address}/malformed"))).await,
        VendorResponse::Malformed
    ));
    server.abort();

    let unused = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let unused_address = unused.local_addr().unwrap();
    drop(unused);
    assert!(matches!(
        send_json(client.get(format!("http://{unused_address}/transient"))).await,
        VendorResponse::Unavailable
    ));
}

#[tokio::test]
async fn configured_but_unreadable_oauth_subscription_is_reported_unavailable() {
    let directory = tempfile::tempdir().unwrap();
    let claude_home = directory.path().join("claude");
    std::fs::create_dir_all(&claude_home).unwrap();
    std::fs::write(claude_home.join(".credentials.json"), "{}").unwrap();

    let mut state = AppState::for_tests(directory.path());
    state.subscription_readers = vec![crate::subscription::SubscriptionReader::new(
        SubscriptionProvider::Claude,
        &claude_home,
    )];
    state.register_credential_recovery_in(
        directory.path(),
        &crate::app_state::VendorClis::default(),
    );

    let ProbeResult::Usage(usage) = probe_oauth_subscription(
        &state,
        crate::credential_recovery_store::PRIMARY_ACCOUNT,
        UsageProvider::Anthropic,
    )
    .await
    else {
        panic!("a configured but unreadable credential must remain visible");
    };
    assert!(matches!(usage.state, UsageState::Unavailable));
    assert_eq!(usage.status, "credential_unavailable");
}

#[tokio::test]
async fn zai_probe_uses_official_non_inference_request_shape_and_normalizes_quota() {
    let hits = Arc::new(Mutex::new(Vec::new()));
    let hits_for_server = Arc::clone(&hits);
    let vendor = axum::Router::new().fallback(move |request: AxumRequest| {
        let hits = Arc::clone(&hits_for_server);
        async move {
            hits.lock().unwrap().push((
                request.uri().path().to_string(),
                request.uri().query().unwrap_or_default().to_string(),
                request
                    .headers()
                    .get("authorization")
                    .and_then(|value| value.to_str().ok())
                    .unwrap_or_default()
                    .to_string(),
            ));
            axum::Json(json!({
                "success": true,
                "code": 200,
                "data": {"limits": [
                    {"type": "TOKENS_LIMIT", "percentage": 12.0},
                    {"type": "TIME_LIMIT", "percentage": 25.0,
                     "currentValue": 5.0, "usage": 20.0,
                     "usageDetails": [{"name": "search", "usage": 2}]}
                ]}
            }))
        }
    });
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let address = listener.local_addr().unwrap();
    let server = tokio::spawn(async move { axum::serve(listener, vendor).await.unwrap() });

    let directory = tempfile::tempdir().unwrap();
    let state = AppState::for_tests(directory.path());
    state
        .provider_store
        .upsert(crate::providers::ProviderUpsert {
            name: "z-ai-personal".into(),
            kind: Some("z.ai-coding-plan".into()),
            base_url: format!("http://{address}/api/anthropic"),
            default_model: Some("synthetic-model".into()),
            models: Some(vec!["synthetic-model".into()]),
            supported_clients: None,
            api_key: Some("zai-secret-key".into()),
            api_key_env: None,
            encrypted_api_key: None,
            enabled: Some(true),
            subscriber_id: Some("primary".into()),
            acknowledge_intermediary_risk: Some(true),
            acknowledge_unsupported_clients: Some(Vec::new()),
            if_absent: false,
        })
        .unwrap();

    let ProbeResult::Usage(usage) = probe_zai(&state).await else {
        panic!("configured z.ai subscription must produce a usage section");
    };
    assert_eq!(usage.windows[0].remaining_percentage, Some(88.0));
    assert_eq!(usage.additional_limits[0].name, "monthly_mcp");
    assert_eq!(usage.additional_limits[0].used, Some(5.0));
    assert_eq!(usage.additional_limits[0].limit, Some(20.0));
    assert!(
        !serde_json::to_string(&usage)
            .unwrap()
            .contains("zai-secret-key")
    );

    let hits = hits.lock().unwrap();
    assert_eq!(hits.len(), 3);
    assert_eq!(hits[0].0, "/api/monitor/usage/quota/limit");
    assert!(hits[0].1.is_empty());
    for hit in hits.iter() {
        assert_eq!(hit.2, "zai-secret-key");
    }
    for hit in &hits[1..] {
        assert!(matches!(
            hit.0.as_str(),
            "/api/monitor/usage/model-usage" | "/api/monitor/usage/tool-usage"
        ));
        assert!(hit.1.contains("startTime="), "{}", hit.1);
        assert!(hit.1.contains("endTime="), "{}", hit.1);
    }
    drop(hits);
    server.abort();
}

#[tokio::test]
async fn usage_api_filters_by_signed_client_and_never_calls_inference() {
    let directory = tempfile::tempdir().unwrap();
    let claude_home = directory.path().join("claude");
    std::fs::create_dir_all(&claude_home).unwrap();
    std::fs::write(
        claude_home.join(".credentials.json"),
        json!({"claudeAiOauth": {
            "accessToken": "vendor-access-secret",
            "refreshToken": "vendor-refresh-secret",
            "expiresAt": chrono::Utc::now().timestamp_millis() + 3_600_000,
            "subscriptionType": "max"
        }})
        .to_string(),
    )
    .unwrap();
    let hits = Arc::new(Mutex::new(Vec::new()));
    let hits_for_server = Arc::clone(&hits);
    let vendor = axum::Router::new().fallback(move |request: AxumRequest| {
        let hits = Arc::clone(&hits_for_server);
        async move {
            let path = request.uri().path().to_string();
            hits.lock().unwrap().push(path.clone());
            match path.as_str() {
                "/api/oauth/usage" => axum::Json(json!({
                    "five_hour": {"utilization": 10, "resets_at": "2030-01-01T00:00:00Z"}
                }))
                .into_response(),
                "/api/oauth/profile" => axum::Json(json!({
                    "organization": {"subscription_status": "active"}
                }))
                .into_response(),
                _ => (StatusCode::INTERNAL_SERVER_ERROR, "inference called").into_response(),
            }
        }
    });
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let address = listener.local_addr().unwrap();
    let server = tokio::spawn(async move { axum::serve(listener, vendor).await.unwrap() });

    let mut state = AppState::for_tests(directory.path());
    state.subscription_base_url = Some(format!("http://{address}"));
    state.subscription_readers = vec![crate::subscription::SubscriptionReader::new(
        SubscriptionProvider::Claude,
        &claude_home,
    )];
    state.register_credential_recovery_in(
        directory.path(),
        &crate::app_state::VendorClis::default(),
    );
    let token = state
        .token_manager
        .issue(&crate::token::IssueRequest {
            ttl_hours: 1,
            label: "usage test",
            account: Some("primary"),
            max_requests: None,
            max_tokens: None,
            rate_limit_per_minute: None,
            scope: "",
            github_repos: Vec::new(),
            sliding_window_seconds: None,
            client_kind: Some("claude"),
            principal_id: Some("primary"),
        })
        .unwrap();
    let app = axum::Router::new()
        .route("/api/usage", get(usage))
        .route("/api/usage/{provider}", get(usage_provider))
        .with_state(state);
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/usage")
                .header("authorization", format!("Bearer {token}"))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let body: Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(body["subscriptions"].as_array().unwrap().len(), 1);
    assert_eq!(body["subscriptions"][0]["provider"], "anthropic");
    assert_eq!(body["subscriptions"][0]["plan"], "max");
    let rendered = body.to_string();
    for secret in [
        "vendor-access-secret",
        "vendor-refresh-secret",
        "private@example.test",
    ] {
        assert!(!rendered.contains(secret), "{rendered}");
    }

    let denied = app
        .oneshot(
            Request::builder()
                .uri("/api/usage/openai")
                .header("authorization", format!("Bearer {token}"))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(denied.status(), StatusCode::FORBIDDEN);
    assert_eq!(
        hits.lock().unwrap().as_slice(),
        ["/api/oauth/usage", "/api/oauth/profile"]
    );
    server.abort();
}
