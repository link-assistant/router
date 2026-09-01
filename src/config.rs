//! Configuration module for Link.Assistant.Router.
//!
//! Loads configuration from CLI arguments, environment variables, and `.lenv`
//! files via `lino-arguments` (a `clap` drop-in). The struct returned here is
//! the canonical runtime config used by the rest of the crate.

// `Config` and `BuildArgs` carry one bool per documented feature toggle
// (`enable_openai_api`, `enable_anthropic_api`, ...). Collapsing them into
// enums would diverge from the CLI/env variable names that ship as public API.
#![allow(clippy::struct_excessive_bools)]

use std::env;
use std::net::SocketAddr;
use std::path::PathBuf;
use std::str::FromStr;
use std::time::Duration;

use crate::accounts::SelectionStrategy;
use crate::subscription::SubscriptionProvider;

/// Deliberate request-body ceiling for proxied traffic. This is independent
/// of the smaller amount retained in the diagnostic request log.
pub const DEFAULT_MAX_PROXY_REQUEST_BYTES: usize = 64 * 1024 * 1024;

/// Supported upstream inference providers.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum UpstreamProvider {
    /// Automatically route requests across every healthy vendor subscription.
    #[default]
    Auto,
    /// Anthropic via Claude MAX OAuth credentials.
    Anthropic,
    /// Gonka OpenAI-compatible inference provider.
    Gonka,
    /// Crater `ForgeFed` task provider.
    Crater,
    /// `OpenAI` Codex / `ChatGPT` subscription via `~/.codex` OAuth credentials.
    Codex,
    /// Google Gemini Code Assist subscription via `~/.gemini` OAuth credentials.
    Gemini,
    /// Alibaba Qwen subscription via `~/.qwen` OAuth credentials (`DashScope`).
    Qwen,
    /// Generic OpenAI-compatible inference provider, including `LiteLLM` proxy.
    OpenAICompatible,
}

impl UpstreamProvider {
    /// Parse a provider from a free-form string.
    #[must_use]
    pub fn from_str_opt(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "auto" | "all" => Some(Self::Auto),
            "anthropic" | "claude" => Some(Self::Anthropic),
            "gonka" => Some(Self::Gonka),
            "crater" | "forgefed" => Some(Self::Crater),
            "codex" | "chatgpt" | "openai-codex" => Some(Self::Codex),
            "gemini" | "google" | "code-assist" => Some(Self::Gemini),
            "qwen" | "qwen-code" | "dashscope" => Some(Self::Qwen),
            "openai" | "openai-compatible" | "openai_like" | "litellm" => {
                Some(Self::OpenAICompatible)
            }
            _ => None,
        }
    }

    /// The subscription provider backing this upstream, when it is one of the
    /// vendor-subscription providers (Claude/Codex/Gemini/Qwen).
    #[must_use]
    pub const fn subscription_provider(self) -> Option<crate::subscription::SubscriptionProvider> {
        use crate::subscription::SubscriptionProvider as S;
        match self {
            Self::Anthropic => Some(S::Claude),
            Self::Codex => Some(S::Codex),
            Self::Gemini => Some(S::Gemini),
            Self::Qwen => Some(S::Qwen),
            Self::Auto | Self::Gonka | Self::Crater | Self::OpenAICompatible => None,
        }
    }

    /// Canonical lowercase name, used in logs, metrics, and audit records.
    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Auto => "auto",
            Self::Anthropic => "anthropic",
            Self::Gonka => "gonka",
            Self::Crater => "crater",
            Self::Codex => "codex",
            Self::Gemini => "gemini",
            Self::Qwen => "qwen",
            Self::OpenAICompatible => "openai-compatible",
        }
    }
}

/// Supported upstream API formats accepted by the router.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ApiFormat {
    /// Anthropic Messages API (`/v1/messages`).
    Anthropic,
    /// Amazon Bedrock `InvokeModel` API (`/invoke`).
    Bedrock,
    /// Google Vertex AI rawPredict API (`:rawPredict`).
    Vertex,
}

