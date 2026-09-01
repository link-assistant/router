//! Live subscription model discovery with stale-on-error caching.

use std::collections::HashMap;
use std::sync::RwLock;
use std::time::Duration;

use serde_json::Value;

use crate::subscription::{SubscriptionProvider, SubscriptionReader, SubscriptionToken};

/// How often live provider catalogs are refreshed.
pub const CATALOG_TTL: Duration = Duration::from_secs(5 * 60);
const FETCH_TIMEOUT: Duration = Duration::from_secs(15);

/// Last known catalog state for one provider account.
///
/// Nothing here is ever seeded from source-code model names: a catalog exists
/// only once a live, authenticated discovery has succeeded for that exact
/// account (issue #192). Until then `models` is empty and `discovered` is
/// false, so the router advertises and routes nothing it has not actually seen.
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct CatalogStatus {
    /// Models observed in a successful live discovery.
    pub models: Vec<String>,
    /// Account identity the catalog was discovered for.
    pub account: Option<String>,
    /// Unix timestamp of the last successful live refresh.
    pub refreshed_at: Option<i64>,
    /// Most recent refresh failure, cleared by a successful refresh.
    pub last_error: Option<String>,
    /// Whether a live discovery has ever succeeded for this account.
    pub discovered: bool,
    /// Whether the credential is currently usable. A persisted catalog is
    /// retained across a credential failure for diagnostics, but is not
    /// exposed for routing while this is false.
    pub credential_healthy: bool,
}

impl CatalogStatus {
    /// Models that may be advertised and routed right now.
    ///
    /// Empty unless a live discovery has succeeded *and* the credential still
    /// works, so a revoked credential stops exposing models immediately while
    /// administrators can still see what was last discovered.
    #[must_use]
    pub fn routable_models(&self) -> &[String] {
        if self.discovered && self.credential_healthy {
            &self.models
        } else {
            &[]
        }
    }

    /// Whether this account is degraded: it has a catalog that cannot be used,
    /// or has never discovered one.
    #[must_use]
    pub const fn is_degraded(&self) -> bool {
        !self.discovered || !self.credential_healthy
    }
}

/// Thread-safe, immediately readable model catalogs shared by all handlers.
pub struct ModelCatalogCache {
    entries: RwLock<HashMap<(SubscriptionProvider, String), CatalogStatus>>,
}

impl Default for ModelCatalogCache {
    fn default() -> Self {
        Self::new()
    }
}

impl ModelCatalogCache {
    /// An empty cache.
    ///
    /// Every provider starts with no catalog at all. Models appear only after
    /// a successful authenticated discovery, so the router can never advertise
    /// a model name that came from its own source code (issue #192).
    #[must_use]
    pub fn new() -> Self {
        Self {
            entries: RwLock::new(HashMap::new()),
        }
    }

    /// Models that may be advertised and routed for `provider` right now.
    #[must_use]
    pub fn models(&self, provider: SubscriptionProvider) -> Vec<String> {
        let mut models = {
            let entries = self
                .entries
                .read()
                .unwrap_or_else(std::sync::PoisonError::into_inner);
            entries
                .iter()
                .filter(|((entry_provider, _), _)| *entry_provider == provider)
                .flat_map(|(_, status)| status.routable_models().iter().cloned())
                .collect::<Vec<_>>()
        };
        models.sort();
        models.dedup();
        models
    }

    /// Routable models belonging to the supplied stable router accounts.
    ///
    /// Provider-wide listings use this after account health has been resolved,
    /// so one rejected pool account cannot keep advertising models that no
    /// remaining account can serve.
    pub(crate) fn models_for_accounts(
        &self,
        provider: SubscriptionProvider,
        accounts: &[String],
    ) -> Vec<String> {
        let mut models = accounts
            .iter()
            .flat_map(|account| {
                self.status_for(provider, account)
                    .routable_models()
                    .to_vec()
            })
            .collect::<Vec<_>>();
        models.sort();
        models.dedup();
        models
    }

