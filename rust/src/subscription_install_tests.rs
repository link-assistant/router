//! Locked credential-installation regressions.

use super::*;

fn spawn_with_first_poll_signal<F>(
    future: F,
) -> (
    tokio::task::JoinHandle<F::Output>,
    tokio::sync::oneshot::Receiver<()>,
)
where
    F: std::future::Future + Send + 'static,
    F::Output: Send + 'static,
{
    let (polled_tx, polled_rx) = tokio::sync::oneshot::channel();
    let task = tokio::spawn(async move {
        let mut future = std::pin::pin!(future);
        let mut polled_tx = Some(polled_tx);
        std::future::poll_fn(|context| {
            let result = future.as_mut().poll(context);
            if let Some(polled_tx) = polled_tx.take() {
                let _ = polled_tx.send(());
            }
            result
        })
        .await
    });
    (task, polled_rx)
}

#[derive(Debug)]
struct ReadOnlyPrimary {
    reader: SubscriptionReader,
}

impl crate::credential_store::CredentialStore for ReadOnlyPrimary {
    fn reload(&self) -> Option<SubscriptionToken> {
        crate::credential_store::CredentialStore::reload(&self.reader)
    }

    fn persist(&self, _token: &SubscriptionToken) -> Result<(), String> {
        Err("primary credential store is read-only".to_string())
    }

    fn lock_path(&self) -> Option<std::path::PathBuf> {
        None
    }

    fn describe(&self) -> String {
        "read-only test primary".to_string()
    }
}

struct InstallCase {
    provider: SubscriptionProvider,
    document: &'static str,
    vendor_pointer: &'static str,
    vendor_value: serde_json::Value,
}

fn install_cases() -> Vec<InstallCase> {
    vec![
        InstallCase {
            provider: SubscriptionProvider::Claude,
            document: r#"{"claudeAiOauth":{"accessToken":"a","refreshToken":"r","expiresAt":9,"subscriptionType":"max"}}"#,
            vendor_pointer: "/claudeAiOauth/subscriptionType",
            vendor_value: serde_json::json!("max"),
        },
        InstallCase {
            provider: SubscriptionProvider::Codex,
            document: r#"{"auth_mode":"chatgpt","tokens":{"id_token":"vendor-id","access_token":"a","refresh_token":"r"}}"#,
            vendor_pointer: "/tokens/id_token",
            vendor_value: serde_json::json!("vendor-id"),
        },
        InstallCase {
            provider: SubscriptionProvider::Gemini,
            document: r#"{"access_token":"a","refresh_token":"r","expiry_date":9,"scope":"cloud-platform"}"#,
            vendor_pointer: "/scope",
            vendor_value: serde_json::json!("cloud-platform"),
        },
        InstallCase {
            provider: SubscriptionProvider::Qwen,
            document: r#"{"access_token":"a","refresh_token":"r","expiry_date":9,"resource_url":"portal.qwen.ai","scope":"openid"}"#,
            vendor_pointer: "/scope",
            vendor_value: serde_json::json!("openid"),
        },
    ]
}

/// A conditional install into an empty home preserves the exact vendor
/// document for every subscription layout.
#[tokio::test]
async fn conditional_install_preserves_all_four_vendor_documents() {
    for case in install_cases() {
        let home = tempfile::tempdir().expect("credential home");
        let data = tempfile::tempdir().expect("router data");
        let reader = SubscriptionReader::new(case.provider, home.path());

        let result = reader
            .install_document_locked(
                data.path(),
                crate::credential_recovery_store::PRIMARY_ACCOUNT,
                case.document,
                InstallMode::IfAbsent,
            )
            .await
            .expect("conditional install");

        let installed = match result {
            InstallDocumentResult::Installed(path) => path,
            InstallDocumentResult::AlreadyPresent(path) => {
                panic!("{} unexpectedly found {path:?}", case.provider)
            }
        };
        let bytes = std::fs::read(&installed).expect("installed document");
        assert_eq!(bytes, case.document.as_bytes(), "{}", case.provider);
        let value: serde_json::Value = serde_json::from_slice(&bytes).expect("vendor JSON");
        assert_eq!(
            value.pointer(case.vendor_pointer),
            Some(&case.vendor_value),
            "{}",
            case.provider
        );
    }
}

