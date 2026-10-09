//! Policy access, persistence and model eligibility for an account pool.
use super::{AccountRouter, RoutingContext, SelectionStrategy};
use crate::account_routing_policy::AccountRoutingPolicy;

impl AccountRouter {
    /// Whether this pool needs opt-in request policy processing.
    #[must_use]
    pub fn has_routing_policy(&self) -> bool {
        self.inner.force_model_prefix
            || self.inner.strategy == SelectionStrategy::WeightedRoundRobin
            || self.inner.accounts.iter().any(|a| {
                a.policy()
                    .as_ref()
                    .ok()
                    .is_none_or(|p| *p != AccountRoutingPolicy::default())
            })
    }

    /// Return the policy for a named account. Malformed files are never silently defaulted.
    pub fn routing_policy(&self, account: &str) -> Result<AccountRoutingPolicy, String> {
        let account = self
            .inner
            .accounts
            .iter()
            .find(|a| a.name == account)
            .ok_or_else(|| format!("unknown account {account}"))?;
        account.policy().clone()
    }

    /// Validate, atomically persist and immediately install a complete replacement policy.
    pub fn set_routing_policy(
        &self,
        account: &str,
        policy: AccountRoutingPolicy,
    ) -> Result<(), String> {
        let account = self
            .inner
            .accounts
            .iter()
            .find(|a| a.name == account)
            .ok_or_else(|| format!("unknown account {account}"))?;
        // Selection takes weights before reading policies; updates use the same lock order.
        let mut weights = self
            .inner
            .weights
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        if policy.prefix.as_ref().is_some_and(|prefix| {
            self.inner.accounts.iter().any(|other| {
                other.name != account.name
                    && other
                        .policy()
                        .as_ref()
                        .is_ok_and(|p| p.prefix.as_ref() == Some(prefix))
            })
        }) {
            return Err("model prefixes must be unique within the account pool".into());
        }
        let mut current = account
            .routing_policy
            .write()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        policy.save(&account.home)?;
        *current = Ok(policy);
        drop(current);
        weights.fill(0);
        drop(weights);
        Ok(())
    }

    pub(crate) fn inner_failover_enabled(&self) -> bool {
        self.inner.failover
    }

    pub(crate) fn serves_upstream_model(&self, name: &str, model: &str) -> bool {
        self.inner
            .accounts
            .iter()
            .find(|a| a.name == name)
            .is_some_and(|a| {
                a.serves(&RoutingContext {
                    model: Some(model.to_string()),
                    ..RoutingContext::default()
                })
            })
    }

    /// Whether unprefixed requests exclude accounts with a configured prefix.
    #[must_use]
    pub fn force_model_prefix(&self) -> bool {
        self.inner.force_model_prefix
    }

    /// Resolve one account's client-facing model, enforcing exclusive prefix routing.
    #[must_use]
    pub fn upstream_model(&self, account: &str, model: &str) -> Option<String> {
        let policy = self.routing_policy(account).ok()?;
        let selected_prefix = self.inner.accounts.iter().find_map(|a| {
            let policy = a.policy();
            let prefix = policy.as_ref().ok()?.prefix.clone()?;
            drop(policy);
            model.strip_prefix(&format!("{prefix}/")).map(|_| prefix)
        });
        if selected_prefix.as_ref().is_some_and(|prefix| {
            self.inner
                .accounts
                .iter()
                .filter(|a| {
                    a.policy()
                        .as_ref()
                        .is_ok_and(|p| p.prefix.as_ref() == Some(prefix))
                })
                .count()
                > 1
        }) {
            return None;
        }
        if selected_prefix
            .as_ref()
            .is_some_and(|prefix| policy.prefix.as_ref() != Some(prefix))
        {
            return None;
        }
        policy.resolve_model(model, self.inner.force_model_prefix)
    }

    pub(super) fn policy_serves(&self, index: usize, context: &RoutingContext) -> bool {
        let account = &self.inner.accounts[index];
        let Ok(policy) = account.policy().clone() else {
            return false;
        };
        if self.inner.strategy == SelectionStrategy::WeightedRoundRobin && policy.weight <= 0 {
            return false;
        }
        let scoped = crate::account_policy_scope::current();
        let model = scoped
            .as_ref()
            .and_then(|s| s.context.model.as_deref())
            .or(context.model.as_deref());
        model.is_none_or(|model| self.upstream_model(&account.name, model).is_some())
    }
}
