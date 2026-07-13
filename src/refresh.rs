//! In-memory OAuth refresh for vendor subscription tokens.
//!
//! Vendor credential files are treated as read-only: the router never writes
//! back to `~/.codex`, `~/.gemini`, or `~/.qwen`. When a token read from disk
//! has expired, this module exchanges its `refresh_token` for a fresh access
//! token using the vendor's public OAuth client (the same client ids embedded
//! in each vendor's open-source CLI) and caches the result **in memory only**.
//!
//! This is the same behavior `ProxyPal` relies on so the proxy keeps working even
//! when the vendor CLI is not running to refresh its own credential file. Claude
//! is intentionally excluded — it is served by [`crate::oauth`], which already
//! re-reads the credential file the Claude CLI keeps current.
//!
//! Secrets (access/refresh tokens) are never logged.

use std::collections::HashMap;
use std::sync::Mutex;

use serde::Deserialize;

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

/// Refresh parameters for a provider, or `None` when the router does not drive
/// the OAuth refresh itself (Claude).
const fn refresh_config(provider: SubscriptionProvider) -> Option<RefreshConfig> {
    match provider {
        // The Codex CLI's public OAuth client (no client secret).
        SubscriptionProvider::Codex => Some(RefreshConfig {
            token_url: "https://auth.openai.com/oauth/token",
            client_id: "app_EMoamEEZ73f0CkXaXp7hrann",
            client_secret_env: None,
            style: BodyStyle::Json,
        }),
        // The gemini-cli public OAuth client. Google requires a client secret;
        // it is read from the environment rather than embedded in the binary.
        SubscriptionProvider::Gemini => Some(RefreshConfig {
            token_url: "https://oauth2.googleapis.com/token",
            client_id: "681255809395-oo8ft2oprdrnp9e3aqf6av3hmdib135j.apps.googleusercontent.com",
            client_secret_env: Some(GEMINI_CLIENT_SECRET_ENV),
            style: BodyStyle::Form,
        }),
        // The qwen-code CLI's public OAuth client (no client secret).
        SubscriptionProvider::Qwen => Some(RefreshConfig {
            token_url: "https://chat.qwen.ai/api/v1/oauth2/token",
            client_id: "f0304373b74a44d2b584a3fb70ca9e56",
            client_secret_env: None,
            style: BodyStyle::Form,
        }),
        SubscriptionProvider::Claude => None,
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
    id_token: Option<String>,
    expires_in: Option<i64>,
}

/// Errors that can occur while refreshing a subscription token.
#[derive(Debug)]
pub enum RefreshError {
    /// The provider does not support router-driven refresh (Claude).
    Unsupported,
    /// The token had no `refresh_token` to exchange.
    NoRefreshToken,
    /// The HTTP request to the token endpoint failed.
    Request(String),
    /// The token endpoint returned a non-success status.
    Status(u16, String),
    /// The response body could not be parsed or lacked an access token.
    Parse(String),
}

impl std::fmt::Display for RefreshError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Unsupported => write!(f, "provider does not support router-driven refresh"),
            Self::NoRefreshToken => write!(f, "no refresh token available"),
            Self::Request(m) => write!(f, "refresh request failed: {m}"),
            Self::Status(code, m) => write!(f, "refresh endpoint returned {code}: {m}"),
            Self::Parse(m) => write!(f, "refresh response parse error: {m}"),
        }
    }
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
    // Prefer the endpoint's `expires_in`; fall back to the new access token's JWT
    // `exp` (Codex omits `expires_in`) so expiry is known for the next refresh.
    let expires_at_ms = resp
        .expires_in
        .map(|secs| now_ms + secs * 1000)
        .or_else(|| crate::subscription::jwt_exp_ms(&access_token));
    Some(SubscriptionToken {
        access_token,
        refresh_token: resp
            .refresh_token
            .clone()
            .filter(|s| !s.is_empty())
            .or_else(|| prev.refresh_token.clone()),
        expires_at_ms,
        account_id: prev.account_id.clone(),
        resource_url: prev.resource_url.clone(),
        id_token: resp
            .id_token
            .clone()
            .filter(|s| !s.is_empty())
            .or_else(|| prev.id_token.clone()),
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
    let config = refresh_config(provider).ok_or(RefreshError::Unsupported)?;
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
            client.post(config.token_url).json(&body)
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
                .post(config.token_url)
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
        let body = response.text().await.unwrap_or_default();
        return Err(RefreshError::Status(status.as_u16(), body));
    }
    let parsed: RefreshResponse = response
        .json()
        .await
        .map_err(|e| RefreshError::Parse(e.to_string()))?;
    merge_refresh_response(prev, &parsed, now_ms)
        .ok_or_else(|| RefreshError::Parse("response contained no access_token".to_string()))
}

