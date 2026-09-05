use axum::http::{HeaderMap, HeaderValue, StatusCode};
use http_body_util::BodyExt;
use log_lazy::{LogLazy, levels};

use crate::proxy::{
    INGRESS_NETWORK_HEADERS, OAUTH_BETA_FLAG, build_upstream_headers, extract_client_token,
    merge_oauth_beta, request_routing_context, retry_after_duration,
};

#[test]
fn extract_client_token_accepts_bearer_github_token_or_x_api_key() {
    let mut headers = HeaderMap::new();
    headers.insert("x-api-key", HeaderValue::from_static("la_sk_x"));
    assert_eq!(extract_client_token(&headers), Some("la_sk_x"));

    headers.insert("authorization", HeaderValue::from_static("Bearer la_sk_b"));
    assert_eq!(extract_client_token(&headers), Some("la_sk_b"));

    headers.insert("authorization", HeaderValue::from_static("token la_sk_gh"));
    assert_eq!(extract_client_token(&headers), Some("la_sk_gh"));
}

/// Gemini CLI sends the credential as `x-goog-api-key` — the name Google's own
/// documentation specifies, and what `GEMINI_API_KEY` becomes (issue #206).
#[test]
fn extract_client_token_accepts_the_gemini_key_header() {
    let mut headers = HeaderMap::new();
    headers.insert("x-goog-api-key", HeaderValue::from_static("la_sk_g"));
    assert_eq!(extract_client_token(&headers), Some("la_sk_g"));

    // An explicit `Authorization` still wins, so a client that sends both is
    // authenticated by the carrier it most likely configured deliberately.
    headers.insert("authorization", HeaderValue::from_static("Bearer la_sk_b"));
    assert_eq!(extract_client_token(&headers), Some("la_sk_b"));
}

/// An empty carrier is not a credential, and must not shadow a later one.
#[test]
fn an_empty_carrier_is_not_treated_as_a_credential() {
    let mut headers = HeaderMap::new();
    headers.insert("x-api-key", HeaderValue::from_static(""));
    headers.insert("x-goog-api-key", HeaderValue::from_static("la_sk_g"));
    assert_eq!(extract_client_token(&headers), Some("la_sk_g"));
}

#[test]
fn build_upstream_headers_strips_client_auth_headers() {
    let mut incoming = HeaderMap::new();
    incoming.insert(
        "authorization",
        HeaderValue::from_static("Bearer la_sk_edge"),
    );
    incoming.insert("x-api-key", HeaderValue::from_static("la_sk_edge"));
    incoming.insert("x-goog-api-key", HeaderValue::from_static("la_sk_edge"));
    incoming.insert("anthropic-version", HeaderValue::from_static("2023-06-01"));
    let logger = LogLazy::with_level(levels::NONE);

    let upstream = build_upstream_headers(&incoming, "oauth-token", &logger);

    assert_eq!(
        upstream
            .get("authorization")
            .and_then(|value| value.to_str().ok()),
        Some("Bearer oauth-token")
    );
    assert!(upstream.get("x-api-key").is_none());
    // A credential that authenticates the caller to *us* must never reach a
    // vendor. Accepting a new carrier without stripping it would forward the
    // router's own client token upstream (issue #206).
    assert!(upstream.get("x-goog-api-key").is_none());
    assert_eq!(
        upstream
            .get("anthropic-version")
            .and_then(|value| value.to_str().ok()),
        Some("2023-06-01")
    );
}

