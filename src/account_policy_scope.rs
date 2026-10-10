//! Request-local policy state. No client header can create or change this scope.
use crate::accounts::{RoutingContext, SelectedSubscriptionAccount};
use crate::app_state::AppState;
use std::sync::{Arc, Mutex};

pub struct PolicyRequest {
    pub state: AppState,
    pub headers: axum::http::HeaderMap,
    pub context: RoutingContext,
    pub upstream_model: String,
    pub retry_deadline: std::time::Instant,
    pub retry_rounds_used: u32,
    pub upstream_selector: String,
    pub model_policy: crate::model_contract::ModelAccessPolicy,
    pub last_action: Mutex<Option<crate::account_routing_policy::ErrorAction>>,
    pub selected: Mutex<SelectedSubscriptionAccount>,
    pub(crate) thinking: Mutex<Option<crate::thinking::policy::RetryControls>>,
    pub(crate) thinking_error: Mutex<Option<String>>,
}

tokio::task_local! { pub static REQUEST: Arc<PolicyRequest>; }

pub fn current() -> Option<Arc<PolicyRequest>> {
    REQUEST.try_with(Arc::clone).ok()
}
pub fn active() -> bool {
    REQUEST.try_with(|_| ()).is_ok()
}
pub fn account() -> Option<String> {
    current().map(|s| {
        s.selected
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner)
            .name
            .clone()
    })
}
pub fn preselected(context: &RoutingContext) -> Option<String> {
    context.exclude.is_empty().then(account).flatten()
}

pub fn reactive_refresh_allowed(account: &str) -> bool {
    current().is_none_or(|scope| {
        let selected = scope
            .selected
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        selected.name == account
            && scope
                .last_action
                .lock()
                .unwrap_or_else(std::sync::PoisonError::into_inner)
                .is_none()
            && scope
                .state
                .account_router
                .as_ref()
                .and_then(|router| router.routing_policy(account).ok())
                .is_some_and(|policy| policy.request_retry != Some(0))
    })
}

/// Retain the complete refreshed credential generation before its upstream attempt.
pub fn credential(account: &str, token: &crate::subscription::SubscriptionToken) {
    if let Some(scope) = current() {
        let mut selected = scope
            .selected
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        if selected.name == account {
            selected.token = token.clone();
        }
    }
}
