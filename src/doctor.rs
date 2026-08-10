//! Subscription diagnostics shared by the `doctor` CLI command.

use crate::model_catalog::fetch_provider_catalog;
use crate::subscription::{SubscriptionProvider, all_subscription_readers};

/// Report credential and live-catalog health for every non-active provider.
///
/// Returns `true` when a healthy credential could not fetch its catalog.
pub async fn subscription_catalog_diagnostics(
    active_provider: SubscriptionProvider,
    claude_home: &str,
    user_home: &str,
) -> bool {
    let readers = all_subscription_readers(claude_home, user_home);
    for reader in &readers {
        let provider = reader.provider();
        if provider == active_provider {
            continue;
        }
        let label = format!("{provider} subscription");
        match reader.discover_credential_path() {
            Some(path) => {
                let status = reader.read_token().map_or("found, NO TOKEN", |token| {
                    let now_ms = chrono::Utc::now().timestamp_millis();
                    if token.is_expired(now_ms) {
                        "found, token EXPIRED"
                    } else {
                        "found, token OK"
                    }
                });
                println!("{label:<23}: {} ({status})", path.display());
            }
            None => println!("{label:<23}: {} (MISSING)", reader.home().display()),
        }
    }

    let client = reqwest::Client::new();
    let now_ms = chrono::Utc::now().timestamp_millis();
    let mut catalog_error = false;
    for reader in readers {
        let Ok(token) = reader.read_token() else {
            continue;
        };
        if token.is_expired(now_ms) {
            continue;
        }
        let provider = reader.provider();
        match fetch_provider_catalog(&client, provider, &token, None).await {
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