    /// Whether every known account for `provider` lacks a usable catalog.
    ///
    /// A provider pool remains healthy when any selected account has completed
    /// discovery; a failed primary must not hide a healthy secondary catalog.
    #[must_use]
    pub fn provider_is_degraded(&self, provider: SubscriptionProvider) -> bool {
        let statuses = {
            let entries = self
                .entries
                .read()
                .unwrap_or_else(std::sync::PoisonError::into_inner);
            entries
                .iter()
                .filter(|((entry_provider, _), _)| *entry_provider == provider)
                .map(|(_, status)| status.clone())
                .collect::<Vec<_>>()
        };
        let mut matching = statuses.iter();
        let Some(first) = matching.next() else {
            return true;
        };
        first.is_degraded() && matching.all(CatalogStatus::is_degraded)
    }

    /// Whether any account has catalog or failure evidence for `provider`.
    #[must_use]
    pub fn provider_has_observation(&self, provider: SubscriptionProvider) -> bool {
        self.entries
            .read()
            .unwrap_or_else(std::sync::PoisonError::into_inner)
            .iter()
            .any(|((entry_provider, _), status)| {
                *entry_provider == provider && (status.discovered || status.last_error.is_some())
            })
    }

    /// Return diagnostic state for a provider.
    #[must_use]
    pub fn status(&self, provider: SubscriptionProvider) -> CatalogStatus {
        self.status_for(provider, crate::credential_recovery_store::PRIMARY_ACCOUNT)
    }

    /// Return diagnostic state for one stable router account.
    #[must_use]
    pub fn status_for(&self, provider: SubscriptionProvider, account: &str) -> CatalogStatus {
        let status = {
            let entries = self
                .entries
                .read()
                .unwrap_or_else(std::sync::PoisonError::into_inner);
            entries
                .get(&(provider, account.to_string()))
                .cloned()
                .or_else(|| {
                    (account != crate::credential_recovery_store::PRIMARY_ACCOUNT)
                        .then(|| {
                            entries.get(&(
                                provider,
                                crate::credential_recovery_store::PRIMARY_ACCOUNT.to_string(),
                            ))
                        })
                        .flatten()
                        .filter(|primary| primary.account.is_none())
                        .cloned()
                })
        };
        // Legacy anonymous catalogs contain no identity that can differ
        // between accounts. Preserve established anonymous Claude pools; any
        // known selected identity still fails ownership before dispatch.
        status.unwrap_or_default()
    }

    /// Diagnostic state for every provider the cache knows about.
    #[must_use]
    pub fn statuses(&self) -> Vec<(SubscriptionProvider, CatalogStatus)> {
        let mut entries: Vec<_> = self
            .entries
            .read()
            .unwrap_or_else(std::sync::PoisonError::into_inner)
            .iter()
            .filter(|((_, account), _)| {
                account == crate::credential_recovery_store::PRIMARY_ACCOUNT
            })
            .map(|((provider, _), status)| (*provider, status.clone()))
            .collect();
        entries.sort_by_key(|(provider, _)| provider.to_string());
        entries
    }

    /// Replace a provider's catalog with a freshly observed listing.
    ///
    /// Public so integration tests can seed deterministic live catalogs.
    pub fn record_success(&self, provider: SubscriptionProvider, models: Vec<String>) {
        self.record_success_for(provider, None, models);
    }

    /// Record a successful discovery against the account it was made for.
    pub fn record_success_for(
        &self,
        provider: SubscriptionProvider,
        account: Option<String>,
        models: Vec<String>,
    ) {
        self.record_success_for_account(
            provider,
            crate::credential_recovery_store::PRIMARY_ACCOUNT,
            account,
            models,
        );
    }

    /// Record a successful discovery for one stable router account.
    pub fn record_success_for_account(
        &self,
        provider: SubscriptionProvider,
        router_account: &str,
        account: Option<String>,
        mut models: Vec<String>,
    ) {
        models.sort();
        models.dedup();
        let mut entries = self
            .entries
            .write()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        entries.insert(
            (provider, router_account.to_string()),
            CatalogStatus {
                models,
                account,
                refreshed_at: Some(chrono::Utc::now().timestamp()),
                last_error: None,
                discovered: true,
                credential_healthy: true,
            },
        );
    }

    /// Record a refresh failure, keeping any previously discovered catalog for
    /// diagnostics but marking the credential unhealthy so it stops being used.
    #[cfg(test)]
    pub(crate) fn record_failure(
        &self,
        provider: SubscriptionProvider,
        error: &str,
        credential_rejected: bool,
    ) {
        self.record_failure_for_account(
            provider,
            crate::credential_recovery_store::PRIMARY_ACCOUNT,
            error,
            credential_rejected,
        );
    }

