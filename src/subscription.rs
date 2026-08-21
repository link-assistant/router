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
        if let Ok(dir) = std::env::var(self.home_env())
            && !dir.is_empty()
        {
            return PathBuf::from(dir);
        }
        PathBuf::from(home).join(self.home_subdir())
    }
}

impl std::fmt::Display for SubscriptionProvider {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        // `pad`, not `write_str`: only `pad` applies the width, fill and
        // alignment the caller asked for, so `{:<8}` is silently ignored by a
        // `write_str` implementation (issue #212).
        f.pad(self.as_str())
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
    ///
    /// Consults the platform secret store as well as the credential file and
    /// returns whichever holds the newer credential; see [`read_token_from`](Self::read_token_from).
    pub fn read_token(&self) -> Result<SubscriptionToken, SubscriptionError> {
        self.read_token_from().map(|(token, _)| token)
    }

    /// Read the subscription token and say which store it came from.
    ///
    /// On macOS the Claude Code credential file is a snapshot that nothing
    /// rotates while the live credential sits in the login Keychain, so reading
    /// only the file saw a token that had been dead for hours while the vendor
    /// client kept working (issue #249). Both stores are read and the newer
    /// credential wins, which keeps every other platform on exactly the file it
    /// used before — there, the keychain lookup simply finds nothing.
    ///
    /// "Newer" is decided by expiry: the two stores hold independent
    /// credentials rather than two copies of one, so the one that stays valid
    /// longer is the live chain. A credential with no expiry loses to one that
    /// has a usable expiry, since an unknown expiry cannot be shown to be
    /// newer.
    ///
    /// # Errors
    ///
    /// Returns the file's error when neither store yields a token, so a machine
    /// with no keychain entry reports exactly what it reported before.
    pub fn read_token_from(
        &self,
    ) -> Result<(SubscriptionToken, crate::platform_keychain::Origin), SubscriptionError> {
        self.select_store(self.read_token_from_keychain())
    }

    /// Choose between the credential file and an already-read store credential.
    ///
    /// Split from [`read_token_from`](Self::read_token_from) so the preference
    /// rule can be tested without a real login Keychain — which no test may
    /// depend on, and none may write to.
    fn select_store(
        &self,
        from_keychain: Option<SubscriptionToken>,
    ) -> Result<(SubscriptionToken, crate::platform_keychain::Origin), SubscriptionError> {
        let from_file = self.read_token_from_file();
        match (from_file, from_keychain) {
            (Ok(file), Some(keychain)) => {
                // Only a strictly later expiry displaces the file, so a store
                // that merely mirrors it changes nothing an operator sees.
                if keychain.expires_at_ms > file.expires_at_ms {
                    Ok((keychain, crate::platform_keychain::Origin::Keychain))
                } else {
                    Ok((file, crate::platform_keychain::Origin::File))
                }
            }
            (Err(_), Some(keychain)) => Ok((keychain, crate::platform_keychain::Origin::Keychain)),
            (file, None) => file.map(|token| (token, crate::platform_keychain::Origin::File)),
        }
    }

    /// Whether this reader describes the home the vendor client itself uses.
    ///
    /// The platform store is a single global entry, so it speaks only for the
    /// default home. A reader pointed somewhere else — a pooled account, a
    /// per-account directory, a mounted credential in a container — must keep
    /// reading exactly the file it was given: letting one machine-wide keychain
    /// entry answer for every account would collapse a pool onto one
    /// subscription.
    fn is_vendor_default_home(&self) -> bool {
        std::env::var("HOME").is_ok_and(|home| self.provider.resolve_home(&home) == self.home)
    }

    /// The credential the platform secret store holds, when there is one.
    fn read_token_from_keychain(&self) -> Option<SubscriptionToken> {
        if !self.is_vendor_default_home() {
            return None;
        }
        let raw = crate::platform_keychain::lookup(self.provider)?;
        // The stored value is the same JSON shape the file holds, so the file
        // parser is reused rather than duplicated for the store.
        let parsed: RawCredentials = serde_json::from_str(&raw)
            .map_err(|error| {
                tracing::debug!(
                    "keychain entry for {} is not usable JSON: {error}",
                    self.provider
                );
            })
            .ok()?;
        parsed.into_token(self.provider)
    }