/// A native upstream sees the real official client's application identity.
#[test]
fn upstream_headers_preserve_client_identity_but_not_router_or_transport_fields() {
    let mut incoming = HeaderMap::new();
    for (name, value) in [
        ("x-stainless-os", "ClientOS"),
        ("x-stainless-arch", "client-arch"),
        ("x-stainless-runtime", "example-runtime"),
        ("x-stainless-runtime-version", "v1.2.3"),
        ("x-stainless-package-version", "9.9.9"),
        ("user-agent", "example-client/1.0"),
        ("accept-language", "en-US"),
        ("x-app", "cli"),
        ("originator", "codex_cli_rs"),
        // A stable identifier that correlates requests into sessions no matter
        // which token carried them, defeating per-token separation.
        (
            "x-claude-code-session-id",
            "11111111-2222-3333-4444-555555555555",
        ),
        // A client-side safety toggle must not be asserted on the operator's
        // behalf, the same principle as issue #310.
        ("anthropic-dangerous-direct-browser-access", "true"),
        // Correct today and guarded here: the router never adds these, and it
        // must not relay one a client sent either.
        ("x-forwarded-for", "203.0.113.10"),
        ("x-real-ip", "203.0.113.10"),
        ("forwarded", "for=203.0.113.10"),
    ] {
        incoming.insert(name, HeaderValue::from_static(value));
    }
    incoming.insert("content-type", HeaderValue::from_static("application/json"));

    let upstream =
        build_upstream_headers(&incoming, "oauth-token", &LogLazy::with_level(levels::NONE));

    for preserved in [
        "x-stainless-os",
        "x-stainless-arch",
        "x-stainless-runtime",
        "x-stainless-runtime-version",
        "x-stainless-package-version",
        "accept-language",
        "x-app",
        "originator",
        "x-claude-code-session-id",
        "anthropic-dangerous-direct-browser-access",
    ] {
        assert!(
            upstream.get(preserved).is_some(),
            "{preserved} is end-to-end official-client identity"
        );
    }
    for removed in ["x-forwarded-for", "x-real-ip", "forwarded"] {
        assert!(
            upstream.get(removed).is_none(),
            "{removed} is proxy routing metadata"
        );
    }
    assert_eq!(upstream["user-agent"], "example-client/1.0");
    assert!(upstream.get("anthropic-version").is_none());
}

#[test]
fn every_reviewed_ingress_network_header_is_removed_without_touching_native_headers() {
    let mut incoming = HeaderMap::new();
    for &name in INGRESS_NETWORK_HEADERS {
        let name = axum::http::HeaderName::from_bytes(name.as_bytes()).unwrap();
        incoming.append(name.clone(), HeaderValue::from_static("192.0.2.10"));
        incoming.append(name, HeaderValue::from_static("198.51.100.20"));
    }
    for (name, value) in [
        ("anthropic-version", "2023-06-01"),
        ("anthropic-beta", "interleaved-thinking-2025-05-14"),
        ("x-codex-turn-metadata", "synthetic-turn"),
        ("x-stainless-package-version", "1.2.3"),
        ("x-session-id", "synthetic-session"),
        ("user-agent", "synthetic-client/1.0"),
    ] {
        incoming.insert(name, HeaderValue::from_static(value));
    }

    let upstream = build_upstream_headers(
        &incoming,
        "upstream-secret",
        &LogLazy::with_level(levels::NONE),
    );
    for name in INGRESS_NETWORK_HEADERS {
        assert!(upstream.get(*name).is_none(), "{name} leaked upstream");
    }
    for name in [
        "anthropic-version",
        "anthropic-beta",
        "x-codex-turn-metadata",
        "x-stainless-package-version",
        "x-session-id",
        "user-agent",
    ] {
        assert_eq!(upstream.get_all(name).iter().count(), 1, "{name}");
    }
}

#[test]
fn connection_nominated_request_headers_never_reach_the_upstream() {
    let mut incoming = HeaderMap::new();
    incoming.append(
        "connection",
        HeaderValue::from_static("keep-alive, x-hop-secret"),
    );
    incoming.append(
        "connection",
        HeaderValue::from_static(" X-Second-Hop , x-third-hop"),
    );
    incoming.append("x-hop-secret", HeaderValue::from_static("one"));
    incoming.append("x-second-hop", HeaderValue::from_static("two"));
    incoming.append("x-third-hop", HeaderValue::from_static("three"));
    incoming.append("x-native-end-to-end", HeaderValue::from_static("preserved"));

    let upstream = build_upstream_headers(
        &incoming,
        "upstream-secret",
        &LogLazy::with_level(levels::NONE),
    );

    for removed in [
        "connection",
        "keep-alive",
        "x-hop-secret",
        "x-second-hop",
        "x-third-hop",
    ] {
        assert!(upstream.get(removed).is_none(), "{removed} leaked upstream");
    }
    assert_eq!(upstream["x-native-end-to-end"], "preserved");
}

