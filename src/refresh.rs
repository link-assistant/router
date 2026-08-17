//! In-memory OAuth refresh for vendor subscription tokens.
//!
//! When a token read from disk has expired, this module exchanges its
//! `refresh_token` for a fresh access token using the vendor's public OAuth
//! client (the same client ids embedded in each vendor's open-source CLI) and
//! caches the result in memory.
//!
//! Vendor credential files are otherwise left alone, with one exception: when
//! the vendor **rotates** the refresh token, the replacement is written back
//! (see [`crate::subscription::SubscriptionReader::write_token`]) so a restart
//! does not replay a token the vendor has already spent (issue #205). That
//! write is best effort — a read-only mount logs and continues.
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
}

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
/// (issue #203). A minute of skew renews the credential ahead of the failure
/// without meaningfully shortening its usable life.
const REFRESH_SKEW_MS: i64 = 60_000;

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
        },
        // The Codex CLI's public OAuth client (no client secret).
        SubscriptionProvider::Codex => RefreshConfig {
            token_url: "https://auth.openai.com/oauth/token",
            client_id: "app_EMoamEEZ73f0CkXaXp7hrann",
            client_secret_env: None,
            style: BodyStyle::Json,
        },
        // The gemini-cli public OAuth client. Google requires a client secret;
        // it is read from the environment rather than embedded in the binary.
        SubscriptionProvider::Gemini => RefreshConfig {
            token_url: "https://oauth2.googleapis.com/token",
            client_id: "681255809395-oo8ft2oprdrnp9e3aqf6av3hmdib135j.apps.googleusercontent.com",
            client_secret_env: Some(GEMINI_CLIENT_SECRET_ENV),
            style: BodyStyle::Form,
        },
        // The qwen-code CLI's public OAuth client (no client secret).
        SubscriptionProvider::Qwen => RefreshConfig {
            token_url: "https://chat.qwen.ai/api/v1/oauth2/token",
            client_id: "f0304373b74a44d2b584a3fb70ca9e56",
            client_secret_env: None,
            style: BodyStyle::Form,
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
}

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

    let request = match config.style {
        BodyStyle::Json => {
            let mut body = serde_json::json!({
                "grant_type": "refresh_token",
                "refresh_token": refresh_token,
                "client_id": config.client_id,
            });
            if let Some(secret) = client_secret.as_deref() {
                body["client_secret"] = serde_json::Value::String(secret.to_string());
            }
            client.post(token_url).json(&body)
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
            client
                .post(token_url)
                .header("content-type", "application/x-www-form-urlencoded")
                .body(encode_form(&form))
        }
    };

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
        return Err(RefreshError::Status(status.as_u16(), body, retry_after));
    }
    let parsed: RefreshResponse = response
        .json()
        .await
        .map_err(|e| RefreshError::Parse(e.to_string()))?;
    merge_refresh_response(prev, &parsed, now_ms)
        .ok_or_else(|| RefreshError::Parse("response contained no access_token".to_string()))
}

/// Process-wide cache of refreshed subscription tokens, keyed by provider and
/// account. Two subscriptions for the same vendor must never reuse each
/// other's bearer token.
///
/// Holds only in-memory copies obtained via OAuth refresh; vendor credential
/// files on disk are never modified.
/// Also records what upstreams actually said about each credential, so health
/// decisions can be based on observed behaviour rather than on `expiresAt`.
#[derive(Debug, Default)]
pub struct TokenCache {
    inner: Mutex<HashMap<(SubscriptionProvider, String), SubscriptionToken>>,
    /// Per-subscription refresh state. Each async mutex is held across the
    /// exchange so concurrent requests share one attempt.
    attempts: RefreshAttempts,
    /// Latest observed verdict per provider from real upstream calls.
    evidence: Mutex<HashMap<SubscriptionProvider, CredentialEvidence>>,
    /// Latest refresh failure per provider, cleared by a successful refresh.
    refresh_errors: Mutex<HashMap<SubscriptionProvider, String>>,
}

impl TokenCache {
    /// Create an empty cache.
    #[must_use]
    pub fn new() -> Self {
        Self::default()
    }

    /// Return a non-expired token for `provider`, refreshing if needed.
    ///
    /// Resolution order:
    /// 1. If the on-disk token is still valid, use it (the vendor CLI may have
    ///    refreshed it more recently than our cache).
    /// 2. Otherwise reuse a cached refreshed token while it remains valid.
    /// 3. Otherwise exchange the refresh token and cache the result.
    ///
    /// On refresh failure the (expired) disk token is returned unchanged so the
    /// caller can still attempt the upstream call and surface its error.
    pub async fn get_fresh(
        &self,
        client: &reqwest::Client,
        provider: SubscriptionProvider,
        disk_token: SubscriptionToken,
        now_ms: i64,
    ) -> SubscriptionToken {
        self.get_fresh_for(client, provider, "primary", disk_token, now_ms)
            .await
    }

