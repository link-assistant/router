use axum::http::{HeaderMap, HeaderValue, StatusCode};
use http_body_util::BodyExt;
use log_lazy::{LogLazy, levels};

use crate::proxy::{
    OAUTH_BETA_FLAG, build_upstream_headers, extract_client_token, merge_oauth_beta,
    request_routing_context, retry_after_duration,
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

#[test]
fn build_upstream_headers_strips_client_auth_headers() {
    let mut incoming = HeaderMap::new();
    incoming.insert(
        "authorization",
        HeaderValue::from_static("Bearer la_sk_edge"),
    );
    incoming.insert("x-api-key", HeaderValue::from_static("la_sk_edge"));
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
    assert_eq!(
        upstream
            .get("anthropic-version")
            .and_then(|value| value.to_str().ok()),
        Some("2023-06-01")
    );
}

#[test]
fn build_upstream_headers_injects_required_oauth_headers_when_missing() {
    // A plain Anthropic SDK client that does not send anthropic-version or the
    // OAuth beta flag must still produce a request upstream accepts.
    let incoming = HeaderMap::new();
    let logger = LogLazy::with_level(levels::NONE);

    let upstream = build_upstream_headers(&incoming, "oauth-token", &logger);

    assert_eq!(
        upstream
            .get("anthropic-version")
            .and_then(|v| v.to_str().ok()),
        Some("2023-06-01")
    );
    assert_eq!(
        upstream.get("anthropic-beta").and_then(|v| v.to_str().ok()),
        Some(OAUTH_BETA_FLAG)
    );
}

#[test]
fn build_upstream_headers_preserves_and_merges_client_beta() {
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
    assert!(beta.contains("interleaved-thinking-2025-05-14"));
    assert!(beta.contains(OAUTH_BETA_FLAG));
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

#[tokio::test]
async fn budget_errors_distinguish_limits_from_storage_failures() {
    let limited =
        crate::token_http::budget_error_response(&crate::token::TokenError::LimitExceeded);
    assert_eq!(limited.status(), StatusCode::TOO_MANY_REQUESTS);
    let body = limited.into_body().collect().await.unwrap().to_bytes();
    assert_eq!(
        serde_json::from_slice::<serde_json::Value>(&body).unwrap()["error"]["type"],
        "rate_limit_error"
    );

    for error in [
        crate::token::TokenError::TokenLimitExceeded,
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
