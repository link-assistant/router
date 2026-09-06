//! Request-local credential snapshots for model routing and dispatch.

use std::sync::Arc;

use crate::accounts::SelectedSubscriptionAccount;
use crate::app_state::AppState;
use crate::config::UpstreamProvider;
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
    required_model: Option<String>,
}

#[derive(Debug, Clone)]
enum CredentialSelection {
    /// A single-account credential captured during model routing.
    Ready {
        cache: Arc<crate::refresh::TokenCache>,
        account: String,
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
            cache,
            account,
            baseline,
            selected,
        } = &self.selection
        else {
            return Err(format!(
                "the {} account pool requires request routing context",
                self.provider
            ));
        };
        let current = cache
            .load_authoritative(self.provider, account)
            .await?
            .ok_or_else(|| {
                format!(
                    "failed to reload {} credentials from the registered store",
                    self.provider
                )
            })?;
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
        self.bind_for_context(state, context)
            .await?
            .for_dispatch()
            .await
    }

    /// Bind a deferred pool to exactly one account before model selection.
    ///
    /// The returned snapshot makes every later dispatch use that same account
    /// and credential generation; it cannot advance round-robin a second time.
    pub(crate) async fn bind_for_context(
        &self,
        state: &AppState,
        context: &crate::accounts::RoutingContext,
    ) -> Result<Self, String> {
        if matches!(self.selection, CredentialSelection::Ready { .. }) {
            return Ok(self.clone());
        }
        let router = state
            .account_router
            .as_ref()
            .filter(|router| router.provider() == self.provider)
            .ok_or_else(|| format!("no {} account pool is configured", self.provider))?;
        let selected = router
            .select_subscription_where_authoritative(
                context,
                &state.subscription_cache,
                |account| {
                    if !self.requires_live_catalog {
                        return true;
                    }
                    let catalog = state.model_catalogs.status_for(self.provider, account);
                    catalog.discovered
                        && catalog.credential_healthy
                        && self
                            .required_model
                            .as_ref()
                            .is_none_or(|model| catalog.routable_models().contains(model))
                        && state
                            .subscription_cache
                            .evidence_for(self.provider, account)
                            != Some(crate::refresh::CredentialEvidence::Rejected)
                },
            )
            .await
            .map_err(|error| error.to_string())?;
        let mut snapshot =
            subscription_snapshot_for_account(state, self.provider, &selected.name, None).await?;
        snapshot.requires_live_catalog = self.requires_live_catalog;
        snapshot.required_model.clone_from(&self.required_model);
        let catalog = state
            .model_catalogs
            .status_for(self.provider, &selected.name);
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
        Ok(snapshot)
    }

    /// Bind a deferred or already-resolved subscription to the account that
    /// owns a durable native resource, while retaining the model-catalog
    /// requirements captured during routing.
    pub(crate) async fn bind_to_account(
        &self,
        state: &AppState,
        account: &str,
    ) -> Result<Self, String> {
        if self.account_name() == Some(account) {
            return Ok(self.clone());
        }
        let mut snapshot =
            subscription_snapshot_for_account(state, self.provider, account, None).await?;
        snapshot.requires_live_catalog = self.requires_live_catalog;
        snapshot.required_model.clone_from(&self.required_model);
        let catalog = state.model_catalogs.status_for(self.provider, account);
        if self.requires_live_catalog
            && (!catalog.discovered
                || !catalog.credential_healthy
                || self
                    .required_model
                    .as_ref()
                    .is_some_and(|model| !catalog.routable_models().contains(model)))
        {
            return Err(format!(
                "the {} resource account cannot serve the requested model",
                self.provider
            ));
        }
        let selected_token = snapshot
            .selected_token()
            .expect("an exact account snapshot is immediately ready");
        if catalog.discovered && !catalog_belongs_to(selected_token, catalog.account.as_deref()) {
            return Err(format!(
                "the discovered {} catalog belongs to a different account",
                self.provider
            ));
        }
        Ok(snapshot)
    }

    /// Router account selected for this request-local credential snapshot.
    pub(crate) fn account_name(&self) -> Option<&str> {
        match &self.selection {
            CredentialSelection::Ready { account, .. } => Some(account),
            CredentialSelection::AccountPool => None,
        }
    }

    pub(crate) const fn selected_token(&self) -> Option<&SubscriptionToken> {
        match &self.selection {
            CredentialSelection::Ready { selected, .. } => Some(&selected.token),
            CredentialSelection::AccountPool => None,
        }
    }

    pub(crate) const fn uses_account_pool(&self) -> bool {
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
    let baseline = state
        .subscription_cache
        .load_authoritative(provider, account)
        .await?
        .ok_or_else(|| {
            format!("failed to load {provider} credentials from the registered store")
        })?;
    // `load_authoritative` has released the store lock. A refresh may now
    // acquire that same lock without recursively deadlocking.
    let token = state
        .subscription_cache
        .get_fresh_loaded(
            &state.client,
            provider,
            account,
            baseline.clone(),
            chrono::Utc::now().timestamp_millis(),
        )
        .await?;
    if state.subscription_cache.evidence_for(provider, account)
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
            cache: Arc::clone(&state.subscription_cache),
            account: account.to_string(),
            baseline,
            selected: Box::new(SelectedSubscriptionAccount {
                name: account.to_string(),
                token,
            }),
        },
        requires_live_catalog: false,
        required_model: None,
    })
}

