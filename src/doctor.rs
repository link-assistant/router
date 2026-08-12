//! Subscription diagnostics shared by the `doctor` CLI command.

use crate::model_catalog::{fetch_provider_catalog, is_credential_rejection};
use crate::subscription::{SubscriptionProvider, all_subscription_readers};

/// Report credential and live-catalog health for every provider.
///
/// Expired credentials are refreshed in memory before their catalogs are
/// fetched. Returns `true` when a present credential cannot become healthy or
/// cannot fetch its catalog.
pub async fn subscription_catalog_diagnostics(
    _active_provider: SubscriptionProvider,
    claude_home: &str,
    user_home: &str,
) -> bool {
    let readers = all_subscription_readers(claude_home, user_home);
    let client = reqwest::Client::new();
    let token_cache = crate::refresh::TokenCache::new();
    let now_ms = chrono::Utc::now().timestamp_millis();
    let mut catalog_error = false;
    for reader in readers {
        let provider = reader.provider();
        let label = format!("{provider} subscription");
        let Some(path) = reader.discover_credential_path() else {
            println!("{label:<23}: {} (MISSING)", reader.home().display());
            continue;
        };
        let disk_token = match reader.read_token() {
            Ok(token) => token,
            Err(error) => {
                println!("{label:<23}: {} (found, NO TOKEN: {error})", path.display());
                println!(
                    "{:<23}: ERROR (credential is unreadable)",
                    format!("{provider} catalog")
                );
                catalog_error = true;
                continue;
            }
        };
        let was_expired = disk_token.is_expired(now_ms);
        let token = token_cache
            .get_fresh(&client, provider, disk_token, now_ms)
            .await;
        // `expiresAt` is a hint, so a still-expired token is probed rather than
        // declared dead: the catalog endpoint is what actually knows.
        let still_expired = token.is_expired(now_ms);
        let catalog = fetch_provider_catalog(&client, provider, &token, None).await;
        let rejected = catalog
            .as_ref()
            .is_err_and(|error| is_credential_rejection(error));
        let status = match (was_expired, still_expired, rejected) {
            (_, true, true) => "found, token EXPIRED and REJECTED",
            (_, true, false) => "found, token EXPIRED on disk but ACCEPTED upstream",
            (true, false, true) => "found, token REJECTED after refresh",
            (false, _, true) => "found, token REJECTED",
            (true, false, false) => "found, token OK (refreshed in memory)",
            (false, false, false) => "found, token OK",
        };
        println!("{label:<23}: {} ({status})", path.display());
        if let Some(error) = token_cache.last_refresh_error(provider) {
            println!("{:<23}: {error}", format!("{provider} refresh"));
        }

        match catalog {
            Ok(models) => println!(
                "{:<23}: OK ({} live model(s))",
                format!("{provider} catalog"),
                models.len()
            ),
            Err(error) => {
                println!("{:<23}: ERROR ({error})", format!("{provider} catalog"));
                catalog_error = true;
            }
        }
    }
    catalog_error
}
