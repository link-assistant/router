//! Subscription OAuth credential readers for vendor coding CLIs.
//!
//! Several coding assistants (Claude Code, `OpenAI` Codex, Gemini CLI, qwen-code)
//! authenticate the user's *subscription* via OAuth and cache the resulting
//! bearer token in a well-known file under the user's home directory. Reading
//! that file is the fastest, most reliable way to let the router forward
//! requests against a real subscription — exactly how Claude works today via
//! [`crate::oauth`]. This module generalizes that idea to all four vendors so
//! each provider has a single, well-tested credential reader.
//!
//! The on-disk layouts are vendor specific (documented per provider below and
//! in `docs/case-studies/issue-37/online-research.md`); this module normalizes
//! them into a single [`SubscriptionToken`] the proxy can route with.

use serde::Deserialize;
use std::path::{Path, PathBuf};

/// A subscription-backed upstream that authenticates with vendor OAuth tokens.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, serde::Serialize)]
#[serde(rename_all = "snake_case")]
pub enum SubscriptionProvider {
    /// Anthropic Claude (Pro/Max) via Claude Code — `~/.claude`.
    Claude,
    /// `OpenAI` Codex / `ChatGPT` subscription via the Codex CLI — `~/.codex`.
    Codex,
    /// Google Gemini Code Assist via the Gemini CLI — `~/.gemini`.
    Gemini,
    /// Alibaba Qwen via the qwen-code CLI — `~/.qwen`.
    Qwen,
}

impl SubscriptionProvider {
    /// All known subscription providers, in priority order.
    pub const ALL: [Self; 4] = [Self::Claude, Self::Codex, Self::Gemini, Self::Qwen];

    /// Stable lowercase identifier (used in CLI args, env vars, logs).
    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Claude => "claude",
            Self::Codex => "codex",
            Self::Gemini => "gemini",
            Self::Qwen => "qwen",
        }
    }

    /// Parse a provider from a free-form string (aliases included).
    #[must_use]
    pub fn from_str_opt(s: &str) -> Option<Self> {
        match s.trim().to_lowercase().as_str() {
            "claude" | "anthropic" | "claude-code" => Some(Self::Claude),
            "codex" | "chatgpt" | "openai-codex" => Some(Self::Codex),
            "gemini" | "google" | "code-assist" => Some(Self::Gemini),
            "qwen" | "qwen-code" | "dashscope" => Some(Self::Qwen),
            _ => None,
        }
    }

    /// The home subdirectory the vendor CLI writes credentials into, relative
    /// to the user's home directory (e.g. `.codex`).
    #[must_use]
    pub const fn home_subdir(self) -> &'static str {
        match self {
            Self::Claude => ".claude",
            Self::Codex => ".codex",
            Self::Gemini => ".gemini",
            Self::Qwen => ".qwen",
        }
    }

    /// Environment variable that overrides the credential home directory, if any.
    #[must_use]
    pub const fn home_env(self) -> &'static str {
        match self {
            Self::Claude => "CLAUDE_CODE_HOME",
            Self::Codex => "CODEX_HOME",
            Self::Gemini => "GEMINI_HOME",
            Self::Qwen => "QWEN_HOME",
        }
    }

    /// Candidate credential filenames within the home directory, most specific
    /// first.
    #[must_use]
    pub const fn credential_filenames(self) -> &'static [&'static str] {
        match self {
            // Keep parity with the legacy OAuthProvider search order so
            // enabling a pool does not make an existing Claude login vanish.
            Self::Claude => &[
                "credentials.json",
                ".credentials.json",
                "auth.json",
                "oauth.json",
                "config.json",
            ],
            Self::Codex => &["auth.json"],
            Self::Gemini | Self::Qwen => &["oauth_creds.json"],
        }
    }

    /// Default upstream base URL for the provider's subscription endpoint.
    ///
    /// Qwen's per-token `resource_url` overrides this at request time.
    #[must_use]
    pub const fn default_base_url(self) -> &'static str {
        match self {
            Self::Claude => "https://api.anthropic.com",
            Self::Codex => "https://chatgpt.com/backend-api/codex",
            Self::Gemini => "https://cloudcode-pa.googleapis.com",
            Self::Qwen => "https://dashscope.aliyuncs.com/compatible-mode/v1",
        }
    }

    /// Resolve the credential home directory, honoring the provider's override
    /// env var, then falling back to `<home>/<home_subdir>`.
    #[must_use]
    pub fn resolve_home(self, home: &str) -> PathBuf {
        if let Ok(dir) = std::env::var(self.home_env()) {
            if !dir.is_empty() {
                return PathBuf::from(dir);
            }
        }
        PathBuf::from(home).join(self.home_subdir())
    }
}