/// Every recognized destination filename counts as present, and conditional
/// mode leaves its bytes, digest, and timestamp untouched.
#[tokio::test]
async fn conditional_install_leaves_an_existing_recognized_destination_unchanged() {
    use sha2::{Digest as _, Sha256};

    let home = tempfile::tempdir().expect("credential home");
    let data = tempfile::tempdir().expect("router data");
    let reader = SubscriptionReader::new(SubscriptionProvider::Claude, home.path());
    let existing = home.path().join("credentials.json");
    let old = br#"{"accessToken":"concurrent","vendor":"keep"}"#;
    std::fs::write(&existing, old).expect("existing credential");
    let before = std::fs::metadata(&existing)
        .expect("metadata")
        .modified()
        .expect("modified time");
    let before_digest = Sha256::digest(old);

    let result = reader
        .install_document_locked(
            data.path(),
            crate::credential_recovery_store::PRIMARY_ACCOUNT,
            r#"{"claudeAiOauth":{"accessToken":"candidate"}}"#,
            InstallMode::IfAbsent,
        )
        .await
        .expect("already present is success");

    assert_eq!(
        result,
        InstallDocumentResult::AlreadyPresent(existing.clone())
    );
    let after = std::fs::read(&existing).expect("preserved credential");
    assert_eq!(after, old);
    assert_eq!(Sha256::digest(&after), before_digest);
    assert_eq!(
        std::fs::metadata(&existing)
            .expect("metadata")
            .modified()
            .expect("modified time"),
        before
    );
    assert!(!home.path().join(".credentials.json").exists());
}

/// Replacement must update the credential the Router actually reads. Claude
/// searches legacy `credentials.json` before its canonical dotfile, so merely
/// creating `.credentials.json` leaves the old login authoritative.
#[tokio::test]
async fn replacement_overwrites_the_existing_authoritative_claude_document() {
    let home = tempfile::tempdir().expect("credential home");
    let data = tempfile::tempdir().expect("router data");
    let reader = SubscriptionReader::new(SubscriptionProvider::Claude, home.path());
    let authoritative = home.path().join("credentials.json");
    std::fs::write(
        &authoritative,
        r#"{"claudeAiOauth":{"accessToken":"old","refreshToken":"old-refresh"}}"#,
    )
    .expect("legacy credential");
    let candidate =
        r#"{"claudeAiOauth":{"accessToken":"candidate","refreshToken":"candidate-refresh"}}"#;

    let result = reader
        .install_document_locked(
            data.path(),
            crate::credential_recovery_store::PRIMARY_ACCOUNT,
            candidate,
            InstallMode::Replace,
        )
        .await
        .expect("replace credential");

    assert_eq!(
        result,
        InstallDocumentResult::Installed(authoritative.clone())
    );
    assert_eq!(std::fs::read_to_string(authoritative).unwrap(), candidate);
    assert_eq!(reader.read_token().unwrap().access_token, "candidate");
    assert!(!home.path().join(".credentials.json").exists());
}

/// Replacement is an atomic overwrite, so a malformed legacy file cannot
/// block fallback parsing and keep shadowing the validated candidate.
#[tokio::test]
async fn replacement_repairs_a_malformed_authoritative_claude_document() {
    let home = tempfile::tempdir().expect("credential home");
    let data = tempfile::tempdir().expect("router data");
    let reader = SubscriptionReader::new(SubscriptionProvider::Claude, home.path());
    let authoritative = home.path().join("credentials.json");
    std::fs::write(&authoritative, "not-json").expect("malformed legacy credential");
    let candidate =
        r#"{"claudeAiOauth":{"accessToken":"candidate","refreshToken":"candidate-refresh"}}"#;

    reader
        .install_document_locked(
            data.path(),
            crate::credential_recovery_store::PRIMARY_ACCOUNT,
            candidate,
            InstallMode::Replace,
        )
        .await
        .expect("replace malformed credential");

    assert_eq!(reader.read_token().unwrap().access_token, "candidate");
    assert_eq!(std::fs::read_to_string(authoritative).unwrap(), candidate);
}

