//! OAuth refresh and durable rotation handling for vendor subscriptions.
//!
//! When a token read from disk has expired, this module exchanges its
//! `refresh_token` for a fresh access token using the vendor's public OAuth
//! client (the same client ids embedded in each vendor's open-source CLI) and
//! caches the result in memory.
//!
//! Production callers register a recovery-aware store. Any refreshed token is
//! durably persisted there before it can be used; if neither the vendor file
//! nor its recovery sidecar can be committed, serving and diagnostics fail
//! closed. The legacy stateless refresh API still accepts a caller-provided
//! token and cannot provide that transaction guarantee.
//!
//! This is the same behavior `ProxyPal` relies on so the proxy keeps working even
//! when the vendor CLI is not running to refresh its own credential file.
//!
//! Claude is included here too: the runtime container image ships no Claude CLI,
//! so nothing else would keep `~/.claude/.credentials.json` current. The
//! `refreshToken` stored in the nested `claudeAiOauth` block is exchanged the
//! same way.
//!
//! Secrets (access/refresh tokens) are never logged.

use std::collections::HashMap;
use std::sync::Mutex;

use serde::Deserialize;

#[path = "refresh_state.rs"]
mod refresh_state;
use refresh_state::RefreshAttempts;

#[path = "refresh_journal.rs"]
mod refresh_journal;
#[path = "refresh_recovery.rs"]
mod refresh_recovery;
#[path = "refresh_registry.rs"]
mod refresh_registry;
pub use refresh_journal::direct_exchange_shape;
use refresh_journal::{journal_request, journal_response};
use refresh_recovery::{Exchange, RecoveryMode, Rejected, exchange_with_recovery};

use std::sync::Arc;

use crate::credential_store::CredentialStore;
use crate::subscription::{SubscriptionProvider, SubscriptionToken};

/// How a provider's token endpoint expects the refresh request body encoded.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum BodyStyle {
    /// `application/json` body (Codex / `ChatGPT`).
    Json,
    /// `application/x-www-form-urlencoded` body (Google, Qwen).
    Form,
}

/// Public OAuth refresh parameters for one provider.
#[derive(Debug, Clone, Copy)]
struct RefreshConfig {
    token_url: &'static str,
    client_id: &'static str,
    /// Environment variable holding the OAuth client secret, when the provider
    /// requires one. The secret is never hardcoded: Google's installed-app
    /// flow needs a `client_secret`, so set `GEMINI_OAUTH_CLIENT_SECRET` to the
    /// value the gemini-cli ships if you want the router to refresh Gemini
    /// tokens standalone. When unset, the router relies on the vendor CLI to
    /// keep the credential file current.
    client_secret_env: Option<&'static str>,
    style: BodyStyle,
    /// Extra headers the vendor's own OAuth client sends.
    ///
    /// Not cosmetic: Anthropic attests the client server-side, so a refresh
    /// that does not look like the published client can be refused even with a
    /// perfectly good refresh token (issue #239).
    headers: &'static [(&'static str, &'static str)],
}

/// `User-Agent` the Claude Code OAuth provider sends with a refresh.
///
/// Mirrors the published client rather than identifying the router, because the
/// value participates in client attestation at the token endpoint.
pub const CLAUDE_OAUTH_USER_AGENT: &str = "anthropic-sdk-typescript/0.94.0 userOAuthProvider";

/// Headers Anthropic's OAuth client sends with a `refresh_token` grant.
///
/// `anthropic-beta` opts into the OAuth grant the CLI uses — the same flag the
/// inference path already sends ([`crate::proxy::OAUTH_BETA_FLAG`]).
const CLAUDE_OAUTH_HEADERS: &[(&str, &str)] = &[
    ("anthropic-beta", crate::proxy::OAUTH_BETA_FLAG),
    ("user-agent", CLAUDE_OAUTH_USER_AGENT),
];

/// Environment variable for the Gemini (Google) OAuth client secret.
pub const GEMINI_CLIENT_SECRET_ENV: &str = "GEMINI_OAUTH_CLIENT_SECRET";

