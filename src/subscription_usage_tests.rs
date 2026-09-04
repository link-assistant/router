use super::*;
use axum::body::Body;
use axum::extract::Request as AxumRequest;
use axum::http::Request;
use axum::routing::get;
use http_body_util::BodyExt as _;
use serde_json::json;
use std::sync::{Arc, Mutex};
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
fn invalid_vendor_percentages_are_omitted_instead_of_published() {
    for invalid in [f64::NAN, f64::INFINITY, -1.0, 100.1] {
        let window = window_from("invalid", Some(invalid), None, None);
        assert_eq!(window.used_percentage, None, "{invalid}");
        assert_eq!(window.remaining_percentage, None, "{invalid}");
    }
    for boundary in [0.0, 100.0] {
        let window = window_from("boundary", Some(boundary), None, None);
        assert_eq!(window.used_percentage, Some(boundary));
        assert_eq!(window.remaining_percentage, Some(100.0 - boundary));
    }
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
async fn registered_but_absent_oauth_subscription_is_not_reported_as_configured() {
    let directory = tempfile::tempdir().unwrap();
    let claude_home = directory.path().join("never-configured");
    std::fs::create_dir_all(&claude_home).unwrap();

    let mut state = AppState::for_tests(directory.path());
    state.subscription_readers = vec![crate::subscription::SubscriptionReader::new(
        SubscriptionProvider::Claude,
        &claude_home,
    )];
    state.register_credential_recovery_in(
        directory.path(),
        &crate::app_state::VendorClis::default(),
    );

    assert!(matches!(
        probe_oauth_subscription(
            &state,
            crate::credential_recovery_store::PRIMARY_ACCOUNT,
            UsageProvider::Anthropic,
        )
        .await,
        ProbeResult::NotConfigured
    ));
}

#[test]
fn configured_lefine_usage_is_explicitly_unavailable_without_guessing() {
    let directory = tempfile::tempdir().unwrap();
    let state = AppState::for_tests(directory.path());
    state
        .provider_store
        .upsert(crate::providers::ProviderUpsert {
            name: "lefine".into(),
            kind: Some("lefine".into()),
            base_url: crate::lefine::BASE_URL.into(),
            default_model: None,
            models: Some(vec!["configured/exact-id".into()]),
            supported_clients: None,
            api_key: Some("lefine-secret".into()),
            api_key_env: None,
            encrypted_api_key: None,
            enabled: Some(true),
            subscriber_id: None,
            acknowledge_intermediary_risk: None,
            acknowledge_unsupported_clients: None,
            if_absent: false,
        })
        .unwrap();

    let ProbeResult::Usage(usage) = probe_lefine(&state) else {
        panic!("configured Lefine provider must have an explicit usage result");
    };
    assert!(matches!(usage.state, UsageState::Unavailable));
    assert_eq!(usage.status, "usage_source_unavailable");
    assert!(
        !serde_json::to_string(&usage)
            .unwrap()
            .contains("lefine-secret")
    );
}

#[tokio::test]
async fn lefine_usage_route_reports_unavailable_only_to_compatible_clients() {
    let directory = tempfile::tempdir().unwrap();
    let state = AppState::for_tests(directory.path());
    state
        .provider_store
        .upsert(crate::providers::ProviderUpsert {
            name: "lefine".into(),
            kind: Some("lefine".into()),
            base_url: crate::lefine::BASE_URL.into(),
            default_model: None,
            models: Some(vec!["configured/exact-id".into()]),
            supported_clients: None,
            api_key: Some("lefine-secret".into()),
            api_key_env: None,
            encrypted_api_key: None,
            enabled: Some(true),
            subscriber_id: None,
            acknowledge_intermediary_risk: None,
            acknowledge_unsupported_clients: None,
            if_absent: false,
        })
        .unwrap();
    let issue = |client: crate::clients::ClientKind| {
        state
            .token_manager
            .issue(&crate::token::IssueRequest {
                ttl_hours: 1,
                label: "Lefine usage test",
                account: Some("primary"),
                max_requests: None,
                max_tokens: None,
                rate_limit_per_minute: None,
                scope: "",
                github_repos: Vec::new(),
                sliding_window_seconds: None,
                client_kind: Some(client.canonical_name()),
                principal_id: Some("primary"),
            })
            .unwrap()
    };
    let opencode = issue(crate::clients::ClientKind::Opencode);
    let claude = issue(crate::clients::ClientKind::ClaudeCode);
    let app = axum::Router::new()
        .route("/api/usage/{provider}", get(usage_provider))
        .with_state(state);

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/usage/lefine")
                .header("authorization", format!("Bearer {opencode}"))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let body: Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(body["subscriptions"][0]["provider"], "lefine");
    assert_eq!(body["subscriptions"][0]["state"], "unavailable");
    assert_eq!(
        body["subscriptions"][0]["status"],
        "usage_source_unavailable"
    );
    assert!(!body.to_string().contains("lefine-secret"));

    let denied = app
        .oneshot(
            Request::builder()
                .uri("/api/usage/lefine")
                .header("authorization", format!("Bearer {claude}"))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(denied.status(), StatusCode::FORBIDDEN);
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
            hits.lock().unwrap().push((
                request.method().clone(),
                path.clone(),
                request.headers().clone(),
            ));
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
    let hits = hits.lock().unwrap();
    assert_eq!(hits.len(), 2);
    assert_eq!(hits[0].1, "/api/oauth/usage");
    assert_eq!(hits[1].1, "/api/oauth/profile");
    for (method, path, headers) in hits.iter() {
        assert_eq!(method, axum::http::Method::GET, "{path}");
        assert_eq!(headers["authorization"], "Bearer vendor-access-secret");
        assert_eq!(headers["anthropic-beta"], "oauth-2025-04-20");
        assert_eq!(headers["content-type"], "application/json");
        assert_eq!(
            headers["user-agent"],
            format!("claude-cli/{CLAUDE_CODE_VERSION} (external, cli)")
        );
        assert!(!headers["user-agent"].to_str().unwrap().contains("router"));
    }
    drop(hits);
    server.abort();
}

#[tokio::test]
async fn openai_usage_uses_the_official_codex_headers_and_account() {
    let captured = Arc::new(Mutex::new(Vec::new()));
    let captured_for_server = Arc::clone(&captured);
    let vendor = axum::Router::new().fallback(move |request: AxumRequest| {
        let captured = Arc::clone(&captured_for_server);
        async move {
            captured.lock().unwrap().push((
                request.method().clone(),
                request.uri().path().to_string(),
                request.headers().clone(),
            ));
            axum::Json(json!({
                "plan_type": "pro",
                "rate_limit": {"primary_window": {"used_percent": 7.0}}
            }))
        }
    });
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let address = listener.local_addr().unwrap();
    let server = tokio::spawn(async move { axum::serve(listener, vendor).await.unwrap() });
    let directory = tempfile::tempdir().unwrap();
    let mut state = AppState::for_tests(directory.path());
    state.subscription_base_url = Some(format!("http://{address}/backend-api"));
    let token = SubscriptionToken {
        access_token: "openai-vendor-secret".into(),
        refresh_token: None,
        expires_at_ms: None,
        account_id: Some("workspace-42".into()),
        resource_url: None,
    };

    let usage = probe_openai(&state, &token, &SafeCredentialMetadata::default()).await;
    assert_eq!(usage.status, "available");
    let captured = captured.lock().unwrap();
    assert_eq!(captured.len(), 1);
    let (method, path, headers) = &captured[0];
    assert_eq!(method, axum::http::Method::GET);
    assert_eq!(path, "/backend-api/wham/usage");
    assert_eq!(headers["authorization"], "Bearer openai-vendor-secret");
    assert_eq!(headers["chatgpt-account-id"], "workspace-42");
    assert_eq!(headers["user-agent"], CODEX_USAGE_USER_AGENT);
    assert!(!headers["user-agent"].to_str().unwrap().contains("router"));
    drop(captured);
    server.abort();
}

#[tokio::test]
async fn cached_authentication_failure_is_invalidated_by_credential_repair() {
    let directory = tempfile::tempdir().unwrap();
    let claude_home = directory.path().join("claude");
    std::fs::create_dir_all(&claude_home).unwrap();
    let write_credential = |access: &str| {
        std::fs::write(
            claude_home.join(".credentials.json"),
            json!({"claudeAiOauth": {
                "accessToken": access,
                "expiresAt": chrono::Utc::now().timestamp_millis() + 3_600_000
            }})
            .to_string(),
        )
        .unwrap();
    };
    write_credential("rejected-generation");

    let hits = Arc::new(Mutex::new(Vec::new()));
    let hits_for_server = Arc::clone(&hits);
    let vendor = axum::Router::new().fallback(move |request: AxumRequest| {
        let hits = Arc::clone(&hits_for_server);
        async move {
            let path = request.uri().path().to_string();
            let authorization = request
                .headers()
                .get("authorization")
                .and_then(|value| value.to_str().ok())
                .unwrap_or_default()
                .to_string();
            hits.lock()
                .unwrap()
                .push((path.clone(), authorization.clone()));
            if authorization == "Bearer rejected-generation" {
                return (StatusCode::UNAUTHORIZED, "rejected").into_response();
            }
            match path.as_str() {
                "/api/oauth/usage" => axum::Json(json!({
                    "five_hour": {"utilization": 3.0}
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
    let subject = format!("repair-test-{}", uuid::Uuid::new_v4());

    let ProbeResult::Usage(before) = cache::cached_or_probe(
        &state,
        &subject,
        crate::credential_recovery_store::PRIMARY_ACCOUNT,
        UsageProvider::Anthropic,
    )
    .await
    else {
        panic!("configured credential must be reported");
    };
    assert_eq!(before.status, "authentication_rejected");

    write_credential("accepted-generation");
    let ProbeResult::Usage(after) = cache::cached_or_probe(
        &state,
        &subject,
        crate::credential_recovery_store::PRIMARY_ACCOUNT,
        UsageProvider::Anthropic,
    )
    .await
    else {
        panic!("repaired credential must be reported");
    };
    assert_eq!(after.status, "active");
    assert_eq!(
        hits.lock().unwrap().as_slice(),
        [
            (
                "/api/oauth/usage".into(),
                "Bearer rejected-generation".into()
            ),
            (
                "/api/oauth/usage".into(),
                "Bearer accepted-generation".into()
            ),
            (
                "/api/oauth/profile".into(),
                "Bearer accepted-generation".into()
            ),
        ]
    );
    server.abort();
}

#[tokio::test]
async fn rejected_usage_token_is_refreshed_and_retried_once() {
    let directory = tempfile::tempdir().unwrap();
    let claude_home = directory.path().join("claude");
    std::fs::create_dir_all(&claude_home).unwrap();
    std::fs::write(
        claude_home.join(".credentials.json"),
        json!({"claudeAiOauth": {
            "accessToken": "rejected-access",
            "refreshToken": "unspent-refresh",
            "expiresAt": chrono::Utc::now().timestamp_millis() + 3_600_000
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
            let authorization = request
                .headers()
                .get("authorization")
                .and_then(|value| value.to_str().ok())
                .unwrap_or_default()
                .to_string();
            hits.lock()
                .unwrap()
                .push((path.clone(), authorization.clone()));
            match path.as_str() {
                "/api/oauth/usage" if authorization == "Bearer rejected-access" => {
                    (StatusCode::UNAUTHORIZED, "expired early").into_response()
                }
                "/oauth/token" => axum::Json(json!({
                    "access_token": "refreshed-access",
                    "refresh_token": "successor-refresh",
                    "expires_in": 3600
                }))
                .into_response(),
                "/api/oauth/usage" => axum::Json(json!({
                    "five_hour": {"utilization": 9.0}
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
    let reader =
        crate::subscription::SubscriptionReader::new(SubscriptionProvider::Claude, &claude_home);
    state.subscription_readers = vec![reader.clone()];
    state.register_credential_recovery_in(
        directory.path(),
        &crate::app_state::VendorClis::default(),
    );
    let loaded = state
        .subscription_cache
        .load_authoritative(SubscriptionProvider::Claude, "primary")
        .await
        .unwrap()
        .unwrap();
    let token_url = format!("http://{address}/oauth/token");

    let ProbeResult::Usage(usage) = probe_oauth_loaded_at(
        &state,
        "primary",
        UsageProvider::Anthropic,
        SubscriptionProvider::Claude,
        loaded,
        Some(&token_url),
    )
    .await
    else {
        panic!("configured credential must be reported");
    };
    assert_eq!(usage.status, "active");
    assert_eq!(
        reader.read_token().unwrap().access_token,
        "refreshed-access"
    );
    let hits = hits.lock().unwrap();
    let paths = hits
        .iter()
        .map(|(path, _)| path.as_str())
        .collect::<Vec<_>>();
    assert_eq!(
        paths,
        [
            "/api/oauth/usage",
            "/oauth/token",
            "/api/oauth/usage",
            "/api/oauth/profile"
        ]
    );
    server.abort();
}
