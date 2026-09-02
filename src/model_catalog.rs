//! Live subscription model discovery with stale-on-error caching.

use std::collections::{BTreeSet, HashMap, HashSet};
use std::path::{Path, PathBuf};
use std::sync::RwLock;
use std::time::Duration;

use serde_json::Value;

use crate::subscription::{SubscriptionProvider, SubscriptionReader, SubscriptionToken};

/// How often live provider catalogs are refreshed.
pub const CATALOG_TTL: Duration = Duration::from_secs(5 * 60);
const FETCH_TIMEOUT: Duration = Duration::from_secs(15);
const MAX_CATALOG_PAGES: usize = 100;

/// One provider record retained without discarding vendor metadata.
#[derive(Debug, Clone, PartialEq, Eq, serde::Deserialize, serde::Serialize)]
pub struct CatalogRecord {
    pub provider: SubscriptionProvider,
    pub account: String,
    pub canonical_id: String,
    pub raw: serde_json::Map<String, Value>,
    pub source_order: u64,
    pub fetched_at: i64,
    pub health_generation: String,
    pub protocols: BTreeSet<crate::client_policy::ClientProtocol>,
}

impl CatalogRecord {
    fn synthetic(
        provider: SubscriptionProvider,
        account: &str,
        canonical_id: String,
        source_order: usize,
        fetched_at: i64,
    ) -> Self {
        let mut raw = serde_json::Map::new();
        raw.insert("id".into(), Value::String(canonical_id.clone()));
        Self {
            provider,
            account: account.to_string(),
            canonical_id,
            raw,
            source_order: source_order as u64,
            fetched_at,
            health_generation: format!("{provider}:{account}:{fetched_at}"),
            protocols: provider_protocols(provider),
        }
    }
}

/// Last known catalog state for one provider account.
///
/// Nothing here is ever seeded from source-code model names: a catalog exists
/// only once a live, authenticated discovery has succeeded for that exact
/// account (issue #192). Until then `models` is empty and `discovered` is
/// false, so the router advertises and routes nothing it has not actually seen.
#[derive(Debug, Clone, Default, PartialEq, Eq, serde::Deserialize, serde::Serialize)]
pub struct CatalogStatus {
    /// Models observed in a successful live discovery.
    pub models: Vec<String>,
    /// Original provider records in provider source order.
    pub records: Vec<CatalogRecord>,
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

    /// Full records that may be projected to clients right now.
    #[must_use]
    pub fn routable_records(&self) -> &[CatalogRecord] {
        if self.discovered && self.credential_healthy {
            &self.records
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
    persistence: Option<CatalogPersistence>,
}

#[derive(Debug, Clone)]
struct CatalogPersistence {
    path: PathBuf,
    invalidations: PathBuf,
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
struct PersistedCatalogs {
    version: u8,
    entries: Vec<PersistedCatalogEntry>,
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
struct PersistedCatalogEntry {
    provider: SubscriptionProvider,
    router_account: String,
    status: CatalogStatus,
}

const PERSISTED_CATALOG_VERSION: u8 = 1;
const PERSISTED_CATALOG_FILE: &str = "model-catalogs.json";
const CATALOG_INVALIDATION_DIR: &str = "model-catalog-invalidations";

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
            persistence: None,
        }
    }

    /// Open a durable catalog cache rooted in Router's private data directory.
    ///
    /// Records and vendor metadata survive restarts for diagnostics. A restart
    /// deliberately clears their routable health until this process completes
    /// an authenticated discovery for the same account: persisted availability
    /// is evidence about the past, not authority to spend a current credential.
    #[must_use]
    pub fn persistent(data_dir: &Path) -> Self {
        let persistence = CatalogPersistence {
            path: data_dir.join(PERSISTED_CATALOG_FILE),
            invalidations: data_dir.join(CATALOG_INVALIDATION_DIR),
        };
        let mut entries = load_persisted_catalogs(&persistence.path).unwrap_or_else(|error| {
            tracing::warn!("could not load the persisted model catalog: {error}");
            HashMap::new()
        });
        for status in entries.values_mut() {
            if status.discovered {
                status.credential_healthy = false;
                status.last_error =
                    Some("awaiting authenticated catalog refresh after router restart".to_string());
            }
        }
        Self {
            entries: RwLock::new(entries),
            persistence: Some(persistence),
        }
    }

    /// Invalidate one provider/account from a separate credential-mutating
    /// process. Running servers consult the owner-only marker on every catalog
    /// projection, so a successful login/import cannot leave old models
    /// routable until the next background tick.
    pub fn invalidate_persisted(
        data_dir: &Path,
        provider: SubscriptionProvider,
        router_account: &str,
    ) -> Result<(), String> {
        let directory = data_dir.join(CATALOG_INVALIDATION_DIR);
        secure_directory(&directory).map_err(|error| {
            format!(
                "could not create model-catalog invalidation directory {}: {error}",
                directory.display()
            )
        })?;
        let path = invalidation_path(&directory, provider, router_account);
        crate::durable_file::atomic_write_owner_only(
            &path,
            chrono::Utc::now().timestamp_millis().to_string().as_bytes(),
        )
        .map_err(|error| {
            format!(
                "could not invalidate the {provider} model catalog for {router_account}: {error}"
            )
        })
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
                .flat_map(|((_, account), status)| {
                    self.routable_status(provider, account, status)
                        .routable_models()
                        .to_vec()
                })
                .collect::<Vec<_>>()
        };
        models.sort();
        models.dedup();
        models
    }