/// Public OAuth client id of the Claude Code CLI.
///
/// Same value the CLI embeds; used only for the `refresh_token` grant, which
/// needs no client secret.
pub const CLAUDE_CLIENT_ID: &str = "9d1c250a-e61b-44d9-88ed-5944d1962f5e";

/// Anthropic's OAuth token endpoint.
pub const CLAUDE_TOKEN_URL: &str = "https://platform.claude.com/v1/oauth/token";

/// How long before a token's stated expiry it is treated as due for refresh.
///
/// Refreshing reactively — only once a token is already expired — means the
/// request that discovers the expiry has to fail first, and leaves an idle
/// deployment's refresh token sitting unused until it too goes stale
/// (issue #203). Renewing ahead of the failure costs a few minutes of a token's
/// usable life and removes a whole class of mid-flight expiries; five minutes
/// matches what the vendor clients themselves use (issue #239).
const REFRESH_SKEW_MS: i64 = 5 * 60_000;

/// How recently this process must have rotated a credential for a terminal
/// rejection of it to be attributed here rather than to another holder.
///
/// Wider than the grace period: the grace period decides whether to spend a
/// token, while this only decides how the death is explained, and an
/// explanation that is a few minutes stale is still the right one (issue #319).
const ROTATION_ATTRIBUTION_MS: i64 = 60 * 60_000;

/// Refresh parameters for a provider. Every subscription provider now has a
/// public OAuth client, so this is total.
const fn refresh_config(provider: SubscriptionProvider) -> RefreshConfig {
    match provider {
        // The Claude Code CLI's public OAuth client (no client secret). Lets a
        // container renew an expired `~/.claude` token without the CLI.
        SubscriptionProvider::Claude => RefreshConfig {
            token_url: CLAUDE_TOKEN_URL,
            client_id: CLAUDE_CLIENT_ID,
            client_secret_env: None,
            style: BodyStyle::Json,
            headers: CLAUDE_OAUTH_HEADERS,
        },
        // The Codex CLI's public OAuth client (no client secret).
        SubscriptionProvider::Codex => RefreshConfig {
            token_url: "https://auth.openai.com/oauth/token",
            client_id: "app_EMoamEEZ73f0CkXaXp7hrann",
            client_secret_env: None,
            style: BodyStyle::Json,
            headers: &[],
        },
        // The gemini-cli public OAuth client. Google requires a client secret;
        // it is read from the environment rather than embedded in the binary.
        SubscriptionProvider::Gemini => RefreshConfig {
            token_url: "https://oauth2.googleapis.com/token",
            client_id: "681255809395-oo8ft2oprdrnp9e3aqf6av3hmdib135j.apps.googleusercontent.com",
            client_secret_env: Some(GEMINI_CLIENT_SECRET_ENV),
            style: BodyStyle::Form,
            headers: &[],
        },
        // The qwen-code CLI's public OAuth client (no client secret).
        SubscriptionProvider::Qwen => RefreshConfig {
            token_url: "https://chat.qwen.ai/api/v1/oauth2/token",
            client_id: "f0304373b74a44d2b584a3fb70ca9e56",
            client_secret_env: None,
            style: BodyStyle::Form,
            headers: &[],
        },
    }
}

/// Encode key/value pairs as an `application/x-www-form-urlencoded` body.
///
/// Percent-encodes every byte that is not an unreserved character so OAuth
/// tokens containing `+`, `/`, `=`, or other reserved bytes survive transit.
fn encode_form(pairs: &[(&str, &str)]) -> String {
    fn encode(value: &str) -> String {
        let mut out = String::with_capacity(value.len());
        for byte in value.bytes() {
            if byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_' | b'.' | b'~') {
                out.push(byte as char);
            } else {
                out.push('%');
                out.push(
                    char::from_digit(u32::from(byte >> 4), 16)
                        .unwrap()
                        .to_ascii_uppercase(),
                );
                out.push(
                    char::from_digit(u32::from(byte & 0x0f), 16)
                        .unwrap()
                        .to_ascii_uppercase(),
                );
            }
        }
        out
    }
    pairs
        .iter()
        .map(|(k, v)| format!("{}={}", encode(k), encode(v)))
        .collect::<Vec<_>>()
        .join("&")
}

