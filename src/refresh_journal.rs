//! The protocol journal: what a token exchange looked like, never what it carried.
//!
//! These OAuth endpoints are undocumented, change without notice, and attest
//! their clients — so a refresh that works in one particular shape and fails in
//! another is a thing an operator must be able to see from the log alone,
//! without a packet capture (issue #239).
//!
//! Everything here records *shape*: method, URL, header names with their
//! non-secret values, and body field names. Values are the secrets and are
//! never written.

use super::{BodyStyle, refresh_config};
use crate::subscription::SubscriptionProvider;

/// Record the *shape* of an outbound token exchange, never its contents.
///
/// These OAuth endpoints are undocumented and attest their clients, so when a
/// refresh only succeeds in one particular shape an operator needs to be able
/// to reproduce that shape from the log alone. Header names with their
/// (non-secret) values and body field *names* are enough to do that; the field
/// values are the secrets and are never written (issue #239).
pub(super) fn journal_request(
    provider: SubscriptionProvider,
    token_url: &str,
    content_type: &str,
    headers: &[(&str, &str)],
    body_fields: &[&str],
) {
    tracing::debug!(
        "{provider} token exchange: {}",
        exchange_shape(token_url, content_type, headers, body_fields)
    );
}

/// Render one exchange as method, URL, headers and body field *names*.
fn exchange_shape(
    token_url: &str,
    content_type: &str,
    headers: &[(&str, &str)],
    body_fields: &[&str],
) -> String {
    let mut sent = vec![format!("content-type: {content_type}")];
    sent.extend(
        headers
            .iter()
            .map(|(name, value)| format!("{name}: {value}")),
    );
    format!(
        "POST {token_url} [{}] body fields [{}] (values omitted)",
        sent.join(", "),
        body_fields.join(", ")
    )
}

/// The exchange the router itself would send for `provider`, without sending it.
///
/// Built from the same configuration [`refresh_at`] uses, so a fallback record
/// can be compared against what the vendor's own client does: if the two send
/// different headers, the journal shows it without further debugging (issue
/// #239).
#[must_use]
pub fn direct_exchange_shape(provider: SubscriptionProvider) -> String {
    let config = refresh_config(provider);
    let content_type = match config.style {
        BodyStyle::Json => "application/json",
        BodyStyle::Form => "application/x-www-form-urlencoded",
    };
    let mut fields = vec!["grant_type", "refresh_token", "client_id"];
    if config
        .client_secret_env
        .and_then(|key| std::env::var(key).ok())
        .is_some_and(|secret| !secret.is_empty())
    {
        fields.push("client_secret");
    }
    exchange_shape(config.token_url, content_type, config.headers, &fields)
}

/// Record which fields a successful token response carried.
///
/// Field names only: whether `refresh_token` came back at all is the difference
/// between a rotating and a non-rotating vendor, and that is exactly what a
/// later diagnosis needs to know.
pub(super) fn journal_response(
    provider: SubscriptionProvider,
    status: u16,
    document: &serde_json::Value,
) {
    let fields = document.as_object().map_or_else(
        || String::from("<not an object>"),
        |map| map.keys().cloned().collect::<Vec<_>>().join(", "),
    );
    tracing::debug!("{provider} token exchange answered HTTP {status} with fields [{fields}]");
}