fn account_pool_matches(state: &AppState, provider: SubscriptionProvider) -> bool {
    state
        .account_router
        .as_ref()
        .is_some_and(|router| router.provider() == provider)
}

/// Catalog/evidence-only view for wrong-model guidance.
///
/// No credential can make an id absent from every catalog routable, so this
/// path must not wait on durable credential locks merely to compose an error.
fn local_routing_catalog(
    state: &AppState,
) -> (
    crate::model_catalog::ModelCatalogCache,
    Vec<SubscriptionProvider>,
) {
    let catalog = crate::model_catalog::ModelCatalogCache::new();
    let mut healthy = Vec::new();
    for provider in SubscriptionProvider::ALL {
        let accounts = state
            .account_router
            .as_ref()
            .filter(|router| router.provider() == provider)
            .map_or_else(
                || {
                    if state
                        .subscription_readers
                        .iter()
                        .any(|reader| reader.provider() == provider)
                    {
                        vec![crate::credential_recovery_store::PRIMARY_ACCOUNT.to_string()]
                    } else {
                        Vec::new()
                    }
                },
                |router| {
                    router
                        .subscription_readers()
                        .into_iter()
                        .map(|(account, _)| account)
                        .collect::<Vec<_>>()
                },
            );
        let mut provider_healthy = false;
        for account in accounts {
            let status = state.model_catalogs.status_for(provider, &account);
            if status.discovered
                && status.credential_healthy
                && state.subscription_cache.evidence_for(provider, &account)
                    != Some(crate::refresh::CredentialEvidence::Rejected)
            {
                provider_healthy = true;
                catalog.record_records_for_account(
                    provider,
                    &account,
                    status.account,
                    status.records,
                );
            }
        }
        if provider_healthy {
            healthy.push(provider);
        }
    }
    (catalog, healthy)
}

async fn subscription_candidate(
    state: &AppState,
    provider: SubscriptionProvider,
    requires_live_catalog: bool,
    required_model: Option<&str>,
) -> Result<ValidatedSubscription, String> {
    if account_pool_matches(state, provider) {
        return Ok(ValidatedSubscription {
            provider,
            reader: None,
            selection: CredentialSelection::AccountPool,
            requires_live_catalog,
            required_model: required_model.map(str::to_string),
        });
    }
    let reader = state
        .subscription_readers
        .iter()
        .find(|reader| reader.provider() == provider)
        .cloned()
        .or_else(|| {
            state
                .subscription_reader
                .as_ref()
                .filter(|reader| reader.provider() == provider)
                .cloned()
        })
        .ok_or_else(|| format!("no {provider} credential reader is configured"))?;
    let mut subscription = subscription_snapshot_for_account(
        state,
        provider,
        crate::credential_recovery_store::PRIMARY_ACCOUNT,
        Some(reader),
    )
    .await?;
    subscription.requires_live_catalog = requires_live_catalog;
    subscription.required_model = required_model.map(str::to_string);
    Ok(subscription)
}