impl std::fmt::Display for SubscriptionProvider {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_str())
    }
}

/// A normalized subscription token plus the metadata the proxy needs to route.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SubscriptionToken {
    /// OAuth bearer access token sent as `Authorization: Bearer <token>`.
    pub access_token: String,
    /// OAuth refresh token, when the vendor file stores one.
    pub refresh_token: Option<String>,
    /// Expiry as Unix epoch milliseconds, when known.
    pub expires_at_ms: Option<i64>,
    /// `ChatGPT` account id (`chatgpt-account-id` header) for Codex billing.
    pub account_id: Option<String>,
    /// Per-token base URL override (Qwen `resource_url`).
    pub resource_url: Option<String>,
}

impl SubscriptionToken {
    /// Whether the token is expired relative to `now_ms` (with no skew).
    #[must_use]
    pub fn is_expired(&self, now_ms: i64) -> bool {
        self.expires_at_ms.is_some_and(|exp| exp <= now_ms)
    }

    /// Effective base URL for this token: `resource_url` override or the
    /// provider default. Qwen returns a bare host in `resource_url`, so a
    /// scheme and the OpenAI-compatible suffix are added when missing.
    #[must_use]
    pub fn base_url(&self, provider: SubscriptionProvider) -> String {
        let Some(resource) = self.resource_url.as_deref().filter(|s| !s.is_empty()) else {
            return provider.default_base_url().to_string();
        };
        let with_scheme = if resource.starts_with("http://") || resource.starts_with("https://") {
            resource.to_string()
        } else {
            format!("https://{resource}")
        };
        if provider == SubscriptionProvider::Qwen && !with_scheme.contains("/compatible-mode") {
            format!("{}/compatible-mode/v1", with_scheme.trim_end_matches('/'))
        } else {
            with_scheme
        }
    }
}

/// Errors raised while reading subscription credentials.
#[derive(Debug)]
pub enum SubscriptionError {
    /// No credential file existed in any candidate location.
    NoCredentials(String),
    /// A credential file existed but could not be read.
    ReadError(String),
    /// A credential file existed but could not be parsed.
    ParseError(String),
    /// A credential file parsed but contained no usable access token.
    NoToken(String),
}

impl std::fmt::Display for SubscriptionError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::NoCredentials(m)
            | Self::ReadError(m)
            | Self::ParseError(m)
            | Self::NoToken(m) => write!(f, "{m}"),
        }
    }
}

impl std::error::Error for SubscriptionError {}

/// Reads and normalizes a single provider's subscription credentials.
#[derive(Debug, Clone)]
pub struct SubscriptionReader {
    provider: SubscriptionProvider,
    home: PathBuf,
}

impl SubscriptionReader {
    /// Create a reader for `provider` rooted at an explicit home directory.
    #[must_use]
    pub fn new(provider: SubscriptionProvider, home: impl Into<PathBuf>) -> Self {
        Self {
            provider,
            home: home.into(),
        }
    }

    /// Create a reader using the provider's default/overridden home directory.
    #[must_use]
    pub fn from_user_home(provider: SubscriptionProvider, user_home: &str) -> Self {
        Self::new(provider, provider.resolve_home(user_home))
    }

    /// The provider this reader serves.
    #[must_use]
    pub const fn provider(&self) -> SubscriptionProvider {
        self.provider
    }

    /// The credential home directory this reader searches.
    #[must_use]
    pub fn home(&self) -> &Path {
        &self.home
    }

    /// Candidate credential file paths, most specific first.
    #[must_use]
    pub fn credential_paths(&self) -> Vec<PathBuf> {
        self.provider
            .credential_filenames()
            .iter()
            .map(|name| self.home.join(name))
            .collect()
    }

