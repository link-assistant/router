//! The first catalog refresh, completed before Router serves (issue #665).
//!
//! The refresh loop used to start in the background while the listeners were
//! already answering, so `/api/models` served its first responses before any
//! subscription catalog had loaded: a healthy Claude subscription's rows were
//! missing, and a client launched in that window cached a list without them.
//! A deployment waits for `/api/health` before it reports ready, so awaiting
//! this one refresh before binding is also what makes "ready" mean "catalogs
//! loaded or definitively failed".

use std::sync::Arc;
use std::time::Duration;

use super::{CATALOG_TTL, ModelCatalogCache, refresh_catalogs_for_accounts};
use crate::subscription::SubscriptionReader;

/// The longest startup waits for the first refresh.
///
/// Each catalog request is already bounded by its own fetch timeout; this caps a slow credential
/// refresh too, staying well inside the 60-second readiness wait of every
/// deployment mode. A catalog still unrefreshed at the deadline is reported
/// as starting, never degraded, until the loop below decides it.
pub const INITIAL_REFRESH_TIMEOUT: Duration = Duration::from_secs(20);

/// Refresh every account's catalog once, bounded by `timeout`, then keep
/// refreshing in the background. Returns the background task.
pub async fn refresh_catalogs_from_startup(
    client: reqwest::Client,
    readers: Vec<(String, SubscriptionReader)>,
    token_cache: Arc<crate::refresh::TokenCache>,
    cache: Arc<ModelCatalogCache>,
    timeout: Duration,
) -> tokio::task::JoinHandle<()> {
    let first = refresh_catalogs_for_accounts(&client, &readers, &token_cache, &cache);
    let refreshed = tokio::time::timeout(timeout, first).await.is_ok();
    if !refreshed {
        tracing::warn!(
            "the first model catalog refresh did not finish within {}s; serving now and \
             reporting unrefreshed subscriptions as starting",
            timeout.as_secs()
        );
    }
    tokio::spawn(async move {
        if refreshed {
            tokio::time::sleep(CATALOG_TTL).await;
        }
        loop {
            refresh_catalogs_for_accounts(&client, &readers, &token_cache, &cache).await;
            tokio::time::sleep(CATALOG_TTL).await;
        }
    })
}