impl ApiFormat {
    /// Parse a format from a free-form string.
    #[must_use]
    pub fn from_str_opt(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "anthropic" | "messages" => Some(Self::Anthropic),
            "bedrock" | "invoke" => Some(Self::Bedrock),
            "vertex" | "rawpredict" => Some(Self::Vertex),
            _ => None,
        }
    }
}

/// Routing mode controlling how upstream requests are handled.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum RoutingMode {
    /// Forward HTTP requests directly to Anthropic / Bedrock / Vertex.
    #[default]
    Direct,
    /// Drive a local Claude Code CLI subprocess for tool-heavy compatibility.
    Cli,
    /// Try `Direct` first and fall back to `Cli` for routes that need it.
    Hybrid,
}

impl RoutingMode {
    /// Parse a mode from a free-form string.
    #[must_use]
    pub fn from_str_opt(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "direct" => Some(Self::Direct),
            "cli" | "subprocess" => Some(Self::Cli),
            "hybrid" | "auto" => Some(Self::Hybrid),
            _ => None,
        }
    }
}

impl FromStr for RoutingMode {
    type Err = ConfigError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Self::from_str_opt(s).ok_or(ConfigError::InvalidRoutingMode)
    }
}

/// Storage policy for token persistence.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum StoragePolicy {
    /// Use only the in-memory store (no persistence; tests / ephemeral runs).
    Memory,
    /// Persist to a Lino-encoded text file.
    Text,
    /// Persist to a binary file (length-prefixed records, link-cli compatible
    /// when the `clink` adapter is enabled).
    Binary,
    /// Dual-write to both text and binary (default per issue #7).
    #[default]
    Both,
}

impl StoragePolicy {
    /// Parse a policy from a free-form string.
    #[must_use]
    pub fn from_str_opt(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "memory" | "mem" | "none" => Some(Self::Memory),
            "text" | "lino" => Some(Self::Text),
            "binary" | "bin" | "link-cli" | "linkcli" | "clink" => Some(Self::Binary),
            "both" | "dual" => Some(Self::Both),
            _ => None,
        }
    }
}