    /// First existing credential file, if any (for diagnostics).
    #[must_use]
    pub fn discover_credential_path(&self) -> Option<PathBuf> {
        self.credential_paths().into_iter().find(|p| p.exists())
    }

    /// Read and normalize the subscription token.
    pub fn read_token(&self) -> Result<SubscriptionToken, SubscriptionError> {
        let mut last_err: Option<SubscriptionError> = None;
        for path in self.credential_paths() {
            if !path.exists() {
                continue;
            }
            let content = std::fs::read_to_string(&path).map_err(|e| {
                SubscriptionError::ReadError(format!("Failed to read {}: {e}", path.display()))
            })?;
            let raw: RawCredentials = serde_json::from_str(&content).map_err(|e| {
                SubscriptionError::ParseError(format!("Failed to parse {}: {e}", path.display()))
            })?;
            match raw.into_token(self.provider) {
                Some(token) => return Ok(token),
                None => {
                    last_err = Some(SubscriptionError::NoToken(format!(
                        "No {} access token in {}",
                        self.provider,
                        path.display()
                    )));
                }
            }
        }
        Err(last_err.unwrap_or_else(|| {
            SubscriptionError::NoCredentials(format!(
                "No {} credential file found in {}",
                self.provider,
                self.home.display()
            ))
        }))
    }
}

/// Construct readers for every vendor, honoring the configured Claude home.
#[must_use]
pub fn all_subscription_readers(claude_home: &str, user_home: &str) -> Vec<SubscriptionReader> {
    SubscriptionProvider::ALL
        .into_iter()
        .map(|provider| {
            if provider == SubscriptionProvider::Claude {
                SubscriptionReader::new(provider, claude_home)
            } else {
                SubscriptionReader::from_user_home(provider, user_home)
            }
        })
        .collect()
}

/// Reader used by an explicitly pinned non-Claude subscription provider.
#[must_use]
pub fn active_subscription_reader(
    upstream: crate::config::UpstreamProvider,
    readers: &[SubscriptionReader],
) -> Option<SubscriptionReader> {
    upstream
        .subscription_provider()
        .filter(|provider| *provider != SubscriptionProvider::Claude)
        .and_then(|provider| {
            readers
                .iter()
                .find(|reader| reader.provider() == provider)
                .cloned()
        })
}

/// Superset of every vendor credential layout. Each provider reads only the
/// fields it uses; serde `alias` covers `camelCase`/`snake_case` variants.
#[derive(Debug, Default, Deserialize)]
struct RawCredentials {
    // Flat layout (Gemini / Qwen / hand-written): top-level token fields.
    #[serde(alias = "accessToken")]
    access_token: Option<String>,
    #[serde(alias = "oauthToken", alias = "oauth_token")]
    token: Option<String>,
    #[serde(alias = "refreshToken")]
    refresh_token: Option<String>,
    /// Gemini/Qwen store expiry as `expiry_date` (ms); others use `expiresAt`.
    #[serde(alias = "expiryDate", alias = "expiresAt", alias = "expires_at")]
    expiry_date: Option<i64>,
    /// Qwen per-token base URL override.
    #[serde(alias = "resourceUrl")]
    resource_url: Option<String>,
    /// `ChatGPT` account id when stored at the top level.
    #[serde(alias = "accountId", alias = "chatgpt_account_id")]
    account_id: Option<String>,
    // Codex nested layout: `{ "tokens": { ... }, "last_refresh": ... }`.
    tokens: Option<CodexTokens>,
    // Claude nested layout: `{ "claudeAiOauth": { ... } }`.
    #[serde(alias = "claudeAiOauth")]
    claude_ai_oauth: Option<ClaudeBlock>,
}

#[derive(Debug, Default, Deserialize)]
struct CodexTokens {
    #[serde(alias = "accessToken")]
    access_token: Option<String>,
    #[serde(alias = "refreshToken")]
    refresh_token: Option<String>,
    #[serde(alias = "accountId")]
    account_id: Option<String>,
    #[serde(alias = "idToken")]
    id_token: Option<String>,
}

