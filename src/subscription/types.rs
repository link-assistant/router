use std::path::PathBuf;

/// A subscription-backed upstream that authenticates with vendor OAuth tokens.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, serde::Serialize, serde::Deserialize)]
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

    /// The filename this provider's own client writes.
    #[must_use]
    pub const fn canonical_credential_filename(self) -> &'static str {
        match self {
            Self::Claude => ".credentials.json",
            Self::Codex => "auth.json",
            Self::Gemini | Self::Qwen => "oauth_creds.json",
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
        self.named_home()
            .unwrap_or_else(|| PathBuf::from(home).join(self.home_subdir()))
    }

    /// The directory this provider's own home variable names, if it names one.
    #[must_use]
    pub fn named_home(self) -> Option<PathBuf> {
        std::env::var(self.home_env())
            .ok()
            .filter(|dir| !dir.is_empty())
            .map(PathBuf::from)
    }

    /// The directory the vendor's own client keeps its login in.
    #[must_use]
    pub fn conventional_home(self, home: &str) -> PathBuf {
        PathBuf::from(home).join(self.home_subdir())
    }
}

impl std::fmt::Display for SubscriptionProvider {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        // `pad`, not `write_str`: only `pad` applies the width, fill and
        // alignment the caller asked for.
        f.pad(self.as_str())
    }
}

/// A normalized subscription token plus the metadata the proxy needs to route.
#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
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
    /// scheme and the `/v1` suffix used by Qwen Code are added when missing.
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
        if provider == SubscriptionProvider::Qwen
            && !with_scheme.trim_end_matches('/').ends_with("/v1")
        {
            format!("{}/v1", with_scheme.trim_end_matches('/'))
        } else {
            with_scheme
        }
    }
}