    /// Read and normalize the subscription token from the credential file.
    fn read_token_from_file(&self) -> Result<SubscriptionToken, SubscriptionError> {
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

    /// Write a refreshed token back into the existing credential file.
    ///
    /// Vendors rotate refresh tokens: the response to a refresh often carries a
    /// *new* `refresh_token` that supersedes the stored one. Keeping that only
    /// in memory means the next process start replays a spent token, turning a
    /// recoverable state into a mandatory re-login (issue #205).
    ///
    /// The refreshed values are merged into the document that is already there,
    /// rather than serialized from [`SubscriptionToken`], because the vendor
    /// CLIs rely on fields this crate does not model (`id_token`, `auth_mode`,
    /// `scope`, `token_type`). Only the file that was actually read is updated.
    ///
    /// # Errors
    ///
    /// Returns [`SubscriptionError::ReadError`] when no credential file exists,
    /// or when the file cannot be parsed or replaced — including a read-only
    /// mount, which is reported in terms of the mount rather than as a bare
    /// `errno`.
    pub fn write_token(&self, token: &SubscriptionToken) -> Result<(), SubscriptionError> {
        let path = self.discover_credential_path().ok_or_else(|| {
            SubscriptionError::NoCredentials(format!(
                "No {} credential file to update in {}",
                self.provider,
                self.home.display()
            ))
        })?;
        let content = std::fs::read_to_string(&path).map_err(|e| {
            SubscriptionError::ReadError(format!("Failed to read {}: {e}", path.display()))
        })?;
        let mut document: serde_json::Value = serde_json::from_str(&content).map_err(|e| {
            SubscriptionError::ParseError(format!("Failed to parse {}: {e}", path.display()))
        })?;

        merge_refreshed_token(&mut document, self.provider, token);

        let serialized = serde_json::to_vec_pretty(&document).map_err(|e| {
            SubscriptionError::ParseError(format!("Failed to serialize {}: {e}", path.display()))
        })?;
        crate::durable_file::atomic_write_owner_only(&path, &serialized).map_err(|e| {
            SubscriptionError::ReadError(crate::durable_file::describe_write_failure(&path, &e))
        })
    }
}

/// Update the token fields of an existing credential document in place.
///
/// Each vendor stores the same three values under a different shape, and only
/// the keys already present are rewritten, so a file written by the vendor CLI
/// keeps its own layout and every field this crate does not model.
fn merge_refreshed_token(
    document: &mut serde_json::Value,
    provider: SubscriptionProvider,
    token: &SubscriptionToken,
) {
    let set = |target: &mut serde_json::Value, key: &str, value: Option<String>| {
        if let Some(value) = value.filter(|value| !value.is_empty()) {
            target[key] = serde_json::Value::String(value);
        }
    };

    match provider {
        SubscriptionProvider::Claude => {
            // Real Claude Code files nest the values; hand-written ones are flat.
            let nested = document.get("claudeAiOauth").is_some();
            let target = if nested {
                &mut document["claudeAiOauth"]
            } else {
                &mut *document
            };
            // Resolve every key before mutating: a file may use either the
            // camelCase or the snake_case spelling, and whichever it already
            // uses is the one kept.
            let key = |camel: &'static str, snake: &'static str| {
                if target.get(snake).is_some() && target.get(camel).is_none() {
                    snake
                } else {
                    camel
                }
            };
            let (access_key, refresh_key, expiry_key) = (
                key("accessToken", "access_token"),
                key("refreshToken", "refresh_token"),
                key("expiresAt", "expires_at"),
            );
            set(target, access_key, Some(token.access_token.clone()));
            set(target, refresh_key, token.refresh_token.clone());
            if let Some(expiry) = token.expires_at_ms {
                target[expiry_key] = serde_json::Value::from(expiry);
            }
        }
        SubscriptionProvider::Codex => {
            // Codex keeps its tokens under `tokens` and stamps `last_refresh`.
            let target = &mut document["tokens"];
            set(target, "access_token", Some(token.access_token.clone()));
            set(target, "refresh_token", token.refresh_token.clone());
            document["last_refresh"] = serde_json::Value::String(chrono::Utc::now().to_rfc3339());
        }
        SubscriptionProvider::Gemini | SubscriptionProvider::Qwen => {
            set(document, "access_token", Some(token.access_token.clone()));
            set(document, "refresh_token", token.refresh_token.clone());
            if let Some(expiry) = token.expires_at_ms {
                document["expiry_date"] = serde_json::Value::from(expiry);
            }
        }
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
        if let Some(block) = self.claude_ai_oauth
            && let Some(access) = non_empty(block.access_token).or_else(|| non_empty(block.token))
        {
            return Some(SubscriptionToken {
                access_token: access,
                refresh_token: non_empty(block.refresh_token),
                expires_at_ms: block.expires_at,
                account_id: None,
                resource_url: None,
            });
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
#[path = "subscription_tests.rs"]
mod tests;
