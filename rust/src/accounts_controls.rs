//! Mutable pool policy and cooldown controls.

use super::{
    AccountError, AccountRouter, Duration, Instant, Ordering, RoutingContext, SelectionStrategy,
};

impl SelectionStrategy {
    /// Canonical name accepted by the configuration and management API.
    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::RoundRobin => "round-robin",
            Self::Priority => "fill-first",
            Self::LeastUsed => "least-used",
            Self::WeightedRoundRobin => "weighted-round-robin",
        }
    }
}

impl AccountRouter {
    /// Current selection policy for unbound sessions.
    #[must_use]
    pub fn strategy(&self) -> SelectionStrategy {
        *self
            .inner
            .strategy
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner)
    }

    /// Change the policy for new sessions, preserving all existing bindings.
    pub fn set_strategy(&self, strategy: SelectionStrategy) -> SelectionStrategy {
        let mut current = self
            .inner
            .strategy
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        std::mem::replace(&mut *current, strategy)
    }

    pub(super) fn context_account(&self, context: &RoutingContext) -> Option<usize> {
        context
            .session_key
            .as_deref()
            .and_then(|session| self.bound_account(session))
            .or_else(|| {
                self.inner
                    .session_affinity_subagents
                    .then(|| {
                        context
                            .parent_session_key
                            .as_deref()
                            .and_then(|parent| self.bound_account(parent))
                    })
                    .flatten()
            })
    }

    /// Configured bounds for pre-first-byte retry rounds.
    #[must_use]
    pub fn retry_policy(&self) -> crate::pool_retry::RetryPolicy {
        self.inner.retry
    }

    /// Remove cooldowns without modifying usage counts, pauses or credentials.
    /// With `model`, only an exact model/family key is removed.
    pub fn reset_cooldowns(
        &self,
        account: Option<&str>,
        model: Option<&str>,
    ) -> Result<usize, AccountError> {
        if let Some(name) = account
            && !self
                .inner
                .accounts
                .iter()
                .any(|candidate| candidate.name == name)
        {
            return Err(AccountError::UnknownAccount(name.into()));
        }
        let mut cleared = 0;
        for candidate in &self.inner.accounts {
            if account.is_some_and(|name| candidate.name != name) {
                continue;
            }
            let mut timer = candidate
                .cooldown_until
                .lock()
                .unwrap_or_else(std::sync::PoisonError::into_inner);
            let mut state = candidate.limits();
            state.expire(crate::account_limits::now_unix());
            if let Some(model) = model {
                cleared += usize::from(
                    state
                        .model_cooldowns
                        .remove(&model.to_ascii_lowercase())
                        .is_some(),
                );
            } else {
                let active_timer = timer.is_some_and(|until| until > Instant::now());
                cleared += usize::from(state.cooldown_until_unix.is_some() || active_timer)
                    + state.model_cooldowns.len();
                *timer = None;
                drop(timer);
                state.cooldown_until_unix = None;
                state.cooldown_reason = None;
                state.model_cooldowns.clear();
            }
        }
        self.persist_limits();
        Ok(cleared)
    }

    /// Earliest eligible recovery, ignoring this round's tried credentials.
    /// Manual pauses and exhausted request caps have no timed recovery.
    pub(crate) fn retry_delay(&self, context: &RoutingContext) -> Option<Duration> {
        let now = crate::account_limits::now_unix();
        let scoped = crate::account_policy_scope::current();
        self.inner
            .accounts
            .iter()
            .filter_map(|account| {
                if context
                    .pinned_account
                    .as_deref()
                    .is_some_and(|pin| account.name != pin)
                    || account
                        .request_limit
                        .is_some_and(|limit| account.used.load(Ordering::Relaxed) >= limit)
                    || !account
                        .credential_state_with(
                            crate::operation_context::now().timestamp_millis(),
                            None,
                        )
                        .can_serve()
                {
                    return None;
                }
                let timer = account
                    .cooldown_until
                    .lock()
                    .unwrap_or_else(std::sync::PoisonError::into_inner)
                    .and_then(|until| until.checked_duration_since(Instant::now()))
                    .unwrap_or_default();
                let model = scoped
                    .as_ref()
                    .map(|scope| scope.upstream_model.clone())
                    .or_else(|| {
                        context
                            .model
                            .as_deref()
                            .and_then(|model| self.upstream_model(&account.name, model))
                    });
                let state = account.limits();
                let mut until = state.cooldown_until_unix.unwrap_or(now);
                if let Some(pause) = &state.pause {
                    until = until.max(pause.until_unix?);
                }
                if let Some(model) = model.as_deref() {
                    for (key, deadline) in &state.model_cooldowns {
                        if crate::account_limits::model_key_matches(key, model) {
                            until = until.max(*deadline);
                        }
                    }
                }
                Some(timer.max(Duration::from_secs(until.saturating_sub(now))))
            })
            .min()
    }
}
