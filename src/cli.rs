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
use std::time::Duration;

use clap::Subcommand;
use lino_arguments::Parser as LinoParser;

use crate::config::{
    ApiFormat, BuildArgs, Config, ConfigError, RoutingMode, StoragePolicy, UpstreamProvider,
    default_activitypub_public_key_pem, default_data_dir,
};

/// Parse a boolean switch that may also arrive from the environment.
///
/// Clap's plain `bool` accepts only `true`/`false` from an env var, which makes
/// the `=1` spelling used throughout the deployment docs a hard startup error.
fn parse_truthy(value: &str) -> Result<bool, String> {
    match value.trim().to_ascii_lowercase().as_str() {
        "1" | "true" | "yes" | "on" => Ok(true),
        "0" | "false" | "no" | "off" | "" => Ok(false),
        other => Err(format!(
            "expected a boolean (1/0, true/false), got '{other}'"
        )),
    }
}

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

    /// Upstream provider: anthropic, gonka, crater, or openai-compatible.
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

    /// Upstream model used when an Anthropic-dialect request is bridged to a
    /// non-Anthropic upstream (e.g. Claude Code against the Codex provider).
    #[arg(long, env = "ANTHROPIC_BRIDGE_MODEL", global = true)]
    pub bridge_model: Option<String>,

    /// Append one JSON line per authorised request to this file, recording the
    /// router token id and label. Disabled when unset.
    #[arg(long, env = "AUDIT_LOG", global = true)]
    pub audit_log: Option<PathBuf>,

    /// Remote `ForgeFed` inbox for the crater provider.
    #[arg(long, env = "CRATER_FORGEFED_INBOX", global = true)]
    pub crater_forgefed_inbox: Option<String>,

    /// Local actor URI used by the crater provider.
    #[arg(long, env = "CRATER_FORGEFED_ACTOR", global = true)]
    pub crater_forgefed_actor: Option<String>,

    /// Remote ticket tracker or project URI used as the `ForgeFed` `Offer` target.
    #[arg(long, env = "CRATER_FORGEFED_TARGET", global = true)]
    pub crater_forgefed_target: Option<String>,

    /// Delay between crater task-resolution polls.
    #[arg(
        long,
        env = "CRATER_POLL_INTERVAL_MS",
        default_value_t = 1000,
        global = true
    )]
    pub crater_poll_interval_ms: u64,

    /// Maximum seconds to wait for crater task resolution.
    #[arg(
        long,
        env = "CRATER_POLL_TIMEOUT_SECS",
        default_value_t = 120,
        global = true
    )]
    pub crater_poll_timeout_secs: u64,

    /// Stored provider name for generic OpenAI-compatible upstream routing.
    #[arg(
        long,
        env = "OPENAI_COMPATIBLE_PROVIDER_NAME",
        default_value = "litellm",
        global = true
    )]
    pub openai_compatible_provider_name: String,

    /// Generic OpenAI-compatible upstream API base URL, usually ending in /v1.
    #[arg(
        long,
        env = "OPENAI_COMPATIBLE_BASE_URL",
        default_value = "http://localhost:4000/v1",
        global = true
    )]
    pub openai_compatible_base_url: String,

    /// Generic OpenAI-compatible upstream API key. Prefer provider DB import
    /// for long-lived deployments so the key is encrypted at rest.
    #[arg(long, env = "OPENAI_COMPATIBLE_API_KEY", global = true)]
    pub openai_compatible_api_key: Option<String>,

    /// Environment variable that contains the OpenAI-compatible upstream key.
    #[arg(long, env = "OPENAI_COMPATIBLE_API_KEY_ENV", global = true)]
    pub openai_compatible_api_key_env: Option<String>,

    /// Default model for OpenAI-compatible upstream requests without `model`.
    #[arg(long, env = "OPENAI_COMPATIBLE_MODEL", global = true)]
    pub openai_compatible_model: Option<String>,

    /// Comma-separated models exposed for the OpenAI-compatible provider.
    #[arg(
        long,
        env = "OPENAI_COMPATIBLE_MODELS",
        value_delimiter = ',',
        global = true
    )]
    pub openai_compatible_models: Vec<String>,

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

    /// New-session account policy: round-robin, fill-first, or least-used.
    #[arg(
        long,
        env = "ACCOUNT_ROUTING_STRATEGY",
        default_value = "round-robin",
        global = true
    )]
    pub account_routing_strategy: String,

    /// Default seconds to cool an account after a quota response.
    #[arg(
        long,
        env = "ACCOUNT_COOLDOWN_SECS",
        default_value_t = 60,
        global = true
    )]
    pub account_cooldown_secs: u64,

    /// Seconds an inactive conversation remains on its selected account.
    #[arg(
        long,
        env = "SESSION_AFFINITY_TTL_SECS",
        default_value_t = 3600,
        global = true
    )]
    pub session_affinity_ttl_secs: u64,

    /// Per-account request caps (primary first); zero means unknown/unlimited.
    #[arg(
        long,
        env = "ACCOUNT_REQUEST_LIMITS",
        value_delimiter = ',',
        global = true
    )]
    pub account_request_limits: Vec<usize>,

    /// Enable experimental compatibility shims (XML history, spoofing, …).
    #[arg(long, env = "EXPERIMENTAL_COMPATIBILITY", global = true)]
    pub experimental_compatibility: bool,

    /// Flat bootstrap Bearer key accepted by the admin endpoints alongside
    /// admin-scoped `la_sk_...` tokens.
    #[arg(long, env = "TOKEN_ADMIN_KEY", global = true)]
    pub admin_key: Option<String>,

    /// Port for the admin UI, served on its own listener. Omitted or `0`
    /// keeps the admin UI disabled, so upgrading exposes no new surface.
    #[arg(long, env = "ADMIN_PORT", global = true)]
    pub admin_port: Option<u16>,

    /// Address the admin UI binds to. Loopback by default so binding the proxy
    /// to `0.0.0.0` does not publish the UI as a side effect.
    #[arg(long, env = "ADMIN_HOST", default_value = "127.0.0.1", global = true)]
    pub admin_host: String,

    /// How long an unconfirmed first-visitor admin claim stays valid.
    #[arg(
        long,
        env = "ADMIN_CLAIM_TTL_SECS",
        default_value_t = crate::admin::DEFAULT_CANDIDATE_TTL_SECS,
        global = true
    )]
    pub admin_claim_ttl_secs: u64,

    /// Leave the admin endpoints (`/api/tokens*`, `/api/providers*`,
    /// `/api/login*`) open to unauthenticated callers.
    ///
    /// Off by default. Without it, a deployment that configures no admin
    /// credential mints a one-off admin token at startup and prints it once.
    ///
    /// Accepted as a bare flag, and from the environment as `1`/`0`,
    /// `true`/`false`, `yes`/`no` or `on`/`off` — clap's plain `bool` would
    /// reject the `=1` spelling every other switch in the deployment docs uses.
    #[arg(
        long,
        env = "ALLOW_ANONYMOUS_ADMIN",
        global = true,
        num_args = 0..=1,
        default_value_t = false,
        default_missing_value = "true",
        value_parser = parse_truthy,
    )]
    pub allow_anonymous_admin: bool,

    /// Telegram Bot API token. Unset keeps the Telegram admin channel off;
    /// setting it starts an outbound long-polling bot that accepts admin
    /// commands in private chats only.
    #[arg(long, env = "TELEGRAM_BOT_TOKEN", global = true)]
    pub telegram_bot_token: Option<String>,

    /// VK community access token. Unset keeps the VK admin channel off.
    #[arg(long, env = "VK_BOT_TOKEN", global = true)]
    pub vk_bot_token: Option<String>,

    /// VK community id the bot token belongs to; required alongside
    /// `--vk-bot-token` because VK long polling addresses a community.
    #[arg(long, env = "VK_GROUP_ID", global = true)]
    pub vk_group_id: Option<u64>,

    /// How long a chat message carrying a secret survives before the bot
    /// deletes it. Zero keeps secrets in the chat history.
    #[arg(
        long,
        env = "CHAT_ADMIN_SECRET_TTL_SECS",
        default_value_t = crate::chat_admin::DEFAULT_SECRET_TTL_SECS,
        global = true
    )]
    pub chat_admin_secret_ttl_secs: u64,

    /// Sensitive chat commands (`/start`, credential presentation, issuance)
    /// allowed per user per minute. Zero disables the limit.
    #[arg(
        long,
        env = "CHAT_ADMIN_RATE_LIMIT_PER_MINUTE",
        default_value_t = crate::chat_admin::DEFAULT_RATE_LIMIT_PER_MINUTE,
        global = true
    )]
    pub chat_admin_rate_limit_per_minute: u32,

    /// Enable MPP 402 charge challenges on OpenAI-compatible endpoints.
    #[arg(long, env = "MPP_ENABLE", global = true)]
    pub mpp_enable: bool,

    /// Per-request MPP charge amount for OpenAI-compatible endpoints.
    #[arg(long, env = "MPP_AMOUNT", default_value = "0.00", global = true)]
    pub mpp_amount: String,

    /// Currency or asset for MPP `OpenAI` endpoint charges.
    #[arg(long, env = "MPP_CURRENCY", default_value = "USD", global = true)]
    pub mpp_currency: String,

    /// Recipient wallet, merchant account, or payment address for MPP charges.
    #[arg(long, env = "MPP_RECIPIENT", global = true)]
    pub mpp_recipient: Option<String>,

    /// Optional MPP payment method identifier, such as tempo or stripe.
    #[arg(long, env = "MPP_METHOD", global = true)]
    pub mpp_method: Option<String>,

    /// Disable the interactive login API (`/api/login`).
    #[arg(long, env = "DISABLE_LOGIN_API", global = true)]
    pub disable_login_api: bool,

    /// Program the login API drives on a PTY.
    #[arg(
        long,
        env = "LOGIN_CLI_COMMAND",
        default_value = "claude",
        global = true
    )]
    pub login_cli_command: String,

    /// Arguments passed to the login program.
    #[arg(long, env = "LOGIN_CLI_ARGS", value_delimiter = ',', global = true)]
    pub login_cli_args: Vec<String>,

    /// How long a pending login stays valid while waiting for the human.
    #[arg(
        long,
        env = "LOGIN_SESSION_TTL_SECS",
        default_value = "900",
        global = true
    )]
    pub login_session_ttl_secs: u64,

    /// Maximum number of simultaneously pending logins.
    #[arg(long, env = "LOGIN_MAX_SESSIONS", default_value = "4", global = true)]
    pub login_max_sessions: usize,
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
    /// Provider-management subcommands.
    Providers {
        #[command(subcommand)]
        op: ProviderOp,
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
        /// Cap on the number of upstream requests this token may make.
        /// Omit for an unlimited token.
        #[arg(long)]
        max_requests: Option<u64>,
        /// Issue an administrative token (`scope: admin`) that unlocks the
        /// admin endpoints instead of only the inference proxy.
        #[arg(long)]
        admin: bool,
    },
    /// Replace an administrative token: issue a new one and revoke the old.
    Rotate {
        /// Subject id (`sub`) of the admin token being replaced.
        id: String,
        #[arg(long, default_value_t = 24)]
        ttl_hours: i64,
        #[arg(long, default_value = "")]
        label: String,
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

#[derive(Debug, Subcommand)]
pub enum ProviderOp {
    /// List configured upstream providers.
    List,
    /// Add or replace an OpenAI-compatible provider.
    Add {
        #[arg(long)]
        name: String,
        #[arg(long, default_value = "openai-compatible")]
        kind: String,
        #[arg(long)]
        base_url: String,
        #[arg(long)]
        model: Option<String>,
        #[arg(long, value_delimiter = ',')]
        models: Vec<String>,
        #[arg(long)]
        api_key: Option<String>,
        #[arg(long)]
        api_key_env: Option<String>,
        #[arg(long, default_value_t = true)]
        enabled: bool,
    },
    /// Show one provider with secret material redacted.
    Show { name: String },
    /// Remove one provider.
    Remove { name: String },
    /// Import providers from JSON, `.lenv`, or indented Links-style config.
    Import { path: PathBuf },
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
        let account_routing_strategy =
            crate::accounts::SelectionStrategy::from_str_opt(&self.account_routing_strategy)
                .ok_or(ConfigError::InvalidAccountRoutingStrategy)?;
        let data_dir = self.data_dir.clone().unwrap_or_else(default_data_dir);
        let activitypub_actor_base_url = self
            .activitypub_actor_base_url
            .clone()
            .unwrap_or_else(|| format!("http://{}:{}", self.host, self.port));
        let crater_actor = self
            .crater_forgefed_actor
            .clone()
            .filter(|value| !value.is_empty())
            .unwrap_or_else(|| {
                format!(
                    "{}/actor/code",
                    activitypub_actor_base_url.trim_end_matches('/')
                )
            });
        let crater = crate::crater::CraterConfig::new(
            self.crater_forgefed_inbox
                .clone()
                .filter(|value| !value.is_empty()),
            &crater_actor,
            self.crater_forgefed_target
                .clone()
                .filter(|value| !value.is_empty()),
            Duration::from_millis(self.crater_poll_interval_ms),
            Duration::from_secs(self.crater_poll_timeout_secs),
        );
        let activitypub_public_key_pem = self
            .activitypub_public_key_pem
            .clone()
            .unwrap_or_else(default_activitypub_public_key_pem);
        let openai_compatible = crate::providers::OpenAICompatibleConfig {
            provider_name: self.openai_compatible_provider_name.clone(),
            base_url: self.openai_compatible_base_url.clone(),
            api_key: self
                .openai_compatible_api_key
                .clone()
                .filter(|s| !s.is_empty()),
            api_key_env: self
                .openai_compatible_api_key_env
                .clone()
                .filter(|s| !s.is_empty()),
            default_model: self
                .openai_compatible_model
                .clone()
                .filter(|s| !s.is_empty()),
            models: self.openai_compatible_models.clone(),
        };
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
            bridge_model: self.bridge_model.clone().filter(|s| !s.is_empty()),
            audit_log: self
                .audit_log
                .as_ref()
                .map(|p| p.to_string_lossy().into_owned())
                .filter(|s| !s.is_empty()),
            crater,
            openai_compatible,
            activitypub_actor_base_url,
            activitypub_public_key_pem,
            enable_openai_api: !self.disable_openai_api,
            enable_anthropic_api: !self.disable_anthropic_api,
            enable_metrics: !self.disable_metrics,
            additional_account_dirs: self.additional_account_dirs.clone(),
            account_routing_strategy,
            account_cooldown_secs: self.account_cooldown_secs,
            session_affinity_ttl_secs: self.session_affinity_ttl_secs,
            account_request_limits: self.account_request_limits.clone(),
            experimental_compatibility: self.experimental_compatibility,
            admin_key: self.admin_key.clone().filter(|s| !s.is_empty()),
            admin_ui: crate::config::admin_ui_config(
                self.admin_port,
                &self.admin_host,
                self.admin_claim_ttl_secs,
            )?,
            allow_anonymous_admin: self.allow_anonymous_admin,
            chat_admin: crate::config::chat_admin_config(
                self.telegram_bot_token.clone(),
                self.vk_bot_token.clone(),
                self.vk_group_id,
                self.chat_admin_secret_ttl_secs,
                u64::from(self.chat_admin_rate_limit_per_minute),
            ),
            login: crate::login::LoginConfig {
                enabled: !self.disable_login_api,
                command: self.login_cli_command.clone(),
                args: self.login_cli_args.clone(),
                session_ttl: Duration::from_secs(self.login_session_ttl_secs),
                max_sessions: self.login_max_sessions,
                ..crate::login::LoginConfig::default()
            },
            mpp: crate::mpp::MppConfig {
                enabled: self.mpp_enable,
                amount: self.mpp_amount.clone(),
                currency: self.mpp_currency.clone(),
                recipient: self.mpp_recipient.clone().unwrap_or_default(),
                method: self.mpp_method.clone().filter(|s| !s.is_empty()),
            },
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::{
        default_gonka_model, default_gonka_source_url, default_openai_compatible_base_url,
    };

    #[test]
    fn login_cli_defaults_to_bare_tui() {
        let cli = Cli::try_parse_from(["link-assistant-router"]).unwrap();
        assert!(cli.login_cli_args.is_empty());
    }

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
            bridge_model: None,
            audit_log: None,
            crater_forgefed_inbox: None,
            crater_forgefed_actor: None,
            crater_forgefed_target: None,
            crater_poll_interval_ms: 1000,
            crater_poll_timeout_secs: 120,
            openai_compatible_provider_name: "litellm".into(),
            openai_compatible_base_url: default_openai_compatible_base_url(),
            openai_compatible_api_key: None,
            openai_compatible_api_key_env: None,
            openai_compatible_model: None,
            openai_compatible_models: vec![],
            activitypub_actor_base_url: Some("https://router.example".into()),
            activitypub_public_key_pem: None,
            disable_openai_api: false,
            disable_anthropic_api: false,
            disable_metrics: false,
            additional_account_dirs: vec![],
            account_routing_strategy: "round-robin".into(),
            account_cooldown_secs: 60,
            session_affinity_ttl_secs: 3600,
            account_request_limits: vec![],
            experimental_compatibility: false,
            admin_port: None,
            admin_host: "127.0.0.1".into(),
            admin_claim_ttl_secs: crate::admin::DEFAULT_CANDIDATE_TTL_SECS,
            admin_key: None,
            allow_anonymous_admin: false,
            telegram_bot_token: None,
            vk_bot_token: None,
            vk_group_id: None,
            chat_admin_secret_ttl_secs: crate::chat_admin::DEFAULT_SECRET_TTL_SECS,
            chat_admin_rate_limit_per_minute: crate::chat_admin::DEFAULT_RATE_LIMIT_PER_MINUTE,
            mpp_enable: false,
            mpp_amount: "0.00".into(),
            mpp_currency: "USD".into(),
            mpp_recipient: None,
            mpp_method: None,
            disable_login_api: false,
            login_cli_command: "claude".into(),
            login_cli_args: vec![],
            login_session_ttl_secs: 900,
            login_max_sessions: 4,
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
            bridge_model: None,
            audit_log: None,
            crater_forgefed_inbox: None,
            crater_forgefed_actor: None,
            crater_forgefed_target: None,
            crater_poll_interval_ms: 1000,
            crater_poll_timeout_secs: 120,
            openai_compatible_provider_name: "litellm".into(),
            openai_compatible_base_url: default_openai_compatible_base_url(),
            openai_compatible_api_key: None,
            openai_compatible_api_key_env: None,
            openai_compatible_model: None,
            openai_compatible_models: vec![],
            activitypub_actor_base_url: None,
            activitypub_public_key_pem: None,
            disable_openai_api: false,
            disable_anthropic_api: false,
            disable_metrics: false,
            additional_account_dirs: vec![],
            account_routing_strategy: "round-robin".into(),
            account_cooldown_secs: 60,
            session_affinity_ttl_secs: 3600,
            account_request_limits: vec![],
            experimental_compatibility: false,
            admin_port: None,
            admin_host: "127.0.0.1".into(),
            admin_claim_ttl_secs: crate::admin::DEFAULT_CANDIDATE_TTL_SECS,
            admin_key: None,
            allow_anonymous_admin: false,
            telegram_bot_token: None,
            vk_bot_token: None,
            vk_group_id: None,
            chat_admin_secret_ttl_secs: crate::chat_admin::DEFAULT_SECRET_TTL_SECS,
            chat_admin_rate_limit_per_minute: crate::chat_admin::DEFAULT_RATE_LIMIT_PER_MINUTE,
            mpp_enable: false,
            mpp_amount: "0.00".into(),
            mpp_currency: "USD".into(),
            mpp_recipient: None,
            mpp_method: None,
            disable_login_api: false,
            login_cli_command: "claude".into(),
            login_cli_args: vec![],
            login_session_ttl_secs: 900,
            login_max_sessions: 4,
        };
        let r = cli.into_config();
        assert!(matches!(r, Err(ConfigError::InvalidRoutingMode)));
    }
}