/// Router configuration — assembled from CLI args, env vars, and `.lenv`.
#[derive(Debug, Clone)]
pub struct Config {
    /// Address and port to bind the server to.
    pub listen_addr: SocketAddr,
    /// Secret used for signing and validating custom tokens.
    pub token_secret: String,
    /// Path to the Claude Code home directory containing session credentials.
    pub claude_code_home: String,
    /// Upstream Anthropic API base URL.
    pub upstream_base_url: String,
    /// Whether verbose logging is enabled.
    pub verbose: bool,
    /// Maximum request body accepted by raw proxy surfaces.
    pub max_proxy_request_bytes: usize,
    /// Optional explicit upstream API format restriction.
    pub api_format: Option<ApiFormat>,
    /// Routing mode (direct / cli / hybrid).
    pub routing_mode: RoutingMode,
    /// Token persistence policy.
    pub storage_policy: StoragePolicy,
    /// Directory where token state files live.
    pub data_dir: PathBuf,
    /// Optional path to the local `claude` CLI binary used by the CLI backend.
    pub claude_cli_bin: Option<PathBuf>,
    /// Optional path to the local `codex` CLI binary used by credential
    /// recovery (issue #275).
    pub codex_cli_bin: Option<PathBuf>,
    /// Selected upstream inference provider.
    pub upstream_provider: UpstreamProvider,
    /// Gonka private key used for upstream request signing. Never log this.
    pub gonka_private_key: Option<String>,
    /// Gonka source node URL.
    pub gonka_source_url: String,
    /// Default Gonka model used when requests omit `model`.
    pub gonka_model: String,
    /// Upstream model used when an Anthropic-dialect request is bridged to a
    /// non-Anthropic upstream. `None` selects one from the live catalog.
    pub bridge_model: Option<String>,
    /// How a bridge model is chosen from the live catalog.
    pub bridge_model_policy: crate::bridge_selection::BridgeModelPolicy,
    /// Path of the append-only per-token audit log. `None` disables auditing.
    pub audit_log: Option<String>,
    /// Crater `ForgeFed` task provider configuration.
    pub crater: crate::crater::CraterConfig,
    /// Generic OpenAI-compatible provider config for `LiteLLM` and similar
    /// gateways.
    pub openai_compatible: crate::providers::OpenAICompatibleConfig,
    /// Public base URL used for `ActivityPub` actor and collection IDs.
    pub activitypub_actor_base_url: String,
    /// Public key PEM advertised on the `ActivityPub` actor.
    pub activitypub_public_key_pem: String,
    /// Whether to enable the OpenAI-compatible API surface.
    pub enable_openai_api: bool,
    /// Whether to enable the Anthropic-compatible (direct) proxy surface.
    pub enable_anthropic_api: bool,
    /// Whether to expose `/metrics` and other operational endpoints.
    pub enable_metrics: bool,
    /// Optional comma-separated list of additional credential directories for
    /// the active vendor-subscription provider.
    pub additional_account_dirs: Vec<PathBuf>,
    /// Selection policy applied to new sessions in a multi-account pool.
    pub account_routing_strategy: SelectionStrategy,
    /// Default cooldown after an account returns a typed quota failure.
    pub account_cooldown_secs: u64,
    /// Inactive session-affinity lifetime. Zero disables affinity.
    pub session_affinity_ttl_secs: u64,
    /// Per-account request caps, ordered primary then additional. Zero means
    /// unknown/unlimited.
    pub account_request_limits: Vec<usize>,
    /// Whether to enable experimental compatibility features (spoofing,
    /// XML history reconstruction, etc.). Off by default.
    pub experimental_compatibility: bool,
    /// Optional flat bootstrap admin key accepted by the admin endpoints in
    /// addition to admin-scoped `la_sk_…` tokens.
    pub admin_key: Option<String>,
    /// Explicit opt-out that leaves the admin endpoints open to
    /// unauthenticated callers. Off by default: a deployment with no admin
    /// credential configured mints a bootstrap one at startup instead.
    pub allow_anonymous_admin: bool,
    /// Optional MPP charge settings for OpenAI-compatible endpoints.
    pub mpp: crate::mpp::MppConfig,
    /// Interactive login API settings (`/api/login`).
    pub login: crate::login::LoginConfig,
    /// Opt-in admin UI listener (separate port, disabled by default).
    pub admin_ui: crate::admin::AdminUiConfig,
    /// Opt-in Telegram/VK admin channels (disabled unless a bot token is set).
    pub chat_admin: crate::chat_admin::ChatAdminConfig,
}

impl Config {
    /// The vendor subscription this deployment serves and the credential home
    /// its primary account reads from.
    ///
    /// Both the server and the CLI subcommands need the same answer, and it is
    /// derived purely from configuration.
    #[must_use]
    pub fn subscription_pool(&self) -> (SubscriptionProvider, PathBuf) {
        let provider = self
            .upstream_provider
            .subscription_provider()
            .unwrap_or(SubscriptionProvider::Claude);
        let primary = if provider == SubscriptionProvider::Claude {
            PathBuf::from(&self.claude_code_home)
        } else {
            let user_home = env::var("HOME").unwrap_or_else(|_| ".".to_string());
            provider.resolve_home(&user_home)
        };
        (provider, primary)
    }

