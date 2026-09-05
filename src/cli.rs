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
//! - `clients list|setup|show|remove|doctor` — configure local agentic CLIs.
//! - `doctor` — report on environment, OAuth credential discoverability,
//!   storage paths, and other config.

// The CLI struct intentionally has many independent boolean toggles
// (`--disable-openai-api`, `--disable-anthropic-api`, etc.). Refactoring
// into enums would obscure the 1:1 mapping with the documented flags.
#![allow(clippy::struct_excessive_bools)]

use std::path::PathBuf;
use std::time::Duration;

use clap::builder::{PossibleValuesParser, TypedValueParser};
use clap::{Subcommand, ValueEnum};
use lino_arguments::Parser as LinoParser;

use crate::config::{
    ApiFormat, BuildArgs, Config, ConfigError, RoutingMode, StoragePolicy, UpstreamProvider,
    default_activitypub_public_key_pem, default_data_dir,
};

mod auth_ops;
mod client_ops;
mod configure;
mod store_ops;
mod targets;
mod with;

pub use self::auth_ops::{AuthOp, AuthTarget, ImportProvider, ImportTarget, RemoteGh, TlsOp};
pub use self::client_ops::ClientOp;
pub use self::configure::ConfigureArgs;
pub use self::store_ops::{AccountOp, ProviderOp, TokenOp};
pub use self::with::{ServerOp, WithArgs, protect_client_arguments};

/// Parse the CLI, hiding options that cannot affect the subcommand shown.
///
/// `with` and `configure` return before the server configuration is built, so
/// none of the binary's ~28 global options — `--host`, `--port`,
/// `--storage-policy`, `--upstream-base-url` and the rest — reaches them.
/// Clap lists a global under every subcommand, so `with --help` advertised
/// them as options of `with`: `--verbose` was accepted and produced no
/// logging, and `--port` written after the client name went to the client
/// (issue #312). Listing options that cannot work is worse than omitting them.
///
/// Only the *help* changes. A global still parses wherever it always did, so
/// no existing invocation breaks.
#[must_use]
pub fn parse_arguments(arguments: Vec<std::ffi::OsString>) -> Cli {
    use clap::{CommandFactory as _, FromArgMatches as _};

    let mut command = Cli::command();
    // Globals are declared on the root and propagated into every subcommand
    // when the parser is built, so they can only be hidden before that — and
    // only for the invocations they cannot affect. `router tokens list --help`
    // still lists them, because there they work.
    if names_a_client_launcher(&arguments) {
        command = command.mut_args(|argument| {
            if argument.is_global_set() {
                argument.hide(true)
            } else {
                argument
            }
        });
    }
    // The usage strings that hide the globals are written with a `{name}`
    // placeholder, because clap does not interpolate one there. Substituting
    // the invoked name here keeps both properties at once: the error usage
    // line still omits globals that are not required (issue #312), and it
    // names the binary the reader actually ran rather than hardcoding `router`
    // under both installed names (issue #315).
    let invoked = arguments
        .first()
        .map(std::path::Path::new)
        .and_then(std::path::Path::file_stem)
        .map_or_else(
            || "router".to_string(),
            |name| name.to_string_lossy().into_owned(),
        );
    command = substitute_usage_name(command, &invoked);
    let matches = command.get_matches_from(arguments);
    Cli::from_arg_matches(&matches).unwrap_or_else(|error| error.exit())
}

/// The subcommands whose usage line is written out, and what follows the name.
///
/// Written out because clap's generated *error* usage lists every configured
/// global as required (issue #312); the leading binary name is substituted at
/// parse time rather than hardcoded, so it is the one the reader invoked
/// (issue #315). One table, so the two rules cannot drift apart.
const OVERRIDDEN_USAGE: [(&[&str], &str); 14] = [
    (&["configure"], "configure [OPTIONS] <CLIENT>"),
    (&["clients", "setup"], "clients setup [OPTIONS] <CLIENT>"),
    (&["clients", "show"], "clients show [OPTIONS] <CLIENT>"),
    (&["clients", "remove"], "clients remove [OPTIONS] <CLIENT>"),
    (&["clients", "doctor"], "clients doctor [OPTIONS] <CLIENT>"),
    (&["tokens", "rotate"], "tokens rotate [OPTIONS] <ID>"),
    (&["tokens", "revoke"], "tokens revoke [OPTIONS] <ID>"),
    (&["tokens", "show"], "tokens show [OPTIONS] <ID>"),
    (
        &["providers", "add"],
        "providers add [OPTIONS] --name <NAME> --base-url <BASE_URL>",
    ),
    (&["providers", "show"], "providers show [OPTIONS] <NAME>"),
    (
        &["providers", "remove"],
        "providers remove [OPTIONS] <NAME>",
    ),
    (
        &["providers", "import"],
        "providers import [OPTIONS] <PATH>",
    ),
    (
        &["auth", "import"],
        "auth import [OPTIONS] [PROVIDER] [DIR]",
    ),
    (&["auth", "clear"], "auth clear [OPTIONS] [PROVIDER]"),
];

