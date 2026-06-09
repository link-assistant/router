//! Claude MAX OAuth credential reader.
//!
//! Reads Claude Code session credentials from the filesystem to obtain
//! the OAuth bearer token for upstream API requests.

use serde::Deserialize;
use std::path::{Path, PathBuf};
use std::sync::{Arc, RwLock};

/// Cached OAuth credentials.
#[derive(Clone)]
pub struct OAuthProvider {
    claude_code_home: PathBuf,
    cached_token: Arc<RwLock<Option<String>>>,
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
    /// Expiration timestamp in milliseconds since the Unix epoch, if present.
    #[serde(alias = "expiresAt", alias = "expires_at")]
    expires_at: Option<i64>,
}

impl ClaudeCredentials {
    /// Extract the bearer token, preferring the nested Claude Code block.
    fn extract_token(&self) -> Option<&str> {
        let nested = self.claude_ai_oauth.as_ref().and_then(|b| {
            b.access_token
                .as_deref()
                .or(b.oauth_token.as_deref())
                .filter(|t| !t.is_empty())
        });
        nested
            .or_else(|| self.access_token.as_deref().filter(|t| !t.is_empty()))
            .or_else(|| self.oauth_token.as_deref().filter(|t| !t.is_empty()))
    }

    /// Expiration time in milliseconds since the Unix epoch, if known.
    fn expires_at_ms(&self) -> Option<i64> {
        self.claude_ai_oauth.as_ref().and_then(|b| b.expires_at)
    }
}

impl OAuthProvider {
    /// Create a new OAuth provider pointing at the given Claude Code home directory.
    #[must_use]
    pub fn new(claude_code_home: &str) -> Self {
        Self {
            claude_code_home: PathBuf::from(claude_code_home),
            cached_token: Arc::new(RwLock::new(None)),
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
    fn try_read_credential_file(path: &Path) -> Result<Option<String>, OAuthError> {
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
        if let Some(token) = creds.extract_token() {
            if let Some(exp_ms) = creds.expires_at_ms() {
                let now_ms = chrono::Utc::now().timestamp_millis();
                if exp_ms <= now_ms {
                    tracing::warn!(
                        "Claude Code OAuth token in {} expired at {exp_ms} (now {now_ms}); \
                         upstream requests may fail until you re-authenticate with `claude`.",
                        path.display()
                    );
                }
            }
            return Ok(Some(token.to_string()));
        }

        Ok(None)
    }

    /// Get the OAuth token, using cache if available.
    ///
    /// Falls back to reading from files if the cache is empty.
    pub fn get_token(&self) -> Result<String, OAuthError> {
        // Check cache first
        if let Ok(guard) = self.cached_token.read() {
            if let Some(ref token) = *guard {
                return Ok(token.clone());
            }
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

    /// Manually set the OAuth token (useful for testing or direct configuration).
    pub fn set_token(&self, token: &str) {
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