    /// Account-scoped variant of [`Self::get_fresh`].
    pub async fn get_fresh_for(
        &self,
        client: &reqwest::Client,
        provider: SubscriptionProvider,
        account: &str,
        disk_token: SubscriptionToken,
        now_ms: i64,
    ) -> SubscriptionToken {
        self.get_fresh_for_at(
            client,
            refresh_config(provider).token_url,
            provider,
            account,
            disk_token,
            now_ms,
        )
        .await
    }

    /// Refresh regardless of what the token's own `exp` claim says.
    ///
    /// A vendor may invalidate an access token *before* its stated expiry —
    /// a plan change, a session reset — and answers `401` to a token whose
    /// `exp` is still days away (issue #205). `exp` is therefore only ever an
    /// optimisation for refreshing early; a `401` from the resource endpoint
    /// is the authority on whether a token is actually accepted.
    ///
    /// Returns `None` when no fresher token could be obtained, so a caller can
    /// tell "retry with this" from "there is nothing new to retry with" and
    /// avoid replaying a request with the credential that just failed.
    pub async fn refresh_rejected(
        &self,
        client: &reqwest::Client,
        provider: SubscriptionProvider,
        account: &str,
        disk_token: SubscriptionToken,
        now_ms: i64,
    ) -> Option<SubscriptionToken> {
        self.refresh_rejected_at(
            client,
            refresh_config(provider).token_url,
            provider,
            account,
            disk_token,
            now_ms,
        )
        .await
    }

    async fn refresh_rejected_at(
        &self,
        client: &reqwest::Client,
        token_url: &str,
        provider: SubscriptionProvider,
        account: &str,
        rejected: SubscriptionToken,
        now_ms: i64,
    ) -> Option<SubscriptionToken> {
        let attempt = self.attempts.for_subscription(provider, account, &rejected);
        // The same lock the pre-flight path uses, so concurrent 401s share one
        // exchange instead of each spending the refresh token.
        let mut attempt = attempt.lock().await;

        // A concurrent caller may have refreshed while we waited for the lock.
        // Anything that differs from the token just rejected is worth retrying.
        if let Some(cached) = self.cached_valid_for(provider, account, now_ms)
            && cached.access_token != rejected.access_token
        {
            return Some(cached);
        }
        if attempt.suppresses_attempt(now_ms) {
            return None;
        }
        match refresh_at(client, token_url, provider, &rejected, now_ms).await {
            Ok(fresh) => {
                self.store_for(provider, account, fresh.clone());
                attempt.record_success();
                self.record_credential_working(provider);
                if let Ok(mut guard) = self.refresh_errors.lock() {
                    guard.remove(&provider);
                }
                // A refresh that returned the same access token has not
                // recovered anything; replaying would just repeat the 401.
                (fresh.access_token != rejected.access_token).then_some(fresh)
            }
            Err(error) => {
                tracing::warn!("refresh after a rejected {provider} token failed: {error}");
                self.record_refresh_error(provider, &error.to_string());
                if error.is_invalid_grant() {
                    attempt.record_terminal_failure();
                    self.record_credential_rejected(provider);
                } else {
                    attempt.record_transient_failure_after(now_ms, error.retry_after_ms());
                }
                None
            }
        }
    }