    /// Record one account's refresh failure without poisoning its neighbours.
    pub(crate) fn record_failure_for_account(
        &self,
        provider: SubscriptionProvider,
        account: &str,
        error: &str,
        credential_rejected: bool,
    ) {
        let mut entries = self
            .entries
            .write()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        let entry = entries.entry((provider, account.to_string())).or_default();
        entry.last_error = Some(error.to_string());
        if credential_rejected {
            entry.credential_healthy = false;
        }
        drop(entries);
    }
}

/// Fetch every currently healthy credential and update the cache independently.
pub async fn refresh_catalogs(
    client: &reqwest::Client,
    readers: &[SubscriptionReader],
    token_cache: &crate::refresh::TokenCache,
    cache: &ModelCatalogCache,
) {
    let readers = readers
        .iter()
        .cloned()
        .map(|reader| {
            (
                crate::credential_recovery_store::PRIMARY_ACCOUNT.to_string(),
                reader,
            )
        })
        .collect::<Vec<_>>();
    refresh_catalogs_for_accounts(client, &readers, token_cache, cache).await;
}

/// Fetch every registered account catalog independently.
pub async fn refresh_catalogs_for_accounts(
    client: &reqwest::Client,
    readers: &[(String, SubscriptionReader)],
    token_cache: &crate::refresh::TokenCache,
    cache: &ModelCatalogCache,
) {
    let now_ms = chrono::Utc::now().timestamp_millis();
    // Tell the token cache where each credential lives before anything is
    // exchanged. Without a store it can only reason about the token it was
    // handed: it cannot notice that another holder rotated the chain forward,
    // and it cannot write its own rotation back (issue #239).
    // This is deliberately a raw, insert-if-absent fallback. Production has
    // already installed data-directory-backed recoverable stores; a catalog
    // tick must never replace those decorators with bare vendor readers.
    for (account, reader) in readers {
        token_cache.register_reader(account, reader);
    }
    let refreshes = readers.iter().map(|(router_account, reader)| async move {
        let provider = reader.provider();
        let token = match token_cache
            .get_fresh_registered(client, provider, router_account, now_ms)
            .await
        {
            Ok(token) => token,
            Err(error) => return (provider, router_account, false, Err(error)),
        };
        // A stamped-expired credential is still tried: `expiresAt` is a
        // hint, and the catalog endpoint is the authority on whether this
        // token works for *it*.
        let stamped_expired = token.is_expired(now_ms);
        // Bind the discovery to the account it was made for, so a catalog
        // is never reused across accounts (issue #192).
        let mut account = token.account_id.clone();
        let mut result = fetch_provider_catalog(client, provider, &token, None).await;

        // A 401 here means the vendor rejected a token whose own `exp` may
        // still be in the future. Refresh against that verdict rather than
        // the timestamp, and re-probe once (issue #205).
        if result
            .as_ref()
            .is_err_and(|error| is_credential_rejection(error))
            && let Some(refreshed) = token_cache
                .refresh_rejected(client, provider, router_account, token, now_ms)
                .await
        {
            tracing::info!(
                "{provider} rejected an unexpired catalog token; re-probing once after refresh"
            );
            account = refreshed.account_id.clone();
            result = fetch_provider_catalog(client, provider, &refreshed, None).await;
        }
        let result = result.map(|models| (account, models));
        (provider, router_account, stamped_expired, result)
    });
    for (provider, router_account, stamped_expired, result) in
        futures_util::future::join_all(refreshes).await
    {
        match result {
            Ok((account, models)) => {
                tracing::info!(
                    "refreshed {provider} model catalog with {} model(s)",
                    models.len()
                );
                token_cache.record_credential_working_for(provider, router_account);
                cache.record_success_for_account(provider, router_account, account, models);
            }
            Err(error) => {
                // Keep the last known models in the cache for transient
                // failures, but an authentication rejection makes them unsafe
                // to advertise or route until a later probe succeeds.
                let rejected = is_credential_rejection(&error);
                if rejected {
                    token_cache.record_credential_rejected_for(provider, router_account);
                    // The same state the refresh path announces at ERROR, so a
                    // subscription revoked between refresh ticks — caught here
                    // first — is not the one outage that produces no error line
                    // (issue #321).
                    token_cache.announce_unusable_for(provider, router_account, &error);
                }
                // Classified before the suffix goes on: the body is JSON, and
                // appending prose to it makes it unparseable, so the
                // permission-specific message this exists to produce could
                // never be reached for a stamped-expired credential (#319).
                let permission_refusal = is_permission_refusal(&error);
                let error = if stamped_expired {
                    format!("{error} (credential is stamped expired; last known catalog retained)")
                } else {
                    error
                };
                if permission_refusal {
                    // Say why nothing was refreshed. Without this the operator
                    // sees a 403 and a token that never rotates, and has no way
                    // to tell a deliberate refusal from a missed one (#319).
                    tracing::warn!(
                        "{provider} refused the catalog request on permission grounds, not \
                         credential grounds; the stored token is unchanged and will be retried \
                         on the next tick: {error}"
                    );
                } else if cache
                    .status_for(provider, router_account)
                    .last_error
                    .as_deref()
                    == Some(error.as_str())
                {
                    // The same failure, restated. A dead subscription produced
                    // 146 identical WARNs over twelve hours, which is not
                    // reporting — it is noise that hides the one line saying
                    // the state changed (issue #321). The condition stays
                    // visible in `last_error`, on `/health/subscriptions` and
                    // in the `/metrics` gauge.
                    tracing::debug!("{provider} model catalog is still failing: {error}");
                } else {
                    tracing::warn!("failed to refresh {provider} model catalog: {error}");
                }
                cache.record_failure_for_account(provider, router_account, &error, rejected);
            }
        }
    }
}

