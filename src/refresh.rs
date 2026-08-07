//! In-memory OAuth refresh for vendor subscription tokens.
//!
//! Vendor credential files are treated as read-only: the router never writes
//! back to `~/.codex`, `~/.gemini`, or `~/.qwen`. When a token read from disk
//! has expired, this module exchanges its `refresh_token` for a fresh access
//! token using the vendor's public OAuth client (the same client ids embedded
//! in each vendor's open-source CLI) and caches the result **in memory only**.
//!
//! This is the same behavior `ProxyPal` relies on so the proxy keeps working even
//! when the vendor CLI is not running to refresh its own credential file.
//!
//! Claude is included here too: the runtime container image ships no Claude CLI,
//! so nothing else would keep `~/.claude/.credentials.json` current. The
//! `refreshToken` stored in the nested `claudeAiOauth` block is exchanged the
//! same way, and the result stays in memory — the credential file is never
//! written back to, so a read-only mount keeps working across expiry.
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

/// Public OAuth client id of the Claude Code CLI.
///
/// Same value the CLI embeds; used only for the `refresh_token` grant, which
/// needs no client secret.
pub const CLAUDE_CLIENT_ID: &str = "9d1c250a-e61b-44d9-88ed-5944d1962f5e";

/// Anthropic's OAuth token endpoint.
pub const CLAUDE_TOKEN_URL: &str = "https://console.anthropic.com/v1/oauth/token";

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

