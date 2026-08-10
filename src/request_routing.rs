//! Provider-neutral extraction of stable account-routing signals.

use std::time::Duration;

use axum::http::HeaderMap;

use crate::accounts::RoutingContext;

/// Copy only stable routing signals from a request. Header signals take
/// precedence over JSON metadata and the caller token's account binding is
/// carried separately as a strict pin.
pub fn request_routing_context(
    headers: &HeaderMap,
    body: &serde_json::Value,
    pinned_account: Option<String>,
) -> RoutingContext {
    const SESSION_HEADERS: [&str; 4] = [
        "x-claude-code-session-id",
        "x-codex-session-id",
        "x-session-id",
        "session-id",
    ];
    let header_session = SESSION_HEADERS.iter().find_map(|name| {
        headers
            .get(*name)
            .and_then(|value| value.to_str().ok())
            .filter(|value| !value.is_empty())
            .map(ToString::to_string)
    });
    let body_session = [
        "/metadata/session_id",
        "/metadata/conversation_id",
        "/session_id",
        "/conversation_id",
        "/prompt_cache_key",
    ]
    .iter()
    .find_map(|pointer| {
        body.pointer(pointer)
            .and_then(serde_json::Value::as_str)
            .filter(|value| !value.is_empty())
            .map(ToString::to_string)
    });
    RoutingContext {
        session_key: header_session.or(body_session),
        pinned_account,
    }
}

/// Parse the standard `Retry-After` delta-seconds or HTTP-date forms.
pub fn retry_after_duration(headers: &HeaderMap) -> Option<Duration> {
    let value = headers.get("retry-after")?.to_str().ok()?.trim();
    if let Ok(seconds) = value.parse::<u64>() {
        return Some(Duration::from_secs(seconds));
    }
    let retry_at = chrono::DateTime::parse_from_rfc2822(value).ok()?;
    let seconds = retry_at
        .signed_duration_since(chrono::Utc::now())
        .num_seconds()
        .max(0);
    Some(Duration::from_secs(u64::try_from(seconds).ok()?))
}

/// Record what the Anthropic upstream just said about the Claude credential.
///
/// The response status is the only authority on whether a credential still
/// works; see [`crate::refresh::CredentialEvidence`].
pub fn record_claude_evidence(state: &crate::app_state::AppState, status: u16) {
    let cache = &state.subscription_cache;
    cache.record_status(crate::subscription::SubscriptionProvider::Claude, status);
}