/// Write each overridden usage line with the name that was actually invoked.
fn substitute_usage_name(mut command: clap::Command, invoked: &str) -> clap::Command {
    for (path, usage) in OVERRIDDEN_USAGE {
        command = with_subcommand(command, path, &format!("{invoked} {usage}"));
    }
    command
}

/// Apply `usage` to the subcommand reached by `path`.
fn with_subcommand(command: clap::Command, path: &[&str], usage: &str) -> clap::Command {
    let Some((head, rest)) = path.split_first() else {
        return command.override_usage(usage.to_string());
    };
    command.mut_subcommand(head, |subcommand| with_subcommand(subcommand, rest, usage))
}

/// Whether this invocation is one that returns before the server config exists.
///
/// Read off argv rather than the parsed command, because the decision has to be
/// made before parsing. Only the first bare word is consulted, so a *value*
/// that happens to be `with` cannot flip it.
///
/// `tls` joins them because it reads and writes one certificate directory and
/// starts no server: `--port`, `--upstream-base-url` and `--routing-mode`
/// cannot change what it does, and listing twenty such options above the three
/// that matter is what issue #312 removed from `with` (issue #308).
fn names_a_client_launcher(arguments: &[std::ffi::OsString]) -> bool {
    arguments
        .iter()
        .skip(1)
        .map(|argument| argument.to_string_lossy().into_owned())
        .find(|argument| !argument.starts_with('-'))
        .is_some_and(|argument| argument == "with" || argument == "configure" || argument == "tls")
}

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
// `router` is the canonical name — what the project, its repository and its
// documentation call this tool (issue #222). It is pinned here rather than
// taken from `argv[0]` so `--version` reads the same whichever of the two
// installed names was invoked.
#[command(
    name = "router",
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
    #[arg(long, env = "VERBOSE", global = true, value_parser = parse_truthy)]
    pub verbose: bool,

    /// JWT signing secret (or `TOKEN_SECRET` env).
    #[arg(long, env = "TOKEN_SECRET", global = true, hide_env_values = true)]
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

    /// Treat this directory as the home for every client configuration root,
    /// instead of `$HOME` and the clients' own override variables.
    ///
    /// Global, like `--data-dir`. Declared on the `clients` subcommand it had
    /// to precede it — `clients list --home /tmp` was an error while
    /// `clients --home /tmp list` worked, for one flag and not its neighbour
    /// (issue #314).
    #[arg(long, value_name = "DIR", global = true)]
    pub home: Option<PathBuf>,

    /// Path to the local Claude CLI binary used by the CLI backend.
    #[arg(long, env = "CLAUDE_CLI_BIN", global = true)]
    pub claude_cli_bin: Option<PathBuf>,
    /// Path to the local Codex CLI binary used by credential recovery.
    #[arg(long, env = "CODEX_CLI_BIN", global = true)]
    pub codex_cli_bin: Option<PathBuf>,

    /// Upstream provider: auto, anthropic, codex, gemini, qwen, gonka, crater,
    /// or openai-compatible.
    #[arg(long, env = "UPSTREAM_PROVIDER", default_value = "auto", global = true)]
    pub upstream_provider: String,

    /// Gonka private key used for request signing.
    #[arg(long, env = "GONKA_PRIVATE_KEY", global = true, hide_env_values = true)]
    pub gonka_private_key: Option<String>,

    /// Gonka source node URL.
    #[arg(
        long,
        env = "GONKA_SOURCE_URL",
        default_value = "https://node4.gonka.ai",
        global = true
    )]
    pub gonka_source_url: String,

    /// Optional Gonka model declared by the operator and used when omitted.
    #[arg(long, env = "GONKA_MODEL", default_value = "", global = true)]
    pub gonka_model: String,

    /// Upstream model used when an Anthropic-dialect request is bridged to a
    /// non-Anthropic upstream (e.g. Claude Code against the Codex provider).
    #[arg(long, env = "ANTHROPIC_BRIDGE_MODEL", global = true)]
    pub bridge_model: Option<String>,

    /// How to pick a bridge model from the live catalog when `--bridge-model`
    /// is unset: `first-advertised` (default) or `last-advertised`.
    #[arg(long, env = "BRIDGE_MODEL_POLICY", global = true)]
    pub bridge_model_policy: Option<String>,

    /// Append one JSON line per authorised request to this file, recording the
    /// router token id and label. Disabled when unset.
    #[arg(long, env = "AUDIT_LOG", global = true)]
    pub audit_log: Option<PathBuf>,

    /// Redacted log of complete client and upstream exchanges, one record
    /// per line in links notation. Defaults to `DATA_DIR/requests`.
    #[arg(long, env = "REQUEST_LOG", global = true)]
    pub request_log: Option<PathBuf>,

    /// Maximum size of each token's request log; oldest complete records are
    /// discarded. Applies per token, so the store's total is this bound times
    /// the number of tokens with recorded traffic — cap that with
    /// `--request-log-max-total-bytes`.
    #[arg(
        long,
        env = "REQUEST_LOG_MAX_BYTES",
        default_value_t = crate::request_log::DEFAULT_MAX_BYTES,
        global = true
    )]
    pub request_log_max_bytes: u64,

    /// Maximum size of the whole request log across every token; the least
    /// recently written token directories are removed first. `0` disables the
    /// total cap.
    #[arg(
        long,
        env = "REQUEST_LOG_MAX_TOTAL_BYTES",
        default_value_t = crate::request_log::DEFAULT_MAX_TOTAL_BYTES,
        global = true
    )]
    pub request_log_max_total_bytes: u64,

    /// Maximum request body accepted by proxy surfaces. Independent of the
    /// request-log capture bound.
    #[arg(
        long,
        env = "MAX_PROXY_REQUEST_BYTES",
        default_value_t = crate::config::DEFAULT_MAX_PROXY_REQUEST_BYTES,
        global = true
    )]
    pub max_proxy_request_bytes: usize,

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
    #[arg(
        long,
        env = "OPENAI_COMPATIBLE_API_KEY",
        global = true,
        hide_env_values = true
    )]
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

    /// Canonical managed clients supported by this provider adapter.
    #[arg(
        long,
        env = "OPENAI_COMPATIBLE_SUPPORTED_CLIENTS",
        value_delimiter = ',',
        global = true
    )]
    pub openai_compatible_supported_clients: Vec<String>,

    /// Public base URL for the `ActivityPub` actor.
    #[arg(long, env = "ACTIVITYPUB_ACTOR_BASE_URL", global = true)]
    pub activitypub_actor_base_url: Option<String>,

    /// Public key PEM advertised by the `ActivityPub` actor.
    #[arg(long, env = "ACTIVITYPUB_PUBLIC_KEY_PEM", global = true)]
    pub activitypub_public_key_pem: Option<String>,

    /// Disable the OpenAI-compatible API surface.
    #[arg(
        long,
        env = "DISABLE_OPENAI_API",
        global = true,
        value_parser = parse_truthy
    )]
    pub disable_openai_api: bool,

    /// Disable the Anthropic (direct) proxy surface.
    #[arg(
        long,
        env = "DISABLE_ANTHROPIC_API",
        global = true,
        value_parser = parse_truthy
    )]
    pub disable_anthropic_api: bool,

    /// Disable `/api/management/metrics`, `/api/management/usage` and
    /// `/api/management/accounts` endpoints.
    #[arg(
        long,
        env = "DISABLE_METRICS",
        global = true,
        value_parser = parse_truthy
    )]
    pub disable_metrics: bool,

    /// Expose only neutral health and AI inference/catalog routes on the main
    /// listener. Management, GitHub/Git, and `ActivityPub` routes are omitted.
    #[arg(
        long,
        env = "INFERENCE_ONLY",
        global = true,
        num_args = 0..=1,
        default_value_t = false,
        default_missing_value = "true",
        value_parser = parse_truthy
    )]
    pub inference_only: bool,

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
    #[arg(
        long,
        env = "EXPERIMENTAL_COMPATIBILITY",
        global = true,
        value_parser = parse_truthy
    )]
    pub experimental_compatibility: bool,

    /// Risk-accept one exact consumer-subscription bridge (CLIENT:PROVIDER).
    #[arg(
        long = "allow-subscription-bridge",
        env = "SUBSCRIPTION_BRIDGE_OVERRIDES",
        value_delimiter = ',',
        global = true
    )]
    pub subscription_bridge_overrides: Vec<String>,

    /// Flat bootstrap Bearer key accepted by the admin endpoints alongside
    /// admin-scoped `la_sk_...` tokens.
    #[arg(long, env = "TOKEN_ADMIN_KEY", global = true, hide_env_values = true)]
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

    /// Leave the admin endpoints (`/api/management/tokens*`,
    /// `/api/management/providers*`, `/api/management/login*`) open to
    /// unauthenticated callers.
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
        value_parser = parse_truthy
    )]
    pub allow_anonymous_admin: bool,

    /// Telegram Bot API token. Unset keeps the Telegram admin channel off;
    /// setting it starts an outbound long-polling bot that accepts admin
    /// commands in private chats only.
    #[arg(
        long,
        env = "TELEGRAM_BOT_TOKEN",
        global = true,
        hide_env_values = true
    )]
    pub telegram_bot_token: Option<String>,

    /// VK community access token. Unset keeps the VK admin channel off.
    #[arg(long, env = "VK_BOT_TOKEN", global = true, hide_env_values = true)]
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
    #[arg(long, env = "MPP_ENABLE", global = true, value_parser = parse_truthy)]
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

    /// Disable the interactive login API (`/api/management/login`).
    #[arg(
        long,
        env = "DISABLE_LOGIN_API",
        global = true,
        value_parser = parse_truthy
    )]
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
    ///
    /// Acts on the selected server when there is one: the deployment answers
    /// these over its admin API, so managing a remote router's tokens no
    /// longer means `ssh` or a hand-written `curl` (issues #293, #294).
    Tokens {
        #[command(subcommand)]
        op: TokenOp,
    },
    /// Account-management subcommands.
    ///
    /// Acts on the selected server when there is one (issue #294).
    Accounts {
        #[command(subcommand)]
        op: AccountOp,
    },
    /// Provider-management subcommands.
    ///
    /// Acts on the selected server when there is one (issue #294).
    Providers {
        #[command(subcommand)]
        op: ProviderOp,
    },
    /// Inspect and manage local agentic CLI configuration.
    ///
    /// `router configure <client>` is the command for pointing a client at the
    /// router; these read and remove what is there (issue #296).
    Clients {
        #[command(subcommand)]
        op: ClientOp,
    },
    /// Launch an agentic CLI against this router, keeping its own configuration.
    ///
    /// Isolation stopped being the default in issue #277, and this line went on
    /// saying the opposite twelve lines above the flag that says so — the
    /// document contradicted itself before the options began (issue #312).
    ///
    /// Everything after the client name is passed to the client verbatim;
    /// router options go before it (issue #299).
    With(WithArgs),
    /// Point a client at the router permanently.
    ///
    /// One name, one targeting rule and one reversal for what used to be two
    /// commands that disagreed on the address, the credential, the undo
    /// mechanism and the client list (issue #296). `clients setup` and
    /// `with --global` still work.
    Configure(ConfigureArgs),
    /// Select and manage the server used by `with`.
    Server {
        #[command(subcommand)]
        op: ServerOp,
    },
    /// Obtain or inspect vendor subscription credentials.
    Auth {
        #[command(subcommand)]
        op: AuthOp,
    },
    /// Show remaining limits for subscriptions available to a client token.
    Usage {
        /// Public subscription provider name.
        #[arg(value_enum)]
        provider: Option<crate::subscription_usage::UsageProvider>,
        /// Emit the stable machine-readable Router response.
        #[arg(long)]
        json: bool,
        #[command(flatten)]
        target: AuthTarget,
    },
    /// Print environment + config diagnostics.
    ///
    /// Reports on the machine it runs on, so it stays local: the files, config
    /// and credentials it inspects are this machine's. With another router
    /// selected it says so and names it rather than describing local state as
    /// though it were the target (issue #294).
    Doctor {
        #[command(flatten)]
        target: AuthTarget,
    },
    /// TLS certificate management for a self-signed deployment.
    Tls {
        #[command(subcommand)]
        op: TlsOp,
    },
    /// Summarise the request log and flag anomalies.
    ///
    /// The log is the router's only record of what actually happened, and it
    /// had to be read with one-liners invented on the spot — which produced
    /// confident wrong answers in both directions (issue #234).
    Logs {
        #[command(subcommand)]
        op: LogsOp,
    },
}

