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
    reader: Option<SubscriptionReader>,
    selection: CredentialSelection,
    requires_live_catalog: bool,
}

#[derive(Debug, Clone)]
enum CredentialSelection {
    /// A single-account credential captured during model routing.
    Ready {
        store: Arc<dyn CredentialStore>,
        baseline: SubscriptionToken,
        selected: Box<SelectedSubscriptionAccount>,
    },
    /// The request's authenticated routing context must select the account.
    AccountPool,
}

impl ValidatedSubscription {
    /// Return the validated token only while the credential document still
    /// describes the same snapshot.
    ///
    /// If another holder rotates the file before dispatch, fail closed. If it
    /// rotates after this comparison, dispatch still uses `selected.token`, so
    /// the new account can never be substituted for the catalog owner.
    pub(crate) async fn for_dispatch(&self) -> Result<SelectedSubscriptionAccount, String> {
        let CredentialSelection::Ready {
            store,
            baseline,
            selected,
        } = &self.selection
        else {
            return Err(format!(
                "the {} account pool requires request routing context",
                self.provider
            ));
        };
        let current = reload_store_locked(store, self.provider).await?;
        // An endpoint may issue a new access token without rotating the refresh
        // link. That access token is intentionally cached rather than written,
        // so the pre-refresh baseline remains acceptable. A rotated Codex link
        // is written, but its response-derived expiry is not part of Codex's
        // durable format; compare every credential/routing field while ignoring
        // only that provider-specific lossy representation.
        if !durably_equivalent(self.provider, &current, baseline)
            && !durably_equivalent(self.provider, &current, &selected.token)
        {
            return Err(format!(
                "the {} credential changed after its model catalog was validated; retry after discovery completes",
                self.provider
            ));
        }
        Ok(selected.as_ref().clone())
    }

    /// Resolve a deferred account pool once authentication has supplied strict
    /// pins and stable session metadata, then validate that selected account's
    /// registered durable store before dispatch.
    pub(crate) async fn for_dispatch_with_context(
        &self,
        state: &AppState,
        context: &crate::accounts::RoutingContext,
    ) -> Result<SelectedSubscriptionAccount, String> {
        if matches!(self.selection, CredentialSelection::Ready { .. }) {
            return self.for_dispatch().await;
        }
        let router = state
            .account_router
            .as_ref()
            .filter(|router| router.provider() == self.provider)
            .ok_or_else(|| format!("no {} account pool is configured", self.provider))?;
        let selected = router
            .select_subscription(context)
            .map_err(|error| error.to_string())?;
        let snapshot =
            subscription_snapshot_for_account(state, self.provider, &selected.name, None).await?;
        let catalog = state.model_catalogs.status(self.provider);
        if self.requires_live_catalog && (!catalog.discovered || !catalog.credential_healthy) {
            return Err(format!(
                "the {} model catalog is not currently routable",
                self.provider
            ));
        }
        let selected_token = snapshot
            .selected_token()
            .expect("an account snapshot is immediately ready");
        if catalog.discovered && !catalog_belongs_to(selected_token, catalog.account.as_deref()) {
            return Err(format!(
                "the discovered {} catalog belongs to a different account",
                self.provider
            ));
        }
        snapshot.for_dispatch().await
    }

    const fn selected_token(&self) -> Option<&SubscriptionToken> {
        match &self.selection {
            CredentialSelection::Ready { selected, .. } => Some(&selected.token),
            CredentialSelection::AccountPool => None,
        }
    }

    const fn uses_account_pool(&self) -> bool {
        matches!(self.selection, CredentialSelection::AccountPool)
    }
}

fn durably_equivalent(
    provider: SubscriptionProvider,
    current: &SubscriptionToken,
    expected: &SubscriptionToken,
) -> bool {
    current == expected
        || (provider == SubscriptionProvider::Codex
            && current.access_token == expected.access_token
            && current.refresh_token == expected.refresh_token
            && current.account_id == expected.account_id
            && current.resource_url == expected.resource_url)
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
async fn subscription_snapshot_for_account(
    state: &AppState,
    provider: SubscriptionProvider,
    account: &str,
    reader: Option<SubscriptionReader>,
) -> Result<ValidatedSubscription, String> {
    // Do not replace a data-directory-backed recovery decorator with the raw
    // vendor reader. `register_reader` is insert-if-absent.
    if let Some(reader) = reader.as_ref() {
        state.subscription_cache.register_reader(account, reader);
    }
    let store = state
        .subscription_cache
        .store_for_subscription(provider, account)
        .ok_or_else(|| format!("no durable {provider} credential store is registered"))?;
    let baseline = reload_store_locked(&store, provider).await?;
    // `reload_store_locked` has released the store lock. A refresh may now
    // acquire that same lock without recursively deadlocking.
    let token = state
        .subscription_cache
        .get_fresh_for(
            &state.client,
            provider,
            account,
            baseline.clone(),
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
        selection: CredentialSelection::Ready {
            store,
            baseline,
            selected: Box::new(SelectedSubscriptionAccount {
                name: account.to_string(),
                token,
            }),
        },
        requires_live_catalog: false,
    })
}

