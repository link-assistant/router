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