/// Error codes a provider returns on a **permission** failure: the credential
/// is fine and this organization is not permitted to use it right now.
///
/// A 403 carrying one of these is not evidence about the token, so refreshing
/// against it can only spend a link of a single-use chain for no obtainable
/// gain — which is exactly how a healthy subscription was destroyed five
/// minutes after recovery succeeded (issue #319).
const PERMISSION_ERROR_CODES: [&str; 1] = ["oauth_not_allowed_for_organization"];

/// The provider's own error code for a failed resource call, when it gave one.
///
/// Anthropic nests it two levels down, under `error.details.error_code`;
/// [`crate::refresh::oauth_error_code`] reads the token endpoint's shallower
/// shapes and stops at `error.type`, which for a permission failure is the
/// uninformative `permission_error` (issue #319).
fn resource_error_code(body: &str) -> Option<String> {
    let value: Value = serde_json::from_str(body).ok()?;
    let error = value.get("error")?;
    [
        &["details", "error_code"][..],
        &["error_code"][..],
        &["code"][..],
    ]
    .into_iter()
    .find_map(|path| {
        path.iter()
            .try_fold(error, |node, key| node.get(key))?
            .as_str()
            .map(str::to_string)
    })
}

/// Whether a catalog failure is a permission verdict rather than a credential
/// one — the organization is not allowed to use OAuth right now.
///
/// The existing token stays on disk and is retried on the next tick. Nothing
/// is refreshed, because a new token cannot change an answer that was never
/// about the token (issue #319).
#[must_use]
pub fn is_permission_refusal(error: &str) -> bool {
    let Some(body) = error.strip_prefix("HTTP ") else {
        return false;
    };
    let Some((status, body)) = body.split_once(": ") else {
        return false;
    };
    if !status.starts_with("403") {
        return false;
    }
    resource_error_code(body).is_some_and(|code| PERMISSION_ERROR_CODES.contains(&code.as_str()))
}

/// Whether a catalog response proves that the supplied credential is unusable.
///
/// A 403 that names a permission error is excluded: it says the token is fine
/// and the organization is not currently permitted, so treating it as a
/// credential verdict both refreshes a healthy chain and hides the provider
/// for a reason that is not the credential's (issue #319).
#[must_use]
pub fn is_credential_rejection(error: &str) -> bool {
    (error.starts_with("HTTP 401") || error.starts_with("HTTP 403"))
        && !is_permission_refusal(error)
}

/// Continuously refresh live catalogs, beginning immediately at startup.
pub async fn refresh_catalogs_forever(
    client: reqwest::Client,
    readers: Vec<SubscriptionReader>,
    token_cache: std::sync::Arc<crate::refresh::TokenCache>,
    cache: std::sync::Arc<ModelCatalogCache>,
) {
    loop {
        refresh_catalogs(&client, &readers, &token_cache, &cache).await;
        tokio::time::sleep(CATALOG_TTL).await;
    }
}

