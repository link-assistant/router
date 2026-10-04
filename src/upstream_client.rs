//! Construction of the shared HTTP client used for every upstream call.

use std::env;
use std::sync::LazyLock;
use std::time::Duration;

use crate::upstream_guard::{BlockedAddress, GuardedResolver, NetworkPolicy};

/// Seconds the router waits for the *next byte* from an upstream before it
/// fails the request.
///
/// This is a read timeout rather than a total one: a long agentic answer may
/// legitimately take many minutes, but a backend that has gone quiet will never
/// speak again. Without it a stalled upstream — as seen when a capped
/// `web_search` request was forwarded to Codex — leaves the client waiting
/// forever instead of receiving an error.
///
/// `reqwest` applies it to every read, so it also bounds the wait for the
/// response headers: it is the idle-read timeout of a stream *and* an upper
/// bound on the first-byte timeout.
pub const DEFAULT_UPSTREAM_READ_TIMEOUT_SECS: u64 = 120;

/// Seconds allowed to establish the TCP (and TLS) connection to an upstream.
///
/// Without it a black-holed provider address held a connection, a file
/// descriptor and a token reservation until the operating system gave up,
/// which is minutes (issue #669).
pub const DEFAULT_UPSTREAM_CONNECT_TIMEOUT_SECS: u64 = 10;

/// Seconds allowed between sending a request and receiving its response
/// headers.
///
/// Equal to the read timeout by default, so it changes nothing unless an
/// operator tightens it with `UPSTREAM_FIRST_BYTE_TIMEOUT_SECS`.
pub const DEFAULT_UPSTREAM_FIRST_BYTE_TIMEOUT_SECS: u64 = DEFAULT_UPSTREAM_READ_TIMEOUT_SECS;

/// Parse a timeout in whole seconds; `0` disables the bound and an unset or
/// unparsable value falls back to `default`.
#[must_use]
pub fn parse_timeout_secs(value: Option<&str>, default: u64) -> Option<Duration> {
    let seconds = value
        .and_then(|value| value.trim().parse::<u64>().ok())
        .unwrap_or(default);
    (seconds > 0).then(|| Duration::from_secs(seconds))
}

/// Parse `UPSTREAM_READ_TIMEOUT_SECS`; `0` disables the bound.
#[must_use]
pub fn parse_upstream_read_timeout(value: Option<&str>) -> Option<Duration> {
    parse_timeout_secs(value, DEFAULT_UPSTREAM_READ_TIMEOUT_SECS)
}

/// The idle-read timeout: `UPSTREAM_IDLE_TIMEOUT_SECS`, or the older
/// `UPSTREAM_READ_TIMEOUT_SECS` it is an alias of.
#[must_use]
pub fn upstream_idle_timeout() -> Option<Duration> {
    let value = env::var("UPSTREAM_IDLE_TIMEOUT_SECS")
        .or_else(|_| env::var("UPSTREAM_READ_TIMEOUT_SECS"))
        .ok();
    parse_upstream_read_timeout(value.as_deref())
}

/// The connect timeout from `UPSTREAM_CONNECT_TIMEOUT_SECS`.
#[must_use]
pub fn upstream_connect_timeout() -> Option<Duration> {
    parse_timeout_secs(
        env::var("UPSTREAM_CONNECT_TIMEOUT_SECS").ok().as_deref(),
        DEFAULT_UPSTREAM_CONNECT_TIMEOUT_SECS,
    )
}

/// The first-byte timeout from `UPSTREAM_FIRST_BYTE_TIMEOUT_SECS`.
#[must_use]
pub fn upstream_first_byte_timeout() -> Option<Duration> {
    parse_timeout_secs(
        env::var("UPSTREAM_FIRST_BYTE_TIMEOUT_SECS").ok().as_deref(),
        DEFAULT_UPSTREAM_FIRST_BYTE_TIMEOUT_SECS,
    )
}

/// The redirect policy of every upstream client: none.
///
/// Upstream requests carry credentials. Following a redirect would send them
/// — or the request body — to a host the operator never configured, so a 3xx
/// is relayed as a response instead (issue #669).
#[must_use]
pub fn redirect_policy() -> reqwest::redirect::Policy {
    reqwest::redirect::Policy::none()
}

/// Build the shared upstream HTTP client with those bounds applied.
///
/// # Errors
/// Propagates a `reqwest` client construction failure.
pub fn build_upstream_client() -> reqwest::Result<reqwest::Client> {
    upstream_client_builder().build()
}

