//! Configuration module for Link.Assistant.Router.
//!
//! Reads configuration from environment variables.

use std::env;
use std::net::SocketAddr;

/// Supported upstream API formats.
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
    /// Parse from a string value.
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

/// Router configuration loaded from environment variables.
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
    /// Upstream API format (default: all formats accepted).
    pub api_format: Option<ApiFormat>,
}

impl Config {
    /// Load configuration from environment variables.
    ///
    /// # Environment Variables
    ///
    /// - `ROUTER_PORT` -- port to listen on (default: `8080`)
    /// - `ROUTER_HOST` -- host to bind to (default: `0.0.0.0`)
    /// - `TOKEN_SECRET` -- secret for signing JWT tokens (**required**)
    /// - `CLAUDE_CODE_HOME` -- path to Claude Code session data (default: `~/.claude`)
    /// - `UPSTREAM_BASE_URL` -- Anthropic API base URL (default: `https://api.anthropic.com`)
    /// - `VERBOSE` -- enable verbose logging (`1` or `true`)
    /// - `UPSTREAM_API_FORMAT` -- restrict to a specific API format (`anthropic`, `bedrock`, `vertex`)
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
        let verbose = env::var("VERBOSE")
            .map(|v| v == "1" || v.eq_ignore_ascii_case("true"))
            .unwrap_or(false);
        let api_format = env::var("UPSTREAM_API_FORMAT")
            .ok()
            .and_then(|s| ApiFormat::from_str_opt(&s));

        Self::build(
            &host,
            &port,
            token_secret.as_deref(),
            &claude_code_home,
            &upstream_base_url,
            verbose,
            api_format,
        )
    }

    /// Build a `Config` from explicit values.
    #[allow(clippy::too_many_arguments)]
    pub fn build(
        host: &str,
        port: &str,
        token_secret: Option<&str>,
        claude_code_home: &str,
        upstream_base_url: &str,
        verbose: bool,
        api_format: Option<ApiFormat>,
    ) -> Result<Self, ConfigError> {
        let port: u16 = port.parse().map_err(|_| ConfigError::InvalidPort)?;

        let listen_addr: SocketAddr = format!("{host}:{port}")
            .parse()
            .map_err(|_| ConfigError::InvalidAddress)?;

        let token_secret = token_secret
            .filter(|s| !s.is_empty())
            .ok_or(ConfigError::MissingTokenSecret)?
            .to_string();

        Ok(Self {
            listen_addr,
            token_secret,
            claude_code_home: claude_code_home.to_string(),
            upstream_base_url: upstream_base_url.to_string(),
            verbose,
            api_format,
        })
    }
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
}

impl std::fmt::Display for ConfigError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::InvalidPort => write!(f, "ROUTER_PORT must be a valid port number (0-65535)"),
            Self::InvalidAddress => write!(f, "Could not parse listen address"),
            Self::MissingTokenSecret => {
                write!(f, "TOKEN_SECRET environment variable is required")
            }
        }
    }
}

impl std::error::Error for ConfigError {}

#[cfg(test)]
mod tests {
    use super::*;

    fn build_default(secret: Option<&str>) -> Result<Config, ConfigError> {
        Config::build(
            "0.0.0.0",
            "8080",
            secret,
            "/tmp/claude",
            "https://api.anthropic.com",
            false,
            None,
        )
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
        let config = Config::build(
            "127.0.0.1",
            "9090",
            Some("test-secret-key"),
            "/tmp/test-claude",
            "https://example.com",
            true,
            Some(ApiFormat::Bedrock),
        )
        .expect("Config should build");
        assert_eq!(config.listen_addr.port(), 9090);
        assert_eq!(config.token_secret, "test-secret-key");
        assert_eq!(config.claude_code_home, "/tmp/test-claude");
        assert_eq!(config.upstream_base_url, "https://example.com");
        assert!(config.verbose);
        assert_eq!(config.api_format, Some(ApiFormat::Bedrock));
    }

    #[test]
    fn test_config_invalid_port() {
        let result = Config::build(
            "0.0.0.0",
            "not-a-number",
            Some("secret"),
            "/tmp/claude",
            "https://api.anthropic.com",
            false,
            None,
        );
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
    fn test_verbose_default_false() {
        let config = build_default(Some("secret")).expect("should build");
        assert!(!config.verbose);
    }
}
