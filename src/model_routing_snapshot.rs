//! Request-local credential snapshots for model routing and dispatch.

use std::sync::Arc;

use crate::accounts::SelectedSubscriptionAccount;
use crate::app_state::AppState;
use crate::config::UpstreamProvider;
use crate::credential_store::CredentialStore;
use crate::subscription::{SubscriptionProvider, SubscriptionReader, SubscriptionToken};

use super::{ModelRouteError, available_provider_for_model, credential_state};

/// One credential snapshot whose account was checked against a live catalog.
///
/// Kept outside [`AppState`] because that exported struct is constructed by
/// downstream users. This request-local value travels beside the cloned state
/// only through internal routing and dispatch entry points.
#[derive(Debug, Clone)]
pub struct ValidatedSubscription {
    pub provider: SubscriptionProvider,
    reader: SubscriptionReader,
    store: Arc<dyn CredentialStore>,
    selected: SelectedSubscriptionAccount,
}

impl ValidatedSubscription {
    /// Return the validated token only while the credential document still
    /// describes the same snapshot.
    ///
    /// If another holder rotates the file before dispatch, fail closed. If it
    /// rotates after this comparison, dispatch still uses `selected.token`, so
    /// the new account can never be substituted for the catalog owner.
    pub(crate) async fn for_dispatch(&self) -> Result<SelectedSubscriptionAccount, String> {
        let current = reload_store_locked(&self.store, self.provider).await?;
        if current != self.selected.token {
            return Err(format!(
                "the {} credential changed after its model catalog was validated; retry after discovery completes",
                self.provider
            ));
        }
        Ok(self.selected.clone())
    }
}

/// Internal routing result carrying request-local credential evidence.
pub struct RoutedState {
    pub state: AppState,
    pub subscription: Option<ValidatedSubscription>,
}

fn catalog_belongs_to(token: &SubscriptionToken, account: Option<&str>) -> bool {
    match (token.account_id.as_deref(), account) {
        (Some(current), Some(discovered)) => current == discovered,
        (None, None) => true,
        _ => false,
    }
}

/// Reload a possibly recoverable credential while holding its exact
/// read/refresh/write transaction lock.
///
/// A recovery decorator can reconcile its sidecar into the primary credential
/// during `reload`, so this is an exclusive operation even though its name
/// sounds read-only. The guard is deliberately dropped before the caller may
/// enter `TokenCache::get_fresh`, which acquires the same lock when refreshing.
async fn reload_store_locked(
    store: &Arc<dyn CredentialStore>,
    provider: SubscriptionProvider,
) -> Result<SubscriptionToken, String> {
    let lock_path = store.lock_path().ok_or_else(|| {
        format!("no durable transaction lock is available for {provider} credentials")
    })?;
    let _guard = crate::durable_file::lock_exclusive_async(
        &lock_path,
        crate::credential_recovery_store::CREDENTIAL_LOCK_TIMEOUT,
    )
    .await
    .map_err(|error| {
        if error.kind() == std::io::ErrorKind::WouldBlock {
            format!("timed out waiting for the {provider} credential transaction lock")
        } else {
            format!("could not acquire the {provider} credential transaction lock")
        }
    })?;
    store
        .reload()
        .ok_or_else(|| format!("failed to reload {provider} credentials from the registered store"))
}

/// Capture one refreshed credential from the authoritative registered store.
async fn subscription_snapshot(
    state: &AppState,
    provider: SubscriptionProvider,
) -> Result<ValidatedSubscription, String> {
    let reader = state
        .subscription_readers
        .iter()
        .find(|reader| reader.provider() == provider)
        .cloned()
        .ok_or_else(|| format!("no {provider} credential reader is configured"))?;
    // Do not replace a data-directory-backed recovery decorator with the raw
    // vendor reader. `register_reader` is insert-if-absent.
    state
        .subscription_cache
        .register_reader(crate::credential_recovery_store::PRIMARY_ACCOUNT, &reader);
    let store = state
        .subscription_cache
        .store_for_subscription(provider, crate::credential_recovery_store::PRIMARY_ACCOUNT)
        .ok_or_else(|| format!("no durable {provider} credential store is registered"))?;
    let disk_token = reload_store_locked(&store, provider).await?;
    // `reload_store_locked` has released the store lock. A refresh may now
    // acquire that same lock without recursively deadlocking.
    let token = state
        .subscription_cache
        .get_fresh(
            &state.client,
            provider,
            disk_token,
            chrono::Utc::now().timestamp_millis(),
        )
        .await;
    if state.subscription_cache.evidence(provider)
        == Some(crate::refresh::CredentialEvidence::Rejected)
    {
        return Err(format!(
            "the {provider} credential was rejected by its upstream"
        ));
    }
    Ok(ValidatedSubscription {
        provider,
        reader,
        store,
        selected: SelectedSubscriptionAccount {
            name: crate::credential_recovery_store::PRIMARY_ACCOUNT.to_string(),
            token,
        },
    })
}