/// Builder with the router's redirect policy and timeouts applied.
pub fn upstream_client_builder() -> reqwest::ClientBuilder {
    configured_builder(upstream_connect_timeout(), upstream_idle_timeout())
}

fn configured_builder(
    connect_timeout: Option<Duration>,
    idle_timeout: Option<Duration>,
) -> reqwest::ClientBuilder {
    let mut builder = reqwest::Client::builder().redirect(redirect_policy());
    if let Some(timeout) = connect_timeout {
        builder = builder.connect_timeout(timeout);
    }
    if let Some(timeout) = idle_timeout {
        builder = builder.read_timeout(timeout);
    }
    builder
}

/// Client for operator-configured API-key providers.
///
/// Same bounds as the shared client, plus the [`GuardedResolver`] so a
/// provider host name cannot be rebound to an internal address after it was
/// configured (issue #669).
static PROVIDER_CLIENT: LazyLock<Option<reqwest::Client>> = LazyLock::new(|| {
    let policy = NetworkPolicy::from_env();
    if policy == NetworkPolicy::allow_all() {
        return None;
    }
    upstream_client_builder()
        .dns_resolver(std::sync::Arc::new(GuardedResolver::new(policy)))
        .build()
        .ok()
});

/// Select the client for a configured API-key provider.
///
/// Returns the guarded client, or `default` when the guard is switched off
/// (`UPSTREAM_ALLOW_PRIVATE_NETWORKS=all`).
#[must_use]
pub fn provider_client(default: &reqwest::Client) -> &reqwest::Client {
    PROVIDER_CLIENT.as_ref().unwrap_or(default)
}

/// Check a configured provider base URL against the process policy.
///
/// # Errors
/// Returns the refusal, ready to show to the operator.
pub fn check_provider_base_url(base_url: &str) -> Result<(), BlockedAddress> {
    NetworkPolicy::from_env().check_base_url(base_url)
}

/// Check a stored provider's base URL and select the client that sends to it.
///
/// Every request-time path to an API-key provider goes through here, so a
/// record written before the guard existed is refused on use as well.
///
/// # Errors
/// Returns the refusal when the base URL names a refused address.
pub fn guarded_provider_client<'a>(
    default: &'a reqwest::Client,
    base_url: &str,
) -> Result<&'a reqwest::Client, BlockedAddress> {
    check_provider_base_url(base_url)?;
    Ok(provider_client(default))
}

/// Why an upstream request produced no response.
#[derive(Debug)]
pub enum UpstreamSendError {
    /// The HTTP client failed: connect, TLS, idle read, or a malformed reply.
    Http(reqwest::Error),
    /// No response headers arrived within the first-byte timeout.
    FirstByteTimeout(Duration),
}

impl UpstreamSendError {
    /// Whether the request ran out of time rather than failing outright.
    #[must_use]
    pub fn is_timeout(&self) -> bool {
        match self {
            Self::Http(error) => error.is_timeout(),
            Self::FirstByteTimeout(_) => true,
        }
    }
}

impl std::fmt::Display for UpstreamSendError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Http(error) => error.fmt(f),
            Self::FirstByteTimeout(limit) => write!(
                f,
                "upstream sent no response within {}s (UPSTREAM_FIRST_BYTE_TIMEOUT_SECS)",
                limit.as_secs()
            ),
        }
    }
}

impl std::error::Error for UpstreamSendError {}

impl From<reqwest::Error> for UpstreamSendError {
    fn from(error: reqwest::Error) -> Self {
        Self::Http(error)
    }
}

/// Execute `request`, failing when no response headers arrive within
/// `first_byte`.
///
/// Dropping the pending request on expiry closes its connection, so the
/// upstream sees the cancellation at once.
///
/// # Errors
/// The client error, or [`UpstreamSendError::FirstByteTimeout`].
pub async fn execute_with_first_byte_timeout(
    client: &reqwest::Client,
    request: reqwest::Request,
    first_byte: Option<Duration>,
) -> Result<reqwest::Response, UpstreamSendError> {
    let pending = client.execute(request);
    match first_byte {
        Some(limit) => tokio::time::timeout(limit, pending)
            .await
            .map_err(|_| UpstreamSendError::FirstByteTimeout(limit))?
            .map_err(UpstreamSendError::Http),
        None => pending.await.map_err(UpstreamSendError::Http),
    }
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
#[path = "upstream_client_tests.rs"]
mod tests;