/// An unusable recovery sidecar is storage uncertainty. Replacement must fail
/// before mutating the working primary document rather than report success for
/// a destination serving cannot subsequently load.
#[tokio::test]
async fn replacement_refuses_an_unusable_recovery_before_mutating_primary() {
    use crate::credential_store::CredentialStore as _;
    use std::sync::Arc;

    let home = tempfile::tempdir().expect("credential home");
    let data = tempfile::tempdir().expect("router data");
    let provider = SubscriptionProvider::Codex;
    let account = crate::credential_recovery_store::PRIMARY_ACCOUNT;
    let primary_path = home.path().join("auth.json");
    let old =
        r#"{"auth_mode":"chatgpt","tokens":{"access_token":"old","refresh_token":"old-refresh"}}"#;
    std::fs::write(&primary_path, old).expect("primary credential");
    let fallback = crate::credential_recovery_store::RecoverableCredentialStore::new(
        provider,
        account,
        Arc::new(ReadOnlyPrimary {
            reader: SubscriptionReader::new(provider, home.path()),
        }),
        data.path(),
    );
    fallback
        .persist(&SubscriptionToken {
            access_token: "recovery".into(),
            refresh_token: Some("recovery-refresh".into()),
            expires_at_ms: None,
            account_id: None,
            resource_url: None,
        })
        .expect("create recovery record");
    let recovery = crate::credential_recovery_store::valid_recovery_record_path(
        data.path(),
        provider,
        account,
    )
    .unwrap()
    .expect("recovery path");
    std::fs::write(&recovery, "not a recovery record").expect("corrupt recovery");

    let candidate = r#"{"auth_mode":"chatgpt","tokens":{"access_token":"candidate","refresh_token":"candidate-refresh"}}"#;
    let error = SubscriptionReader::new(provider, home.path())
        .install_document_locked(data.path(), account, candidate, InstallMode::Replace)
        .await
        .expect_err("unusable recovery must block replacement");

    assert!(error.contains("recovery record is unusable"), "{error}");
    assert_eq!(std::fs::read_to_string(primary_path).unwrap(), old);
}

/// A fallback recovery record is a live destination even when the vendor home
/// is empty. Installing an older candidate must not invalidate that chain on
/// the next reload.
#[tokio::test]
async fn conditional_install_preserves_a_recovery_only_rotated_credential() {
    use crate::credential_store::CredentialStore as _;
    use std::sync::Arc;

    let home = tempfile::tempdir().expect("credential home");
    let data = tempfile::tempdir().expect("router data");
    let provider = SubscriptionProvider::Codex;
    let account = crate::credential_recovery_store::PRIMARY_ACCOUNT;
    let primary = Arc::new(ReadOnlyPrimary {
        reader: SubscriptionReader::new(provider, home.path()),
    });
    let store = crate::credential_recovery_store::RecoverableCredentialStore::new(
        provider,
        account,
        primary,
        data.path(),
    );
    let rotated = SubscriptionToken {
        access_token: "rotated-access".into(),
        refresh_token: Some("rotated-refresh".into()),
        expires_at_ms: Some(9_000),
        account_id: Some("acct-current".into()),
        resource_url: None,
    };
    store
        .persist(&rotated)
        .expect("failed primary persistence falls back durably");

    let reader = SubscriptionReader::new(provider, home.path());
    let result = reader
        .install_document_locked(
            data.path(),
            account,
            r#"{"auth_mode":"chatgpt","tokens":{"access_token":"staged-old","refresh_token":"staged-refresh","account_id":"acct-old"}}"#,
            InstallMode::IfAbsent,
        )
        .await
        .expect("recovery state counts as already present");

    let recovery_path = match result {
        InstallDocumentResult::AlreadyPresent(path) => path,
        InstallDocumentResult::Installed(path) => {
            panic!("conditional import replaced recovery-only state at {path:?}")
        }
    };
    assert!(recovery_path.starts_with(data.path()));
    assert!(!home.path().join("auth.json").exists());
    assert_eq!(store.reload(), Some(rotated));
}

