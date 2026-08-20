//! Claude MAX OAuth credential reader.
//!
//! Reads Claude Code session credentials from the filesystem to obtain
//! the OAuth bearer token for upstream API requests.
//!
//! When the access token has expired, [`OAuthProvider::get_fresh_token`]
//! exchanges the stored `refreshToken` via [`crate::refresh`], which writes a
//! rotated refresh token back to the credential file so the rotation survives
//! a restart (issue #239). That write is best effort, so a container whose
//! `CLAUDE_CODE_HOME` is mounted read-only still survives token expiry from
//! memory without a Claude CLI inside the image.

use serde::Deserialize;
use std::path::{Path, PathBuf};
use std::sync::{Arc, RwLock};

use crate::subscription::SubscriptionToken;

/// Cached OAuth credentials.
#[derive(Clone)]
pub struct OAuthProvider {
    claude_code_home: PathBuf,
    cached_token: Arc<RwLock<Option<String>>>,
    /// Token supplied through [`OAuthProvider::set_token`] rather than read
    /// from disk. Kept separate from `cached_token` so a refresh-aware read
    /// can still prefer an explicitly configured token over the file.
    manual_token: Arc<RwLock<Option<String>>>,
}

/// Structure of the Claude Code OAuth credentials file.
///
/// Two on-disk layouts are supported:
///
/// * The flat layout used by older or hand-written credential files:
///   `{"accessToken": "..."}`.
/// * The nested layout written by the official Claude Code CLI into
///   `~/.claude/.credentials.json`:
///   `{"claudeAiOauth": {"accessToken": "...", "expiresAt": 1234, ...}}`.
///
/// Real Claude MAX sessions use the nested layout, so it must be read for the
/// router to work against an actual Claude Code login.
#[derive(Debug, Default, Deserialize)]
struct ClaudeCredentials {
    /// The OAuth access token (flat layout).
    #[serde(alias = "accessToken", alias = "access_token")]
    access_token: Option<String>,
    /// The OAuth bearer token, alternative field name (flat layout).
    #[serde(alias = "oauthToken", alias = "oauth_token")]
    oauth_token: Option<String>,
    /// The OAuth refresh token (flat layout).
    #[serde(alias = "refreshToken", alias = "refresh_token")]
    refresh_token: Option<String>,
    /// Expiration timestamp in milliseconds since the Unix epoch (flat layout).
    #[serde(alias = "expiresAt", alias = "expires_at", alias = "expiryDate")]
    expires_at: Option<i64>,
    /// Nested OAuth block written by the Claude Code CLI.
    #[serde(alias = "claudeAiOauth", alias = "claude_ai_oauth")]
    claude_ai_oauth: Option<OAuthBlock>,
}

/// Nested OAuth credentials block (`claudeAiOauth`) written by Claude Code.
#[derive(Debug, Default, Deserialize)]
struct OAuthBlock {
    /// The OAuth access token.
    #[serde(alias = "accessToken", alias = "access_token")]
    access_token: Option<String>,
    /// The OAuth bearer token (alternative field name).
    #[serde(alias = "oauthToken", alias = "oauth_token")]
    oauth_token: Option<String>,
    /// The OAuth refresh token used to obtain a new access token.
    #[serde(alias = "refreshToken", alias = "refresh_token")]
    refresh_token: Option<String>,
    /// Expiration timestamp in milliseconds since the Unix epoch, if present.
    #[serde(alias = "expiresAt", alias = "expires_at")]
    expires_at: Option<i64>,
}

