//! Durable credential-store fixture for refresh tests.

use super::*;

#[derive(Debug)]
struct TestCredentialStore {
    credential: std::sync::Mutex<SubscriptionToken>,
    lock_path: std::path::PathBuf,
}

impl CredentialStore for TestCredentialStore {
    fn reload(&self) -> Option<SubscriptionToken> {
        self.credential.lock().ok().map(|token| token.clone())
    }

    fn persist(&self, token: &SubscriptionToken) -> Result<(), String> {
        *self
            .credential
            .lock()
            .map_err(|_| "test credential store lock was poisoned".to_string())? = token.clone();
        Ok(())
    }

    fn lock_path(&self) -> Option<std::path::PathBuf> {
        Some(self.lock_path.clone())
    }

    fn describe(&self) -> String {
        "test credential store".into()
    }
}

pub(super) fn register_test_store(
    cache: &TokenCache,
    provider: SubscriptionProvider,
    account: &str,
    credential: &SubscriptionToken,
) -> tempfile::TempDir {
    let directory = tempfile::tempdir().expect("test credential directory");
    cache.register_store(
        provider,
        account,
        Arc::new(TestCredentialStore {
            credential: std::sync::Mutex::new(credential.clone()),
            lock_path: directory.path().join("credential.lock"),
        }),
    );
    directory
}

/// Seed a cached access token without adding a test-only method to
/// [`TokenCache`] itself.
pub fn seed_cached_token(
    cache: &TokenCache,
    provider: SubscriptionProvider,
    account: &str,
    token: SubscriptionToken,
) {
    cache.store_for(provider, account, token);
}

/// Exercise one real refresh exchange against a controlled endpoint while
/// keeping the endpoint override in test infrastructure.
pub async fn refresh_against(
    cache: &TokenCache,
    client: &reqwest::Client,
    token_url: &str,
    provider: SubscriptionProvider,
    account: &str,
    disk_token: SubscriptionToken,
    now_ms: i64,
) -> SubscriptionToken {
    cache
        .get_fresh_for_at(client, token_url, provider, account, disk_token, now_ms)
        .await
}
