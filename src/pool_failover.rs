//! Account-pool failover and pool policy (issues #676 and #677).
//!
//! With `POOL_FAILOVER=pre-first-byte` a pooled request whose upstream answers
//! `429`, `529`, a retryable `5xx`, a transport error, or `401` after a failed
//! refresh is sent again on the next eligible account — but only before any
//! byte of the response reached the client. Once a response is relayed it is
//! never retried, so a client never sees two partial streams.
//!
//! This module holds the policy and the pure decisions; the dispatch loop
//! lives with the proxy. Defaults keep the historical behaviour: failover off,
//! no threshold pause, no warmup interception.

use std::time::Duration;

use serde_json::Value;

use crate::accounts::AccountRouterOptions;

/// Default bound on upstream attempts per request, the first included.
pub const DEFAULT_MAX_ATTEMPTS: u32 = 3;
/// Default bound on the time spent across every attempt of one request.
pub const DEFAULT_BUDGET_SECS: u64 = 30;

/// `POOL_FAILOVER`.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub enum FailoverMode {
    /// Never retry on another account (the historical behaviour).
    #[default]
    Off,
    /// Retry on another account until the first response byte is relayed.
    PreFirstByte,
}

impl FailoverMode {
    /// Parse `off` or `pre-first-byte` (case-insensitive; `_` accepted).
    ///
    /// # Errors
    ///
    /// Returns an operator-facing message for any other value.
    pub fn parse(value: &str) -> Result<Self, String> {
        match value.trim().to_ascii_lowercase().replace('_', "-").as_str() {
            "" | "off" | "false" | "0" | "none" => Ok(Self::Off),
            "pre-first-byte" => Ok(Self::PreFirstByte),
            other => Err(format!("expected 'off' or 'pre-first-byte', got '{other}'")),
        }
    }

    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Off => "off",
            Self::PreFirstByte => "pre-first-byte",
        }
    }
}

/// Pool behaviour shared by the proxy, `doctor` and the account router.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct PoolPolicy {
    pub failover: FailoverMode,
    /// Upstream attempts per request, the first included (at least one).
    pub max_attempts: u32,
    /// Wall-clock bound across every attempt of one request.
    pub budget: Duration,
    /// `ACCOUNT_PAUSE_AT_PERCENT`: pause an account once a vendor window is at
    /// or above this utilization, until the window resets.
    pub pause_at_percent: Option<u8>,
    /// `INTERCEPT_WARMUP`: answer Claude Code's "Warmup" probe locally.
    pub intercept_warmup: bool,
}

impl Default for PoolPolicy {
    fn default() -> Self {
        Self {
            failover: FailoverMode::Off,
            max_attempts: DEFAULT_MAX_ATTEMPTS,
            budget: Duration::from_secs(DEFAULT_BUDGET_SECS),
            pause_at_percent: None,
            intercept_warmup: false,
        }
    }
}

impl PoolPolicy {
    /// Read the policy from the environment; an invalid value keeps its
    /// default and is logged.
    #[must_use]
    pub fn from_env() -> Self {
        let defaults = Self::default();
        let var = |name: &str| std::env::var(name).ok().filter(|v| !v.trim().is_empty());
        let failover = var("POOL_FAILOVER").map_or(defaults.failover, |value| {
            FailoverMode::parse(&value).unwrap_or_else(|error| {
                tracing::warn!("POOL_FAILOVER ignored: {error}");
                defaults.failover
            })
        });
        Self {
            failover,
            max_attempts: var("POOL_FAILOVER_MAX_ATTEMPTS")
                .and_then(|value| value.trim().parse::<u32>().ok())
                .map_or(defaults.max_attempts, |n| n.max(1)),
            budget: var("POOL_FAILOVER_BUDGET_SECS")
                .and_then(|value| value.trim().parse::<u64>().ok())
                .map_or(defaults.budget, Duration::from_secs),
            pause_at_percent: var("ACCOUNT_PAUSE_AT_PERCENT")
                .and_then(|value| parse_percent(&value).ok()),
            intercept_warmup: var("INTERCEPT_WARMUP").is_some_and(|value| {
                matches!(
                    value.trim().to_ascii_lowercase().as_str(),
                    "1" | "true" | "yes" | "on"
                )
            }),
        }
    }

    /// Whether pre-first-byte failover is on.
    #[must_use]
    pub fn failover_enabled(&self) -> bool {
        self.failover == FailoverMode::PreFirstByte
    }

