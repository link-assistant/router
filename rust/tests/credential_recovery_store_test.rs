//! Production-artifact coverage for durable credential recovery semantics.

use std::path::PathBuf;
use std::sync::{
    Arc, Mutex,
    atomic::{AtomicBool, Ordering},
};

use link_assistant_router::credential_recovery_store::{
    PRIMARY_ACCOUNT, RecoverableCredentialStore, credential_lock_path,
};
use link_assistant_router::credential_store::CredentialStore;
use link_assistant_router::subscription::{SubscriptionProvider, SubscriptionToken};

#[derive(Debug)]
struct MemoryPrimary {
    token: Mutex<Option<SubscriptionToken>>,
    writable: AtomicBool,
}

impl MemoryPrimary {
    const fn new(token: SubscriptionToken) -> Self {
        Self {
            token: Mutex::new(Some(token)),
            writable: AtomicBool::new(false),
        }
    }

    fn set(&self, token: SubscriptionToken) {
        *self.token.lock().expect("primary token lock") = Some(token);
    }

    fn allow_writes(&self) {
        self.writable.store(true, Ordering::SeqCst);
    }
}

impl CredentialStore for MemoryPrimary {
    fn reload(&self) -> Option<SubscriptionToken> {
        self.token.lock().expect("primary token lock").clone()
    }

    fn persist(&self, token: &SubscriptionToken) -> Result<(), String> {
        if !self.writable.load(Ordering::SeqCst) {
            return Err("primary is read-only".into());
        }
        self.set(token.clone());
        Ok(())
    }

    fn lock_path(&self) -> Option<PathBuf> {
        None
    }

    fn describe(&self) -> String {
        "memory primary".into()
    }
}

fn token(access: &str, refresh: &str) -> SubscriptionToken {
    SubscriptionToken {
        access_token: access.into(),
        refresh_token: Some(refresh.into()),
        expires_at_ms: Some(9_999_999_999_999),
        account_id: Some("provider-account".into()),
        resource_url: None,
    }
}

fn recovery_path(data_dir: &std::path::Path) -> PathBuf {
    credential_lock_path(data_dir, SubscriptionProvider::Codex, PRIMARY_ACCOUNT)
        .with_extension("json")
}

fn store(primary: &Arc<MemoryPrimary>, data_dir: &std::path::Path) -> RecoverableCredentialStore {
    RecoverableCredentialStore::new(
        SubscriptionProvider::Codex,
        PRIMARY_ACCOUNT,
        Arc::clone(primary) as Arc<dyn CredentialStore>,
        data_dir,
    )
}

#[test]
fn recovery_is_authoritative_then_reconciles_into_a_writable_primary() {
    let data = tempfile::tempdir().expect("data dir");
    let baseline = token("baseline-access", "baseline-refresh");
    let recovered = token("recovered-access", "recovered-refresh");
    let newest = token("newest-access", "newest-refresh");
    let primary = Arc::new(MemoryPrimary::new(baseline));
    let store = store(&primary, data.path());

    store
        .persist(&recovered)
        .expect("durable recovery fallback");
    assert!(recovery_path(data.path()).is_file());
    assert_eq!(store.reload(), Some(recovered.clone()));
    assert_eq!(store.describe(), "memory primary");

    primary.allow_writes();
    assert_eq!(
        store.try_reload().expect("reconcile recovery"),
        Some(recovered)
    );
    assert!(!recovery_path(data.path()).exists());
    assert_eq!(
        primary.reload().expect("reconciled primary").access_token,
        "recovered-access"
    );

    store.persist(&newest).expect("write directly to primary");
    assert_eq!(store.reload(), Some(newest));
    assert!(!recovery_path(data.path()).exists());
}

#[test]
fn an_external_primary_rotation_discards_a_stale_recovery_record() {
    let data = tempfile::tempdir().expect("data dir");
    let primary = Arc::new(MemoryPrimary::new(token("baseline", "baseline-refresh")));
    let store = store(&primary, data.path());
    store
        .persist(&token("recovered", "recovered-refresh"))
        .expect("durable recovery fallback");

    let operator = token("operator-access", "operator-refresh");
    primary.set(operator.clone());
    assert_eq!(
        store.try_reload().expect("operator rotation wins"),
        Some(operator)
    );
    assert!(!recovery_path(data.path()).exists());
}

#[test]
fn a_redundant_recovery_record_is_removed_after_primary_catches_up() {
    let data = tempfile::tempdir().expect("data dir");
    let primary = Arc::new(MemoryPrimary::new(token("baseline", "baseline-refresh")));
    let store = store(&primary, data.path());
    let recovered = token("recovered", "recovered-refresh");
    store
        .persist(&recovered)
        .expect("durable recovery fallback");

    primary.set(recovered.clone());
    assert_eq!(
        store.try_reload().expect("matching primary"),
        Some(recovered)
    );
    assert!(!recovery_path(data.path()).exists());
}

#[test]
fn malformed_and_unreadable_recovery_records_fail_closed_without_path_leakage() {
    for unreadable in [false, true] {
        let data = tempfile::tempdir().expect("data dir");
        let primary = Arc::new(MemoryPrimary::new(token("stale", "stale-refresh")));
        let store = store(&primary, data.path());
        store
            .persist(&token("recovered", "recovered-refresh"))
            .expect("durable recovery fallback");
        let recovery = recovery_path(data.path());
        std::fs::remove_file(&recovery).expect("remove valid recovery");
        if unreadable {
            std::fs::create_dir(&recovery).expect("unreadable recovery entry");
        } else {
            std::fs::write(&recovery, b"not-json").expect("malformed recovery entry");
        }

        let error = store
            .try_reload()
            .expect_err("uncertain recovery must fail closed");
        assert_eq!(error, "the codex credential recovery record is unusable");
        assert!(!error.contains(&data.path().display().to_string()));
        assert!(!error.contains("stale"));
        assert_eq!(
            store.reload(),
            None,
            "infallible compatibility API is fail closed"
        );
    }
}