    async fn get_fresh_for_at(
        &self,
        client: &reqwest::Client,
        token_url: &str,
        provider: SubscriptionProvider,
        account: &str,
        disk_token: SubscriptionToken,
        now_ms: i64,
    ) -> SubscriptionToken {
        let key = (provider, account.to_string());
        let attempt = self
            .attempts
            .for_subscription(provider, account, &disk_token);
        let mut attempt = attempt.lock().await;

        // Re-authentication replaces at least one credential field. Forget
        // both negative and positive state derived from the previous file.
        if attempt.reset_if_changed(&disk_token) {
            if let Ok(mut guard) = self.inner.lock() {
                guard.remove(&key);
            }
            if let Ok(mut guard) = self.evidence.lock() {
                guard.remove(&provider);
            }
        }
        // Refresh slightly *before* expiry rather than after a request has
        // already failed: a token that expires mid-flight surfaces to the
        // caller as an upstream error, and a credential only ever refreshed
        // reactively can sit unused past its refresh window (issue #203).
        if !disk_token.is_expired(now_ms.saturating_add(REFRESH_SKEW_MS)) {
            return disk_token;
        }
        if let Some(cached) = self.cached_valid_for(provider, account, now_ms) {
            return cached;
        }
        if attempt.suppresses_attempt(now_ms) {
            return disk_token;
        }
        match refresh_at(client, token_url, provider, &disk_token, now_ms).await {
            Ok(fresh) => {
                self.store_for(provider, account, fresh.clone());
                attempt.record_success();
                self.record_credential_working(provider);
                if let Ok(mut guard) = self.refresh_errors.lock() {
                    guard.remove(&provider);
                }
                fresh
            }
            Err(e) => {
                tracing::warn!("subscription token refresh for {provider} failed: {e}");
                self.record_refresh_error(provider, &e.to_string());
                if e.is_invalid_grant() {
                    attempt.record_terminal_failure();
                    self.record_credential_rejected(provider);
                } else {
                    // Everything else is retryable. In particular a 429 must
                    // not record rejection evidence: the credential is fine,
                    // and marking it rejected would drop the provider out of
                    // routing until restart (issue #203).
                    attempt.record_transient_failure_after(now_ms, e.retry_after_ms());
                }
                // The stamped-expired token is returned unchanged on purpose:
                // it may still be honoured by the inference endpoint.
                disk_token
            }
        }
    }

    /// Record that an upstream call succeeded with `provider`'s credential.
    pub fn record_credential_working(&self, provider: SubscriptionProvider) {
        self.record_evidence(provider, CredentialEvidence::Working);
    }

    /// Record what an upstream status code says about `provider`'s credential.
    ///
    /// This is the evidence [`crate::model_routing::healthy_providers`] trusts
    /// over `expiresAt`: a served request proves the credential works even when
    /// its timestamp says otherwise, and only a 401/403 proves it does not.
    /// Every other status describes the request, not the credential.
    pub fn record_status(&self, provider: SubscriptionProvider, status: u16) {
        if status == 401 || status == 403 {
            self.record_credential_rejected(provider);
        } else if (200..300).contains(&status) {
            self.record_credential_working(provider);
        }
    }

    /// Record that an upstream rejected `provider`'s credential (401/403).
    pub fn record_credential_rejected(&self, provider: SubscriptionProvider) {
        self.record_evidence(provider, CredentialEvidence::Rejected);
    }

    /// The most recent upstream verdict for `provider`, if any call was made.
    #[must_use]
    pub fn evidence(&self, provider: SubscriptionProvider) -> Option<CredentialEvidence> {
        self.evidence
            .lock()
            .ok()
            .and_then(|guard| guard.get(&provider).copied())
    }

    /// The most recent refresh failure for `provider`, if the last attempt failed.
    #[must_use]
    pub fn last_refresh_error(&self, provider: SubscriptionProvider) -> Option<String> {
        self.refresh_errors
            .lock()
            .ok()
            .and_then(|guard| guard.get(&provider).cloned())
    }

    fn record_evidence(&self, provider: SubscriptionProvider, evidence: CredentialEvidence) {
        if let Ok(mut guard) = self.evidence.lock() {
            guard.insert(provider, evidence);
        }
    }

    fn record_refresh_error(&self, provider: SubscriptionProvider, error: &str) {
        if let Ok(mut guard) = self.refresh_errors.lock() {
            guard.insert(provider, error.to_string());
        }
    }

    /// Seed the cache with an already-refreshed token for `provider`/`account`.
    ///
    /// Used by callers that obtained a token outside [`Self::get_fresh_for`]
    /// (and by tests) so a subsequent lookup reuses it instead of exchanging
    /// the refresh token again.
    pub fn store_refreshed(
        &self,
        provider: SubscriptionProvider,
        account: &str,
        token: SubscriptionToken,
    ) {
        self.store_for(provider, account, token);
    }

    fn cached_valid_for(
        &self,
        provider: SubscriptionProvider,
        account: &str,
        now_ms: i64,
    ) -> Option<SubscriptionToken> {
        let guard = self.inner.lock().ok()?;
        guard
            .get(&(provider, account.to_string()))
            .filter(|token| !token.is_expired(now_ms))
            .cloned()
    }

    fn store_for(&self, provider: SubscriptionProvider, account: &str, token: SubscriptionToken) {
        if let Ok(mut guard) = self.inner.lock() {
            guard.insert((provider, account.to_string()), token);
        }
    }
}

#[cfg(test)]
#[path = "refresh_tests.rs"]
mod tests;