/// Continuously refresh account-scoped live catalogs.
pub async fn refresh_catalogs_for_accounts_forever(
    client: reqwest::Client,
    readers: Vec<(String, SubscriptionReader)>,
    token_cache: std::sync::Arc<crate::refresh::TokenCache>,
    cache: std::sync::Arc<ModelCatalogCache>,
) {
    loop {
        refresh_catalogs_for_accounts(&client, &readers, &token_cache, &cache).await;
        tokio::time::sleep(CATALOG_TTL).await;
    }
}

/// Fetch and parse a single provider catalog.
///
/// `base_url_override` exists for deterministic diagnostics and tests. Runtime
/// calls use each vendor's official endpoint.
pub async fn fetch_provider_catalog(
    client: &reqwest::Client,
    provider: SubscriptionProvider,
    token: &SubscriptionToken,
    base_url_override: Option<&str>,
) -> Result<Vec<String>, String> {
    let base = base_url_override.map_or_else(
        || catalog_base_url(provider, token),
        |value| value.trim_end_matches('/').to_string(),
    );
    let client_version =
        std::env::var("CODEX_CLIENT_VERSION").unwrap_or_else(|_| "0.144.1".to_string());
    let url = match provider {
        SubscriptionProvider::Claude => format!("{base}/v1/models"),
        SubscriptionProvider::Codex | SubscriptionProvider::Qwen => format!("{base}/models"),
        SubscriptionProvider::Gemini => format!("{base}/v1beta/models"),
    };
    let mut request = client
        .get(url)
        .bearer_auth(&token.access_token)
        .timeout(FETCH_TIMEOUT);
    match provider {
        SubscriptionProvider::Claude => {
            request = request
                .header("anthropic-version", "2023-06-01")
                .header("anthropic-beta", "oauth-2025-04-20");
        }
        SubscriptionProvider::Codex => {
            request = request.query(&[("client_version", client_version)]);
            if let Some(account_id) = token.account_id.as_deref() {
                request = request.header("chatgpt-account-id", account_id);
            }
        }
        SubscriptionProvider::Gemini | SubscriptionProvider::Qwen => {}
    }
    let response = request
        .send()
        .await
        .map_err(|error| format!("request failed: {error}"))?;
    let status = response.status();
    if !status.is_success() {
        let body = response.text().await.unwrap_or_default();
        let detail = body.chars().take(240).collect::<String>();
        return Err(format!("HTTP {status}: {detail}"));
    }
    let body: Value = response
        .json()
        .await
        .map_err(|error| format!("invalid JSON response: {error}"))?;
    parse_catalog(provider, &body)
}

fn catalog_base_url(provider: SubscriptionProvider, token: &SubscriptionToken) -> String {
    match provider {
        // Gemini CLI's cloud-platform OAuth token is accepted by the public
        // model registry even though inference uses the Code Assist endpoint.
        SubscriptionProvider::Gemini => "https://generativelanguage.googleapis.com".to_string(),
        _ => token.base_url(provider).trim_end_matches('/').to_string(),
    }
}

fn parse_catalog(provider: SubscriptionProvider, body: &Value) -> Result<Vec<String>, String> {
    let (array_key, id_key) = match provider {
        SubscriptionProvider::Claude | SubscriptionProvider::Qwen => ("data", "id"),
        SubscriptionProvider::Codex => ("models", "slug"),
        SubscriptionProvider::Gemini => ("models", "name"),
    };
    let models = body
        .get(array_key)
        .and_then(Value::as_array)
        .ok_or_else(|| format!("response has no {array_key} array"))?
        .iter()
        .filter(|entry| {
            provider != SubscriptionProvider::Gemini
                || entry
                    .get("supportedGenerationMethods")
                    .and_then(Value::as_array)
                    .is_none_or(|methods| methods.iter().any(|method| method == "generateContent"))
        })
        .filter_map(|entry| entry.get(id_key).and_then(Value::as_str))
        .map(|id| id.strip_prefix("models/").unwrap_or(id).to_string())
        .filter(|id| !id.is_empty())
        .collect::<Vec<_>>();
    if models.is_empty() {
        Err("response contained no model identifiers".to_string())
    } else {
        Ok(models)
    }
}

#[cfg(test)]
#[path = "model_catalog_tests.rs"]
mod tests;