    /// Full routable records for a provider, ordered by account then by the
    /// provider's original order within that account.
    #[must_use]
    pub fn records(&self, provider: SubscriptionProvider) -> Vec<CatalogRecord> {
        let entries = self
            .entries
            .read()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        let mut matching = entries
            .iter()
            .filter(|((entry_provider, _), _)| *entry_provider == provider)
            .collect::<Vec<_>>();
        matching.sort_by(|((_, left), _), ((_, right), _)| left.cmp(right));
        matching
            .into_iter()
            .flat_map(|((_, account), status)| {
                self.routable_status(provider, account, status)
                    .routable_records()
                    .to_vec()
            })
            .collect()
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

    pub(crate) fn records_for_accounts(
        &self,
        provider: SubscriptionProvider,
        accounts: &[String],
    ) -> Vec<CatalogRecord> {
        accounts
            .iter()
            .flat_map(|account| {
                self.status_for(provider, account)
                    .routable_records()
                    .to_vec()
            })
            .collect()
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
                .map(|((_, account), status)| self.routable_status(provider, account, status))
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
        let (status, effective_account) = {
            let entries = self
                .entries
                .read()
                .unwrap_or_else(std::sync::PoisonError::into_inner);
            entries.get(&(provider, account.to_string())).map_or_else(
                || {
                    let fallback = (account != crate::credential_recovery_store::PRIMARY_ACCOUNT)
                        .then(|| {
                            entries.get(&(
                                provider,
                                crate::credential_recovery_store::PRIMARY_ACCOUNT.to_string(),
                            ))
                        })
                        .flatten()
                        .filter(|primary| primary.account.is_none())
                        .cloned();
                    (fallback, crate::credential_recovery_store::PRIMARY_ACCOUNT)
                },
                |status| (Some(status.clone()), account),
            )
        };
        // Legacy anonymous catalogs contain no identity that can differ
        // between accounts. Preserve established anonymous Claude pools; any
        // known selected identity still fails ownership before dispatch.
        status
            .map(|status| self.routable_status(provider, effective_account, &status))
            .unwrap_or_default()
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
            .map(|((provider, account), status)| {
                (*provider, self.routable_status(*provider, account, status))
            })
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
        let fetched_at = chrono::Utc::now().timestamp();
        let record_account = account.as_deref().unwrap_or(router_account);
        let records = models
            .iter()
            .cloned()
            .enumerate()
            .map(|(index, model)| {
                CatalogRecord::synthetic(provider, record_account, model, index, fetched_at)
            })
            .collect();
        self.record_records_for_account(provider, router_account, account, records);
    }

    /// Atomically replace one account generation with fully retained records.
    pub fn record_records_for_account(
        &self,
        provider: SubscriptionProvider,
        router_account: &str,
        account: Option<String>,
        mut records: Vec<CatalogRecord>,
    ) {
        let mut seen = HashSet::new();
        records.retain(|record| seen.insert(record.canonical_id.clone()));
        let mut models = records
            .iter()
            .map(|record| record.canonical_id.clone())
            .collect::<Vec<_>>();
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
                records,
                account,
                refreshed_at: Some(chrono::Utc::now().timestamp()),
                last_error: None,
                discovered: true,
                credential_healthy: true,
            },
        );
        drop(entries);
        if self.persist_entries() {
            self.clear_invalidation(provider, router_account);
        }
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
        self.persist_entries();
    }

    fn routable_status(
        &self,
        provider: SubscriptionProvider,
        router_account: &str,
        status: &CatalogStatus,
    ) -> CatalogStatus {
        let mut status = status.clone();
        if self.is_invalidated(provider, router_account) {
            status.credential_healthy = false;
            status.last_error =
                Some("authorization changed; awaiting authenticated catalog refresh".to_string());
        }
        status
    }

    fn is_invalidated(&self, provider: SubscriptionProvider, router_account: &str) -> bool {
        self.persistence.as_ref().is_some_and(|persistence| {
            invalidation_path(&persistence.invalidations, provider, router_account)
                .try_exists()
                .unwrap_or(true)
        })
    }

    fn clear_invalidation(&self, provider: SubscriptionProvider, router_account: &str) {
        let Some(persistence) = &self.persistence else {
            return;
        };
        let path = invalidation_path(&persistence.invalidations, provider, router_account);
        if let Err(error) = std::fs::remove_file(&path)
            && error.kind() != std::io::ErrorKind::NotFound
        {
            tracing::warn!(
                "could not clear the {provider} model-catalog invalidation for {router_account}: {error}"
            );
        }
    }

    fn persist_entries(&self) -> bool {
        let Some(persistence) = &self.persistence else {
            return true;
        };
        let mut entries = self
            .entries
            .read()
            .unwrap_or_else(std::sync::PoisonError::into_inner)
            .iter()
            .map(
                |((provider, router_account), status)| PersistedCatalogEntry {
                    provider: *provider,
                    router_account: router_account.clone(),
                    status: status.clone(),
                },
            )
            .collect::<Vec<_>>();
        entries.sort_by(|left, right| {
            left.provider
                .as_str()
                .cmp(right.provider.as_str())
                .then_with(|| left.router_account.cmp(&right.router_account))
        });
        let document = PersistedCatalogs {
            version: PERSISTED_CATALOG_VERSION,
            entries,
        };
        let result = serde_json::to_vec_pretty(&document)
            .map_err(std::io::Error::other)
            .and_then(|bytes| {
                crate::durable_file::atomic_write_owner_only(&persistence.path, &bytes)
            });
        if let Err(error) = result {
            tracing::warn!("could not persist the live model catalog: {error}");
            return false;
        }
        true
    }
}

