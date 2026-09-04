use super::*;
use axum::body::Body;
use axum::extract::Request as AxumRequest;
use axum::http::Request;
use axum::routing::get;
use http_body_util::BodyExt as _;
use serde_json::{Value, json};
use std::sync::{Arc, Mutex};
use tower::ServiceExt as _;

fn usage_app(state: AppState) -> axum::Router {
    axum::Router::new()
        .route("/api/usage", get(usage))
        .route("/api/usage/{provider}", get(usage_provider))
        .with_state(state)
}

fn issue_client(state: &AppState, client: crate::clients::ClientKind) -> String {
    state
        .token_manager
        .issue(&crate::token::IssueRequest {
            ttl_hours: 1,
            label: "usage HTTP contract",
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
}

async fn request(
    app: axum::Router,
    path: &str,
    header: Option<(&str, String)>,
) -> (StatusCode, Value) {
    let mut request = Request::builder().uri(path);
    if let Some((name, value)) = header {
        request = request.header(name, value);
    }
    let response = app
        .oneshot(request.body(Body::empty()).unwrap())
        .await
        .unwrap();
    let status = response.status();
    let bytes = response.into_body().collect().await.unwrap().to_bytes();
    let body = serde_json::from_slice(&bytes).unwrap_or_else(|_| {
        panic!(
            "HTTP {status} returned non-JSON: {}",
            String::from_utf8_lossy(&bytes)
        )
    });
    (status, body)
}

#[tokio::test]
async fn filtered_http_contract_preserves_schema_types_timestamps_and_no_secrets() {
    let hits = Arc::new(Mutex::new(Vec::new()));
    let hits_for_server = Arc::clone(&hits);
    let vendor = axum::Router::new().fallback(move |request: AxumRequest| {
        let hits = Arc::clone(&hits_for_server);
        async move {
            let path = request.uri().path().to_string();
            hits.lock().unwrap().push(path.clone());
            match path.as_str() {
                "/api/oauth/usage" => axum::Json(json!({
                    "five_hour": {
                        "utilization": 12.5,
                        "resets_at": "2030-01-01T00:00:00.123456789Z"
                    }
                }))
                .into_response(),
                "/api/oauth/profile" => axum::Json(json!({
                    "email": "vendor-private@example.invalid",
                    "organization": {
                        "subscription_status": "active",
                        "subscription_created_at": "2029-01-01T01:02:03+05:30",
                        "claude_code_trial_ends_at": "2029-02-01T04:05:06Z"
                    }
                }))
                .into_response(),
                _ => (StatusCode::INTERNAL_SERVER_ERROR, "inference reached").into_response(),
            }
        }
    });
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let address = listener.local_addr().unwrap();
    let server = tokio::spawn(async move { axum::serve(listener, vendor).await.unwrap() });
    let directory = tempfile::tempdir().unwrap();
    let claude_home = directory.path().join("claude");
    std::fs::create_dir_all(&claude_home).unwrap();
    std::fs::write(
        claude_home.join(".credentials.json"),
        json!({"claudeAiOauth": {
            "accessToken": "vendor-access-sentinel",
            "refreshToken": "vendor-refresh-sentinel",
            "expiresAt": chrono::Utc::now().timestamp_millis() + 3_600_000,
            "subscriptionType": "max"
        }})
        .to_string(),
    )
    .unwrap();
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
    let client_token = issue_client(&state, crate::clients::ClientKind::ClaudeCode);
    let admin_token = state
        .token_manager
        .issue_admin_token(1, "admin-sentinel")
        .unwrap();

    let (status, body) = request(
        usage_app(state),
        "/api/usage/anthropic",
        Some(("authorization", format!("Bearer {client_token}"))),
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["schema_version"], 1);
    assert!(body["schema_version"].is_number());
    let usage = &body["subscriptions"][0];
    assert_eq!(usage["provider"], "anthropic");
    assert_eq!(usage["state"], "available");
    assert_eq!(usage["status"], "active");
    assert_eq!(usage["plan"], "max");
    assert!(usage["windows"][0]["used_percentage"].is_number());
    assert!(usage["windows"][0]["remaining_percentage"].is_number());
    assert_eq!(
        usage["windows"][0]["resets_at"],
        "2030-01-01T00:00:00.123456789Z"
    );
    assert_eq!(usage["subscription_created"], "2029-01-01T01:02:03+05:30");
    assert_eq!(usage["trial_end"], "2029-02-01T04:05:06Z");
    let rendered = body.to_string();
    for forbidden in [
        "vendor-access-sentinel",
        "vendor-refresh-sentinel",
        "vendor-private@example.invalid",
        client_token.as_str(),
        admin_token.as_str(),
        "access_token",
        "refresh_token",
    ] {
        assert!(
            !rendered.contains(forbidden),
            "leaked {forbidden}: {rendered}"
        );
    }
    assert_eq!(
        hits.lock().unwrap().as_slice(),
        ["/api/oauth/usage", "/api/oauth/profile"]
    );
    server.abort();
}

#[tokio::test]
async fn all_managed_client_credential_carriers_reach_the_unfiltered_route() {
    let directory = tempfile::tempdir().unwrap();
    let state = AppState::for_tests(directory.path());
    let app = usage_app(state.clone());
    let cases = [
        (
            crate::clients::ClientKind::ClaudeCode,
            "authorization",
            "Bearer ",
        ),
        (crate::clients::ClientKind::ClaudeCode, "x-api-key", ""),
        (
            crate::clients::ClientKind::Codex,
            "authorization",
            "Bearer ",
        ),
        (crate::clients::ClientKind::GeminiCli, "x-goog-api-key", ""),
        (
            crate::clients::ClientKind::QwenCode,
            "authorization",
            "Bearer ",
        ),
    ];
    for (client, carrier, prefix) in cases {
        let token = issue_client(&state, client);
        let (status, body) = request(
            app.clone(),
            "/api/usage",
            Some((carrier, format!("{prefix}{token}"))),
        )
        .await;
        assert_eq!(status, StatusCode::OK, "{client:?}: {body}");
        assert_eq!(body["schema_version"], 1);
        assert_eq!(body["subscriptions"], json!([]));
    }
}

#[tokio::test]
async fn authentication_and_authorization_denials_are_non_enumerating_and_hit_no_vendor() {
    let directory = tempfile::tempdir().unwrap();
    let state = AppState::for_tests(directory.path());
    let admin = state
        .token_manager
        .issue_admin_token(1, "usage admin")
        .unwrap();
    let claude = issue_client(&state, crate::clients::ClientKind::ClaudeCode);
    let app = usage_app(state);

    let (absent_status, absent) = request(app.clone(), "/api/usage/anthropic", None).await;
    let (invalid_status, invalid) = request(
        app.clone(),
        "/api/usage/anthropic",
        Some(("authorization", "Bearer invalid-token".into())),
    )
    .await;
    let (admin_status, admin_body) = request(
        app.clone(),
        "/api/usage/anthropic",
        Some(("authorization", format!("Bearer {admin}"))),
    )
    .await;
    let (wrong_provider_status, wrong_provider) = request(
        app.clone(),
        "/api/usage/openai",
        Some(("authorization", format!("Bearer {claude}"))),
    )
    .await;
    let (unknown_status, unknown) = request(
        app,
        "/api/usage/not-a-provider",
        Some(("authorization", format!("Bearer {claude}"))),
    )
    .await;

    assert_eq!(absent_status, StatusCode::UNAUTHORIZED);
    assert_eq!(invalid_status, StatusCode::UNAUTHORIZED);
    assert_eq!(admin_status, StatusCode::FORBIDDEN);
    assert_eq!(wrong_provider_status, StatusCode::FORBIDDEN);
    assert_eq!(unknown_status, StatusCode::NOT_FOUND);
    for body in [absent, invalid, admin_body, wrong_provider, unknown] {
        let rendered = body.to_string();
        for forbidden in ["primary", "subscriptionType", "vendor-secret"] {
            assert!(
                !rendered.contains(forbidden),
                "enumerated {forbidden}: {rendered}"
            );
        }
    }
}

#[tokio::test]
async fn zai_usage_obeys_supported_clients_before_any_vendor_probe() {
    let hits = Arc::new(Mutex::new(0usize));
    let hits_for_server = Arc::clone(&hits);
    let vendor = axum::Router::new().fallback(move |_request: AxumRequest| {
        let hits = Arc::clone(&hits_for_server);
        async move {
            *hits.lock().unwrap() += 1;
            axum::Json(json!({
                "success": true,
                "code": 200,
                "data": {"limits": [{"type": "TOKENS_LIMIT", "percentage": 5.0}]}
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
            base_url: format!("http://{address}"),
            default_model: Some("glm-live".into()),
            models: Some(vec!["glm-live".into()]),
            supported_clients: None,
            api_key: Some("vendor-secret".into()),
            api_key_env: None,
            encrypted_api_key: None,
            enabled: Some(true),
            subscriber_id: Some("primary".into()),
            acknowledge_intermediary_risk: Some(true),
            acknowledge_unsupported_clients: Some(Vec::new()),
            if_absent: false,
        })
        .unwrap();
    let opencode = issue_client(&state, crate::clients::ClientKind::Opencode);
    let qwen = issue_client(&state, crate::clients::ClientKind::QwenCode);
    let app = usage_app(state);

    let (allowed_status, allowed) = request(
        app.clone(),
        "/api/usage/z-ai",
        Some(("authorization", format!("Bearer {opencode}"))),
    )
    .await;
    assert_eq!(allowed_status, StatusCode::OK, "{allowed}");
    assert_eq!(allowed["subscriptions"][0]["state"], "available");
    assert_eq!(*hits.lock().unwrap(), 3);

    let (denied_status, denied) = request(
        app,
        "/api/usage/z-ai",
        Some(("authorization", format!("Bearer {qwen}"))),
    )
    .await;
    assert_eq!(denied_status, StatusCode::FORBIDDEN, "{denied}");
    assert_eq!(*hits.lock().unwrap(), 3, "denial reached the provider");
    assert!(!denied.to_string().contains("vendor-secret"));
    server.abort();
}

#[tokio::test]
async fn rate_limited_usage_is_cached_with_the_vendor_retry_hint() {
    let hits = Arc::new(Mutex::new(0usize));
    let hits_for_server = Arc::clone(&hits);
    let vendor = axum::Router::new().fallback(move |_request: AxumRequest| {
        let hits = Arc::clone(&hits_for_server);
        async move {
            *hits.lock().unwrap() += 1;
            (
                StatusCode::TOO_MANY_REQUESTS,
                [("retry-after", "45")],
                "private-vendor-rate-limit-body",
            )
        }
    });
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let address = listener.local_addr().unwrap();
    let server = tokio::spawn(async move { axum::serve(listener, vendor).await.unwrap() });
    let directory = tempfile::tempdir().unwrap();
    let claude_home = directory.path().join("claude");
    std::fs::create_dir_all(&claude_home).unwrap();
    std::fs::write(
        claude_home.join(".credentials.json"),
        json!({"claudeAiOauth": {
            "accessToken": "rate-limited-access",
            "expiresAt": chrono::Utc::now().timestamp_millis() + 3_600_000
        }})
        .to_string(),
    )
    .unwrap();
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
    let token = issue_client(&state, crate::clients::ClientKind::ClaudeCode);
    let app = usage_app(state);

    for _ in 0..2 {
        let (status, body) = request(
            app.clone(),
            "/api/usage/anthropic",
            Some(("authorization", format!("Bearer {token}"))),
        )
        .await;
        assert_eq!(status, StatusCode::OK);
        assert_eq!(body["subscriptions"][0]["state"], "unavailable");
        assert_eq!(body["subscriptions"][0]["status"], "rate_limited");
        assert_eq!(body["subscriptions"][0]["retry_after_seconds"], 45);
        assert!(!body.to_string().contains("private-vendor-rate-limit-body"));
    }
    assert_eq!(
        *hits.lock().unwrap(),
        1,
        "second request must use the cache"
    );
    server.abort();
}