/// The subset of an OAuth token-endpoint response the router consumes.
#[derive(Debug, Deserialize, Default)]
struct RefreshResponse {
    access_token: Option<String>,
    refresh_token: Option<String>,
    expires_in: Option<i64>,
}

/// Errors that can occur while refreshing a subscription token.
#[derive(Debug)]
pub enum RefreshError {
    /// The provider does not support router-driven refresh.
    ///
    /// No provider reports this today — every subscription provider has a
    /// public OAuth client — but it is kept so callers matching on this enum
    /// keep compiling.
    Unsupported,
    /// The token had no `refresh_token` to exchange.
    NoRefreshToken,
    /// The HTTP request to the token endpoint failed.
    Request(String),
    /// The token endpoint returned a non-success status.
    ///
    /// Carries the `Retry-After` delay in seconds when the endpoint sent one,
    /// so a rate-limited refresh can honour the vendor's own pacing instead of
    /// guessing.
    Status(u16, String, Option<i64>),
    /// The response body could not be parsed or lacked an access token.
    Parse(String),
    /// The refresh transaction could not acquire or durably update its
    /// credential store.
    Storage(String),
}

/// Machine-relevant classification of a failed import refresh-chain check.
///
/// Import callers must know whether the vendor definitely refused the
/// candidate or might already have advanced a rotating chain. The diagnostic
/// text deliberately remains separate so no caller has to parse English to
/// make that availability decision.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ImportRefreshFailureKind {
    /// No request that could advance the refresh chain was attempted.
    NotAttempted,
    /// The provider explicitly rejected the refresh token.
    ExchangeRejected,
    /// The request or response was inconclusive after an exchange was attempted.
    ExchangeUncertain,
    /// The provider answered successfully, but durable persistence or reread failed.
    PersistenceUncertain,
}

/// Secret-free failure returned by classified import validation.
#[derive(Debug)]
pub struct ImportRefreshFailure {
    kind: ImportRefreshFailureKind,
    message: String,
}

impl ImportRefreshFailure {
    pub(super) const fn new(kind: ImportRefreshFailureKind, message: String) -> Self {
        Self { kind, message }
    }

    /// Stable classification for machine-readable import recovery output.
    #[must_use]
    pub const fn kind(&self) -> ImportRefreshFailureKind {
        self.kind
    }
}

impl std::fmt::Display for ImportRefreshFailure {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formatter.write_str(&self.message)
    }
}

impl std::error::Error for ImportRefreshFailure {}

/// OAuth error codes that mean the refresh token itself will never work again.
///
/// Deliberately an allowlist rather than a substring search: only these codes,
/// and only under a client-error status, justify telling an operator to
/// re-authenticate (issue #203).
const TERMINAL_OAUTH_ERRORS: [&str; 4] = [
    "invalid_grant",
    "invalid_client",
    "unauthorized_client",
    "unsupported_grant_type",
];

/// The `error` field of an OAuth error response, when the body is one.
///
/// Parsed rather than matched textually so a proxy error page or a success body
/// that merely *mentions* a code cannot be mistaken for the endpoint reporting
/// it. Accepts the nested `{"error": {"type": …}}` shape vendors also use.
#[must_use]
fn oauth_error_code(body: &str) -> Option<String> {
    let parsed: serde_json::Value = serde_json::from_str(body).ok()?;
    let error = parsed.get("error")?;
    if let Some(code) = error.as_str() {
        return Some(code.to_string());
    }
    error
        .get("type")
        .or_else(|| error.get("code"))
        .and_then(serde_json::Value::as_str)
        .map(str::to_string)
}