    /// Load configuration from environment variables only (legacy compatibility).
    ///
    /// The binary's CLI entrypoint layers command-line flags and `.lenv`
    /// overrides onto this environment configuration.
    pub fn from_env() -> Result<Self, ConfigError> {
        let port = env::var("ROUTER_PORT").unwrap_or_else(|_| "8080".to_string());
        let host = env::var("ROUTER_HOST").unwrap_or_else(|_| "0.0.0.0".to_string());
        let token_secret = env::var("TOKEN_SECRET").ok();
        let claude_code_home = env::var("CLAUDE_CODE_HOME").unwrap_or_else(|_| {
            let home = env::var("HOME").unwrap_or_else(|_| "/root".to_string());
            format!("{home}/.claude")
        });
        let codex_home = SubscriptionProvider::Codex
            .resolve_home(&env::var("HOME").unwrap_or_else(|_| "/root".to_string()));
        let upstream_base_url = env::var("UPSTREAM_BASE_URL")
            .unwrap_or_else(|_| "https://api.anthropic.com".to_string());
        let verbose = env::var("VERBOSE").is_ok_and(|v| v == "1" || v.eq_ignore_ascii_case("true"));
        let max_proxy_request_bytes = env::var("MAX_PROXY_REQUEST_BYTES")
            .ok()
            .and_then(|value| value.parse().ok())
            .unwrap_or(DEFAULT_MAX_PROXY_REQUEST_BYTES);
        let api_format = env::var("UPSTREAM_API_FORMAT")
            .ok()
            .and_then(|s| ApiFormat::from_str_opt(&s));
        let routing_mode = env::var("ROUTING_MODE")
            .ok()
            .and_then(|s| RoutingMode::from_str_opt(&s))
            .unwrap_or_default();
        let storage_policy = env::var("STORAGE_POLICY")
            .ok()
            .and_then(|s| StoragePolicy::from_str_opt(&s))
            .unwrap_or_default();
        let data_dir = env::var("DATA_DIR").map_or_else(|_| default_data_dir(), PathBuf::from);
        let claude_cli_bin = env::var("CLAUDE_CLI_BIN").ok().map(PathBuf::from);
        let codex_cli_bin = env::var("CODEX_CLI_BIN").ok().map(PathBuf::from);
        let upstream_provider = env::var("UPSTREAM_PROVIDER")
            .ok()
            .and_then(|s| UpstreamProvider::from_str_opt(&s))
            .unwrap_or_default();
        let gonka_private_key = env::var("GONKA_PRIVATE_KEY").ok().filter(|s| !s.is_empty());
        let gonka_source_url =
            env::var("GONKA_SOURCE_URL").unwrap_or_else(|_| default_gonka_source_url());
        let gonka_model = env::var("GONKA_MODEL").unwrap_or_else(|_| default_gonka_model());
        let bridge_model = env::var("ANTHROPIC_BRIDGE_MODEL")
            .ok()
            .filter(|s| !s.is_empty());
        let bridge_model_policy = env::var("BRIDGE_MODEL_POLICY")
            .ok()
            .filter(|s| !s.is_empty());
        let audit_log = env::var("AUDIT_LOG").ok().filter(|s| !s.is_empty());
        let activitypub_actor_base_url = env::var("ACTIVITYPUB_ACTOR_BASE_URL")
            .unwrap_or_else(|_| format!("http://{host}:{port}"));
        let crater_actor = env::var("CRATER_FORGEFED_ACTOR")
            .ok()
            .filter(|s| !s.is_empty())
            .unwrap_or_else(|| {
                format!(
                    "{}/actor/code",
                    activitypub_actor_base_url.trim_end_matches('/')
                )
            });
        let crater = crate::crater::CraterConfig::new(
            env::var("CRATER_FORGEFED_INBOX")
                .ok()
                .filter(|s| !s.is_empty()),
            &crater_actor,
            env::var("CRATER_FORGEFED_TARGET")
                .ok()
                .filter(|s| !s.is_empty()),
            Duration::from_millis(parse_u64_env("CRATER_POLL_INTERVAL_MS", 1000)),
            Duration::from_secs(parse_u64_env("CRATER_POLL_TIMEOUT_SECS", 120)),
        );
        let openai_compatible = crate::providers::OpenAICompatibleConfig {
            provider_name: env::var("OPENAI_COMPATIBLE_PROVIDER_NAME")
                .unwrap_or_else(|_| "litellm".to_string()),
            base_url: env::var("OPENAI_COMPATIBLE_BASE_URL")
                .unwrap_or_else(|_| default_openai_compatible_base_url()),
            api_key: env::var("OPENAI_COMPATIBLE_API_KEY")
                .ok()
                .filter(|s| !s.is_empty()),
            api_key_env: env::var("OPENAI_COMPATIBLE_API_KEY_ENV")
                .ok()
                .filter(|s| !s.is_empty()),
            default_model: env::var("OPENAI_COMPATIBLE_MODEL")
                .ok()
                .filter(|s| !s.is_empty()),
            models: env::var("OPENAI_COMPATIBLE_MODELS")
                .ok()
                .map(|raw| parse_csv(&raw))
                .unwrap_or_default(),
        };
        let activitypub_public_key_pem = env::var("ACTIVITYPUB_PUBLIC_KEY_PEM")
            .unwrap_or_else(|_| default_activitypub_public_key_pem());
        let enable_openai_api = env::var("ENABLE_OPENAI_API").map_or(true, |v| {
            !matches!(v.as_str(), "0" | "false" | "FALSE" | "off")
        });
        let enable_anthropic_api = env::var("ENABLE_ANTHROPIC_API").map_or(true, |v| {
            !matches!(v.as_str(), "0" | "false" | "FALSE" | "off")
        });
        let enable_metrics = env::var("ENABLE_METRICS").map_or(true, |v| {
            !matches!(v.as_str(), "0" | "false" | "FALSE" | "off")
        });
        let additional_account_dirs = env::var("ADDITIONAL_ACCOUNT_DIRS")
            .ok()
            .map(|raw| {
                raw.split(',')
                    .map(str::trim)
                    .filter(|s| !s.is_empty())
                    .map(PathBuf::from)
                    .collect()
            })
            .unwrap_or_default();
        let account_routing_strategy = match env::var("ACCOUNT_ROUTING_STRATEGY") {
            Ok(value) => SelectionStrategy::from_str_opt(&value)
                .ok_or(ConfigError::InvalidAccountRoutingStrategy)?,
            Err(_) => SelectionStrategy::default(),
        };
        let account_cooldown_secs = parse_u64_env("ACCOUNT_COOLDOWN_SECS", 60);
        let session_affinity_ttl_secs = parse_u64_env("SESSION_AFFINITY_TTL_SECS", 3600);
        let account_request_limits = env::var("ACCOUNT_REQUEST_LIMITS")
            .ok()
            .map(|raw| parse_usize_csv(&raw))
            .transpose()?
            .unwrap_or_default();
        let experimental_compatibility = env::var("EXPERIMENTAL_COMPATIBILITY")
            .is_ok_and(|v| v == "1" || v.eq_ignore_ascii_case("true"));
        let admin_key = env::var("TOKEN_ADMIN_KEY").ok().filter(|s| !s.is_empty());
        let allow_anonymous_admin = env::var("ALLOW_ANONYMOUS_ADMIN")
            .is_ok_and(|v| v == "1" || v.eq_ignore_ascii_case("true"));
        let login = crate::login::LoginConfig {
            enabled: env::var("ENABLE_LOGIN_API").map_or(true, |v| {
                !matches!(v.as_str(), "0" | "false" | "FALSE" | "off")
            }),
            command: env::var("LOGIN_CLI_COMMAND").unwrap_or_else(|_| "claude".to_string()),
            args: env::var("LOGIN_CLI_ARGS")
                .ok()
                .filter(|raw| !raw.trim().is_empty())
                .map_or_else(Vec::new, |raw| parse_csv(&raw)),
            session_ttl: Duration::from_secs(parse_u64_env("LOGIN_SESSION_TTL_SECS", 900)),
            max_sessions: usize::try_from(parse_u64_env("LOGIN_MAX_SESSIONS", 4)).unwrap_or(4),
            codex_home,
            ..crate::login::LoginConfig::default()
        };
        let mpp = crate::mpp::MppConfig {
            enabled: env::var("MPP_ENABLE")
                .is_ok_and(|v| matches!(v.as_str(), "1" | "true" | "TRUE" | "on" | "ON")),
            amount: env::var("MPP_AMOUNT").unwrap_or_else(|_| "0.00".to_string()),
            currency: env::var("MPP_CURRENCY").unwrap_or_else(|_| "USD".to_string()),
            recipient: env::var("MPP_RECIPIENT").unwrap_or_default(),
            method: env::var("MPP_METHOD").ok().filter(|s| !s.is_empty()),
        };

        let admin_ui = admin_ui_from_env()?;
        let chat_admin = chat_admin_from_env()?;

        Self::build(BuildArgs {
            host: &host,
            port: &port,
            token_secret: token_secret.as_deref(),
            claude_code_home: &claude_code_home,
            upstream_base_url: &upstream_base_url,
            verbose,
            max_proxy_request_bytes,
            api_format,
            routing_mode,
            storage_policy,
            data_dir,
            claude_cli_bin,
            codex_cli_bin,
            upstream_provider,
            gonka_private_key,
            gonka_source_url,
            gonka_model,
            bridge_model,
            bridge_model_policy,
            audit_log,
            crater,
            openai_compatible,
            activitypub_actor_base_url,
            activitypub_public_key_pem,
            enable_openai_api,
            enable_anthropic_api,
            enable_metrics,
            additional_account_dirs,
            account_routing_strategy,
            account_cooldown_secs,
            session_affinity_ttl_secs,
            account_request_limits,
            experimental_compatibility,
            admin_key,
            allow_anonymous_admin,
            mpp,
            login,
            admin_ui,
            chat_admin,
        })
    }