#[derive(Debug, Default, Deserialize)]
struct ClaudeBlock {
    #[serde(alias = "accessToken")]
    access_token: Option<String>,
    #[serde(alias = "oauthToken", alias = "oauth_token")]
    token: Option<String>,
    #[serde(alias = "refreshToken")]
    refresh_token: Option<String>,
    #[serde(alias = "expiresAt", alias = "expires_at")]
    expires_at: Option<i64>,
}

fn non_empty(s: Option<String>) -> Option<String> {
    s.filter(|v| !v.is_empty())
}

impl RawCredentials {
    /// Resolve the provider-specific access token and routing metadata.
    fn into_token(self, provider: SubscriptionProvider) -> Option<SubscriptionToken> {
        match provider {
            SubscriptionProvider::Claude => self.claude_token(),
            SubscriptionProvider::Codex => self.codex_token(),
            // Gemini and Qwen both use the flat layout; Qwen adds resource_url.
            SubscriptionProvider::Gemini | SubscriptionProvider::Qwen => self.flat_token(),
        }
    }

    fn claude_token(self) -> Option<SubscriptionToken> {
        // Prefer the nested `claudeAiOauth` block (real Claude Code layout),
        // then fall back to flat fields.
        if let Some(block) = self.claude_ai_oauth {
            if let Some(access) = non_empty(block.access_token).or_else(|| non_empty(block.token)) {
                return Some(SubscriptionToken {
                    access_token: access,
                    refresh_token: non_empty(block.refresh_token),
                    expires_at_ms: block.expires_at,
                    account_id: None,
                    resource_url: None,
                });
            }
        }
        let access = non_empty(self.access_token).or_else(|| non_empty(self.token))?;
        Some(SubscriptionToken {
            access_token: access,
            refresh_token: non_empty(self.refresh_token),
            expires_at_ms: self.expiry_date,
            account_id: None,
            resource_url: None,
        })
    }

    fn codex_token(self) -> Option<SubscriptionToken> {
        let tokens = self.tokens.unwrap_or_default();
        let access = non_empty(tokens.access_token)?;
        let expires_at_ms = self.expiry_date.or_else(|| jwt_expiry_ms(&access));
        let account_id = non_empty(tokens.account_id)
            .or_else(|| non_empty(self.account_id))
            .or_else(|| {
                tokens
                    .id_token
                    .as_deref()
                    .and_then(account_id_from_id_token)
            });
        Some(SubscriptionToken {
            access_token: access,
            refresh_token: non_empty(tokens.refresh_token),
            expires_at_ms,
            account_id,
            resource_url: None,
        })
    }

    fn flat_token(self) -> Option<SubscriptionToken> {
        let access = non_empty(self.access_token).or_else(|| non_empty(self.token))?;
        Some(SubscriptionToken {
            access_token: access,
            refresh_token: non_empty(self.refresh_token),
            expires_at_ms: self.expiry_date,
            account_id: non_empty(self.account_id),
            resource_url: non_empty(self.resource_url),
        })
    }
}

/// Read a JWT `exp` claim without verifying the signature. This is only a
/// local expiry hint; the token endpoint and upstream remain authoritative.
fn jwt_expiry_ms(token: &str) -> Option<i64> {
    use base64::Engine as _;
    let payload = token.split('.').nth(1)?;
    let bytes = base64::engine::general_purpose::URL_SAFE_NO_PAD
        .decode(payload)
        .ok()?;
    let claims: serde_json::Value = serde_json::from_slice(&bytes).ok()?;
    claims.get("exp")?.as_i64()?.checked_mul(1000)
}

