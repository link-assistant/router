use axum::http::{HeaderMap, HeaderValue};
use log_lazy::{LogLazy, levels};

use crate::proxy::{
    OAUTH_BETA_FLAG, build_upstream_headers, extract_client_token, merge_oauth_beta,
};

#[test]
fn extract_client_token_accepts_bearer_or_x_api_key() {
    let mut headers = HeaderMap::new();
    headers.insert("x-api-key", HeaderValue::from_static("la_sk_x"));
    assert_eq!(extract_client_token(&headers), Some("la_sk_x"));

    headers.insert("authorization", HeaderValue::from_static("Bearer la_sk_b"));
    assert_eq!(extract_client_token(&headers), Some("la_sk_b"));
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
