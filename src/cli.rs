//! Command-line interface for the router.
//!
//! Issue #7 R3 mandates a `lino-arguments`-based CLI on top of clap. This
//! module defines the subcommands and exposes a single [`Cli`] entry-point
//! parsed by [`lino_arguments::Parser`] (which is a clap-compatible drop-in
//! that additionally reads `.lenv` files at startup).
//!
//! Subcommands:
//!
//! - `serve` (default) — start the HTTP server.
//! - `tokens issue|list|revoke|expire|show` — manage persistent tokens
//!   without going through the HTTP layer (useful for ops scripts).
//! - `accounts list` — show configured accounts and their health.
//! - `doctor` — report on environment, OAuth credential discoverability,
//!   storage paths, and other config.

// The CLI struct intentionally has many independent boolean toggles
// (`--disable-openai-api`, `--disable-anthropic-api`, etc.). Refactoring
// into enums would obscure the 1:1 mapping with the documented flags.
#![allow(clippy::struct_excessive_bools)]

use std::path::PathBuf;

use clap::Subcommand;
use lino_arguments::Parser as LinoParser;

use crate::config::{
    default_activitypub_public_key_pem, default_data_dir, ApiFormat, BuildArgs, Config,
    ConfigError, RoutingMode, StoragePolicy, UpstreamProvider,
};

/// Top-level CLI parser.
#[derive(Debug, LinoParser)]
#[command(
    name = "link-assistant-router",
    about = "Claude MAX OAuth proxy and token gateway for Anthropic APIs",
    version
)]
pub struct Cli {
    /// Subcommand to run. Defaults to `serve` when omitted.
    #[command(subcommand)]
    pub command: Option<Command>,

    /// Address to bind the HTTP server to (legacy --host).
    #[arg(long, env = "ROUTER_HOST", default_value = "0.0.0.0", global = true)]
    pub host: String,

    /// Port to bind the HTTP server to.
    #[arg(long, env = "ROUTER_PORT", default_value = "8080", global = true)]
    pub port: u16,

    /// Verbose logging.
    #[arg(long, env = "VERBOSE", global = true)]
    pub verbose: bool,

    /// JWT signing secret (or `TOKEN_SECRET` env).
    #[arg(long, env = "TOKEN_SECRET", global = true)]
    pub token_secret: Option<String>,

    /// Claude Code home directory (primary account credentials).
    #[arg(long, env = "CLAUDE_CODE_HOME", global = true)]
    pub claude_code_home: Option<String>,