impl RefreshError {
    /// Whether the token endpoint rejected the *refresh token itself*.
    ///
    /// True only when a client-error status (`400`, `401`, `403`) is paired
    /// with a parsed OAuth error code from a small terminal allowlist. This is
    /// the one case waiting cannot fix, so it is the only case that may stop
    /// the router from retrying.
    ///
    /// Everything else — `429`, `5xx`, timeouts, connection resets, and any
    /// body that merely contains the text `invalid_grant` under an unrelated
    /// status — is retryable (issue #203).
    #[must_use]
    pub fn is_invalid_grant(&self) -> bool {
        let Self::Status(code, body, _) = self else {
            return false;
        };
        if !matches!(code, 400 | 401 | 403) {
            return false;
        }
        oauth_error_code(body).is_some_and(|code| TERMINAL_OAUTH_ERRORS.contains(&code.as_str()))
    }

    /// Whether the endpoint rate-limited this refresh.
    ///
    /// Rate limiting is explicitly *not* terminal: the credential is fine and
    /// the correct response is to wait, which is precisely the case the old
    /// substring classifier reported as permanently revoked.
    #[must_use]
    pub const fn is_rate_limited(&self) -> bool {
        matches!(self, Self::Status(429, _, _))
    }

    /// The delay the endpoint asked callers to wait, in milliseconds.
    #[must_use]
    pub const fn retry_after_ms(&self) -> Option<i64> {
        match self {
            Self::Status(_, _, Some(seconds)) => Some(seconds.saturating_mul(1_000)),
            _ => None,
        }
    }
}

impl std::fmt::Display for RefreshError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Unsupported => write!(f, "provider does not support router-driven refresh"),
            Self::NoRefreshToken => write!(f, "no refresh token available"),
            Self::Request(m) => write!(f, "refresh request failed: {m}"),
            Self::Status(_, m, _) if self.is_invalid_grant() => write!(
                f,
                "refresh token is no longer valid (invalid_grant) — re-authenticate this \
                 subscription with `link-assistant-router auth <provider>`; waiting will not \
                 help: {m}"
            ),
            // Say plainly that this one *is* recoverable, so the operator is
            // not told to re-authenticate over a transient rate limit.
            Self::Status(429, m, _) => write!(
                f,
                "refresh endpoint rate-limited this request (429); it will be retried \
                 automatically and the subscription remains usable: {m}"
            ),
            Self::Status(code, m, _) => write!(f, "refresh endpoint returned {code}: {m}"),
            Self::Parse(m) => write!(f, "refresh response parse error: {m}"),
            Self::Storage(m) => write!(f, "refresh credential storage failed: {m}"),
        }
    }
}

/// What real upstream calls have said about a credential, as opposed to what
/// its `expiresAt` timestamp claims.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CredentialEvidence {
    /// An upstream call succeeded with this credential.
    Working,
    /// An upstream call rejected this credential (HTTP 401/403).
    Rejected,
}

impl std::error::Error for RefreshError {}

/// Merge a refresh-endpoint response into a fresh [`SubscriptionToken`],
/// carrying over routing metadata (`account_id`, `resource_url`) and reusing
/// the previous refresh token when the endpoint did not rotate it.
fn merge_refresh_response(
    prev: &SubscriptionToken,
    resp: &RefreshResponse,
    now_ms: i64,
) -> Option<SubscriptionToken> {
    let access_token = resp.access_token.clone().filter(|s| !s.is_empty())?;
    Some(SubscriptionToken {
        access_token,
        refresh_token: resp
            .refresh_token
            .clone()
            .filter(|s| !s.is_empty())
            .or_else(|| prev.refresh_token.clone()),
        expires_at_ms: resp.expires_in.map(|secs| now_ms + secs * 1000),
        account_id: prev.account_id.clone(),
        resource_url: prev.resource_url.clone(),
    })
}

/// Exchange a token's `refresh_token` for a fresh access token via the
/// provider's public OAuth client. Returns the refreshed token on success.
///
/// # Errors
///
/// Returns [`RefreshError`] when the provider is unsupported, no refresh token
/// is present, the HTTP request fails, the endpoint reports an error status, or
/// the response cannot be parsed.
pub async fn refresh(
    client: &reqwest::Client,
    provider: SubscriptionProvider,
    prev: &SubscriptionToken,
    now_ms: i64,
) -> Result<SubscriptionToken, RefreshError> {
    refresh_at(
        client,
        refresh_config(provider).token_url,
        provider,
        prev,
        now_ms,
    )
    .await
}

