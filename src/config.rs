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
        let enable_openai_api = env::var("ENABLE_OPENAI_API")
            .map(|v| !matches!(v.as_str(), "0" | "false" | "FALSE" | "off"))
            .unwrap_or(true);
        let enable_anthropic_api = env::var("ENABLE_ANTHROPIC_API")
            .map(|v| !matches!(v.as_str(), "0" | "false" | "FALSE" | "off"))
            .unwrap_or(true);
        let enable_metrics = env::var("ENABLE_METRICS")
            .map(|v| !matches!(v.as_str(), "0" | "false" | "FALSE" | "off"))
            .unwrap_or(true);
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
            enable_openai_api,
            enable_anthropic_api,
            enable_metrics,
            additional_account_dirs,
            experimental_compatibility,
            admin_key,
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
            enable_openai_api: args.enable_openai_api,
            enable_anthropic_api: args.enable_anthropic_api,
            enable_metrics: args.enable_metrics,
            additional_account_dirs: args.additional_account_dirs,
            experimental_compatibility: args.experimental_compatibility,
            admin_key: args.admin_key,
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
    pub enable_openai_api: bool,
    pub enable_anthropic_api: bool,
    pub enable_metrics: bool,
    pub additional_account_dirs: Vec<PathBuf>,
    pub experimental_compatibility: bool,
    pub admin_key: Option<String>,
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
            enable_openai_api: true,
            enable_anthropic_api: true,
            enable_metrics: true,
            additional_account_dirs: vec![],
            experimental_compatibility: false,
            admin_key: None,
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
        assert!(!config.verbose);
        assert_eq!(config.routing_mode, RoutingMode::Direct);
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
            enable_openai_api: true,
            enable_anthropic_api: true,
            enable_metrics: true,
            additional_account_dirs: vec![],
            experimental_compatibility: false,
            admin_key: None,
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