/// Process-wide cache of refreshed subscription tokens, keyed by provider and
/// account. Two subscriptions for the same vendor must never reuse each
/// other's bearer token.
///
/// Holds only in-memory copies obtained via OAuth refresh; vendor credential
/// files on disk are never modified.
#[derive(Debug, Default)]
pub struct TokenCache {
    inner: Mutex<HashMap<(SubscriptionProvider, String), SubscriptionToken>>,
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
        if !disk_token.is_expired(now_ms) {
            return disk_token;
        }
        if let Some(cached) = self.cached_valid_for(provider, account, now_ms) {
            return cached;
        }
        match refresh(client, provider, &disk_token, now_ms).await {
            Ok(fresh) => {
                self.store_for(provider, account, fresh.clone());
                fresh
            }
            Err(e) => {
                tracing::warn!("subscription token refresh for {provider} failed: {e}");
                disk_token
            }
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
mod tests {
    use super::*;

    fn token(refresh: Option<&str>, exp: Option<i64>) -> SubscriptionToken {
        SubscriptionToken {
            access_token: "old-access".into(),
            refresh_token: refresh.map(ToString::to_string),
            expires_at_ms: exp,
            account_id: Some("acct_1".into()),
            resource_url: Some("portal.qwen.ai".into()),
        }
    }

    #[test]
    fn config_present_for_subscription_providers() {
        assert_eq!(
            refresh_config(SubscriptionProvider::Codex).token_url,
            "https://auth.openai.com/oauth/token"
        );
        assert_eq!(
            refresh_config(SubscriptionProvider::Gemini).client_secret_env,
            Some(GEMINI_CLIENT_SECRET_ENV)
        );
        assert_eq!(
            refresh_config(SubscriptionProvider::Qwen).style,
            BodyStyle::Form
        );
        // Claude is refreshed by the router too: the runtime image has no
        // Claude CLI to keep the credential file current.
        let claude = refresh_config(SubscriptionProvider::Claude);
        assert_eq!(claude.token_url, CLAUDE_TOKEN_URL);
        assert_eq!(claude.client_id, CLAUDE_CLIENT_ID);
        assert!(claude.client_secret_env.is_none());
        assert_eq!(claude.style, BodyStyle::Json);
    }

    /// Serve one JSON response on loopback and hand back the request that was
    /// received, so a test can assert the exact refresh body sent upstream.
    async fn stub_token_endpoint(
        response_body: &'static str,
    ) -> (String, tokio::task::JoinHandle<(String, String)>) {
        use tokio::io::{AsyncReadExt, AsyncWriteExt};

        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let url = format!("http://{}/v1/oauth/token", listener.local_addr().unwrap());
        let handle = tokio::spawn(async move {
            let (mut socket, _) = listener.accept().await.unwrap();
            let mut raw = Vec::new();
            let mut buf = [0u8; 2048];
            // Read until the body (after the blank line) is fully present.
            loop {
                let n = socket.read(&mut buf).await.unwrap();
                raw.extend_from_slice(&buf[..n]);
                let text = String::from_utf8_lossy(&raw);
                if n == 0
                    || text
                        .split_once("\r\n\r\n")
                        .is_some_and(|(_, b)| !b.is_empty())
                {
                    break;
                }
            }
            let request = String::from_utf8_lossy(&raw).to_string();
            let (head, body) = request.split_once("\r\n\r\n").unwrap();
            socket
                .write_all(
                    format!(
                        "HTTP/1.1 200 OK\r\ncontent-type: application/json\r\ncontent-length: {}\r\nconnection: close\r\n\r\n{response_body}",
                        response_body.len()
                    )
                    .as_bytes(),
                )
                .await
                .unwrap();
            socket.flush().await.unwrap();
            (head.to_string(), body.to_string())
        });
        (url, handle)
    }

    #[tokio::test]
    async fn claude_refresh_exchanges_the_refresh_token_and_never_touches_disk() {
        // The container case from issue #48: the on-disk Claude token has
        // expired and there is no Claude CLI to renew it.
        let (url, server) = stub_token_endpoint(
            r#"{"access_token":"sk-ant-oat-new","refresh_token":"sk-ant-ort-new","expires_in":3600}"#,
        )
        .await;

        let expired = SubscriptionToken {
            access_token: "sk-ant-oat-old".into(),
            refresh_token: Some("sk-ant-ort-old".into()),
            expires_at_ms: Some(1),
            account_id: None,
            resource_url: None,
        };
        let fresh = refresh_at(
            &reqwest::Client::new(),
            &url,
            SubscriptionProvider::Claude,
            &expired,
            10_000,
        )
        .await
        .expect("claude refresh should succeed");

        assert_eq!(fresh.access_token, "sk-ant-oat-new");
        assert_eq!(fresh.refresh_token.as_deref(), Some("sk-ant-ort-new"));
        assert_eq!(fresh.expires_at_ms, Some(10_000 + 3_600_000));

        let (head, body) = server.await.unwrap();
        assert!(head.starts_with("POST /v1/oauth/token"));
        let sent: serde_json::Value = serde_json::from_str(&body).expect("json body");
        assert_eq!(sent["grant_type"], "refresh_token");
        assert_eq!(sent["refresh_token"], "sk-ant-ort-old");
        assert_eq!(sent["client_id"], CLAUDE_CLIENT_ID);
        // Claude's public client takes no secret.
        assert!(sent.get("client_secret").is_none());
    }

    #[tokio::test]
    async fn claude_refresh_result_is_cached_and_reused() {
        // A single exchange must serve subsequent requests: the stub answers
        // once, so a second refresh attempt would hang/fail instead.
        let (url, server) =
            stub_token_endpoint(r#"{"access_token":"cached-once","expires_in":3600}"#).await;
        let expired = SubscriptionToken {
            access_token: "expired".into(),
            refresh_token: Some("r".into()),
            expires_at_ms: Some(1),
            account_id: None,
            resource_url: None,
        };
        let client = reqwest::Client::new();
        let fresh = refresh_at(
            &client,
            &url,
            SubscriptionProvider::Claude,
            &expired,
            10_000,
        )
        .await
        .unwrap();

        let cache = TokenCache::new();
        cache.store_refreshed(SubscriptionProvider::Claude, "primary", fresh);
        let reused = cache
            .get_fresh(&client, SubscriptionProvider::Claude, expired, 20_000)
            .await;
        assert_eq!(reused.access_token, "cached-once");
        server.await.unwrap();
    }

    #[tokio::test]
    async fn claude_refresh_requires_a_refresh_token() {
        // Without a `refreshToken` in `claudeAiOauth` there is nothing to
        // exchange; the error must be explicit rather than `Unsupported`.
        let client = reqwest::Client::new();
        let no_refresh = token(None, Some(0));
        let err = refresh(&client, SubscriptionProvider::Claude, &no_refresh, 1_000)
            .await
            .expect_err("must fail without a refresh token");
        assert!(matches!(err, RefreshError::NoRefreshToken));
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

    #[tokio::test]
    async fn get_fresh_returns_valid_disk_token_unchanged() {
        let cache = TokenCache::new();
        let client = reqwest::Client::new();
        let valid = token(Some("r1"), Some(10_000));
        let out = cache
            .get_fresh(&client, SubscriptionProvider::Qwen, valid.clone(), 1_000)
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
        };
        cache.store_for(SubscriptionProvider::Qwen, "primary", cached);
        let expired_disk = token(Some("r1"), Some(0));
        let out = cache
            .get_fresh(&client, SubscriptionProvider::Qwen, expired_disk, 1_000)
            .await;
        assert_eq!(out.access_token, "cached-access");
    }

    #[test]
    fn refreshed_tokens_are_isolated_by_account() {
        let cache = TokenCache::new();
        let mut first = token(Some("refresh-a"), Some(10_000));
        first.access_token = "access-a".into();
        let mut second = token(Some("refresh-b"), Some(10_000));
        second.access_token = "access-b".into();

        cache.store_for(SubscriptionProvider::Qwen, "primary", first);
        cache.store_for(SubscriptionProvider::Qwen, "account-1", second);

        assert_eq!(
            cache
                .cached_valid_for(SubscriptionProvider::Qwen, "primary", 1_000)
                .unwrap()
                .access_token,
            "access-a"
        );
        assert_eq!(
            cache
                .cached_valid_for(SubscriptionProvider::Qwen, "account-1", 1_000)
                .unwrap()
                .access_token,
            "access-b"
        );
    }
}