/// Environment flag opting into writing a refreshed credential back to disk.
pub const REFRESH_PERSIST_ENV: &str = "SUBSCRIPTION_REFRESH_PERSIST";

/// Whether disk persistence of refreshed tokens is enabled via the environment.
fn persist_enabled() -> bool {
    std::env::var(REFRESH_PERSIST_ENV)
        .ok()
        .map(|v| {
            let v = v.trim().to_ascii_lowercase();
            v == "1" || v == "true" || v == "yes" || v == "on"
        })
        .unwrap_or(false)
}

/// Process-wide cache of refreshed subscription tokens, keyed by provider.
///
/// Holds only in-memory copies obtained via OAuth refresh; vendor credential
/// files on disk are never modified.
#[derive(Debug, Default)]
pub struct TokenCache {
    inner: Mutex<HashMap<SubscriptionProvider, SubscriptionToken>>,
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
    /// The refresh exchanges the freshest `refresh_token` we hold — the last
    /// in-memory rotation if present, else the on-disk one — so single-use
    /// rotation chains correctly across refreshes rather than replaying a stale
    /// on-disk token.
    ///
    /// When `persist_to` is `Some` and `SUBSCRIPTION_REFRESH_PERSIST` is enabled,
    /// a successful refresh is written back to the credential file so the rotated
    /// `refresh_token` survives a process restart (like the vendor CLI does).
    ///
    /// On refresh failure the (expired) disk token is returned unchanged so the
    /// caller can still attempt the upstream call and surface its error.
    pub async fn get_fresh(
        &self,
        client: &reqwest::Client,
        provider: SubscriptionProvider,
        disk_token: SubscriptionToken,
        now_ms: i64,
        persist_to: Option<&crate::subscription::SubscriptionReader>,
    ) -> SubscriptionToken {
        if !disk_token.is_expired(now_ms) {
            return disk_token;
        }
        if let Some(cached) = self.cached_valid(provider, now_ms) {
            return cached;
        }
        // Chain rotation: refresh from the freshest refresh_token we know.
        let prev = self
            .cached_any(provider)
            .filter(|token| token.refresh_token.is_some())
            .unwrap_or_else(|| disk_token.clone());
        match refresh(client, provider, &prev, now_ms).await {
            Ok(fresh) => {
                self.store(provider, fresh.clone());
                if let Some(reader) = persist_to {
                    if persist_enabled() {
                        match reader.persist_token(&fresh) {
                            Ok(()) => tracing::info!(
                                "refreshed and persisted {provider} subscription token"
                            ),
                            Err(e) => {
                                tracing::warn!("persisting refreshed {provider} token failed: {e}")
                            }
                        }
                    }
                }
                fresh
            }
            Err(e) => {
                tracing::warn!("subscription token refresh for {provider} failed: {e}");
                disk_token
            }
        }
    }

    fn cached_valid(
        &self,
        provider: SubscriptionProvider,
        now_ms: i64,
    ) -> Option<SubscriptionToken> {
        let guard = self.inner.lock().ok()?;
        guard
            .get(&provider)
            .filter(|token| !token.is_expired(now_ms))
            .cloned()
    }

    /// The cached token for `provider` regardless of expiry (for its
    /// most-recently-rotated `refresh_token`).
    fn cached_any(&self, provider: SubscriptionProvider) -> Option<SubscriptionToken> {
        let guard = self.inner.lock().ok()?;
        guard.get(&provider).cloned()
    }