    /// Build a `Config` from explicit values.
    pub fn build(args: BuildArgs<'_>) -> Result<Self, ConfigError> {
        let port: u16 = args.port.parse().map_err(|_| ConfigError::InvalidPort)?;

        let listen_addr: SocketAddr = format!("{}:{}", args.host, port)
            .parse()
            .map_err(|_| ConfigError::InvalidAddress)?;

        let token_secret = args
            .token_secret
            .filter(|s| !s.is_empty())
            .ok_or(ConfigError::MissingTokenSecret)?
            .to_string();

        if args.upstream_provider == UpstreamProvider::Gonka
            && !matches!(args.gonka_private_key.as_deref(), Some(s) if !s.is_empty())
        {
            return Err(ConfigError::MissingGonkaPrivateKey);
        }
        if args.upstream_provider == UpstreamProvider::Crater && args.crater.inbox.is_none() {
            return Err(ConfigError::MissingCraterForgeFedInbox);
        }
        if !args.account_request_limits.is_empty()
            && args.account_request_limits.len() != args.additional_account_dirs.len() + 1
        {
            return Err(ConfigError::MismatchedAccountRequestLimits);
        }

        Ok(Self {
            listen_addr,
            token_secret,
            claude_code_home: args.claude_code_home.to_string(),
            upstream_base_url: args.upstream_base_url.to_string(),
            verbose: args.verbose,
            max_proxy_request_bytes: args.max_proxy_request_bytes,
            api_format: args.api_format,
            routing_mode: args.routing_mode,
            storage_policy: args.storage_policy,
            data_dir: args.data_dir,
            claude_cli_bin: args.claude_cli_bin,
            codex_cli_bin: args.codex_cli_bin,
            upstream_provider: args.upstream_provider,
            gonka_private_key: args.gonka_private_key.filter(|s| !s.is_empty()),
            gonka_source_url: args.gonka_source_url.trim_end_matches('/').to_string(),
            gonka_model: args.gonka_model,
            bridge_model: args.bridge_model.filter(|s| !s.is_empty()),
            bridge_model_policy: args
                .bridge_model_policy
                .as_deref()
                .filter(|value| !value.is_empty())
                .map_or_else(
                    || Ok(crate::bridge_selection::BridgeModelPolicy::default()),
                    crate::bridge_selection::BridgeModelPolicy::parse,
                )
                .map_err(ConfigError::InvalidBridgeModelPolicy)?,
            audit_log: args.audit_log.filter(|s| !s.is_empty()),
            crater: args.crater,
            openai_compatible: args.openai_compatible,
            activitypub_actor_base_url: args
                .activitypub_actor_base_url
                .trim_end_matches('/')
                .to_string(),
            activitypub_public_key_pem: args.activitypub_public_key_pem,
            enable_openai_api: args.enable_openai_api,
            enable_anthropic_api: args.enable_anthropic_api,
            enable_metrics: args.enable_metrics,
            additional_account_dirs: args.additional_account_dirs,
            account_routing_strategy: args.account_routing_strategy,
            account_cooldown_secs: args.account_cooldown_secs,
            session_affinity_ttl_secs: args.session_affinity_ttl_secs,
            account_request_limits: args.account_request_limits,
            experimental_compatibility: args.experimental_compatibility,
            admin_key: args.admin_key,
            allow_anonymous_admin: args.allow_anonymous_admin,
            mpp: args.mpp,
            login: crate::login::LoginConfig {
                claude_code_home: PathBuf::from(args.claude_code_home),
                ..args.login
            },
            admin_ui: args.admin_ui,
            chat_admin: args.chat_admin,
        })
    }
}