fn account_pool_matches(state: &AppState, provider: SubscriptionProvider) -> bool {
    state
        .account_router
        .as_ref()
        .is_some_and(|router| router.provider() == provider)
}

async fn subscription_candidate(
    state: &AppState,
    provider: SubscriptionProvider,
    requires_live_catalog: bool,
) -> Result<ValidatedSubscription, String> {
    if account_pool_matches(state, provider) {
        return Ok(ValidatedSubscription {
            provider,
            reader: None,
            selection: CredentialSelection::AccountPool,
            requires_live_catalog,
        });
    }
    let reader = state
        .subscription_readers
        .iter()
        .find(|reader| reader.provider() == provider)
        .cloned()
        .ok_or_else(|| format!("no {provider} credential reader is configured"))?;
    let mut subscription = subscription_snapshot_for_account(
        state,
        provider,
        crate::credential_recovery_store::PRIMARY_ACCOUNT,
        Some(reader),
    )
    .await?;
    subscription.requires_live_catalog = requires_live_catalog;
    Ok(subscription)
}

async fn validated_catalog_subscription(
    state: &AppState,
    provider: SubscriptionProvider,
) -> Option<ValidatedSubscription> {
    let catalog = state.model_catalogs.status(provider);
    if !catalog.discovered || !catalog.credential_healthy {
        return None;
    }
    let subscription = subscription_candidate(state, provider, true).await.ok()?;
    if subscription
        .selected_token()
        .is_some_and(|token| !catalog_belongs_to(token, catalog.account.as_deref()))
    {
        return None;
    }
    Some(subscription)
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
    // A matching pool is intentionally retained until authentication supplies
    // its strict pin/session context. Every other route already captured one
    // concrete account, so a later pool lookup must not replace it.
    if !subscription.uses_account_pool() {
        routed.account_router = None;
    }
    if let Some(reader) = subscription.reader.clone() {
        routed.subscription_reader = Some(reader);
    }
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
    // Consult catalogs before credential stores. Vendor-shaped and unique ids
    // need exactly one provider; only a genuinely ambiguous unqualified id
    // needs multiple independent snapshots, which run concurrently.
    let candidates = SubscriptionProvider::ALL
        .into_iter()
        .filter(|provider| {
            state
                .model_catalogs
                .models(*provider)
                .iter()
                .any(|candidate| candidate == model)
        })
        .collect::<Vec<_>>();
    let has_catalog_candidate = !candidates.is_empty();
    let relevant = super::provider_for_model(model, &state.model_catalogs)
        .map_or(candidates, |provider| vec![provider]);
    let validated = futures_util::future::join_all(
        relevant
            .into_iter()
            .map(|provider| validated_catalog_subscription(state, provider)),
    )
    .await
    .into_iter()
    .flatten()
    .collect::<Vec<_>>();
    let healthy = if has_catalog_candidate {
        validated
            .iter()
            .map(|subscription| subscription.provider)
            .collect::<Vec<_>>()
    } else {
        // Preserve the existing wrong-id guidance without paying the lock and
        // refresh cost for providers that cannot serve this request. This
        // health view is local-only and still applies catalog ownership.
        super::configured_provider_health(
            &state.subscription_readers,
            &state.subscription_cache,
            &state.model_catalogs,
        )
        .into_iter()
        .filter(|entry| entry.state == super::ProviderHealthState::Healthy)
        .map(|entry| entry.provider)
        .collect()
    };
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
    if !account_pool_matches(state, provider)
        && !state
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
    let subscription = subscription_candidate(state, provider, false)
        .await
        .map_err(ModelRouteError::NotFound)?;
    if catalog.discovered
        && subscription
            .selected_token()
            .is_some_and(|token| !catalog_belongs_to(token, catalog.account.as_deref()))
    {
        return Err(ModelRouteError::NotFound(format!(
            "the discovered {provider} catalog belongs to a different account"
        )));
    }
    Ok(routed_subscription_state(state, subscription, None))
}
