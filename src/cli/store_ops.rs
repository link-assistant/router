//! `tokens`, `accounts` and `providers` subcommands.
//!
//! Split from `cli.rs` to keep that file within the repository's 1000-line
//! limit.

use std::path::PathBuf;

use clap::Subcommand;

use super::AuthTarget;

#[derive(Debug, Subcommand)]
pub enum TokenOp {
    /// Issue a new token and print it to stdout.
    ///
    /// `create` and `add` are accepted too: creating something was `tokens
    /// issue`, `providers add` and `clients setup` — three verbs for one idea
    /// (issue #314).
    #[command(alias = "create", alias = "add")]
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
        /// Cap on actual input plus output tokens reported by upstreams.
        /// Omit for unlimited spend.
        #[arg(long)]
        max_tokens: Option<u64>,
        /// Maximum requests admitted per one-minute window.
        #[arg(long)]
        rate_limit_per_minute: Option<u64>,
        /// Issue an administrative token (`scope: admin`) that unlocks the
        /// admin endpoints instead of only the inference proxy.
        #[arg(long)]
        admin: bool,
        /// Restrict this token's GitHub proxy access to `owner/repo`. Repeat
        /// for several repositories; omit for unrestricted access, which is
        /// the default and what every existing token keeps.
        #[arg(long = "github-repo", value_name = "OWNER/REPO")]
        github_repo: Vec<String>,
        #[command(flatten)]
        target: AuthTarget,
    },
    /// Replace a token, preserving its controls, and revoke the old token.
    Rotate {
        /// Subject id (`sub`) of the token being replaced.
        id: String,
        #[arg(long, default_value_t = 24)]
        ttl_hours: i64,
        #[arg(long, default_value = "")]
        label: String,
        /// Replacement request cap; omitted keeps the existing one.
        #[arg(long)]
        max_requests: Option<u64>,
        /// Replacement token spend cap; omitted keeps the existing one.
        #[arg(long)]
        max_tokens: Option<u64>,
        /// Replacement per-minute request rate; omitted keeps the existing one.
        #[arg(long)]
        rate_limit_per_minute: Option<u64>,
        /// Replacement account pin; omitted keeps the existing one.
        #[arg(long)]
        account: Option<String>,
        #[command(flatten)]
        target: AuthTarget,
    },
    /// List all known tokens.
    List {
        /// Emit JSON instead of the table.
        ///
        /// Every `list` printed a table unconditionally and every `show`
        /// printed JSON unconditionally, so neither could be asked for the
        /// other form — and `--json` existed on two subcommands only
        /// (issue #314).
        #[arg(long)]
        json: bool,
        #[command(flatten)]
        target: AuthTarget,
    },
    /// Revoke a token by id.
    ///
    /// `remove` and `delete` are accepted too: destroying something was
    /// `providers remove`, `clients remove`, `server remove`, `tokens revoke`
    /// and `tokens expire` (issue #314).
    #[command(alias = "remove", alias = "delete")]
    Revoke {
        id: String,
        #[command(flatten)]
        target: AuthTarget,
    },
    /// Revoke a token by id — an alias of `revoke`, kept for scripts.
    ///
    /// Both arms have always collapsed into the same call and printed
    /// `revoked <ID>`, while the help promised a distinct operation
    /// (issue #314). It is documented as the alias it is.
    Expire {
        id: String,
        #[command(flatten)]
        target: AuthTarget,
    },
    /// Show metadata for one token.
    Show {
        id: String,
        /// Accepted for symmetry with `list`: `show` already emits JSON, so
        /// this changes nothing (issue #314). A script should not have to know
        /// which verb of a family takes the flag.
        #[arg(long)]
        json: bool,
        #[command(flatten)]
        target: AuthTarget,
    },
}

#[derive(Debug, Subcommand)]
pub enum AccountOp {
    /// List configured accounts and their health.
    List {
        /// Emit JSON instead of the table (issue #314).
        #[arg(long)]
        json: bool,
        #[command(flatten)]
        target: AuthTarget,
    },
}