impl ClaudeCredentials {
    /// Normalize into a [`SubscriptionToken`], preferring the nested Claude
    /// Code block.
    ///
    /// The access token, refresh token, and expiry are taken from whichever
    /// layout supplied the access token, so a stale flat `refreshToken` is
    /// never paired with a nested access token.
    fn into_subscription_token(self) -> Option<SubscriptionToken> {
        fn non_empty(value: Option<String>) -> Option<String> {
            value.filter(|v| !v.is_empty())
        }

        if let Some(block) = self.claude_ai_oauth
            && let Some(access) =
                non_empty(block.access_token).or_else(|| non_empty(block.oauth_token))
        {
            return Some(SubscriptionToken {
                access_token: access,
                refresh_token: non_empty(block.refresh_token),
                expires_at_ms: block.expires_at,
                account_id: None,
                resource_url: None,
            });
        }
        let access = non_empty(self.access_token).or_else(|| non_empty(self.oauth_token))?;
        Some(SubscriptionToken {
            access_token: access,
            refresh_token: non_empty(self.refresh_token),
            expires_at_ms: self.expires_at,
            account_id: None,
            resource_url: None,
        })
    }
}

impl OAuthProvider {
    /// Create a new OAuth provider pointing at the given Claude Code home directory.
    #[must_use]
    pub fn new(claude_code_home: &str) -> Self {
        Self {
            claude_code_home: PathBuf::from(claude_code_home),
            cached_token: Arc::new(RwLock::new(None)),
            manual_token: Arc::new(RwLock::new(None)),
        }
    }

    /// Candidate file paths where Claude Code may store OAuth credentials.
    fn credential_paths(&self) -> Vec<PathBuf> {
        let base = &self.claude_code_home;
        vec![
            base.join("credentials.json"),
            base.join(".credentials.json"),
            base.join("auth.json"),
            base.join("oauth.json"),
            base.join("config.json"),
        ]
    }

    /// Return the first existing credential file path, if any.
    ///
    /// Useful for diagnostics (e.g. the `doctor` command) so the report
    /// matches the files the provider would actually read, including the
    /// dotfile `.credentials.json` written by the Claude Code CLI.
    #[must_use]
    pub fn discover_credential_path(&self) -> Option<PathBuf> {
        self.credential_paths().into_iter().find(|p| p.exists())
    }

    /// Try to read the OAuth token from Claude Code session files.
    ///
    /// Searches through known credential file locations and extracts the
    /// access token.
    fn read_token_from_files(&self) -> Result<String, OAuthError> {
        Ok(self.read_subscription_token()?.access_token)
    }

    /// Read the full Claude credential — access token, `refreshToken`, and
    /// expiry — from the first credential file that yields one.
    ///
    /// Unlike [`Self::get_token`] this always hits the filesystem, so a
    /// credential file refreshed by an outside process (a Claude CLI on the
    /// host, a re-mounted secret) is picked up rather than served from cache.
    ///
    /// # Errors
    ///
    /// Returns [`OAuthError`] when no credential file exists, one cannot be
    /// read, or none contains an access token.
    pub fn read_subscription_token(&self) -> Result<SubscriptionToken, OAuthError> {
        for path in self.credential_paths() {
            if let Some(token) = Self::try_read_credential_file(&path)? {
                return Ok(token);
            }
        }
        Err(OAuthError::NoCredentials(format!(
            "No credential files found in {}",
            self.claude_code_home.display()
        )))
    }

    /// Try to read a single credential file and extract the token.
    fn try_read_credential_file(path: &Path) -> Result<Option<SubscriptionToken>, OAuthError> {
        if !path.exists() {
            return Ok(None);
        }

        let content = std::fs::read_to_string(path).map_err(|e| {
            OAuthError::ReadError(format!("Failed to read {}: {e}", path.display()))
        })?;

        let creds: ClaudeCredentials = serde_json::from_str(&content).map_err(|e| {
            OAuthError::ParseError(format!("Failed to parse {}: {e}", path.display()))
        })?;

        // Prefer the nested `claudeAiOauth` block (real Claude Code layout),
        // then fall back to the flat `accessToken`/`oauthToken` fields.
        if let Some(token) = creds.into_subscription_token() {
            if let Some(exp_ms) = token.expires_at_ms {
                let now_ms = chrono::Utc::now().timestamp_millis();
                if exp_ms <= now_ms {
                    if token.refresh_token.is_some() {
                        tracing::debug!(
                            "Claude Code OAuth token in {} expired at {exp_ms} (now {now_ms}); \
                             the router will exchange its refresh token in memory.",
                            path.display()
                        );
                    } else {
                        tracing::warn!(
                            "Claude Code OAuth token in {} expired at {exp_ms} (now {now_ms}) \
                             and stores no refresh token; upstream requests may fail until you \
                             re-authenticate with `claude`.",
                            path.display()
                        );
                    }
                }
            }
            return Ok(Some(token));
        }

        Ok(None)
    }

