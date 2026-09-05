//! Exact HTTP identity used by the supported Codex client.

use axum::http::{HeaderMap, HeaderValue};

pub const DEFAULT_CLIENT_VERSION: &str = "0.153.3";
pub const ORIGINATOR: &str = "codex_cli_rs";

/// The supported Codex version, with the same operator override used by model
/// discovery and inference.
#[must_use]
pub fn client_version() -> String {
    std::env::var("CODEX_CLIENT_VERSION").unwrap_or_else(|_| DEFAULT_CLIENT_VERSION.to_string())
}

/// Build the default headers attached by Codex's shared HTTP client.
#[must_use]
pub fn headers(account_id: Option<&str>) -> HeaderMap {
    let mut headers = HeaderMap::new();
    let user_agent = format!("{ORIGINATOR}/{}", client_version());
    if let Ok(value) = HeaderValue::from_str(&user_agent) {
        headers.insert("user-agent", value);
    }
    headers.insert("originator", HeaderValue::from_static(ORIGINATOR));
    if let Some(account_id) = account_id
        && let Ok(value) = HeaderValue::from_str(account_id)
    {
        headers.insert("chatgpt-account-id", value);
    }
    headers
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn identity_is_versioned_and_account_scoped() {
        let headers = headers(Some("account-42"));
        assert_eq!(
            headers["user-agent"],
            format!("{ORIGINATOR}/{DEFAULT_CLIENT_VERSION}")
        );
        assert_eq!(headers["originator"], ORIGINATOR);
        assert_eq!(headers["chatgpt-account-id"], "account-42");
    }

    #[test]
    fn invalid_account_header_is_dropped() {
        let headers = headers(Some("not\na header"));
        assert!(!headers.contains_key("chatgpt-account-id"));
    }
}