/// What to ask of the request log.
#[derive(Debug, Subcommand)]
pub enum LogsOp {
    /// Shape of the log: exchanges, records, statuses, time span, size.
    Summary {
        /// Restrict to one token's log directory, by its hashed name.
        ///
        /// Named `--token-id` because `--token` means a credential in `with`,
        /// `server use` and `clients setup`, and one flag name meaning two
        /// things is what makes a CLI unusable from memory (issue #314). The
        /// old spelling is still accepted.
        #[arg(long = "token-id", alias = "token", value_name = "HASHED_NAME")]
        token: Option<String>,
        /// Emit JSON, for a monitoring check rather than a human.
        #[arg(long)]
        json: bool,
        #[command(flatten)]
        target: AuthTarget,
    },
    /// Anomalies worth a name, with the correlation ids to inspect.
    ///
    /// Exits non-zero when any are found, so it works as a health gate.
    Anomalies {
        /// Restrict to one token's log directory, by its hashed name.
        #[arg(long = "token-id", alias = "token", value_name = "HASHED_NAME")]
        token: Option<String>,
        /// Emit JSON, for a monitoring check rather than a human.
        #[arg(long)]
        json: bool,
        #[command(flatten)]
        target: AuthTarget,
    },
    /// One exchange, decoded and in order.
    Show {
        correlation_id: String,
        /// Restrict to one token's log directory, by its hashed name.
        #[arg(long = "token-id", alias = "token", value_name = "HASHED_NAME")]
        token: Option<String>,
        #[command(flatten)]
        target: AuthTarget,
    },
}

