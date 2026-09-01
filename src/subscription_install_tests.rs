//! Locked credential-installation regressions.

use super::*;

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
    let waiter = tokio::spawn(async move {
        reader
            .install_document_locked(
                &data_path,
                crate::credential_recovery_store::PRIMARY_ACCOUNT,
                r#"{"auth_mode":"chatgpt","tokens":{"access_token":"staged","refresh_token":"stale"}}"#,
                InstallMode::IfAbsent,
            )
            .await
    });
    tokio::time::sleep(std::time::Duration::from_millis(80)).await;
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
    let waiter = tokio::spawn(async move {
        reader
            .install_document_locked(
                &data_path,
                crate::credential_recovery_store::PRIMARY_ACCOUNT,
                r#"{"access_token":"new","scope":"keep"}"#,
                InstallMode::Replace,
            )
            .await
    });
    tokio::time::sleep(std::time::Duration::from_millis(80)).await;
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