#[derive(Debug, Subcommand)]
// Keeping `AuthTarget` flattened preserves clap's public flag layout. Boxing
// only the largest variant would leak an implementation detail into every
// constructor and test for a command enum created once per process.
#[allow(clippy::large_enum_variant)]
pub enum ProviderOp {
    /// List configured upstream providers.
    List {
        /// Emit JSON instead of the table (issue #314).
        #[arg(long)]
        json: bool,
        #[command(flatten)]
        target: AuthTarget,
    },
    /// Add or replace an API provider or policy-gated credential class.
    ///
    /// `create` and `issue` are accepted too (issue #314).
    #[command(alias = "create", alias = "issue")]
    Add {
        /// Name this provider is referred to by, in routing and in `providers
        /// show`. Adding an existing name replaces that record.
        #[arg(long)]
        name: String,
        /// Wire protocol the upstream speaks.
        #[arg(long, default_value = "openai-compatible")]
        kind: String,
        /// The upstream's own base URL — not the router's. `--server` names
        /// the router; this names the machine it forwards to (issue #314).
        #[arg(long)]
        base_url: String,
        /// Single model this provider serves, for an upstream that serves one.
        #[arg(long)]
        model: Option<String>,
        /// Comma-separated models this provider serves.
        #[arg(long, value_delimiter = ',')]
        models: Vec<String>,
        /// Canonical managed clients explicitly supported by this ordinary
        /// provider adapter. Repeat or comma-separate values.
        #[arg(long = "supported-client", value_delimiter = ',')]
        supported_clients: Vec<String>,
        /// Vendor API key, stored encrypted under the deployment's
        /// `TOKEN_SECRET`.
        ///
        /// Prefer `--api-key-stdin`: a key given here is visible in shell
        /// history and in `ps` (issue #314).
        #[arg(long, hide_env_values = true, conflicts_with = "api_key_stdin")]
        api_key: Option<String>,
        /// Read the vendor API key as one line from standard input.
        ///
        /// The one secret in this tool that could travel only through argv,
        /// while every other has had a stdin form and `clients setup --help`
        /// warns against argv for exactly this reason (issue #314).
        #[arg(long, conflicts_with = "api_key")]
        api_key_stdin: bool,
        /// Environment variable the *router process* reads the key from at
        /// request time, instead of storing one.
        #[arg(long)]
        api_key_env: Option<String>,
        /// Single subscriber allowed to spend a personal Coding Plan key.
        #[arg(long)]
        subscriber_id: Option<String>,
        /// Accept the documented account risk of intermediary personal proxying.
        #[arg(long)]
        acknowledge_intermediary_risk: bool,
        /// Individually risk-accept a known tool not listed by z.ai.
        #[arg(long, value_delimiter = ',')]
        acknowledge_unsupported_client: Vec<String>,
        /// Whether this provider takes part in routing. Disabled records are
        /// kept and ignored, so one can be parked without deleting it.
        #[arg(
            long,
            default_value_t = true,
            num_args = 0..=1,
            default_missing_value = "true"
        )]
        enabled: bool,
        #[command(flatten)]
        target: AuthTarget,
    },
    /// Show one provider with secret material redacted.
    Show {
        name: String,
        /// Accepted for symmetry with `list`: `show` already emits JSON, so
        /// this changes nothing (issue #314). A script should not have to know
        /// which verb of a family takes the flag.
        #[arg(long)]
        json: bool,
        #[command(flatten)]
        target: AuthTarget,
    },
    /// Remove one provider.
    ///
    /// `revoke` and `delete` are accepted too (issue #314).
    #[command(alias = "revoke", alias = "delete")]
    Remove {
        name: String,
        #[command(flatten)]
        target: AuthTarget,
    },
    /// Import providers from JSON, `.lenv`, or indented Links-style config.
    Import {
        path: PathBuf,
        #[command(flatten)]
        target: AuthTarget,
    },
}
