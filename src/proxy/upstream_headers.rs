//! Construction of the headers every upstream request carries.
//!
//! The proxy opens the upstream connection itself, so the vendor sees the
//! deployment's address rather than the caller's. Copying every other client
//! header through undid that one layer up, which is why this is an allowlist:
//! a header nobody considered is dropped rather than disclosed (issue #332).
//! Split from `proxy.rs` to keep that file within the repository's 1000-line
//! limit.

use axum::http::{HeaderMap, HeaderValue};
use log_lazy::LogLazy;

use super::REQUIRED_FORWARD_HEADERS;

/// The `user-agent` every upstream request carries.
///
/// Normalised rather than dropped: the vendor expects a value, and reporting
/// the deployment's own identity makes all traffic from one deployment look
/// like one machine instead of describing each caller (issue #332).
const ROUTER_USER_AGENT: &str = concat!("link-assistant-router/", env!("CARGO_PKG_VERSION"));

/// The headers this deployment relays, for the report that makes it checkable.
///
/// Reading the source was the only way to verify what travelled upstream
/// (issue #332).
#[must_use]
pub fn forwarded_client_headers() -> Vec<&'static str> {
    FORWARDED_CLIENT_HEADERS.to_vec()
}

/// The `user-agent` this deployment reports upstream.
#[must_use]
pub const fn router_user_agent() -> &'static str {
    ROUTER_USER_AGENT
}

/// Client headers the upstream protocol actually needs.
///
/// The proxy opens the upstream connection itself, so the vendor sees the
/// deployment's address rather than the caller's. Copying every other header
/// through undid that at the layer above: `x-stainless-os`, `-arch`,
/// `-runtime`, the client `user-agent`, and `accept-language` disclosed client
/// platform and locale details even though those values are not part of the
/// upstream protocol (issue #332).
///
/// An allowlist rather than a denylist, matching the git and GitHub proxies:
/// a header nobody considered is then dropped rather than disclosed, so a new
/// client SDK cannot widen this by inventing a header.
/// `accept-encoding` is deliberately absent.
///
/// The client's compression preference was relayed untouched, so it silently
/// decided whether the proxy could inspect compressed responses. Relaying a
/// request must not cost the router its own
/// observability, so the deployment's hop is negotiated separately from the
/// client's: without the header the upstream answers uncompressed, which makes
/// every stream inspectable for a terminator instead of leaving compressed
/// exchanges unknowable (issues #328, #332).
///
/// The cost is bandwidth on the upstream hop. Restoring compression means
/// enabling reqwest's own `gzip` feature, so the router negotiates and decodes
/// for itself, and never re-forwarding this header — which would recreate the
/// byte-for-byte compressed relay and the blind log with it.
const FORWARDED_CLIENT_HEADERS: &[&str] = &[
    "accept",
    "anthropic-beta",
    "anthropic-version",
    "content-type",
];

/// Default Anthropic API version injected when a client omits the
/// `anthropic-version` header (the Messages API requires it).
pub const DEFAULT_ANTHROPIC_VERSION: &str = "2023-06-01";

/// Anthropic `anthropic-beta` flag for Claude MAX OAuth access tokens.
///
/// Claude MAX OAuth access tokens are only accepted for inference on the
/// Messages API when this beta flag is present. Standard Anthropic SDK
/// clients do not send it, so the proxy injects it when substituting the
/// OAuth credential — otherwise upstream rejects the request.
pub const OAUTH_BETA_FLAG: &str = "oauth-2025-04-20";

/// Deliberate proxy request-body ceiling, independent of the smaller amount
/// retained by the diagnostic request log.
pub const MAX_PROXY_REQUEST_BYTES: usize = crate::config::DEFAULT_MAX_PROXY_REQUEST_BYTES;

/// Merge [`OAUTH_BETA_FLAG`] into an optional existing `anthropic-beta` header
/// value without creating duplicates.
#[must_use]
pub fn merge_oauth_beta(existing: Option<&str>) -> String {
    match existing {
        Some(v) if v.split(',').map(str::trim).any(|f| f == OAUTH_BETA_FLAG) => v.to_string(),
        Some(v) if !v.trim().is_empty() => format!("{v},{OAUTH_BETA_FLAG}"),
        _ => OAUTH_BETA_FLAG.to_string(),
    }
}

/// Build the upstream request headers.
///
/// Forwards only [`FORWARDED_CLIENT_HEADERS`], then sets the real OAuth
/// authorization, a normalised `user-agent`, and the LLM Gateway headers
/// (`anthropic-beta`, `anthropic-version`) the upstream requires.
pub fn build_upstream_headers(
    incoming: &HeaderMap,
    oauth_token: &str,
    logger: &LogLazy,
) -> HeaderMap {
    let mut headers = HeaderMap::new();

    // Only what the upstream protocol needs. `content-length` is never copied
    // even when named: the forwarded body may differ in length from the
    // client's (the Claude Code identity block is prepended for OAuth
    // upstreams), and the HTTP client recomputes it.
    for (name, value) in incoming {
        let name_lower = name.as_str().to_lowercase();
        if FORWARDED_CLIENT_HEADERS.contains(&name_lower.as_str()) {
            headers.insert(name.clone(), value.clone());
        }
    }

    // One deployment looks like one machine, which is what it is. Reporting
    // the deployment's own platform keeps the vendor's client telemetry
    // meaningful without describing whoever happens to be calling.
    headers.insert("user-agent", HeaderValue::from_static(ROUTER_USER_AGENT));

    // Set the real OAuth authorization
    if let Ok(auth_val) = HeaderValue::from_str(&format!("Bearer {oauth_token}")) {
        headers.insert("authorization", auth_val);
    }

    // Ensure the headers Claude MAX OAuth requires are present even when the
    // client (e.g. a plain Anthropic SDK) omits them. This is what makes the
    // proxy transparent against an OAuth-backed upstream.
    if !headers.contains_key("anthropic-version") {
        headers.insert(
            "anthropic-version",
            HeaderValue::from_static(DEFAULT_ANTHROPIC_VERSION),
        );
    }
    let existing_beta = headers
        .get("anthropic-beta")
        .and_then(|v| v.to_str().ok())
        .map(String::from);
    if let Ok(beta_val) = HeaderValue::from_str(&merge_oauth_beta(existing_beta.as_deref())) {
        headers.insert("anthropic-beta", beta_val);
    }

    // Log required headers for observability
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
