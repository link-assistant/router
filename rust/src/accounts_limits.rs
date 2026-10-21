//! Vendor rate-limit state applied to the account pool (issue #677).
//!
//! [`crate::account_limits`] decides what a response's unified headers mean;
//! this module applies those decisions to the pool's accounts, persists them,
//! and exposes manual pause/resume.

use std::collections::BTreeMap;
use std::fmt::Write as _;
use std::time::{Duration, Instant};

use axum::http::HeaderMap;

use super::{AccountError, AccountRouter};
use crate::account_limits::{
    AccountLimitState, LimitScope, Pause, PauseKind, ThresholdDecision, WindowLimit, now_unix,
};

/// The longest a window reading waits to be saved; a cooldown or pause is
/// saved at once.
const LIMITS_SAVE_INTERVAL_SECS: u64 = 60;

/// One upstream response, as the pool needs to see it.
pub struct UpstreamObservation<'a> {
    pub account: &'a str,
    /// The requested model, for model-scoped cooldowns.
    pub model: Option<&'a str>,
    pub status: u16,
    pub headers: &'a HeaderMap,
    /// The (bounded) response body; only read for a rejection's message.
    pub body: &'a [u8],
    /// The parsed `Retry-After`, if any.
    pub retry_after: Option<Duration>,
}

/// What [`AccountRouter::observe_upstream`] did, for logging and metrics.
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct ObservedLimits {
    /// The whole account was cooled down.
    pub credential_cooldown: bool,
    /// Only this model key was cooled down.
    pub model_cooldown: Option<String>,
    /// A threshold pause began.
    pub paused: bool,
}

/// Pool-wide counts for `/metrics` and `router usage`. Aggregate only: the
/// metrics surface must not name accounts.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub struct LimitCounts {
    pub cooling_down: usize,
    pub paused: usize,
    pub model_cooldowns: usize,
}

impl LimitCounts {
    /// Pool gauges in Prometheus exposition format. Counts only: `/metrics`
    /// is unauthenticated and must not name accounts.
    #[must_use]
    pub fn render_prometheus(&self) -> String {
        let mut out = String::new();
        for (name, help, value) in [
            (
                "link_assistant_pool_accounts_cooling_down",
                "Pooled accounts currently cooling down.",
                self.cooling_down,
            ),
            (
                "link_assistant_pool_accounts_paused",
                "Pooled accounts paused manually or by ACCOUNT_PAUSE_AT_PERCENT.",
                self.paused,
            ),
            (
                "link_assistant_pool_model_cooldowns",
                "Model-scoped cooldowns active across the pool.",
                self.model_cooldowns,
            ),
        ] {
            let _ = writeln!(
                out,
                "# HELP {name} {help}\n# TYPE {name} gauge\n{name} {value}"
            );
        }
        out
    }
}

impl AccountRouter {
    /// Whether this pool was built with pre-first-byte failover on.
    #[must_use]
    pub fn failover_enabled(&self) -> bool {
        self.inner.failover && !crate::account_policy_scope::active()
    }

    fn account_index(&self, name: &str) -> Option<usize> {
        self.inner.accounts.iter().position(|a| a.name == name)
    }

    /// Load persisted vendor cooldowns and pauses, so a restart neither
    /// forgets a weekly limit nor resumes a manually paused account.
    pub(super) fn restore_limits(&self) {
        let Some(dir) = self.inner.state_dir.as_deref() else {
            return;
        };
        for (name, state) in crate::account_limits::load(dir, self.provider().as_str()) {
            let Some(index) = self.account_index(&name) else {
                continue;
            };
            *self.inner.accounts[index].limits() = state;
        }
    }