    /// Upstream base URL.
    #[arg(
        long,
        env = "UPSTREAM_BASE_URL",
        default_value = "https://api.anthropic.com",
        global = true
    )]
    pub upstream_base_url: String,

    /// Restrict the proxy to a specific upstream API format.
    #[arg(long, env = "UPSTREAM_API_FORMAT", global = true)]
    pub api_format: Option<String>,

    /// Routing mode: direct, cli, hybrid.
    #[arg(long, env = "ROUTING_MODE", default_value = "direct", global = true)]
    pub routing_mode: String,

    /// Storage policy: memory, text, binary, both.
    #[arg(long, env = "STORAGE_POLICY", default_value = "both", global = true)]
    pub storage_policy: String,

    /// Data directory for the persistent token store.
    #[arg(long, env = "DATA_DIR", global = true)]
    pub data_dir: Option<PathBuf>,

    /// Path to the local Claude CLI binary used by the CLI backend.
    #[arg(long, env = "CLAUDE_CLI_BIN", global = true)]
    pub claude_cli_bin: Option<PathBuf>,

    /// Upstream provider: anthropic or gonka.
    #[arg(
        long,
        env = "UPSTREAM_PROVIDER",
        default_value = "anthropic",
        global = true
    )]
    pub upstream_provider: String,

    /// Gonka private key used for request signing.
    #[arg(long, env = "GONKA_PRIVATE_KEY", global = true)]
    pub gonka_private_key: Option<String>,

    /// Gonka source node URL.
    #[arg(
        long,
        env = "GONKA_SOURCE_URL",
        default_value = "https://node4.gonka.ai",
        global = true
    )]
    pub gonka_source_url: String,

    /// Default Gonka model for OpenAI-compatible requests without `model`.
    #[arg(
        long,
        env = "GONKA_MODEL",
        default_value = "Qwen/Qwen3-235B-A22B-Instruct-2507-FP8",
        global = true
    )]
    pub gonka_model: String,

    /// Public base URL for the `ActivityPub` actor.
    #[arg(long, env = "ACTIVITYPUB_ACTOR_BASE_URL", global = true)]
    pub activitypub_actor_base_url: Option<String>,

    /// Public key PEM advertised by the `ActivityPub` actor.
    #[arg(long, env = "ACTIVITYPUB_PUBLIC_KEY_PEM", global = true)]
    pub activitypub_public_key_pem: Option<String>,

    /// Disable the OpenAI-compatible API surface.
    #[arg(long, env = "DISABLE_OPENAI_API", global = true)]
    pub disable_openai_api: bool,

    /// Disable the Anthropic (direct) proxy surface.
    #[arg(long, env = "DISABLE_ANTHROPIC_API", global = true)]
    pub disable_anthropic_api: bool,

    /// Disable `/metrics`, `/v1/usage` and `/v1/accounts` endpoints.
    #[arg(long, env = "DISABLE_METRICS", global = true)]
    pub disable_metrics: bool,

    /// Comma-separated list of additional account credential directories.
    #[arg(
        long,
        env = "ADDITIONAL_ACCOUNT_DIRS",
        value_delimiter = ',',
        global = true
    )]
    pub additional_account_dirs: Vec<PathBuf>,

    /// Enable experimental compatibility shims (XML history, spoofing, …).
    #[arg(long, env = "EXPERIMENTAL_COMPATIBILITY", global = true)]
    pub experimental_compatibility: bool,

    /// Bearer key required by `/api/tokens` and admin endpoints.
    #[arg(long, env = "TOKEN_ADMIN_KEY", global = true)]
    pub admin_key: Option<String>,
}

/// Subcommands.
#[derive(Debug, Subcommand)]
pub enum Command {
    /// Start the HTTP server (default if no subcommand given).
    Serve,
    /// Token-management subcommands.
    Tokens {
        #[command(subcommand)]
        op: TokenOp,
    },
    /// Account-management subcommands.
    Accounts {
        #[command(subcommand)]
        op: AccountOp,
    },
    /// Print environment + config diagnostics.
    Doctor,
}

#[derive(Debug, Subcommand)]
pub enum TokenOp {
    /// Issue a new token and print it to stdout.
    Issue {
        #[arg(long, default_value_t = 24)]
        ttl_hours: i64,
        #[arg(long, default_value = "")]
        label: String,
        #[arg(long)]
        account: Option<String>,
    },
    /// List all known tokens.
    List,
    /// Revoke a token by id.
    Revoke { id: String },
    /// Mark a token as expired immediately (revoke alias).
    Expire { id: String },
    /// Show metadata for one token.
    Show { id: String },
}

#[derive(Debug, Subcommand)]
pub enum AccountOp {
    /// List configured accounts and their health.
    List,
}

