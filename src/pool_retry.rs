//! Retry rounds bounded by credential count, wait interval and failover budget.

use std::time::{Duration, Instant};

use crate::accounts::{AccountRouter, RoutingContext};

/// Optional additional failover rounds and their credential/wait bounds.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct RetryPolicy {
    /// Additional rounds; zero preserves the existing single-round behaviour.
    pub rounds: u32,
    /// Credentials tried in each round; zero uses the failover attempt bound.
    pub max_credentials: u32,
    /// Longest cooldown wait accepted between rounds.
    pub max_interval: Duration,
}

impl Default for RetryPolicy {
    fn default() -> Self {
        Self {
            rounds: 0,
            max_credentials: 0,
            max_interval: Duration::from_secs(30),
        }
    }
}

pub(crate) struct RetryBudget {
    policy: RetryPolicy,
    round: u32,
    per_round: u32,
    pub(crate) max_attempts: u32,
}

impl RetryBudget {
    pub(crate) fn new(router: Option<&AccountRouter>, failover: bool, attempts: u32) -> Self {
        let policy = if failover {
            router.map_or_else(RetryPolicy::default, AccountRouter::retry_policy)
        } else {
            RetryPolicy::default()
        };
        let per_round = if failover {
            attempts.max(1).min(if policy.max_credentials == 0 {
                u32::MAX
            } else {
                policy.max_credentials
            })
        } else {
            1
        };
        Self {
            policy,
            round: 0,
            per_round,
            max_attempts: per_round.saturating_mul(policy.rounds.min(16) + 1),
        }
    }

    pub(crate) const fn round_full(&self, context: &RoutingContext) -> bool {
        context.exclude.len() >= self.per_round as usize
    }

    pub(crate) const fn rounds_used(&self) -> u32 {
        self.round
    }

    pub(crate) fn consume_rounds(&mut self, rounds: u32) {
        self.round = rounds.min(self.policy.rounds.min(16));
        self.max_attempts = self
            .per_round
            .saturating_mul(self.policy.rounds.min(16) - self.round + 1);
    }

    pub(crate) async fn next_round(
        &mut self,
        router: Option<&AccountRouter>,
        context: &mut RoutingContext,
        deadline: Instant,
    ) -> bool {
        if self.round >= self.policy.rounds.min(16) {
            return false;
        }
        let Some(delay) = router.and_then(|router| router.retry_delay(context)) else {
            return false;
        };
        if delay > self.policy.max_interval
            || deadline.saturating_duration_since(Instant::now()) <= delay
        {
            return false;
        }
        tracing::debug!(
            round = self.round + 1,
            wait_ms = delay.as_millis(),
            "waiting for an account retry round"
        );
        tokio::time::sleep(delay).await;
        if Instant::now() >= deadline {
            return false;
        }
        self.round += 1;
        context.exclude.clear();
        true
    }
}