/// The destination is re-checked only after the shared refresh lock is held;
/// a credential created while import waits wins unchanged.
#[tokio::test]
async fn destination_created_while_conditional_install_waits_for_lock_wins() {
    let home = tempfile::tempdir().expect("credential home");
    let data = tempfile::tempdir().expect("router data");
    let provider = SubscriptionProvider::Codex;
    let lock_path = crate::credential_recovery_store::credential_lock_path(
        data.path(),
        provider,
        crate::credential_recovery_store::PRIMARY_ACCOUNT,
    );
    let holder =
        crate::durable_file::lock_exclusive_async(&lock_path, std::time::Duration::from_secs(1))
            .await
            .expect("hold refresh lock");
    let reader = SubscriptionReader::new(provider, home.path());
    let data_path = data.path().to_path_buf();
    let (waiter, first_poll) = spawn_with_first_poll_signal(async move {
        reader
            .install_document_locked(
                &data_path,
                crate::credential_recovery_store::PRIMARY_ACCOUNT,
                r#"{"auth_mode":"chatgpt","tokens":{"access_token":"staged","refresh_token":"stale"}}"#,
                InstallMode::IfAbsent,
            )
            .await
    });
    first_poll.await.expect("conditional install was polled");
    assert!(
        !waiter.is_finished(),
        "conditional import did not wait for refresh"
    );

    let destination = home.path().join("auth.json");
    let concurrent =
        br#"{"auth_mode":"chatgpt","tokens":{"access_token":"fresh","refresh_token":"rotated"}}"#;
    crate::durable_file::atomic_write_owner_only(&destination, concurrent)
        .expect("concurrent refresh write");
    drop(holder);

    assert_eq!(
        waiter.await.expect("join").expect("conditional result"),
        InstallDocumentResult::AlreadyPresent(destination.clone())
    );
    assert_eq!(std::fs::read(destination).expect("winner"), concurrent);
}