fn load_persisted_catalogs(
    path: &Path,
) -> Result<HashMap<(SubscriptionProvider, String), CatalogStatus>, String> {
    let bytes = match std::fs::read(path) {
        Ok(bytes) => bytes,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(HashMap::new()),
        Err(error) => return Err(error.to_string()),
    };
    let persisted: PersistedCatalogs =
        serde_json::from_slice(&bytes).map_err(|error| error.to_string())?;
    if persisted.version != PERSISTED_CATALOG_VERSION {
        return Err(format!(
            "unsupported persisted catalog version {}",
            persisted.version
        ));
    }
    Ok(persisted
        .entries
        .into_iter()
        .map(|entry| ((entry.provider, entry.router_account), entry.status))
        .collect())
}

fn invalidation_path(
    directory: &Path,
    provider: SubscriptionProvider,
    router_account: &str,
) -> PathBuf {
    use sha2::Digest as _;
    let digest = sha2::Sha256::digest(format!("{provider}\0{router_account}").as_bytes());
    directory.join(format!(
        "{}-{}.invalidated",
        provider.as_str(),
        hex::encode(digest)
    ))
}

fn secure_directory(path: &Path) -> std::io::Result<()> {
    std::fs::create_dir_all(path)?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt as _;
        std::fs::set_permissions(path, std::fs::Permissions::from_mode(0o700))?;
    }
    Ok(())
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
        let mut result = fetch_provider_catalog_records(client, provider, &token, None).await;

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
            result = fetch_provider_catalog_records(client, provider, &refreshed, None).await;
        }
        let result = result.map(|models| (account, models));
        (provider, router_account, stamped_expired, result)
    });
    for (provider, router_account, stamped_expired, result) in
        futures_util::future::join_all(refreshes).await
    {
        match result {
            Ok((account, records)) => {
                tracing::info!(
                    "refreshed {provider} model catalog with {} model(s)",
                    records.len()
                );
                token_cache.record_credential_working_for(provider, router_account);
                cache.record_records_for_account(provider, router_account, account, records);
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
    fetch_provider_catalog_records(client, provider, token, base_url_override)
        .await
        .map(|records| {
            records
                .into_iter()
                .map(|record| record.canonical_id)
                .collect()
        })
}

/// Fetch every page of one provider catalog while retaining every record.
pub async fn fetch_provider_catalog_records(
    client: &reqwest::Client,
    provider: SubscriptionProvider,
    token: &SubscriptionToken,
    base_url_override: Option<&str>,
) -> Result<Vec<CatalogRecord>, String> {
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
    let base_url =
        reqwest::Url::parse(&url).map_err(|error| format!("invalid catalog URL: {error}"))?;
    let account = token.account_id.clone().unwrap_or_else(|| "primary".into());
    let fetched_at = chrono::Utc::now().timestamp();
    let generation = format!("{provider}:{account}:{}", uuid::Uuid::new_v4());
    let mut cursor: Option<(String, String)> = None;
    let mut visited = HashSet::new();
    let mut records = Vec::new();

    for page in 0..MAX_CATALOG_PAGES {
        if let Some((key, value)) = cursor.as_ref()
            && !visited.insert(format!("{key}={value}"))
        {
            return Err(format!("repeated pagination cursor for {provider}: {key}"));
        }
        let mut page_url = base_url.clone();
        {
            let mut query = page_url.query_pairs_mut();
            match provider {
                SubscriptionProvider::Claude => {
                    query.append_pair("limit", "1000");
                }
                SubscriptionProvider::Gemini => {
                    query.append_pair("pageSize", "1000");
                }
                SubscriptionProvider::Codex => {
                    query.append_pair("client_version", &client_version);
                }
                SubscriptionProvider::Qwen => {}
            }
            if let Some((key, value)) = cursor.as_ref() {
                query.append_pair(key, value);
            }
        }
        let mut request = client
            .get(page_url)
            .bearer_auth(&token.access_token)
            .timeout(FETCH_TIMEOUT);
        match provider {
            SubscriptionProvider::Claude => {
                request = request
                    .header("anthropic-version", "2023-06-01")
                    .header("anthropic-beta", "oauth-2025-04-20");
            }
            SubscriptionProvider::Codex => {
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
        let page_records = parse_catalog_records(
            provider,
            &body,
            &account,
            fetched_at,
            &generation,
            records.len(),
        )?;
        cursor = next_catalog_cursor(provider, &body, &page_records)?;
        records.extend(page_records);
        if cursor.is_none() {
            return Ok(records);
        }
        if page + 1 == MAX_CATALOG_PAGES {
            return Err(format!(
                "{provider} catalog exceeded the {MAX_CATALOG_PAGES}-page safety limit"
            ));
        }
    }
    unreachable!("bounded catalog loop returns on its final iteration")
}

fn catalog_base_url(provider: SubscriptionProvider, token: &SubscriptionToken) -> String {
    match provider {
        // Gemini CLI's cloud-platform OAuth token is accepted by the public
        // model registry even though inference uses the Code Assist endpoint.
        SubscriptionProvider::Gemini => "https://generativelanguage.googleapis.com".to_string(),
        _ => token.base_url(provider).trim_end_matches('/').to_string(),
    }
}

#[cfg(test)]
fn parse_catalog(provider: SubscriptionProvider, body: &Value) -> Result<Vec<String>, String> {
    parse_catalog_records(
        provider,
        body,
        "primary",
        chrono::Utc::now().timestamp(),
        "test",
        0,
    )
    .map(|records| {
        records
            .into_iter()
            .map(|record| record.canonical_id)
            .collect()
    })
}

fn parse_catalog_records(
    provider: SubscriptionProvider,
    body: &Value,
    account: &str,
    fetched_at: i64,
    generation: &str,
    offset: usize,
) -> Result<Vec<CatalogRecord>, String> {
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
        .filter_map(Value::as_object)
        .filter_map(|raw| {
            let id = raw.get(id_key).and_then(Value::as_str)?;
            let canonical_id = id.strip_prefix("models/").unwrap_or(id).to_string();
            (!canonical_id.is_empty()).then(|| (raw, canonical_id))
        })
        .enumerate()
        .map(|(index, (raw, canonical_id))| CatalogRecord {
            provider,
            account: account.to_string(),
            canonical_id,
            raw: raw.clone(),
            source_order: (offset + index) as u64,
            fetched_at,
            health_generation: generation.to_string(),
            protocols: provider_protocols(provider),
        })
        .collect::<Vec<_>>();
    if models.is_empty() {
        Err("response contained no model identifiers".to_string())
    } else {
        Ok(models)
    }
}

fn provider_protocols(
    provider: SubscriptionProvider,
) -> BTreeSet<crate::client_policy::ClientProtocol> {
    use crate::client_policy::ClientProtocol;
    let native = match provider {
        SubscriptionProvider::Claude => ClientProtocol::AnthropicMessages,
        SubscriptionProvider::Codex => ClientProtocol::OpenAIResponses,
        SubscriptionProvider::Gemini => ClientProtocol::GeminiNative,
        SubscriptionProvider::Qwen => ClientProtocol::OpenAIChat,
    };
    [ClientProtocol::Catalog, native].into_iter().collect()
}

fn next_catalog_cursor(
    provider: SubscriptionProvider,
    body: &Value,
    page: &[CatalogRecord],
) -> Result<Option<(String, String)>, String> {
    if let Some(token) = body
        .get("nextPageToken")
        .or_else(|| body.get("next_page_token"))
        .and_then(Value::as_str)
        .filter(|token| !token.is_empty())
    {
        let key = if provider == SubscriptionProvider::Gemini {
            "pageToken"
        } else {
            "page_token"
        };
        return Ok(Some((key.into(), token.into())));
    }
    if let Some(token) = body
        .get("next_cursor")
        .or_else(|| body.get("cursor"))
        .or_else(|| body.get("next"))
        .or_else(|| body.pointer("/pagination/next_cursor"))
        .and_then(Value::as_str)
        .filter(|token| !token.is_empty())
    {
        return Ok(Some(("cursor".into(), token.into())));
    }
    if !body
        .get("has_more")
        .and_then(Value::as_bool)
        .unwrap_or(false)
    {
        return Ok(None);
    }
    let token = body
        .get("last_id")
        .and_then(Value::as_str)
        .filter(|token| !token.is_empty())
        .or_else(|| page.last().map(|record| record.canonical_id.as_str()))
        .ok_or_else(|| format!("{provider} catalog says has_more without a cursor"))?;
    let key = if provider == SubscriptionProvider::Claude {
        "after_id"
    } else {
        "after"
    };
    Ok(Some((key.into(), token.into())))
}

#[cfg(test)]
#[path = "model_catalog_tests.rs"]
mod tests;