    /// Get the OAuth token, using cache if available.
    ///
    /// Falls back to reading from files if the cache is empty.
    pub fn get_token(&self) -> Result<String, OAuthError> {
        // Check cache first
        if let Ok(guard) = self.cached_token.read()
            && let Some(ref token) = *guard
        {
            return Ok(token.clone());
        }

        // Read from files
        let token = self.read_token_from_files()?;

        // Cache it
        if let Ok(mut guard) = self.cached_token.write() {
            *guard = Some(token.clone());
        }

        Ok(token)
    }

    /// Force refresh the cached token by re-reading from files.
    pub fn refresh_token(&self) -> Result<String, OAuthError> {
        // Clear cache
        if let Ok(mut guard) = self.cached_token.write() {
            *guard = None;
        }

        self.get_token()
    }

    /// Get a non-expired OAuth token, exchanging the stored `refreshToken`
    /// when the on-disk access token has expired.
    ///
    /// Resolution order:
    /// 1. A token set explicitly via [`Self::set_token`].
    /// 2. The credential file, re-read on every call so an externally
    ///    refreshed file wins over anything cached here.
    /// 3. `cache`, which refreshes via Anthropic's token endpoint, persists a
    ///    rotated refresh token back to the credential file, and keeps the
    ///    access token in memory.
    ///
    /// A failed write-back is tolerated, which is what allows a container with
    /// no Claude CLI (and a read-only `CLAUDE_CODE_HOME` mount) to keep
    /// serving requests past token expiry.
    ///
    /// # Errors
    ///
    /// Returns [`OAuthError`] when no token can be read from disk and none was
    /// set manually. A failed *refresh* is not an error: the expired disk
    /// token is returned so the upstream can surface its own error.
    pub async fn get_fresh_token(
        &self,
        client: &reqwest::Client,
        cache: &crate::refresh::TokenCache,
    ) -> Result<String, OAuthError> {
        if let Ok(guard) = self.manual_token.read()
            && let Some(ref token) = *guard
        {
            return Ok(token.clone());
        }

        let disk_token = match self.read_subscription_token() {
            Ok(token) => token,
            // No readable credential file: fall back to whatever `get_token`
            // can produce (a previously cached read) and its error otherwise.
            Err(e) => return self.get_token().map_err(|_| e),
        };

        let now_ms = chrono::Utc::now().timestamp_millis();
        let fresh = cache
            .get_fresh(
                client,
                crate::subscription::SubscriptionProvider::Claude,
                disk_token,
                now_ms,
            )
            .await;
        Ok(fresh.access_token)
    }

    /// Manually set the OAuth token (useful for testing or direct configuration).
    pub fn set_token(&self, token: &str) {
        if let Ok(mut guard) = self.manual_token.write() {
            *guard = Some(token.to_string());
        }
        if let Ok(mut guard) = self.cached_token.write() {
            *guard = Some(token.to_string());
        }
    }
}

/// Errors related to OAuth credential operations.
#[derive(Debug)]
pub enum OAuthError {
    /// No credential files were found.
    NoCredentials(String),
    /// Could not read a credential file.
    ReadError(String),
    /// Could not parse a credential file.
    ParseError(String),
}

impl std::fmt::Display for OAuthError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::NoCredentials(msg) | Self::ReadError(msg) | Self::ParseError(msg) => {
                write!(f, "{msg}")
            }
        }
    }
}

