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

/// Supported upstream inference providers.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum UpstreamProvider {
    /// Anthropic via Claude MAX OAuth credentials.
    #[default]
    Anthropic,
    /// Gonka OpenAI-compatible inference provider.
    Gonka,
    /// Crater `ForgeFed` task provider.
    Crater,
    /// Generic OpenAI-compatible inference provider, including `LiteLLM` proxy.
    OpenAICompatible,
}

impl UpstreamProvider {
    /// Parse a provider from a free-form string.
    #[must_use]
    pub fn from_str_opt(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "anthropic" | "claude" => Some(Self::Anthropic),
            "gonka" => Some(Self::Gonka),
            "crater" | "forgefed" => Some(Self::Crater),
            "openai" | "openai-compatible" | "openai_like" | "litellm" => {
                Some(Self::OpenAICompatible)
            }
            _ => None,
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
    /// Selected upstream inference provider.
    pub upstream_provider: UpstreamProvider,
    /// Gonka private key used for upstream request signing. Never log this.
    pub gonka_private_key: Option<String>,
    /// Gonka source node URL.
    pub gonka_source_url: String,
    /// Default Gonka model used when requests omit `model`.
    pub gonka_model: String,
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
    /// Optional comma-separated list of additional Claude account credential
    /// directories — used by the multi-account router.
    pub additional_account_dirs: Vec<PathBuf>,
    /// Whether to enable experimental compatibility features (spoofing,
    /// XML history reconstruction, etc.). Off by default.
    pub experimental_compatibility: bool,
    /// Whether to require a Bearer token on the `/api/tokens` issue endpoint.
    /// When a `TOKEN_ADMIN_KEY` is set the issue endpoint demands it; otherwise
    /// issuance is open (matching the legacy behaviour).
    pub admin_key: Option<String>,
    /// Optional MPP charge settings for OpenAI-compatible endpoints.
    pub mpp: crate::mpp::MppConfig,
}

impl Config {
    /// Load configuration from environment variables only (legacy compatibility).
    ///
    /// New entrypoints should prefer [`Config::from_cli`] which also supports
    /// CLI flags and `.lenv` overrides.
    pub fn from_env() -> Result<Self, ConfigError> {
        let port = env::var("ROUTER_PORT").unwrap_or_else(|_| "8080".to_string());
        let host = env::var("ROUTER_HOST").unwrap_or_else(|_| "0.0.0.0".to_string());
        let token_secret = env::var("TOKEN_SECRET").ok();
        let claude_code_home = env::var("CLAUDE_CODE_HOME").unwrap_or_else(|_| {
            let home = env::var("HOME").unwrap_or_else(|_| "/root".to_string());
            format!("{home}/.claude")
        });
        let upstream_base_url = env::var("UPSTREAM_BASE_URL")
            .unwrap_or_else(|_| "https://api.anthropic.com".to_string());
        let verbose = env::var("VERBOSE").is_ok_and(|v| v == "1" || v.eq_ignore_ascii_case("true"));
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
        let upstream_provider = env::var("UPSTREAM_PROVIDER")
            .ok()
            .and_then(|s| UpstreamProvider::from_str_opt(&s))
            .unwrap_or_default();
        let gonka_private_key = env::var("GONKA_PRIVATE_KEY").ok().filter(|s| !s.is_empty());
        let gonka_source_url =
            env::var("GONKA_SOURCE_URL").unwrap_or_else(|_| default_gonka_source_url());
        let gonka_model = env::var("GONKA_MODEL").unwrap_or_else(|_| default_gonka_model());
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
        let experimental_compatibility = env::var("EXPERIMENTAL_COMPATIBILITY")
            .is_ok_and(|v| v == "1" || v.eq_ignore_ascii_case("true"));
        let admin_key = env::var("TOKEN_ADMIN_KEY").ok().filter(|s| !s.is_empty());
        let mpp = crate::mpp::MppConfig {
            enabled: env::var("MPP_ENABLE")
                .is_ok_and(|v| matches!(v.as_str(), "1" | "true" | "TRUE" | "on" | "ON")),
            amount: env::var("MPP_AMOUNT").unwrap_or_else(|_| "0.00".to_string()),
            currency: env::var("MPP_CURRENCY").unwrap_or_else(|_| "USD".to_string()),
            recipient: env::var("MPP_RECIPIENT").unwrap_or_default(),
            method: env::var("MPP_METHOD").ok().filter(|s| !s.is_empty()),
        };

        Self::build(BuildArgs {
            host: &host,
            port: &port,
            token_secret: token_secret.as_deref(),
            claude_code_home: &claude_code_home,
            upstream_base_url: &upstream_base_url,
            verbose,
            api_format,
            routing_mode,
            storage_policy,
            data_dir,
            claude_cli_bin,
            upstream_provider,
            gonka_private_key,
            gonka_source_url,
            gonka_model,
            crater,
            openai_compatible,
            activitypub_actor_base_url,
            activitypub_public_key_pem,
            enable_openai_api,
            enable_anthropic_api,
            enable_metrics,
            additional_account_dirs,
            experimental_compatibility,
            admin_key,
            mpp,
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

        Ok(Self {
            listen_addr,
            token_secret,
            claude_code_home: args.claude_code_home.to_string(),
            upstream_base_url: args.upstream_base_url.to_string(),
            verbose: args.verbose,
            api_format: args.api_format,
            routing_mode: args.routing_mode,
            storage_policy: args.storage_policy,
            data_dir: args.data_dir,
            claude_cli_bin: args.claude_cli_bin,
            upstream_provider: args.upstream_provider,
            gonka_private_key: args.gonka_private_key.filter(|s| !s.is_empty()),
            gonka_source_url: args.gonka_source_url.trim_end_matches('/').to_string(),
            gonka_model: args.gonka_model,
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
            experimental_compatibility: args.experimental_compatibility,
            admin_key: args.admin_key,
            mpp: args.mpp,
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
    pub api_format: Option<ApiFormat>,
    pub routing_mode: RoutingMode,
    pub storage_policy: StoragePolicy,
    pub data_dir: PathBuf,
    pub claude_cli_bin: Option<PathBuf>,
    pub upstream_provider: UpstreamProvider,
    pub gonka_private_key: Option<String>,
    pub gonka_source_url: String,
    pub gonka_model: String,
    pub crater: crate::crater::CraterConfig,
    pub openai_compatible: crate::providers::OpenAICompatibleConfig,
    pub activitypub_actor_base_url: String,
    pub activitypub_public_key_pem: String,
    pub enable_openai_api: bool,
    pub enable_anthropic_api: bool,
    pub enable_metrics: bool,
    pub additional_account_dirs: Vec<PathBuf>,
    pub experimental_compatibility: bool,
    pub admin_key: Option<String>,
    pub mpp: crate::mpp::MppConfig,
}

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

/// Default Gonka source URL.
#[must_use]
pub fn default_gonka_source_url() -> String {
    "https://node4.gonka.ai".to_string()
}

/// Default Gonka model ID.
#[must_use]
pub fn default_gonka_model() -> String {
    "Qwen/Qwen3-235B-A22B-Instruct-2507-FP8".to_string()
}

/// Default OpenAI-compatible provider base URL.
#[must_use]
pub fn default_openai_compatible_base_url() -> String {
    "http://localhost:4000/v1".to_string()
}

/// Default OpenAI-compatible provider boot config.
#[must_use]
pub fn default_openai_compatible_config() -> crate::providers::OpenAICompatibleConfig {
    crate::providers::OpenAICompatibleConfig {
        provider_name: "litellm".to_string(),
        base_url: default_openai_compatible_base_url(),
        api_key: None,
        api_key_env: None,
        default_model: None,
        models: Vec::new(),
    }
}

/// Default crater provider config.
#[must_use]
pub fn default_crater_config(actor_base_url: &str) -> crate::crater::CraterConfig {
    let actor = format!("{}/actor/code", actor_base_url.trim_end_matches('/'));
    crate::crater::CraterConfig::new(
        None,
        &actor,
        None,
        Duration::from_secs(1),
        Duration::from_secs(120),
    )
}

fn parse_csv(raw: &str) -> Vec<String> {
    raw.split(',')
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(ToString::to_string)
        .collect()
}

fn parse_u64_env(name: &str, default: u64) -> u64 {
    env::var(name)
        .ok()
        .and_then(|value| value.parse().ok())
        .unwrap_or(default)
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
mod tests {
    use super::*;

    fn build_default(secret: Option<&str>) -> Result<Config, ConfigError> {
        Config::build(BuildArgs {
            host: "0.0.0.0",
            port: "8080",
            token_secret: secret,
            claude_code_home: "/tmp/claude",
            upstream_base_url: "https://api.anthropic.com",
            verbose: false,
            api_format: None,
            routing_mode: RoutingMode::Direct,
            storage_policy: StoragePolicy::Memory,
            data_dir: PathBuf::from("/tmp/test-data"),
            claude_cli_bin: None,
            upstream_provider: UpstreamProvider::Anthropic,
            gonka_private_key: None,
            gonka_source_url: default_gonka_source_url(),
            gonka_model: default_gonka_model(),
            crater: default_crater_config("https://router.example"),
            openai_compatible: default_openai_compatible_config(),
            activitypub_actor_base_url: "https://router.example".into(),
            activitypub_public_key_pem: default_activitypub_public_key_pem(),
            enable_openai_api: true,
            enable_anthropic_api: true,
            enable_metrics: true,
            additional_account_dirs: vec![],
            experimental_compatibility: false,
            admin_key: None,
            mpp: default_mpp_config(),
        })
    }

    #[test]
    fn test_config_missing_token_secret() {
        let result = build_default(None);
        assert!(result.is_err());
    }

    #[test]
    fn test_config_empty_token_secret() {
        let result = build_default(Some(""));
        assert!(result.is_err());
    }

    #[test]
    fn test_config_with_valid_values() {
        let config = build_default(Some("test-secret-key")).expect("Config should build");
        assert_eq!(config.listen_addr.port(), 8080);
        assert_eq!(config.token_secret, "test-secret-key");
        assert_eq!(config.claude_code_home, "/tmp/claude");
        assert_eq!(config.upstream_base_url, "https://api.anthropic.com");
        assert_eq!(config.upstream_provider, UpstreamProvider::Anthropic);
        assert!(!config.verbose);
        assert_eq!(config.routing_mode, RoutingMode::Direct);
    }

    #[test]
    fn default_provider_is_anthropic() {
        let config = build_default(Some("secret")).expect("should build");
        assert_eq!(config.upstream_provider, UpstreamProvider::Anthropic);
    }

    #[test]
    fn gonka_provider_requires_private_key() {
        let result = Config::build(gonka_args(None));
        assert!(matches!(result, Err(ConfigError::MissingGonkaPrivateKey)));
    }

    #[test]
    fn gonka_provider_builds_with_private_key_and_defaults() {
        let config = Config::build(gonka_args(Some("gonka-private-key")))
            .expect("gonka config should build");
        assert_eq!(config.upstream_provider, UpstreamProvider::Gonka);
        assert_eq!(config.gonka_source_url, default_gonka_source_url());
        assert_eq!(config.gonka_model, default_gonka_model());
        assert_eq!(
            config.gonka_private_key.as_deref(),
            Some("gonka-private-key")
        );
    }

    #[test]
    fn crater_provider_requires_forgefed_inbox() {
        let mut args = gonka_args(None);
        args.upstream_provider = UpstreamProvider::Crater;
        args.gonka_private_key = None;

        let result = Config::build(args);

        assert!(matches!(
            result,
            Err(ConfigError::MissingCraterForgeFedInbox)
        ));
    }

    #[test]
    fn crater_provider_builds_with_forgefed_inbox() {
        let mut args = gonka_args(None);
        args.upstream_provider = UpstreamProvider::Crater;
        args.gonka_private_key = None;
        args.crater.inbox = Some("https://tracker.example/inbox".into());

        let config = Config::build(args).expect("crater config should build");

        assert_eq!(config.upstream_provider, UpstreamProvider::Crater);
        assert_eq!(
            config.crater.inbox.as_deref(),
            Some("https://tracker.example/inbox")
        );
    }

    fn gonka_args(private_key: Option<&str>) -> BuildArgs<'static> {
        BuildArgs {
            host: "0.0.0.0",
            port: "8080",
            token_secret: Some("secret"),
            claude_code_home: "/tmp/claude",
            upstream_base_url: "https://api.anthropic.com",
            verbose: false,
            api_format: None,
            routing_mode: RoutingMode::Direct,
            storage_policy: StoragePolicy::Memory,
            data_dir: PathBuf::from("/tmp/test-data"),
            claude_cli_bin: None,
            upstream_provider: UpstreamProvider::Gonka,
            gonka_private_key: private_key.map(str::to_string),
            gonka_source_url: default_gonka_source_url(),
            gonka_model: default_gonka_model(),
            crater: default_crater_config("https://router.example"),
            openai_compatible: default_openai_compatible_config(),
            activitypub_actor_base_url: "https://router.example".into(),
            activitypub_public_key_pem: default_activitypub_public_key_pem(),
            enable_openai_api: true,
            enable_anthropic_api: true,
            enable_metrics: true,
            additional_account_dirs: vec![],
            experimental_compatibility: false,
            admin_key: None,
            mpp: default_mpp_config(),
        }
    }

    #[test]
    fn test_config_invalid_port() {
        let result = Config::build(BuildArgs {
            host: "0.0.0.0",
            port: "not-a-number",
            token_secret: Some("secret"),
            claude_code_home: "/tmp/claude",
            upstream_base_url: "https://api.anthropic.com",
            verbose: false,
            api_format: None,
            routing_mode: RoutingMode::Direct,
            storage_policy: StoragePolicy::Memory,
            data_dir: PathBuf::from("/tmp/test-data"),
            claude_cli_bin: None,
            upstream_provider: UpstreamProvider::Anthropic,
            gonka_private_key: None,
            gonka_source_url: default_gonka_source_url(),
            gonka_model: default_gonka_model(),
            crater: default_crater_config("https://router.example"),
            openai_compatible: default_openai_compatible_config(),
            activitypub_actor_base_url: "https://router.example".into(),
            activitypub_public_key_pem: default_activitypub_public_key_pem(),
            enable_openai_api: true,
            enable_anthropic_api: true,
            enable_metrics: true,
            additional_account_dirs: vec![],
            experimental_compatibility: false,
            admin_key: None,
            mpp: default_mpp_config(),
        });
        assert!(result.is_err());
    }

    #[test]
    fn test_config_default_port() {
        let config = build_default(Some("secret")).expect("should build");
        assert_eq!(config.listen_addr.port(), 8080);
    }

    #[test]
    fn test_api_format_parsing() {
        assert_eq!(
            ApiFormat::from_str_opt("anthropic"),
            Some(ApiFormat::Anthropic)
        );
        assert_eq!(
            ApiFormat::from_str_opt("messages"),
            Some(ApiFormat::Anthropic)
        );
        assert_eq!(ApiFormat::from_str_opt("bedrock"), Some(ApiFormat::Bedrock));
        assert_eq!(ApiFormat::from_str_opt("invoke"), Some(ApiFormat::Bedrock));
        assert_eq!(ApiFormat::from_str_opt("vertex"), Some(ApiFormat::Vertex));
        assert_eq!(
            ApiFormat::from_str_opt("rawpredict"),
            Some(ApiFormat::Vertex)
        );
        assert_eq!(
            ApiFormat::from_str_opt("ANTHROPIC"),
            Some(ApiFormat::Anthropic)
        );
        assert!(ApiFormat::from_str_opt("unknown").is_none());
    }

    #[test]
    fn test_routing_mode_parsing() {
        assert_eq!(
            RoutingMode::from_str_opt("direct"),
            Some(RoutingMode::Direct)
        );
        assert_eq!(RoutingMode::from_str_opt("cli"), Some(RoutingMode::Cli));
        assert_eq!(
            RoutingMode::from_str_opt("hybrid"),
            Some(RoutingMode::Hybrid)
        );
        assert_eq!(RoutingMode::from_str_opt("auto"), Some(RoutingMode::Hybrid));
        assert_eq!(
            RoutingMode::from_str_opt("subprocess"),
            Some(RoutingMode::Cli)
        );
        assert!(RoutingMode::from_str_opt("nope").is_none());
    }

    #[test]
    fn test_storage_policy_parsing() {
        assert_eq!(
            StoragePolicy::from_str_opt("memory"),
            Some(StoragePolicy::Memory)
        );
        assert_eq!(
            StoragePolicy::from_str_opt("text"),
            Some(StoragePolicy::Text)
        );
        assert_eq!(
            StoragePolicy::from_str_opt("binary"),
            Some(StoragePolicy::Binary)
        );
        assert_eq!(
            StoragePolicy::from_str_opt("both"),
            Some(StoragePolicy::Both)
        );
        assert!(StoragePolicy::from_str_opt("nope").is_none());
    }

    #[test]
    fn test_verbose_default_false() {
        let config = build_default(Some("secret")).expect("should build");
        assert!(!config.verbose);
    }
}
