use axum::http::{HeaderMap, HeaderValue};
use log_lazy::{levels, LogLazy};

use crate::proxy::{build_upstream_headers, extract_client_token};

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