/// [`refresh`] against an explicit token endpoint.
///
/// Only the URL is overridden — client id, body encoding, and response
/// handling stay exactly as they are in production, so a test pointing this at
/// a stub server exercises the real request shape.
async fn refresh_at(
    client: &reqwest::Client,
    token_url: &str,
    provider: SubscriptionProvider,
    prev: &SubscriptionToken,
    now_ms: i64,
) -> Result<SubscriptionToken, RefreshError> {
    let config = refresh_config(provider);
    let refresh_token = prev
        .refresh_token
        .as_deref()
        .filter(|s| !s.is_empty())
        .ok_or(RefreshError::NoRefreshToken)?;

    // Resolve the optional client secret from the environment (never embedded).
    let client_secret = config
        .client_secret_env
        .and_then(|key| std::env::var(key).ok())
        .filter(|s| !s.is_empty());

    let (request, content_type, body_fields) = match config.style {
        BodyStyle::Json => {
            let mut body = serde_json::json!({
                "grant_type": "refresh_token",
                "refresh_token": refresh_token,
                "client_id": config.client_id,
            });
            let mut fields = vec!["grant_type", "refresh_token", "client_id"];
            if let Some(secret) = client_secret.as_deref() {
                body["client_secret"] = serde_json::Value::String(secret.to_string());
                fields.push("client_secret");
            }
            (
                client.post(token_url).json(&body),
                "application/json",
                fields,
            )
        }
        BodyStyle::Form => {
            let mut form = vec![
                ("grant_type", "refresh_token"),
                ("refresh_token", refresh_token),
                ("client_id", config.client_id),
            ];
            if let Some(secret) = client_secret.as_deref() {
                form.push(("client_secret", secret));
            }
            let fields = form.iter().map(|(name, _)| *name).collect();
            (
                client
                    .post(token_url)
                    .header("content-type", "application/x-www-form-urlencoded")
                    .body(encode_form(&form)),
                "application/x-www-form-urlencoded",
                fields,
            )
        }
    };
    let request = config
        .headers
        .iter()
        .fold(request, |request, (name, value)| {
            request.header(*name, *value)
        });

    journal_request(
        provider,
        token_url,
        content_type,
        config.headers,
        &body_fields,
    );

    let response = request
        .send()
        .await
        .map_err(|e| RefreshError::Request(e.to_string()))?;
    let status = response.status();
    if !status.is_success() {
        // Read `Retry-After` before the body is consumed, so a rate limit can
        // be paced by the vendor's own figure rather than by our backoff alone.
        // Reuses the shared parser, which also accepts the HTTP-date form.
        let retry_after = crate::request_routing::retry_after_duration(response.headers())
            .and_then(|delay| i64::try_from(delay.as_secs()).ok());
        let body = response.text().await.unwrap_or_default();
        tracing::debug!(
            "{provider} token exchange answered HTTP {} (error `{}`)",
            status.as_u16(),
            oauth_error_code(&body).unwrap_or_else(|| "unparsed".to_string())
        );
        return Err(RefreshError::Status(status.as_u16(), body, retry_after));
    }
    let body = response
        .text()
        .await
        .map_err(|e| RefreshError::Parse(e.to_string()))?;
    let document: serde_json::Value =
        serde_json::from_str(&body).map_err(|e| RefreshError::Parse(e.to_string()))?;
    journal_response(provider, status.as_u16(), &document);
    let parsed: RefreshResponse =
        serde_json::from_value(document).map_err(|e| RefreshError::Parse(e.to_string()))?;
    merge_refresh_response(prev, &parsed, now_ms)
        .ok_or_else(|| RefreshError::Parse("response contained no access_token".to_string()))
}

