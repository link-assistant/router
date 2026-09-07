//! Construction of the shared HTTP client used for every upstream call.

use std::env;
use std::sync::LazyLock;
use std::time::Duration;

/// Seconds the router waits for the *next byte* from an upstream before it
/// fails the request.
///
/// This is a read timeout rather than a total one: a long agentic answer may
/// legitimately take many minutes, but a backend that has gone quiet will never
/// speak again. Without it a stalled upstream — as seen when a capped
/// `web_search` request was forwarded to Codex — leaves the client waiting
/// forever instead of receiving an error.
pub const DEFAULT_UPSTREAM_READ_TIMEOUT_SECS: u64 = 120;

/// Parse `UPSTREAM_READ_TIMEOUT_SECS`; `0` disables the bound.
#[must_use]
pub fn parse_upstream_read_timeout(value: Option<&str>) -> Option<Duration> {
    let seconds = value
        .and_then(|value| value.trim().parse::<u64>().ok())
        .unwrap_or(DEFAULT_UPSTREAM_READ_TIMEOUT_SECS);
    (seconds > 0).then(|| Duration::from_secs(seconds))
}

/// Build the shared upstream HTTP client with that bound applied.
///
/// # Errors
/// Propagates a `reqwest` client construction failure.
pub fn build_upstream_client() -> reqwest::Result<reqwest::Client> {
    upstream_client_builder().build()
}

fn upstream_client_builder() -> reqwest::ClientBuilder {
    let mut builder = reqwest::Client::builder().redirect(reqwest::redirect::Policy::none());
    if let Some(timeout) =
        parse_upstream_read_timeout(env::var("UPSTREAM_READ_TIMEOUT_SECS").ok().as_deref())
    {
        builder = builder.read_timeout(timeout);
    }
    builder
}

static CODEX_CHATGPT_CLIENT: LazyLock<reqwest::Client> = LazyLock::new(|| {
    crate::codex_cloudflare_cookies::with_cookie_store(upstream_client_builder())
        .build()
        .expect("the Codex ChatGPT client must use the same valid TLS stack as the main client")
});

/// Dedicated client for official Codex traffic to the canonical `ChatGPT` backend.
///
/// It is deliberately separate from the normal upstream client: its shared
/// store accepts only Cloudflare infrastructure cookies, and no custom base or
/// other provider can accidentally inherit them.
#[must_use]
pub(crate) fn codex_chatgpt_client() -> &'static reqwest::Client {
    &CODEX_CHATGPT_CLIENT
}

/// Select the cookie-aware client only for canonical Codex subscription traffic.
#[must_use]
pub(crate) fn subscription_client(
    default: &reqwest::Client,
    provider: crate::subscription::SubscriptionProvider,
    custom_base_url: bool,
) -> &reqwest::Client {
    if provider == crate::subscription::SubscriptionProvider::Codex && !custom_base_url {
        codex_chatgpt_client()
    } else {
        default
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn upstream_reads_are_bounded_unless_explicitly_disabled() {
        assert_eq!(
            parse_upstream_read_timeout(None),
            Some(Duration::from_secs(DEFAULT_UPSTREAM_READ_TIMEOUT_SECS))
        );
        assert_eq!(
            parse_upstream_read_timeout(Some("30")),
            Some(Duration::from_secs(30))
        );
        assert_eq!(parse_upstream_read_timeout(Some("0")), None);
        assert_eq!(
            parse_upstream_read_timeout(Some("not-a-number")),
            Some(Duration::from_secs(DEFAULT_UPSTREAM_READ_TIMEOUT_SECS))
        );
    }

    #[test]
    fn cookie_client_is_limited_to_canonical_codex_subscription_traffic() {
        use crate::subscription::SubscriptionProvider;

        let default = build_upstream_client().expect("default client builds");
        let default_ptr = std::ptr::from_ref(&default);
        assert_ne!(
            std::ptr::from_ref(subscription_client(
                &default,
                SubscriptionProvider::Codex,
                false
            )),
            default_ptr
        );
        assert_eq!(
            std::ptr::from_ref(subscription_client(
                &default,
                SubscriptionProvider::Codex,
                true
            )),
            default_ptr
        );
        for provider in [
            SubscriptionProvider::Claude,
            SubscriptionProvider::Gemini,
            SubscriptionProvider::Qwen,
        ] {
            assert_eq!(
                std::ptr::from_ref(subscription_client(&default, provider, false)),
                default_ptr
            );
        }
    }
}
