//! Durable fallback storage for refreshed subscription credentials.
//!
//! Vendor credential stores keep ownership of their JSON documents. This
//! decorator only serializes refreshes that could not reach that primary store
//! and reconciles them later, once the primary is writable again.

use std::path::{Path, PathBuf};
use std::sync::Arc;

use sha2::{Digest as _, Sha256};

use crate::credential_store::CredentialStore;
use crate::subscription::{SubscriptionProvider, SubscriptionToken};

const RECOVERY_VERSION: u8 = 1;
const RECOVERY_DIRECTORY: &str = "refresh-recovery";

/// Account name used by the configured, non-pooled credential homes.
pub const PRIMARY_ACCOUNT: &str = "primary";

/// Maximum time a Router-owned writer waits for another credential transaction.
pub const CREDENTIAL_LOCK_TIMEOUT: std::time::Duration = std::time::Duration::from_secs(5);

/// One provider/account lock shared by refresh, import, and native login.
///
/// The account is hashed so an email address or other operator-chosen account
/// label never appears in a filename.
#[must_use]
pub fn credential_lock_path(
    data_dir: impl AsRef<Path>,
    provider: SubscriptionProvider,
    account: impl AsRef<str>,
) -> PathBuf {
    let account_digest = hex::encode(Sha256::digest(account.as_ref().as_bytes()));
    data_dir
        .as_ref()
        .join(RECOVERY_DIRECTORY)
        .join(format!("{}-{account_digest}.lock", provider.as_str()))
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
struct RecoveryRecord {
    version: u8,
    provider: SubscriptionProvider,
    baseline_fingerprint: Option<String>,
    token: SubscriptionToken,
}

/// A credential store that falls back to the router's writable data directory.
#[derive(Debug)]
pub struct RecoverableCredentialStore {
    provider: SubscriptionProvider,
    primary: Arc<dyn CredentialStore>,
    recovery_path: PathBuf,
    lock_path: PathBuf,
}

impl RecoverableCredentialStore {
    /// Wrap `primary` with a recovery record and lock scoped to one account.
    #[must_use]
    pub fn new(
        provider: SubscriptionProvider,
        account: impl AsRef<str>,
        primary: Arc<dyn CredentialStore>,
        data_dir: impl AsRef<Path>,
    ) -> Self {
        let account_digest = hex::encode(Sha256::digest(account.as_ref().as_bytes()));
        let stem = format!("{}-{account_digest}", provider.as_str());
        let directory = data_dir.as_ref().join(RECOVERY_DIRECTORY);
        Self {
            provider,
            primary,
            recovery_path: directory.join(format!("{stem}.json")),
            lock_path: credential_lock_path(data_dir, provider, account),
        }
    }

    fn fingerprint(token: &SubscriptionToken) -> String {
        hex::encode(crate::refresh::credential_fingerprint(token))
    }

    fn read_recovery(&self) -> Option<RecoveryRecord> {
        let bytes = match std::fs::read(&self.recovery_path) {
            Ok(bytes) => bytes,
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => return None,
            Err(_) => {
                tracing::debug!(
                    "could not read OAuth recovery record at {}",
                    self.recovery_path.display()
                );
                return None;
            }
        };
        let Ok(record) = serde_json::from_slice::<RecoveryRecord>(&bytes) else {
            tracing::debug!(
                "could not parse OAuth recovery record at {}",
                self.recovery_path.display()
            );
            return None;
        };
        if record.version != RECOVERY_VERSION || record.provider != self.provider {
            tracing::debug!(
                "ignored OAuth recovery record with invalid metadata at {}",
                self.recovery_path.display()
            );
            return None;
        }
        Some(record)
    }

    fn write_recovery(
        &self,
        baseline_fingerprint: Option<String>,
        token: &SubscriptionToken,
    ) -> Result<(), String> {
        let record = RecoveryRecord {
            version: RECOVERY_VERSION,
            provider: self.provider,
            baseline_fingerprint,
            token: token.clone(),
        };
        let serialized = serde_json::to_vec(&record)
            .map_err(|error| format!("could not serialize OAuth recovery record: {error}"))?;
        crate::durable_file::atomic_write_owner_only(&self.recovery_path, &serialized).map_err(
            |error| {
                format!(
                    "could not persist OAuth recovery record at {}: {error}",
                    self.recovery_path.display()
                )
            },
        )
    }

    fn remove_recovery(&self) -> std::io::Result<()> {
        match std::fs::remove_file(&self.recovery_path) {
            Ok(()) => {
                let directory = self
                    .recovery_path
                    .parent()
                    .ok_or_else(|| std::io::Error::other("recovery path has no parent"))?;
                crate::durable_file::sync_directory(directory)
            }
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
            Err(error) => Err(error),
        }
    }
}

impl CredentialStore for RecoverableCredentialStore {
    fn reload(&self) -> Option<SubscriptionToken> {
        let primary = self.primary.reload();
        let Some(record) = self.read_recovery() else {
            return primary;
        };
        let primary_fingerprint = primary.as_ref().map(Self::fingerprint);
        let recovered_fingerprint = Self::fingerprint(&record.token);

        if primary_fingerprint.as_deref() == Some(recovered_fingerprint.as_str()) {
            let _ = self.remove_recovery();
            return primary;
        }

        if primary_fingerprint.is_some()
            && primary_fingerprint != record.baseline_fingerprint
            && primary_fingerprint.as_deref() != Some(recovered_fingerprint.as_str())
        {
            let _ = self.remove_recovery();
            return primary;
        }

        if self.primary.persist(&record.token).is_ok() {
            let _ = self.remove_recovery();
        }
        Some(record.token)
    }

    fn persist(&self, token: &SubscriptionToken) -> Result<(), String> {
        let baseline_fingerprint = self.primary.reload().as_ref().map(Self::fingerprint);
        match self.primary.persist(token) {
            Ok(()) => {
                let _ = self.remove_recovery();
                Ok(())
            }
            Err(primary_error) => {
                self.write_recovery(baseline_fingerprint, token)
                    .map_err(|recovery_error| {
                        format!(
                            "{primary_error}; recovery persistence also failed: {recovery_error}"
                        )
                    })
            }
        }
    }

    fn lock_path(&self) -> Option<PathBuf> {
        Some(self.lock_path.clone())
    }

    fn describe(&self) -> String {
        self.primary.describe()
    }
}

#[cfg(test)]
mod tests {
    use std::path::{Path, PathBuf};
    use std::sync::{
        Arc,
        atomic::{AtomicBool, Ordering},
    };

    use crate::credential_store::CredentialStore;
    use crate::subscription::{SubscriptionProvider, SubscriptionReader, SubscriptionToken};

    use super::{RecoverableCredentialStore, credential_lock_path};

    const ACCOUNT: &str = "team@example.com";
    const ACCOUNT_SHA256: &str = "a96e3689637c79fb389b70f6a2ff545458d0796e44c61722e8a569b58fcecf85";

    struct VendorCase {
        provider: SubscriptionProvider,
        filename: &'static str,
        document: &'static str,
        vendor_field: &'static str,
        vendor_value: serde_json::Value,
    }

    fn vendor_cases() -> Vec<VendorCase> {
        vec![
            VendorCase {
                provider: SubscriptionProvider::Claude,
                filename: ".credentials.json",
                document: r#"{"claudeAiOauth":{"accessToken":"old-access","refreshToken":"old-refresh","expiresAt":1,"subscriptionType":"max","scopes":["user:inference"]}}"#,
                vendor_field: "/claudeAiOauth/subscriptionType",
                vendor_value: serde_json::json!("max"),
            },
            VendorCase {
                provider: SubscriptionProvider::Codex,
                filename: "auth.json",
                document: r#"{"auth_mode":"chatgpt","tokens":{"id_token":"id-1","access_token":"old-access","refresh_token":"old-refresh","account_id":"acct_1"},"last_refresh":"2026-08-11T11:31:03Z"}"#,
                vendor_field: "/tokens/id_token",
                vendor_value: serde_json::json!("id-1"),
            },
            VendorCase {
                provider: SubscriptionProvider::Gemini,
                filename: "oauth_creds.json",
                document: r#"{"access_token":"old-access","refresh_token":"old-refresh","expiry_date":1,"token_type":"Bearer","scope":"cloud-platform"}"#,
                vendor_field: "/scope",
                vendor_value: serde_json::json!("cloud-platform"),
            },
            VendorCase {
                provider: SubscriptionProvider::Qwen,
                filename: "oauth_creds.json",
                document: r#"{"access_token":"old-access","refresh_token":"old-refresh","expiry_date":1,"token_type":"Bearer","resource_url":"portal.qwen.ai","scope":"openid"}"#,
                vendor_field: "/scope",
                vendor_value: serde_json::json!("openid"),
            },
        ]
    }

    fn token(provider: SubscriptionProvider, access: &str, refresh: &str) -> SubscriptionToken {
        SubscriptionToken {
            access_token: access.into(),
            refresh_token: Some(refresh.into()),
            expires_at_ms: Some(9_000),
            account_id: (provider == SubscriptionProvider::Codex).then(|| "acct_1".into()),
            resource_url: (provider == SubscriptionProvider::Qwen).then(|| "portal.qwen.ai".into()),
        }
    }

    #[derive(Debug)]
    struct SwitchableStore {
        reader: SubscriptionReader,
        fail_writes: AtomicBool,
    }

    impl SwitchableStore {
        fn new(reader: SubscriptionReader, fail_writes: bool) -> Self {
            Self {
                reader,
                fail_writes: AtomicBool::new(fail_writes),
            }
        }

        fn allow_writes(&self) {
            self.fail_writes.store(false, Ordering::SeqCst);
        }
    }

    impl CredentialStore for SwitchableStore {
        fn reload(&self) -> Option<SubscriptionToken> {
            CredentialStore::reload(&self.reader)
        }

        fn persist(&self, token: &SubscriptionToken) -> Result<(), String> {
            if self.fail_writes.load(Ordering::SeqCst) {
                Err("primary credential store is read-only".into())
            } else {
                CredentialStore::persist(&self.reader, token)
            }
        }

        fn lock_path(&self) -> Option<PathBuf> {
            CredentialStore::lock_path(&self.reader)
        }

        fn describe(&self) -> String {
            CredentialStore::describe(&self.reader)
        }
    }

    fn primary(case: &VendorCase, home: &Path, fail_writes: bool) -> Arc<SwitchableStore> {
        std::fs::write(home.join(case.filename), case.document).expect("seed vendor credential");
        Arc::new(SwitchableStore::new(
            SubscriptionReader::new(case.provider, home),
            fail_writes,
        ))
    }

    #[test]
    fn failed_primary_write_leaves_an_owner_only_recovery_that_survives_restart() {
        for case in vendor_cases() {
            let home = tempfile::tempdir().expect("credential home");
            let data = tempfile::tempdir().expect("data dir");
            let primary = primary(&case, home.path(), true);
            let store = RecoverableCredentialStore::new(
                case.provider,
                ACCOUNT,
                Arc::clone(&primary) as Arc<dyn CredentialStore>,
                data.path(),
            );
            let fresh = token(case.provider, "secret-access", "secret-refresh");

            store.persist(&fresh).expect("recovery write is durable");

            assert!(store.recovery_path.exists(), "{}", case.provider);
            let expected_name = format!("{}-{ACCOUNT_SHA256}.json", case.provider.as_str());
            assert_eq!(
                store
                    .recovery_path
                    .file_name()
                    .and_then(|name| name.to_str()),
                Some(expected_name.as_str())
            );
            assert!(!expected_name.contains(ACCOUNT));
            assert!(!expected_name.contains("secret"));
            let expected_lock_name = format!("{}-{ACCOUNT_SHA256}.lock", case.provider.as_str());
            let recovery_lock = store.lock_path().expect("recovery lock");
            assert_eq!(recovery_lock, store.lock_path);
            assert_eq!(
                recovery_lock,
                credential_lock_path(data.path(), case.provider, ACCOUNT)
            );
            assert_eq!(
                recovery_lock.file_name().and_then(|name| name.to_str()),
                Some(expected_lock_name.as_str())
            );
            assert_ne!(recovery_lock, primary.lock_path().expect("primary lock"));
            assert_eq!(store.describe(), primary.describe());
            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt as _;
                let mode = std::fs::metadata(&store.recovery_path)
                    .expect("recovery metadata")
                    .permissions()
                    .mode()
                    & 0o777;
                assert_eq!(mode, 0o600, "{}", case.provider);
            }
            assert_eq!(store.reload(), Some(fresh.clone()), "{}", case.provider);

            let restarted = RecoverableCredentialStore::new(
                case.provider,
                ACCOUNT,
                Arc::clone(&primary) as Arc<dyn CredentialStore>,
                data.path(),
            );
            assert_eq!(restarted.reload(), Some(fresh), "{}", case.provider);
        }
    }

    #[test]
    fn writable_reload_reconciles_recovery_without_losing_vendor_fields() {
        for case in vendor_cases() {
            let home = tempfile::tempdir().expect("credential home");
            let data = tempfile::tempdir().expect("data dir");
            let primary = primary(&case, home.path(), true);
            let store = RecoverableCredentialStore::new(
                case.provider,
                ACCOUNT,
                Arc::clone(&primary) as Arc<dyn CredentialStore>,
                data.path(),
            );
            let fresh = token(case.provider, "fresh-access", "fresh-refresh");
            store.persist(&fresh).expect("fallback persistence");
            primary.allow_writes();

            let restarted = RecoverableCredentialStore::new(
                case.provider,
                ACCOUNT,
                Arc::clone(&primary) as Arc<dyn CredentialStore>,
                data.path(),
            );
            assert_eq!(restarted.reload(), Some(fresh), "{}", case.provider);
            assert!(
                !restarted.recovery_path.exists(),
                "completed recovery remains for {}",
                case.provider
            );

            let document: serde_json::Value = serde_json::from_slice(
                &std::fs::read(home.path().join(case.filename)).expect("vendor document"),
            )
            .expect("valid vendor JSON");
            assert_eq!(
                document.pointer(case.vendor_field),
                Some(&case.vendor_value),
                "{}",
                case.provider
            );
        }
    }

    #[test]
    fn a_changed_primary_invalidates_stale_recovery() {
        let case = vendor_cases().remove(1);
        let home = tempfile::tempdir().expect("credential home");
        let data = tempfile::tempdir().expect("data dir");
        let primary = primary(&case, home.path(), true);
        let store = RecoverableCredentialStore::new(
            case.provider,
            ACCOUNT,
            Arc::clone(&primary) as Arc<dyn CredentialStore>,
            data.path(),
        );
        store
            .persist(&token(
                case.provider,
                "recovered-access",
                "recovered-refresh",
            ))
            .expect("fallback persistence");
        primary.allow_writes();
        let operator_token = token(case.provider, "operator-access", "operator-refresh");
        primary
            .persist(&operator_token)
            .expect("operator replaces primary chain");

        let reloaded = store.reload().expect("changed primary wins");
        assert_eq!(reloaded.access_token, operator_token.access_token);
        assert_eq!(reloaded.refresh_token, operator_token.refresh_token);
        assert_eq!(reloaded.account_id, operator_token.account_id);
        assert!(!store.recovery_path.exists());
    }

    #[test]
    fn invalid_recovery_metadata_is_never_adopted() {
        for field in ["version", "provider"] {
            let case = vendor_cases().remove(1);
            let home = tempfile::tempdir().expect("credential home");
            let data = tempfile::tempdir().expect("data dir");
            let primary = primary(&case, home.path(), true);
            let baseline = primary.reload().expect("baseline");
            let store = RecoverableCredentialStore::new(
                case.provider,
                ACCOUNT,
                Arc::clone(&primary) as Arc<dyn CredentialStore>,
                data.path(),
            );
            store
                .persist(&token(
                    case.provider,
                    "recovered-access",
                    "recovered-refresh",
                ))
                .expect("fallback persistence");
            let mut record: serde_json::Value = serde_json::from_slice(
                &std::fs::read(&store.recovery_path).expect("recovery record"),
            )
            .expect("valid recovery JSON");
            record[field] = if field == "version" {
                serde_json::json!(99)
            } else {
                serde_json::json!("gemini")
            };
            std::fs::write(
                &store.recovery_path,
                serde_json::to_vec(&record).expect("serialize altered record"),
            )
            .expect("alter recovery record");

            assert_eq!(store.reload(), Some(baseline), "invalid {field}");
        }
    }

    #[test]
    fn persist_errors_only_when_primary_and_recovery_are_both_unwritable() {
        let case = vendor_cases().remove(0);
        let home = tempfile::tempdir().expect("credential home");
        let data = tempfile::tempdir().expect("data parent");
        let not_a_directory = data.path().join("file");
        std::fs::write(&not_a_directory, b"occupied").expect("blocking file");
        let primary = primary(&case, home.path(), true);
        let store = RecoverableCredentialStore::new(
            case.provider,
            ACCOUNT,
            primary as Arc<dyn CredentialStore>,
            &not_a_directory,
        );
        let fresh = token(case.provider, "do-not-leak-access", "do-not-leak-refresh");

        let error = store.persist(&fresh).expect_err("neither store is durable");

        assert!(error.contains("primary credential store is read-only"));
        assert!(!error.contains("do-not-leak-access"));
        assert!(!error.contains("do-not-leak-refresh"));
    }
}