/// Helper struct to keep [`Config::build`] argument-list manageable.
pub struct BuildArgs<'a> {
    pub host: &'a str,
    pub port: &'a str,
    pub token_secret: Option<&'a str>,
    pub claude_code_home: &'a str,
    pub upstream_base_url: &'a str,
    pub verbose: bool,
    pub max_proxy_request_bytes: usize,
    pub api_format: Option<ApiFormat>,
    pub routing_mode: RoutingMode,
    pub storage_policy: StoragePolicy,
    pub data_dir: PathBuf,
    pub claude_cli_bin: Option<PathBuf>,
    pub codex_cli_bin: Option<PathBuf>,
    pub upstream_provider: UpstreamProvider,
    pub gonka_private_key: Option<String>,
    pub gonka_source_url: String,
    pub gonka_model: String,
    pub bridge_model: Option<String>,
    /// How to pick a bridge model from the live catalog; `None` uses the default.
    pub bridge_model_policy: Option<String>,
    pub audit_log: Option<String>,
    pub crater: crate::crater::CraterConfig,
    pub openai_compatible: crate::providers::OpenAICompatibleConfig,
    pub activitypub_actor_base_url: String,
    pub activitypub_public_key_pem: String,
    pub enable_openai_api: bool,
    pub enable_anthropic_api: bool,
    pub enable_metrics: bool,
    pub additional_account_dirs: Vec<PathBuf>,
    pub account_routing_strategy: SelectionStrategy,
    pub account_cooldown_secs: u64,
    pub session_affinity_ttl_secs: u64,
    pub account_request_limits: Vec<usize>,
    pub experimental_compatibility: bool,
    pub admin_key: Option<String>,
    pub allow_anonymous_admin: bool,
    pub mpp: crate::mpp::MppConfig,
    /// Interactive login settings. `claude_code_home` is overwritten by
    /// [`Config::build`] so the login flow always writes where the router reads.
    pub login: crate::login::LoginConfig,
    /// Opt-in admin UI listener (separate port, disabled by default).
    pub admin_ui: crate::admin::AdminUiConfig,
    /// Opt-in Telegram/VK admin channels (disabled unless a bot token is set).
    pub chat_admin: crate::chat_admin::ChatAdminConfig,
}