    pub(super) fn persist_limits(&self) {
        let Some(dir) = self.inner.state_dir.as_deref() else {
            return;
        };
        let now = now_unix();
        self.inner
            .limits_saved_unix
            .store(now, std::sync::atomic::Ordering::Relaxed);
        let accounts = self
            .inner
            .accounts
            .iter()
            .map(|account| {
                let mut state = account.limits().clone();
                state.expire(now);
                (account.name.clone(), state)
            })
            .collect::<BTreeMap<_, _>>();
        crate::account_limits::save(dir, self.provider().as_str(), &accounts);
    }

    /// Apply what one upstream response said about its account.
    ///
    /// - A `429` cools the account (or one model on it — see
    ///   [`crate::account_limits::classify_scope`]) until the longest rejected
    ///   window resets. Without a usable reset the existing
    ///   `Retry-After`/default cooldown applies. Authentication failures cool the
    ///   entire credential. A served response never cools its account from
    ///   window headers alone: an account drawing
    ///   on paid overage reports `rejected` on answers it still gives.
    /// - Utilization readings drive `ACCOUNT_PAUSE_AT_PERCENT`.
    ///
    /// Every response is observed, `count_tokens` included: it carries the
    /// same headers and is often the first to see a limit.
    pub fn observe_upstream(&self, observed: &UpstreamObservation<'_>) -> ObservedLimits {
        let Some(index) = self.account_index(observed.account) else {
            return ObservedLimits::default();
        };
        if self.inner.accounts[index].uses_unpooled_defaults() {
            return ObservedLimits::default();
        }
        let limits = crate::account_limits::parse_unified(observed.headers);
        let now = now_unix();
        let mut outcome = ObservedLimits::default();
        let relayed = crate::account_policy_scope::current().is_some_and(|s| {
            *s.last_action
                .lock()
                .unwrap_or_else(std::sync::PoisonError::into_inner)
                == Some(crate::account_routing_policy::ErrorAction::Relay)
        });
        let rejected = matches!(observed.status, 401 | 403 | 429)
            && !relayed
            && !self.inner.accounts[index]
                .policy()
                .as_ref()
                .is_ok_and(|p| p.disable_cooling);
        {
            let mut state = self.inner.accounts[index].limits();
            state.expire(now);
            if !limits.windows.is_empty() {
                state.windows.clone_from(&limits.windows);
            }
        }
        if rejected {
            let fallback = observed
                .retry_after
                .map(crate::request_routing::bounded_retry_after)
                .map_or(self.inner.cooldown, |retry| retry.max(self.inner.cooldown))
                .min(self.inner.max_cooldown);
            let until = crate::account_limits::rejected_until(&limits, now)
                .unwrap_or_else(|| now.saturating_add(fallback.as_secs()))
                .min(now.saturating_add(self.inner.max_cooldown.as_secs()));
            let scope = if matches!(observed.status, 401 | 403) {
                LimitScope::Credential
            } else {
                crate::account_limits::classify_scope(&limits, observed.body, observed.model)
            };
            match scope {
                LimitScope::Model(key) => {
                    self.inner.accounts[index].limits().cool_model(&key, until);
                    self.record_error(index, &format!("upstream rate-limited model {key}"));
                    outcome.model_cooldown = Some(key);
                }
                LimitScope::Credential => {
                    let reason = format!("upstream returned {}", observed.status);
                    self.inner.accounts[index]
                        .limits()
                        .cool_credential(until, &reason);
                    self.record_error(index, &reason);
                    outcome.credential_cooldown = true;
                }
            }
            tracing::debug!(
                account = observed.account,
                model = observed.model,
                until,
                credential_cooldown = outcome.credential_cooldown,
                "observed upstream cooldown"
            );
        }
        outcome.paused = self.apply_threshold(index, &limits.windows, now);
        let readings_due = !limits.windows.is_empty()
            && now
                >= self
                    .inner
                    .limits_saved_unix
                    .load(std::sync::atomic::Ordering::Relaxed)
                    .saturating_add(LIMITS_SAVE_INTERVAL_SECS);
        if rejected || outcome.paused || readings_due {
            self.persist_limits();
        }
        outcome
    }