impl Cli {
    /// Build a [`Config`] from the parsed CLI / env / `.lenv` values.
    pub fn into_config(&self) -> Result<Config, ConfigError> {
        let port = self.port.to_string();
        let token_secret = self.token_secret.clone();
        let claude_home = self.claude_code_home.clone().unwrap_or_else(|| {
            std::env::var("HOME")
                .map_or_else(|_| "/root/.claude".to_string(), |h| format!("{h}/.claude"))
        });
        let api_format = self.api_format.as_deref().and_then(ApiFormat::from_str_opt);
        let routing_mode =
            RoutingMode::from_str_opt(&self.routing_mode).ok_or(ConfigError::InvalidRoutingMode)?;
        let upstream_provider = UpstreamProvider::from_str_opt(&self.upstream_provider)
            .unwrap_or(UpstreamProvider::Anthropic);
        let storage_policy = StoragePolicy::from_str_opt(&self.storage_policy).unwrap_or_default();
        let data_dir = self.data_dir.clone().unwrap_or_else(default_data_dir);
        let activitypub_actor_base_url = self
            .activitypub_actor_base_url
            .clone()
            .unwrap_or_else(|| format!("http://{}:{}", self.host, self.port));
        let activitypub_public_key_pem = self
            .activitypub_public_key_pem
            .clone()
            .unwrap_or_else(default_activitypub_public_key_pem);
        Config::build(BuildArgs {
            host: &self.host,
            port: &port,
            token_secret: token_secret.as_deref(),
            claude_code_home: &claude_home,
            upstream_base_url: &self.upstream_base_url,
            verbose: self.verbose,
            api_format,
            routing_mode,
            storage_policy,
            data_dir,
            claude_cli_bin: self.claude_cli_bin.clone(),
            upstream_provider,
            gonka_private_key: self.gonka_private_key.clone().filter(|s| !s.is_empty()),
            gonka_source_url: self.gonka_source_url.clone(),
            gonka_model: self.gonka_model.clone(),
            activitypub_actor_base_url,
            activitypub_public_key_pem,
            enable_openai_api: !self.disable_openai_api,
            enable_anthropic_api: !self.disable_anthropic_api,
            enable_metrics: !self.disable_metrics,
            additional_account_dirs: self.additional_account_dirs.clone(),
            experimental_compatibility: self.experimental_compatibility,
            admin_key: self.admin_key.clone().filter(|s| !s.is_empty()),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::{default_gonka_model, default_gonka_source_url};

    #[test]
    fn cli_defaults_round_trip_to_config() {
        let cli = Cli {
            command: None,
            host: "127.0.0.1".into(),
            port: 9090,
            verbose: false,
            token_secret: Some("k".into()),
            claude_code_home: Some("/tmp/c".into()),
            upstream_base_url: "https://api.anthropic.com".into(),
            api_format: None,
            routing_mode: "direct".into(),
            storage_policy: "memory".into(),
            data_dir: Some(std::path::PathBuf::from("/tmp/d")),
            claude_cli_bin: None,
            upstream_provider: "anthropic".into(),
            gonka_private_key: None,
            gonka_source_url: default_gonka_source_url(),
            gonka_model: default_gonka_model(),
            activitypub_actor_base_url: Some("https://router.example".into()),
            activitypub_public_key_pem: None,
            disable_openai_api: false,
            disable_anthropic_api: false,
            disable_metrics: false,
            additional_account_dirs: vec![],
            experimental_compatibility: false,
            admin_key: None,
        };
        let cfg = cli.into_config().unwrap();
        assert_eq!(cfg.listen_addr.port(), 9090);
        assert_eq!(cfg.routing_mode, RoutingMode::Direct);
        assert_eq!(cfg.storage_policy, StoragePolicy::Memory);
        assert!(cfg.enable_openai_api);
        assert!(cfg.enable_anthropic_api);
        assert!(cfg.enable_metrics);
    }

    #[test]
    fn cli_invalid_routing_mode_rejected() {
        let cli = Cli {
            command: None,
            host: "0.0.0.0".into(),
            port: 8080,
            verbose: false,
            token_secret: Some("k".into()),
            claude_code_home: Some("/tmp/c".into()),
            upstream_base_url: "https://api.anthropic.com".into(),
            api_format: None,
            routing_mode: "bogus".into(),
            storage_policy: "memory".into(),
            data_dir: None,
            claude_cli_bin: None,
            upstream_provider: "anthropic".into(),
            gonka_private_key: None,
            gonka_source_url: default_gonka_source_url(),
            gonka_model: default_gonka_model(),
            activitypub_actor_base_url: None,
            activitypub_public_key_pem: None,
            disable_openai_api: false,
            disable_anthropic_api: false,
            disable_metrics: false,
            additional_account_dirs: vec![],
            experimental_compatibility: false,
            admin_key: None,
        };
        let r = cli.into_config();
        assert!(matches!(r, Err(ConfigError::InvalidRoutingMode)));
    }
}