    /// One `doctor` line per setting.
    #[must_use]
    pub fn doctor_lines(&self) -> String {
        format!(
            "pool failover           : {} (max attempts {}, budget {}s)\n\
             account pause threshold : {}\n\
             warmup interception     : {}\n",
            self.failover.as_str(),
            self.max_attempts,
            self.budget.as_secs(),
            self.pause_at_percent
                .map_or_else(|| "off".to_string(), |percent| format!("{percent}%")),
            if self.intercept_warmup { "on" } else { "off" },
        )
    }
}

/// The policy the serving process runs with. A process-wide setting, like the
/// upstream network guard: handlers read it without threading it through
/// every state literal.
static INSTALLED: std::sync::RwLock<Option<PoolPolicy>> = std::sync::RwLock::new(None);

/// Install the serving process's policy (from `main`, or a test harness).
pub fn install(policy: PoolPolicy) {
    *INSTALLED
        .write()
        .unwrap_or_else(std::sync::PoisonError::into_inner) = Some(policy);
}

/// The installed policy, or the defaults when none was installed.
#[must_use]
pub fn current() -> PoolPolicy {
    INSTALLED
        .read()
        .unwrap_or_else(std::sync::PoisonError::into_inner)
        .clone()
        .unwrap_or_default()
}

/// Parse `ACCOUNT_PAUSE_AT_PERCENT` (1..=100).
///
/// # Errors
///
/// Returns an operator-facing message for anything else.
pub fn parse_percent(value: &str) -> Result<u8, String> {
    value
        .trim()
        .trim_end_matches('%')
        .parse::<u8>()
        .ok()
        .filter(|percent| (1..=100).contains(percent))
        .ok_or_else(|| format!("expected a percentage from 1 to 100, got '{value}'"))
}

impl crate::config::Config {
    /// The account-router options this configuration asks for. One helper so
    /// the server and `router accounts` build the pool the same way.
    #[must_use]
    pub fn account_router_options(&self) -> AccountRouterOptions {
        AccountRouterOptions {
            strategy: self.account_routing_strategy,
            cooldown: Duration::from_secs(self.account_cooldown_secs),
            session_affinity_ttl: Duration::from_secs(self.session_affinity_ttl_secs),
            request_limits: self
                .account_request_limits
                .iter()
                .map(|limit| (*limit != 0).then_some(*limit))
                .collect(),
            failover: self.pool.failover_enabled(),
            pause_at_percent: self.pool.pause_at_percent,
            state_dir: Some(self.data_dir.clone()),
        }
    }
}

/// Why an attempt may be retried on another account.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum RetryReason {
    RateLimited,
    Overloaded,
    ServerError,
    Unauthorized,
    Transport,
}

impl RetryReason {
    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::RateLimited => "rate_limited",
            Self::Overloaded => "overloaded",
            Self::ServerError => "server_error",
            Self::Unauthorized => "unauthorized",
            Self::Transport => "transport",
        }
    }
}

/// Whether an upstream status justifies trying another account.
///
/// `401` is listed because the proxy only sees one after the refresh it already
/// attempted failed; `501` and other `5xx` that describe the request rather than
/// the account are not retried.
#[must_use]
pub const fn classify_status(status: u16) -> Option<RetryReason> {
    match status {
        429 => Some(RetryReason::RateLimited),
        529 => Some(RetryReason::Overloaded),
        500 | 502 | 503 | 504 => Some(RetryReason::ServerError),
        401 => Some(RetryReason::Unauthorized),
        _ => None,
    }
}

/// Remove Claude `thinking` and `redacted_thinking` blocks from assistant history.
///
/// Their signatures are bound to the account that produced them, so
/// another account rejects the whole request. Returns whether anything was
/// removed.
pub fn strip_anthropic_thinking(body: &mut Value) -> bool {
    let Some(messages) = body.get_mut("messages").and_then(Value::as_array_mut) else {
        return false;
    };
    let mut removed = false;
    for message in messages {
        let Some(content) = message.get_mut("content").and_then(Value::as_array_mut) else {
            continue;
        };
        let before = content.len();
        content.retain(|block| {
            !matches!(
                block.get("type").and_then(Value::as_str),
                Some("thinking" | "redacted_thinking")
            )
        });
        removed |= content.len() != before;
    }
    removed
}

/// Remove Codex reasoning items that carry `encrypted_content`: it can only be
/// decrypted by the account that produced it. Returns whether anything was
/// removed.
pub fn strip_codex_encrypted_reasoning(body: &mut Value) -> bool {
    let Some(input) = body.get_mut("input").and_then(Value::as_array_mut) else {
        return false;
    };
    let before = input.len();
    input.retain(|item| {
        !(item.get("type").and_then(Value::as_str) == Some("reasoning")
            && item.get("encrypted_content").is_some())
    });
    input.len() != before
}

#[cfg(test)]
#[path = "pool_failover_tests.rs"]
mod tests;