/// Authorization-flow override. `auto` selects the provider's supported flow.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, ValueEnum)]
pub enum AuthFlow {
    /// Select the best supported flow automatically.
    #[default]
    Auto,
    /// OAuth device authorization (only when advertised by the provider).
    Device,
    /// Copy/paste authorization code flow.
    Code,
    /// Local OAuth callback listener.
    Loopback,
    /// Disposable vendor CLI compatibility flow.
    Cli,
}

/// OAuth flows implemented by the Claude authorization command.
pub const CLAUDE_AUTH_FLOWS: [AuthFlow; 3] = [AuthFlow::Auto, AuthFlow::Code, AuthFlow::Cli];

/// OAuth flows implemented by the Codex authorization command.
pub const CODEX_AUTH_FLOWS: [AuthFlow; 3] = [AuthFlow::Auto, AuthFlow::Device, AuthFlow::Loopback];

fn auth_flow_parser(flows: &'static [AuthFlow]) -> impl TypedValueParser<Value = AuthFlow> {
    PossibleValuesParser::new(flows.iter().filter_map(ValueEnum::to_possible_value)).map(|value| {
        AuthFlow::from_str(&value, false)
            .unwrap_or_else(|_| unreachable!("possible-values parser returned an unknown flow"))
    })
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
        let codex_home = crate::subscription::SubscriptionProvider::Codex
            .resolve_home(&std::env::var("HOME").unwrap_or_else(|_| "/root".to_string()));
        let api_format = self
            .api_format
            .as_deref()
            .map(|value| ApiFormat::from_str_opt(value).ok_or(ConfigError::InvalidApiFormat))
            .transpose()?;
        let routing_mode =
            RoutingMode::from_str_opt(&self.routing_mode).ok_or(ConfigError::InvalidRoutingMode)?;
        let upstream_provider = UpstreamProvider::from_str_opt(&self.upstream_provider)
            .ok_or(ConfigError::InvalidUpstreamProvider)?;
        let storage_policy = StoragePolicy::from_str_opt(&self.storage_policy)
            .ok_or(ConfigError::InvalidStoragePolicy)?;
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
                    "{}/api/services/activitypub/actor/code",
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
            supported_clients: self.openai_compatible_supported_clients.clone(),
        };
        Config::build(BuildArgs {
            host: &self.host,
            port: &port,
            token_secret: token_secret.as_deref(),
            claude_code_home: &claude_home,
            upstream_base_url: &self.upstream_base_url,
            verbose: self.verbose,
            max_proxy_request_bytes: self.max_proxy_request_bytes,
            api_format,
            routing_mode,
            storage_policy,
            data_dir,
            claude_cli_bin: self.claude_cli_bin.clone(),
            codex_cli_bin: self.codex_cli_bin.clone(),
            upstream_provider,
            gonka_private_key: self.gonka_private_key.clone().filter(|s| !s.is_empty()),
            gonka_source_url: self.gonka_source_url.clone(),
            gonka_model: self.gonka_model.clone(),
            bridge_model: self.bridge_model.clone().filter(|s| !s.is_empty()),
            bridge_model_policy: self.bridge_model_policy.clone(),
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
            inference_only: self.inference_only,
            additional_account_dirs: self.additional_account_dirs.clone(),
            account_routing_strategy,
            account_cooldown_secs: self.account_cooldown_secs,
            session_affinity_ttl_secs: self.session_affinity_ttl_secs,
            account_request_limits: self.account_request_limits.clone(),
            experimental_compatibility: self.experimental_compatibility,
            subscription_bridge_overrides: self.subscription_bridge_overrides.clone(),
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
                codex_home,
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
#[path = "cli_tests.rs"]
mod tests;
