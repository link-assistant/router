//! Configuration module for Link.Assistant.Router.
//!
//! Reads configuration from environment variables.

use std::env;
use std::net::SocketAddr;

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
}

impl Config {
    /// Load configuration from environment variables.
    ///
    /// # Environment Variables
    ///
    /// - `ROUTER_PORT` — port to listen on (default: `8080`)
    /// - `ROUTER_HOST` — host to bind to (default: `0.0.0.0`)
    /// - `TOKEN_SECRET` — secret for signing JWT tokens (**required**)
    /// - `CLAUDE_CODE_HOME` — path to Claude Code session data (default: `~/.claude`)
    /// - `UPSTREAM_BASE_URL` — Anthropic API base URL (default: `https://api.anthropic.com`)
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

        Self::build(
            &host,
            &port,
            token_secret.as_deref(),
            &claude_code_home,
            &upstream_base_url,
        )
    }

    /// Build a `Config` from explicit values.
    ///
    /// This is the core constructor; `from_env` is a thin wrapper that reads
    /// environment variables and delegates here.
    pub fn build(
        host: &str,
        port: &str,
        token_secret: Option<&str>,
        claude_code_home: &str,
        upstream_base_url: &str,
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

    #[test]
    fn test_config_missing_token_secret() {
        let result = Config::build(
            "0.0.0.0",
            "8080",
            None,
            "/tmp/claude",
            "https://api.anthropic.com",
        );
        assert!(result.is_err());
    }

    #[test]
    fn test_config_empty_token_secret() {
        let result = Config::build(
            "0.0.0.0",
            "8080",
            Some(""),
            "/tmp/claude",
            "https://api.anthropic.com",
        );
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
        )
        .expect("Config should build");
        assert_eq!(config.listen_addr.port(), 9090);
        assert_eq!(config.token_secret, "test-secret-key");
        assert_eq!(config.claude_code_home, "/tmp/test-claude");
        assert_eq!(config.upstream_base_url, "https://example.com");
    }

    #[test]
    fn test_config_invalid_port() {
        let result = Config::build(
            "0.0.0.0",
            "not-a-number",
            Some("secret"),
            "/tmp/claude",
            "https://api.anthropic.com",
        );
        assert!(result.is_err());
    }

    #[test]
    fn test_config_default_port() {
        let config = Config::build(
            "0.0.0.0",
            "8080",
            Some("secret"),
            "/tmp/claude",
            "https://api.anthropic.com",
        )
        .expect("should build");
        assert_eq!(config.listen_addr.port(), 8080);
    }
}
