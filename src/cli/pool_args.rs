//! Account-pool failover, threshold pause, warmup and per-account connection
//! flags (issues #676, #677, #678).

use std::collections::BTreeMap;

use super::value_parsers::parse_truthy;
use crate::account_http::{
    AccountHttpPolicy, DEFAULT_ACCOUNT_CONNECTION_MAX_AGE_SECS,
    DEFAULT_ACCOUNT_POOL_IDLE_TIMEOUT_SECS, EgressProxy, parse_egress_proxies,
};
use crate::pool_failover::{
    DEFAULT_BUDGET_SECS, DEFAULT_MAX_ATTEMPTS, FailoverMode, PoolPolicy, parse_percent,
};

/// `--pool-failover*`, `--account-pause-at-percent` and `--intercept-warmup`.
/// Every one defaults to the historical behaviour.
#[derive(clap::Args, Debug, Clone, Default)]
pub struct PoolArgs {
    /// Retry a pooled request on the next eligible account when the upstream
    /// answers 429, 529, a retryable 5xx, a transport error, or 401 after a
    /// failed refresh — only before the first response byte reaches the
    /// client. `off` (default) or `pre-first-byte`.
    #[arg(
        long,
        env = "POOL_FAILOVER",
        default_value = "off",
        value_parser = FailoverMode::parse,
        global = true
    )]
    pub pool_failover: Option<FailoverMode>,

    /// Upstream attempts per round under pool failover, the first included.
    #[arg(
        long,
        env = "POOL_FAILOVER_MAX_ATTEMPTS",
        default_value_t = DEFAULT_MAX_ATTEMPTS,
        value_parser = clap::value_parser!(u32).range(1..=16),
        global = true
    )]
    pub pool_failover_max_attempts: u32,

    /// Seconds after which pool failover stops trying further accounts.
    #[arg(
        long,
        env = "POOL_FAILOVER_BUDGET_SECS",
        default_value_t = DEFAULT_BUDGET_SECS,
        global = true
    )]
    pub pool_failover_budget_secs: u64,

    /// Additional credential retry rounds before any response body is relayed.
    #[arg(long, env = "POOL_RETRY_ROUNDS", default_value_t = 0, value_parser = clap::value_parser!(u32).range(0..=16), global = true)]
    pub pool_retry_rounds: u32,

    /// Distinct credentials per retry round; zero adds no credential cap.
    #[arg(
        long,
        env = "POOL_MAX_RETRY_CREDENTIALS",
        default_value_t = 0,
        global = true
    )]
    pub pool_max_retry_credentials: u32,

    /// Maximum seconds to wait for a cooldown between retry rounds.
    #[arg(
        long,
        env = "POOL_MAX_RETRY_INTERVAL_SECS",
        default_value_t = 30,
        global = true
    )]
    pub pool_max_retry_interval_secs: u64,

    /// Maximum observed cooldown, including vendor resets; bounded to eight days.
    #[arg(long, env = "ACCOUNT_MAX_COOLDOWN_SECS", default_value_t = crate::account_limits::MAX_VENDOR_COOLDOWN.as_secs(), global = true)]
    pub account_max_cooldown_secs: u64,

    /// Bind subagent sessions to their parent's account when it is known.
    #[arg(long, env = "SESSION_AFFINITY_SUBAGENTS", num_args = 0..=1, default_value_t = true, default_missing_value = "true", value_parser = parse_truthy, global = true)]
    pub session_affinity_subagents: bool,

    /// Pause a pooled account once a vendor rate-limit window reports this
    /// utilization percentage (1-100) or more; it resumes when the window
    /// resets. Unset never pauses.
    #[arg(
        long,
        env = "ACCOUNT_PAUSE_AT_PERCENT",
        value_parser = parse_percent,
        global = true
    )]
    pub account_pause_at_percent: Option<u8>,

    /// Answer Claude Code's "Warmup" probe locally with a synthetic message
    /// instead of spending subscription quota on it.
    #[arg(
        long,
        env = "INTERCEPT_WARMUP",
        num_args = 0..=1,
        default_value_t = false,
        default_missing_value = "true",
        value_parser = parse_truthy,
        global = true
    )]
    pub intercept_warmup: bool,

    /// Seconds an idle upstream connection of a pooled account stays open.
    /// Every account has its own connection pool. `0` keeps idle connections.
    #[arg(
        long,
        env = "ACCOUNT_POOL_IDLE_TIMEOUT_SECS",
        default_value_t = DEFAULT_ACCOUNT_POOL_IDLE_TIMEOUT_SECS,
        global = true
    )]
    pub account_pool_idle_timeout_secs: u64,

    /// Seconds after which a pooled account's upstream client is rotated, so
    /// no connection outlives it; in-flight requests finish on the old one.
    /// `0` never rotates.
    #[arg(
        long,
        env = "ACCOUNT_CONNECTION_MAX_AGE_SECS",
        default_value_t = DEFAULT_ACCOUNT_CONNECTION_MAX_AGE_SECS,
        global = true
    )]
    pub account_connection_max_age_secs: u64,

    /// Per-account egress proxies: comma-separated `ACCOUNT=SPEC`, where
    /// `ACCOUNT` is `primary`, `account-1`, ... and `SPEC` is `env:VAR` or
    /// `file:PATH` holding the proxy URL, or a password-less
    /// `http://`, `https://`, `socks5://` or `socks5h://` URL optionally
    /// followed by `;password-env=VAR` or `;password-file=PATH`. A URL
    /// carrying a password is refused so no secret reaches argv.
    #[arg(
        long,
        env = "ACCOUNT_EGRESS_PROXY",
        value_parser = parse_egress_proxies,
        global = true
    )]
    pub account_egress_proxy: Option<EgressProxies>,
}

/// Parsed `--account-egress-proxy`.
pub type EgressProxies = BTreeMap<String, EgressProxy>;

impl PoolArgs {
    /// The resolved policy.
    #[must_use]
    pub fn policy(&self) -> PoolPolicy {
        PoolPolicy {
            failover: self.pool_failover.unwrap_or_default(),
            max_attempts: self.pool_failover_max_attempts.max(1),
            budget: std::time::Duration::from_secs(self.pool_failover_budget_secs),
            pause_at_percent: self.account_pause_at_percent,
            intercept_warmup: self.intercept_warmup,
            retry: crate::pool_retry::RetryPolicy {
                rounds: self.pool_retry_rounds,
                max_credentials: self.pool_max_retry_credentials,
                max_interval: std::time::Duration::from_secs(self.pool_max_retry_interval_secs),
            },
            session_affinity_subagents: self.session_affinity_subagents,
            max_cooldown: std::time::Duration::from_secs(self.account_max_cooldown_secs)
                .min(crate::account_limits::MAX_VENDOR_COOLDOWN),
            account_http: AccountHttpPolicy::new(
                self.account_pool_idle_timeout_secs,
                self.account_connection_max_age_secs,
                self.account_egress_proxy.clone().unwrap_or_default(),
            ),
        }
    }
}