pub use crate::admin_config::{admin_ui_config, admin_ui_from_env};
pub use crate::chat_config::{chat_admin_config, chat_admin_from_env};

/// Default disabled MPP configuration.
#[must_use]
pub fn default_mpp_config() -> crate::mpp::MppConfig {
    crate::mpp::MppConfig {
        enabled: false,
        amount: "0.00".to_string(),
        currency: "USD".to_string(),
        recipient: String::new(),
        method: None,
    }
}

/// Compute the default data directory: `$DATA_DIR` or `<claude_home>/router-data`.
#[must_use]
pub fn default_data_dir() -> PathBuf {
    if let Ok(d) = env::var("DATA_DIR") {
        return PathBuf::from(d);
    }
    let home = env::var("HOME").unwrap_or_else(|_| "/var/lib/link-assistant-router".to_string());
    PathBuf::from(home).join(".link-assistant-router")
}

/// Development public key advertised by the `ActivityPub` actor when no key is
/// configured. Production deployments should provide their real public key.
#[must_use]
pub fn default_activitypub_public_key_pem() -> String {
    "-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEA0000000000000000000000000000000000000000000=\n-----END PUBLIC KEY-----".to_string()
}

pub use crate::config_defaults::{
    default_crater_config, default_gonka_model, default_gonka_source_url,
    default_openai_compatible_base_url, default_openai_compatible_config,
};

