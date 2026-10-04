//! Account-pool failover, threshold pause and warmup flags (issues #676, #677).

use super::value_parsers::parse_truthy;
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

    /// Upstream attempts per request under pool failover, the first included.
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
}

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
        }
    }
}