/// Extract the `ChatGPT` account id from a Codex `id_token` JWT.
///
/// Codex stores the account id directly, but older/edge auth files only carry
/// the `id_token`; its payload nests the id under
/// `https://api.openai.com/auth.chatgpt_account_id` (or `chatgpt_account_id`).
fn account_id_from_id_token(id_token: &str) -> Option<String> {
    use base64::Engine as _;
    let payload_b64 = id_token.split('.').nth(1)?;
    let bytes = base64::engine::general_purpose::URL_SAFE_NO_PAD
        .decode(payload_b64)
        .ok()?;
    let claims: serde_json::Value = serde_json::from_slice(&bytes).ok()?;
    let auth = claims.get("https://api.openai.com/auth");
    let candidate = auth
        .and_then(|a| a.get("chatgpt_account_id"))
        .or_else(|| claims.get("chatgpt_account_id"))
        .or_else(|| auth.and_then(|a| a.get("account_id")));
    candidate
        .and_then(serde_json::Value::as_str)
        .map(ToString::to_string)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn tempdir() -> PathBuf {
        let dir = std::env::temp_dir().join(format!("router-sub-{}", uuid::Uuid::new_v4()));
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn provider_roundtrip_strings() {
        for p in SubscriptionProvider::ALL {
            assert_eq!(SubscriptionProvider::from_str_opt(p.as_str()), Some(p));
        }
        assert_eq!(
            SubscriptionProvider::from_str_opt("ChatGPT"),
            Some(SubscriptionProvider::Codex)
        );
        assert_eq!(
            SubscriptionProvider::from_str_opt("dashscope"),
            Some(SubscriptionProvider::Qwen)
        );
        assert!(SubscriptionProvider::from_str_opt("unknown").is_none());
    }

    #[test]
    fn reads_codex_auth_json() {
        let dir = tempdir();
        fs::write(
            dir.join("auth.json"),
            r#"{"tokens":{"id_token":"x","access_token":"codex-access","refresh_token":"codex-refresh","account_id":"acct_123"},"last_refresh":"2026-06-01T00:00:00Z"}"#,
        )
        .unwrap();
        let reader = SubscriptionReader::new(SubscriptionProvider::Codex, &dir);
        let token = reader.read_token().expect("codex token");
        assert_eq!(token.access_token, "codex-access");
        assert_eq!(token.refresh_token.as_deref(), Some("codex-refresh"));
        assert_eq!(token.account_id.as_deref(), Some("acct_123"));
        assert_eq!(
            token.base_url(SubscriptionProvider::Codex),
            "https://chatgpt.com/backend-api/codex"
        );
    }

    #[test]
    fn reads_codex_account_id_from_id_token() {
        use base64::Engine as _;
        // header.payload.signature with payload carrying the nested account id.
        let payload = serde_json::json!({
            "https://api.openai.com/auth": { "chatgpt_account_id": "acct_from_jwt" }
        });
        let payload_b64 = base64::engine::general_purpose::URL_SAFE_NO_PAD
            .encode(serde_json::to_vec(&payload).unwrap());
        let id_token = format!("aGVhZGVy.{payload_b64}.sig");
        let dir = tempdir();
        fs::write(
            dir.join("auth.json"),
            format!(r#"{{"tokens":{{"id_token":"{id_token}","access_token":"a"}}}}"#),
        )
        .unwrap();
        let reader = SubscriptionReader::new(SubscriptionProvider::Codex, &dir);
        let token = reader.read_token().expect("codex token");
        assert_eq!(token.account_id.as_deref(), Some("acct_from_jwt"));
    }

    #[test]
    fn reads_codex_expiry_from_access_token() {
        use base64::Engine as _;
        let dir = tempdir();
        let payload =
            base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(br#"{"exp":1770000000}"#);
        let access = format!("header.{payload}.signature");
        fs::write(
            dir.join("auth.json"),
            format!(r#"{{"tokens":{{"access_token":"{access}"}}}}"#),
        )
        .unwrap();
        let token = SubscriptionReader::new(SubscriptionProvider::Codex, &dir)
            .read_token()
            .unwrap();
        assert_eq!(token.expires_at_ms, Some(1_770_000_000_000));
    }

    #[test]
    fn reads_gemini_oauth_creds() {
        let dir = tempdir();
        fs::write(
            dir.join("oauth_creds.json"),
            r#"{"access_token":"gem-access","refresh_token":"gem-refresh","expiry_date":9999999999999,"token_type":"Bearer","scope":"https://www.googleapis.com/auth/cloud-platform"}"#,
        )
        .unwrap();
        let reader = SubscriptionReader::new(SubscriptionProvider::Gemini, &dir);
        let token = reader.read_token().expect("gemini token");
        assert_eq!(token.access_token, "gem-access");
        assert_eq!(token.refresh_token.as_deref(), Some("gem-refresh"));
        assert_eq!(token.expires_at_ms, Some(9_999_999_999_999));
        assert_eq!(
            token.base_url(SubscriptionProvider::Gemini),
            "https://cloudcode-pa.googleapis.com"
        );
    }

    #[test]
    fn reads_qwen_oauth_creds_with_resource_url() {
        let dir = tempdir();
        fs::write(
            dir.join("oauth_creds.json"),
            r#"{"access_token":"qwen-access","refresh_token":"qwen-refresh","token_type":"Bearer","resource_url":"portal.qwen.ai","expiry_date":9999999999999}"#,
        )
        .unwrap();
        let reader = SubscriptionReader::new(SubscriptionProvider::Qwen, &dir);
        let token = reader.read_token().expect("qwen token");
        assert_eq!(token.access_token, "qwen-access");
        assert_eq!(token.resource_url.as_deref(), Some("portal.qwen.ai"));
        // resource_url overrides the default DashScope base and gets the
        // OpenAI-compatible suffix + scheme added.
        assert_eq!(
            token.base_url(SubscriptionProvider::Qwen),
            "https://portal.qwen.ai/compatible-mode/v1"
        );
    }

    #[test]
    fn qwen_without_resource_url_uses_default_base() {
        let dir = tempdir();
        fs::write(
            dir.join("oauth_creds.json"),
            r#"{"access_token":"qwen-access"}"#,
        )
        .unwrap();
        let reader = SubscriptionReader::new(SubscriptionProvider::Qwen, &dir);
        let token = reader.read_token().expect("qwen token");
        assert_eq!(
            token.base_url(SubscriptionProvider::Qwen),
            "https://dashscope.aliyuncs.com/compatible-mode/v1"
        );
    }

    #[test]
    fn reads_claude_nested_credentials() {
        let dir = tempdir();
        fs::write(
            dir.join(".credentials.json"),
            r#"{"claudeAiOauth":{"accessToken":"sk-ant-oat-nested","refreshToken":"sk-ant-ort-x","expiresAt":9999999999999}}"#,
        )
        .unwrap();
        let reader = SubscriptionReader::new(SubscriptionProvider::Claude, &dir);
        let token = reader.read_token().expect("claude token");
        assert_eq!(token.access_token, "sk-ant-oat-nested");
        assert_eq!(token.refresh_token.as_deref(), Some("sk-ant-ort-x"));
        assert_eq!(token.expires_at_ms, Some(9_999_999_999_999));
    }

    #[test]
    fn claude_pool_reader_preserves_legacy_credential_candidates() {
        let dir = tempdir();
        fs::write(dir.join("oauth.json"), r#"{"accessToken":"legacy"}"#).unwrap();
        let token = SubscriptionReader::new(SubscriptionProvider::Claude, &dir)
            .read_token()
            .unwrap();

        assert_eq!(token.access_token, "legacy");
    }

    #[test]
    fn missing_credentials_errors() {
        let reader = SubscriptionReader::new(
            SubscriptionProvider::Gemini,
            "/tmp/router-nonexistent-sub-dir",
        );
        let err = reader.read_token().unwrap_err();
        assert!(matches!(err, SubscriptionError::NoCredentials(_)));
    }

    #[test]
    fn expiry_detection() {
        let token = SubscriptionToken {
            access_token: "a".into(),
            refresh_token: None,
            expires_at_ms: Some(1000),
            account_id: None,
            resource_url: None,
        };
        assert!(token.is_expired(2000));
        assert!(!token.is_expired(500));
    }

    #[test]
    fn discover_credential_path_finds_existing() {
        let dir = tempdir();
        fs::write(dir.join("oauth_creds.json"), r#"{"access_token":"x"}"#).unwrap();
        let reader = SubscriptionReader::new(SubscriptionProvider::Qwen, &dir);
        assert_eq!(
            reader.discover_credential_path(),
            Some(dir.join("oauth_creds.json"))
        );
    }

    #[test]
    fn resolve_home_uses_subdir() {
        // Without the override env var set, falls back to <home>/<subdir>.
        let home = SubscriptionProvider::Codex.resolve_home("/home/alice");
        assert!(home.ends_with(".codex"));
    }
}
