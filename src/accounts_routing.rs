//! Session selection and mutable routing controls.
use super::{
    AccountError, AccountRouter, AccountState, AffinityBinding, CmpOrdering, Instant, Ordering,
    RoutingContext, SelectionMode, SelectionStrategy,
};

impl AccountRouter {
    pub(super) fn selection_plan(
        &self,
        context: &RoutingContext,
    ) -> Result<(Vec<usize>, SelectionMode), AccountError> {
        if self.inner.accounts.is_empty() {
            return Err(AccountError::NoAccountsConfigured);
        }
        if let Some(pin) = context.pinned_account.as_deref() {
            let Some(index) = self.inner.accounts.iter().position(|a| a.name == pin) else {
                return Err(AccountError::UnknownPinnedAccount(pin.to_string()));
            };
            // A token-pinned account never falls back, failover or not.
            if context.exclude.iter().any(|tried| tried == pin) {
                return Err(AccountError::PinnedAccountUnavailable(pin.to_string()));
            }
            return Ok((vec![index], SelectionMode::Pinned));
        }
        if let Some(index) = self.context_account(context) {
            self.bind_session(context, index);
            if !self.inner.failover || self.inner.accounts[index].serves(context) {
                return Ok((vec![index], SelectionMode::Session));
            }
            // Failover: serve the session elsewhere for now, but keep (and
            // refresh) its binding so it returns once the account recovers.
            return Ok((self.failover_order(Some(index)), SelectionMode::Detour));
        }
        if !context.exclude.is_empty() {
            return Ok((self.failover_order(None), SelectionMode::Automatic));
        }
        let mut indices: Vec<usize> = (0..self.inner.accounts.len()).collect();
        match self.strategy() {
            SelectionStrategy::RoundRobin => {
                let start = self.inner.cursor.fetch_add(1, Ordering::Relaxed) % indices.len();
                indices.rotate_left(start);
            }
            SelectionStrategy::Priority => {}
            SelectionStrategy::LeastUsed => indices.sort_by(|left, right| {
                Self::compare_usage(&self.inner.accounts[*left], &self.inner.accounts[*right])
            }),
        }
        Ok((indices, SelectionMode::Automatic))
    }

    /// Failover candidates, rotated by a dedicated cursor so concurrent
    /// failovers from one account spread across the others instead of all
    /// landing on the next one in priority order.
    pub(super) fn failover_order(&self, skip: Option<usize>) -> Vec<usize> {
        let mut indices: Vec<usize> = (0..self.inner.accounts.len())
            .filter(|index| Some(*index) != skip)
            .collect();
        if !indices.is_empty() {
            let start = self.inner.failover_cursor.fetch_add(1, Ordering::Relaxed) % indices.len();
            indices.rotate_left(start);
        }
        indices
    }

    /// The account a session is currently bound to, if any.
    #[must_use]
    pub fn session_account(&self, context: &RoutingContext) -> Option<String> {
        let index = self.context_account(context)?;
        Some(self.inner.accounts[index].name.clone())
    }

    pub(super) fn bind_selected(
        &self,
        context: &RoutingContext,
        mode: SelectionMode,
        index: usize,
    ) {
        if !matches!(mode, SelectionMode::Detour) {
            self.bind_session(context, index);
        }
    }

    pub(super) fn compare_usage(left: &AccountState, right: &AccountState) -> CmpOrdering {
        let left_used = left.used.load(Ordering::Relaxed);
        let right_used = right.used.load(Ordering::Relaxed);
        match (left.request_limit, right.request_limit) {
            (Some(left_limit), Some(right_limit)) => left_used
                .saturating_mul(right_limit)
                .cmp(&right_used.saturating_mul(left_limit))
                .then_with(|| left_used.cmp(&right_used)),
            // Prefer measurable quota headroom; unknown quotas remain eligible
            // as a fallback instead of being treated as unlimited.
            (Some(_), None) => CmpOrdering::Less,
            (None, Some(_)) => CmpOrdering::Greater,
            (None, None) => left_used.cmp(&right_used),
        }
    }

    pub(super) fn bound_account(&self, session: &str) -> Option<usize> {
        if self.inner.session_affinity_ttl.is_zero() {
            return None;
        }
        let now = Instant::now();
        let mut affinities = self
            .inner
            .affinities
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        affinities.retain(|_, binding| binding.expires_at > now);
        affinities.get(session).map(|binding| binding.account_index)
    }

    pub(super) fn bind_session(&self, context: &RoutingContext, account_index: usize) {
        let Some(session) = context.session_key.as_ref() else {
            return;
        };
        if self.inner.session_affinity_ttl.is_zero() {
            return;
        }
        let mut affinities = self
            .inner
            .affinities
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        affinities.insert(
            session.clone(),
            AffinityBinding {
                account_index,
                expires_at: Instant::now() + self.inner.session_affinity_ttl,
            },
        );
    }
}