    fn store(&self, provider: SubscriptionProvider, token: SubscriptionToken) {
        if let Ok(mut guard) = self.inner.lock() {
            guard.insert(provider, token);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn token(refresh: Option<&str>, exp: Option<i64>) -> SubscriptionToken {
        SubscriptionToken {
            access_token: "old-access".into(),
            refresh_token: refresh.map(ToString::to_string),
            expires_at_ms: exp,
            account_id: Some("acct_1".into()),
            resource_url: Some("portal.qwen.ai".into()),
            id_token: None,
        }
    }

    #[test]
    fn config_present_for_subscription_providers() {
        assert!(refresh_config(SubscriptionProvider::Codex).is_some());
        assert!(refresh_config(SubscriptionProvider::Gemini).is_some());
        assert!(refresh_config(SubscriptionProvider::Qwen).is_some());
        assert!(refresh_config(SubscriptionProvider::Claude).is_none());
    }

    #[test]
    fn encode_form_percent_encodes_reserved_bytes() {
        let body = encode_form(&[
            ("grant_type", "refresh_token"),
            ("refresh_token", "a/b+c=d"),
        ]);
        assert_eq!(body, "grant_type=refresh_token&refresh_token=a%2Fb%2Bc%3Dd");
    }

    #[test]
    fn merge_carries_metadata_and_computes_expiry() {
        let prev = token(Some("r1"), Some(0));
        let resp = RefreshResponse {
            access_token: Some("new-access".into()),
            refresh_token: None,
            id_token: None,
            expires_in: Some(3600),
        };
        let merged = merge_refresh_response(&prev, &resp, 1_000).unwrap();
        assert_eq!(merged.access_token, "new-access");
        // refresh_token not rotated -> reuse previous.
        assert_eq!(merged.refresh_token.as_deref(), Some("r1"));
        assert_eq!(merged.expires_at_ms, Some(1_000 + 3_600_000));
        assert_eq!(merged.account_id.as_deref(), Some("acct_1"));
        assert_eq!(merged.resource_url.as_deref(), Some("portal.qwen.ai"));
    }

    #[test]
    fn merge_rotates_refresh_token_when_present() {
        let prev = token(Some("r1"), Some(0));
        let resp = RefreshResponse {
            access_token: Some("new-access".into()),
            refresh_token: Some("r2".into()),
            id_token: None,
            expires_in: None,
        };
        let merged = merge_refresh_response(&prev, &resp, 1_000).unwrap();
        assert_eq!(merged.refresh_token.as_deref(), Some("r2"));
        assert_eq!(merged.expires_at_ms, None);
    }

    #[test]
    fn merge_requires_access_token() {
        let prev = token(Some("r1"), Some(0));
        let resp = RefreshResponse::default();
        assert!(merge_refresh_response(&prev, &resp, 1_000).is_none());
    }

    #[test]
    fn merge_carries_id_token_and_derives_expiry_from_jwt() {
        use base64::Engine as _;
        let enc = |b: &[u8]| base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(b);
        // Codex omits `expires_in`; expiry must come from the new access JWT `exp`.
        let access = format!("{}.{}.sig", enc(br#"{}"#), enc(br#"{"exp":5000}"#));
        let prev = token(Some("r1"), Some(0));
        let resp = RefreshResponse {
            access_token: Some(access),
            refresh_token: Some("r2".into()),
            id_token: Some("idt".into()),
            expires_in: None,
        };
        let merged = merge_refresh_response(&prev, &resp, 1_000).unwrap();
        assert_eq!(merged.id_token.as_deref(), Some("idt"));
        assert_eq!(merged.expires_at_ms, Some(5_000_000));
        assert_eq!(merged.refresh_token.as_deref(), Some("r2"));
    }

    #[test]
    fn persist_enabled_reads_env() {
        // Default (unset in the test process) is off.
        assert!(!persist_enabled());
    }

    #[tokio::test]
    async fn get_fresh_returns_valid_disk_token_unchanged() {
        let cache = TokenCache::new();
        let client = reqwest::Client::new();
        let valid = token(Some("r1"), Some(10_000));
        let out = cache
            .get_fresh(
                &client,
                SubscriptionProvider::Qwen,
                valid.clone(),
                1_000,
                None,
            )
            .await;
        assert_eq!(out.access_token, valid.access_token);
    }

    #[tokio::test]
    async fn get_fresh_prefers_cached_valid_token() {
        let cache = TokenCache::new();
        let client = reqwest::Client::new();
        let cached = SubscriptionToken {
            access_token: "cached-access".into(),
            refresh_token: Some("r1".into()),
            expires_at_ms: Some(10_000),
            account_id: None,
            resource_url: None,
            id_token: None,
        };
        cache.store(SubscriptionProvider::Qwen, cached);
        let expired_disk = token(Some("r1"), Some(0));
        let out = cache
            .get_fresh(
                &client,
                SubscriptionProvider::Qwen,
                expired_disk,
                1_000,
                None,
            )
            .await;
        assert_eq!(out.access_token, "cached-access");
    }
}
