//! Reviewed native Anthropic request-header forwarding.
//!
//! Native proxying preserves the official client's application-level
//! identity. Only authentication, routing/transport framing, hop-by-hop
//! fields, and Router-internal metadata may change.

use std::collections::HashSet;

use axum::http::{HeaderMap, HeaderName, HeaderValue};
use log_lazy::LogLazy;

use super::REQUIRED_FORWARD_HEADERS;

/// Representative end-to-end identity/protocol headers preserved upstream.
#[must_use]
pub fn forwarded_client_headers() -> Vec<&'static str> {
    vec![
        "user-agent",
        "anthropic-version",
        "anthropic-beta",
        "x-stainless-*",
        "x-claude-code-*",
        "accept",
        "content-type",
    ]
}

/// Default used only by explicit cross-protocol adapters.
pub const DEFAULT_ANTHROPIC_VERSION: &str = "2023-06-01";

/// Anthropic OAuth flag used only by explicit cross-protocol adapters.
pub const OAUTH_BETA_FLAG: &str = "oauth-2025-04-20";

/// Deliberate proxy request-body ceiling.
pub const MAX_PROXY_REQUEST_BYTES: usize = crate::config::DEFAULT_MAX_PROXY_REQUEST_BYTES;

/// Reviewed ingress/network-origin metadata that never belongs on a native
/// provider request. Header names are case-insensitive after `HeaderMap`
/// parsing, and every repeated value is removed by the shared classifier.
pub const INGRESS_NETWORK_HEADERS: &[&str] = &[
    "forwarded",
    "x-forwarded-for",
    "x-forwarded-host",
    "x-forwarded-proto",
    "x-forwarded-port",
    "x-forwarded-server",
    "x-original-forwarded-for",
    "x-real-ip",
    "x-client-ip",
    "x-cluster-client-ip",
    "cf-connecting-ip",
    "true-client-ip",
    "fastly-client-ip",
    "fly-client-ip",
    "x-envoy-external-address",
    "x-forwarded-client-cert",
    "x-azure-clientip",
    "x-appengine-user-ip",
    "cloudfront-viewer-address",
];

/// Merge the OAuth bridge beta flag for explicit protocol conversion paths.
#[must_use]
pub fn merge_oauth_beta(existing: Option<&str>) -> String {
    match existing {
        Some(v) if v.split(',').map(str::trim).any(|f| f == OAUTH_BETA_FLAG) => v.to_string(),
        Some(v) if !v.trim().is_empty() => format!("{v},{OAUTH_BETA_FLAG}"),
        _ => OAUTH_BETA_FLAG.to_string(),
    }
}

fn replaced_or_transport_header(name: &str) -> bool {
    INGRESS_NETWORK_HEADERS.contains(&name)
        || matches!(
            name,
            "authorization"
                | "x-api-key"
                | "x-goog-api-key"
                | "anthropic-auth-token"
                | "proxy-authorization"
                | "proxy-authenticate"
                | "host"
                | "connection"
                | "proxy-connection"
                | "keep-alive"
                | "transfer-encoding"
                | "upgrade"
                | "te"
                | "trailer"
                | "content-length"
                | "accept-encoding"
                | "cookie"
                | "chatgpt-account-id"
                | "sec-websocket-key"
                | "sec-websocket-version"
                | "sec-websocket-extensions"
                | "sec-websocket-accept"
        )
        || name.starts_with("x-link-assistant-")
        || name.starts_with("x-router-")
}

pub fn native_request_headers(incoming: &HeaderMap, bearer_token: &str) -> HeaderMap {
    let connection_nominated: HashSet<HeaderName> = incoming
        .get_all("connection")
        .iter()
        .filter_map(|value| value.to_str().ok())
        .flat_map(|value| value.split(','))
        .filter_map(|name| HeaderName::from_bytes(name.trim().as_bytes()).ok())
        .collect();
    let mut headers = HeaderMap::new();
    for (name, value) in incoming {
        if !replaced_or_transport_header(name.as_str()) && !connection_nominated.contains(name) {
            headers.append(name.clone(), value.clone());
        }
    }
    if let Ok(auth_val) = HeaderValue::from_str(&format!("Bearer {bearer_token}")) {
        headers.insert("authorization", auth_val);
    }
    headers
}

/// Preserve the caller's end-to-end request identifier across a protocol
/// translation. Translated requests intentionally rebuild protocol headers,
/// but correlation remains the caller's application-level metadata; Router's
/// own correlation id stays exclusively in request-log state.
#[must_use]
pub fn translated_request_id(incoming: &HeaderMap) -> Option<HeaderValue> {
    incoming.get("x-request-id").cloned()
}

/// Preserve native end-to-end headers and replace only the Router credential.
pub fn build_upstream_headers(
    incoming: &HeaderMap,
    oauth_token: &str,
    logger: &LogLazy,
) -> HeaderMap {
    let headers = native_request_headers(incoming, oauth_token);
    for &header_name in REQUIRED_FORWARD_HEADERS {
        if let Some(val) = headers.get(header_name) {
            logger.trace(|| {
                format!(
                    "Forwarding {header_name}: {}",
                    val.to_str().unwrap_or("<non-utf8>")
                )
            });
        }
    }
    headers
}