#[tokio::test]
async fn anthropic_handler_strips_ingress_headers_before_the_captured_upstream() {
    use axum::body::Body;
    use axum::extract::State;
    use axum::http::Request;
    use std::sync::{Arc, Mutex};

    let captured = Arc::new(Mutex::new(Vec::new()));
    let captured_for_server = Arc::clone(&captured);
    let upstream = axum::Router::new().fallback(move |request: Request<Body>| {
        let captured = Arc::clone(&captured_for_server);
        async move {
            captured.lock().unwrap().push(request.headers().clone());
            (
                StatusCode::OK,
                [
                    ("content-type", "application/json"),
                    ("x-request-id", "provider-anthropic-request"),
                    ("anthropic-auth-token", "provider-anthropic-secret"),
                ],
                "{}",
            )
        }
    });
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let base_url = format!("http://{}", listener.local_addr().unwrap());
    let upstream_task = tokio::spawn(async move { axum::serve(listener, upstream).await.unwrap() });

    let data = tempfile::tempdir().unwrap();
    std::fs::write(
        data.path().join(".credentials.json"),
        r#"{"claudeAiOauth":{"accessToken":"sk-ant-oat-upstream"}}"#,
    )
    .unwrap();
    let mut state = crate::app_state::AppState::for_tests(data.path());
    state.upstream_provider = crate::config::UpstreamProvider::Anthropic;
    state.upstream_base_url = base_url;
    let token = crate::model_routing::tests::bound_client_token(
        &state,
        crate::clients::ClientKind::ClaudeCode,
        None,
    );
    let mut request = Request::builder()
        .method("POST")
        .uri("/v1/messages")
        .header("authorization", format!("Bearer {token}"))
        .header("user-agent", "claude-cli/2.1.261")
        .header("anthropic-version", "2023-06-01")
        .header("x-request-id", "client-anthropic-request")
        .header("connection", "x-hop-secret")
        .header("x-hop-secret", "private-hop")
        .header(
            "x-forwarded-client-cert",
            "By=spiffe://private;Subject=client",
        )
        .header("x-native-end-to-end", "preserved")
        .header("content-type", "application/json")
        .body(Body::from(
            r#"{"model":"claude-live","max_tokens":16,"messages":[{"role":"user","content":"hi"}]}"#,
        ))
        .unwrap();
    request.headers_mut().append(
        axum::http::HeaderName::from_bytes(b"AnThRoPiC-AuTh-ToKeN").unwrap(),
        HeaderValue::from_static("incoming-anthropic-secret-a"),
    );
    request.headers_mut().append(
        axum::http::HeaderName::from_static("anthropic-auth-token"),
        HeaderValue::from_static("incoming-anthropic-secret-b"),
    );
    for &name in INGRESS_NETWORK_HEADERS {
        request.headers_mut().append(
            axum::http::HeaderName::from_bytes(name.to_ascii_uppercase().as_bytes()).unwrap(),
            HeaderValue::from_static("192.0.2.10"),
        );
        request.headers_mut().append(
            axum::http::HeaderName::from_bytes(name.as_bytes()).unwrap(),
            HeaderValue::from_static("198.51.100.20"),
        );
    }
    let response = crate::proxy::proxy_handler(State(state), request).await;
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(
        response.headers()["x-request-id"],
        "provider-anthropic-request"
    );
    assert!(!response.headers().contains_key("anthropic-auth-token"));
    let _ = response.into_body().collect().await.unwrap();

    let captured = captured.lock().unwrap();
    assert_eq!(captured.len(), 1);
    let headers = &captured[0];
    assert_eq!(headers["authorization"], "Bearer sk-ant-oat-upstream");
    assert_eq!(headers["x-native-end-to-end"], "preserved");
    assert_eq!(headers["x-request-id"], "client-anthropic-request");
    for removed in [
        "connection",
        "x-hop-secret",
        "x-api-key",
        "anthropic-auth-token",
    ] {
        assert!(!headers.contains_key(removed), "{removed} leaked upstream");
    }
    for name in INGRESS_NETWORK_HEADERS {
        assert!(!headers.contains_key(*name), "{name} leaked upstream");
    }
    drop(captured);
    upstream_task.abort();
}