impl std::error::Error for OAuthError {}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn test_no_credential_files() {
        let provider = OAuthProvider::new("/tmp/nonexistent-claude-dir-test");
        let result = provider.get_token();
        assert!(result.is_err());
    }

    #[test]
    fn test_read_credential_file() {
        let dir = tempdir();
        let cred_file = dir.join("credentials.json");
        fs::write(&cred_file, r#"{"accessToken": "test-oauth-token-123"}"#).unwrap();

        let provider = OAuthProvider::new(dir.to_str().unwrap());
        let token = provider.get_token().expect("should read token");
        assert_eq!(token, "test-oauth-token-123");
    }

    #[test]
    fn test_read_nested_claude_code_credentials() {
        // Real Claude Code writes ~/.claude/.credentials.json in this nested
        // shape. The router must read it, not just the flat layout.
        let dir = tempdir();
        let cred_file = dir.join(".credentials.json");
        fs::write(
            &cred_file,
            r#"{"claudeAiOauth":{"accessToken":"sk-ant-oat-nested","refreshToken":"sk-ant-ort-x","expiresAt":9999999999999,"scopes":["user:inference"],"subscriptionType":"max"}}"#,
        )
        .unwrap();

        let provider = OAuthProvider::new(dir.to_str().unwrap());
        let token = provider.get_token().expect("should read nested token");
        assert_eq!(token, "sk-ant-oat-nested");
    }

    #[test]
    fn test_nested_credentials_preferred_over_flat() {
        let dir = tempdir();
        // A file that has both a flat and a nested token prefers the nested one.
        fs::write(
            dir.join("credentials.json"),
            r#"{"accessToken":"flat","claudeAiOauth":{"accessToken":"nested"}}"#,
        )
        .unwrap();
        let provider = OAuthProvider::new(dir.to_str().unwrap());
        assert_eq!(provider.get_token().unwrap(), "nested");
    }

    #[test]
    fn test_expired_nested_token_still_returned() {
        // An expired token is still returned (the caller decides what to do),
        // but reading must not fail.
        let dir = tempdir();
        fs::write(
            dir.join(".credentials.json"),
            r#"{"claudeAiOauth":{"accessToken":"sk-ant-oat-expired","expiresAt":1}}"#,
        )
        .unwrap();
        let provider = OAuthProvider::new(dir.to_str().unwrap());
        assert_eq!(provider.get_token().unwrap(), "sk-ant-oat-expired");
    }

    #[test]
    fn test_reads_refresh_token_and_expiry_from_nested_block() {
        // The refresh token is what lets a container renew without the CLI,
        // so it must survive the read alongside the access token.
        let dir = tempdir();
        fs::write(
            dir.join(".credentials.json"),
            r#"{"claudeAiOauth":{"accessToken":"sk-ant-oat-x","refreshToken":"sk-ant-ort-y","expiresAt":1700000000000}}"#,
        )
        .unwrap();
        let token = OAuthProvider::new(dir.to_str().unwrap())
            .read_subscription_token()
            .expect("should read credential");
        assert_eq!(token.access_token, "sk-ant-oat-x");
        assert_eq!(token.refresh_token.as_deref(), Some("sk-ant-ort-y"));
        assert_eq!(token.expires_at_ms, Some(1_700_000_000_000));
    }

    #[test]
    fn test_flat_layout_refresh_token_is_read() {
        let dir = tempdir();
        fs::write(
            dir.join("credentials.json"),
            r#"{"accessToken":"flat-access","refreshToken":"flat-refresh","expiresAt":42}"#,
        )
        .unwrap();
        let token = OAuthProvider::new(dir.to_str().unwrap())
            .read_subscription_token()
            .unwrap();
        assert_eq!(token.refresh_token.as_deref(), Some("flat-refresh"));
        assert_eq!(token.expires_at_ms, Some(42));
    }

    #[test]
    fn test_nested_block_does_not_borrow_flat_refresh_token() {
        // Mixing a nested access token with a flat refresh token would send a
        // mismatched pair to the token endpoint.
        let dir = tempdir();
        fs::write(
            dir.join("credentials.json"),
            r#"{"accessToken":"flat","refreshToken":"flat-refresh","claudeAiOauth":{"accessToken":"nested"}}"#,
        )
        .unwrap();
        let token = OAuthProvider::new(dir.to_str().unwrap())
            .read_subscription_token()
            .unwrap();
        assert_eq!(token.access_token, "nested");
        assert_eq!(token.refresh_token, None);
    }

    #[tokio::test]
    async fn test_get_fresh_token_returns_unexpired_disk_token() {
        let dir = tempdir();
        fs::write(
            dir.join(".credentials.json"),
            r#"{"claudeAiOauth":{"accessToken":"sk-ant-oat-valid","refreshToken":"r","expiresAt":99999999999999}}"#,
        )
        .unwrap();
        let provider = OAuthProvider::new(dir.to_str().unwrap());
        let token = provider
            .get_fresh_token(&reqwest::Client::new(), &crate::refresh::TokenCache::new())
            .await
            .unwrap();
        assert_eq!(token, "sk-ant-oat-valid");
    }

    #[tokio::test]
    async fn test_get_fresh_token_prefers_manual_token() {
        // An explicitly configured token must win over the credential file and
        // must never trigger a network refresh.
        let dir = tempdir();
        fs::write(
            dir.join(".credentials.json"),
            r#"{"claudeAiOauth":{"accessToken":"from-disk","expiresAt":1}}"#,
        )
        .unwrap();
        let provider = OAuthProvider::new(dir.to_str().unwrap());
        provider.set_token("manual");
        let token = provider
            .get_fresh_token(&reqwest::Client::new(), &crate::refresh::TokenCache::new())
            .await
            .unwrap();
        assert_eq!(token, "manual");
    }

    #[tokio::test]
    async fn test_get_fresh_token_uses_cached_refresh_result() {
        // With a valid cached token the expired disk token is never sent
        // upstream and no refresh request is made.
        let dir = tempdir();
        fs::write(
            dir.join(".credentials.json"),
            r#"{"claudeAiOauth":{"accessToken":"expired","refreshToken":"r","expiresAt":1}}"#,
        )
        .unwrap();
        let cache = crate::refresh::TokenCache::new();
        cache.store_refreshed(
            crate::subscription::SubscriptionProvider::Claude,
            "primary",
            SubscriptionToken {
                access_token: "refreshed".into(),
                refresh_token: Some("r".into()),
                expires_at_ms: Some(i64::MAX),
                account_id: None,
                resource_url: None,
            },
        );
        let provider = OAuthProvider::new(dir.to_str().unwrap());
        let token = provider
            .get_fresh_token(&reqwest::Client::new(), &cache)
            .await
            .unwrap();
        assert_eq!(token, "refreshed");
    }

    #[tokio::test]
    async fn test_get_fresh_token_errors_without_credentials() {
        let provider = OAuthProvider::new("/tmp/nonexistent-claude-dir-fresh");
        let result = provider
            .get_fresh_token(&reqwest::Client::new(), &crate::refresh::TokenCache::new())
            .await;
        assert!(result.is_err());
    }

    #[test]
    fn test_set_token_manually() {
        let provider = OAuthProvider::new("/tmp/nonexistent");
        provider.set_token("manual-token");
        let token = provider.get_token().expect("should return manual token");
        assert_eq!(token, "manual-token");
    }

    #[test]
    fn test_cached_token_returned() {
        let provider = OAuthProvider::new("/tmp/nonexistent");
        provider.set_token("cached");
        let t1 = provider.get_token().unwrap();
        let t2 = provider.get_token().unwrap();
        assert_eq!(t1, t2);
        assert_eq!(t1, "cached");
    }

    fn tempdir() -> PathBuf {
        let dir = std::env::temp_dir().join(format!("router-test-{}", uuid::Uuid::new_v4()));
        fs::create_dir_all(&dir).unwrap();
        dir
    }
}