    /// Feed one account's windows from a usage probe (`router usage`) into the
    /// threshold pause. `used_percentage` arrives as a percent, `resets_at` as
    /// an RFC 3339 time.
    pub fn observe_usage_windows(&self, account: &str, windows: &[WindowLimit]) {
        let Some(index) = self.account_index(account) else {
            return;
        };
        if self.apply_threshold(index, windows, now_unix()) {
            self.persist_limits();
        }
    }

    /// Returns whether a threshold pause began or ended.
    fn apply_threshold(&self, index: usize, windows: &[WindowLimit], now: u64) -> bool {
        let Some(percent) = self.inner.pause_at_percent else {
            return false;
        };
        let mut state = self.inner.accounts[index].limits();
        match crate::account_limits::threshold_decision(windows, percent, now) {
            ThresholdDecision::Pause { until_unix, window } => {
                // A manual pause outranks a threshold one.
                if state
                    .pause
                    .as_ref()
                    .is_some_and(|pause| pause.kind == PauseKind::Manual)
                {
                    return false;
                }
                let changed = state
                    .pause
                    .as_ref()
                    .is_none_or(|pause| pause.until_unix != Some(until_unix));
                state.pause = Some(Pause {
                    kind: PauseKind::Threshold,
                    until_unix: Some(until_unix),
                    reason: format!("{window} window at or above {percent}%"),
                });
                changed
            }
            ThresholdDecision::Clear
                if state
                    .pause
                    .as_ref()
                    .is_some_and(|pause| pause.kind == PauseKind::Threshold) =>
            {
                state.pause = None;
                true
            }
            ThresholdDecision::Clear | ThresholdDecision::Ignore => false,
        }
    }

    /// Pause an account by hand. `until_unix` of `None` lasts until
    /// [`Self::resume`].
    pub fn pause(
        &self,
        account: &str,
        until_unix: Option<u64>,
        reason: &str,
    ) -> Result<(), AccountError> {
        let index = self
            .account_index(account)
            .ok_or_else(|| AccountError::UnknownAccount(account.to_string()))?;
        self.inner.accounts[index].limits().pause = Some(Pause {
            kind: PauseKind::Manual,
            until_unix,
            reason: reason.to_string(),
        });
        self.persist_limits();
        Ok(())
    }

    /// Lift a manual or threshold pause. Returns whether one was active.
    pub fn resume(&self, account: &str) -> Result<bool, AccountError> {
        let index = self
            .account_index(account)
            .ok_or_else(|| AccountError::UnknownAccount(account.to_string()))?;
        let was_paused = self.inner.accounts[index].limits().pause.take().is_some();
        self.persist_limits();
        Ok(was_paused)
    }

    /// The current vendor-limit state of every account, expired entries
    /// dropped.
    #[must_use]
    pub fn limit_states(&self) -> Vec<(String, AccountLimitState)> {
        let now = now_unix();
        self.inner
            .accounts
            .iter()
            .map(|account| {
                let mut state = account.limits().clone();
                state.expire(now);
                (account.name.clone(), state)
            })
            .collect()
    }

    /// Aggregate counts for metrics and the usage pool.
    #[must_use]
    pub fn limit_counts(&self) -> LimitCounts {
        let now = now_unix();
        let mut counts = LimitCounts::default();
        for account in &self.inner.accounts {
            let mut state = account.limits().clone();
            state.expire(now);
            let cooling = account
                .cooldown_until
                .lock()
                .unwrap_or_else(std::sync::PoisonError::into_inner)
                .is_some_and(|until| until > Instant::now());
            counts.cooling_down +=
                usize::from(cooling || state.cooldown_until_unix.is_some_and(|until| until > now));
            counts.paused += usize::from(state.paused_at(now));
            counts.model_cooldowns += state.model_cooldowns.len();
        }
        counts
    }
}