async fn validated_catalog_subscription(
    state: &AppState,
    provider: SubscriptionProvider,
    model: &str,
) -> Option<ValidatedSubscription> {
    if !account_pool_matches(state, provider) {
        let catalog = state.model_catalogs.status(provider);
        if !catalog.discovered || !catalog.credential_healthy {
            return None;
        }
    }
    let subscription = subscription_candidate(state, provider, true, Some(model))
        .await
        .ok()?;
    let catalog = state.model_catalogs.status(provider);
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
#[cfg(test)]
pub async fn route_subscription_model(
    state: &AppState,
    model: &str,
) -> Result<RoutedState, ModelRouteError> {
    route_subscription_model_for_providers(state, model, &SubscriptionProvider::ALL).await
}

/// Select a subscription model after removing providers hidden by the signed
/// client's entitlement policy.
///
/// A hidden provider must not make an id advertised to this client ambiguous.
/// When no entitled provider advertises the id, keep the global candidate so
/// the final pre-upstream policy check can return the stable 403 mismatch
/// instead of disguising it as a missing model.
pub async fn route_subscription_model_for_providers(
    state: &AppState,
    model: &str,
    entitled_providers: &[SubscriptionProvider],
) -> Result<RoutedState, ModelRouteError> {
    let (_, canonical_model) = super::subscription_model_identity(model);
    // Consult catalogs before credential stores. Vendor-shaped and unique ids
    // need exactly one provider. Colliding exact ids fail instead of gaining
    // Router-invented provider-qualified aliases.
    let all_candidates = SubscriptionProvider::ALL
        .into_iter()
        .filter(|provider| {
            state
                .model_catalogs
                .models(*provider)
                .iter()
                .any(|candidate| candidate == canonical_model)
        })
        .collect::<Vec<_>>();
    let entitled_candidates = all_candidates
        .iter()
        .copied()
        .filter(|provider| entitled_providers.contains(provider))
        .collect::<Vec<_>>();
    let candidates = if entitled_candidates.is_empty() {
        all_candidates
    } else {
        entitled_candidates
    };
    let has_catalog_candidate = !candidates.is_empty();
    if !has_catalog_candidate {
        let (catalog, healthy) = local_routing_catalog(state);
        return match available_provider_for_model(model, &healthy, &catalog) {
            Err(error) => Err(error),
            Ok(_) => unreachable!("a model absent from the complete catalog appeared locally"),
        };
    }
    if candidates.len() > 1 {
        let providers = candidates
            .iter()
            .map(ToString::to_string)
            .collect::<Vec<_>>()
            .join(", ");
        return Err(ModelRouteError::Conflict(format!(
            "exact model id '{model}' is advertised by multiple subscriptions ({providers})"
        )));
    }
    let provider = candidates[0];
    let subscription = futures_util::future::join_all(
        candidates
            .into_iter()
            .map(|provider| validated_catalog_subscription(state, provider, canonical_model)),
    )
    .await
    .into_iter()
    .flatten()
    .find(|subscription| subscription.provider == provider)
    .ok_or_else(|| {
        let cause = credential_state(provider, &state.model_catalogs)
            .unwrap_or_else(|| format!("no usable {provider} credential is available"));
        ModelRouteError::NotFound(format!(
            "model '{model}' has no healthy {provider} credential: {cause}"
        ))
    })?;
    Ok(routed_subscription_state(
        state,
        subscription,
        Some(canonical_model),
    ))
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
        && !state
            .subscription_reader
            .as_ref()
            .is_some_and(|reader| reader.provider() == provider)
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
    let subscription = subscription_candidate(state, provider, false, None)
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