/// Read, refresh and validate each routable credential exactly once.
async fn validated_catalog_subscriptions(state: &AppState) -> Vec<ValidatedSubscription> {
    let mut validated = Vec::new();
    for provider in SubscriptionProvider::ALL {
        let Ok(subscription) = subscription_snapshot(state, provider).await else {
            continue;
        };
        let catalog = state.model_catalogs.status(provider);
        if !catalog.discovered
            || !catalog.credential_healthy
            || !catalog_belongs_to(&subscription.selected.token, catalog.account.as_deref())
        {
            continue;
        }
        validated.push(subscription);
    }
    validated
}

fn routed_subscription_state(
    state: &AppState,
    subscription: ValidatedSubscription,
    model: Option<&str>,
) -> RoutedState {
    let mut routed = state.clone();
    routed.upstream_provider = match subscription.provider {
        SubscriptionProvider::Claude => UpstreamProvider::Anthropic,
        SubscriptionProvider::Codex => UpstreamProvider::Codex,
        SubscriptionProvider::Gemini => UpstreamProvider::Gemini,
        SubscriptionProvider::Qwen => UpstreamProvider::Qwen,
    };
    // This request has already selected and validated the primary account. Do
    // not let a later pool lookup replace it with another credential.
    routed.account_router = None;
    routed.subscription_reader = Some(subscription.reader.clone());
    if subscription.provider != SubscriptionProvider::Claude
        && let Some(model) = model
    {
        // The Anthropic bridge normally substitutes its provider default
        // because pinned clients name Claude models. Auto mode selected this
        // provider from the requested model itself, so preserve that exact id.
        routed.bridge_model = Some(model.to_string());
    }
    RoutedState {
        state: routed,
        subscription: Some(subscription),
    }
}

/// Select an automatic subscription model and retain the credential evidence
/// that made its catalog routable.
pub async fn route_subscription_model(
    state: &AppState,
    model: &str,
) -> Result<RoutedState, ModelRouteError> {
    let validated = validated_catalog_subscriptions(state).await;
    let healthy = validated
        .iter()
        .map(|subscription| subscription.provider)
        .collect::<Vec<_>>();
    let provider = available_provider_for_model(model, &healthy, &state.model_catalogs)?;
    let subscription = validated
        .into_iter()
        .find(|subscription| subscription.provider == provider)
        .ok_or_else(|| {
            let cause = credential_state(provider, &state.model_catalogs)
                .unwrap_or_else(|| format!("no usable {provider} credential is available"));
            ModelRouteError::NotFound(format!(
                "model '{model}' has no healthy {provider} credential: {cause}"
            ))
        })?;
    Ok(routed_subscription_state(state, subscription, Some(model)))
}

/// Retain a pinned provider's credential while rejecting positive evidence
/// that its discovered catalog belongs to another account.
///
/// A catalog that has not yet been discovered supplies no conflicting
/// ownership evidence, so pinned cold-start passthrough remains intact.
pub async fn route_pinned_subscription(
    state: &AppState,
    provider: SubscriptionProvider,
) -> Result<RoutedState, ModelRouteError> {
    let catalog = state.model_catalogs.status(provider);
    if !state
        .subscription_readers
        .iter()
        .any(|reader| reader.provider() == provider)
    {
        if catalog.discovered && catalog.account.is_some() {
            return Err(ModelRouteError::NotFound(format!(
                "the discovered {provider} catalog owner cannot be validated without a credential reader"
            )));
        }
        // Legacy pinned Claude deployments resolve their credential through
        // OAuthProvider rather than SubscriptionReader. With no account owner
        // recorded there is no conflicting evidence to guard, so retain that
        // established cold-start path.
        return Ok(RoutedState {
            state: state.clone(),
            subscription: None,
        });
    }
    let subscription = subscription_snapshot(state, provider)
        .await
        .map_err(ModelRouteError::NotFound)?;
    if catalog.discovered
        && catalog.account.is_some()
        && !catalog_belongs_to(&subscription.selected.token, catalog.account.as_deref())
    {
        return Err(ModelRouteError::NotFound(format!(
            "the discovered {provider} catalog belongs to a different account"
        )));
    }
    Ok(routed_subscription_state(state, subscription, None))
}