/// The router negotiates its own hop, so the log can read its own traffic.
///
/// The client's `accept-encoding` was relayed untouched, so the caller's
/// compression preference decided whether the proxy could inspect what it
/// relayed. Without it the upstream answers uncompressed and every stream is
/// inspectable for a terminator, instead of the log being blind on the
/// majority of exchanges (issues #328, #332).
#[test]
fn the_clients_compression_preference_does_not_reach_the_upstream() {
    let mut incoming = HeaderMap::new();
    incoming.insert(
        "accept-encoding",
        HeaderValue::from_static("gzip, deflate, br, zstd"),
    );
    incoming.insert("accept", HeaderValue::from_static("text/event-stream"));

    let upstream =
        build_upstream_headers(&incoming, "oauth-token", &LogLazy::with_level(levels::NONE));

    assert!(
        upstream.get("accept-encoding").is_none(),
        "the client's compression preference must not decide what the log can read"
    );
    // `accept` is a protocol header and still travels: a stream is requested
    // by the caller and must stay requested upstream.
    assert_eq!(
        upstream.get("accept").and_then(|value| value.to_str().ok()),
        Some("text/event-stream")
    );

    // An upstream response with no `content-encoding` is inspectable, which is
    // what makes the terminator findable at relay time.
    assert!(
        crate::request_log::body_is_inspectable(&reqwest::header::HeaderMap::new()),
        "an unencoded upstream body must be readable by the relay"
    );
}

/// Different signed clients retain their own identity upstream.
#[test]
fn two_clients_remain_distinguishable_upstream() {
    let client = |os: &'static str, agent: &'static str, session: &'static str| {
        let mut incoming = HeaderMap::new();
        incoming.insert("x-stainless-os", HeaderValue::from_static(os));
        incoming.insert("user-agent", HeaderValue::from_static(agent));
        incoming.insert(
            "x-claude-code-session-id",
            HeaderValue::from_static(session),
        );
        incoming.insert("content-type", HeaderValue::from_static("application/json"));
        let upstream =
            build_upstream_headers(&incoming, "oauth-token", &LogLazy::with_level(levels::NONE));
        let mut rendered = upstream
            .iter()
            .map(|(name, value)| format!("{name}: {}", value.to_str().unwrap_or("<non-utf8>")))
            .collect::<Vec<_>>();
        rendered.sort();
        rendered
    };

    assert_ne!(
        client("ExampleOS-A", "fixture-client/1.0", "fixture-session-a"),
        client("ExampleOS-B", "fixture-client/2.0", "fixture-session-b"),
        "native proxying must not replace client identity with Router identity"
    );
}

#[test]
fn build_upstream_headers_does_not_invent_official_client_headers() {
    let incoming = HeaderMap::new();
    let logger = LogLazy::with_level(levels::NONE);

    let upstream = build_upstream_headers(&incoming, "oauth-token", &logger);

    assert!(upstream.get("anthropic-version").is_none());
    assert!(upstream.get("anthropic-beta").is_none());
}

#[test]
fn build_upstream_headers_preserves_client_beta_exactly() {
    let mut incoming = HeaderMap::new();
    incoming.insert(
        "anthropic-beta",
        HeaderValue::from_static("interleaved-thinking-2025-05-14"),
    );
    let logger = LogLazy::with_level(levels::NONE);

    let upstream = build_upstream_headers(&incoming, "oauth-token", &logger);
    let beta = upstream
        .get("anthropic-beta")
        .and_then(|v| v.to_str().ok())
        .unwrap();
    assert_eq!(beta, "interleaved-thinking-2025-05-14");
}

#[test]
fn merge_oauth_beta_is_idempotent_and_dedups() {
    assert_eq!(merge_oauth_beta(None), OAUTH_BETA_FLAG);
    assert_eq!(merge_oauth_beta(Some("")), OAUTH_BETA_FLAG);
    assert_eq!(merge_oauth_beta(Some(OAUTH_BETA_FLAG)), OAUTH_BETA_FLAG);
    assert_eq!(
        merge_oauth_beta(Some("foo")),
        format!("foo,{OAUTH_BETA_FLAG}")
    );
    // Already present among multiple flags → unchanged.
    let multi = format!("foo,{OAUTH_BETA_FLAG},bar");
    assert_eq!(merge_oauth_beta(Some(&multi)), multi);
}