fn parse_csv(raw: &str) -> Vec<String> {
    raw.split(',')
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(ToString::to_string)
        .collect()
}

pub(crate) fn parse_u64_env(name: &str, default: u64) -> u64 {
    env::var(name)
        .ok()
        .and_then(|value| value.parse().ok())
        .unwrap_or(default)
}

fn parse_usize_csv(raw: &str) -> Result<Vec<usize>, ConfigError> {
    raw.split(',')
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(|value| {
            value
                .parse::<usize>()
                .map_err(|_| ConfigError::InvalidAccountRequestLimits)
        })
        .collect()
}

/// Errors that can occur during configuration loading.
#[derive(Debug)]
pub enum ConfigError {
    /// `ROUTER_PORT` is not a valid port number.
    InvalidPort,
    /// The listen address could not be parsed.
    InvalidAddress,
    /// `TOKEN_SECRET` environment variable is missing or empty.
    MissingTokenSecret,
    /// Routing mode was not recognised.
    InvalidRoutingMode,
    /// Upstream API format was not recognised.
    InvalidApiFormat,
    /// Storage policy was not recognised.
    InvalidStoragePolicy,
    /// Upstream provider was not recognised.
    InvalidUpstreamProvider,
    /// The bridge model selection policy was not recognised.
    InvalidBridgeModelPolicy(String),
    /// The multi-account strategy was not recognised.
    InvalidAccountRoutingStrategy,
    /// An account request cap was not a non-negative integer.
    InvalidAccountRequestLimits,
    /// Request caps did not align with primary plus additional accounts.
    MismatchedAccountRequestLimits,
    /// Gonka was selected without `GONKA_PRIVATE_KEY`.
    MissingGonkaPrivateKey,
    /// Crater was selected without `CRATER_FORGEFED_INBOX`.
    MissingCraterForgeFedInbox,
}

impl std::fmt::Display for ConfigError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::InvalidPort => write!(f, "ROUTER_PORT must be a valid port number (0-65535)"),
            Self::InvalidAddress => write!(f, "Could not parse listen address"),
            Self::MissingTokenSecret => {
                write!(f, "TOKEN_SECRET environment variable is required")
            }
            Self::InvalidRoutingMode => {
                write!(f, "ROUTING_MODE must be one of: direct, cli, hybrid")
            }
            Self::InvalidApiFormat => write!(
                f,
                "UPSTREAM_API_FORMAT must be one of: anthropic, bedrock, vertex"
            ),
            Self::InvalidStoragePolicy => write!(
                f,
                "STORAGE_POLICY must be one of: memory, text, binary, both"
            ),
            Self::InvalidUpstreamProvider => write!(
                f,
                "UPSTREAM_PROVIDER must be one of: auto, anthropic, codex, gemini, qwen, gonka, crater, openai-compatible"
            ),
            Self::InvalidBridgeModelPolicy(message) => write!(f, "{message}"),
            Self::InvalidAccountRoutingStrategy => write!(
                f,
                "ACCOUNT_ROUTING_STRATEGY must be one of: round-robin, fill-first, least-used"
            ),
            Self::InvalidAccountRequestLimits => write!(
                f,
                "ACCOUNT_REQUEST_LIMITS must be comma-separated non-negative integers"
            ),
            Self::MismatchedAccountRequestLimits => write!(
                f,
                "ACCOUNT_REQUEST_LIMITS must contain one entry for primary and each additional account"
            ),
            Self::MissingGonkaPrivateKey => write!(
                f,
                "Gonka provider requires GONKA_PRIVATE_KEY. Make sure your Gonka account is activated for inference, funded, and has a published on-chain public key."
            ),
            Self::MissingCraterForgeFedInbox => {
                write!(f, "Crater provider requires CRATER_FORGEFED_INBOX")
            }
        }
    }
}

impl std::error::Error for ConfigError {}

#[cfg(test)]
#[path = "config_tests.rs"]
mod tests;