/// Explicit replacement still replaces, but participates in the same lock as
/// refresh so the two writes cannot cross.
#[tokio::test]
async fn replacement_install_waits_for_the_refresh_lock() {
    let home = tempfile::tempdir().expect("credential home");
    let data = tempfile::tempdir().expect("router data");
    let provider = SubscriptionProvider::Gemini;
    let destination = home.path().join("oauth_creds.json");
    std::fs::write(&destination, r#"{"access_token":"old"}"#).expect("seed");
    let lock_path = crate::credential_recovery_store::credential_lock_path(
        data.path(),
        provider,
        crate::credential_recovery_store::PRIMARY_ACCOUNT,
    );
    let holder =
        crate::durable_file::lock_exclusive_async(&lock_path, std::time::Duration::from_secs(1))
            .await
            .expect("hold refresh lock");
    let reader = SubscriptionReader::new(provider, home.path());
    let data_path = data.path().to_path_buf();
    let (waiter, first_poll) = spawn_with_first_poll_signal(async move {
        reader
            .install_document_locked(
                &data_path,
                crate::credential_recovery_store::PRIMARY_ACCOUNT,
                r#"{"access_token":"new","scope":"keep"}"#,
                InstallMode::Replace,
            )
            .await
    });
    first_poll.await.expect("replacement install was polled");
    assert!(
        !waiter.is_finished(),
        "replacement import bypassed refresh lock"
    );
    assert!(
        std::fs::read_to_string(&destination)
            .unwrap()
            .contains("old")
    );
    drop(holder);

    assert!(matches!(
        waiter.await.expect("join").expect("replacement result"),
        InstallDocumentResult::Installed(path) if path == destination
    ));
    assert!(
        std::fs::read_to_string(destination)
            .unwrap()
            .contains("new")
    );
}

/// Failure to open the shared lock is visible and cannot create a destination.
#[tokio::test]
async fn conditional_install_lock_open_failure_changes_nothing() {
    let root = tempfile::tempdir().expect("root");
    let home = root.path().join("credential-home");
    let not_a_directory = root.path().join("occupied");
    std::fs::create_dir_all(&home).expect("credential home");
    std::fs::write(&not_a_directory, b"file").expect("blocking file");
    let reader = SubscriptionReader::new(SubscriptionProvider::Qwen, &home);

    let error = reader
        .install_document_locked(
            &not_a_directory,
            crate::credential_recovery_store::PRIMARY_ACCOUNT,
            r#"{"access_token":"candidate"}"#,
            InstallMode::IfAbsent,
        )
        .await
        .expect_err("lock open must fail");

    assert!(error.contains("credential lock"), "{error}");
    assert!(!home.join("oauth_creds.json").exists());
}

/// A holder that outlives the shared transaction timeout produces an
/// operator-visible failure and cannot install partial or complete bytes.
#[tokio::test]
async fn conditional_install_lock_timeout_changes_nothing() {
    let home = tempfile::tempdir().expect("credential home");
    let data = tempfile::tempdir().expect("router data");
    let provider = SubscriptionProvider::Claude;
    let lock_path = crate::credential_recovery_store::credential_lock_path(
        data.path(),
        provider,
        crate::credential_recovery_store::PRIMARY_ACCOUNT,
    );
    let _holder =
        crate::durable_file::lock_exclusive_async(&lock_path, std::time::Duration::from_secs(1))
            .await
            .expect("hold refresh lock");
    let reader = SubscriptionReader::new(provider, home.path());

    let error = reader
        .install_document_locked(
            data.path(),
            crate::credential_recovery_store::PRIMARY_ACCOUNT,
            r#"{"claudeAiOauth":{"accessToken":"candidate"}}"#,
            InstallMode::IfAbsent,
        )
        .await
        .expect_err("the shared timeout must be visible");

    assert!(error.contains("timed out"), "{error}");
    assert!(error.contains("claude credential lock"), "{error}");
    assert!(!home.path().join(".credentials.json").exists());
}

#[tokio::test]
async fn replacement_failures_after_rename_or_during_commit_restore_old_credentials() {
    for failed_name in [".credentials.json", "..credentials.json.router-commit"] {
        let home = tempfile::tempdir().expect("credential home");
        let data = tempfile::tempdir().expect("router data");
        let primary = home.path().join(".credentials.json");
        let old = r#"{"claudeAiOauth":{"accessToken":"old","refreshToken":"old-r"}}"#;
        let candidate = r#"{"claudeAiOauth":{"accessToken":"new","refreshToken":"new-r"}}"#;
        std::fs::write(&primary, old).expect("seed old credential");
        let reader = SubscriptionReader::new(SubscriptionProvider::Claude, home.path());
        let _fault = crate::durable_file::inject_fault(
            &home.path().join(failed_name),
            crate::durable_file::FaultPoint::AfterRename,
        );

        reader
            .install_document_locked(
                data.path(),
                crate::credential_recovery_store::PRIMARY_ACCOUNT,
                candidate,
                InstallMode::Replace,
            )
            .await
            .expect_err("late persistence failure");

        assert_eq!(std::fs::read_to_string(&primary).unwrap(), old);
        assert_eq!(reader.read_token().unwrap().access_token, "old");
    }
}

#[tokio::test]
async fn catalog_invalidation_failure_happens_before_primary_replacement() {
    let home = tempfile::tempdir().expect("credential home");
    let data = tempfile::tempdir().expect("router data");
    let primary = home.path().join("auth.json");
    let old = r#"{"tokens":{"access_token":"old","refresh_token":"old-r"}}"#;
    std::fs::write(&primary, old).expect("seed old credential");
    std::fs::write(data.path().join("model-catalog-invalidations"), b"blocked")
        .expect("block invalidation directory");
    let reader = SubscriptionReader::new(SubscriptionProvider::Codex, home.path());

    reader
        .install_document_locked(
            data.path(),
            crate::credential_recovery_store::PRIMARY_ACCOUNT,
            r#"{"tokens":{"access_token":"new","refresh_token":"new-r"}}"#,
            InstallMode::Replace,
        )
        .await
        .expect_err("invalidation must fail before replacement");

    assert_eq!(std::fs::read_to_string(&primary).unwrap(), old);
    assert_eq!(reader.read_token().unwrap().access_token, "old");
}