#[test]
fn routing_context_prefers_token_pin_and_detects_sessions() {
    let mut headers = HeaderMap::new();
    headers.insert(
        "x-claude-code-session-id",
        HeaderValue::from_static("header-session"),
    );
    let body = serde_json::json!({"metadata": {"session_id": "body-session"}});

    let context = request_routing_context(&headers, &body, Some("account-3".into()));

    assert_eq!(context.pinned_account.as_deref(), Some("account-3"));
    assert_eq!(context.session_key.as_deref(), Some("header-session"));
}

#[test]
fn routing_context_falls_back_to_standard_body_session_fields() {
    let headers = HeaderMap::new();
    let body = serde_json::json!({"metadata": {"session_id": "body-session"}});

    let context = request_routing_context(&headers, &body, None);

    assert_eq!(context.session_key.as_deref(), Some("body-session"));
}

#[test]
fn retry_after_delta_seconds_is_used_for_account_cooldown() {
    let mut headers = HeaderMap::new();
    headers.insert("retry-after", HeaderValue::from_static("120"));

    assert_eq!(
        retry_after_duration(&headers),
        Some(std::time::Duration::from_secs(120))
    );
}

#[test]
fn retry_after_http_date_is_used_for_account_cooldown() {
    let retry_at = chrono::Utc::now() + chrono::Duration::seconds(120);
    let mut headers = HeaderMap::new();
    headers.insert(
        "retry-after",
        HeaderValue::from_str(&retry_at.to_rfc2822()).unwrap(),
    );

    let parsed = retry_after_duration(&headers).unwrap();
    assert!(parsed >= std::time::Duration::from_secs(118));
    assert!(parsed <= std::time::Duration::from_secs(120));
}

#[test]
fn retry_after_is_bounded_for_maximum_delta_and_far_future_date() {
    let mut headers = HeaderMap::new();
    headers.insert(
        "retry-after",
        HeaderValue::from_static("18446744073709551615"),
    );
    assert_eq!(
        retry_after_duration(&headers),
        Some(crate::request_routing::MAX_RETRY_AFTER)
    );

    let retry_at = chrono::Utc::now() + chrono::Duration::days(3650);
    headers.insert(
        "retry-after",
        HeaderValue::from_str(&retry_at.to_rfc2822()).unwrap(),
    );
    assert_eq!(
        retry_after_duration(&headers),
        Some(crate::request_routing::MAX_RETRY_AFTER)
    );
}

#[tokio::test]
async fn budget_errors_distinguish_limits_from_storage_failures() {
    let limited =
        crate::token_http::budget_error_response(&crate::token::TokenError::LimitExceeded(None));
    assert_eq!(limited.status(), StatusCode::TOO_MANY_REQUESTS);
    let body = limited.into_body().collect().await.unwrap().to_bytes();
    assert_eq!(
        serde_json::from_slice::<serde_json::Value>(&body).unwrap()["error"]["type"],
        "rate_limit_error"
    );

    for error in [
        crate::token::TokenError::TokenLimitExceeded(None),
        crate::token::TokenError::RateLimitExceeded,
    ] {
        assert_eq!(
            crate::token_http::budget_error_response(&error).status(),
            StatusCode::TOO_MANY_REQUESTS
        );
    }

    let failed = crate::token_http::budget_error_response(&crate::token::TokenError::Storage(
        "disk full".into(),
    ));
    assert_eq!(failed.status(), StatusCode::INTERNAL_SERVER_ERROR);
    let body = failed.into_body().collect().await.unwrap().to_bytes();
    assert_eq!(
        serde_json::from_slice::<serde_json::Value>(&body).unwrap()["error"]["type"],
        "storage_error"
    );

    let invalid = crate::token_http::budget_error_response(&crate::token::TokenError::Invalid(
        "bad claims".into(),
    ));
    assert_eq!(invalid.status(), StatusCode::INTERNAL_SERVER_ERROR);
}