/// Process-wide cache of refreshed subscription tokens, keyed by provider and
/// account. Two subscriptions for the same vendor must never reuse each
/// other's bearer token.
///
/// Registered production subscriptions persist every usable refresh result to
/// their authoritative credential store or recovery sidecar before serving it
/// (issue #239). A dual persistence failure is recorded and fails closed. The
/// legacy stateless methods retain their caller-owned, in-memory behavior.
/// The cache also records what upstreams actually said about each credential,
/// so health decisions can be based on observed behaviour rather than on
/// `expiresAt`.
#[derive(Debug, Default)]
pub struct TokenCache {
    inner: Mutex<HashMap<SubscriptionKey, SubscriptionToken>>,
    /// Per-subscription refresh state. Each async mutex is held across the
    /// exchange so concurrent requests share one attempt.
    attempts: RefreshAttempts,
    /// Latest observed verdict per provider from real upstream calls.
    evidence: Mutex<HashMap<SubscriptionKey, CredentialEvidence>>,
    /// Latest refresh failure per provider, cleared by a successful refresh.
    refresh_errors: Mutex<HashMap<SubscriptionKey, String>>,
    /// Providers whose terminal failure has already been announced.
    ///
    /// The transition healthy -> permanently unauthenticated is one event and
    /// deserves one loud record. Re-deriving it every five minutes and logging
    /// it at full volume buried the line that mattered under 146 restatements
    /// of its consequence (issue #321).
    announced_terminal: Mutex<std::collections::HashSet<SubscriptionKey>>,
    /// How the last successful refresh was obtained, per provider.
    ///
    /// These OAuth endpoints are undocumented; when a credential recovers only
    /// because a newer link was picked up from disk, that fact is worth keeping
    /// where diagnostics can read it back (issue #239).
    recoveries: Mutex<HashMap<SubscriptionProvider, &'static str>>,
    /// Credentials a refresh has already been refused for, per subscription.
    ///
    /// Keyed by account *and* by a fingerprint of the credential that was
    /// rejected, so the verdict answers "has this exact chain link been tried
    /// and refused?" rather than the weaker "does a refresh token exist?" that
    /// let a revoked chain report itself refreshable (issue #245). Storing the
    /// fingerprint rather than the token keeps the secret out of this map, and
    /// makes the record expire by itself: once another holder rotates the file
    /// forward, the fingerprint no longer matches and the account recovers
    /// without a restart, which is the rule the ladder already follows (#239).
    rejections: crate::refresh_rejections::RejectionRecord,
    /// Where each subscription's credential lives, when it is known.
    ///
    /// Without this the cache can only ever reason about the token it was
    /// handed, which is what let a rotated credential look revoked and a
    /// rotation performed while serving vanish at restart (issue #239).
    stores: Mutex<HashMap<SubscriptionKey, Arc<dyn CredentialStore>>>,
    /// Vendor clients that may be asked to rotate a credential the router
    /// could not (issue #239). Empty unless an operator configured one.
    vendor_clis: Mutex<HashMap<SubscriptionKey, Arc<crate::vendor_cli_refresh::VendorCli>>>,
}

/// A subscription is identified by provider *and* account: two accounts of the
/// same vendor must never share a bearer token or a credential file.
type SubscriptionKey = (SubscriptionProvider, String);

#[path = "refresh_cache.rs"]
mod refresh_cache;

/// Fingerprint of a credential's contents, for the durable refusal record.
///
/// Re-exported from the private attempt state so [`crate::refresh_rejections`]
/// identifies a chain link exactly as the in-memory ladder does (issue #245).
#[must_use]
pub(crate) fn credential_fingerprint(credential: &SubscriptionToken) -> [u8; 32] {
    refresh_state::credential_fingerprint(credential)
}

#[path = "refresh_evidence.rs"]
mod refresh_evidence;

#[cfg(test)]
#[path = "refresh_test_support.rs"]
pub(crate) mod test_support;

#[cfg(test)]
#[path = "refresh_tests.rs"]
mod tests;

#[cfg(test)]
#[path = "refresh_inference_evidence_tests.rs"]
mod inference_evidence_tests;
